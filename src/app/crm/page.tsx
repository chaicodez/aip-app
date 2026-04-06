import Link from "next/link";
import { unstable_cache } from "next/cache";
import type { Account, AccountStatus, ModuleName } from "@/lib/types";
import { getServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

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
      ? "bg-green-50 text-green-700 border border-green-200"
      : s === "At Risk"
      ? "bg-red-50 text-red-700 border border-red-200"
      : "bg-gray-100 text-gray-600 border border-gray-200";
  return (
    <span
      className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${cls}`}
    >
      {s}
    </span>
  );
}

const STAT_ACCENTS = ["#007AFF", "#34C759", "#FF3B30", "#AF52DE"];

const getVendorHealth = unstable_cache(
  async () => {
    const supabase = getServiceClient();
    const { data } = await supabase.from("vendors").select("*").order("name");
    return (data ?? []) as VendorHealth[];
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

  const supabase = getServiceClient();
  const [{ data, error }, vendors] = await Promise.all([
    supabase.from("accounts").select("*, account_modules(module_name)").order("customer_name"),
    getVendorHealth(),
  ]);

  if (error) {
    return <div className="p-8 text-red-600">Error: {error.message}</div>;
  }

  const accounts: AccountRow[] = (data ?? []) as AccountRow[];

  const healthyCount = vendors.filter((v) => v.status === "healthy").length;
  const warningCount = vendors.filter((v) => v.status === "warning").length;
  const totalErrors  = vendors.reduce((s, v) => s + v.error_count, 0);

  let rows = [...accounts];
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

  const totalArr = rows.reduce((s, r) => s + Number(r.arr), 0);
  const totalEmp = rows.reduce((s, r) => s + r.employees, 0);
  const atRisk   = rows.filter((r) => r.status === "At Risk").length;
  const avgMargin =
    rows.length === 0
      ? 0
      : rows.reduce((s, r) => {
          const rev = Number(r.arr) + Number(r.impl_fee);
          const margin = rev > 0 ? ((rev - Number(r.impl_fee) * 0.6) / rev) * 100 : 0;
          return s + margin;
        }, 0) / rows.length;

  const stats = [
    { label: "Total ARR",        value: fmt(totalArr) },
    { label: "Avg Gross Margin", value: `${avgMargin.toFixed(1)}%` },
    { label: "At Risk",          value: String(atRisk) },
    { label: "Total Employees",  value: totalEmp.toLocaleString() },
  ];

  const pillColor =
    warningCount > 0 || totalErrors > 0
      ? "bg-amber-50 text-amber-700 border-amber-200"
      : "bg-green-50 text-green-700 border-green-200";

  return (
    <div className="p-6 space-y-5" style={{ background: "var(--bg-primary)" }}>
      {/* Integration health pill */}
      {vendors.length > 0 && (
        <div className="flex justify-end">
          <Link
            href="/settings"
            className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border transition-all hover:opacity-80 ${pillColor}`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${warningCount > 0 ? "bg-amber-500" : "bg-green-500"}`}
            />
            {healthyCount}/{vendors.length} integrations healthy
            {totalErrors > 0 && (
              <span className="ml-1">
                · {totalErrors} error{totalErrors !== 1 ? "s" : ""}
              </span>
            )}
          </Link>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((s, i) => (
          <div
            key={s.label}
            className="bg-white rounded-2xl p-5 card-hover"
            style={{
              borderLeft: `3px solid ${STAT_ACCENTS[i]}`,
              boxShadow: "var(--shadow-sm)",
              border: `1px solid var(--separator)`,
              borderLeftWidth: "3px",
              borderLeftColor: STAT_ACCENTS[i],
            }}
          >
            <p
              className="text-xs font-semibold uppercase tracking-wide mb-1"
              style={{ color: "var(--text-secondary)", fontSize: "11px" }}
            >
              {s.label}
            </p>
            <p
              className="font-semibold"
              style={{ fontSize: "28px", lineHeight: "1.2", color: "var(--text-primary)" }}
            >
              {s.value}
            </p>
          </div>
        ))}
      </div>

      {/* Search / sort */}
      <form method="GET" className="flex gap-3 items-center">
        <div className="relative flex-1 max-w-xs">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
            style={{ color: "var(--text-secondary)" }}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            name="search"
            defaultValue={search}
            placeholder="Search accounts…"
            className="w-full pl-9 pr-4 py-2 rounded-xl text-sm transition-all focus:outline-none"
            style={{
              background: "var(--fill-primary)",
              color: "var(--text-primary)",
              border: "1px solid transparent",
            }}
            onFocus={(e) => {
              e.currentTarget.style.background = "#fff";
              e.currentTarget.style.borderColor = "rgba(0,122,255,0.3)";
              e.currentTarget.style.boxShadow = "var(--shadow-sm)";
            }}
            onBlur={(e) => {
              e.currentTarget.style.background = "var(--fill-primary)";
              e.currentTarget.style.borderColor = "transparent";
              e.currentTarget.style.boxShadow = "none";
            }}
          />
        </div>
        <select
          name="sort"
          defaultValue={sort}
          className="text-sm px-3 py-2 rounded-xl focus:outline-none transition-all"
          style={{
            background: "var(--fill-primary)",
            color: "var(--text-primary)",
            border: "1px solid transparent",
          }}
        >
          <option value="">Sort: Name</option>
          <option value="arr">Sort: ARR ↑</option>
          <option value="arr_desc">Sort: ARR ↓</option>
          <option value="employees">Sort: Employees</option>
        </select>
        <button
          type="submit"
          className="px-4 py-2 rounded-xl text-sm font-medium text-white transition-all hover:opacity-90"
          style={{ background: "var(--accent-blue)" }}
        >
          Apply
        </button>
      </form>

      {/* Table */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          background: "#fff",
          boxShadow: "var(--shadow-sm)",
          border: "1px solid var(--separator)",
        }}
      >
        <table className="w-full text-sm text-left">
          <thead>
            <tr style={{ background: "var(--bg-tertiary)", borderBottom: "1px solid var(--separator)" }}>
              {["Customer", "ARR", "Employees", "Industry", "HRIS", "Impl Fee", "Gross Margin", "Status", "Modules", ""].map((h) => (
                <th
                  key={h}
                  className="px-4 py-3 font-semibold uppercase tracking-wide"
                  style={{ fontSize: "11px", color: "var(--text-secondary)" }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const rev = Number(r.arr) + Number(r.impl_fee);
              const margin =
                rev > 0
                  ? (((rev - Number(r.impl_fee) * 0.6) / rev) * 100).toFixed(1)
                  : "—";
              return (
                <tr
                  key={r.id}
                  className="transition-colors"
                  style={{ borderBottom: "1px solid var(--separator)" }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = "var(--fill-secondary)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "transparent")
                  }
                >
                  <td
                    className="px-4 py-3 font-medium"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {r.customer_name}
                  </td>
                  <td className="px-4 py-3" style={{ color: "var(--text-primary)" }}>
                    {fmt(Number(r.arr))}
                  </td>
                  <td className="px-4 py-3" style={{ color: "var(--text-primary)" }}>
                    {r.employees.toLocaleString()}
                  </td>
                  <td className="px-4 py-3" style={{ color: "var(--text-secondary)" }}>
                    {r.industry}
                  </td>
                  <td className="px-4 py-3" style={{ color: "var(--text-secondary)" }}>
                    {r.hris_platform ?? "—"}
                  </td>
                  <td className="px-4 py-3" style={{ color: "var(--text-primary)" }}>
                    {fmt(Number(r.impl_fee))}
                  </td>
                  <td className="px-4 py-3" style={{ color: "var(--text-primary)" }}>
                    {margin}%
                  </td>
                  <td className="px-4 py-3">{statusBadge(r.status)}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {r.account_modules.map((m) => (
                        <span
                          key={m.module_name}
                          className="bg-blue-50 text-blue-700 text-xs rounded-full px-2 py-0.5"
                        >
                          {m.module_name}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/crm/${r.id}`}
                      className="text-xs font-medium hover:underline"
                      style={{ color: "var(--accent-blue)" }}
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
          <p
            className="text-center py-10 text-sm"
            style={{ color: "var(--text-secondary)" }}
          >
            No accounts found.
          </p>
        )}
      </div>
    </div>
  );
}
