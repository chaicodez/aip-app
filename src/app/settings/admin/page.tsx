import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { getServiceClient } from "@/lib/supabase/service";
import { AdminConsole } from "./admin-console";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  // ── Auth gate ──────────────────────────────────────────────────────────────
  const sessionClient = await createServerClient();
  const { data: { user } } = await sessionClient.auth.getUser();
  if (!user) redirect("/settings");

  const { data: profile } = await sessionClient
    .from("user_profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") redirect("/settings");

  // ── Fetch all admin data in parallel ──────────────────────────────────────
  const supabase = getServiceClient();
  const [mappingsRes, errorsRes, credsRes, jobsRes, vendorsRes] = await Promise.all([
    supabase.from("field_mappings").select("*, vendors(name)").order("id"),
    supabase.from("integration_errors").select("*, vendors(name)").order("occurred_at", { ascending: false }),
    supabase.from("credentials").select("*, vendors(name)").order("vendor_id"),
    supabase.from("sync_jobs").select("*, vendors(name)").order("started_at", { ascending: false }).limit(50),
    supabase.from("vendors").select("id, name").order("name"),
  ]);

  const mappings = mappingsRes.data ?? [];
  const errors = errorsRes.data ?? [];
  const credentials = credsRes.data ?? [];
  const syncJobs = jobsRes.data ?? [];
  const vendors = vendorsRes.data ?? [];

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <Link
          href="/settings"
          className="text-sm border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors"
        >
          ← Data Sources
        </Link>
        <h1 className="text-base font-semibold text-gray-900">Admin Console</h1>
        <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">
          Admin
        </span>
      </div>

      <AdminConsole
        mappings={mappings}
        errors={errors}
        credentials={credentials}
        syncJobs={syncJobs}
        vendors={vendors}
      />
    </div>
  );
}
