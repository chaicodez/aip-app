"use client";

import { relativeTime, statusColor } from "./settings-types";
import type { VendorConfigData } from "./settings-types";

interface Props {
  data: VendorConfigData;
  onSync: () => void;
  syncing: boolean;
}

export function TabOverview({ data, onSync, syncing }: Props) {
  const { vendor, sync_jobs, errors } = data;

  const stats = [
    { label: "Total Records", value: vendor.record_count.toLocaleString() },
    { label: "Last Sync", value: relativeTime(vendor.last_sync_at) },
    { label: "Open Errors", value: String(errors.length) },
    { label: "Status", value: vendor.status.charAt(0).toUpperCase() + vendor.status.slice(1) },
  ];

  function duration(job: VendorConfigData["sync_jobs"][number]): string {
    if (!job.finished_at) return "—";
    const ms = new Date(job.finished_at).getTime() - new Date(job.created_at).getTime();
    return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`;
  }

  return (
    <div className="space-y-5 p-5">
      {/* Stat grid */}
      <div className="grid grid-cols-2 gap-3">
        {stats.map((s) => (
          <div
            key={s.label}
            className="rounded-xl p-3"
            style={{ background: "var(--fill-primary)" }}
          >
            <p className="text-xs uppercase tracking-wide mb-1" style={{ color: "var(--text-secondary)", fontSize: "10px" }}>
              {s.label}
            </p>
            <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
              {s.value}
            </p>
          </div>
        ))}
      </div>

      {/* Sync jobs */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "var(--text-secondary)", fontSize: "10px" }}>
          Recent Sync Jobs
        </p>
        {sync_jobs.length === 0 ? (
          <p className="text-sm py-4 text-center" style={{ color: "var(--text-secondary)" }}>No sync jobs yet</p>
        ) : (
          <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--separator)" }}>
            <table className="w-full text-xs">
              <thead>
                <tr style={{ background: "var(--bg-tertiary)", borderBottom: "1px solid var(--separator)" }}>
                  {["Started", "Duration", "Status", "Records"].map((h) => (
                    <th key={h} className="px-3 py-2 text-left font-semibold uppercase tracking-wide" style={{ color: "var(--text-secondary)", fontSize: "10px" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sync_jobs.slice(0, 5).map((job) => (
                  <tr key={job.id} style={{ borderBottom: "1px solid var(--separator)", background: "#fff" }}>
                    <td className="px-3 py-2" style={{ color: "var(--text-secondary)" }}>{relativeTime(job.created_at)}</td>
                    <td className="px-3 py-2" style={{ color: "var(--text-primary)" }}>{duration(job)}</td>
                    <td className="px-3 py-2">
                      <span className="inline-flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: statusColor(job.status) }} />
                        <span style={{ color: statusColor(job.status) }}>{job.status}</span>
                      </span>
                    </td>
                    <td className="px-3 py-2" style={{ color: "var(--text-primary)" }}>
                      {job.records_processed?.toLocaleString() ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <button
        onClick={onSync}
        disabled={syncing}
        className="w-full py-2 rounded-xl text-sm font-medium text-white transition-all hover:opacity-90 disabled:opacity-50"
        style={{ background: "var(--accent-blue)" }}
      >
        {syncing ? "Syncing…" : "Sync Now"}
      </button>
    </div>
  );
}
