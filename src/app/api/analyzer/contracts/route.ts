import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase/service";
import { apiError, dbError } from "@/lib/api-error";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const search = searchParams.get("search") ?? "";
    const industry = searchParams.get("industry") ?? "";
    const minAcv = searchParams.get("min_acv");
    const maxAcv = searchParams.get("max_acv");

    const supabase = getServiceClient();
    let query = supabase
      .from("contract_uploads")
      .select("*, contract_variables(*)")
      .order("created_at", { ascending: false });

    if (search) {
      query = query.or(
        `customer_name.ilike.%${search}%,file_name.ilike.%${search}%`
      );
    }

    if (industry) {
      query = query.eq("industry", industry);
    }

    if (minAcv) {
      query = query.gte("acv", parseFloat(minAcv));
    }

    if (maxAcv) {
      query = query.lte("acv", parseFloat(maxAcv));
    }

    const { data, error } = await query;
    if (error) return dbError(error, "contracts GET");
    return NextResponse.json(data ?? []);
  } catch (err) {
    return apiError(err instanceof Error ? err.message : String(err));
  }
}
