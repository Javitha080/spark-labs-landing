# Held migrations

SQL here is **not** applied by `supabase db push`. It exists for changes that
must deliberately wait until a precondition is true in production.

## Currently held

Nothing. `20261031000000_drop_permission_tables.sql` was applied manually on
2026-11-01 after `0.4.0` went live, then moved into `supabase/migrations/` so a
fresh environment reproduces the same schema. It is idempotent
(`DROP ... IF EXISTS` plus a guarded publication detach), so a later
`db push` re-running it is a no-op.

When parking a migration here, add a section stating:

1. what the SQL does and why it cannot run with the current release,
2. the exact preconditions for applying it,
3. how to apply it (SQL editor or move back into `supabase/migrations/`).
