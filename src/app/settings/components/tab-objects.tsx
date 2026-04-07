"use client";

import { useState } from "react";
import type { VendorConfigData, ObjectQuery } from "./settings-types";

interface Props { data: VendorConfigData }

export function TabObjects({ data }: Props) {
  const [objects, setObjects] = useState<ObjectQuery[]>(data.object_queries);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newQuery, setNewQuery] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const vendorId = data.vendor.id;

  function showStatus(msg: string) {
    setStatus(msg);
    setTimeout(() => setStatus(null), 3000);
  }

  async function toggleEnabled(obj: ObjectQuery) {
    const updated = { ...obj, enabled: !obj.enabled };
    setObjects((prev) => prev.map((o) => (o.id === obj.id ? updated : o)));
    await fetch(`/api/vendors/${vendorId}/objects`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ object_name: obj.object_name, enabled: updated.enabled }),
    });
    showStatus("Settings saved. Click Sync Now to pull data.");
  }

  async function saveQuery(obj: ObjectQuery, query: string) {
    const updated = { ...obj, query };
    setObjects((prev) => prev.map((o) => (o.id === obj.id ? updated : o)));
    await fetch(`/api/vendors/${vendorId}/objects`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ object_name: obj.object_name, query }),
    });
    showStatus("Settings saved. Click Sync Now to pull data.");
  }

  async function addObject() {
    if (!newName.trim() || !newQuery.trim()) return;
    const res = await fetch(`/api/vendors/${vendorId}/objects`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ object_name: newName.trim(), query: newQuery.trim(), enabled: true }),
    });
    const row = await res.json();
    setObjects((prev) => [...prev, row]);
    setNewName(""); setNewQuery(""); setAdding(false);
    showStatus("Object added.");
  }

  async function deleteObject(obj: ObjectQuery) {
    await fetch(`/api/vendors/${vendorId}/objects?object_name=${encodeURIComponent(obj.object_name)}`, { method: "DELETE" });
    setObjects((prev) => prev.filter((o) => o.id !== obj.id));
  }

  const TEXTAREA_STYLE = {
    fontFamily: "monospace",
    fontSize: "11px",
    background: "#0f1117",
    color: "#e0e0e0",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: "8px",
    padding: "8px 10px",
    width: "100%",
    resize: "vertical" as const,
    minHeight: "72px",
    outline: "none",
  };

  return (
    <div className="p-5 space-y-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide mb-0.5" style={{ color: "var(--text-secondary)", fontSize: "10px" }}>Object Queries</p>
        <p className="text-xs" style={{ color: "var(--text-secondary)" }}>Enable/disable which objects to sync and customize the query for each.</p>
      </div>

      <div className="space-y-3">
        {objects.map((obj) => (
          <div key={obj.id} className="rounded-xl p-3 space-y-2" style={{ border: "1px solid var(--separator)", background: "#fff" }}>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={obj.enabled}
                onChange={() => toggleEnabled(obj)}
                className="w-4 h-4 rounded"
                style={{ accentColor: "var(--accent-blue)" }}
              />
              <span className="text-sm font-medium flex-1" style={{ color: obj.enabled ? "var(--accent-blue)" : "var(--text-secondary)" }}>
                {obj.object_name}
              </span>
              {obj.record_count > 0 && (
                <span className="text-xs" style={{ color: "var(--text-secondary)" }}>{obj.record_count.toLocaleString()} records</span>
              )}
              <button onClick={() => deleteObject(obj)} className="text-xs px-2 py-0.5 rounded hover:bg-red-50" style={{ color: "var(--accent-red)" }}>×</button>
            </div>
            <textarea
              defaultValue={obj.query}
              style={TEXTAREA_STYLE}
              onBlur={(e) => { if (e.target.value !== obj.query) saveQuery(obj, e.target.value); }}
            />
          </div>
        ))}
      </div>

      {adding ? (
        <div className="rounded-xl p-3 space-y-2" style={{ border: "1px solid var(--accent-blue)", background: "#fff" }}>
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Object name (e.g. Accounts)"
            className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none"
            style={{ border: "1px solid var(--separator)", background: "var(--fill-primary)", color: "var(--text-primary)" }}
          />
          <textarea value={newQuery} onChange={(e) => setNewQuery(e.target.value)} placeholder="SELECT Id, Name FROM Object" style={TEXTAREA_STYLE} />
          <div className="flex gap-2">
            <button onClick={() => { setAdding(false); setNewName(""); setNewQuery(""); }} className="text-xs px-3 py-1.5 rounded-lg" style={{ background: "var(--fill-primary)", color: "var(--text-secondary)" }}>Cancel</button>
            <button onClick={addObject} className="text-xs px-3 py-1.5 rounded-lg text-white" style={{ background: "var(--accent-blue)" }}>Add Object</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setAdding(true)} className="text-sm font-medium hover:opacity-80" style={{ color: "var(--accent-blue)" }}>
          + Add Object
        </button>
      )}

      {status && (
        <p className="text-xs px-3 py-2 rounded-lg" style={{ background: "rgba(52,199,89,0.1)", color: "#34C759" }}>
          {status}
        </p>
      )}
    </div>
  );
}
