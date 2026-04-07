import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase/service";
import { apiError, dbError } from "@/lib/api-error";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");

  const supabase = getServiceClient();
  let query = supabase
    .from("integration_errors")
    .select("*")
    .eq("vendor_id", id)
    .order("occurred_at", { ascending: false });

  if (status) query = query.eq("status", status);

  const { data, error } = await query;
  if (error) return dbError(error, `vendors/${id}/errors GET`);
  return NextResponse.json(data);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: _vendorId } = await params;
  const body = await req.json().catch(() => null);
  if (!body?.id || !body?.status) return apiError("id and status are required", 400);

  const { id, status } = body as { id: string; status: string };
  const update: Record<string, unknown> = { status };
  if (status === "resolved") update.resolved_at = new Date().toISOString();

  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from("integration_errors")
    .update(update)
    .eq("id", id)
    .select()
    .single();

  if (error) return dbError(error, `vendors/${id}/errors PATCH`);
  return NextResponse.json(data);
}
