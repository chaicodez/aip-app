import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase/service";
import { apiError, dbError } from "@/lib/api-error";
import type { QuoteStatus, ApprovalStatus } from "@/lib/types";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = getServiceClient();
    const body = await req.json() as { status: QuoteStatus };
    const status: QuoteStatus = body.status;

    const { data, error } = await supabase
      .from("quotes")
      .update({ status })
      .eq("id", id)
      .select()
      .single();

    if (error) return dbError(error, `quotes/${id} PATCH`);

    // Also update any pending approval records
    if (status === "approved" || status === "rejected") {
      const approvalStatus = status as ApprovalStatus;
      await supabase
        .from("quote_approvals")
        .update({ status: approvalStatus, approved_at: new Date().toISOString() })
        .eq("quote_id", id)
        .eq("status", "pending" as ApprovalStatus);
    }

    return NextResponse.json(data);
  } catch (err) {
    return apiError(err instanceof Error ? err.message : String(err));
  }
}
