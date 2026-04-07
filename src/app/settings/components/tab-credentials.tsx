"use client";

import { useState } from "react";
import type { VendorConfigData } from "./settings-types";
import type { Credential, SecretStore, CredentialType } from "@/lib/types";

const STORES: SecretStore[] = ["Netlify Env Vars", "AWS Secrets Manager", "Supabase Vault"];
const TYPES: CredentialType[] = ["token", "secret", "api_key", "url", "id", "json"];

interface Props { data: VendorConfigData }

export function TabCredentials({ data }: Props) {
  const [creds, setCreds] = useState<Credential[]>(data.credentials);
  const [keyName, setKeyName] = useState("");
  const [value, setValue] = useState("");
  const [store, setStore] = useState<SecretStore>("Supabase Vault");
  const [type, setType] = useState<CredentialType>("api_key");
  const [saving, setSaving] = useState(false);
  const vendorId = data.vendor.id;

  async function addCredential() {
    if (!keyName.trim()) return;
    setSaving(true);
    const masked = value.length > 8 ? value.slice(0, 8) + "••••••••" : "••••••••";
    const res = await fetch(`/api/vendors/${vendorId}/credentials`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key_name: keyName.trim(), store, credential_type: type, masked_value: masked, status: "ok" }),
    });
    const row = await res.json();
    setCreds((prev) => [...prev, row]);
    setKeyName(""); setValue("");
    setSaving(false);
  }

  async function deleteCred(key: string) {
    await fetch(`/api/vendors/${vendorId}/credentials?key_name=${encodeURIComponent(key)}`, { method: "DELETE" });
    setCreds((prev) => prev.filter((c) => c.key_name !== key));
  }

  const storeBadge = (s: string) => s === "AWS Secrets Manager" ? "aws" : s === "Supabase Vault" ? "vault" : "env";

  return (
    <div className="p-5 space-y-4">
      <div className="rounded-xl p-3" style={{ background: "rgba(255,159,10,0.08)", border: "1px solid rgba(255,159,10,0.2)" }}>
        <p className="text-xs" style={{ color: "#FF9F0A" }}>
          Secret keys are never displayed in full. Never share these values.
        </p>
      </div>

      {creds.length > 0 ? (
        <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--separator)" }}>
          <table className="w-full text-xs">
            <thead>
              <tr style={{ background: "var(--bg-tertiary)", borderBottom: "1px solid var(--separator)" }}>
                {["Key", "Store", "Type", "Value", "Status", ""].map((h) => (
                  <th key={h} className="px-3 py-2 text-left font-semibold uppercase tracking-wide" style={{ color: "var(--text-secondary)", fontSize: "10px" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {creds.map((c) => (
                <tr key={c.id} style={{ borderBottom: "1px solid var(--separator)", background: "#fff" }}>
                  <td className="px-3 py-2 font-mono" style={{ color: "var(--text-primary)", fontSize: "11px" }}>{c.key_name}</td>
                  <td className="px-3 py-2">
                    <span className="px-1.5 py-0.5 rounded text-xs" style={{ background: "var(--fill-primary)", color: "var(--text-secondary)" }}>{storeBadge(c.store)}</span>
                  </td>
                  <td className="px-3 py-2">
                    <span className="px-1.5 py-0.5 rounded text-xs" style={{ background: "var(--fill-primary)", color: "var(--text-secondary)" }}>{c.credential_type}</span>
                  </td>
                  <td className="px-3 py-2 font-mono text-xs" style={{ color: "var(--text-secondary)" }}>{c.masked_value ?? "••••••••"}</td>
                  <td className="px-3 py-2">
                    <span className="w-2 h-2 rounded-full inline-block" style={{ background: c.status === "ok" ? "#34C759" : "#FF9500" }} />
                  </td>
                  <td className="px-3 py-2">
                    <button onClick={() => deleteCred(c.key_name)} className="hover:text-red-500 transition-colors" style={{ color: "var(--text-secondary)" }}>×</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-sm text-center py-4" style={{ color: "var(--text-secondary)" }}>No credentials stored</p>
      )}

      <div className="rounded-xl p-4 space-y-3" style={{ border: "1px solid var(--separator)", background: "#fff" }}>
        <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-secondary)", fontSize: "10px" }}>Add Credential</p>
        <input value={keyName} onChange={(e) => setKeyName(e.target.value)} placeholder="Key name (e.g. SF_ACCESS_TOKEN)" className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none" style={{ border: "1px solid var(--separator)", background: "var(--fill-primary)", color: "var(--text-primary)", fontFamily: "monospace" }} />
        <input type="password" value={value} onChange={(e) => setValue(e.target.value)} placeholder="Secret value" className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none" style={{ border: "1px solid var(--separator)", background: "var(--fill-primary)", color: "var(--text-primary)" }} />
        <div className="grid grid-cols-2 gap-2">
          <select value={store} onChange={(e) => setStore(e.target.value as SecretStore)} className="px-3 py-2 rounded-lg text-xs focus:outline-none" style={{ border: "1px solid var(--separator)", background: "var(--fill-primary)", color: "var(--text-primary)" }}>
            {STORES.map((s) => <option key={s}>{s}</option>)}
          </select>
          <select value={type} onChange={(e) => setType(e.target.value as CredentialType)} className="px-3 py-2 rounded-lg text-xs focus:outline-none" style={{ border: "1px solid var(--separator)", background: "var(--fill-primary)", color: "var(--text-primary)" }}>
            {TYPES.map((t) => <option key={t}>{t}</option>)}
          </select>
        </div>
        <button onClick={addCredential} disabled={saving || !keyName.trim()} className="w-full py-2 rounded-xl text-sm font-medium text-white disabled:opacity-50" style={{ background: "var(--accent-blue)" }}>
          {saving ? "Saving…" : "Save Credential"}
        </button>
      </div>
    </div>
  );
}
