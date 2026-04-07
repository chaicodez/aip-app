"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { VendorConfigData, ExtendedVendor } from "./settings-types";
import { statusColor } from "./settings-types";
import { TabOverview } from "./tab-overview";
import { TabConnection } from "./tab-connection";
import { TabObjects } from "./tab-objects";
import { TabCredentials } from "./tab-credentials";
import { TabErrors } from "./tab-errors";

type Tab = "overview" | "connection" | "objects" | "credentials" | "errors";
const TABS: { key: Tab; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "connection", label: "Connection" },
  { key: "objects", label: "Objects" },
  { key: "credentials", label: "Credentials" },
  { key: "errors", label: "Errors" },
];

interface Props {
  vendor: ExtendedVendor;
  onClose: () => void;
}

export function ConfigurePanel({ vendor, onClose }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [data, setData] = useState<VendorConfigData | null>(null);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string; latency_ms?: number } | null>(null);
  const [syncing, setSyncing] = useState(false);
  const router = useRouter();

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/vendors/${vendor.id}/config`);
    if (res.ok) setData(await res.json());
    setLoading(false);
  }, [vendor.id]);

  useEffect(() => { load(); }, [load]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  async function handleTest() {
    setTesting(true); setTestResult(null);
    const res = await fetch(`/api/vendors/${vendor.id}/test`, { method: "POST" });
    setTestResult(await res.json());
    setTesting(false);
  }

  async function handleSync() {
    setSyncing(true);
    await fetch(`/api/vendors/${vendor.id}/sync`, { method: "POST" });
    setSyncing(false);
    await load();
    router.refresh();
  }

  const dot = statusColor(vendor.status);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        style={{ background: "var(--bg-overlay)" }}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className="fixed right-0 top-0 h-screen z-50 flex flex-col overflow-hidden"
        style={{
          width: "min(480px, 100vw)",
          background: "#fff",
          boxShadow: "var(--shadow-xl)",
          borderRadius: "16px 0 0 16px",
          animation: "slideIn 0.25s ease-out",
        }}
      >
        {/* Header */}
        <div className="shrink-0 px-5 pt-5 pb-0" style={{ borderBottom: "1px solid var(--separator)" }}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0" style={{ background: dot }}>
              {(vendor.icon ?? vendor.name.slice(0, 2)).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{vendor.name}</p>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: dot }} />
                <span className="text-xs capitalize" style={{ color: "var(--text-secondary)" }}>{vendor.status}</span>
              </div>
            </div>
            <button
              onClick={handleTest}
              disabled={testing}
              className="text-xs px-3 py-1.5 rounded-xl font-medium transition-all"
              style={{ background: testResult ? (testResult.ok ? "rgba(52,199,89,0.1)" : "rgba(255,59,48,0.1)") : "var(--fill-primary)", color: testResult ? (testResult.ok ? "#34C759" : "#FF3B30") : "var(--text-secondary)" }}
            >
              {testing ? "Testing…" : testResult ? (testResult.ok ? `✓ ${testResult.latency_ms}ms` : "✗ Failed") : "Test Connection"}
            </button>
            <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center text-lg hover:bg-gray-100" style={{ color: "var(--text-secondary)" }}>×</button>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 -mb-px">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className="px-3 py-2 text-xs font-medium rounded-t-lg transition-colors"
                style={{
                  color: activeTab === t.key ? "var(--accent-blue)" : "var(--text-secondary)",
                  borderBottom: activeTab === t.key ? "2px solid var(--accent-blue)" : "2px solid transparent",
                  background: "none",
                }}
              >
                {t.label}
                {t.key === "errors" && data && data.errors.length > 0 && (
                  <span className="ml-1 px-1 rounded-full text-xs" style={{ background: "rgba(255,59,48,0.1)", color: "#FF3B30", fontSize: "9px" }}>
                    {data.errors.length}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {loading || !data ? (
            <div className="flex items-center justify-center h-32">
              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Loading…</p>
            </div>
          ) : (
            <>
              {activeTab === "overview" && <TabOverview data={data} onSync={handleSync} syncing={syncing} />}
              {activeTab === "connection" && <TabConnection data={data} onClose={onClose} />}
              {activeTab === "objects" && <TabObjects data={data} />}
              {activeTab === "credentials" && <TabCredentials data={data} />}
              {activeTab === "errors" && <TabErrors data={data} />}
            </>
          )}
        </div>
      </div>

      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </>
  );
}
