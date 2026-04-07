import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getServiceClient } from "@/lib/supabase/service";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    // Audit before signing out
    try {
      const ip =
        req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
        req.headers.get("x-real-ip") ??
        null;
      const service = getServiceClient();
      await service.from("audit_logs").insert({
        user_id: user.id,
        user_email: user.email,
        action: "logout",
        resource: "auth",
        ip_address: ip,
        user_agent: req.headers.get("user-agent"),
        metadata: {},
      });
    } catch (err) {
      console.error("[auth/signout] audit log failed:", err);
    }
  }

  await supabase.auth.signOut();

  return NextResponse.redirect(new URL("/login", req.url));
}
