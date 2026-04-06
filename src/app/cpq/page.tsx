"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

// ─── Constants ────────────────────────────────────────────────────────────────
const ALL_MODULES = ["Core HR", "Payroll", "Benefits", "Analytics", "Compliance", "Scheduling"] as const;
const INDUSTRIES = ["Manufacturing", "Healthcare", "Financial Services", "Retail", "SaaS", "Logistics", "Energy"];
const HRIS_LIST  = ["Workday", "ADP", "BambooHR", "Ceridian", "SAP", "Other"];

const SEGMENT_FLOORS: { label: string; min: number; max: number; floor: number }[] = [
  { label: "SMB",        min: 1,    max: 250,  floor: 55 },
  { label: "Mid-market", min: 251,  max: 1000, floor: 45 },
  { label: "Enterprise", min: 1001, max: 5000, floor: 35 },
  { label: "Strategic",  min: 5001, max: Infinity, floor: 28 },
];

function getSegment(emp: number) {
  return SEGMENT_FLOORS.find((s) => emp >= s.min && emp <= s.max) ?? SEGMENT_FLOORS[3];
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface ModulePrice { name: string; price_pepy: number }
interface AccountRow  { id: string; customer_name: string; employees: number; arr: number }

interface LineItem {
  _id: number;
  module_name: string;
  list_price: number;
  quantity: number;
  discount_pct: number;
}

interface RulesData {
  guardrails: { id: string; tier: string; condition_text: string; max_discount_pct: number; approver: string }[];
  bundles:    { id: string; bundle_name: string; discount_pct: number; bundle_rule_modules: { module_name: string }[] }[];
  pepyFloors: { id: string; segment: string; min_employees: number; max_employees: number | null; floor_price: number; target_price: number }[];
  implGuidelines: { id: string; scope: string; hours: number | null; standard_fee: number | null; floor_fee: number | null; hourly_rate: number | null }[];
}

interface SavedQuote {
  id: string;
  customer_name: string;
  employees: number;
  term_months: number;
  arr: number;
  tcv: number;
  impl_fee: number;
  max_discount_pct: number;
  effective_pepy: number;
  status: "approved" | "pending" | "rejected";
  quote_date: string;
  quote_line_items: { module_name: string; list_price: number; quantity: number; discount_pct: number }[];
  quote_approvals: { required_approver: string; status: string }[];
}

// ─── Formatters ───────────────────────────────────────────────────────────────
function fmt(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000)     return `$${(n / 1_000).toFixed(1)}k`;
  return `$${Math.round(n).toLocaleString()}`;
}
function fmtD(n: number) { return `$${Math.round(n).toLocaleString()}`; }

