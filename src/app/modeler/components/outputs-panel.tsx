"use client";

import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { fmt, fmtD, fmtTick, COLORS, type AccountRow } from "@/app/modeler/types";

function StatCard({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: "blue" | "green" | "purple" | "amber" }) {
  const borders = { blue: "#378ADD", green: "#1D9E75", purple: "#7F77DD", amber: "#BA7517" };
  const border = accent ? borders[accent] : "#e5e5e4";
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-3" style={{ borderLeft: `3px solid ${border}` }}>
      <p className="text-xs text-gray-400 mb-0.5">{label}</p>
      <p className="text-lg font-semibold text-gray-900">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

function ProgressBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
      <div className="h-2.5 rounded-full" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

interface CalcResult {
  label: string; arr: number; tcv: number;
  bd: Record<string, number>; upfront: number; mm: number;
  allModels: Record<string, { label: string; arr: number; tcv: number }>;
  sensitivity: { label: string; PEPY: number; Platform: number; Hybrid: number }[];
}

interface OutputsPanelProps {
  calc: CalcResult;
  accounts: AccountRow[]; comparables: AccountRow[];
  employees: number; pepyRate: number; implFee: number; term: number; modules: string[];
  baseAccountId: string | null;
  loadFromAccount: (a: AccountRow) => void;
}

export function OutputsPanel({ calc, accounts, comparables, employees, pepyRate, implFee, term, modules, baseAccountId, loadFromAccount }: OutputsPanelProps) {
  const allModelsData = Object.entries(calc.allModels).map(([, v]) => ({
    name: v.label,
    ARR: Math.round(v.arr),
    TCV: Math.round(v.tcv),
  }));

  return (
    <div className="space-y-3 min-w-0">
      <div className="bg-white border border-gray-200 rounded-xl p-3.5">
        <p className="text-xs font-medium text-gray-900 mb-2.5">Load from existing contract</p>
        <div className="flex flex-wrap gap-1.5">
          {accounts.length === 0 && <span className="text-xs text-gray-400">Loading…</span>}
          {accounts.map((a) => (
            <button key={a.id} onClick={() => loadFromAccount(a)}
              className={`text-xs px-2.5 py-1 rounded-lg border transition-colors ${baseAccountId === a.id ? "bg-blue-600 text-white border-blue-600" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
              {a.customer_name}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <StatCard label="ARR" value={fmtD(calc.arr)} sub={`${calc.label} · ${modules.length} module${modules.length !== 1 ? "s" : ""}`} accent="blue" />
        <StatCard label="TCV" value={fmtD(calc.tcv)} sub={`${term}mo${calc.upfront > 0 ? ` + ${fmt(calc.upfront)} impl` : ""}`} accent="green" />
        <StatCard label="Effective PEPY" value={employees > 0 ? `$${(calc.arr / employees).toFixed(2)}` : "—"} sub="ARR per ee/yr" accent="purple" />
        <StatCard label="Impl % of TCV" value={calc.tcv > 0 ? `${((implFee / calc.tcv) * 100).toFixed(1)}%` : "—"} sub={`${fmt(implFee)} total`} accent="amber" />
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <p className="text-xs font-medium text-gray-900 mb-3">Revenue breakdown</p>
        <div className="space-y-2">
          {Object.entries(calc.bd).map(([k, v]) => (
            <div key={k} className="flex items-center gap-2">
              <span className="text-xs text-gray-400 w-40 shrink-0">{k}</span>
              <ProgressBar value={v} max={calc.arr || 1} color="#7F77DD" />
              <span className="text-xs font-medium w-16 text-right">{fmtD(v)}</span>
            </div>
          ))}
          {calc.upfront > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400 w-40 shrink-0">Impl (upfront)</span>
              <ProgressBar value={calc.upfront} max={calc.tcv} color="#BA7517" />
              <span className="text-xs font-medium w-16 text-right">{fmtD(calc.upfront)}</span>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs font-medium text-gray-900 mb-1">All models — ARR vs TCV</p>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={allModelsData} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
              <XAxis dataKey="name" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis tickFormatter={fmtTick} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={48} />
              <Tooltip formatter={(v: number) => [fmtD(v)]} contentStyle={{ fontSize: 11 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="ARR" fill={COLORS.arr} radius={[3, 3, 0, 0]} />
              <Bar dataKey="TCV" fill={COLORS.tcv} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs font-medium text-gray-900 mb-0.5">Headcount sensitivity</p>
          <p className="text-xs text-gray-400 mb-2">ARR at ±40% headcount</p>
          <ResponsiveContainer width="100%" height={148}>
            <LineChart data={calc.sensitivity} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
              <XAxis dataKey="label" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis tickFormatter={fmtTick} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={48} />
              <Tooltip formatter={(v: number) => [fmtD(v)]} contentStyle={{ fontSize: 11 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="PEPY" stroke={COLORS.pepy} dot={false} strokeWidth={2} />
              <Line type="monotone" dataKey="Platform" stroke={COLORS.platform} dot={false} strokeWidth={2} strokeDasharray="5 3" />
              <Line type="monotone" dataKey="Hybrid" stroke={COLORS.hybrid} dot={false} strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <span className="text-xs font-medium text-gray-900">Comparable deals <span className="text-gray-400 font-normal">· similar headcount</span></span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                {["Customer", "Employees", "PEPY", "Impl", "ARR", "Term"].map((h) => (
                  <th key={h} className="text-xs text-gray-400 font-medium px-4 py-2 text-left whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {comparables.map((a) => (
                <tr key={a.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-2.5 font-medium text-gray-900">{a.customer_name}</td>
                  <td className="px-4 py-2.5 text-gray-700">{a.employees.toLocaleString()}</td>
                  <td className="px-4 py-2.5 text-gray-700">${a.pepy}</td>
                  <td className="px-4 py-2.5 text-gray-700">{fmt(Number(a.impl_fee))}</td>
                  <td className="px-4 py-2.5 font-semibold text-purple-700">{fmt(Number(a.arr))}</td>
                  <td className="px-4 py-2.5 text-gray-500">{a.contract_term_months}mo</td>
                </tr>
              ))}
              <tr className="bg-amber-50">
                <td className="px-4 py-2.5 font-semibold text-amber-700">Your scenario</td>
                <td className="px-4 py-2.5 text-amber-600">{employees.toLocaleString()}</td>
                <td className="px-4 py-2.5 text-amber-600">${pepyRate}</td>
                <td className="px-4 py-2.5 text-amber-600">{fmt(implFee)}</td>
                <td className="px-4 py-2.5 font-semibold text-amber-700">{fmtD(calc.arr)}</td>
                <td className="px-4 py-2.5 text-amber-600">{term}mo</td>
              </tr>
              {comparables.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-4 text-center text-xs text-gray-400">No accounts within ±50% of {employees.toLocaleString()} employees.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
