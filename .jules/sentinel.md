## 2025-05-22 - [Pattern: Broken Input Sanitization in Edge Functions]
**Vulnerability:** Edge functions were validating/sanitizing input on a temporary object literal passed to a validation function, but continued to use the original unsanitized variables destructured from the request body.
**Learning:** Destructuring at the beginning of a function prevents sanitizers from modifying the local variables unless they are explicitly reassigned.
**Prevention:** Always destructure from the validated object AFTER the validation/sanitization function has run, or ensure the sanitizer returns the clean data.

## 2025-05-22 - [Pattern: Exposed Utility Functions in Supabase RPC]
**Vulnerability:** The `check_rate_limit` database function was granted to `anon` and `authenticated`, allowing any user to manipulate rate limits via RPC.
**Learning:** Supabase automatically exposes all functions in the `public` schema to the REST/RPC API.
**Prevention:** Explicitly `REVOKE ALL ON FUNCTION ... FROM PUBLIC` and only grant to `service_role` if the function is intended for backend use only.
