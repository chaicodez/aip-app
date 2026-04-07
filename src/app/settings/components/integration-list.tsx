"use client";

import { useState } from "react";
import type { ExtendedVendor } from "./settings-types";
import { relativeTime, statusColor } from "./settings-types";
import { ConfigurePanel } from "./configure-panel";

interface Props {
  vendors: ExtendedVendor[];
}

const TYPE_COLORS: Record<string, string> = {
  CRM: "#007AFF",
  ERP: "#AF52DE",
  ITSM: "#FF9500",
  Messaging: "#34C759",
  HRIS: "#FF3B30",
  Analytics: "#5AC8FA",
};

export function IntegrationList({ vendors }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [synced, setSynced] = useState<Set<string>>(new Set());

  const selected = vendors.find((v) => v.id === selectedId) ?? null;

  async function handleSync(e: React.MouseEvent, vendorId: string) {
    e.stopPropagation();
    setSyncingId(vendorId);
    await fetch(`/api/vendors/${vendorId}/sync`, { method: "POST" });
    setSyncingId(null);
    setSynced((prev) => new Set(prev).add(vendorId));
    setTimeout(() => setSynced((prev) => { const n = new Set(prev); n.delete(vendorId); return n; }), 3000);
  }

  const healthy = vendors.filter((v) => v.status === "healthy").length;
  const warnings = vendors.filter((v) => v.status === "warning").length;

  return (
    <>
      {/* Summary header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>
            Integration Management
          </h1>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
            {healthy} healthy · {warnings} warning · {vendors.length} total
          </p>
        </div>
      </div>

      {/* Vendor list */}
      <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid var(--separator)", background: "#fff", boxShadow: "var(--shadow-sm)" }}>
        {vendors.map((vendor, i) => {
          const isActive = vendor.id === selectedId;
          const dot = statusColor(vendor.status);
          const typeColor = TYPE_COLORS[vendor.type] ?? "#007AFF";
          const isSyncing = syncingId === vendor.id;
          const isSynced = synced.has(vendor.id);

          return (
            <div
              key={vendor.id}
              onClick={() => setSelectedId(vendor.id === selectedId ? null : vendor.id)}
              className="flex items-center gap-4 px-5 py-4 cursor-pointer transition-colors hover:bg-[var(--fill-primary)]"
              style={{
                borderBottom: i < vendors.length - 1 ? "1px solid var(--separator)" : "none",
                borderLeft: isActive ? `3px solid var(--accent-blue)` : "3px solid transparent",
                background: isActive ? "rgba(0,122,255,0.04)" : undefined,
              }}
            >
              {/* Status dot */}
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: dot }} />

              {/* Logo circle */}
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                style={{ background: typeColor }}
              >
                {(vendor.icon ?? vendor.name.slice(0, 2)).toUpperCase()}
              </div>

              {/* Name + type */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{vendor.name}</p>
                <p className="text-xs" style={{ color: "var(--text-secondary)" }}>{vendor.type}</p>
              </div>

              {/* Record count + last sync */}
              <div className="text-right shrink-0 hidden sm:block">
                <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                  {vendor.record_count.toLocaleString()}
                  <span className="text-xs font-normal ml-1" style={{ color: "var(--text-secondary)" }}>records</span>
                </p>
                <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                  {relativeTime(vendor.last_sync_at)}
                </p>
              </div>

              {vendor.error_count > 0 && (
                <span className="text-xs px-2 py-0.5 rounded-full shrink-0" style={{ background: "rgba(255,59,48,0.1)", color: "#FF3B30" }}>
                  {vendor.error_count} err
                </span>
              )}

              {/* Sync button */}
              <button
                onClick={(e) => handleSync(e, vendor.id)}
                disabled={isSyncing}
                className="text-xs px-3 py-1.5 rounded-lg border transition-colors shrink-0"
                style={{
                  borderColor: isSynced ? "#34C759" : "var(--separator)",
                  background: isSynced ? "rgba(52,199,89,0.06)" : "transparent",
                  color: isSynced ? "#34C759" : "var(--text-secondary)",
                }}
              >
                {isSyncing ? "Syncing…" : isSynced ? "Synced ✓" : "Sync now"}
              </button>
            </div>
          );
        })}
      </div>

      {selected && (
        <ConfigurePanel vendor={selected} onClose={() => setSelectedId(null)} />
      )}
    </>
  );
}
