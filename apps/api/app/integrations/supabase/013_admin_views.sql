-- Migration 013: Admin Views for safe joining with auth.users

-- This view exposes necessary fields from auth.users to the public schema
-- so that the backend service_role can perform joins and paginated queries.
CREATE OR REPLACE VIEW public.admin_users_view AS
SELECT 
    id,
    email,
    created_at,
    last_sign_in_at
FROM auth.users;

-- Secure the view: only service_role (the backend) can query it.
-- We revoke access from anon and authenticated users completely.
REVOKE ALL ON public.admin_users_view FROM PUBLIC;
REVOKE ALL ON public.admin_users_view FROM anon;
REVOKE ALL ON public.admin_users_view FROM authenticated;

GRANT SELECT ON public.admin_users_view TO service_role;
