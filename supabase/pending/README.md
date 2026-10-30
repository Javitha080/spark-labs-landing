# Held migrations

SQL here is **not** applied by `supabase db push`. It is kept for a deliberate,
separate step once its preconditions are true in production.

## `20261031000000_drop_permission_tables.sql`

Drops `permissions`, `role_permissions` and `has_permission()`. Nothing in the
new stack reads them: roles are resolved by `get_cms_role()` and capabilities
come from the static `ROLE_PERMISSIONS` map in `src/lib/rbac.ts`.

**Do not apply before the release containing the new `RolesManager` is live.**
The previously deployed admin bundle (`0.3.0`) still queries both tables to
render `/admin/roles`; dropping them first breaks that page until the new
build replaces it.

Apply only after all of the following:

1. The `0.4.0` frontend is deployed and `/admin/roles` renders from
   `get_cms_role()` / `roles` alone.
2. `/api/build-version` reports `0.4.0`.
3. Nobody has an admin tab open on the old bundle (a hard refresh clears it).

How to apply:

- **SQL editor:** paste the file's contents and run it. It is written to be
  re-runnable (`DROP ... IF EXISTS`, guarded publication detach).
- **CLI:** move the file back into `supabase/migrations/`, then
  `npx supabase db push --project-ref <ref>`. Keeping the timestamp preserves
  ordering; no later migration depends on these tables.

Leaving the tables in place is also safe if the cleanup is never wanted;
they are unused, not load-bearing.
