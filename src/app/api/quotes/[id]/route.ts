import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase/service";
import { apiError, dbError } from "@/lib/api-error";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = getServiceClient();
    const { status } = await req.json();

    const { data, error } = await supabase
      .from("quotes")
      .update({ status })
      .eq("id", id)
      .select()
      .single();

    if (error) return dbError(error, `quotes/${id} PATCH`);

    // Also update any pending approval records
    if (status === "approved" || status === "rejected") {
      await supabase
        .from("quote_approvals")
        .update({ status, approved_at: new Date().toISOString() })
        .eq("quote_id", id)
        .eq("status", "pending");
    }

    return NextResponse.json(data);
  } catch (err) {
    return apiError(err instanceof Error ? err.message : String(err));
  }
}
