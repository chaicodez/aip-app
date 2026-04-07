import Link from "next/link";
import { getServiceClient } from "@/lib/supabase/service";
import { IntegrationList } from "./components/integration-list";
import { AvailableIntegrations } from "./components/available-integrations";
import type { ExtendedVendor } from "./components/settings-types";

export const revalidate = 60;

export default async function SettingsPage() {
  const supabase = getServiceClient();
  const { data } = await supabase.from("vendors").select("*").order("name");
  const vendors = (data ?? []) as ExtendedVendor[];

  return (
    <div className="p-6" style={{ background: "var(--bg-primary)", minHeight: "100vh" }}>
      <div className="max-w-4xl mx-auto space-y-4">
        {/* Page header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>
              iPaaS Control Panel
            </h1>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
              Manage integrations, credentials, and sync configuration
            </p>
          </div>
          <Link
            href="/settings/admin"
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl transition-all hover:bg-[var(--fill-primary)]"
            style={{ color: "var(--text-secondary)", border: "1px solid var(--separator)" }}
          >
            <span>⚙</span> Admin console
          </Link>
        </div>

        {/* Integration list (client component — handles panel + sync) */}
        <IntegrationList vendors={vendors} />

        {/* Available / coming soon */}
        <AvailableIntegrations />
      </div>
    </div>
  );
}
