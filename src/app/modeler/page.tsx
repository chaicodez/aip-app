"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

// ─── Constants ────────────────────────────────────────────────────────────────
const ALL_MODULES = ["Core HR", "Payroll", "Benefits", "Analytics", "Compliance", "Scheduling"] as const;
type ModuleName = (typeof ALL_MODULES)[number];
type PricingModel = "pepy" | "platform" | "hybrid" | "usage";

const COLORS = { arr: "#7F77DD", tcv: "#AFA9EC", pepy: "#7F77DD", platform: "#1D9E75", hybrid: "#BA7517" };

// ─── Types ────────────────────────────────────────────────────────────────────
interface AccountRow {
  id: string;
  customer_name: string;
  employees: number;
  pepy: number;
  platform_fee: number;
  impl_fee: number;
  arr: number;
  contract_term_months: number;
  account_modules: { module_name: string }[];
}

interface SavedScenario {
  localId: number;
  dbId?: string;
  name: string;
  model: PricingModel;
  modelLabel: string;
  arr: number;
  tcv: number;
  employees: number;
  term: number;
  implFee: number;
  modules: string[];
}

// ─── Formatters ───────────────────────────────────────────────────────────────
function fmt(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}k`;
  return `$${Math.round(n).toLocaleString()}`;
}
function fmtD(n: number) {
  return `$${Math.round(n).toLocaleString()}`;
}
function fmtTick(v: number) {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}k`;
  return `$${v}`;
}

// ─── Shared sub-components ────────────────────────────────────────────────────
function StatCard({
  label, value, sub, accent,
}: {
  label: string; value: string; sub?: string; accent?: "blue" | "green" | "purple" | "amber";
}) {
  const borders = { blue: "#378ADD", green: "#1D9E75", purple: "#7F77DD", amber: "#BA7517" };
  const border = accent ? borders[accent] : "var(--separator)";
  return (
    <div
      className="bg-white rounded-2xl p-4 card-hover"
      style={{
        border: "1px solid var(--separator)",
        borderLeft: `3px solid ${border}`,
        boxShadow: "var(--shadow-sm)",
      }}
    >
      <p style={{ fontSize: 11, color: "var(--text-secondary)", marginBottom: 2 }}>{label}</p>
      <p style={{ fontSize: 17, fontWeight: 600, color: "var(--text-primary)" }}>{value}</p>
      {sub && <p style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 2 }}>{sub}</p>}
    </div>
  );
}

function ProgressBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="flex-1 h-2.5 rounded-full overflow-hidden" style={{ background: "var(--fill-primary)" }}>
      <div className="h-2.5 rounded-full" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

function InputLabel({ children }: { children: React.ReactNode }) {
  return (
    <label
      className="block mb-1"
      style={{ fontSize: 11, fontWeight: 500, color: "var(--text-secondary)" }}
    >
      {children}
    </label>
  );
}

function TextInput({
  value, onChange, type = "number", step, placeholder,
}: {
  value: string | number; onChange: (v: string) => void; type?: string; step?: string; placeholder?: string;
}) {
  return (
    <input
      type={type}
      step={step}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full text-sm rounded-xl px-3 py-2 focus:outline-none transition-all"
      style={{
        background: "var(--fill-primary)",
        border: "1px solid transparent",
        color: "var(--text-primary)",
      }}
      onFocus={(e) => {
        e.currentTarget.style.background = "#FFFFFF";
        e.currentTarget.style.border = "1px solid rgba(0,122,255,0.4)";
        e.currentTarget.style.boxShadow = "var(--shadow-sm)";
      }}
      onBlur={(e) => {
        e.currentTarget.style.background = "var(--fill-primary)";
        e.currentTarget.style.border = "1px solid transparent";
        e.currentTarget.style.boxShadow = "none";
      }}
    />
  );
}

