/*
  GOOGLE DRIVE SETUP
  1. Go to console.cloud.google.com
  2. Create or select a project → Enable "Google Drive API"
  3. IAM & Admin → Service Accounts → Create service account
  4. Keys tab → Add Key → JSON → download the file
  5. Copy the entire JSON content as a single line string
  6. Add to .env.local: GOOGLE_SERVICE_ACCOUNT_JSON='{"type":"service_account",...}'
  7. Add same value to Vercel environment variables
  8. Share any Drive folder with the service account email address (Viewer access)
  9. Add ANTHROPIC_API_KEY to .env.local and Vercel
*/

import { createCipheriv, createSign } from "crypto";
import { getServiceClient } from "@/lib/supabase/service";

// suppress unused-import lint for crypto (used via string refs at runtime)
void createCipheriv;

export interface GDriveFile {
  id: string;
  name: string;
  size: string;
  modifiedTime: string;
  mimeType: string;
}

function base64UrlEncode(input: Buffer | string): string {
  const buf = typeof input === "string" ? Buffer.from(input) : input;
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

async function getAccessToken(): Promise<string> {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON is not set");

  const sa = JSON.parse(raw) as {
    client_email: string;
    private_key: string;
  };

  const now = Math.floor(Date.now() / 1000);
  const header = base64UrlEncode(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = base64UrlEncode(
    JSON.stringify({
      iss: sa.client_email,
      scope: "https://www.googleapis.com/auth/drive.readonly",
      aud: "https://oauth2.googleapis.com/token",
      exp: now + 3600,
      iat: now,
    })
  );

  const signingInput = `${header}.${payload}`;
  const sign = createSign("RSA-SHA256");
  sign.update(signingInput);
  const signature = base64UrlEncode(sign.sign(sa.private_key));
  const jwt = `${signingInput}.${signature}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to get access token: ${text}`);
  }

  const data = (await res.json()) as { access_token: string };
  return data.access_token;
}

export async function listFilesInFolder(folderId: string, token: string): Promise<GDriveFile[]> {
  const params = new URLSearchParams({
    q: `'${folderId}' in parents and mimeType='application/pdf' and trashed=false`,
    fields: "files(id,name,size,modifiedTime,mimeType)",
    pageSize: "100",
  });

  const res = await fetch(`https://www.googleapis.com/drive/v3/files?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to list files: ${text}`);
  }

  const data = (await res.json()) as { files: GDriveFile[] };
  return data.files ?? [];
}

export async function downloadFileAsBase64(fileId: string, token: string): Promise<string> {
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to download file ${fileId}: ${text}`);
  }

  const buffer = await res.arrayBuffer();
  return Buffer.from(buffer).toString("base64");
}

export async function getFolderName(folderId: string, token: string): Promise<string> {
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${folderId}?fields=name`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  if (!res.ok) return folderId;

  const data = (await res.json()) as { name?: string };
  return data.name ?? folderId;
}

interface ExtractedVariable {
  category: string;
  variable_name: string;
  variable_value: string;
  numeric_value: number | null;
  unit: string | null;
  confidence: "high" | "medium" | "low";
  page_reference: string | null;
}

