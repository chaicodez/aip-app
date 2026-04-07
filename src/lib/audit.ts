import { getServiceClient } from "@/lib/supabase/service";
import { headers } from "next/headers";

interface AuditPayload {
  user_id?: string;
  user_email?: string;
  action: string;
  resource?: string;
  metadata?: Record<string, unknown>;
}

export async function writeAuditLog(payload: AuditPayload): Promise<void> {
  try {
    const headerStore = await headers();
    const ip =
      headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      headerStore.get("x-real-ip") ??
      null;
    const userAgent = headerStore.get("user-agent") ?? null;

    const supabase = getServiceClient();
    await supabase.from("audit_logs").insert({
      user_id: payload.user_id ?? null,
      user_email: payload.user_email ?? null,
      action: payload.action,
      resource: payload.resource ?? null,
      ip_address: ip,
      user_agent: userAgent,
      metadata: payload.metadata ?? {},
    });
  } catch (err) {
    // Audit failures must never break the main flow
    console.error("[audit] Failed to write audit log:", err);
  }
}
