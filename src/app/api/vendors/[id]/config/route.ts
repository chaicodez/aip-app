import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase/service";
import { apiError, dbError } from "@/lib/api-error";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = getServiceClient();

  const [vendorRes, credRes, objRes, jobRes, errRes] = await Promise.all([
    supabase.from("vendors").select("*").eq("id", id).single(),
    supabase.from("credentials").select("*").eq("vendor_id", id).order("key_name"),
    supabase.from("object_queries").select("*").eq("vendor_id", id).order("object_name"),
    supabase.from("sync_jobs").select("*").eq("vendor_id", id).order("created_at", { ascending: false }).limit(10),
    supabase.from("integration_errors").select("*").eq("vendor_id", id).eq("status", "open").order("occurred_at", { ascending: false }),
  ]);

  if (vendorRes.error) return dbError(vendorRes.error, `vendors/${id}/config GET`);

  return NextResponse.json({
    vendor: vendorRes.data,
    credentials: credRes.data ?? [],
    object_queries: objRes.data ?? [],
    sync_jobs: jobRes.data ?? [],
    errors: errRes.data ?? [],
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const { config, auth_type } = body as { config?: Record<string, unknown>; auth_type?: string };

  const supabase = getServiceClient();
  const update: Record<string, unknown> = {};
  if (config !== undefined) update.config = config;
  if (auth_type !== undefined) update.auth_type = auth_type;

  const { data, error } = await supabase
    .from("vendors")
    .update(update)
    .eq("id", id)
    .select()
    .single();

  if (error) return dbError(error, `vendors/${id}/config PATCH`);
  return NextResponse.json(data);
}
