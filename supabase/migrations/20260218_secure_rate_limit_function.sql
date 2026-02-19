-- Revoke public execution permissions from check_rate_limit function
-- This prevents unauthorized users from manipulating rate limits for others via RPC
-- The function should only be called by service role (e.g. from Edge Functions)

DO $$
BEGIN
    -- Use dynamic SQL to avoid parse-time errors if the function doesn't exist
    IF EXISTS (
        SELECT 1
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public' AND p.proname = 'check_rate_limit'
    ) THEN
        EXECUTE 'REVOKE EXECUTE ON FUNCTION public.check_rate_limit(TEXT, INTEGER, INTEGER) FROM PUBLIC';
        EXECUTE 'REVOKE EXECUTE ON FUNCTION public.check_rate_limit(TEXT, INTEGER, INTEGER) FROM authenticated';
        EXECUTE 'REVOKE EXECUTE ON FUNCTION public.check_rate_limit(TEXT, INTEGER, INTEGER) FROM anon';

        -- Ensure service_role still has access
        EXECUTE 'GRANT EXECUTE ON FUNCTION public.check_rate_limit(TEXT, INTEGER, INTEGER) TO service_role';
    END IF;
END $$;
