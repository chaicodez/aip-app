import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { getServiceClient } from "@/lib/supabase/service";
import { apiError, dbError } from "@/lib/api-error";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = getServiceClient();

  // Jira: real connector
  if (id === "jira") {
    const now = new Date().toISOString();

    // Open a top-level sync_jobs row so callers can track the trigger
    const { data: job } = await supabase
      .from("sync_jobs")
      .insert({ vendor_id: "jira", status: "running" })
      .select()
      .single();

    try {
      const { syncJiraAll } = await import("@/lib/connectors/jira");
      const result = await syncJiraAll();

      if (job?.id) {
        await supabase
          .from("sync_jobs")
          .update({
            finished_at:       now,
            status:            "success",
            records_processed: result.total,
            records_upserted:  result.upserted,
          })
          .eq("id", job.id);
      }

      revalidateTag("vendor-health", {});
      return NextResponse.json({ ok: true, ...result });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);

      if (job?.id) {
        await supabase
          .from("sync_jobs")
          .update({ finished_at: now, status: "failed", error_message: msg })
          .eq("id", job.id);
      } else {
        await supabase.from("sync_jobs").insert({
          vendor_id: "jira", status: "failed",
          finished_at: now, error_message: msg,
        });
      }

      return apiError(msg, 500);
    }
  }

  // Other vendors: stub sync (no real credentials in dev)
  // TODO: implement sf (Salesforce) connector
  // TODO: implement ns (NetSuite) connector
  // TODO: implement gw (Google Workspace) connector
  try {
    const now = new Date().toISOString();

    const { data: vendor, error: vendorErr } = await supabase
      .from("vendors")
      .select("record_count")
      .eq("id", id)
      .single();
    if (vendorErr) return dbError(vendorErr, `vendors/${id}/sync vendor fetch`);

    const newCount = (vendor?.record_count ?? 0) + Math.floor(Math.random() * 5);

    const { data: job, error: jobErr } = await supabase
      .from("sync_jobs")
      .insert({ vendor_id: id, status: "running" })
      .select()
      .single();
    if (jobErr) return dbError(jobErr, `vendors/${id}/sync job insert`);

    const { error: updateErr } = await supabase
      .from("vendors")
      .update({ last_sync_at: now, record_count: newCount, status: "healthy", error_count: 0 })
      .eq("id", id);
    if (updateErr) return dbError(updateErr, `vendors/${id}/sync vendor update`);
    revalidateTag("vendor-health", {});

    if (job?.id) {
      const { error: jobUpdateErr } = await supabase
        .from("sync_jobs")
        .update({
          finished_at: now, status: "success",
          records_processed: newCount, records_upserted: Math.floor(Math.random() * 10) + 1,
        })
        .eq("id", job.id);
      if (jobUpdateErr) return dbError(jobUpdateErr, `vendors/${id}/sync job update`);
    }

    return NextResponse.json({ ok: true, vendor_id: id, synced_at: now });
  } catch (err) {
    return apiError(err instanceof Error ? err.message : String(err));
  }
}
