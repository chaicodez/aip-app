"use client";

import { ALL_MODULES, type PricingModel, type AccountRow } from "@/app/modeler/types";

function InputLabel({ children }: { children: React.ReactNode }) {
  return <label className="block text-xs font-medium text-gray-500 mb-1">{children}</label>;
}
function TextInput({ value, onChange, type = "number", step, placeholder }: {
  value: string | number; onChange: (v: string) => void; type?: string; step?: string; placeholder?: string;
}) {
  return (
    <input type={type} step={step} placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)}
      className="w-full text-sm px-2.5 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
  );
}

interface InputsPanelProps {
  model: PricingModel; setModel: (m: PricingModel) => void;
  employees: number; setEmployees: (n: number) => void;
  term: number; setTerm: (n: number) => void;
  pepyRate: number; setPepyRate: (n: number) => void;
  platformFee: number; setPlatformFee: (n: number) => void;
  usageRate: number; setUsageRate: (n: number) => void;
  implFee: number; setImplFee: (n: number) => void;
  implBilling: "upfront" | "spread"; setImplBilling: (b: "upfront" | "spread") => void;
  modules: string[]; toggleModule: (m: string) => void; upliftPct: number;
  scenarioName: string; setScenarioName: (s: string) => void;
  saving: boolean; saveMsg: string; savedScenariosCount: number;
  marketAvgPepy: number | null; marketAvgImpl: number | null;
  baseAccountId: string | null; accounts: AccountRow[];
  onSave: () => void; onShowComparison: () => void;
}

export function InputsPanel({
  model, setModel, employees, setEmployees, term, setTerm,
  pepyRate, setPepyRate, platformFee, setPlatformFee, usageRate, setUsageRate,
  implFee, setImplFee, implBilling, setImplBilling,
  modules, toggleModule, upliftPct,
  scenarioName, setScenarioName, saving, saveMsg, savedScenariosCount,
  marketAvgPepy, marketAvgImpl, baseAccountId, accounts,
  onSave, onShowComparison,
}: InputsPanelProps) {
  const baseAccount = accounts.find((x) => x.id === baseAccountId);
  const fmt = (n: number) => n >= 1_000 ? `$${(n / 1_000).toFixed(1)}k` : `$${n}`;

  return (
    <div className="space-y-3">
      {baseAccount && (
        <div className="bg-blue-50 border border-blue-100 rounded-xl px-3 py-2 text-xs">
          <span className="font-medium text-blue-700">Based on: {baseAccount.customer_name}</span>
          <p className="text-blue-500 mt-0.5">Adjust to model a new scenario.</p>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-xl p-3.5">
        <p className="text-xs font-medium text-gray-900 mb-2.5">Pricing model</p>
        {(["pepy", "platform", "hybrid", "usage"] as PricingModel[]).map((m) => {
          const labels = { pepy: "PEPY", platform: "Platform fee", hybrid: "PEPY + Platform", usage: "Usage-based" };
          return (
            <label key={m} className="flex items-center gap-2 mb-2 cursor-pointer text-sm text-gray-700">
              <input type="radio" name="model" value={m} checked={model === m} onChange={() => setModel(m)} className="accent-gray-900" />
              {labels[m]}
            </label>
          );
        })}
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-3.5 space-y-2.5">
        <p className="text-xs font-medium text-gray-900">Deal parameters</p>
        <div><InputLabel>Employees</InputLabel><TextInput value={employees} onChange={(v) => setEmployees(Math.max(1, parseInt(v) || 1))} /></div>
        <div>
          <InputLabel>Term (months)</InputLabel>
          <select value={term} onChange={(e) => setTerm(Number(e.target.value))} className="w-full text-sm px-2.5 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
            {[12, 24, 36, 48].map((t) => <option key={t} value={t}>{t} months</option>)}
          </select>
        </div>
        {(model === "pepy" || model === "hybrid") && (
          <div>
            <InputLabel>PEPY rate ($/ee/yr)</InputLabel>
            <TextInput value={pepyRate} onChange={(v) => setPepyRate(parseFloat(v) || 0)} />
            {marketAvgPepy !== null && <p className="text-xs text-amber-600 mt-1">Market avg: ${Math.round(marketAvgPepy)}/PEPY</p>}
          </div>
        )}
        {(model === "platform" || model === "hybrid") && (
          <div><InputLabel>Annual platform fee ($)</InputLabel><TextInput value={platformFee} onChange={(v) => setPlatformFee(parseFloat(v) || 0)} /></div>
        )}
        {model === "usage" && (
          <div><InputLabel>Usage rate ($/unit/mo)</InputLabel><TextInput value={usageRate} onChange={(v) => setUsageRate(parseFloat(v) || 0)} step="0.001" /></div>
        )}
        <div>
          <InputLabel>Implementation fee ($)</InputLabel>
          <TextInput value={implFee} onChange={(v) => setImplFee(parseFloat(v) || 0)} />
          {marketAvgImpl !== null && <p className="text-xs text-amber-600 mt-1">Avg: {fmt(marketAvgImpl)} for similar deals</p>}
          <div className="flex gap-4 mt-1.5">
            {(["upfront", "spread"] as const).map((b) => (
              <label key={b} className="flex items-center gap-1.5 text-xs cursor-pointer text-gray-600">
                <input type="radio" name="implBilling" value={b} checked={implBilling === b} onChange={() => setImplBilling(b)} className="accent-gray-900" />
                {b === "upfront" ? "One-time" : "Spread"}
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-3.5">
        <p className="text-xs font-medium text-gray-900 mb-2.5">
          Modules ({modules.length}{upliftPct > 0 ? ` · ${upliftPct}% uplift` : ""})
        </p>
        <div className="flex flex-wrap gap-1.5">
          {ALL_MODULES.map((m) => {
            const on = modules.includes(m);
            return (
              <button key={m} onClick={() => toggleModule(m)} className="text-xs px-2.5 py-1 rounded-lg border transition-colors"
                style={on ? { background: "#1c1917", color: "#fff", borderColor: "#1c1917" } : { background: "transparent", color: "#57534e", borderColor: "#d4d4d0" }}>
                {m}
              </button>
            );
          })}
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-3.5 space-y-2">
        <div><InputLabel>Scenario name</InputLabel><TextInput value={scenarioName} onChange={setScenarioName} type="text" /></div>
        <button onClick={onSave} disabled={saving} className="w-full text-sm font-medium py-2 rounded-lg bg-gray-900 text-white hover:bg-gray-700 disabled:opacity-50 transition-colors">
          {saving ? "Saving…" : "Save scenario"}
        </button>
        {saveMsg && <p className="text-xs text-center text-green-600">{saveMsg}</p>}
        {savedScenariosCount > 0 && (
          <button onClick={onShowComparison} className="w-full text-sm py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">
            View comparison ({savedScenariosCount}) →
          </button>
        )}
      </div>
    </div>
  );
}
