import Link from "next/link";
import { notFound } from "next/navigation";
import { DetailTabs } from "./detail-tabs";

const HR = 185;

function fmt(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}k`;
  return `$${Math.round(n).toLocaleString()}`;
}

const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export default async function AccountDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const res = await fetch(`${baseUrl}/api/accounts/${id}`, { cache: "no-store" });
  if (!res.ok) notFound();

  const { account: raw, opportunities: opportunitiesRaw, proserv: proservRaw, rdTickets: rdRaw } =
    await res.json();

  const account = {
    id: raw.id as string,
    customer_name: raw.customer_name as string,
    industry: raw.industry as string,
    employees: raw.employees as number,
    contract_term_months: raw.contract_term_months as number,
    pepy: Number(raw.pepy),
    platform_fee: Number(raw.platform_fee),
    impl_fee: Number(raw.impl_fee),
    region: raw.region as string,
    arr: Number(raw.arr),
    hris_platform: raw.hris_platform as string | null,
    account_owner: raw.account_owner as string | null,
    status: raw.status as string,
  };

  const accountModules = (raw.account_modules as { module_name: string }[]) ?? [];
  const modules = accountModules.map((m) => m.module_name);

  const proserv = proservRaw
    ? {
        total_hours: proservRaw.total_hours as number,
        billed_hours: proservRaw.billed_hours as number,
        remaining_hours: proservRaw.remaining_hours as number,
        impl_hours: proservRaw.impl_hours as number,
        support_hours: proservRaw.support_hours as number,
        time_to_value_days: proservRaw.time_to_value_days as number,
        resources: ((proservRaw.proserv_resources as { name: string; role: string; hours: number }[]) ?? []).map(
          (r) => ({ name: r.name, role: r.role, hours: r.hours })
        ),
      }
    : null;

  const opportunities = (opportunitiesRaw ?? []).map((o: Record<string, unknown>) => ({
    id: o.id as string,
    name: o.name as string,
    stage: o.stage as string,
    value: Number(o.value),
    close_date: o.close_date as string | null,
    age_days: o.age_days as number,
  }));

  const rdTickets = (rdRaw ?? []).map((t: Record<string, unknown>) => ({
    id: t.id as string,
    title: t.title as string,
    status: t.status as string,
    priority: t.priority as string,
    hours: t.hours as number,
  }));

  // Profitability summary for header
  const arr = account.arr;
  const implFee = account.impl_fee;
  const proservCost = proserv ? proserv.total_hours * HR : 0;
  const rdHours = rdTickets.reduce((s: number, t: { hours: number }) => s + t.hours, 0);
  const rdCost = rdHours * HR;
  const rev = arr + implFee;
  const net = rev - proservCost - rdCost;
  const margin = rev > 0 ? (net / rev) * 100 : 0;
  const statusCls =
    account.status === "Active"
      ? "bg-green-50 text-green-700 border border-green-200"
      : account.status === "At Risk"
      ? "bg-red-50 text-red-700 border border-red-200"
      : "bg-gray-100 text-gray-600 border border-gray-200";

  const marginColor =
    margin >= 30 ? "#34C759" : margin >= 0 ? "#FF9500" : "#FF3B30";

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <Link
          href="/crm"
          className="text-sm font-medium transition-all hover:opacity-70"
          style={{ color: "var(--accent-blue)" }}
        >
          ← Back
        </Link>
        <h1 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>{account.customer_name}</h1>
        <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${statusCls}`}>
          {account.status}
        </span>
        <span className="ml-auto text-xs" style={{ color: "var(--text-secondary)" }}>
          {fmt(arr)} ARR &nbsp;·&nbsp;{" "}
          <span className="font-semibold" style={{ color: marginColor }}>
            {margin.toFixed(1)}%
          </span>{" "}
          margin
        </span>
      </div>

      {/* Tabs (client component with all data) */}
      <DetailTabs
        account={account}
        modules={modules}
        opportunities={opportunities}
        proserv={proserv}
        rdTickets={rdTickets}
      />
    </div>
  );
}
