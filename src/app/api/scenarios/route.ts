import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase/service";
import { apiError, dbError } from "@/lib/api-error";

export async function POST(req: NextRequest) {
  try {
    const supabase = getServiceClient();
    const body = await req.json();
    const { name, model, arr, tcv, employees, term_months, impl_fee, base_account_id, modules } = body;

    const { data: scenario, error } = await supabase
      .from("scenarios")
      .insert({ name, model, arr, tcv, employees, term_months, impl_fee, base_account_id: base_account_id ?? null })
      .select()
      .single();

    if (error) return dbError(error, "scenarios POST insert");

    if (modules?.length) {
      const { error: modErr } = await supabase
        .from("scenario_modules")
        .insert(modules.map((m: string) => ({ scenario_id: scenario.id, module_name: m })));
      if (modErr) return dbError(modErr, "scenarios POST modules");
    }

    return NextResponse.json(scenario, { status: 201 });
  } catch (err) {
    return apiError(err instanceof Error ? err.message : String(err));
  }
}

export async function GET() {
  try {
    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from("scenarios")
      .select("*, scenario_modules(module_name)")
      .order("created_at", { ascending: false });

    if (error) return dbError(error, "scenarios GET");
    return NextResponse.json(data);
  } catch (err) {
    return apiError(err instanceof Error ? err.message : String(err));
  }
}
