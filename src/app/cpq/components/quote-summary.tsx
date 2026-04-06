"use client";

import { fmt, fmtD, type LineItem, type AccountRow } from "@/app/cpq/types";

interface Segment { label: string; min: number; max: number; floor: number }
interface Flag { level: "warn" | "error" | "info"; msg: string }

interface QuoteSummaryProps {
  custName: string;
  industry: string;
  employees: number;
  term: number;
  implFee: number;
  escalator: number;
  managedSvc: number;
  segment: Segment;
  accounts: AccountRow[];
  items: LineItem[];
  arr: number;
  tcv: number;
  effPepy: number;
  avgDisc: number;
  flags: Flag[];
  saving: boolean;
  saveMsg: string;
  onSave: () => void;
  onExport: () => void;
}

export function QuoteSummary({
  custName, industry, employees, term, implFee, escalator, managedSvc, segment,
  accounts, items, arr, tcv, effPepy, avgDisc, flags, saving, saveMsg, onSave, onExport,
}: QuoteSummaryProps) {
  const comparables = accounts.filter((a) => employees > 0 && Math.abs(a.employees - employees) / employees < 0.6).slice(0, 3);
  const avgCompArr = comparables.length ? comparables.reduce((s, a) => s + Number(a.arr), 0) / comparables.length : null;

  return (
    <div className="sticky top-4">
      <div className="bg-white border border-gray-200 rounded-xl p-4" style={{ borderLeft: "3px solid #7F77DD" }}>
        <p className="text-xs font-semibold text-gray-800 mb-3">Quote summary</p>
        <p className="text-base font-bold text-purple-700 mb-0.5">{custName || "New Quote"}</p>
        <p className="text-xs text-gray-400 mb-3">{[industry, `${employees.toLocaleString()} employees`, `${term}mo`].filter(Boolean).join(" · ")}</p>

        <div className="mb-3">
          <p className="text-xs font-medium text-gray-500 mb-1.5">Line items</p>
          {items.map((l) => {
            const net = l.list_price * (1 - l.discount_pct / 100);
            const annual = net * l.quantity * employees;
            return (
              <div key={l._id} className="flex justify-between text-xs mb-1">
                <span className="text-gray-700">{l.module_name}{l.discount_pct > 0 && <span className="text-amber-600 ml-1">(−{l.discount_pct}%)</span>}</span>
                <span className="font-medium">{fmt(annual)}/yr</span>
              </div>
            );
          })}
          {managedSvc > 0 && (
            <div className="flex justify-between text-xs mb-1">
              <span className="text-gray-700">Managed services</span>
              <span className="font-medium">{fmt(managedSvc * 12)}/yr</span>
            </div>
          )}
        </div>

        <div className="border-t border-gray-100 pt-3 mb-3 space-y-1.5">
          <div className="flex justify-between"><span className="text-xs text-gray-500">ARR</span><span className="text-base font-bold text-purple-700">{fmtD(arr)}</span></div>
          <div className="flex justify-between"><span className="text-xs text-gray-500">TCV ({term}mo)</span><span className="text-xs font-semibold">{fmtD(tcv)}</span></div>
          <div className="flex justify-between"><span className="text-xs text-gray-500">Impl fee</span><span className="text-xs font-medium">{fmtD(implFee)}</span></div>
          <div className="flex justify-between">
            <span className="text-xs text-gray-500">Effective PEPY</span>
            <span className={`text-xs font-semibold ${effPepy >= segment.floor ? "text-green-600" : "text-red-600"}`}>{effPepy > 0 ? `$${effPepy.toFixed(0)}` : "—"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-xs text-gray-500">Avg discount</span>
            <span className={`text-xs font-semibold ${avgDisc > 20 ? "text-red-600" : avgDisc > 10 ? "text-amber-600" : "text-green-600"}`}>{avgDisc.toFixed(1)}%</span>
          </div>
          {escalator > 0 && (
            <div className="flex justify-between"><span className="text-xs text-gray-500">Yr 2 ARR (w/ escalator)</span><span className="text-xs font-medium">{fmtD(arr * (1 + escalator / 100))}</span></div>
          )}
        </div>

        {flags.length > 0 && (
          <div className="mb-3 space-y-1">
            {flags.map((f, i) => {
              const bg    = f.level === "error" ? "#fee2e2" : f.level === "warn" ? "#fef3c7" : "#dbeafe";
              const color = f.level === "error" ? "#dc2626" : f.level === "warn" ? "#d97706" : "#2563eb";
              return <div key={i} className="flex gap-1.5 items-start text-xs rounded-lg px-2 py-1.5" style={{ background: bg, color }}><span>⚠</span><span>{f.msg}</span></div>;
            })}
          </div>
        )}

        <div className="bg-gray-50 rounded-lg p-2.5 mb-3">
          <p className="text-xs font-semibold text-gray-500 mb-1.5">Market benchmarks</p>
          <div className="space-y-1">
            <div className="flex justify-between text-xs"><span className="text-gray-400">Segment</span><span className="font-medium text-gray-800">{segment.label}</span></div>
            <div className="flex justify-between text-xs"><span className="text-gray-400">PEPY floor</span><span className="font-medium text-gray-800">${segment.floor}</span></div>
            {avgCompArr !== null && <div className="flex justify-between text-xs"><span className="text-gray-400">Avg ARR (similar)</span><span className="font-medium text-gray-800">{fmt(avgCompArr)}</span></div>}
          </div>
        </div>

        <div className="flex gap-2">
          <button onClick={onSave} disabled={saving} className="flex-1 text-sm font-medium py-2 rounded-lg bg-gray-900 text-white hover:bg-gray-700 disabled:opacity-50">{saving ? "Saving…" : "Save quote"}</button>
          <button onClick={onExport} className="text-sm py-2 px-3 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">Export</button>
        </div>
        {saveMsg && <p className={`text-xs text-center mt-2 ${saveMsg.startsWith("Error") ? "text-red-500" : "text-green-600"}`}>{saveMsg}</p>}
      </div>
    </div>
  );
}
