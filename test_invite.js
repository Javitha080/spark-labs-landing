import { createClient } from "@supabase/supabase-js";

// Load the keys (hardcoded for the test to make it easy to run)
const SUPABASE_URL = "https://uewwlzsrxdjzpuirljfq.supabase.co";
// Using the service_role key to bypass RLS and use the admin auth API
const SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVld3dsenNyeGRqenB1aXJsamZxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTM2NDA2NywiZXhwIjoyMDk0OTQwMDY3fQ.6TsHo7NwrfkS_DfkYxVfYuoMcBSR-QoiFJCirLaNxuY";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function runTest() {
  const testEmail = process.argv[2];

  if (!testEmail) {
    console.error("❌ Please provide an email address to test.");
    console.error("Usage: node test_invite.js <your-email@example.com>");
    process.exit(1);
  }

  console.log(`🚀 Sending test invitation to: ${testEmail}...`);

  const { data, error } = await supabase.auth.admin.inviteUserByEmail(testEmail, {
    data: { role: "student", name: "Lettermint SMTP Test User" },
    redirectTo: "https://dvpyic.dpdns.org/student/login",
  });

  if (error) {
    console.error("❌ Failed to send invitation:", error.message);
  } else {
    console.log("✅ Success! Invitation sent.");
    console.log("Check your inbox (or spam folder) for the email sent via Lettermint SMTP.");
  }
}

runTest();
