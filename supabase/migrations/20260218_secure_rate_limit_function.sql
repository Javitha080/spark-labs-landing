-- Revoke public execution permissions from check_rate_limit function
-- This prevents unauthorized users from manipulating rate limits for others via RPC
-- The function should only be called by service role (e.g. from Edge Functions)

REVOKE EXECUTE ON FUNCTION public.check_rate_limit(TEXT, INTEGER, INTEGER) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.check_rate_limit(TEXT, INTEGER, INTEGER) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.check_rate_limit(TEXT, INTEGER, INTEGER) FROM anon;

-- Grant execute only to service_role (if needed for Edge Functions using service key)
-- Note: Service role usually has bypassrls and can execute anything, but explicit grant is safer.
GRANT EXECUTE ON FUNCTION public.check_rate_limit(TEXT, INTEGER, INTEGER) TO service_role;
