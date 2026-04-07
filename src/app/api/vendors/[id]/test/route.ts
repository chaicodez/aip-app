import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase/service";
import { dbError } from "@/lib/api-error";

const TIMEOUT_MS = 7000;

type TestResult = { ok: boolean; message: string; latency_ms?: number; error_detail?: string };

// ── Salesforce ────────────────────────────────────────────────────────────────
async function testSalesforce(config: Record<string, string>): Promise<TestResult> {
  const instanceUrl = config.instance_url?.trim();
  if (!instanceUrl) return { ok: false, message: "Instance URL not configured", error_detail: "Set instance URL in the Connection tab." };

  if (!instanceUrl.startsWith("https://")) return { ok: false, message: "Instance URL must start with https://", error_detail: instanceUrl };

  const start = Date.now();
  try {
    // /services/data/ is public — returns API versions list. 200 = URL valid, 401 = URL valid but needs auth.
    const res = await fetch(`${instanceUrl}/services/data/`, { signal: AbortSignal.timeout(TIMEOUT_MS) });
    const latency_ms = Date.now() - start;

    if (res.ok) {
      // Instance URL valid — now try OAuth if credentials present
      if (config.client_id && config.client_secret) {
        const tokenRes = await fetch(`${instanceUrl}/services/oauth2/token`, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            grant_type: "client_credentials",
            client_id: config.client_id,
            client_secret: config.client_secret,
          }),
          signal: AbortSignal.timeout(TIMEOUT_MS),
        });
        if (tokenRes.ok) return { ok: true, message: "Connected — OAuth token obtained", latency_ms: Date.now() - start };
        const body = await tokenRes.json().catch(() => ({}));
        return { ok: false, message: `OAuth failed — HTTP ${tokenRes.status}`, error_detail: body.error_description ?? body.error ?? tokenRes.statusText, latency_ms };
      }
      return { ok: true, message: "Instance URL reachable — add Client ID + Secret to test OAuth", latency_ms };
    }

    if (res.status === 401 || res.status === 403) return { ok: true, message: "Instance URL reachable — auth required", latency_ms };
    const text = await res.text().catch(() => "");
    return { ok: false, message: `HTTP ${res.status} from Salesforce instance`, error_detail: text.slice(0, 300), latency_ms };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, message: "Could not reach Salesforce instance", error_detail: msg };
  }
}

