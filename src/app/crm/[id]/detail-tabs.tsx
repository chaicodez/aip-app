"use client";

import { useState } from "react";
import { ProServChart, ProfitabilityChart } from "./charts";

const HR = 185; // $/hr — matches prototype

// ─── Small helpers ────────────────────────────────────────────────────────────
function fmt(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}k`;
  return `$${Math.round(n).toLocaleString()}`;
}
function fmtD(n: number) {
  return `$${Math.round(n).toLocaleString()}`;
}

function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: "blue" | "green" | "amber" | "red" | "purple";
}) {
  const colors = {
    blue: "#378ADD",
    green: "#1D9E75",
    amber: "#BA7517",
    red: "#E24B4A",
    purple: "#7F77DD",
  };
  const border = accent ? colors[accent] : "#e5e5e4";
  return (
    <div
      className="bg-white border border-gray-200 rounded-xl p-3"
      style={{ borderLeft: `3px solid ${border}` }}
    >
      <p className="text-xs text-gray-500 mb-0.5">{label}</p>
      <p className="text-lg font-semibold text-gray-900">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

function Badge({ text }: { text: string }) {
  const map: Record<string, string> = {
    Active: "bg-green-100 text-green-800",
    "At Risk": "bg-yellow-100 text-yellow-800",
    Churned: "bg-red-100 text-red-800",
    "Closed Won": "bg-green-100 text-green-800",
    Negotiation: "bg-blue-100 text-blue-800",
    Proposal: "bg-purple-100 text-purple-800",
    Discovery: "bg-yellow-100 text-yellow-800",
    High: "bg-red-100 text-red-800",
    Medium: "bg-yellow-100 text-yellow-800",
    Low: "bg-gray-100 text-gray-600",
    Closed: "bg-green-100 text-green-800",
    "In Progress": "bg-blue-100 text-blue-800",
    Open: "bg-yellow-100 text-yellow-800",
  };
  const cls = map[text] ?? "bg-gray-100 text-gray-600";
  return (
    <span className={`inline-block text-xs px-1.5 py-0.5 rounded-md font-medium ${cls}`}>
      {text}
    </span>
  );
}

function ProgressBar({
  value,
  max,
  color,
}: {
  value: number;
  max: number;
  color: string;
}) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
      <div
        className="h-2.5 rounded-full"
        style={{ width: `${pct}%`, background: color }}
      />
    </div>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────
type ModuleName = string;

interface Account {
  id: string;
  customer_name: string;
  industry: string;
  employees: number;
  contract_term_months: number;
  pepy: number;
  platform_fee: number;
  impl_fee: number;
  region: string;
  arr: number;
  hris_platform: string | null;
  account_owner: string | null;
  status: string;
}

interface Opportunity {
  id: string;
  name: string;
  stage: string;
  value: number;
  close_date: string | null;
  age_days: number;
}

interface Resource {
  name: string;
  role: string;
  hours: number;
}

interface ProServ {
  total_hours: number;
  billed_hours: number;
  remaining_hours: number;
  impl_hours: number;
  support_hours: number;
  time_to_value_days: number;
  resources: Resource[];
}

interface RdTicket {
  id: string;
  title: string;
  status: string;
  priority: string;
  hours: number;
}

interface Props {
  account: Account;
  modules: ModuleName[];
  opportunities: Opportunity[];
  proserv: ProServ | null;
  rdTickets: RdTicket[];
}

// ─── Tab panels ──────────────────────────────────────────────────────────────
function OverviewTab({ account, modules, proserv, rdTickets }: Omit<Props, "opportunities">) {
  const arr = Number(account.arr);
  const implFee = Number(account.impl_fee);
  const proservCost = proserv ? proserv.total_hours * HR : 0;
  const rdHours = rdTickets.reduce((s, t) => s + t.hours, 0);
  const rdCost = rdHours * HR;
  const rev = arr + implFee;
  const net = rev - proservCost - rdCost;
  const margin = rev > 0 ? (net / rev) * 100 : 0;
  const marginColor = margin >= 30 ? "#16a34a" : margin >= 0 ? "#d97706" : "#dc2626";
  const ttv = proserv?.time_to_value_days ?? 0;

  const details = [
    ["Owner", account.account_owner ?? "—"],
    ["Industry", account.industry],
    ["Region", account.region],
    ["HRIS", account.hris_platform ?? "—"],
    ["Term", `${account.contract_term_months}mo`],
    ["PEPY", `$${account.pepy}`],
    ["Platform fee", fmt(Number(account.platform_fee))],
    ["Impl fee", fmt(implFee)],
  ];

  const bars = [
    { label: "ARR", value: arr, color: "#7F77DD" },
    { label: "Impl revenue", value: implFee, color: "#AFA9EC" },
    { label: "ProServ cost", value: proservCost, color: "#BA7517" },
    { label: "R&D cost", value: rdCost, color: "#E24B4A" },
  ];

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <StatCard label="ARR" value={fmt(arr)} sub={`${account.contract_term_months}mo term`} accent="blue" />
        <StatCard label="Employees" value={account.employees.toLocaleString()} sub={account.industry} accent="purple" />
        <StatCard
          label="Gross margin"
          value={`${margin.toFixed(1)}%`}
          sub={`${fmtD(net)} net`}
          accent={margin >= 30 ? "green" : margin >= 0 ? "amber" : "red"}
        />
        <StatCard
          label="Impl TTV"
          value={`${ttv} days`}
          sub={proserv ? `${proserv.impl_hours}h impl hrs` : "—"}
          accent={ttv <= 120 ? "green" : ttv <= 180 ? "amber" : "red"}
        />
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        {/* Account details */}
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs font-medium text-gray-900 mb-3">Account details</p>
          <div className="grid grid-cols-2 gap-x-3 gap-y-2">
            {details.map(([k, v]) => (
              <div key={k}>
                <p className="text-xs text-gray-400">{k}</p>
                <p className="text-sm font-medium text-gray-900">{v}</p>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-1 mt-3">
            {modules.map((m) => (
              <span key={m} className="bg-purple-50 text-purple-700 text-xs px-1.5 py-0.5 rounded-md font-medium">
                {m}
              </span>
            ))}
          </div>
        </div>

        {/* Cost vs revenue */}
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs font-medium text-gray-900 mb-3">Cost vs revenue</p>
          <div className="space-y-2">
            {bars.map((b) => (
              <div key={b.label} className="flex items-center gap-2">
                <span className="text-xs text-gray-400 w-24 shrink-0">{b.label}</span>
                <ProgressBar value={b.value} max={rev} color={b.color} />
                <span className="text-xs font-medium w-14 text-right">{fmt(b.value)}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 pt-3 border-t border-gray-100 flex justify-between text-xs">
            <span className="text-gray-500">Net profit</span>
            <span className="font-semibold" style={{ color: marginColor }}>
              {fmtD(net)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function OpportunitiesTab({ opportunities }: { opportunities: Opportunity[] }) {
  const total = opportunities.reduce((s, o) => s + Number(o.value), 0);
  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100">
        <span className="text-xs font-medium text-gray-900">
          Opportunities ({opportunities.length}) · pipeline {fmt(total)}
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              {["ID", "Name", "Stage", "Value", "Close date", "Age"].map((h) => (
                <th key={h} className="text-xs text-gray-400 font-medium px-4 py-2 text-left whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {opportunities.map((o) => {
              const age = o.age_days;
              const ageColor = age > 60 ? "#dc2626" : age > 30 ? "#d97706" : "#16a34a";
              return (
                <tr key={o.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-2.5 font-mono text-xs text-gray-400">{o.id}</td>
                  <td className="px-4 py-2.5 font-medium text-gray-900">{o.name}</td>
                  <td className="px-4 py-2.5"><Badge text={o.stage} /></td>
                  <td className="px-4 py-2.5 font-semibold text-purple-700">{fmtD(Number(o.value))}</td>
                  <td className="px-4 py-2.5 text-gray-400 text-xs">{o.close_date ?? "—"}</td>
                  <td className="px-4 py-2.5">
                    <span className="font-semibold text-xs" style={{ color: ageColor }}>
                      {age}d
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ProServTab({ proserv }: { proserv: ProServ | null }) {
  if (!proserv) {
    return <p className="text-sm text-gray-400">No ProServ engagement on file.</p>;
  }
  const { total_hours, billed_hours, remaining_hours, impl_hours, support_hours, time_to_value_days, resources } = proserv;
  const implPct = total_hours > 0 ? Math.round((impl_hours / total_hours) * 100) : 0;
  const supPct = total_hours > 0 ? Math.round((support_hours / total_hours) * 100) : 0;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <StatCard label="Total PS hours" value={`${total_hours}h`} sub="Contracted" accent="blue" />
        <StatCard
          label="Hours consumed"
          value={`${billed_hours}h`}
          sub={remaining_hours >= 0 ? `${remaining_hours}h remaining` : `${Math.abs(remaining_hours)}h over budget`}
          accent={remaining_hours >= 0 ? "green" : "red"}
        />
        <StatCard
          label="Impl / support"
          value={`${implPct}% / ${supPct}%`}
          sub={`${impl_hours}h impl`}
          accent="purple"
        />
        <StatCard
          label="Time to value"
          value={`${time_to_value_days} days`}
          sub="Start to go-live"
          accent={time_to_value_days <= 120 ? "green" : time_to_value_days <= 180 ? "amber" : "red"}
        />
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        {/* Resources table */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-xs font-medium text-gray-900">Resources assigned</p>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                {["Name", "Role", "Hours", "Cost"].map((h) => (
                  <th key={h} className="text-xs text-gray-400 font-medium px-4 py-2 text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {resources.map((r) => (
                <tr key={r.name} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-2.5 font-medium text-gray-900">{r.name}</td>
                  <td className="px-4 py-2.5 text-gray-400 text-xs">{r.role}</td>
                  <td className="px-4 py-2.5 text-gray-700">{r.hours}h</td>
                  <td className="px-4 py-2.5 font-semibold text-amber-600">{fmtD(r.hours * HR)}</td>
                </tr>
              ))}
              <tr className="bg-gray-50">
                <td colSpan={2} className="px-4 py-2.5 font-semibold text-xs text-gray-700">Total</td>
                <td className="px-4 py-2.5 font-semibold text-gray-700">{total_hours}h</td>
                <td className="px-4 py-2.5 font-semibold text-amber-600">{fmtD(total_hours * HR)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Bar chart */}
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs font-medium text-gray-900 mb-3">Hours by resource</p>
          <ProServChart resources={resources} />
        </div>
      </div>
    </div>
  );
}

function RdTab({ rdTickets }: { rdTickets: RdTicket[] }) {
  const totalHours = rdTickets.reduce((s, t) => s + t.hours, 0);
  const activeCount = rdTickets.filter((t) => t.status !== "Closed").length;
  const avgHrs = rdTickets.length > 0 ? (totalHours / rdTickets.length).toFixed(1) : "0";

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        <StatCard label="Total tickets" value={String(rdTickets.length)} sub={`${activeCount} active`} accent="purple" />
        <StatCard label="Total R&D hours" value={`${totalHours}h`} sub={`${fmtD(totalHours * HR)} cost`} accent="red" />
        <StatCard label="Avg hrs / ticket" value={`${avgHrs}h`} sub="per ticket" accent="amber" />
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                {["Ticket", "Title", "Status", "Priority", "Hours", "Cost"].map((h) => (
                  <th key={h} className="text-xs text-gray-400 font-medium px-4 py-2.5 text-left whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rdTickets.map((t) => (
                <tr key={t.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-2.5 font-mono text-xs text-gray-400">{t.id}</td>
                  <td className="px-4 py-2.5 font-medium text-gray-900">{t.title}</td>
                  <td className="px-4 py-2.5"><Badge text={t.status} /></td>
                  <td className="px-4 py-2.5"><Badge text={t.priority} /></td>
                  <td className="px-4 py-2.5 text-gray-700">{t.hours}h</td>
                  <td className="px-4 py-2.5 font-semibold text-red-600">{fmtD(t.hours * HR)}</td>
                </tr>
              ))}
              <tr className="bg-gray-50">
                <td colSpan={4} className="px-4 py-2.5 font-semibold text-xs text-gray-700">Total</td>
                <td className="px-4 py-2.5 font-semibold text-gray-700">{totalHours}h</td>
                <td className="px-4 py-2.5 font-semibold text-red-600">{fmtD(totalHours * HR)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function ProfitabilityTab({
  account,
  proserv,
  rdTickets,
}: {
  account: Account;
  proserv: ProServ | null;
  rdTickets: RdTicket[];
}) {
  const arr = Number(account.arr);
  const implFee = Number(account.impl_fee);
  const proservCost = proserv ? proserv.total_hours * HR : 0;
  const rdHours = rdTickets.reduce((s, t) => s + t.hours, 0);
  const rdCost = rdHours * HR;
  const rev = arr + implFee;
  const totalCost = proservCost + rdCost;
  const net = rev - totalCost;
  const margin = rev > 0 ? (net / rev) * 100 : 0;
  const marginColor = margin >= 40 ? "green" : margin >= 20 ? "amber" : "red";
  const marginLabel = margin >= 40 ? "Healthy" : margin >= 20 ? "Watch" : "At risk";

  const waterfall = [
    { label: "ARR", value: arr, color: "#7F77DD", sign: "+" },
    { label: "Impl fee", value: implFee, color: "#AFA9EC", sign: "+" },
    { label: "ProServ cost", value: proservCost, color: "#BA7517", sign: "−" },
    { label: "R&D cost", value: rdCost, color: "#E24B4A", sign: "−" },
    { label: "Net profit", value: Math.abs(net), color: net >= 0 ? "#1D9E75" : "#E24B4A", sign: "=" },
  ];

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <StatCard label="Total revenue" value={fmtD(rev)} sub="ARR + impl" accent="blue" />
        <StatCard label="Total cost" value={fmtD(totalCost)} sub="ProServ + R&D" accent="red" />
        <StatCard label="Net profit" value={fmtD(net)} accent={net >= 0 ? "green" : "red"} />
        <StatCard
          label="Gross margin"
          value={`${margin.toFixed(1)}%`}
          sub={marginLabel}
          accent={marginColor as "green" | "amber" | "red"}
        />
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        {/* Stacked bar chart */}
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs font-medium text-gray-900 mb-2">Revenue vs cost</p>
          <ProfitabilityChart
            arr={arr}
            implFee={implFee}
            proservCost={proservCost}
            rdCost={rdCost}
          />
        </div>

        {/* Waterfall */}
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs font-medium text-gray-900 mb-3">Profitability waterfall</p>
          <div className="space-y-2">
            {waterfall.map((row) => (
              <div key={row.label} className="flex items-center gap-2">
                <span className="text-xs text-gray-400 font-medium w-3 shrink-0">{row.sign}</span>
                <span className="text-xs text-gray-400 w-24 shrink-0">{row.label}</span>
                <ProgressBar value={row.value} max={rev} color={row.color} />
                <span className="text-xs font-semibold w-16 text-right">{fmt(row.value)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main exported component ──────────────────────────────────────────────────
const TABS = ["Overview", "Opportunities", "ProServ", "R&D Tickets", "Profitability"] as const;
type Tab = (typeof TABS)[number];

export function DetailTabs(props: Props) {
  const [active, setActive] = useState<Tab>("Overview");

  return (
    <div>
      {/* Tab bar */}
      <div className="flex gap-1.5 flex-wrap mb-4">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setActive(t)}
            className={`text-xs px-3.5 py-1.5 rounded-full border transition-colors ${
              active === t
                ? "bg-gray-900 text-white border-gray-900 font-medium"
                : "bg-transparent text-gray-500 border-gray-200 hover:bg-gray-100"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {active === "Overview" && (
        <OverviewTab
          account={props.account}
          modules={props.modules}
          proserv={props.proserv}
          rdTickets={props.rdTickets}
        />
      )}
      {active === "Opportunities" && (
        <OpportunitiesTab opportunities={props.opportunities} />
      )}
      {active === "ProServ" && <ProServTab proserv={props.proserv} />}
      {active === "R&D Tickets" && <RdTab rdTickets={props.rdTickets} />}
      {active === "Profitability" && (
        <ProfitabilityTab
          account={props.account}
          proserv={props.proserv}
          rdTickets={props.rdTickets}
        />
      )}
    </div>
  );
}
