-- Migration 009: Analytics Fixes & Performance Improvements

-- 1. Fix get_topic_stats to avoid double-counting duplicate topics in the same submission
CREATE OR REPLACE FUNCTION get_topic_stats(p_user_id UUID)
RETURNS TABLE (
    topic TEXT,
    attempted_problems BIGINT,
    accepted_problems BIGINT,
    total_submissions BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.topic_name AS topic,
        COUNT(DISTINCT s.problem_slug) AS attempted_problems,
        COUNT(DISTINCT CASE WHEN s.status = 'accepted' THEN s.problem_slug END) AS accepted_problems,
        COUNT(DISTINCT s.id) AS total_submissions
    FROM submissions s
    CROSS JOIN LATERAL unnest(s.topics) AS t(topic_name)
    WHERE s.user_id = p_user_id
    GROUP BY t.topic_name
    ORDER BY attempted_problems DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Streak Stats RPC (Gaps and Islands approach using native UTC day grouping)
CREATE OR REPLACE FUNCTION get_streak_stats(p_user_id UUID)
RETURNS TABLE (
    current_streak INT,
    longest_streak INT
) AS $$
DECLARE
    v_current_streak INT := 0;
    v_longest_streak INT := 0;
BEGIN
    WITH daily_activity AS (
        SELECT DISTINCT TO_CHAR(submitted_at AT TIME ZONE 'UTC', 'YYYY-MM-DD')::DATE AS activity_date
        FROM submissions
        WHERE user_id = p_user_id
    ),
    streak_groups AS (
        SELECT 
            activity_date,
            activity_date - (ROW_NUMBER() OVER (ORDER BY activity_date))::INT AS grp
        FROM daily_activity
    ),
    streak_lengths AS (
        SELECT 
            COUNT(*) AS streak_len,
            MAX(activity_date) AS max_date
        FROM streak_groups
        GROUP BY grp
    )
    SELECT 
        COALESCE(MAX(CASE WHEN max_date >= (CURRENT_DATE AT TIME ZONE 'UTC')::DATE - 1 THEN streak_len ELSE 0 END), 0),
        COALESCE(MAX(streak_len), 0)
    INTO v_current_streak, v_longest_streak
    FROM streak_lengths;

    RETURN QUERY SELECT COALESCE(v_current_streak, 0), COALESCE(v_longest_streak, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 3. Overview Stats RPC (Eliminates unbounded Python query)
CREATE OR REPLACE FUNCTION get_overview_stats(p_user_id UUID)
RETURNS TABLE (
    total_submissions BIGINT,
    unique_problems BIGINT,
    accepted_submissions BIGINT,
    rejected_submissions BIGINT,
    github_synced_count BIGINT,
    github_failed_count BIGINT,
    github_skipped_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) AS total_submissions,
        COUNT(DISTINCT problem_slug) AS unique_problems,
        COUNT(*) FILTER (WHERE status = 'accepted') AS accepted_submissions,
        COUNT(*) FILTER (WHERE status != 'accepted') AS rejected_submissions,
        COUNT(*) FILTER (WHERE github_sync_status = 'synced') AS github_synced_count,
        COUNT(*) FILTER (WHERE github_sync_status = 'failed') AS github_failed_count,
        COUNT(*) FILTER (WHERE github_sync_status NOT IN ('synced', 'failed')) AS github_skipped_count
    FROM submissions
    WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 4. Trend Metrics RPC
CREATE OR REPLACE FUNCTION get_trend_metrics(p_user_id UUID)
RETURNS TABLE (
    recent_attempted BIGINT,
    recent_accepted BIGINT,
    previous_attempted BIGINT,
    previous_accepted BIGINT
) AS $$
DECLARE
    v_recent_attempted BIGINT;
    v_recent_accepted BIGINT;
    v_previous_attempted BIGINT;
    v_previous_accepted BIGINT;
    v_now TIMESTAMPTZ := NOW() AT TIME ZONE 'UTC';
BEGIN
    SELECT 
        COUNT(DISTINCT problem_slug),
        COUNT(DISTINCT CASE WHEN status = 'accepted' THEN problem_slug END)
    INTO v_recent_attempted, v_recent_accepted
    FROM submissions
    WHERE user_id = p_user_id 
      AND submitted_at >= v_now - INTERVAL '14 days';

    SELECT 
        COUNT(DISTINCT problem_slug),
        COUNT(DISTINCT CASE WHEN status = 'accepted' THEN problem_slug END)
    INTO v_previous_attempted, v_previous_accepted
    FROM submissions
    WHERE user_id = p_user_id 
      AND submitted_at >= v_now - INTERVAL '28 days'
      AND submitted_at < v_now - INTERVAL '14 days';

    RETURN QUERY SELECT 
        COALESCE(v_recent_attempted, 0), 
        COALESCE(v_recent_accepted, 0), 
        COALESCE(v_previous_attempted, 0), 
        COALESCE(v_previous_accepted, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
