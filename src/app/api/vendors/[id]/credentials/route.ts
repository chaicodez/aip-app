import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase/service";
import { apiError, dbError } from "@/lib/api-error";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from("credentials")
    .select("id, vendor_id, key_name, store, credential_type, masked_value, status, updated_at, rotated_at")
    .eq("vendor_id", id)
    .order("key_name");

  if (error) return dbError(error, `vendors/${id}/credentials GET`);
  return NextResponse.json(data);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body?.key_name) return apiError("key_name is required", 400);

  const { key_name, store, credential_type, masked_value, status } = body as {
    key_name: string;
    store?: string;
    credential_type?: string;
    masked_value?: string;
    status?: string;
  };

  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from("credentials")
    .upsert(
      { vendor_id: id, key_name, store, credential_type, masked_value, status: status ?? "ok", updated_at: new Date().toISOString() },
      { onConflict: "vendor_id,key_name" }
    )
    .select()
    .single();

  if (error) return dbError(error, `vendors/${id}/credentials POST`);
  return NextResponse.json(data);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const key_name = searchParams.get("key_name");
  if (!key_name) return apiError("key_name query param is required", 400);

  const supabase = getServiceClient();
  const { error } = await supabase
    .from("credentials")
    .delete()
    .eq("vendor_id", id)
    .eq("key_name", key_name);

  if (error) return dbError(error, `vendors/${id}/credentials DELETE`);
  return NextResponse.json({ ok: true });
}
