import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase/service";
import { apiError, dbError } from "@/lib/api-error";

export async function GET() {
  try {
    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from("quotes")
      .select("*, quote_line_items(*), quote_approvals(*)")
      .order("created_at", { ascending: false });
    if (error) return dbError(error, "quotes GET");
    return NextResponse.json(data);
  } catch (err) {
    return apiError(err instanceof Error ? err.message : String(err));
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = getServiceClient();
    const body = await req.json();
    const {
      customer_name, account_owner, industry, hris_platform,
      employees, term_months, impl_scope, impl_fee, impl_billing,
      managed_services_monthly, billing_frequency, payment_terms,
      renewal_type, price_escalator_pct, special_terms,
      arr, tcv, max_discount_pct, effective_pepy, status,
      line_items, required_approver,
    } = body;

    const { data: quote, error } = await supabase
      .from("quotes")
      .insert({
        customer_name, account_owner: account_owner || null,
        industry: industry || null, hris_platform: hris_platform || null,
        employees, term_months, impl_scope, impl_fee, impl_billing,
        managed_services_monthly, billing_frequency, payment_terms,
        renewal_type, price_escalator_pct, special_terms: special_terms || null,
        arr, tcv, max_discount_pct, effective_pepy, status,
      })
      .select()
      .single();

    if (error) return dbError(error, "quotes POST insert");

    if (line_items?.length) {
      const { error: liErr } = await supabase.from("quote_line_items").insert(
        line_items.map((li: { module_name: string; list_price: number; quantity: number; discount_pct: number }) => ({
          quote_id: quote.id,
          module_name: li.module_name,
          list_price: li.list_price,
          quantity: li.quantity,
          discount_pct: li.discount_pct,
        }))
      );
      if (liErr) return dbError(liErr, "quotes POST line_items");
    }

    if (status === "pending" && required_approver) {
      await supabase.from("quote_approvals").insert({
        quote_id: quote.id,
        required_approver,
        status: "pending",
      });
    }

    return NextResponse.json(quote, { status: 201 });
  } catch (err) {
    return apiError(err instanceof Error ? err.message : String(err));
  }
}
