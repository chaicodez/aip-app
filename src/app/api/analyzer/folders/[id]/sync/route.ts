import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase/service";
import { apiError, dbError } from "@/lib/api-error";
import { syncFolder } from "@/lib/connectors/gdrive";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = getServiceClient();

    // gdrive_folders is not in the generated Supabase schema — cast to access untyped table
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: folder, error: folderErr } = await (supabase as any)
      .from("gdrive_folders")
      .select("folder_id")
      .eq("id", id)
      .single() as { data: { folder_id: string } | null; error: { message: string; code?: string } | null };

    if (folderErr) return dbError(folderErr, "sync GET folder");
    if (!folder?.folder_id) return apiError("Folder not found", 404);

    const syncResult = await syncFolder(folder.folder_id);
    return NextResponse.json(syncResult);
  } catch (err) {
    return apiError(err instanceof Error ? err.message : String(err));
  }
}
