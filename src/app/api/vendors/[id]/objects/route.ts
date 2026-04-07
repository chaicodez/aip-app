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
    .from("object_queries")
    .select("*")
    .eq("vendor_id", id)
    .order("object_name");

  if (error) return dbError(error, `vendors/${id}/objects GET`);
  return NextResponse.json(data);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body?.object_name || !body?.query) return apiError("object_name and query are required", 400);

  const { object_name, query, enabled } = body as {
    object_name: string;
    query: string;
    enabled?: boolean;
  };

  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from("object_queries")
    .upsert(
      { vendor_id: id, object_name, query, enabled: enabled ?? true },
      { onConflict: "vendor_id,object_name" }
    )
    .select()
    .single();

  if (error) return dbError(error, `vendors/${id}/objects POST`);
  return NextResponse.json(data);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body?.object_name) return apiError("object_name is required", 400);

  const { object_name, enabled, query } = body as {
    object_name: string;
    enabled?: boolean;
    query?: string;
  };

  const update: Record<string, unknown> = {};
  if (enabled !== undefined) update.enabled = enabled;
  if (query !== undefined) update.query = query;

  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from("object_queries")
    .update(update)
    .eq("vendor_id", id)
    .eq("object_name", object_name)
    .select()
    .single();

  if (error) return dbError(error, `vendors/${id}/objects PATCH`);
  return NextResponse.json(data);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const object_name = searchParams.get("object_name");
  if (!object_name) return apiError("object_name query param is required", 400);

  const supabase = getServiceClient();
  const { error } = await supabase
    .from("object_queries")
    .delete()
    .eq("vendor_id", id)
    .eq("object_name", object_name);

  if (error) return dbError(error, `vendors/${id}/objects DELETE`);
  return NextResponse.json({ ok: true });
}
