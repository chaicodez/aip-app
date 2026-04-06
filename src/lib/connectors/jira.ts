/**
 * Jira Connector
 *
 * Fetches issues from a Jira project where a custom field matches account_id,
 * retrieves worklogs, and upserts into rd_tickets.
 *
 * Environment variables required:
 *   JIRA_BASE_URL      — e.g. https://yourorg.atlassian.net
 *   JIRA_USER_EMAIL    — Atlassian account email
 *   JIRA_API_TOKEN     — Atlassian API token
 *   JIRA_PROJECT_KEY   — e.g. "AIP"
 *   JIRA_ACCOUNT_FIELD — Custom field ID, e.g. "customfield_10042"
 */

import { getServiceClient } from "@/lib/supabase/service";

// ─── Config ───────────────────────────────────────────────────────────────────
interface JiraConfig {
  baseUrl: string;
  userEmail: string;
  apiToken: string;
  projectKey: string;
  accountField: string; // custom field name that holds account_id
}

function defaultConfig(): JiraConfig {
  return {
    baseUrl:      process.env.JIRA_BASE_URL      ?? "",
    userEmail:    process.env.JIRA_USER_EMAIL     ?? "",
    apiToken:     process.env.JIRA_API_TOKEN      ?? "",
    projectKey:   process.env.JIRA_PROJECT_KEY    ?? "AIP",
    accountField: process.env.JIRA_ACCOUNT_FIELD  ?? "customfield_10042",
  };
}

function authHeader(email: string, token: string) {
  return "Basic " + Buffer.from(`${email}:${token}`).toString("base64");
}

// ─── Jira API types ───────────────────────────────────────────────────────────
interface JiraIssue {
  id:     string;
  key:    string; // e.g. "AIP-42"
  fields: {
    summary:  string;
    status:   { name: string };
    priority: { name: string } | null;
    [key: string]: unknown; // custom fields
  };
}

interface JiraWorklog {
  timeSpentSeconds: number;
}

// ─── Priority mapping ─────────────────────────────────────────────────────────
function mapPriority(jiraPriority: string | null): "High" | "Medium" | "Low" {
  if (!jiraPriority) return "Medium";
  const p = jiraPriority.toLowerCase();
  if (p === "highest" || p === "high" || p === "critical" || p === "blocker") return "High";
  if (p === "lowest"  || p === "low"  || p === "minor"    || p === "trivial") return "Low";
  return "Medium";
}

// ─── Status mapping ───────────────────────────────────────────────────────────
function mapStatus(jiraStatus: string): "Open" | "In Progress" | "Closed" {
  const s = jiraStatus.toLowerCase();
  if (s === "done" || s === "closed" || s === "resolved" || s === "won't do") return "Closed";
  if (s.includes("progress") || s.includes("review") || s === "in development") return "In Progress";
  return "Open";
}

