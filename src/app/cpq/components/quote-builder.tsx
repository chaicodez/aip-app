"use client";

import { useCallback, useMemo, useState } from "react";
import { ALL_MODULES, INDUSTRIES, HRIS_LIST, getSegment, fmt, type ModulePrice, type AccountRow, type LineItem } from "@/app/cpq/types";
import { Lbl, Inp, Sel, Card, SectionTitle, printQuote } from "@/app/cpq/components/ui";
import { QuoteSummary } from "@/app/cpq/components/quote-summary";

let _lineId = 1;

export function QuoteBuilder({ modules, accounts }: { modules: ModulePrice[]; accounts: AccountRow[] }) {
  const priceOf = useCallback(
    (name: string) => modules.find((m) => m.name === name)?.price_pepy ?? 28,
    [modules]
  );

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
    { _id: _lineId++, module_name: "Core HR", list_price: 28, quantity: 1, discount_pct: 0 },
    { _id: _lineId++, module_name: "Payroll",  list_price: 18, quantity: 1, discount_pct: 0 },
  ]);
  const [saving,  setSaving]  = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

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

  const addLine = () =>
    setLines((prev) => [...prev, { _id: _lineId++, module_name: "Core HR", list_price: priceOf("Core HR"), quantity: 1, discount_pct: 0 }]);
  const removeLine = (id: number) => setLines((prev) => prev.filter((l) => l._id !== id));
  const updateLine = (id: number, field: keyof Omit<LineItem, "_id">, val: string | number) =>
    setLines((prev) => prev.map((l) => {
      if (l._id !== id) return l;
      const updated = { ...l, [field]: val };
      if (field === "module_name") updated.list_price = priceOf(val as string);
      return updated;
    }));

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
          line_items: lines.map((l) => ({ module_name: l.module_name, list_price: l.list_price, quantity: l.quantity, discount_pct: l.discount_pct })),
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
      <div>
        <Card>
          <SectionTitle>1 · Customer &amp; deal info</SectionTitle>
          <div className="grid grid-cols-2 gap-x-3 gap-y-2.5">
            <div><Lbl>Customer name</Lbl><Inp value={custName} onChange={setCustName} placeholder="e.g. Acme Corp" /></div>
            <div><Lbl>Account owner</Lbl><Inp value={owner} onChange={setOwner} placeholder="e.g. Sarah Mitchell" /></div>
            <div><Lbl>Industry</Lbl><Sel value={industry} onChange={setIndustry}><option value="">Select…</option>{INDUSTRIES.map((i) => <option key={i}>{i}</option>)}</Sel></div>
            <div><Lbl>HRIS platform</Lbl><Sel value={hris} onChange={setHris}><option value="">Select…</option>{HRIS_LIST.map((h) => <option key={h}>{h}</option>)}</Sel></div>
            <div><Lbl>Employee count</Lbl><Inp type="number" min="1" value={employees} onChange={(v) => setEmployees(Math.max(1, parseInt(v) || 1))} /></div>
            <div><Lbl>Contract term</Lbl><Sel value={term} onChange={(v) => setTerm(Number(v))}>{[12, 24, 36, 48].map((t) => <option key={t} value={t}>{t} months</option>)}</Sel></div>
          </div>
        </Card>

        <Card>
          <SectionTitle>2 · Product configuration</SectionTitle>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  {["Module / Product", "List price", "Qty", "Discount %", "Net price", "Annual total", ""].map((h) => (
                    <th key={h} className="text-xs text-gray-400 font-medium px-2 py-2 text-left whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {lines.map((l) => {
                  const net    = l.list_price * (1 - l.discount_pct / 100);
                  const annual = net * l.quantity * employees;
                  return (
                    <tr key={l._id} className="border-b border-gray-50">
                      <td className="px-1 py-1.5"><Sel value={l.module_name} onChange={(v) => updateLine(l._id, "module_name", v)} className="w-36">{ALL_MODULES.map((m) => <option key={m}>{m}</option>)}</Sel></td>
                      <td className="px-1 py-1.5"><Inp type="number" value={l.list_price} onChange={(v) => updateLine(l._id, "list_price", parseFloat(v) || 0)} className="w-20" /></td>
                      <td className="px-1 py-1.5"><Inp type="number" min="1" value={l.quantity} onChange={(v) => updateLine(l._id, "quantity", parseInt(v) || 1)} className="w-14" /></td>
                      <td className="px-1 py-1.5"><div className="flex items-center gap-1"><Inp type="number" min="0" value={l.discount_pct} onChange={(v) => updateLine(l._id, "discount_pct", Math.min(100, parseFloat(v) || 0))} className="w-16" />{l.discount_pct > 20 && <span className="text-red-500 text-sm">⚠</span>}</div></td>
                      <td className="px-2 py-1.5 text-sm font-medium text-gray-800">${net.toFixed(2)}</td>
                      <td className="px-2 py-1.5 text-sm font-semibold text-purple-700">{fmt(annual)}</td>
                      <td className="px-1 py-1.5"><button onClick={() => removeLine(l._id)} className="text-red-400 hover:text-red-600 text-sm px-1">✕</button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <button onClick={addLine} className="mt-2.5 text-xs border border-gray-200 px-3 py-1.5 rounded-lg text-gray-600 hover:bg-gray-50">+ Add line item</button>
        </Card>

        <Card>
          <SectionTitle>3 · Implementation &amp; services</SectionTitle>
          <div className="grid grid-cols-2 gap-x-3 gap-y-2.5">
            <div><Lbl>Impl scope</Lbl><Sel value={implScope} onChange={setImplScope}><option value="standard">Standard (120 hrs)</option><option value="enhanced">Enhanced (240 hrs)</option><option value="enterprise">Enterprise (400+ hrs)</option><option value="custom">Custom</option></Sel></div>
            <div><Lbl>Impl fee ($)</Lbl><Inp type="number" value={implFee} onChange={(v) => setImplFee(parseFloat(v) || 0)} /></div>
            <div><Lbl>Impl billing</Lbl><Sel value={implBilling} onChange={setImplBilling}><option value="upfront">100% upfront</option><option value="split">50/50 split</option><option value="spread">Spread over term</option></Sel></div>
            <div><Lbl>Managed services ($/mo)</Lbl><Inp type="number" min="0" value={managedSvc} onChange={(v) => setManagedSvc(parseFloat(v) || 0)} /></div>
          </div>
        </Card>

        <Card>
          <SectionTitle>4 · Commercial terms</SectionTitle>
          <div className="grid grid-cols-2 gap-x-3 gap-y-2.5">
            <div><Lbl>Billing frequency</Lbl><Sel value={billing} onChange={setBilling}>{["Annual prepaid","Semi-annual","Quarterly","Monthly"].map((b) => <option key={b}>{b}</option>)}</Sel></div>
            <div><Lbl>Payment terms</Lbl><Sel value={payment} onChange={setPayment}>{["Net 30","Net 45","Net 60","Due on receipt"].map((p) => <option key={p}>{p}</option>)}</Sel></div>
            <div><Lbl>Renewal type</Lbl><Sel value={renewal} onChange={setRenewal}>{["Auto-renew (60-day notice)","Manual renewal","Evergreen"].map((r) => <option key={r}>{r}</option>)}</Sel></div>
            <div><Lbl>Price escalator (%/yr)</Lbl><Inp type="number" step="0.5" value={escalator} onChange={(v) => setEscalator(parseFloat(v) || 0)} /></div>
          </div>
          <div className="mt-2.5">
            <Lbl>Special terms / notes</Lbl>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full text-sm px-2.5 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y" rows={3} />
          </div>
        </Card>
      </div>

      <QuoteSummary
        custName={custName} industry={industry} employees={employees} term={term}
        implFee={implFee} escalator={escalator} managedSvc={managedSvc}
        segment={calc.seg} accounts={accounts} items={lines}
        arr={calc.arr} tcv={calc.tcv} effPepy={calc.effPepy} avgDisc={calc.avgDisc}
        flags={calc.flags} saving={saving} saveMsg={saveMsg}
        onSave={handleSave} onExport={handleExport}
      />
    </div>
  );
}
