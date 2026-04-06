import Link from "next/link";
import { SyncButton } from "./sync-button";

interface Vendor {
  id: string;
  name: string;
  type: string;
  status: "healthy" | "warning" | "idle";
  last_sync_at: string | null;
  record_count: number;
  error_count: number;
  auth_method: string;
  icon: string | null;
}

function relativeTime(iso: string | null): string {
  if (!iso) return "Never";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1)  return "Just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function StatusDot({ status }: { status: Vendor["status"] }) {
  const cls = status === "healthy" ? "bg-green-500"
            : status === "warning" ? "bg-amber-400"
            : "bg-gray-300";
  return <span className={`inline-block w-2 h-2 rounded-full ${cls}`} />;
}

function VendorIcon({ icon, name }: { icon: string | null; name: string }) {
  return (
    <div className="w-10 h-10 rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center text-xs font-bold text-gray-600 shrink-0">
      {icon ?? name.slice(0, 2).toUpperCase()}
    </div>
  );
}

const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export default async function SettingsPage() {
  const res = await fetch(`${baseUrl}/api/vendors`, { cache: "no-store" });
  const vendors: Vendor[] = res.ok ? await res.json() : [];

  const all = vendors;
  const healthy = all.filter((v) => v.status === "healthy").length;
  const warnings = all.filter((v) => v.status === "warning").length;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-base font-semibold text-gray-900">Data Sources</h1>
          <p className="text-xs text-gray-400 mt-0.5">
            {healthy} healthy · {warnings} warning · {all.length} total integrations
          </p>
        </div>
        {/* Admin link — visible in dev; production would gate on role */}
        <Link
          href="/settings/admin"
          className="flex items-center gap-1.5 text-xs text-gray-500 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <span>⚙</span> Admin console
        </Link>
      </div>

      {/* Vendor cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {all.map((vendor) => {
          const isJira = vendor.id === "jira";
          const isConnected = vendor.status !== "idle";

          return (
            <div
              key={vendor.id}
              className="bg-white border border-gray-200 rounded-xl p-4"
            >
              <div className="flex items-start gap-3">
                <VendorIcon icon={vendor.icon} name={vendor.name} />

                <div className="flex-1 min-w-0">
                  {/* Name + status */}
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm font-semibold text-gray-900">{vendor.name}</span>
                    <StatusDot status={vendor.status} />
                    <span className="text-xs text-gray-400 capitalize">{vendor.status}</span>
                    {vendor.error_count > 0 && (
                      <span className="ml-auto inline-flex items-center gap-1 bg-red-100 text-red-700 text-xs font-medium px-1.5 py-0.5 rounded-md">
                        {vendor.error_count} error{vendor.error_count !== 1 ? "s" : ""}
                      </span>
                    )}
                  </div>

                  {/* Type */}
                  <p className="text-xs text-gray-400 mb-2">{vendor.type}</p>

                  {isJira && !isConnected ? (
                    /* Jira not connected */
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-400">Not connected</span>
                      <div>
                        <button
                          disabled
                          title="OAuth setup required — configure credentials in Admin Console first"
                          className="px-3 py-1.5 text-sm rounded-md bg-gray-100 text-gray-400 cursor-not-allowed"
                        >
                          Connect
                        </button>
                        <p className="text-xs text-gray-400 mt-1">OAuth setup required — see Admin Console</p>
                      </div>
                    </div>
                  ) : (
                    /* Connected vendor stats + sync button */
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex gap-4 text-xs text-gray-500">
                        <span>
                          <span className="font-medium text-gray-700">{vendor.record_count.toLocaleString()}</span> records
                        </span>
                        <span>Last sync: {relativeTime(vendor.last_sync_at)}</span>
                      </div>
                      <SyncButton vendorId={vendor.id} />
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer note */}
      <p className="text-xs text-gray-400 mt-6 text-center">
        Sync schedules and field mappings are managed in the{" "}
        <Link href="/settings/admin" className="text-gray-600 underline underline-offset-2">
          Admin console
        </Link>
        .
      </p>
    </div>
  );
}
