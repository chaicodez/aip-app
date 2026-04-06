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
  const marginColor =
    margin >= 30 ? "#16a34a" : margin >= 0 ? "#d97706" : "#dc2626";

  const statusCls =
    account.status === "Active"
      ? "bg-green-100 text-green-800"
      : account.status === "At Risk"
      ? "bg-yellow-100 text-yellow-800"
      : "bg-red-100 text-red-800";

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <Link
          href="/crm"
          className="text-sm border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors"
        >
          ← Back
        </Link>
        <h1 className="text-base font-semibold text-gray-900">{account.customer_name}</h1>
        <span className={`text-xs px-2 py-0.5 rounded-md font-medium ${statusCls}`}>
          {account.status}
        </span>
        <span className="ml-auto text-xs text-gray-400">
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
