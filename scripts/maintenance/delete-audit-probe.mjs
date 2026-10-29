/**
 * Deletes the security-audit probe account (audit-probe-20261029@example.org)
 * from the primary Supabase project's auth users.
 *
 * Usage (works in PowerShell / bash):
 *   $env:SUPABASE_SERVICE_ROLE_KEY="<service role key from Supabase dashboard>"; node scripts/maintenance/delete-audit-probe.mjs
 *
 * The key is read from the environment only — never commit it, never paste it into chat.
 * Supabase > Dashboard > Project Settings > API keys > service_role ((secret)).
 * Admin API requires service_role; anon/publishable keys are rejected.
 */

const EMAIL = "audit-probe-20261029@example.org";
const URL_BASE = process.env.SUPABASE_URL ?? "https://gtwqjuisdmbqlsjlatyj.supabase.co";
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!KEY || KEY === "YOUR_SERVICE_ROLE_KEY_HERE") {
  console.error("MISSING: set SUPABASE_SERVICE_ROLE_KEY in the environment (service_role secret key).");
  process.exit(2);
}

if (!/^(eyJ|sb_secret_)/.test(KEY)) {
  console.error("The provided key does not look like a Supabase secret key (expected a JWT 'eyJ…' or 'sb_secret_…'). Abort.");
  process.exit(2);
}

const headers = { Authorization: `Bearer ${KEY}`, apikey: KEY, "Content-Type": "application/json" };

async function findUser() {
  for (let page = 1; page <= 10; page++) {
    const res = await fetch(`${URL_BASE}/auth/v1/admin/users?per_page=100&page=${page}`, { headers });
    if (!res.ok) {
      console.error(`admin/users HTTP ${res.status}: ${await res.text()}`);
      process.exit(1);
    }
    const body = await res.json();
    const users = body.users ?? body;
    const hit = users.find((u) => (u.email ?? "").toLowerCase() === EMAIL);
    if (hit) return hit;
    if (users.length < 100) break;
  }
  return null;
}

const user = await findUser();
if (!user) {
  console.log(`NOT FOUND: ${EMAIL} — account already deleted or renamed. Nothing to do.`);
  process.exit(0);
}

console.log(`FOUND: id=${user.id} created_at=${user.created_at} email_confirmed=${user.email_confirmed_at !== null}`);

const del = await fetch(`${URL_BASE}/auth/v1/admin/users/${user.id}`, { method: "DELETE", headers });
if (del.status !== 204) {
  console.error(`DELETE failed: HTTP ${del.status} ${await del.text()}`);
  process.exit(1);
}
console.log("DELETED: HTTP 204");

// Residue check — student_accounts and any profile rows keyed to the auth user.
for (const table of ["student_accounts", "user_roles", "users_management"]) {
  try {
    const check = await fetch(`${URL_BASE}/rest/v1/${table}?select=*`, { headers });
    if (!check.ok) continue;
    const rows = await check.json();
    if (user.id) {
      const linked = rows.filter((r) => r.user_id === user.id || r.auth_user_id === user.id || r.id === user.id);
      if (linked.length > 0) console.log(`RESIDUE: ${table} still has ${linked.length} row(s) for this user`);
    }
  } catch {
    // table may not exist (user_roles/users_management naming checked elsewhere)
  }
}
console.log("DONE — probe account removed from auth.users.");
