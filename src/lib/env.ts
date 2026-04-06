// Secrets loaded from environment — never hardcode here
// Required Vercel env vars: SUPABASE_SERVICE_ROLE_KEY, ANTHROPIC_API_KEY

function requireEnv(key: string): string {
  const val = process.env[key];
  if (!val && process.env.NODE_ENV === "production") {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return val ?? "";
}

function optionalEnv(key: string): string {
  return process.env[key] ?? "";
}

// Lazy getters — validation runs at request time, not at build time
export const env = {
  get supabaseUrl()           { return requireEnv("NEXT_PUBLIC_SUPABASE_URL"); },
  get supabaseAnonKey()       { return requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"); },
  get supabaseServiceRoleKey(){ return requireEnv("SUPABASE_SERVICE_ROLE_KEY"); },
  get appUrl()                { return requireEnv("NEXT_PUBLIC_APP_URL"); },
  get anthropicApiKey()       { return optionalEnv("ANTHROPIC_API_KEY"); },
  get googleServiceAccount()  { return optionalEnv("GOOGLE_SERVICE_ACCOUNT_JSON"); },
} as const;
