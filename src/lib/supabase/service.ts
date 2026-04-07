// Secrets loaded from environment — never hardcode here
// Required Vercel env vars: SUPABASE_SERVICE_ROLE_KEY, ANTHROPIC_API_KEY
import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

// Without generated Supabase types, strict-mode TypeScript infers untyped table
// operations as `never`. This type preserves real table types where they exist
// while allowing `any` for unrecognised tables and their operations.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ServiceClient = Omit<ReturnType<typeof createClient>, "from"> & {
  from: (relation: string) => any;
};

// Module-level singleton — reused across warm requests in the same function instance.
// Each serverless cold start gets a fresh client; env vars are read once.
let _client: ServiceClient | null = null;

export function getServiceClient(): ServiceClient {
  if (!_client) {
    _client = createClient(env.supabaseUrl, env.supabaseServiceRoleKey) as ServiceClient;
  }
  return _client;
}
