import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase/service";
import { apiError, dbError } from "@/lib/api-error";

export async function GET() {
  try {
    const supabase = getServiceClient();
    const { data, error } = await supabase.from("modules").select("*").order("name");
    if (error) return dbError(error, "modules GET");
    return NextResponse.json(data);
  } catch (err) {
    return apiError(err instanceof Error ? err.message : String(err));
  }
}
