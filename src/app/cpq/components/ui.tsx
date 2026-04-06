"use client";

import { fmt, fmtD, type LineItem } from "@/app/cpq/types";

export function Lbl({ children }: { children: React.ReactNode }) {
  return <label className="block text-xs font-medium text-gray-500 mb-1">{children}</label>;
}

export function Inp({ type = "text", value, onChange, placeholder, step, min, className = "" }: {
  type?: string; value: string | number; onChange: (v: string) => void;
  placeholder?: string; step?: string; min?: string; className?: string;
}) {
  return (
    <input type={type} step={step} min={min} placeholder={placeholder} value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`w-full text-sm px-2.5 py-1.5 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${className}`}
    />
  );
}

export function Sel({ value, onChange, children, className = "" }: {
  value: string | number; onChange: (v: string) => void; children: React.ReactNode; className?: string;
}) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}
      className={`w-full text-sm px-2.5 py-1.5 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${className}`}>
      {children}
    </select>
  );
}

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`bg-white border border-gray-200 rounded-xl p-4 mb-3 ${className}`}>{children}</div>;
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return <p className="text-xs font-semibold text-gray-800 mb-2.5">{children}</p>;
}

export function PillTabs({ tabs, active, onSelect }: { tabs: string[]; active: string; onSelect: (t: string) => void }) {
  return (
    <div className="flex gap-1.5 flex-wrap mb-4">
      {tabs.map((t) => (
        <button key={t} onClick={() => onSelect(t)}
          className={`text-xs px-3.5 py-1.5 rounded-full border transition-colors ${active === t ? "bg-gray-900 text-white border-gray-900 font-medium" : "text-gray-500 border-gray-200 hover:bg-gray-100"}`}>
          {t}
        </button>
      ))}
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const cls = status === "approved" ? "bg-green-100 text-green-800" : status === "pending" ? "bg-yellow-100 text-yellow-800" : "bg-red-100 text-red-800";
  return <span className={`inline-block text-xs px-2 py-0.5 rounded-md font-medium ${cls}`}>{status}</span>;
}

export function RuleTable({ headers, rows }: { headers: string[]; rows: React.ReactNode[][] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead><tr className="border-b border-gray-100">{headers.map((h) => <th key={h} className="text-xs text-gray-400 font-medium px-3 py-2 text-left whitespace-nowrap">{h}</th>)}</tr></thead>
        <tbody>{rows.map((row, ri) => (
          <tr key={ri} className="border-b border-gray-50 hover:bg-gray-50">
            {row.map((cell, ci) => <td key={ci} className="px-3 py-2.5 text-gray-700">{cell}</td>)}
          </tr>
        ))}</tbody>
      </table>
    </div>
  );
}

export function printQuote(params: {
  customerName: string; industry: string; employees: number; term: number;
  lines: LineItem[]; implFee: number; managedServices: number;
  arr: number; tcv: number; effPepy: number; avgDisc: number; escalator: number;
}) {
  const { customerName, industry, employees, term, lines, implFee, managedServices, arr, tcv, effPepy, avgDisc, escalator } = params;
  const w = window.open("", "_blank");
  if (!w) return;
  const lineRows = lines.map((l) => {
    const net = l.list_price * (1 - l.discount_pct / 100);
    const annual = net * l.quantity * employees;
    return `<tr><td>${l.module_name}</td><td>$${l.list_price.toFixed(2)}</td><td>${l.quantity}</td><td>${l.discount_pct}%</td><td>$${net.toFixed(2)}</td><td>${fmt(annual)}</td></tr>`;
  }).join("");
  w.document.write(`<!DOCTYPE html><html><head><title>Quote: ${customerName}</title>
<style>body{font-family:-apple-system,sans-serif;padding:2rem;color:#1c1917;font-size:14px}
h1{font-size:20px;margin-bottom:.25rem}.sub{color:#78716c;font-size:12px;margin-bottom:1.5rem}
table{border-collapse:collapse;width:100%;margin-bottom:1.5rem}th,td{border:1px solid #e5e5e4;padding:8px 12px;text-align:left}
th{background:#f5f5f4;font-size:12px}.totals{max-width:280px}.totals p{display:flex;justify-content:space-between;margin-bottom:.5rem}
.footer{color:#78716c;font-size:11px;margin-top:2rem}</style></head><body>
<h1>Quote: ${customerName}</h1>
<div class="sub">${industry ? industry + " · " : ""}${employees.toLocaleString()} employees · ${term} months</div>
<table><thead><tr><th>Module</th><th>List price</th><th>Qty</th><th>Discount</th><th>Net PEPY</th><th>Annual total</th></tr></thead><tbody>${lineRows}</tbody></table>
${managedServices > 0 ? `<p>Managed services: ${fmt(managedServices * 12)}/yr</p>` : ""}
<div class="totals">
<p><span><strong>ARR</strong></span><span style="color:#7c3aed;font-weight:700">${fmtD(arr)}</span></p>
<p><span>TCV (${term}mo)</span><span>${fmtD(tcv)}</span></p>
<p><span>Impl fee</span><span>${fmtD(implFee)}</span></p>
<p><span>Effective PEPY</span><span>$${effPepy.toFixed(0)}</span></p>
<p><span>Avg discount</span><span>${avgDisc.toFixed(1)}%</span></p>
${escalator > 0 ? `<p><span>Yr 2 ARR (w/ escalator)</span><span>${fmtD(arr * (1 + escalator / 100))}</span></p>` : ""}
</div>
<div class="footer">Generated ${new Date().toLocaleString()}</div>
</body></html>`);
  w.document.close();
  w.print();
}
