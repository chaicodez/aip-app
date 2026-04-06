import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase/service";
import { apiError, dbError } from "@/lib/api-error";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = getServiceClient();

    const [accountRes, opportunitiesRes, proservRes, rdRes] = await Promise.all([
      supabase
        .from("accounts")
        .select("*, account_modules(module_name, modules(name, price_pepy))")
        .eq("id", id)
        .single(),
      supabase
        .from("opportunities")
        .select("*")
        .eq("account_id", id)
        .order("close_date", { ascending: false }),
      supabase
        .from("proserv_engagements")
        .select("*, proserv_resources(*)")
        .eq("account_id", id)
        .single(),
      supabase
        .from("rd_tickets")
        .select("*")
        .eq("account_id", id)
        .order("priority"),
    ]);

    if (accountRes.error) {
      if (accountRes.error.code === "PGRST116") return apiError("Not found", 404);
      return dbError(accountRes.error, `accounts/${id} GET`);
    }
    if (!accountRes.data) return apiError("Not found", 404);

    return NextResponse.json({
      account: accountRes.data,
      opportunities: opportunitiesRes.data ?? [],
      proserv: proservRes.data ?? null,
      rdTickets: rdRes.data ?? [],
    });
  } catch (err) {
    return apiError(err instanceof Error ? err.message : String(err));
  }
}
