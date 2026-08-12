-- Migration 008: Analytics RPCs

-- Topic Intelligence RPC
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
        t.topic,
        COUNT(DISTINCT s.problem_slug) AS attempted_problems,
        COUNT(DISTINCT CASE WHEN s.status = 'accepted' THEN s.problem_slug END) AS accepted_problems,
        COUNT(*) AS total_submissions
    FROM submissions s
    CROSS JOIN LATERAL unnest(s.topics) AS t(topic)
    WHERE s.user_id = p_user_id
    GROUP BY t.topic
    ORDER BY attempted_problems DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Difficulty Intelligence RPC
CREATE OR REPLACE FUNCTION get_difficulty_stats(p_user_id UUID)
RETURNS TABLE (
    difficulty TEXT,
    attempted_problems BIGINT,
    accepted_problems BIGINT,
    total_submissions BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(s.difficulty, 'Unknown') AS difficulty,
        COUNT(DISTINCT s.problem_slug) AS attempted_problems,
        COUNT(DISTINCT CASE WHEN s.status = 'accepted' THEN s.problem_slug END) AS accepted_problems,
        COUNT(*) AS total_submissions
    FROM submissions s
    WHERE s.user_id = p_user_id
    GROUP BY COALESCE(s.difficulty, 'Unknown')
    ORDER BY attempted_problems DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Language Intelligence RPC
CREATE OR REPLACE FUNCTION get_language_stats(p_user_id UUID)
RETURNS TABLE (
    language TEXT,
    attempted_problems BIGINT,
    accepted_problems BIGINT,
    total_submissions BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(s.language, 'Unknown') AS language,
        COUNT(DISTINCT s.problem_slug) AS attempted_problems,
        COUNT(DISTINCT CASE WHEN s.status = 'accepted' THEN s.problem_slug END) AS accepted_problems,
        COUNT(*) AS total_submissions
    FROM submissions s
    WHERE s.user_id = p_user_id
    GROUP BY COALESCE(s.language, 'Unknown')
    ORDER BY attempted_problems DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Contest Intelligence RPC
CREATE OR REPLACE FUNCTION get_contest_stats(p_user_id UUID)
RETURNS TABLE (
    contest_type TEXT,
    attempted_problems BIGINT,
    accepted_problems BIGINT,
    total_submissions BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        CASE 
            WHEN s.contest_slug LIKE 'weekly-contest-%' THEN 'Weekly'
            WHEN s.contest_slug LIKE 'biweekly-contest-%' THEN 'Biweekly'
            WHEN s.contest_slug IS NOT NULL THEN 'Other Contest'
            ELSE 'Practice'
        END AS contest_type,
        COUNT(DISTINCT s.problem_slug) AS attempted_problems,
        COUNT(DISTINCT CASE WHEN s.status = 'accepted' THEN s.problem_slug END) AS accepted_problems,
        COUNT(*) AS total_submissions
    FROM submissions s
    WHERE s.user_id = p_user_id
    GROUP BY 
        CASE 
            WHEN s.contest_slug LIKE 'weekly-contest-%' THEN 'Weekly'
            WHEN s.contest_slug LIKE 'biweekly-contest-%' THEN 'Biweekly'
            WHEN s.contest_slug IS NOT NULL THEN 'Other Contest'
            ELSE 'Practice'
        END
    ORDER BY attempted_problems DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Activity Heatmap RPC
CREATE OR REPLACE FUNCTION get_activity_heatmap(p_user_id UUID)
RETURNS TABLE (
    activity_date TEXT,
    submissions BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        TO_CHAR(s.submitted_at AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS activity_date,
        COUNT(*) AS submissions
    FROM submissions s
    WHERE s.user_id = p_user_id
    GROUP BY TO_CHAR(s.submitted_at AT TIME ZONE 'UTC', 'YYYY-MM-DD')
    ORDER BY activity_date ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
