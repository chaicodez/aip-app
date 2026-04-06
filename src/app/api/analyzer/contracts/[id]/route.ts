import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase/service";
import { apiError, dbError } from "@/lib/api-error";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = getServiceClient();

    const { error } = await supabase
      .from("contract_uploads")
      .delete()
      .eq("id", id);

    if (error) return dbError(error, "contracts DELETE");
    return NextResponse.json({ ok: true });
  } catch (err) {
    return apiError(err instanceof Error ? err.message : String(err));
  }
}
