import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getServiceClient } from "@/lib/supabase/service";

export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  // Supabase passes errors as query params when its own auth pipeline fails
  const supabaseError = searchParams.get("error");
  if (supabaseError) {
    const desc = searchParams.get("error_description") ?? supabaseError;
    console.error("[auth/callback] Supabase error:", supabaseError, desc);
    return NextResponse.redirect(`${origin}/login?error=auth_failed`);
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=auth_failed`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("[auth/callback] exchangeCodeForSession error:", {
      message: error.message,
      status: (error as { status?: number }).status,
      name: error.name,
      stack: error.stack,
      raw: JSON.stringify(error),
    });
    return NextResponse.redirect(`${origin}/login?error=auth_failed`);
  }

  // Get the user after session exchange
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(`${origin}/login?error=auth_failed`);
  }

  // Enforce domain restriction
  const allowedDomain = process.env.ALLOWED_EMAIL_DOMAIN;
  if (allowedDomain && user.email) {
    const domain = user.email.split("@")[1] ?? "";
    if (domain !== allowedDomain) {
      await supabase.auth.signOut();
      return NextResponse.redirect(`${origin}/login?error=domain_not_allowed`);
    }
  }

  // Upsert user profile (role defaults to "viewer" on first login)
  const service = getServiceClient();
  await service.from("user_profiles").upsert(
    {
      id: user.id,
      email: user.email,
      full_name: user.user_metadata?.full_name ?? user.user_metadata?.name ?? null,
    },
    { onConflict: "id", ignoreDuplicates: false }
  );

  // Audit log
  try {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      req.headers.get("x-real-ip") ??
      null;
    await service.from("audit_logs").insert({
      user_id: user.id,
      user_email: user.email,
      action: "login",
      resource: "auth",
      ip_address: ip,
      user_agent: req.headers.get("user-agent"),
      metadata: { provider: "google" },
    });
  } catch (err) {
    console.error("[auth/callback] audit log failed:", err);
  }

  // Redirect to the originally requested path (sanitise to prevent open redirect)
  const safeNext = next.startsWith("/") ? next : "/";
  return NextResponse.redirect(`${origin}${safeNext}`);
}
