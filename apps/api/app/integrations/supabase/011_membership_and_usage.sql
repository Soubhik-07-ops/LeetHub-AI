-- Migration 011: Freemium Membership and AI Usage Metering

-- 1. Plans Table
CREATE TABLE IF NOT EXISTS plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    price_inr INTEGER NOT NULL DEFAULT 0,
    billing_period TEXT NOT NULL CHECK (billing_period IN ('daily', 'monthly', 'yearly', 'lifetime')),
    ai_analysis_limit INTEGER NOT NULL,
    ai_chat_limit INTEGER NOT NULL,
    ai_model TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed Plans
INSERT INTO plans (slug, name, price_inr, billing_period, ai_analysis_limit, ai_chat_limit, ai_model)
VALUES 
    ('free', 'Free', 0, 'daily', 5, 10, 'free-model-placeholder'),
    ('premium', 'Premium', 69, 'monthly', 50, 300, 'premium-model-placeholder')
ON CONFLICT (slug) DO UPDATE 
SET 
    name = EXCLUDED.name,
    price_inr = EXCLUDED.price_inr,
    billing_period = EXCLUDED.billing_period,
    ai_analysis_limit = EXCLUDED.ai_analysis_limit,
    ai_chat_limit = EXCLUDED.ai_chat_limit,
    ai_model = EXCLUDED.ai_model;

-- 2. User Subscriptions Table
CREATE TABLE IF NOT EXISTS user_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES plans(id),
    status TEXT NOT NULL CHECK (status IN ('active', 'inactive', 'cancelled', 'expired', 'trialing')),
    current_period_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    current_period_end TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON user_subscriptions(user_id);
-- Ensure only one active subscription per user at most
CREATE UNIQUE INDEX IF NOT EXISTS idx_active_sub ON user_subscriptions (user_id) WHERE status = 'active';

ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY select_own_subscriptions ON user_subscriptions 
    FOR SELECT 
    USING (auth.uid() = user_id);
-- No insert/update/delete policy for users. Backend only.

-- 3. AI Usage Table
CREATE TABLE IF NOT EXISTS ai_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    feature TEXT NOT NULL CHECK (feature IN ('analysis', 'chat')),
    model TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
    input_tokens INTEGER,
    output_tokens INTEGER,
    estimated_cost NUMERIC(10, 6),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_usage_user_id_feature ON ai_usage(user_id, feature);
CREATE INDEX IF NOT EXISTS idx_ai_usage_created_at ON ai_usage(created_at);

ALTER TABLE ai_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY select_own_ai_usage ON ai_usage 
    FOR SELECT 
    USING (auth.uid() = user_id);
-- No insert/update/delete policy for users. Backend only.


-- 4. Atomic Usage RPC
CREATE OR REPLACE FUNCTION check_and_reserve_ai_quota(
    p_user_id UUID, 
    p_feature TEXT
)
RETURNS TABLE (
    is_allowed BOOLEAN,
    usage_id UUID,
    plan_slug TEXT,
    model_to_use TEXT,
    limit_amount INT,
    used_amount INT,
    reset_date TIMESTAMPTZ
) AS $$
DECLARE
    v_plan RECORD;
    v_limit INT;
    v_used INT;
    v_period_start TIMESTAMPTZ;
    v_period_end TIMESTAMPTZ;
    v_usage_id UUID;
    v_now TIMESTAMPTZ := NOW();