export async function syncFolder(folderId: string): Promise<{
  total: number;
  new: number;
  skipped: number;
  failed: number;
  errors: string[];
}> {
  const supabase = getServiceClient();
  const token = await getAccessToken();
  const files = await listFilesInFolder(folderId, token);
  const folderName = await getFolderName(folderId, token);

  const result = { total: files.length, new: 0, skipped: 0, failed: 0, errors: [] as string[] };

  for (const file of files) {
    // Check if already processed
    const { data: existing } = await supabase
      .from("contract_uploads")
      .select("id")
      .eq("gdrive_file_id", file.id)
      .maybeSingle();

    if (existing) {
      result.skipped++;
      continue;
    }

    // Insert with processing status
    const { data: upload, error: insertError } = await supabase
      .from("contract_uploads")
      .insert({
        file_name: file.name,
        file_size: parseInt(file.size ?? "0", 10) || null,
        gdrive_file_id: file.id,
        gdrive_folder_id: folderId,
        status: "processing",
      })
      .select("id")
      .single();

    if (insertError || !upload) {
      result.failed++;
      result.errors.push(`Insert failed for ${file.name}: ${insertError?.message}`);
      continue;
    }

    try {
      const base64 = await downloadFileAsBase64(file.id, token);

      const anthropicKey = process.env.ANTHROPIC_API_KEY;
      if (!anthropicKey) throw new Error("ANTHROPIC_API_KEY is not set");

      const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": anthropicKey,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 2000,
          system:
            "You are a contract analysis expert. Extract all key commercial variables from this contract PDF. Return ONLY a valid JSON array with no markdown formatting, no code blocks, no explanation. Each array element must have exactly these fields: category (string), variable_name (string), variable_value (string), numeric_value (number or null), unit (string or null), confidence ('high'|'medium'|'low'), page_reference (string or null). Categories to use: COMMERCIAL, TERM, PAYMENT, MODULES, LEGAL, PERFORMANCE.",
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "document",
                  source: {
                    type: "base64",
                    media_type: "application/pdf",
                    data: base64,
                  },
                },
                {
                  type: "text",
                  text: "Extract all variables from this contract. For COMMERCIAL extract: Annual Contract Value, Total Contract Value, Setup/Implementation Fee, Setup Payment Split, Base Employee Capacity, Tier 1 Overage per emp, Tier 2 Overage per emp, PS Hourly Rate, Included Support Hrs/yr, Annual Price Escalation, Currency, Discount %. For TERM extract: Contract Start Date, Contract End Date, Term Length, Renewal Type, Auto-Renewal Notice Period, Termination Notice Period. For PAYMENT: Billing Frequency, Payment Terms Days, Late Payment Penalty. For MODULES: each included product or module as a separate variable. For LEGAL: Governing Law, Liability Cap, SLA Uptime %. For PERFORMANCE: Implementation Timeline, Go-Live Date.",
                },
              ],
            },
          ],
        }),
      });

      if (!claudeRes.ok) {
        const text = await claudeRes.text();
        throw new Error(`Anthropic API error: ${text}`);
      }

      const claudeData = (await claudeRes.json()) as { content: { text: string }[] };
      let rawText = claudeData.content[0]?.text ?? "[]";

      // Strip markdown fences if present
      rawText = rawText.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "").trim();

      const variables: ExtractedVariable[] = JSON.parse(rawText);

      if (variables.length > 0) {
        await supabase.from("contract_variables").insert(
          variables.map((v) => ({ ...v, upload_id: upload.id }))
        );
      }

      // Derive customer_name, industry, acv from extracted vars
      const acvVar = variables.find(
        (v) => v.variable_name.toLowerCase().includes("annual contract value") && v.numeric_value
      );
      const customerVar = variables.find((v) =>
        v.variable_name.toLowerCase().includes("customer") ||
        v.variable_name.toLowerCase().includes("client")
      );
      const industryVar = variables.find((v) =>
        v.variable_name.toLowerCase().includes("industry")
      );

      await supabase
        .from("contract_uploads")
        .update({
          status: "complete",
          extracted_at: new Date().toISOString(),
          acv: acvVar?.numeric_value ?? null,
          customer_name: customerVar?.variable_value ?? null,
          industry: industryVar?.variable_value ?? null,
        })
        .eq("id", upload.id);

      result.new++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      result.failed++;
      result.errors.push(`${file.name}: ${msg}`);

      await supabase
        .from("contract_uploads")
        .update({ status: "failed", error_message: msg })
        .eq("id", upload.id);
    }
  }

  // Update folder sync time
  await supabase
    .from("gdrive_folders")
    .update({ last_synced_at: new Date().toISOString(), folder_name: folderName })
    .eq("folder_id", folderId);

  return result;
}