// ── Jira ──────────────────────────────────────────────────────────────────────
async function testJira(config: Record<string, string>): Promise<TestResult> {
  const baseUrl  = (config.base_url?.trim()  || process.env.JIRA_BASE_URL  || "").replace(/\/$/, "");
  const email    = (config.email?.trim()     || process.env.JIRA_USER_EMAIL || "");
  const apiToken = (config.api_token?.trim() || process.env.JIRA_API_TOKEN  || "");

  if (!baseUrl)    return { ok: false, message: "Jira base URL not configured", error_detail: "Set Base URL in the Connection tab or JIRA_BASE_URL env var." };
  if (!email)      return { ok: false, message: "Jira email not configured",    error_detail: "Set Email in the Connection tab or JIRA_USER_EMAIL env var." };
  if (!apiToken)   return { ok: false, message: "Jira API token not configured", error_detail: "Set API Token in the Connection tab or JIRA_API_TOKEN env var." };

  const auth = "Basic " + Buffer.from(`${email}:${apiToken}`).toString("base64");
  const start = Date.now();
  try {
    const res = await fetch(`${baseUrl}/rest/api/3/myself`, {
      headers: { Authorization: auth, Accept: "application/json" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const latency_ms = Date.now() - start;
    if (res.ok) {
      const user = await res.json().catch(() => ({}));
      return { ok: true, message: `Connected as ${user.displayName ?? user.emailAddress ?? email}`, latency_ms };
    }
    const body = await res.json().catch(() => ({}));
    const detail = body.errorMessages?.join("; ") ?? body.message ?? res.statusText;
    return { ok: false, message: `Jira auth failed — HTTP ${res.status}`, error_detail: detail, latency_ms };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, message: "Could not reach Jira", error_detail: msg };
  }
}

// ── NetSuite ──────────────────────────────────────────────────────────────────
async function testNetSuite(config: Record<string, string>): Promise<TestResult> {
  const accountId = config.account_id?.trim() || process.env.NS_ACCOUNT_ID || "";
  if (!accountId) return { ok: false, message: "NetSuite account ID not configured", error_detail: "Set account_id in the Connection tab." };

  const start = Date.now();
  // NetSuite REST discovery endpoint — public, no auth needed
  const host = `https://${accountId.toLowerCase().replace(/_/g, "-")}.suitetalk.api.netsuite.com`;
  try {
    const res = await fetch(`${host}/services/rest/record/v1/metadata-catalog`, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const latency_ms = Date.now() - start;
    // 401 = account ID valid but needs auth (expected without credentials)
    if (res.status === 401) return { ok: true, message: "NetSuite account reachable — credentials required for full auth", latency_ms };
    if (res.ok) return { ok: true, message: "NetSuite connected", latency_ms };
    return { ok: false, message: `NetSuite returned HTTP ${res.status}`, error_detail: res.statusText, latency_ms };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, message: "Could not reach NetSuite", error_detail: msg };
  }
}

// ── Google Workspace ──────────────────────────────────────────────────────────
async function testGoogleWorkspace(config: Record<string, string>): Promise<TestResult> {
  const saJson = config.service_account_json || process.env.GOOGLE_SERVICE_ACCOUNT_JSON || "";
  if (!saJson) return { ok: false, message: "Service account JSON not configured", error_detail: "Set GOOGLE_SERVICE_ACCOUNT_JSON env var or paste JSON in Connection tab." };

  let parsed: { client_email?: string; private_key?: string; project_id?: string };
  try {
    parsed = JSON.parse(saJson);
  } catch {
    return { ok: false, message: "Service account JSON is invalid", error_detail: "Could not parse JSON — check for syntax errors." };
  }

  if (!parsed.client_email) return { ok: false, message: "Service account JSON missing client_email", error_detail: "Ensure you downloaded a proper service account key file." };
  if (!parsed.private_key)  return { ok: false, message: "Service account JSON missing private_key",  error_detail: "Ensure you downloaded a proper service account key file." };

  // Validate the service account can reach Google by hitting the token endpoint
  const start = Date.now();
  try {
    const now = Math.floor(Date.now() / 1000);
    const header  = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url");
    const payload = Buffer.from(JSON.stringify({
      iss: parsed.client_email,
      scope: "https://www.googleapis.com/auth/drive.readonly",
      aud: "https://oauth2.googleapis.com/token",
      exp: now + 3600,
      iat: now,
    })).toString("base64url");

    const { createSign } = await import("crypto");
    const sign = createSign("RSA-SHA256");
    sign.update(`${header}.${payload}`);
    const sig = sign.sign(parsed.private_key, "base64url");
    const jwt = `${header}.${payload}.${sig}`;

    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: jwt }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const latency_ms = Date.now() - start;
    if (tokenRes.ok) return { ok: true, message: `Connected — service account: ${parsed.client_email}`, latency_ms };
    const body = await tokenRes.json().catch(() => ({}));
    return { ok: false, message: `Google auth failed — HTTP ${tokenRes.status}`, error_detail: body.error_description ?? body.error ?? tokenRes.statusText, latency_ms };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, message: "Google connection test failed", error_detail: msg };
  }
}

// ── Route handler ─────────────────────────────────────────────────────────────
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

  const config = (vendor?.config ?? {}) as Record<string, string>;

  let result: TestResult;
  switch (id) {
    case "sf":  result = await testSalesforce(config); break;
    case "jira": result = await testJira(config); break;
    case "ns":  result = await testNetSuite(config); break;
    case "gw":  result = await testGoogleWorkspace(config); break;
    default:    result = { ok: false, message: `No connection test implemented for "${id}"`, error_detail: "Add a test handler in /api/vendors/[id]/test/route.ts" };
  }

  // Log failures server-side for debugging
  if (!result.ok) {
    console.error(`[Connection Test] vendor=${id} message="${result.message}" detail="${result.error_detail ?? ""}"`);
  }

  return NextResponse.json(result);
}
