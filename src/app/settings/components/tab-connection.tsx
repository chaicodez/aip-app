"use client";

import { useState } from "react";
import type { VendorConfigData } from "./settings-types";

const AUTH_TYPES = [
  { value: "oauth2", label: "OAuth 2.0" },
  { value: "api_key", label: "API Key" },
  { value: "basic_auth", label: "Basic Auth" },
  { value: "service_account", label: "Service Account" },
];

const INPUT_STYLE = {
  background: "#0f1117",
  color: "#fff",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: "8px",
  padding: "8px 12px",
  fontSize: "13px",
  width: "100%",
  outline: "none",
} as const;

const LABEL_STYLE = {
  fontSize: "10px",
  fontWeight: 600,
  textTransform: "uppercase" as const,
  letterSpacing: "0.08em",
  color: "rgba(255,255,255,0.45)",
  marginBottom: "4px",
  display: "block",
};

interface Props { data: VendorConfigData; onClose: () => void }

export function TabConnection({ data, onClose }: Props) {
  const { vendor } = data;
  const [config, setConfig] = useState<Record<string, string>>(vendor.config ?? {});
  const [authType, setAuthType] = useState(vendor.auth_type ?? "oauth2");
  const [show, setShow] = useState<Record<string, boolean>>({});
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string; latency_ms?: number; error_detail?: string } | null>(null);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const set = (key: string, val: string) => setConfig((c) => ({ ...c, [key]: val }));
  const toggle = (key: string) => setShow((s) => ({ ...s, [key]: !s[key] }));

  async function handleTest() {
    setTesting(true); setTestResult(null);
    const res = await fetch(`/api/vendors/${vendor.id}/test`, { method: "POST" });
    setTestResult(await res.json());
    setTesting(false);
  }

  async function handleSave() {
    setSaving(true);
    await fetch(`/api/vendors/${vendor.id}/config`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ config, auth_type: authType }),
    });
    setSaving(false); setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  const isJira = vendor.id === "jira";
  const connected = vendor.status !== "idle";
  const statusLabel = vendor.status === "healthy" ? "Connected" : vendor.status === "warning" ? "Degraded" : "Not connected";
  const statusClr = vendor.status === "healthy" ? "#34C759" : vendor.status === "warning" ? "#FF9500" : "#FF3B30";

  return (
    <div className="p-5 space-y-5" style={{ background: "#0d0d14", minHeight: "100%", color: "#fff" }}>
      {/* Status */}
      <div className="flex items-center gap-2">
        <span className="w-3 h-3 rounded-full" style={{ background: statusClr }} />
        <span className="font-semibold text-sm" style={{ color: statusClr }}>{statusLabel}</span>
        {connected && <span className="text-xs ml-auto" style={{ color: "rgba(255,255,255,0.35)" }}>Auth: {authType}</span>}
      </div>

      {/* Auth type */}
      <div>
        <span style={LABEL_STYLE}>Auth Type</span>
        <div className="flex gap-2 flex-wrap">
          {AUTH_TYPES.map((a) => (
            <button
              key={a.value}
              onClick={() => setAuthType(a.value)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={{
                background: authType === a.value ? "var(--accent-blue)" : "rgba(255,255,255,0.08)",
                color: authType === a.value ? "#fff" : "rgba(255,255,255,0.6)",
                border: "none",
              }}
            >
              {a.label}
            </button>
          ))}
        </div>
      </div>

      {isJira ? (
        <>
          <div><label style={LABEL_STYLE}>Base URL</label><input style={INPUT_STYLE} value={config.base_url ?? ""} onChange={(e) => set("base_url", e.target.value)} placeholder="https://yourorg.atlassian.net" /></div>
          <div><label style={LABEL_STYLE}>Email</label><input style={INPUT_STYLE} value={config.email ?? ""} onChange={(e) => set("email", e.target.value)} placeholder="you@company.com" /></div>
          <div>
            <label style={LABEL_STYLE}>API Token</label>
            <div className="relative">
              <input type={show.api_token ? "text" : "password"} style={{ ...INPUT_STYLE, paddingRight: "40px" }} value={config.api_token ?? ""} onChange={(e) => set("api_token", e.target.value)} placeholder="••••••••••••" />
              <button onClick={() => toggle("api_token")} className="absolute right-3 top-1/2 -translate-y-1/2 text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>{show.api_token ? "hide" : "show"}</button>
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div><label style={LABEL_STYLE}>Instance URL</label><input style={INPUT_STYLE} value={config.instance_url ?? ""} onChange={(e) => set("instance_url", e.target.value)} placeholder="https://yourorg.my.salesforce.com" /></div>
            <div>
              <label style={LABEL_STYLE}>API Version</label>
              <select style={{ ...INPUT_STYLE, cursor: "pointer" }} value={config.api_version ?? "v59.0"} onChange={(e) => set("api_version", e.target.value)}>
                {["v61.0", "v60.0", "v59.0", "v58.0"].map((v) => <option key={v}>{v}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label style={LABEL_STYLE}>Client ID</label><input style={{ ...INPUT_STYLE, paddingRight: "40px" }} value={config.client_id ?? ""} onChange={(e) => set("client_id", e.target.value)} placeholder="From your Connected App" /></div>
            <div>
              <label style={LABEL_STYLE}>Client Secret</label>
              <div className="relative">
                <input type={show.secret ? "text" : "password"} style={{ ...INPUT_STYLE, paddingRight: "40px" }} value={config.client_secret ?? ""} onChange={(e) => set("client_secret", e.target.value)} placeholder="••••••••••••" />
                <button onClick={() => toggle("secret")} className="absolute right-3 top-1/2 -translate-y-1/2 text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>{show.secret ? "hide" : "show"}</button>
              </div>
            </div>
          </div>
        </>
      )}

      {testResult && (
        <div className="rounded-lg px-3 py-2 space-y-1" style={{ background: testResult.ok ? "rgba(52,199,89,0.15)" : "rgba(255,59,48,0.15)" }}>
          <p className="text-sm" style={{ color: testResult.ok ? "#34C759" : "#FF3B30" }}>
            {testResult.ok ? `✓ ${testResult.message} — ${testResult.latency_ms}ms` : `✗ ${testResult.message}`}
          </p>
          {!testResult.ok && testResult.error_detail && (
            <p className="text-xs font-mono break-all" style={{ color: "rgba(255,59,48,0.8)" }}>
              {testResult.error_detail}
            </p>
          )}
        </div>
      )}

      <div className="flex gap-2 pt-2">
        <button onClick={onClose} className="flex-1 py-2 rounded-xl text-sm font-medium" style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.7)" }}>Cancel</button>
        <button onClick={handleTest} disabled={testing} className="flex-1 py-2 rounded-xl text-sm font-medium" style={{ background: "rgba(255,255,255,0.12)", color: "#fff" }}>{testing ? "Testing…" : "Test Connection"}</button>
        <button onClick={handleSave} disabled={saving} className="flex-1 py-2 rounded-xl text-sm font-medium text-white" style={{ background: saved ? "#34C759" : "var(--accent-blue)" }}>{saving ? "Saving…" : saved ? "Saved ✓" : "Save Settings"}</button>
      </div>
    </div>
  );
}
