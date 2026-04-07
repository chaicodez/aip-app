import type { Vendor, IntegrationError, Credential } from "@/lib/types";

export interface ObjectQuery {
  id: string;
  vendor_id: string;
  object_name: string;
  query: string;
  enabled: boolean;
  last_synced_at: string | null;
  record_count: number;
  created_at: string;
}

export interface SyncJob {
  id: string;
  vendor_id: string;
  status: "running" | "success" | "failed";
  created_at: string;
  finished_at: string | null;
  records_processed: number | null;
  records_upserted: number | null;
  error_message: string | null;
}

export interface ExtendedVendor extends Vendor {
  config: Record<string, string>;
  auth_type: string;
}

export interface VendorConfigData {
  vendor: ExtendedVendor;
  credentials: Credential[];
  object_queries: ObjectQuery[];
  sync_jobs: SyncJob[];
  errors: IntegrationError[];
}

export function relativeTime(iso: string | null): string {
  if (!iso) return "Never";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function statusColor(status: string): string {
  if (status === "healthy" || status === "success") return "#34C759";
  if (status === "warning" || status === "retrying" || status === "running") return "#FF9500";
  if (status === "idle") return "rgba(60,60,67,0.3)";
  return "#FF3B30"; // failed, open, error
}