// ─── Shared UI pieces ─────────────────────────────────────────────────────────
function Lbl({ children }: { children: React.ReactNode }) {
  return (
    <label
      className="block"
      style={{ fontSize: "11px", fontWeight: 500, color: "var(--text-secondary)", marginBottom: "4px" }}
    >
      {children}
    </label>
  );
}
function Inp({
  type = "text", value, onChange, placeholder, step, min, className = "",
}: {
  type?: string; value: string | number; onChange: (v: string) => void;
  placeholder?: string; step?: string; min?: string; className?: string;
}) {
  return (
    <input
      type={type} step={step} min={min} placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`w-full text-sm px-2.5 py-1.5 rounded-xl focus:outline-none ${className}`}
      style={{ background: "var(--fill-primary)", border: "1px solid transparent", color: "var(--text-primary)" }}
    />
  );
}
function Sel({
  value, onChange, children, className = "",
}: {
  value: string | number; onChange: (v: string) => void; children: React.ReactNode; className?: string;
}) {
  return (
    <select
      value={value} onChange={(e) => onChange(e.target.value)}
      className={`w-full text-sm px-2.5 py-1.5 rounded-xl focus:outline-none ${className}`}
      style={{ background: "var(--fill-primary)", border: "1px solid transparent", color: "var(--text-primary)" }}
    >
      {children}
    </select>
  );
}
function PillTabs({ tabs, active, onSelect }: { tabs: string[]; active: string; onSelect: (t: string) => void }) {
  return (
    <div className="inline-flex gap-0.5 rounded-full p-1 mb-4 flex-wrap" style={{ background: "var(--fill-primary)" }}>
      {tabs.map((t) => (
        <button
          key={t} onClick={() => onSelect(t)}
          className={`text-xs px-3.5 py-1.5 transition-all ${
            active === t ? "rounded-full font-semibold" : "rounded-full"
          }`}
          style={
            active === t
              ? { background: "#fff", color: "var(--text-primary)", boxShadow: "var(--shadow-sm)" }
              : { color: "var(--text-secondary)" }
          }
        >
          {t}
        </button>
      ))}
    </div>
  );
}
function StatusBadge({ status }: { status: string }) {
  const cls = status === "approved"
    ? "bg-green-50 text-green-700 border border-green-200 rounded-full"
    : status === "pending"
    ? "bg-amber-50 text-amber-700 border border-amber-200 rounded-full"
    : "bg-red-50 text-red-700 border border-red-200 rounded-full";
  return <span className={`inline-block text-xs px-2 py-0.5 font-medium ${cls}`}>{status}</span>;
}
function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`bg-white rounded-2xl p-4 mb-3 card-hover ${className}`}
      style={{ border: "1px solid var(--separator)", boxShadow: "var(--shadow-sm)" }}
    >
      {children}
    </div>
  );
}
function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "10px" }}>
      {children}
    </p>
  );
}
function RuleTable({ headers, rows }: { headers: string[]; rows: React.ReactNode[][] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr style={{ borderBottom: "1px solid var(--separator)" }}>
            {headers.map((h) => (
              <th
                key={h}
                className="px-3 py-2 text-left whitespace-nowrap"
                style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr
              key={ri}
              style={{ borderBottom: "1px solid var(--separator)" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--fill-secondary)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "")}
            >
              {row.map((cell, ci) => (
                <td key={ci} className="px-3 py-2.5" style={{ color: "var(--text-primary)" }}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Print helper ─────────────────────────────────────────────────────────────
function printQuote(params: {
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
h1{font-size:20px;margin-bottom:.25rem}
.sub{color:#78716c;font-size:12px;margin-bottom:1.5rem}
table{border-collapse:collapse;width:100%;margin-bottom:1.5rem}
th,td{border:1px solid #e5e5e4;padding:8px 12px;text-align:left}
th{background:#f5f5f4;font-size:12px}
.totals{max-width:280px}.totals p{display:flex;justify-content:space-between;margin-bottom:.5rem}
.footer{color:#78716c;font-size:11px;margin-top:2rem}</style></head><body>
<h1>Quote: ${customerName}</h1>
<div class="sub">${industry ? industry + " · " : ""}${employees.toLocaleString()} employees · ${term} months</div>
<table><thead><tr><th>Module</th><th>List price</th><th>Qty</th><th>Discount</th><th>Net PEPY</th><th>Annual total</th></tr></thead>
<tbody>${lineRows}</tbody></table>
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

// ─── Tab: Quote Builder ───────────────────────────────────────────────────────
let _lineId = 1;

function QuoteBuilder({
  modules, accounts,
}: {
  modules: ModulePrice[];
  accounts: AccountRow[];
}) {
  const priceOf = useCallback(
    (name: string) => modules.find((m) => m.name === name)?.price_pepy ?? 28,
    [modules]
  );

  // Form state
  const [custName,    setCustName]    = useState("");
  const [owner,       setOwner]       = useState("");
  const [industry,    setIndustry]    = useState("");
  const [hris,        setHris]        = useState("");
  const [employees,   setEmployees]   = useState(500);
  const [term,        setTerm]        = useState(24);
  const [implScope,   setImplScope]   = useState("standard");
  const [implFee,     setImplFee]     = useState(25000);
  const [implBilling, setImplBilling] = useState("upfront");
  const [managedSvc,  setManagedSvc]  = useState(0);
  const [billing,     setBilling]     = useState("Annual prepaid");
  const [payment,     setPayment]     = useState("Net 30");
  const [renewal,     setRenewal]     = useState("Auto-renew (60-day notice)");
  const [escalator,   setEscalator]   = useState(3);
  const [notes,       setNotes]       = useState("");
  const [lines,       setLines]       = useState<LineItem[]>([
    { _id: _lineId++, module_name: "Core HR",  list_price: 28, quantity: 1, discount_pct: 0 },
    { _id: _lineId++, module_name: "Payroll",   list_price: 18, quantity: 1, discount_pct: 0 },
  ]);
  const [saving, setSaving]   = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  // Calculations
  const calc = useMemo(() => {
    const lineArr = lines.reduce((s, l) => s + l.list_price * (1 - l.discount_pct / 100) * l.quantity * employees, 0);
    const msArr   = managedSvc * 12;
    const arr     = lineArr + msArr;
    const tcv     = arr * (term / 12) + implFee;
    const maxDisc = lines.length ? Math.max(...lines.map((l) => l.discount_pct)) : 0;
    const avgDisc = lines.length ? lines.reduce((s, l) => s + l.discount_pct, 0) / lines.length : 0;
    const effPepy = employees > 0 ? arr / employees : 0;
    const seg     = getSegment(employees);

    const flags: { level: "warn" | "error" | "info"; msg: string }[] = [];
    if (maxDisc > 20) flags.push({ level: "warn",  msg: "Discount exceeds 20% — Sales Manager approval required" });
    if (maxDisc > 30) flags.push({ level: "error", msg: "Discount exceeds 30% — VP Sales + Finance approval required" });
    if (arr > 200_000) flags.push({ level: "info", msg: "Enterprise deal — ensure legal review before sending" });
    if (effPepy < seg.floor && employees > 0 && arr > 0)
      flags.push({ level: "error", msg: `Effective PEPY $${effPepy.toFixed(0)} is below floor $${seg.floor} for ${seg.label} segment` });

    const status: "approved" | "pending" = maxDisc > 30 ? "pending" : "approved";
    const requiredApprover = maxDisc > 30 ? "VP Sales + Finance" : maxDisc > 20 ? "Sales Manager" : null;

    return { arr, tcv, maxDisc, avgDisc, effPepy, seg, flags, status, requiredApprover };
  }, [lines, employees, managedSvc, term, implFee]);

  // Comparable accounts (±60% headcount)
  const comparables = useMemo(
    () => accounts.filter((a) => employees > 0 && Math.abs(a.employees - employees) / employees < 0.6).slice(0, 3),
    [accounts, employees]
  );
  const avgCompArr = comparables.length
    ? comparables.reduce((s, a) => s + Number(a.arr), 0) / comparables.length
    : null;

  // Line item helpers
  const addLine = () =>
    setLines((prev) => [...prev, { _id: _lineId++, module_name: "Core HR", list_price: priceOf("Core HR"), quantity: 1, discount_pct: 0 }]);

  const removeLine = (id: number) => setLines((prev) => prev.filter((l) => l._id !== id));

  const updateLine = (id: number, field: keyof Omit<LineItem, "_id">, val: string | number) =>
    setLines((prev) =>
      prev.map((l) => {
        if (l._id !== id) return l;
        const updated = { ...l, [field]: val };
        if (field === "module_name") updated.list_price = priceOf(val as string);
        return updated;
      })
    );

  // Save
  const handleSave = async () => {
    if (!custName.trim()) { alert("Please enter a customer name."); return; }
    if (lines.length === 0) { alert("Add at least one line item."); return; }
    setSaving(true); setSaveMsg("");
    try {
      const res = await fetch("/api/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_name: custName, account_owner: owner || null,
          industry: industry || null, hris_platform: hris || null,
          employees, term_months: term,
          impl_scope: implScope, impl_fee: implFee,
          impl_billing: implBilling === "upfront" ? "upfront" : "spread",
          managed_services_monthly: managedSvc,
          billing_frequency: billing, payment_terms: payment,
          renewal_type: renewal, price_escalator_pct: escalator,
          special_terms: notes || null,
          arr: Math.round(calc.arr), tcv: Math.round(calc.tcv),
          max_discount_pct: calc.maxDisc, effective_pepy: Math.round(calc.effPepy),
          status: calc.status, required_approver: calc.requiredApprover,
          line_items: lines.map((l) => ({
            module_name: l.module_name, list_price: l.list_price,
            quantity: l.quantity, discount_pct: l.discount_pct,
          })),
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      setSaveMsg(calc.status === "pending" ? "Saved — sent for approval ✓" : "Saved ✓");
    } catch (e) {
      setSaveMsg(`Error: ${e instanceof Error ? e.message : "unknown"}`);
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMsg(""), 3000);
    }
  };

  const handleExport = () =>
    printQuote({ customerName: custName || "Draft", industry, employees, term, lines, implFee, managedServices: managedSvc, arr: calc.arr, tcv: calc.tcv, effPepy: calc.effPepy, avgDisc: calc.avgDisc, escalator });

  return (
    <div className="grid gap-4" style={{ gridTemplateColumns: "1fr 340px", alignItems: "start" }}>
      {/* ── Left column ── */}
      <div>
        {/* 1. Customer & deal info */}
        <Card>
          <SectionTitle>1 · Customer &amp; deal info</SectionTitle>
          <div className="grid grid-cols-2 gap-x-3 gap-y-2.5">
            <div>
              <Lbl>Customer name</Lbl>
              <Inp value={custName} onChange={setCustName} placeholder="e.g. Acme Corp" />
            </div>
            <div>
              <Lbl>Account owner</Lbl>
              <Inp value={owner} onChange={setOwner} placeholder="e.g. Sarah Mitchell" />
            </div>
            <div>
              <Lbl>Industry</Lbl>
              <Sel value={industry} onChange={setIndustry}>
                <option value="">Select…</option>
                {INDUSTRIES.map((i) => <option key={i}>{i}</option>)}
              </Sel>
            </div>
            <div>
              <Lbl>HRIS platform</Lbl>
              <Sel value={hris} onChange={setHris}>
                <option value="">Select…</option>
                {HRIS_LIST.map((h) => <option key={h}>{h}</option>)}
              </Sel>
            </div>
            <div>
              <Lbl>Employee count</Lbl>
              <Inp type="number" min="1" value={employees} onChange={(v) => setEmployees(Math.max(1, parseInt(v) || 1))} />
            </div>
            <div>
              <Lbl>Contract term</Lbl>
              <Sel value={term} onChange={(v) => setTerm(Number(v))}>
                {[12, 24, 36, 48].map((t) => <option key={t} value={t}>{t} months</option>)}
              </Sel>
            </div>
          </div>
        </Card>

        {/* 2. Product configuration */}
        <Card>
          <SectionTitle>2 · Product configuration</SectionTitle>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--separator)" }}>
                  {["Module / Product", "List price", "Qty", "Discount %", "Net price", "Annual total", ""].map((h) => (
                    <th
                      key={h}
                      className="px-2 py-2 text-left whitespace-nowrap"
                      style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {lines.map((l) => {
                  const net    = l.list_price * (1 - l.discount_pct / 100);
                  const annual = net * l.quantity * employees;
                  return (
                    <tr
                      key={l._id}
                      style={{ borderBottom: "1px solid var(--separator)" }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--fill-secondary)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "")}
                    >
                      <td className="px-1 py-1.5">
                        <Sel value={l.module_name} onChange={(v) => updateLine(l._id, "module_name", v)} className="w-36">
                          {ALL_MODULES.map((m) => <option key={m}>{m}</option>)}
                        </Sel>
                      </td>
                      <td className="px-1 py-1.5">
                        <Inp type="number" value={l.list_price} onChange={(v) => updateLine(l._id, "list_price", parseFloat(v) || 0)} className="w-20" />
                      </td>
                      <td className="px-1 py-1.5">
                        <Inp type="number" min="1" value={l.quantity} onChange={(v) => updateLine(l._id, "quantity", parseInt(v) || 1)} className="w-14" />
                      </td>
                      <td className="px-1 py-1.5">
                        <div className="flex items-center gap-1">
                          <Inp type="number" min="0" value={l.discount_pct} onChange={(v) => updateLine(l._id, "discount_pct", Math.min(100, parseFloat(v) || 0))} className="w-16" />
                          {l.discount_pct > 20 && <span className="text-red-500 text-sm">⚠</span>}
                        </div>
                      </td>
                      <td className="px-2 py-1.5 text-sm font-medium" style={{ color: "var(--text-primary)" }}>${net.toFixed(2)}</td>
                      <td className="px-2 py-1.5 text-sm font-semibold text-purple-700">{fmt(annual)}</td>
                      <td className="px-1 py-1.5">
                        <button
                          onClick={() => removeLine(l._id)}
                          className="text-xs px-1 transition-all"
                          style={{ color: "rgba(255,59,48,0.6)" }}
                          onMouseEnter={(e) => (e.currentTarget.style.color = "#FF3B30")}
                          onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,59,48,0.6)")}
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <button
            onClick={addLine}
            className="mt-2.5 text-xs px-3 py-1.5 rounded-xl border-dashed transition-all"
            style={{ border: "1.5px dashed var(--separator)", color: "var(--text-secondary)" }}
          >
            + Add line item
          </button>
        </Card>

        {/* 3. Implementation & services */}
        <Card>
          <SectionTitle>3 · Implementation &amp; services</SectionTitle>
          <div className="grid grid-cols-2 gap-x-3 gap-y-2.5">
            <div>
              <Lbl>Impl scope</Lbl>
              <Sel value={implScope} onChange={setImplScope}>
                <option value="standard">Standard (120 hrs)</option>
                <option value="enhanced">Enhanced (240 hrs)</option>
                <option value="enterprise">Enterprise (400+ hrs)</option>
                <option value="custom">Custom</option>
              </Sel>
            </div>
            <div>
              <Lbl>Impl fee ($)</Lbl>
              <Inp type="number" value={implFee} onChange={(v) => setImplFee(parseFloat(v) || 0)} />
            </div>
            <div>
              <Lbl>Impl billing</Lbl>
              <Sel value={implBilling} onChange={setImplBilling}>
                <option value="upfront">100% upfront</option>
                <option value="split">50/50 split</option>
                <option value="spread">Spread over term</option>
              </Sel>
            </div>
            <div>
              <Lbl>Managed services ($/mo)</Lbl>
              <Inp type="number" min="0" value={managedSvc} onChange={(v) => setManagedSvc(parseFloat(v) || 0)} />
            </div>
          </div>
        </Card>

        {/* 4. Commercial terms */}
        <Card>
          <SectionTitle>4 · Commercial terms</SectionTitle>
          <div className="grid grid-cols-2 gap-x-3 gap-y-2.5">
            <div>
              <Lbl>Billing frequency</Lbl>
              <Sel value={billing} onChange={setBilling}>
                {["Annual prepaid","Semi-annual","Quarterly","Monthly"].map((b) => <option key={b}>{b}</option>)}
              </Sel>
            </div>
            <div>
              <Lbl>Payment terms</Lbl>
              <Sel value={payment} onChange={setPayment}>
                {["Net 30","Net 45","Net 60","Due on receipt"].map((p) => <option key={p}>{p}</option>)}
              </Sel>
            </div>
            <div>
              <Lbl>Renewal type</Lbl>
              <Sel value={renewal} onChange={setRenewal}>
                {["Auto-renew (60-day notice)","Manual renewal","Evergreen"].map((r) => <option key={r}>{r}</option>)}
              </Sel>
            </div>
            <div>
              <Lbl>Price escalator (%/yr)</Lbl>
              <Inp type="number" step="0.5" value={escalator} onChange={(v) => setEscalator(parseFloat(v) || 0)} />
            </div>
          </div>
          <div className="mt-2.5">
            <Lbl>Special terms / notes</Lbl>
            <textarea
              value={notes} onChange={(e) => setNotes(e.target.value)}
              className="w-full text-sm px-2.5 py-1.5 rounded-xl focus:outline-none resize-y"
              style={{ background: "var(--fill-primary)", border: "1px solid transparent", color: "var(--text-primary)" }}
              rows={3}
            />
          </div>
        </Card>
      </div>

      {/* ── Right: sticky summary ── */}
      <div className="sticky top-4">
        <div
          className="bg-white rounded-2xl p-5"
          style={{ border: "1px solid var(--separator)", boxShadow: "var(--shadow-lg)" }}
        >
          <p className="text-xs font-semibold mb-3" style={{ color: "var(--text-secondary)" }}>Quote summary</p>

          {/* Customer header */}
          <p className="text-base font-bold mb-0.5" style={{ color: "#AF52DE" }}>{custName || "New Quote"}</p>
          <p className="text-xs mb-3" style={{ color: "var(--text-secondary)" }}>
            {[industry, `${employees.toLocaleString()} employees`, `${term}mo`].filter(Boolean).join(" · ")}
          </p>

          {/* Line items */}
          <div className="mb-3">
            <p className="text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Line items</p>
            {lines.map((l) => {
              const net    = l.list_price * (1 - l.discount_pct / 100);
              const annual = net * l.quantity * employees;
              return (
                <div key={l._id} className="flex justify-between text-xs mb-1">
                  <span style={{ color: "var(--text-primary)" }}>
                    {l.module_name}
                    {l.discount_pct > 0 && <span className="text-amber-600 ml-1">(−{l.discount_pct}%)</span>}
                  </span>
                  <span className="font-medium">{fmt(annual)}/yr</span>
                </div>
              );
            })}
            {managedSvc > 0 && (
              <div className="flex justify-between text-xs mb-1">
                <span style={{ color: "var(--text-primary)" }}>Managed services</span>
                <span className="font-medium">{fmt(managedSvc * 12)}/yr</span>
              </div>
            )}
          </div>

          {/* Totals */}
          <div className="pt-3 mb-3 space-y-1.5" style={{ borderTop: "1px solid var(--separator)" }}>
            <div className="flex justify-between">
              <span className="text-xs" style={{ color: "var(--text-secondary)" }}>ARR</span>
              <span className="text-base font-bold" style={{ color: "#AF52DE" }}>{fmtD(calc.arr)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs" style={{ color: "var(--text-secondary)" }}>TCV ({term}mo)</span>
              <span className="text-xs font-semibold">{fmtD(calc.tcv)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs" style={{ color: "var(--text-secondary)" }}>Impl fee</span>
              <span className="text-xs font-medium">{fmtD(implFee)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs" style={{ color: "var(--text-secondary)" }}>Effective PEPY</span>
              <span className={`text-xs font-semibold ${calc.effPepy >= calc.seg.floor ? "text-green-600" : "text-red-600"}`}>
                {calc.effPepy > 0 ? `$${calc.effPepy.toFixed(0)}` : "—"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs" style={{ color: "var(--text-secondary)" }}>Avg discount</span>
              <span className={`text-xs font-semibold ${calc.avgDisc > 20 ? "text-red-600" : calc.avgDisc > 10 ? "text-amber-600" : "text-green-600"}`}>
                {calc.avgDisc.toFixed(1)}%
              </span>
            </div>
            {escalator > 0 && (
              <div className="flex justify-between">
                <span className="text-xs" style={{ color: "var(--text-secondary)" }}>Yr 2 ARR (w/ escalator)</span>
                <span className="text-xs font-medium">{fmtD(calc.arr * (1 + escalator / 100))}</span>
              </div>
            )}
          </div>

          {/* Approval flags */}
          {calc.flags.length > 0 && (
            <div className="mb-3 space-y-1">
              {calc.flags.map((f, i) => {
                const flagStyle =
                  f.level === "error"
                    ? { borderLeft: "3px solid #FF3B30", background: "rgba(255,59,48,0.08)", color: "#FF3B30" }
                    : f.level === "warn"
                    ? { borderLeft: "3px solid #FF9F0A", background: "rgba(255,159,10,0.08)", color: "#FF9F0A" }
                    : { borderLeft: "3px solid #007AFF", background: "rgba(0,122,255,0.08)", color: "#007AFF" };
                return (
                  <div key={i} className="rounded-xl px-3 py-2 flex gap-1.5 items-start text-xs" style={flagStyle}>
                    <span>⚠</span><span>{f.msg}</span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Market benchmarks */}
          <div className="rounded-xl p-2.5 mb-3" style={{ background: "var(--fill-primary)" }}>
            <p className="text-xs font-semibold mb-1.5" style={{ color: "var(--text-secondary)" }}>Market benchmarks</p>
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span style={{ color: "var(--text-secondary)" }}>Segment</span>
                <span className="font-medium" style={{ color: "var(--text-primary)" }}>{calc.seg.label}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span style={{ color: "var(--text-secondary)" }}>PEPY floor</span>
                <span className="font-medium" style={{ color: "var(--text-primary)" }}>${calc.seg.floor}</span>
              </div>
              {avgCompArr !== null && (
                <div className="flex justify-between text-xs">
                  <span style={{ color: "var(--text-secondary)" }}>Avg ARR (similar)</span>
                  <span className="font-medium" style={{ color: "var(--text-primary)" }}>{fmt(avgCompArr)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2">
            <button
              onClick={handleSave} disabled={saving}
              className="w-full text-sm font-semibold py-3 rounded-xl text-white transition-all hover:opacity-90 disabled:opacity-50"
              style={{ background: "var(--accent-blue)" }}
            >
              {saving ? "Saving…" : "Save quote"}
            </button>
            <button
              onClick={handleExport}
              className="w-full text-sm py-3 rounded-xl border transition-all hover:opacity-80"
              style={{ border: "1px solid var(--separator)", color: "var(--text-primary)" }}
            >
              Export
            </button>
          </div>
          {saveMsg && (
            <p className={`text-xs text-center mt-2 ${saveMsg.startsWith("Error") ? "text-red-500" : "text-green-600"}`}>
              {saveMsg}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Tab: Pricing Rules ───────────────────────────────────────────────────────
function PricingRules({ rules }: { rules: RulesData | null }) {
  if (!rules) return <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Loading rules…</p>;

  const discColor = (pct: number) =>
    pct <= 10 ? "text-green-600" : pct <= 20 ? "text-amber-600" : pct <= 30 ? "text-red-600" : "text-purple-700";

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        {/* Discount guardrails */}
        <Card>
          <SectionTitle>Discount guardrails</SectionTitle>
          <RuleTable
            headers={["Tier", "Condition", "Max discount", "Approver"]}
            rows={rules.guardrails.map((g) => [
              g.tier,
              g.condition_text,
              <span key="d" className={`font-semibold ${discColor(g.max_discount_pct)}`}>
                {g.max_discount_pct >= 100 ? "Negotiated" : `${g.max_discount_pct}%`}
              </span>,
              g.approver,
            ])}
          />
        </Card>

        {/* Bundle rules */}
        <Card>
          <SectionTitle>Bundle pricing rules</SectionTitle>
          <RuleTable
            headers={["Bundle", "Modules included", "Discount"]}
            rows={rules.bundles.map((b) => [
              <span key="n" className="font-medium">{b.bundle_name}</span>,
              <span key="m" className="text-xs" style={{ color: "var(--text-secondary)" }}>
                {b.bundle_rule_modules.map((m) => m.module_name).join(", ") || "—"}
              </span>,
              b.discount_pct > 0
                ? <span key="d" className="font-semibold text-green-600">{b.discount_pct}%</span>
                : <span key="d" style={{ color: "var(--text-secondary)" }}>—</span>,
            ])}
          />
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* PEPY floors */}
        <Card>
          <SectionTitle>PEPY floor pricing by segment</SectionTitle>
          <RuleTable
            headers={["Segment", "Employee range", "PEPY floor", "PEPY target"]}
            rows={rules.pepyFloors.map((p) => [
              p.segment,
              p.max_employees
                ? `${p.min_employees.toLocaleString()}–${p.max_employees.toLocaleString()}`
                : `${p.min_employees.toLocaleString()}+`,
              <span key="f" className="font-semibold text-red-600">${p.floor_price}</span>,
              `$${p.target_price}`,
            ])}
          />
        </Card>

        {/* Impl fee guidelines */}
        <Card>
          <SectionTitle>Implementation fee guidelines</SectionTitle>
          <RuleTable
            headers={["Scope", "Hours", "Standard fee", "Floor"]}
            rows={rules.implGuidelines.map((g) => [
              <span key="s" className="capitalize">{g.scope}</span>,
              g.hours ? `${g.hours}h` : "TBD",
              g.standard_fee ? fmtD(g.standard_fee) : g.hourly_rate ? `T&M @ $${g.hourly_rate}/hr` : "—",
              g.floor_fee
                ? <span key="f" className="font-semibold text-red-600">{fmtD(g.floor_fee)}</span>
                : <span key="f" style={{ color: "var(--text-secondary)" }}>—</span>,
            ])}
          />
        </Card>
      </div>
    </div>
  );
}

// ─── Tab: Approvals ───────────────────────────────────────────────────────────
function Approvals({
  quotes, onStatusChange,
}: {
  quotes: SavedQuote[];
  onStatusChange: (id: string, status: "approved" | "rejected") => void;
}) {
  const pending = quotes.filter((q) => q.status === "pending");

  if (pending.length === 0) {
    return (
      <div className="rounded-2xl p-10 text-center text-sm" style={{ background: "var(--fill-primary)", color: "var(--text-secondary)" }}>
        No pending approvals. Quotes exceeding discount thresholds will appear here.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {pending.map((q) => {
        const approver = q.quote_approvals?.[0]?.required_approver ?? "Sales Manager";
        return (
          <div
            key={q.id}
            className="bg-white rounded-2xl p-4 card-hover"
            style={{ borderLeft: "4px solid #FF9F0A", border: "1px solid var(--separator)", boxShadow: "var(--shadow-sm)" }}
          >
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>{q.customer_name}</span>
              <StatusBadge status={q.status} />
              <span className="ml-auto text-xs" style={{ color: "var(--text-secondary)" }}>{q.quote_date}</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
              {[
                { label: "ARR", value: fmtD(q.arr), accent: "blue" },
                { label: "Max discount", value: `${q.max_discount_pct}%`, accent: "amber" },
                { label: "Approver", value: approver, accent: "purple" },
                { label: "TCV", value: fmtD(q.tcv), accent: "green" },
              ].map(({ label, value, accent }) => {
                const borders: Record<string, string> = { blue: "#378ADD", amber: "#BA7517", purple: "#7F77DD", green: "#1D9E75" };
                return (
                  <div key={label} className="bg-white rounded-lg p-2.5" style={{ borderLeft: `3px solid ${borders[accent]}`, border: "1px solid var(--separator)" }}>
                    <p className="text-xs" style={{ color: "var(--text-secondary)" }}>{label}</p>
                    <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{value}</p>
                  </div>
                );
              })}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => onStatusChange(q.id, "approved")}
                className="text-sm font-medium px-4 py-1.5 rounded-xl text-white"
                style={{ background: "#34C759" }}
              >
                Approve
              </button>
              <button
                onClick={() => onStatusChange(q.id, "rejected")}
                className="text-sm px-4 py-1.5 rounded-xl border"
                style={{ border: "1px solid #FF3B30", color: "#FF3B30" }}
              >
                Reject
              </button>
              <button
                className="text-sm px-4 py-1.5 rounded-xl border transition-all hover:opacity-80"
                style={{ border: "1px solid var(--separator)", color: "var(--text-primary)" }}
              >
                Request info
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Tab: Saved Quotes ────────────────────────────────────────────────────────
function SavedQuotes({ quotes }: { quotes: SavedQuote[] }) {
  if (quotes.length === 0) {
    return (
      <div className="rounded-2xl p-10 text-center text-sm" style={{ background: "var(--fill-primary)", color: "var(--text-secondary)" }}>
        No saved quotes yet. Build a quote and click Save.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {quotes.map((q) => (
        <div
          key={q.id}
          className="bg-white rounded-2xl p-4 card-hover"
          style={{ border: "1px solid var(--separator)", boxShadow: "var(--shadow-sm)" }}
        >
          <div className="flex justify-between items-start mb-1.5">
            <span className="text-xs font-semibold truncate mr-2" style={{ color: "var(--text-primary)" }}>{q.customer_name}</span>
            <StatusBadge status={q.status} />
          </div>
          <p className="text-lg font-bold text-purple-700 mb-2">{fmtD(q.arr)}</p>
          <div className="space-y-1">
            {([["TCV", fmtD(q.tcv)], ["Term", `${q.term_months}mo`], ["Employees", q.employees.toLocaleString()], ["Max disc", `${q.max_discount_pct}%`], ["Date", q.quote_date]] as [string, string][]).map(([k, v]) => (
              <div key={k} className="flex justify-between text-xs">
                <span style={{ color: "var(--text-secondary)" }}>{k}</span>
                <span className="font-medium" style={{ color: "var(--text-primary)" }}>{v}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Root page ────────────────────────────────────────────────────────────────
const TABS = ["Quote Builder", "Pricing Rules", "Approvals", "Saved Quotes"] as const;
type Tab = (typeof TABS)[number];

export default function CpqPage() {
  const [tab, setTab]       = useState<Tab>("Quote Builder");
  const [modules, setModules] = useState<ModulePrice[]>([]);
  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [rules, setRules]   = useState<RulesData | null>(null);
  const [quotes, setQuotes] = useState<SavedQuote[]>([]);
  const loadedRef           = useRef(false);

  // Fetch all data once
  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;

    Promise.all([
      fetch("/api/modules").then((r) => r.json()),
      fetch("/api/accounts").then((r) => r.json()),
      fetch("/api/cpq/rules").then((r) => r.json()),
      fetch("/api/quotes").then((r) => r.json()),
    ]).then(([mods, accts, rulesData, quotesData]) => {
      setModules(Array.isArray(mods) ? mods : []);
      setAccounts(Array.isArray(accts) ? accts : []);
      setRules(rulesData.error ? null : rulesData);
      setQuotes(Array.isArray(quotesData) ? quotesData : []);
    }).catch(console.error);
  }, []);

  // Optimistic status change for approvals
  const handleStatusChange = useCallback(async (id: string, status: "approved" | "rejected") => {
    setQuotes((prev) => prev.map((q) => q.id === id ? { ...q, status } : q));
    try {
      await fetch(`/api/quotes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
    } catch (e) {
      console.error(e);
    }
  }, []);

  return (
    <div className="p-6" style={{ background: "var(--bg-primary)" }}>
      <PillTabs tabs={[...TABS]} active={tab} onSelect={(t) => setTab(t as Tab)} />

      {tab === "Quote Builder" && (
        <QuoteBuilder modules={modules} accounts={accounts} />
      )}
      {tab === "Pricing Rules" && <PricingRules rules={rules} />}
      {tab === "Approvals" && (
        <Approvals quotes={quotes} onStatusChange={handleStatusChange} />
      )}
      {tab === "Saved Quotes" && <SavedQuotes quotes={quotes} />}
    </div>
  );
}
