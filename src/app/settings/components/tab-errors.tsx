"use client";

import { useState } from "react";
import type { VendorConfigData } from "./settings-types";
import type { IntegrationError, ErrorStatus } from "@/lib/types";
import { relativeTime } from "./settings-types";

type FilterType = "all" | ErrorStatus;
const FILTERS: { key: FilterType; label: string }[] = [
  { key: "all", label: "All" },
  { key: "open", label: "Open" },
  { key: "retrying", label: "Retrying" },
  { key: "resolved", label: "Resolved" },
];

const SEVERITY_STYLE: Record<string, { bg: string; color: string }> = {
  high: { bg: "rgba(255,59,48,0.1)", color: "#FF3B30" },
  medium: { bg: "rgba(255,149,0,0.1)", color: "#FF9500" },
  low: { bg: "rgba(120,120,128,0.12)", color: "rgba(60,60,67,0.6)" },
};

interface Props { data: VendorConfigData }

export function TabErrors({ data }: Props) {
  const [errors, setErrors] = useState<IntegrationError[]>(data.errors);
  const [filter, setFilter] = useState<FilterType>("open");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const vendorId = data.vendor.id;
  const visible = filter === "all" ? errors : errors.filter((e) => e.status === filter);
  const openCount = errors.filter((e) => e.status === "open").length;

  async function updateStatus(id: string, status: ErrorStatus) {
    await fetch(`/api/vendors/${vendorId}/errors`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    setErrors((prev) => prev.map((e) => (e.id === id ? { ...e, status } : e)));
  }

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  return (
    <div className="p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-secondary)", fontSize: "10px" }}>Integration Errors</p>
        {openCount > 0 && (
          <span className="px-1.5 py-0.5 rounded-full text-xs font-medium" style={{ background: "rgba(255,59,48,0.1)", color: "#FF3B30" }}>{openCount}</span>
        )}
      </div>

      {/* Filter pills */}
      <div className="flex gap-2 flex-wrap">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className="px-3 py-1 rounded-full text-xs font-medium transition-all"
            style={{
              background: filter === f.key ? "var(--accent-blue)" : "var(--fill-primary)",
              color: filter === f.key ? "#fff" : "var(--text-secondary)",
              border: "none",
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Error list */}
      {visible.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-2xl mb-2">✓</p>
          <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>No errors — integration running smoothly</p>
        </div>
      ) : (
        <div className="space-y-2">
          {visible.map((err) => {
            const sev = SEVERITY_STYLE[err.severity] ?? SEVERITY_STYLE.low;
            const isExpanded = expanded.has(err.id);
            return (
              <div key={err.id} className="rounded-xl p-4 space-y-2" style={{ border: "1px solid var(--separator)", background: "#fff" }}>
                <div className="flex items-start gap-2">
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium shrink-0" style={{ background: sev.bg, color: sev.color }}>{err.severity}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{err.error_type}</span>
                      {err.retry_count > 0 && <span className="text-xs" style={{ color: "var(--text-secondary)" }}>×{err.retry_count} retries</span>}
                      <span className="ml-auto text-xs" style={{ color: "var(--text-secondary)" }}>{relativeTime(err.occurred_at)}</span>
                    </div>
                    <p
                      className="text-xs mt-0.5 cursor-pointer"
                      style={{ color: "var(--text-secondary)", overflow: isExpanded ? "visible" : "hidden", textOverflow: isExpanded ? "clip" : "ellipsis", whiteSpace: isExpanded ? "normal" : "nowrap" }}
                      onClick={() => toggleExpand(err.id)}
                    >
                      {err.message}
                    </p>
                  </div>
                </div>
                {err.status !== "resolved" && (
                  <div className="flex gap-2 pt-1">
                    <button onClick={() => updateStatus(err.id, "retrying")} className="text-xs px-2 py-1 rounded-lg" style={{ background: "rgba(255,149,0,0.1)", color: "#FF9500" }}>Retry</button>
                    <button onClick={() => updateStatus(err.id, "resolved")} className="text-xs px-2 py-1 rounded-lg" style={{ background: "rgba(52,199,89,0.1)", color: "#34C759" }}>Resolve</button>
                    <button onClick={() => updateStatus(err.id, "resolved")} className="text-xs px-2 py-1 rounded-lg" style={{ background: "var(--fill-primary)", color: "var(--text-secondary)" }}>Dismiss</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
