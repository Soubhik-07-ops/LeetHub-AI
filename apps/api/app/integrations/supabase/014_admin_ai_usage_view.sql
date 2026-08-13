CREATE OR REPLACE VIEW public.admin_ai_usage_view AS
SELECT 
    u.id as user_id,
    u.email,
    COUNT(a.id) FILTER (WHERE a.created_at >= date_trunc('day', NOW() AT TIME ZONE 'UTC')) as daily_used,
    COUNT(a.id) FILTER (WHERE a.created_at >= date_trunc('month', NOW() AT TIME ZONE 'UTC')) as monthly_used,
    MAX(a.created_at) as last_request,
    COALESCE(MAX(p.slug), 'free') as current_plan,
    COALESCE(MAX(p.ai_analysis_limit), 5) as analysis_limit
FROM auth.users u
LEFT JOIN ai_usage a ON a.user_id = u.id
LEFT JOIN user_subscriptions s ON s.user_id = u.id AND s.status = 'active'
LEFT JOIN plans p ON p.id = s.plan_id
GROUP BY u.id, u.email;

REVOKE ALL ON public.admin_ai_usage_view FROM PUBLIC;
REVOKE ALL ON public.admin_ai_usage_view FROM anon;
REVOKE ALL ON public.admin_ai_usage_view FROM authenticated;

GRANT SELECT ON public.admin_ai_usage_view TO service_role;
