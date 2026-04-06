import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase/service";
import { apiError, dbError } from "@/lib/api-error";

export async function GET() {
  try {
    const supabase = getServiceClient();

    const [guardrails, bundles, pepyFloors, implGuidelines] = await Promise.all([
      supabase.from("discount_guardrails").select("*").order("max_discount_pct"),
      supabase.from("bundle_rules").select("*, bundle_rule_modules(module_name)").order("discount_pct"),
      supabase.from("pepy_floors").select("*").order("min_employees"),
      supabase.from("impl_fee_guidelines").select("*"),
    ]);

    if (guardrails.error) return dbError(guardrails.error, "cpq/rules guardrails");
    if (bundles.error) return dbError(bundles.error, "cpq/rules bundles");
    if (pepyFloors.error) return dbError(pepyFloors.error, "cpq/rules pepyFloors");
    if (implGuidelines.error) return dbError(implGuidelines.error, "cpq/rules implGuidelines");

    return NextResponse.json({
      guardrails: guardrails.data,
      bundles: bundles.data,
      pepyFloors: pepyFloors.data,
      implGuidelines: implGuidelines.data,
    });
  } catch (err) {
    return apiError(err instanceof Error ? err.message : String(err));
  }
}
