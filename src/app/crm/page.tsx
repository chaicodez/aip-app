import Link from "next/link";
import { unstable_cache } from "next/cache";
import type { Account, AccountStatus, ModuleName } from "@/lib/types";

type AccountRow = Account & { account_modules: { module_name: ModuleName }[] };

interface VendorHealth {
  id: string;
  name: string;
  status: "healthy" | "warning" | "idle";
  error_count: number;
}

function fmt(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n}`;
}

function statusBadge(s: AccountStatus) {
  const cls =
    s === "Active"
      ? "bg-green-100 text-green-800"
      : s === "At Risk"
      ? "bg-yellow-100 text-yellow-800"
      : "bg-red-100 text-red-800";
  return <span className={`px-2 py-0.5 rounded text-xs font-medium ${cls}`}>{s}</span>;
}

const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

const getVendorHealth = unstable_cache(
  async () => {
    const res = await fetch(`${baseUrl}/api/vendors`, { cache: "no-store" });
    return res.ok ? (await res.json()) as VendorHealth[] : [];
  },
  ["vendor-health"],
  { revalidate: 60, tags: ["vendor-health"] }
);

export default async function CrmPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string; search?: string }>;
}) {
  const { sort, search } = await searchParams;

  const [accountsRes, vendors] = await Promise.all([
    fetch(`${baseUrl}/api/accounts`, { cache: "no-store" }),
    getVendorHealth(),
  ]);

  if (!accountsRes.ok) {
    const { error } = await accountsRes.json();
    return <div className="p-8 text-red-600">Error: {error}</div>;
  }

  const data: AccountRow[] = await accountsRes.json();

  // Integration health summary for header pill
  const healthyCount  = vendors.filter((v) => v.status === "healthy").length;
  const warningCount  = vendors.filter((v) => v.status === "warning").length;
  const totalErrors   = vendors.reduce((s, v) => s + v.error_count, 0);

  // Sort
  let rows = [...data];
  if (sort === "arr") {
    rows.sort((a, b) => Number(a.arr) - Number(b.arr));
  } else if (sort === "arr_desc") {
    rows.sort((a, b) => Number(b.arr) - Number(a.arr));
  } else if (sort === "employees") {
    rows.sort((a, b) => a.employees - b.employees);
  } else {
    rows.sort((a, b) => a.customer_name.localeCompare(b.customer_name));
  }

  if (search) {
    const q = search.toLowerCase();
    rows = rows.filter(
      (r) =>
        r.customer_name.toLowerCase().includes(q) ||
        r.industry.toLowerCase().includes(q) ||
        (r.hris_platform ?? "").toLowerCase().includes(q)
    );
  }

  // Stat cards
  const totalArr = rows.reduce((s, r) => s + Number(r.arr), 0);
  const totalEmp = rows.reduce((s, r) => s + r.employees, 0);
  const atRisk = rows.filter((r) => r.status === "At Risk").length;
  const avgMargin =
    rows.length === 0
      ? 0
      : rows.reduce((s, r) => {
          const rev = Number(r.arr) + Number(r.impl_fee);
          const margin = rev > 0 ? ((rev - Number(r.impl_fee) * 0.6) / rev) * 100 : 0;
          return s + margin;
        }, 0) / rows.length;

  const stats = [
    { label: "Total ARR", value: fmt(totalArr) },
    { label: "Avg Gross Margin", value: `${avgMargin.toFixed(1)}%` },
    { label: "At Risk", value: String(atRisk) },
    { label: "Total Employees", value: totalEmp.toLocaleString() },
  ];

  const pillColor = warningCount > 0 || totalErrors > 0
    ? "bg-amber-50 text-amber-700 border-amber-200"
    : "bg-green-50 text-green-700 border-green-200";

  return (
    <div className="p-6 space-y-6">
      {/* Integration health pill */}
      {vendors.length > 0 && (
        <div className="flex justify-end">
          <Link
            href="/settings"
            className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border transition-colors hover:opacity-80 ${pillColor}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${warningCount > 0 ? "bg-amber-500" : "bg-green-500"}`} />
            {healthyCount}/{vendors.length} integrations healthy
            {totalErrors > 0 && <span className="ml-1">· {totalErrors} error{totalErrors !== 1 ? "s" : ""}</span>}
          </Link>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide">{s.label}</p>
            <p className="text-2xl font-semibold text-gray-900 mt-1">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Search / sort */}
      <form method="GET" className="flex gap-3 items-center">
        <input
          name="search"
          defaultValue={search}
          placeholder="Search accounts…"
          className="border border-gray-300 rounded px-3 py-1.5 text-sm flex-1 max-w-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          name="sort"
          defaultValue={sort}
          className="border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Sort: Name</option>
          <option value="arr">Sort: ARR ↑</option>
          <option value="arr_desc">Sort: ARR ↓</option>
          <option value="employees">Sort: Employees</option>
        </select>
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-1.5 rounded text-sm hover:bg-blue-700"
        >
          Apply
        </button>
      </form>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
            <tr>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">ARR</th>
              <th className="px-4 py-3">Employees</th>
              <th className="px-4 py-3">Industry</th>
              <th className="px-4 py-3">HRIS</th>
              <th className="px-4 py-3">Impl Fee</th>
              <th className="px-4 py-3">Gross Margin</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Modules</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {rows.map((r) => {
              const rev = Number(r.arr) + Number(r.impl_fee);
              const margin =
                rev > 0
                  ? (((rev - Number(r.impl_fee) * 0.6) / rev) * 100).toFixed(1)
                  : "—";
              return (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{r.customer_name}</td>
                  <td className="px-4 py-3 text-gray-700">{fmt(Number(r.arr))}</td>
                  <td className="px-4 py-3 text-gray-700">{r.employees.toLocaleString()}</td>
                  <td className="px-4 py-3 text-gray-700">{r.industry}</td>
                  <td className="px-4 py-3 text-gray-500">{r.hris_platform ?? "—"}</td>
                  <td className="px-4 py-3 text-gray-700">{fmt(Number(r.impl_fee))}</td>
                  <td className="px-4 py-3 text-gray-700">{margin}%</td>
                  <td className="px-4 py-3">{statusBadge(r.status)}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {r.account_modules.map((m) => (
                        <span
                          key={m.module_name}
                          className="bg-blue-50 text-blue-700 text-xs px-1.5 py-0.5 rounded"
                        >
                          {m.module_name}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/crm/${r.id}`}
                      className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                    >
                      View →
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {rows.length === 0 && (
          <p className="text-center py-10 text-gray-400 text-sm">No accounts found.</p>
        )}
      </div>
    </div>
  );
}
