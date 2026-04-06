"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// ─── Types ────────────────────────────────────────────────────────────────────
interface FieldMapping {
  id: number;
  vendor_id: string;
  source_field: string;
  target_field: string;
  transform_type: string;
  status: string;
  last_run_at: string | null;
  vendors: { name: string } | null;
}
interface IntegrationError {
  id: string;
  vendor_id: string;
  occurred_at: string;
  error_type: string;
  message: string;
  severity: "high" | "medium" | "low";
  status: "open" | "retrying" | "resolved";
  retry_count: number;
  vendors: { name: string } | null;
}
interface Credential {
  id: number;
  vendor_id: string;
  key_name: string;
  store: string;
  credential_type: string;
  masked_value: string | null;
  status: string;
  vendors: { name: string } | null;
}
interface SyncJob {
  id: string;
  vendor_id: string;
  started_at: string;
  finished_at: string | null;
  status: string;
  records_processed: number;
  records_upserted: number;
  error_message: string | null;
  vendors: { name: string } | null;
}
interface Vendor { id: string; name: string }

// ─── Shared helpers ───────────────────────────────────────────────────────────
function relativeTime(iso: string | null): string {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return new Date(iso).toLocaleDateString();
}

function TH({ children }: { children: React.ReactNode }) {
  return <th className="text-xs text-gray-400 font-medium px-3 py-2 text-left whitespace-nowrap">{children}</th>;
}
function TD({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-3 py-2.5 text-sm text-gray-700 ${className}`}>{children}</td>;
}

// ─── Field Mappings tab ───────────────────────────────────────────────────────
function FieldMappingsTab({
  mappings, vendors,
}: { mappings: FieldMapping[]; vendors: Vendor[] }) {
  const [filter, setFilter] = useState("All");

  const filtered = filter === "All" ? mappings
    : mappings.filter((m) => m.vendors?.name === filter || m.vendor_id === filter);

  return (
    <div>
      <div className="flex gap-2 mb-3">
        <select
          value={filter} onChange={(e) => setFilter(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="All">All vendors</option>
          {vendors.map((v) => <option key={v.id} value={v.name}>{v.name}</option>)}
        </select>
        <span className="text-xs text-gray-400 self-center">{filtered.length} mappings</span>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-100">
            <tr><TH>Source field</TH><TH>Target field</TH><TH>Transform</TH><TH>Vendor</TH><TH>Status</TH><TH>Last run</TH></tr>
          </thead>
          <tbody>
            {filtered.map((m) => (
              <tr key={m.id} className="border-b border-gray-50 hover:bg-gray-50">
                <TD><code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded font-mono">{m.source_field}</code></TD>
                <TD><code className="text-xs bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded font-mono">{m.target_field}</code></TD>
                <TD>
                  <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded capitalize">{m.transform_type}</span>
                </TD>
                <TD className="text-gray-500">{m.vendors?.name ?? m.vendor_id}</TD>
                <TD>
                  <span className={`text-xs font-medium ${m.status === "active" ? "text-green-600" : "text-amber-600"}`}>
                    {m.status}
                  </span>
                </TD>
                <TD className="text-gray-400">{relativeTime(m.last_run_at)}</TD>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="px-3 py-8 text-center text-sm text-gray-400">No mappings found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Sync History tab ─────────────────────────────────────────────────────────
function SyncHistoryTab({ jobs }: { jobs: SyncJob[] }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <table className="w-full text-sm">
        <thead className="border-b border-gray-100">
          <tr><TH>Vendor</TH><TH>Started</TH><TH>Duration</TH><TH>Status</TH><TH>Processed</TH><TH>Upserted</TH><TH>Error</TH></tr>
        </thead>
        <tbody>
          {jobs.map((j) => {
            const duration = j.finished_at
              ? Math.round((new Date(j.finished_at).getTime() - new Date(j.started_at).getTime()) / 1000)
              : null;
            const statusCls = j.status === "success" ? "text-green-600"
                            : j.status === "failed"  ? "text-red-600"
                            : "text-amber-600";
            return (
              <tr key={j.id} className="border-b border-gray-50 hover:bg-gray-50">
                <TD className="font-medium">{j.vendors?.name ?? j.vendor_id}</TD>
                <TD className="text-gray-500">{relativeTime(j.started_at)}</TD>
                <TD className="text-gray-500">{duration !== null ? `${duration}s` : "—"}</TD>
                <TD><span className={`font-medium capitalize ${statusCls}`}>{j.status}</span></TD>
                <TD>{j.records_processed.toLocaleString()}</TD>
                <TD>{j.records_upserted.toLocaleString()}</TD>
                <TD className="text-xs text-gray-400 max-w-xs truncate">{j.error_message ?? "—"}</TD>
              </tr>
            );
          })}
          {jobs.length === 0 && (
            <tr><td colSpan={7} className="px-3 py-8 text-center text-sm text-gray-400">No sync history yet.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

// ─── Error Console tab ────────────────────────────────────────────────────────
function ErrorConsoleTab({ errors }: { errors: IntegrationError[] }) {
  const [localErrors, setLocalErrors] = useState(errors);
  const router = useRouter();

  const retry = async (errId: string) => {
    setLocalErrors((prev) =>
      prev.map((e) => e.id === errId ? { ...e, status: "retrying" as const, retry_count: e.retry_count + 1 } : e)
    );
    // In prod: POST /api/settings/errors/:id/retry
    // For now: update status in DB via service client
    await fetch(`/api/vendors/gw/sync`, { method: "POST" }); // simulate retry via re-sync
    setTimeout(() => {
      setLocalErrors((prev) =>
        prev.map((e) => e.id === errId ? { ...e, status: "resolved" as const } : e)
      );
      router.refresh();
    }, 1500);
  };

  const sevCls: Record<string, string> = {
    high:   "bg-red-100 text-red-700",
    medium: "bg-amber-100 text-amber-700",
    low:    "bg-gray-100 text-gray-600",
  };
  const statCls: Record<string, string> = {
    open:     "text-red-600",
    retrying: "text-blue-600",
    resolved: "text-green-600",
  };

  return (
    <div className="space-y-2">
      {localErrors.map((e) => (
        <div
          key={e.id}
          className={`bg-white border rounded-xl p-4 ${e.status === "resolved" ? "opacity-60 border-gray-100" : "border-gray-200"}`}
        >
          <div className="flex items-start gap-3">
            <span className={`text-xs font-medium px-1.5 py-0.5 rounded shrink-0 mt-0.5 ${sevCls[e.severity]}`}>
              {e.severity}
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-xs font-semibold text-gray-800">{e.error_type}</span>
                <span className="text-xs text-gray-400">·</span>
                <span className="text-xs text-gray-400">{e.vendors?.name ?? e.vendor_id}</span>
                <span className="text-xs text-gray-400">·</span>
                <span className="text-xs text-gray-400">{relativeTime(e.occurred_at)}</span>
                <span className={`ml-auto text-xs font-medium capitalize ${statCls[e.status]}`}>{e.status}</span>
              </div>
              <p className="text-xs text-gray-600 mb-2 leading-relaxed">{e.message}</p>
              <div className="flex items-center gap-2">
                {e.retry_count > 0 && (
                  <span className="text-xs text-gray-400">{e.retry_count} retries</span>
                )}
                {e.status !== "resolved" && (
                  <button
                    onClick={() => retry(e.id)}
                    className="text-xs border border-gray-200 px-2.5 py-1 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors"
                  >
                    {e.status === "retrying" ? "Retrying…" : "Retry"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}
      {localErrors.length === 0 && (
        <div className="bg-gray-50 rounded-xl p-10 text-center text-sm text-gray-400">No errors. ✓</div>
      )}
    </div>
  );
}

// ─── Credentials Vault tab ────────────────────────────────────────────────────
function CredentialsTab({ credentials }: { credentials: Credential[] }) {
  const storeLabel: Record<string, string> = {
    "Netlify Env Vars":     "Netlify",
    "AWS Secrets Manager":  "AWS Secrets",
    "Supabase Vault":       "Supabase Vault",
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="px-3 py-2 bg-amber-50 border-b border-amber-100 flex items-center gap-2">
        <span className="text-amber-600 text-xs">⚠</span>
        <span className="text-xs text-amber-700">Secrets are never stored here. Only metadata and masked display values are shown.</span>
      </div>
      <table className="w-full text-sm">
        <thead className="border-b border-gray-100">
          <tr><TH>Key name</TH><TH>Vendor</TH><TH>Type</TH><TH>Store</TH><TH>Value (masked)</TH><TH>Status</TH></tr>
        </thead>
        <tbody>
          {credentials.map((c) => (
            <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50">
              <TD><code className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded">{c.key_name}</code></TD>
              <TD className="text-gray-500">{c.vendors?.name ?? c.vendor_id}</TD>
              <TD><span className="text-xs bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded capitalize">{c.credential_type}</span></TD>
              <TD className="text-gray-500 text-xs">{storeLabel[c.store] ?? c.store}</TD>
              <TD><code className="text-xs text-gray-400 font-mono">{c.masked_value ?? "—"}</code></TD>
              <TD>
                <span className={`text-xs font-medium ${c.status === "ok" ? "text-green-600" : "text-amber-600"}`}>
                  {c.status}
                </span>
              </TD>
            </tr>
          ))}
          {credentials.length === 0 && (
            <tr><td colSpan={6} className="px-3 py-8 text-center text-sm text-gray-400">No credentials configured.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

// ─── Root admin console ───────────────────────────────────────────────────────
const TABS = ["Field Mappings", "Sync History", "Error Console", "Credentials"] as const;
type Tab = (typeof TABS)[number];

export function AdminConsole({
  mappings, errors, credentials, syncJobs, vendors,
}: {
  mappings: FieldMapping[];
  errors: IntegrationError[];
  credentials: Credential[];
  syncJobs: SyncJob[];
  vendors: Vendor[];
}) {
  const [tab, setTab] = useState<Tab>("Field Mappings");

  const openErrors = errors.filter((e) => e.status !== "resolved").length;

  return (
    <div>
      {/* Tab pills */}
      <div className="flex gap-1.5 flex-wrap mb-4">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`text-xs px-3.5 py-1.5 rounded-full border transition-colors flex items-center gap-1.5 ${
              tab === t
                ? "bg-gray-900 text-white border-gray-900 font-medium"
                : "text-gray-500 border-gray-200 hover:bg-gray-100"
            }`}
          >
            {t}
            {t === "Error Console" && openErrors > 0 && (
              <span className={`text-xs rounded-full px-1.5 py-0 font-semibold leading-5 ${
                tab === t ? "bg-red-500 text-white" : "bg-red-100 text-red-700"
              }`}>
                {openErrors}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === "Field Mappings" && <FieldMappingsTab mappings={mappings} vendors={vendors} />}
      {tab === "Sync History"   && <SyncHistoryTab jobs={syncJobs} />}
      {tab === "Error Console"  && <ErrorConsoleTab errors={errors} />}
      {tab === "Credentials"    && <CredentialsTab credentials={credentials} />}
    </div>
  );
}
