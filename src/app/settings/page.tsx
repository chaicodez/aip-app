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
  const bg =
    status === "healthy" ? "#34C759"
    : status === "warning" ? "#FF9500"
    : "rgba(60,60,67,0.3)";
  return (
    <span
      className="inline-block w-2 h-2 rounded-full shrink-0"
      style={{ background: bg }}
    />
  );
}

function VendorIcon({ icon, name }: { icon: string | null; name: string }) {
  return (
    <div
      className="w-11 h-11 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
      style={{ background: "var(--fill-primary)", color: "var(--text-primary)" }}
    >
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
    <div className="p-6 max-w-4xl mx-auto" style={{ background: "var(--bg-primary)" }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>
            Data Sources
          </h1>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
            {healthy} healthy · {warnings} warning · {all.length} total integrations
          </p>
        </div>
        {/* Admin link — visible in dev; production would gate on role */}
        <Link
          href="/settings/admin"
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl transition-all"
          style={{ color: "var(--text-secondary)", border: "1px solid var(--separator)" }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLAnchorElement).style.background = "var(--fill-primary)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLAnchorElement).style.background = "";
          }}
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
              className="bg-white rounded-2xl p-4 transition-all card-hover"
              style={{ border: "1px solid var(--separator)", boxShadow: "var(--shadow-sm)" }}
            >
              <div className="flex items-start gap-3">
                <VendorIcon icon={vendor.icon} name={vendor.name} />

                <div className="flex-1 min-w-0">
                  {/* Name + status */}
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                      {vendor.name}
                    </span>
                    <StatusDot status={vendor.status} />
                    <span className="capitalize" style={{ color: "var(--text-secondary)", fontSize: "12px" }}>
                      {vendor.status}
                    </span>
                    {vendor.error_count > 0 && (
                      <span
                        className="ml-auto inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full"
                        style={{ background: "rgba(255,59,48,0.1)", color: "#FF3B30" }}
                      >
                        {vendor.error_count} error{vendor.error_count !== 1 ? "s" : ""}
                      </span>
                    )}
                  </div>

                  {/* Type */}
                  <p className="text-xs mt-0.5 mb-2" style={{ color: "var(--text-secondary)" }}>
                    {vendor.type}
                  </p>

                  {isJira && !isConnected ? (
                    /* Jira not connected */
                    <div className="flex items-center justify-between">
                      <span style={{ color: "var(--text-secondary)", fontSize: "12px" }}>Not connected</span>
                      <div>
                        <button
                          disabled
                          title="OAuth setup required — configure credentials in Admin Console first"
                          className="px-3 py-1.5 text-sm rounded-xl cursor-not-allowed"
                          style={{ background: "var(--fill-primary)", color: "var(--text-secondary)" }}
                        >
                          Connect
                        </button>
                        <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
                          OAuth setup required — see Admin Console
                        </p>
                      </div>
                    </div>
                  ) : (
                    /* Connected vendor stats + sync button */
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex gap-4 text-xs">
                        <span style={{ color: "var(--text-secondary)", fontSize: "12px" }}>
                          <span className="font-medium" style={{ color: "var(--text-primary)" }}>
                            {vendor.record_count.toLocaleString()}
                          </span>{" "}
                          records
                        </span>
                        <span style={{ color: "var(--text-secondary)", fontSize: "12px" }}>
                          Last sync: {relativeTime(vendor.last_sync_at)}
                        </span>
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
      <p className="text-xs mt-6 text-center" style={{ color: "var(--text-secondary)" }}>
        Sync schedules and field mappings are managed in the{" "}
        <Link
          href="/settings/admin"
          className="underline underline-offset-2"
          style={{ color: "var(--text-primary)" }}
        >
          Admin console
        </Link>
        .
      </p>
    </div>
  );
}
