"use client";

import { useState } from "react";
import { ProServChart, ProfitabilityChart } from "./charts";

const HR = 185;

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
    blue:   "#007AFF",
    green:  "#34C759",
    amber:  "#FF9500",
    red:    "#FF3B30",
    purple: "#AF52DE",
  };
  const borderColor = accent ? colors[accent] : "var(--separator)";
  return (
    <div
      className="bg-white rounded-2xl p-4"
      style={{
        border: "1px solid var(--separator)",
        borderLeftWidth: "3px",
        borderLeftColor: borderColor,
        boxShadow: "var(--shadow-sm)",
      }}
    >
      <p
        className="mb-0.5"
        style={{ fontSize: "11px", color: "var(--text-secondary)" }}
      >
        {label}
      </p>
      <p
        className="font-semibold"
        style={{ fontSize: "17px", color: "var(--text-primary)" }}
      >
        {value}
      </p>
      {sub && (
        <p className="mt-0.5" style={{ fontSize: "11px", color: "var(--text-secondary)" }}>
          {sub}
        </p>
      )}
    </div>
  );
}

function Badge({ text }: { text: string }) {
  const map: Record<string, string> = {
    Active:       "bg-green-50 text-green-700 border border-green-200",
    "At Risk":    "bg-red-50 text-red-700 border border-red-200",
    Churned:      "bg-gray-100 text-gray-600 border border-gray-200",
    "Closed Won": "bg-green-50 text-green-700 border border-green-200",
    Negotiation:  "bg-blue-50 text-blue-700 border border-blue-200",
    Proposal:     "bg-purple-50 text-purple-700 border border-purple-200",
    Discovery:    "bg-amber-50 text-amber-700 border border-amber-200",
    High:         "bg-red-50 text-red-700 border border-red-200",
    Medium:       "bg-amber-50 text-amber-700 border border-amber-200",
    Low:          "bg-gray-100 text-gray-600 border border-gray-200",
    Closed:       "bg-green-50 text-green-700 border border-green-200",
    "In Progress":"bg-blue-50 text-blue-700 border border-blue-200",
    Open:         "bg-amber-50 text-amber-700 border border-amber-200",
  };
  const cls = map[text] ?? "bg-gray-100 text-gray-600 border border-gray-200";
  return (
    <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium ${cls}`}>
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
    <div
      className="flex-1 h-2 rounded-full overflow-hidden"
      style={{ background: "var(--fill-primary)" }}
    >
      <div
        className="h-2 rounded-full"
        style={{ width: `${pct}%`, background: color }}
      />
    </div>
  );
}

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

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="bg-white rounded-2xl p-4"
      style={{ border: "1px solid var(--separator)", boxShadow: "var(--shadow-sm)" }}
    >
      {children}
    </div>
  );
}

function CardTitle({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="font-semibold mb-3"
      style={{ fontSize: "13px", color: "var(--text-primary)" }}
    >
      {children}
    </p>
  );
}

function OverviewTab({ account, modules, proserv, rdTickets }: Omit<Props, "opportunities">) {
  const arr = Number(account.arr);
  const implFee = Number(account.impl_fee);
  const proservCost = proserv ? proserv.total_hours * HR : 0;
  const rdHours = rdTickets.reduce((s, t) => s + t.hours, 0);
  const rdCost = rdHours * HR;
  const rev = arr + implFee;
  const net = rev - proservCost - rdCost;
  const margin = rev > 0 ? (net / rev) * 100 : 0;
  const marginColor = margin >= 30 ? "#34C759" : margin >= 0 ? "#FF9500" : "#FF3B30";
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
    { label: "ARR", value: arr, color: "#007AFF" },
    { label: "Impl revenue", value: implFee, color: "#5AC8FA" },
    { label: "ProServ cost", value: proservCost, color: "#FF9500" },
    { label: "R&D cost", value: rdCost, color: "#FF3B30" },
  ];

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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
        <Card>
          <CardTitle>Account details</CardTitle>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
            {details.map(([k, v]) => (
              <div key={k}>
                <p style={{ fontSize: "11px", color: "var(--text-secondary)" }}>{k}</p>
                <p className="text-sm font-medium mt-0.5" style={{ color: "var(--text-primary)" }}>{v}</p>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-1.5 mt-3">
            {modules.map((m) => (
              <span
                key={m}
                className="text-xs px-2 py-0.5 rounded-full font-medium"
                style={{ background: "rgba(175,82,222,0.1)", color: "#AF52DE" }}
              >
                {m}
              </span>
            ))}
          </div>
        </Card>

        <Card>
          <CardTitle>Cost vs revenue</CardTitle>
          <div className="space-y-2.5">
            {bars.map((b) => (
              <div key={b.label} className="flex items-center gap-2">
                <span
                  className="w-24 shrink-0"
                  style={{ fontSize: "11px", color: "var(--text-secondary)" }}
                >
                  {b.label}
                </span>
                <ProgressBar value={b.value} max={rev} color={b.color} />
                <span
                  className="text-xs font-medium w-14 text-right"
                  style={{ color: "var(--text-primary)" }}
                >
                  {fmt(b.value)}
                </span>
              </div>
            ))}
          </div>
          <div
            className="mt-3 pt-3 flex justify-between text-xs"
            style={{ borderTop: "1px solid var(--separator)" }}
          >
            <span style={{ color: "var(--text-secondary)" }}>Net profit</span>
            <span className="font-semibold" style={{ color: marginColor }}>
              {fmtD(net)}
            </span>
          </div>
        </Card>
      </div>
    </div>
  );
}

function OpportunitiesTab({ opportunities }: { opportunities: Opportunity[] }) {
  const total = opportunities.reduce((s, o) => s + Number(o.value), 0);
  return (
    <Card>
      <div
        className="px-0 pb-3 mb-3"
        style={{ borderBottom: "1px solid var(--separator)" }}
      >
        <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
          Opportunities ({opportunities.length}) · pipeline {fmt(total)}
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: "1px solid var(--separator)" }}>
              {["ID", "Name", "Stage", "Value", "Close date", "Age"].map((h) => (
                <th
                  key={h}
                  className="pb-2 text-left whitespace-nowrap font-semibold uppercase tracking-wide"
                  style={{ fontSize: "11px", color: "var(--text-secondary)" }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {opportunities.map((o) => {
              const age = o.age_days;
              const ageColor = age > 60 ? "#FF3B30" : age > 30 ? "#FF9500" : "#34C759";
              return (
                <tr
                  key={o.id}
                  className="transition-colors"
                  style={{ borderBottom: "1px solid var(--separator)" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--fill-secondary)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <td className="py-2.5 pr-4 font-mono text-xs" style={{ color: "var(--text-secondary)" }}>{o.id}</td>
                  <td className="py-2.5 pr-4 font-medium" style={{ color: "var(--text-primary)" }}>{o.name}</td>
                  <td className="py-2.5 pr-4"><Badge text={o.stage} /></td>
                  <td className="py-2.5 pr-4 font-semibold" style={{ color: "#AF52DE" }}>{fmtD(Number(o.value))}</td>
                  <td className="py-2.5 pr-4 text-xs" style={{ color: "var(--text-secondary)" }}>{o.close_date ?? "—"}</td>
                  <td className="py-2.5">
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
    </Card>
  );
}

function ProServTab({ proserv }: { proserv: ProServ | null }) {
  if (!proserv) {
    return <p className="text-sm" style={{ color: "var(--text-secondary)" }}>No ProServ engagement on file.</p>;
  }
  const { total_hours, billed_hours, remaining_hours, impl_hours, support_hours, time_to_value_days, resources } = proserv;
  const implPct = total_hours > 0 ? Math.round((impl_hours / total_hours) * 100) : 0;
  const supPct  = total_hours > 0 ? Math.round((support_hours / total_hours) * 100) : 0;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total PS hours" value={`${total_hours}h`} sub="Contracted" accent="blue" />
        <StatCard
          label="Hours consumed"
          value={`${billed_hours}h`}
          sub={remaining_hours >= 0 ? `${remaining_hours}h remaining` : `${Math.abs(remaining_hours)}h over budget`}
          accent={remaining_hours >= 0 ? "green" : "red"}
        />
        <StatCard label="Impl / support" value={`${implPct}% / ${supPct}%`} sub={`${impl_hours}h impl`} accent="purple" />
        <StatCard
          label="Time to value"
          value={`${time_to_value_days} days`}
          sub="Start to go-live"
          accent={time_to_value_days <= 120 ? "green" : time_to_value_days <= 180 ? "amber" : "red"}
        />
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        <Card>
          <CardTitle>Resources assigned</CardTitle>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--separator)" }}>
                {["Name", "Role", "Hours", "Cost"].map((h) => (
                  <th
                    key={h}
                    className="pb-2 text-left font-semibold uppercase tracking-wide"
                    style={{ fontSize: "11px", color: "var(--text-secondary)" }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {resources.map((r) => (
                <tr
                  key={r.name}
                  className="transition-colors"
                  style={{ borderBottom: "1px solid var(--separator)" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--fill-secondary)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <td className="py-2.5 font-medium" style={{ color: "var(--text-primary)" }}>{r.name}</td>
                  <td className="py-2.5 text-xs" style={{ color: "var(--text-secondary)" }}>{r.role}</td>
                  <td className="py-2.5" style={{ color: "var(--text-primary)" }}>{r.hours}h</td>
                  <td className="py-2.5 font-semibold" style={{ color: "#FF9500" }}>{fmtD(r.hours * HR)}</td>
                </tr>
              ))}
              <tr style={{ background: "var(--fill-primary)" }}>
                <td colSpan={2} className="py-2 font-semibold text-xs" style={{ color: "var(--text-primary)" }}>Total</td>
                <td className="py-2 font-semibold" style={{ color: "var(--text-primary)" }}>{total_hours}h</td>
                <td className="py-2 font-semibold" style={{ color: "#FF9500" }}>{fmtD(total_hours * HR)}</td>
              </tr>
            </tbody>
          </table>
        </Card>

        <Card>
          <CardTitle>Hours by resource</CardTitle>
          <ProServChart resources={resources} />
        </Card>
      </div>
    </div>
  );
}

function RdTab({ rdTickets }: { rdTickets: RdTicket[] }) {
  const totalHours  = rdTickets.reduce((s, t) => s + t.hours, 0);
  const activeCount = rdTickets.filter((t) => t.status !== "Closed").length;
  const avgHrs      = rdTickets.length > 0 ? (totalHours / rdTickets.length).toFixed(1) : "0";

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Total tickets" value={String(rdTickets.length)} sub={`${activeCount} active`} accent="purple" />
        <StatCard label="Total R&D hours" value={`${totalHours}h`} sub={`${fmtD(totalHours * HR)} cost`} accent="red" />
        <StatCard label="Avg hrs / ticket" value={`${avgHrs}h`} sub="per ticket" accent="amber" />
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--separator)" }}>
                {["Ticket", "Title", "Status", "Priority", "Hours", "Cost"].map((h) => (
                  <th
                    key={h}
                    className="pb-2.5 text-left font-semibold uppercase tracking-wide whitespace-nowrap"
                    style={{ fontSize: "11px", color: "var(--text-secondary)" }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rdTickets.map((t) => (
                <tr
                  key={t.id}
                  className="transition-colors"
                  style={{ borderBottom: "1px solid var(--separator)" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--fill-secondary)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <td className="py-2.5 pr-4 font-mono text-xs" style={{ color: "var(--text-secondary)" }}>{t.id}</td>
                  <td className="py-2.5 pr-4 font-medium" style={{ color: "var(--text-primary)" }}>{t.title}</td>
                  <td className="py-2.5 pr-4"><Badge text={t.status} /></td>
                  <td className="py-2.5 pr-4"><Badge text={t.priority} /></td>
                  <td className="py-2.5 pr-4" style={{ color: "var(--text-primary)" }}>{t.hours}h</td>
                  <td className="py-2.5 font-semibold" style={{ color: "#FF3B30" }}>{fmtD(t.hours * HR)}</td>
                </tr>
              ))}
              <tr style={{ background: "var(--fill-primary)" }}>
                <td colSpan={4} className="py-2 font-semibold text-xs" style={{ color: "var(--text-primary)" }}>Total</td>
                <td className="py-2 font-semibold" style={{ color: "var(--text-primary)" }}>{totalHours}h</td>
                <td className="py-2 font-semibold" style={{ color: "#FF3B30" }}>{fmtD(totalHours * HR)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>
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
  const arr          = Number(account.arr);
  const implFee      = Number(account.impl_fee);
  const proservCost  = proserv ? proserv.total_hours * HR : 0;
  const rdHours      = rdTickets.reduce((s, t) => s + t.hours, 0);
  const rdCost       = rdHours * HR;
  const rev          = arr + implFee;
  const totalCost    = proservCost + rdCost;
  const net          = rev - totalCost;
  const margin       = rev > 0 ? (net / rev) * 100 : 0;
  const marginColor  = margin >= 40 ? "green" : margin >= 20 ? "amber" : "red";
  const marginLabel  = margin >= 40 ? "Healthy" : margin >= 20 ? "Watch" : "At risk";

  const waterfall = [
    { label: "ARR",         value: arr,          color: "#007AFF",  sign: "+" },
    { label: "Impl fee",    value: implFee,       color: "#5AC8FA",  sign: "+" },
    { label: "ProServ cost",value: proservCost,   color: "#FF9500",  sign: "−" },
    { label: "R&D cost",    value: rdCost,        color: "#FF3B30",  sign: "−" },
    { label: "Net profit",  value: Math.abs(net), color: net >= 0 ? "#34C759" : "#FF3B30", sign: "=" },
  ];

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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
        <Card>
          <CardTitle>Revenue vs cost</CardTitle>
          <ProfitabilityChart
            arr={arr}
            implFee={implFee}
            proservCost={proservCost}
            rdCost={rdCost}
          />
        </Card>

        <Card>
          <CardTitle>Profitability waterfall</CardTitle>
          <div className="space-y-2.5">
            {waterfall.map((row) => (
              <div key={row.label} className="flex items-center gap-2">
                <span
                  className="font-medium w-3 shrink-0"
                  style={{ fontSize: "11px", color: "var(--text-secondary)" }}
                >
                  {row.sign}
                </span>
                <span
                  className="w-24 shrink-0"
                  style={{ fontSize: "11px", color: "var(--text-secondary)" }}
                >
                  {row.label}
                </span>
                <ProgressBar value={row.value} max={rev} color={row.color} />
                <span
                  className="text-xs font-semibold w-16 text-right"
                  style={{ color: "var(--text-primary)" }}
                >
                  {fmt(row.value)}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

const TABS = ["Overview", "Opportunities", "ProServ", "R&D Tickets", "Profitability"] as const;
type Tab = (typeof TABS)[number];

export function DetailTabs(props: Props) {
  const [active, setActive] = useState<Tab>("Overview");

  return (
    <div>
      {/* Pill-style tab bar */}
      <div
        className="inline-flex gap-0.5 rounded-full p-1 mb-5"
        style={{ background: "var(--fill-primary)" }}
      >
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setActive(t)}
            className="text-xs px-3.5 py-1.5 rounded-full font-medium transition-all"
            style={
              active === t
                ? {
                    background: "#fff",
                    color: "var(--text-primary)",
                    boxShadow: "var(--shadow-sm)",
                    fontWeight: 600,
                  }
                : { color: "var(--text-secondary)" }
            }
          >
            {t}
          </button>
        ))}
      </div>

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
