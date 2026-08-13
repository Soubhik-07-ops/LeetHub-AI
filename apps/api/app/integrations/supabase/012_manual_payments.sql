-- Migration 012: Manual UPI Payments and Admin Approval

-- 1. Admin Roles
CREATE TABLE IF NOT EXISTS user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'admin')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, role)
);

CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);

ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY select_own_role ON user_roles
    FOR SELECT 
    USING (auth.uid() = user_id);
-- No insert/update for normal users

-- 2. App Settings (Centralized config like UPI details)
CREATE TABLE IF NOT EXISTS app_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT UNIQUE NOT NULL,
    value JSONB NOT NULL,
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed initial UPI config
INSERT INTO app_settings (key, value)
VALUES (
    'upi_config', 
    '{"upi_id": "your-upi-id@upi", "display_name": "LeetHub-AI Premium", "qr_url": null, "description": "Unlock the full AI Developer Coach"}'::jsonb
)
ON CONFLICT (key) DO NOTHING;

ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY select_app_settings ON app_settings
    FOR SELECT 
    USING (TRUE);
-- Only backend/admin updates

-- 3. Payment Requests
CREATE TABLE IF NOT EXISTS payment_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES plans(id),
    amount INTEGER NOT NULL,
    currency TEXT NOT NULL DEFAULT 'INR',
    payment_method TEXT NOT NULL DEFAULT 'upi',
    upi_reference TEXT NOT NULL,
    proof_url TEXT,
    user_note TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
    admin_note TEXT,
    reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_requests_user_id ON payment_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_requests_status ON payment_requests(status);

ALTER TABLE payment_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY select_own_payment_requests ON payment_requests
    FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY insert_own_payment_requests ON payment_requests
    FOR INSERT 
    WITH CHECK (auth.uid() = user_id);
-- No update/delete for users. Admin/Backend updates only.

-- 4. Admin Audit Logs
CREATE TABLE IF NOT EXISTS admin_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    target_type TEXT NOT NULL,
    target_id TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_admin_user_id ON admin_audit_logs(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_created_at ON admin_audit_logs(created_at);

ALTER TABLE admin_audit_logs ENABLE ROW LEVEL SECURITY;
-- Completely restricted to backend/admin read only
CREATE POLICY select_no_one ON admin_audit_logs
    FOR SELECT 
    USING (FALSE);


-- 5. Atomic Approval RPC
CREATE OR REPLACE FUNCTION approve_payment_request(
    p_request_id UUID,
    p_admin_id UUID,
    p_admin_note TEXT
)
RETURNS JSONB AS $$
DECLARE
    v_request RECORD;
    v_subscription_id UUID;
    v_now TIMESTAMPTZ := NOW();
BEGIN
    -- 1. Try to atomically lock and update the pending request
    UPDATE payment_requests
    SET 
        status = 'approved',
        admin_note = p_admin_note,
        reviewed_by = p_admin_id,
        reviewed_at = v_now,
        updated_at = v_now
    WHERE id = p_request_id AND status = 'pending'
    RETURNING * INTO v_request;

    -- If no row was updated, it means it didn't exist or wasn't pending
    IF v_request IS NULL THEN
        RAISE EXCEPTION 'Payment request not found or not in pending state.';
    END IF;

    -- 2. Create or extend the premium subscription
    -- Upsert the user_subscriptions table for this user and 'active' status
    INSERT INTO user_subscriptions (
        user_id, plan_id, status, current_period_start, current_period_end, updated_at
    )
    VALUES (
        v_request.user_id, v_request.plan_id, 'active', v_now, v_now + INTERVAL '30 days', v_now
    )
    ON CONFLICT (user_id) WHERE status = 'active'
    DO UPDATE SET 
        plan_id = EXCLUDED.plan_id,
        -- If currently active and unexpired, extend it. Otherwise, restart it.
        current_period_start = CASE 
            WHEN user_subscriptions.current_period_end > v_now THEN user_subscriptions.current_period_start 
            ELSE v_now 
        END,
        current_period_end = CASE 
            WHEN user_subscriptions.current_period_end > v_now THEN user_subscriptions.current_period_end + INTERVAL '30 days'
            ELSE v_now + INTERVAL '30 days'
        END,
        updated_at = v_now
    RETURNING id INTO v_subscription_id;

    -- 3. Log the action
    INSERT INTO admin_audit_logs (admin_user_id, action, target_type, target_id, metadata)
    VALUES (
        p_admin_id, 'payment_approved', 'payment_requests', p_request_id::TEXT, 
        jsonb_build_object('subscription_id', v_subscription_id, 'user_id', v_request.user_id)
    );

    RETURN jsonb_build_object(
        'success', true,
        'subscription_id', v_subscription_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 6. Atomic Rejection RPC
CREATE OR REPLACE FUNCTION reject_payment_request(
    p_request_id UUID,
    p_admin_id UUID,
    p_admin_note TEXT
)
RETURNS JSONB AS $$
DECLARE
    v_request RECORD;
    v_now TIMESTAMPTZ := NOW();
BEGIN
    UPDATE payment_requests
    SET 
        status = 'rejected',
        admin_note = p_admin_note,
        reviewed_by = p_admin_id,
        reviewed_at = v_now,
        updated_at = v_now
    WHERE id = p_request_id AND status = 'pending'
    RETURNING * INTO v_request;

    IF v_request IS NULL THEN
        RAISE EXCEPTION 'Payment request not found or not in pending state.';
    END IF;

    -- Log the action
    INSERT INTO admin_audit_logs (admin_user_id, action, target_type, target_id, metadata)
    VALUES (
        p_admin_id, 'payment_rejected', 'payment_requests', p_request_id::TEXT, 
        jsonb_build_object('user_id', v_request.user_id, 'admin_note', p_admin_note)
    );

    RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Secure RPCs: Only the backend (service_role) can execute these.
REVOKE EXECUTE ON FUNCTION approve_payment_request FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION approve_payment_request FROM authenticated;
REVOKE EXECUTE ON FUNCTION approve_payment_request FROM anon;
GRANT EXECUTE ON FUNCTION approve_payment_request TO service_role;

REVOKE EXECUTE ON FUNCTION reject_payment_request FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION reject_payment_request FROM authenticated;
REVOKE EXECUTE ON FUNCTION reject_payment_request FROM anon;
GRANT EXECUTE ON FUNCTION reject_payment_request TO service_role;