// ─── Main sync function ───────────────────────────────────────────────────────
export async function syncJiraForAccount(
  accountId: string,
  config: Partial<JiraConfig> = {}
): Promise<{ upserted: number; errors: string[] }> {
  const cfg = { ...defaultConfig(), ...config };

  if (!cfg.baseUrl || !cfg.userEmail || !cfg.apiToken) {
    throw new Error("Jira not configured — set JIRA_BASE_URL, JIRA_USER_EMAIL, JIRA_API_TOKEN");
  }

  const supabase = getServiceClient();

  // 1. Start sync_job record
  const { data: job } = await supabase
    .from("sync_jobs")
    .insert({ vendor_id: "jira", status: "running" })
    .select()
    .single();

  const jobId: string = job?.id;
  const errors: string[] = [];
  let upserted = 0;
  let processed = 0;

  try {
    // 2. JQL: issues in project where custom field matches account_id
    const jql = encodeURIComponent(
      `project = "${cfg.projectKey}" AND "${cfg.accountField}" = "${accountId}" ORDER BY updated DESC`
    );
    const issuesUrl = `${cfg.baseUrl}/rest/api/3/search?jql=${jql}&maxResults=100&fields=summary,status,priority,${cfg.accountField}`;

    const issuesRes = await fetch(issuesUrl, {
      headers: {
        Authorization: authHeader(cfg.userEmail, cfg.apiToken),
        Accept: "application/json",
      },
    });

    if (!issuesRes.ok) {
      throw new Error(`Jira issues fetch failed: ${issuesRes.status} ${await issuesRes.text()}`);
    }

    const issuesData = await issuesRes.json() as { issues: JiraIssue[] };
    const issues = issuesData.issues ?? [];
    processed = issues.length;

    // 3. For each issue, fetch worklogs and upsert rd_ticket
    for (const issue of issues) {
      try {
        // Fetch worklogs
        const wlUrl = `${cfg.baseUrl}/rest/api/3/issue/${issue.key}/worklog`;
        const wlRes = await fetch(wlUrl, {
          headers: {
            Authorization: authHeader(cfg.userEmail, cfg.apiToken),
            Accept: "application/json",
          },
        });

        let totalSeconds = 0;
        if (wlRes.ok) {
          const wlData = await wlRes.json() as { worklogs: JiraWorklog[] };
          totalSeconds = (wlData.worklogs ?? []).reduce((s, w) => s + (w.timeSpentSeconds ?? 0), 0);
        }

        const hours = Math.round(totalSeconds / 3600);
        const ticketId = `${issue.key}`; // use Jira key as id (fits TEXT PK)

        // 4. Upsert into rd_tickets
        const { error: upsertErr } = await supabase
          .from("rd_tickets")
          .upsert(
            {
              id:            ticketId,
              account_id:    accountId,
              title:         issue.fields.summary,
              hours,
              status:        mapStatus(issue.fields.status.name),
              priority:      mapPriority(issue.fields.priority?.name ?? null),
              source_system: "jira",
              external_id:   issue.key,
            },
            { onConflict: "id" }
          );

        if (upsertErr) {
          errors.push(`${issue.key}: ${upsertErr.message}`);
        } else {
          upserted++;
        }
      } catch (issueErr) {
        errors.push(`${issue.key}: ${issueErr instanceof Error ? issueErr.message : String(issueErr)}`);
      }
    }

    // 5. Update vendor last_sync_at and record_count
    await supabase
      .from("vendors")
      .update({
        last_sync_at: new Date().toISOString(),
        record_count: upserted,
        status: errors.length > 0 ? "warning" : "healthy",
        error_count: errors.length,
      })
      .eq("id", "jira");

    // 6. Mark sync_job success/partial
    if (jobId) {
      await supabase
        .from("sync_jobs")
        .update({
          finished_at:       new Date().toISOString(),
          status:            errors.length > 0 ? "failed" : "success",
          records_processed: processed,
          records_upserted:  upserted,
          error_message:     errors.length ? errors.slice(0, 3).join("; ") : null,
        })
        .eq("id", jobId);
    }

    return { upserted, errors };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);

    await supabase.from("vendors").update({ status: "warning", error_count: 1 }).eq("id", "jira");
    if (jobId) {
      await supabase
        .from("sync_jobs")
        .update({ finished_at: new Date().toISOString(), status: "failed", error_message: msg })
        .eq("id", jobId);
    }

    throw err;
  }
}

/**
 * Sync Jira for all accounts.
 * Calls syncJiraForAccount for each account in the DB.
 */
export async function syncJiraAll(config: Partial<JiraConfig> = {}) {
  const supabase = getServiceClient();
  const { data: accounts } = await supabase.from("accounts").select("id");
  if (!accounts?.length) return { total: 0, upserted: 0 };

  let totalUpserted = 0;
  for (const account of accounts) {
    const { upserted } = await syncJiraForAccount(account.id, config);
    totalUpserted += upserted;
  }
  return { total: accounts.length, upserted: totalUpserted };
}
