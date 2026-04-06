import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase/service";
import { apiError, dbError } from "@/lib/api-error";

export async function GET() {
  try {
    const supabase = getServiceClient();

    const [mappingsRes, errorsRes, credsRes, jobsRes, vendorsRes] = await Promise.all([
      supabase.from("field_mappings").select("*, vendors(name)").order("id"),
      supabase.from("integration_errors").select("*, vendors(name)").order("occurred_at", { ascending: false }),
      supabase.from("credentials").select("*, vendors(name)").order("vendor_id"),
      supabase.from("sync_jobs").select("*, vendors(name)").order("started_at", { ascending: false }).limit(50),
      supabase.from("vendors").select("id, name").order("name"),
    ]);

    if (mappingsRes.error) return dbError(mappingsRes.error, "admin mappings");
    if (errorsRes.error) return dbError(errorsRes.error, "admin errors");
    if (credsRes.error) return dbError(credsRes.error, "admin credentials");
    if (jobsRes.error) return dbError(jobsRes.error, "admin syncJobs");
    if (vendorsRes.error) return dbError(vendorsRes.error, "admin vendors");

    return NextResponse.json({
      mappings: mappingsRes.data ?? [],
      errors: errorsRes.data ?? [],
      credentials: credsRes.data ?? [],
      syncJobs: jobsRes.data ?? [],
      vendors: vendorsRes.data ?? [],
    });
  } catch (err) {
    return apiError(err instanceof Error ? err.message : String(err));
  }
}