BEGIN
    -- 1. Determine active plan. Fallback to free if no active sub or expired
    SELECT p.*, s.current_period_start, s.current_period_end, s.status
    INTO v_plan
    FROM plans p
    LEFT JOIN user_subscriptions s ON s.plan_id = p.id AND s.user_id = p_user_id AND s.status = 'active'
    WHERE s.id IS NOT NULL AND s.current_period_end > v_now
    LIMIT 1;

    -- If no active valid subscription, get the free plan
    IF v_plan IS NULL THEN
        SELECT p.*, v_now AS current_period_start, v_now + INTERVAL '1 day' AS current_period_end, 'active' AS status
        INTO v_plan
        FROM plans p
        WHERE p.slug = 'free'
        LIMIT 1;
    END IF;

    -- 2. Determine period boundaries based on billing_period
    IF v_plan.billing_period = 'daily' THEN
        -- For daily, we just count from start of current UTC day
        v_period_start := date_trunc('day', v_now AT TIME ZONE 'UTC') AT TIME ZONE 'UTC';
        v_period_end := v_period_start + INTERVAL '1 day';
    ELSE
        -- For monthly premium, use the subscription periods
        v_period_start := v_plan.current_period_start;
        v_period_end := v_plan.current_period_end;
    END IF;

    -- 3. Get the correct limit
    IF p_feature = 'analysis' THEN
        v_limit := v_plan.ai_analysis_limit;
    ELSIF p_feature = 'chat' THEN
        v_limit := v_plan.ai_chat_limit;
    ELSE
        RAISE EXCEPTION 'Unknown feature: %', p_feature;
    END IF;

    -- 4. Count usage in the current period (excluding 'failed' so users are refunded)
    SELECT COUNT(*) INTO v_used
    FROM ai_usage
    WHERE user_id = p_user_id
      AND feature = p_feature
      AND created_at >= v_period_start
      AND created_at < v_period_end
      AND status != 'failed';

    -- 5. Check quota and reserve
    IF v_used < v_limit THEN
        INSERT INTO ai_usage (user_id, feature, model, status)
        VALUES (p_user_id, p_feature, v_plan.ai_model, 'pending')
        RETURNING id INTO v_usage_id;
        
        RETURN QUERY SELECT TRUE, v_usage_id, v_plan.slug, v_plan.ai_model, v_limit, (v_used + 1), v_period_end;
    ELSE
        RETURN QUERY SELECT FALSE, NULL::UUID, v_plan.slug, v_plan.ai_model, v_limit, v_used, v_period_end;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 5. Dashboard Usage Stats RPC
CREATE OR REPLACE FUNCTION get_user_ai_usage_stats(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_plan RECORD;
    v_analysis_used INT;
    v_chat_used INT;
    v_period_start TIMESTAMPTZ;
    v_period_end TIMESTAMPTZ;
    v_now TIMESTAMPTZ := NOW();
BEGIN
    -- Determine active plan
    SELECT p.*, s.current_period_start, s.current_period_end
    INTO v_plan
    FROM plans p
    LEFT JOIN user_subscriptions s ON s.plan_id = p.id AND s.user_id = p_user_id AND s.status = 'active'
    WHERE s.id IS NOT NULL AND s.current_period_end > v_now
    LIMIT 1;

    IF v_plan IS NULL THEN
        SELECT p.* INTO v_plan FROM plans p WHERE p.slug = 'free' LIMIT 1;
    END IF;

    IF v_plan.billing_period = 'daily' THEN
        v_period_start := date_trunc('day', v_now AT TIME ZONE 'UTC') AT TIME ZONE 'UTC';
        v_period_end := v_period_start + INTERVAL '1 day';
    ELSE
        v_period_start := v_plan.current_period_start;
        v_period_end := v_plan.current_period_end;
    END IF;

    SELECT COUNT(*) INTO v_analysis_used
    FROM ai_usage
    WHERE user_id = p_user_id AND feature = 'analysis' 
      AND created_at >= v_period_start AND created_at < v_period_end AND status != 'failed';

    SELECT COUNT(*) INTO v_chat_used
    FROM ai_usage
    WHERE user_id = p_user_id AND feature = 'chat' 
      AND created_at >= v_period_start AND created_at < v_period_end AND status != 'failed';

    RETURN jsonb_build_object(
        'plan', v_plan.slug,
        'analysis', jsonb_build_object(
            'limit', v_plan.ai_analysis_limit,
            'used', v_analysis_used,
            'remaining', GREATEST(0, v_plan.ai_analysis_limit - v_analysis_used),
            'period', v_plan.billing_period,
            'reset_at', v_period_end
        ),
        'chat', jsonb_build_object(
            'limit', v_plan.ai_chat_limit,
            'used', v_chat_used,
            'remaining', GREATEST(0, v_plan.ai_chat_limit - v_chat_used),
            'period', v_plan.billing_period,
            'reset_at', v_period_end
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
