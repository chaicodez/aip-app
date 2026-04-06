// Secrets loaded from environment — never hardcode here
// Required Vercel env vars: SUPABASE_SERVICE_ROLE_KEY, ANTHROPIC_API_KEY
import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

export function getServiceClient() {
  return createClient(env.supabaseUrl, env.supabaseServiceRoleKey);
}
