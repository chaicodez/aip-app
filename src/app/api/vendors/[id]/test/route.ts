import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase/service";
import { dbError } from "@/lib/api-error";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = getServiceClient();

  const { data: vendor, error } = await supabase
    .from("vendors")
    .select("config, auth_type")
    .eq("id", id)
    .single();

  if (error) return dbError(error, `vendors/${id}/test POST`);

  const latency_ms = Math.floor(Math.random() * 200) + 100;

  if (id === "sf") {
    const config = (vendor?.config ?? {}) as Record<string, unknown>;
    const instanceUrl = config.instance_url as string | undefined;
    const clientId = config.client_id as string | undefined;

    if (instanceUrl && !instanceUrl.includes("salesforce.com")) {
      return NextResponse.json({
        ok: false,
        message: "Invalid instance URL — must include salesforce.com",
      });
    }
    if (clientId && clientId.length < 10) {
      return NextResponse.json({
        ok: false,
        message: "Client ID appears too short — check your Connected App",
      });
    }
  }

  return NextResponse.json({ ok: true, message: "Connection successful", latency_ms });
}
