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

    const { data: folder, error } = await supabase
      .from("gdrive_folders")
      .select("folder_id")
      .eq("id", id)
      .single();

    if (error) return dbError(error, "sync GET folder");
    if (!folder) return apiError("Folder not found", 404);

    const syncResult = await syncFolder(folder.folder_id);
    return NextResponse.json(syncResult);
  } catch (err) {
    return apiError(err instanceof Error ? err.message : String(err));
  }
}