// ─── Calculation engine (pure, no side effects) ───────────────────────────────
function calcScenario({
  model, employees, term, pepyRate, platformFee, usageRate, implFee, implBilling, modules,
}: {
  model: PricingModel; employees: number; term: number; pepyRate: number;
  platformFee: number; usageRate: number; implFee: number;
  implBilling: "upfront" | "spread"; modules: string[];
}) {
  const mm = 1 + Math.max(0, modules.length - 1) * 0.15;
  const pepyArr = employees * pepyRate * mm;
  const platArr = platformFee * mm;
  const usageArr = employees * usageRate * 12 * 100;

  const allModels = {
    pepy:     { label: "PEPY",          arr: pepyArr,                      tcv: pepyArr * (term / 12) + implFee },
    platform: { label: "Platform",      arr: platArr,                      tcv: platArr * (term / 12) + implFee },
    hybrid:   { label: "PEPY+Platform", arr: pepyArr * 0.6 + platArr * 0.4, tcv: (pepyArr * 0.6 + platArr * 0.4) * (term / 12) + implFee },
    usage:    { label: "Usage-based",   arr: usageArr,                     tcv: usageArr * (term / 12) + implFee },
  };

  const current = allModels[model];

  const bd = (() => {
    if (model === "pepy")     return { "Subscription (PEPY)": pepyArr };
    if (model === "platform") return { "Platform fee": platArr };
    if (model === "hybrid")   return { "PEPY component": pepyArr * 0.6, "Platform component": platArr * 0.4 };
    return { "Usage revenue": usageArr };
  })() as unknown as Record<string, number>;

  if (implBilling === "spread") bd["Impl (spread)"] = implFee / term * 12;

  const upfront = implBilling === "upfront" ? implFee : 0;

  const sensitivity = [-40, -20, 0, 20, 40].map((p) => {
    const e = Math.round(employees * (1 + p / 100));
    return {
      label: p === 0 ? "Base" : (p > 0 ? "+" : "") + p + "%",
      PEPY: Math.round(e * pepyRate * mm),
      Platform: Math.round(platArr),
      Hybrid: Math.round((e * pepyRate * 0.6 + platArr * 0.4) * mm),
    };
  });

  return { ...current, bd, upfront, mm, allModels, sensitivity, employees, term, pepyRate, platformFee, usageRate, implFee, implBilling };
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function ModelerPage() {
  // Inputs
  const [model, setModel] = useState<PricingModel>("pepy");
  const [employees, setEmployees] = useState(1000);
  const [term, setTerm] = useState(24);
  const [pepyRate, setPepyRate] = useState(45);
  const [platformFee, setPlatformFee] = useState(18000);
  const [usageRate, setUsageRate] = useState(0.02);
  const [implFee, setImplFee] = useState(25000);
  const [implBilling, setImplBilling] = useState<"upfront" | "spread">("upfront");
  const [modules, setModules] = useState<string[]>(["Core HR", "Payroll"]);
  const [scenarioName, setScenarioName] = useState("Scenario A");

  // Data
  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [savedScenarios, setSavedScenarios] = useState<SavedScenario[]>([]);
  const [showComparison, setShowComparison] = useState(false);
  const [baseAccountId, setBaseAccountId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  // Fetch accounts on mount
  useEffect(() => {
    fetch("/api/accounts")
      .then((r) => r.json())
      .then((data: unknown) => setAccounts(Array.isArray(data) ? (data as AccountRow[]) : []))
      .catch(console.error);
  }, []);

  // Live calculation
  const calc = useMemo(
    () => calcScenario({ model, employees, term, pepyRate, platformFee, usageRate, implFee, implBilling, modules }),
    [model, employees, term, pepyRate, platformFee, usageRate, implFee, implBilling, modules]
  );

  // Comparable accounts (±50% headcount, up to 3)
  const comparables = useMemo(
    () => (Array.isArray(accounts) ? accounts : []).filter((a) => Math.abs(a.employees - employees) / employees < 0.5).slice(0, 3),
    [accounts, employees]
  );

  const marketAvgPepy = comparables.length
    ? comparables.reduce((s, c) => s + Number(c.pepy), 0) / comparables.length
    : null;
  const marketAvgImpl = comparables.length
    ? comparables.reduce((s, c) => s + Number(c.impl_fee), 0) / comparables.length
    : null;

  // Load from existing contract
  const loadFromAccount = useCallback(
    (a: AccountRow) => {
      setBaseAccountId(a.id);
      setEmployees(a.employees);
      setPepyRate(Number(a.pepy));
      setPlatformFee(Number(a.platform_fee));
      setImplFee(Number(a.impl_fee));
      setTerm(a.contract_term_months);
      setModules(a.account_modules.map((m) => m.module_name));
      setModel("pepy");
      setImplBilling("upfront");
    },
    []
  );

  // Toggle module
  const toggleModule = (m: string) =>
    setModules((prev) => (prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]));

  // Save scenario
  const saveScenario = async () => {
    setSaving(true);
    setSaveMsg("");
    const payload = {
      name: scenarioName || "Scenario",
      model,
      arr: Math.round(calc.arr),
      tcv: Math.round(calc.tcv),
      employees,
      term_months: term,
      impl_fee: implFee,
      base_account_id: baseAccountId,
      modules,
    };
    try {
      const res = await fetch("/api/scenarios", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await res.json();
      setSavedScenarios((prev) => [
        ...prev,
        {
          localId: Date.now(),
          dbId: data.id,
          name: payload.name,
          model,
          modelLabel: calc.label,
          arr: calc.arr,
          tcv: calc.tcv,
          employees,
          term,
          implFee,
          modules: [...modules],
        },
      ]);
      setSaveMsg("Saved ✓");
    } catch {
      setSaveMsg("Save failed");
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMsg(""), 2500);
    }
  };

  const clearScenarios = () => {
    setSavedScenarios([]);
    setShowComparison(false);
  };

  // All-models chart data
  const allModelsData = Object.entries(calc.allModels).map(([, v]) => ({
    name: v.label,
    ARR: Math.round(v.arr),
    TCV: Math.round(v.tcv),
  }));

  // Comparison chart data
  const comparisonData = savedScenarios.map((s) => ({
    name: s.name,
    ARR: Math.round(s.arr),
    TCV: Math.round(s.tcv),
  }));

  const mm = calc.mm;
  const upliftPct = Math.round((mm - 1) * 100);

  // ─── Comparison view ────────────────────────────────────────────────────────
  if (showComparison) {
    return (
      <div className="p-6 max-w-5xl mx-auto" style={{ background: "var(--bg-primary)", minHeight: "100vh" }}>
        <div className="flex items-center gap-3 mb-5">
          <button
            onClick={() => setShowComparison(false)}
            className="text-sm"
            style={{ color: "var(--accent-blue)", background: "none", border: "none", cursor: "pointer", padding: 0 }}
          >
            ← Builder
          </button>
          <span style={{ fontWeight: 600, fontSize: 15, color: "var(--text-primary)" }}>Scenario comparison</span>
        </div>

        {savedScenarios.length === 0 ? (
          <div
            className="rounded-2xl p-10 text-center"
            style={{ background: "var(--bg-secondary)", border: "1px solid var(--separator)", fontSize: 13, color: "var(--text-secondary)" }}
          >
            No saved scenarios yet.
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
              {savedScenarios.map((s) => (
                <div
                  key={s.localId}
                  className="rounded-2xl p-3.5"
                  style={{ background: "#FFFFFF", border: "1px solid var(--separator)", boxShadow: "var(--shadow-sm)" }}
                >
                  <p style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)", marginBottom: 4 }} className="truncate">{s.name}</p>
                  <span
                    className="inline-block text-xs px-1.5 py-0.5 rounded font-medium mb-2"
                    style={{ background: "rgba(127,119,221,0.12)", color: "#7F77DD" }}
                  >
                    {s.modelLabel}
                  </span>
                  <div className="space-y-1.5 mt-2">
                    {([["ARR", fmtD(s.arr), true], ["TCV", fmtD(s.tcv), false], ["Employees", s.employees.toLocaleString(), false], ["Term", `${s.term}mo`, false], ["Impl", fmt(s.implFee), false]] as [string, string, boolean][]).map(([k, v, bold]) => (
                      <div key={k} className="flex justify-between text-xs">
                        <span style={{ color: "var(--text-secondary)" }}>{k}</span>
                        <span style={{ fontWeight: bold ? 600 : 500, color: bold ? "#7F77DD" : "var(--text-primary)" }}>{v}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {s.modules.map((m) => (
                      <span
                        key={m}
                        className="text-xs px-1.5 py-0.5 rounded"
                        style={{ background: "var(--fill-primary)", color: "var(--text-secondary)" }}
                      >
                        {m}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div
              className="rounded-2xl p-4 mb-4"
              style={{ background: "#FFFFFF", border: "1px solid var(--separator)", boxShadow: "var(--shadow-sm)" }}
            >
              <p style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)", marginBottom: 12 }}>ARR and TCV across scenarios</p>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={comparisonData} margin={{ top: 4, right: 16, bottom: 4, left: 8 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis tickFormatter={fmtTick} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={56} />
                  <Tooltip
                    formatter={(v) => [typeof v === "number" ? fmtD(v) : "$0"]}
                    contentStyle={{ fontSize: 12, background: "#FFFFFF", borderRadius: 12, border: "1px solid var(--separator)", boxShadow: "var(--shadow-md)" }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="ARR" fill={COLORS.arr} radius={[3, 3, 0, 0]} />
                  <Bar dataKey="TCV" fill={COLORS.tcv} radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </>
        )}

        <button
          onClick={clearScenarios}
          className="text-xs"
          style={{ color: "#FF3B30", background: "none", border: "none", cursor: "pointer", padding: 0 }}
        >
          Clear all
        </button>
      </div>
    );
  }

  // ─── Builder view ────────────────────────────────────────────────────────────
  return (
    <div className="p-6" style={{ background: "var(--bg-primary)", minHeight: "100vh" }}>
      <div className="grid gap-4" style={{ gridTemplateColumns: "260px 1fr", alignItems: "start" }}>
        {/* ── LEFT PANEL ── */}
        <div className="space-y-3">
          {/* Base account banner */}
          {baseAccountId && (() => {
            const a = accounts.find((x) => x.id === baseAccountId);
            return a ? (
              <div
                className="rounded-2xl px-3 py-2 text-xs"
                style={{ background: "rgba(0,122,255,0.08)", border: "1px solid rgba(0,122,255,0.15)" }}
              >
                <span style={{ fontWeight: 600, color: "var(--accent-blue)" }}>Based on: {a.customer_name}</span>
                <p style={{ color: "rgba(0,122,255,0.7)", marginTop: 2 }}>Adjust to model a new scenario.</p>
              </div>
            ) : null;
          })()}

          {/* Pricing model */}
          <div
            className="rounded-2xl p-4"
            style={{ background: "#FFFFFF", border: "1px solid var(--separator)", boxShadow: "var(--shadow-sm)" }}
          >
            <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", marginBottom: 10 }}>Pricing model</p>
            {(["pepy", "platform", "hybrid", "usage"] as PricingModel[]).map((m) => {
              const labels = { pepy: "PEPY", platform: "Platform fee", hybrid: "PEPY + Platform", usage: "Usage-based" };
              return (
                <label
                  key={m}
                  className="flex items-center gap-2 mb-2 cursor-pointer text-sm"
                  style={{ color: "var(--text-primary)" }}
                >
                  <input type="radio" name="model" value={m} checked={model === m} onChange={() => setModel(m)} className="accent-[#007AFF]" />
                  {labels[m]}
                </label>
              );
            })}
          </div>

          {/* Deal parameters */}
          <div
            className="rounded-2xl p-4 space-y-2.5"
            style={{ background: "#FFFFFF", border: "1px solid var(--separator)", boxShadow: "var(--shadow-sm)" }}
          >
            <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>Deal parameters</p>

            <div>
              <InputLabel>Employees</InputLabel>
              <TextInput value={employees} onChange={(v) => setEmployees(Math.max(1, parseInt(v) || 1))} />
            </div>

            <div>
              <InputLabel>Term (months)</InputLabel>
              <select
                value={term}
                onChange={(e) => setTerm(Number(e.target.value))}
                className="w-full text-sm rounded-xl px-3 py-2 focus:outline-none transition-all"
                style={{
                  background: "var(--fill-primary)",
                  border: "1px solid transparent",
                  color: "var(--text-primary)",
                }}
              >
                {[12, 24, 36, 48].map((t) => <option key={t} value={t}>{t} months</option>)}
              </select>
            </div>

            {(model === "pepy" || model === "hybrid") && (
              <div>
                <InputLabel>PEPY rate ($/ee/yr)</InputLabel>
                <TextInput value={pepyRate} onChange={(v) => setPepyRate(parseFloat(v) || 0)} />
                {marketAvgPepy !== null && (
                  <p className="text-xs mt-1" style={{ color: "#BA7517" }}>Market avg: ${Math.round(marketAvgPepy)}/PEPY</p>
                )}
              </div>
            )}

            {(model === "platform" || model === "hybrid") && (
              <div>
                <InputLabel>Annual platform fee ($)</InputLabel>
                <TextInput value={platformFee} onChange={(v) => setPlatformFee(parseFloat(v) || 0)} />
              </div>
            )}

            {model === "usage" && (
              <div>
                <InputLabel>Usage rate ($/unit/mo)</InputLabel>
                <TextInput value={usageRate} onChange={(v) => setUsageRate(parseFloat(v) || 0)} step="0.001" />
              </div>
            )}

            <div>
              <InputLabel>Implementation fee ($)</InputLabel>
              <TextInput value={implFee} onChange={(v) => setImplFee(parseFloat(v) || 0)} />
              {marketAvgImpl !== null && (
                <p className="text-xs mt-1" style={{ color: "#BA7517" }}>Avg: {fmt(marketAvgImpl)} for similar deals</p>
              )}
              <div className="flex gap-4 mt-1.5">
                {(["upfront", "spread"] as const).map((b) => (
                  <label
                    key={b}
                    className="flex items-center gap-1.5 text-xs cursor-pointer"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    <input type="radio" name="implBilling" value={b} checked={implBilling === b} onChange={() => setImplBilling(b)} className="accent-[#007AFF]" />
                    {b === "upfront" ? "One-time" : "Spread"}
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Modules */}
          <div
            className="rounded-2xl p-4"
            style={{ background: "#FFFFFF", border: "1px solid var(--separator)", boxShadow: "var(--shadow-sm)" }}
          >
            <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", marginBottom: 10 }}>
              Modules ({modules.length}{upliftPct > 0 ? ` · ${upliftPct}% uplift` : ""})
            </p>
            <div className="flex flex-wrap gap-1.5">
              {ALL_MODULES.map((m) => {
                const on = modules.includes(m);
                return (
                  <button
                    key={m}
                    onClick={() => toggleModule(m)}
                    className="text-xs px-2.5 py-1 rounded-xl transition-colors"
                    style={
                      on
                        ? { background: "#007AFF", color: "#FFFFFF", border: "1px solid transparent" }
                        : { background: "var(--fill-primary)", color: "var(--text-secondary)", border: "1px solid transparent" }
                    }
                  >
                    {m}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Save */}
          <div
            className="rounded-2xl p-4 space-y-2"
            style={{ background: "#FFFFFF", border: "1px solid var(--separator)", boxShadow: "var(--shadow-sm)" }}
          >
            <div>
              <InputLabel>Scenario name</InputLabel>
              <TextInput value={scenarioName} onChange={setScenarioName} type="text" />
            </div>
            <button
              onClick={saveScenario}
              disabled={saving}
              className="w-full text-sm font-medium py-2 rounded-xl text-white disabled:opacity-50 transition-colors"
              style={{ background: "#007AFF" }}
            >
              {saving ? "Saving…" : "Save scenario"}
            </button>
            {saveMsg && <p className="text-xs text-center" style={{ color: "var(--accent-green)" }}>{saveMsg}</p>}
            {savedScenarios.length > 0 && (
              <button
                onClick={() => setShowComparison(true)}
                className="w-full text-sm py-2 rounded-xl transition-colors"
                style={{
                  background: "var(--fill-secondary)",
                  border: "1px solid var(--separator)",
                  color: "var(--accent-blue)",
                }}
              >
                View comparison ({savedScenarios.length}) →
              </button>
            )}
          </div>
        </div>

        {/* ── RIGHT PANEL ── */}
        <div className="space-y-3 min-w-0">
          {/* Load from contract */}
          <div
            className="rounded-2xl p-4"
            style={{ background: "#FFFFFF", border: "1px solid var(--separator)", boxShadow: "var(--shadow-sm)" }}
          >
            <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", marginBottom: 10 }}>Load from existing contract</p>
            <div className="flex flex-wrap gap-1.5">
              {accounts.length === 0 && (
                <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>Loading…</span>
              )}
              {accounts.map((a) => (
                <button
                  key={a.id}
                  onClick={() => loadFromAccount(a)}
                  className="text-xs px-2.5 py-1 rounded-xl transition-colors"
                  style={
                    baseAccountId === a.id
                      ? { background: "#007AFF", color: "#FFFFFF", border: "none" }
                      : { background: "var(--fill-primary)", color: "var(--text-secondary)", border: "none" }
                  }
                >
                  {a.customer_name}
                </button>
              ))}
            </div>
          </div>

          {/* Stat cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <StatCard
              label="ARR"
              value={fmtD(calc.arr)}
              sub={`${calc.label} · ${modules.length} module${modules.length !== 1 ? "s" : ""}`}
              accent="blue"
            />
            <StatCard
              label="TCV"
              value={fmtD(calc.tcv)}
              sub={`${term}mo${calc.upfront > 0 ? ` + ${fmt(calc.upfront)} impl` : ""}`}
              accent="green"
            />
            <StatCard
              label="Effective PEPY"
              value={employees > 0 ? `$${(calc.arr / employees).toFixed(2)}` : "—"}
              sub="ARR per ee/yr"
              accent="purple"
            />
            <StatCard
              label="Impl % of TCV"
              value={calc.tcv > 0 ? `${((implFee / calc.tcv) * 100).toFixed(1)}%` : "—"}
              sub={`${fmt(implFee)} total`}
              accent="amber"
            />
          </div>

          {/* Revenue breakdown */}
          <div
            className="rounded-2xl p-4"
            style={{ background: "#FFFFFF", border: "1px solid var(--separator)", boxShadow: "var(--shadow-sm)" }}
          >
            <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", marginBottom: 12 }}>Revenue breakdown</p>
            <div className="space-y-2">
              {Object.entries(calc.bd).map(([k, v]) => (
                <div key={k} className="flex items-center gap-2">
                  <span className="text-xs w-40 shrink-0" style={{ color: "var(--text-secondary)" }}>{k}</span>
                  <ProgressBar value={v} max={calc.arr || 1} color="#7F77DD" />
                  <span className="text-xs font-medium w-16 text-right" style={{ color: "var(--text-primary)" }}>{fmtD(v)}</span>
                </div>
              ))}
              {calc.upfront > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs w-40 shrink-0" style={{ color: "var(--text-secondary)" }}>Impl (upfront)</span>
                  <ProgressBar value={calc.upfront} max={calc.tcv} color="#BA7517" />
                  <span className="text-xs font-medium w-16 text-right" style={{ color: "var(--text-primary)" }}>{fmtD(calc.upfront)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Charts row */}
          <div className="grid grid-cols-2 gap-3">
            {/* All models ARR vs TCV */}
            <div
              className="rounded-2xl p-4"
              style={{ background: "#FFFFFF", border: "1px solid var(--separator)", boxShadow: "var(--shadow-sm)" }}
            >
              <p style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)", marginBottom: 4 }}>All models — ARR vs TCV</p>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={allModelsData} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                  <YAxis tickFormatter={fmtTick} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={48} />
                  <Tooltip
                    formatter={(v) => [typeof v === "number" ? fmtD(v) : "$0"]}
                    contentStyle={{ fontSize: 11, background: "#FFFFFF", borderRadius: 12, border: "1px solid var(--separator)", boxShadow: "var(--shadow-md)" }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="ARR" fill={COLORS.arr} radius={[3, 3, 0, 0]} />
                  <Bar dataKey="TCV" fill={COLORS.tcv} radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Headcount sensitivity */}
            <div
              className="rounded-2xl p-4"
              style={{ background: "#FFFFFF", border: "1px solid var(--separator)", boxShadow: "var(--shadow-sm)" }}
            >
              <p style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)", marginBottom: 2 }}>Headcount sensitivity</p>
              <p className="text-xs mb-2" style={{ color: "var(--text-secondary)" }}>ARR at ±40% headcount</p>
              <ResponsiveContainer width="100%" height={148}>
                <LineChart data={calc.sensitivity} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                  <YAxis tickFormatter={fmtTick} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={48} />
                  <Tooltip
                    formatter={(v) => [typeof v === "number" ? fmtD(v) : "$0"]}
                    contentStyle={{ fontSize: 11, background: "#FFFFFF", borderRadius: 12, border: "1px solid var(--separator)", boxShadow: "var(--shadow-md)" }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="PEPY" stroke={COLORS.pepy} dot={false} strokeWidth={2} />
                  <Line type="monotone" dataKey="Platform" stroke={COLORS.platform} dot={false} strokeWidth={2} strokeDasharray="5 3" />
                  <Line type="monotone" dataKey="Hybrid" stroke={COLORS.hybrid} dot={false} strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Comparable deals */}
          <div
            className="rounded-2xl overflow-hidden"
            style={{ background: "#FFFFFF", border: "1px solid var(--separator)", boxShadow: "var(--shadow-sm)" }}
          >
            <div className="px-4 py-3" style={{ borderBottom: "1px solid var(--separator)" }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
                Comparable deals{" "}
                <span style={{ fontWeight: 400, color: "var(--text-secondary)" }}>· similar headcount</span>
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--separator)" }}>
                    {["Customer", "Employees", "PEPY", "Impl", "ARR", "Term"].map((h) => (
                      <th
                        key={h}
                        className="px-4 py-2 text-left whitespace-nowrap uppercase tracking-wide"
                        style={{ fontSize: 11, color: "var(--text-secondary)", fontWeight: 500 }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {comparables.map((a) => (
                    <tr
                      key={a.id}
                      style={{ borderBottom: "1px solid var(--separator)" }}
                      className="transition-colors"
                      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--fill-secondary)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      <td className="px-4 py-2.5 font-medium" style={{ color: "var(--text-primary)" }}>{a.customer_name}</td>
                      <td className="px-4 py-2.5" style={{ color: "var(--text-primary)" }}>{a.employees.toLocaleString()}</td>
                      <td className="px-4 py-2.5" style={{ color: "var(--text-primary)" }}>${a.pepy}</td>
                      <td className="px-4 py-2.5" style={{ color: "var(--text-primary)" }}>{fmt(Number(a.impl_fee))}</td>
                      <td className="px-4 py-2.5 font-semibold" style={{ color: "#7F77DD" }}>{fmt(Number(a.arr))}</td>
                      <td className="px-4 py-2.5" style={{ color: "var(--text-secondary)" }}>{a.contract_term_months}mo</td>
                    </tr>
                  ))}
                  {/* Your scenario row (amber) */}
                  <tr className="bg-amber-50">
                    <td className="px-4 py-2.5 font-semibold text-amber-700">Your scenario</td>
                    <td className="px-4 py-2.5 text-amber-600">{employees.toLocaleString()}</td>
                    <td className="px-4 py-2.5 text-amber-600">${pepyRate}</td>
                    <td className="px-4 py-2.5 text-amber-600">{fmt(implFee)}</td>
                    <td className="px-4 py-2.5 font-semibold text-amber-700">{fmtD(calc.arr)}</td>
                    <td className="px-4 py-2.5 text-amber-600">{term}mo</td>
                  </tr>
                  {comparables.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-4 text-center text-xs" style={{ color: "var(--text-secondary)" }}>
                        No accounts within ±50% of {employees.toLocaleString()} employees.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
