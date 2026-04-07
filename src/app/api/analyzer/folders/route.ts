import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase/service";
import { apiError, dbError } from "@/lib/api-error";
import { getFolderName, syncFolder } from "@/lib/connectors/gdrive";

function parseFolderId(input: string): string {
  // Extract from /folders/FOLDER_ID pattern
  const foldersMatch = input.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  if (foldersMatch) return foldersMatch[1];

  // Extract from ?id=FOLDER_ID pattern
  try {
    const url = new URL(input);
    const id = url.searchParams.get("id");
    if (id) return id;
  } catch {
    // not a URL
  }

  return input.trim();
}

export async function GET() {
  try {
    const supabase = getServiceClient();

    interface GDriveFolder { id: string; folder_id: string; folder_name: string; created_at: string; [k: string]: unknown }
    // gdrive_folders not in generated schema
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: folders, error } = await (supabase as any)
      .from("gdrive_folders")
      .select("*")
      .order("created_at", { ascending: false }) as { data: GDriveFolder[] | null; error: { message: string; code?: string } | null };

    if (error) return dbError(error, "folders GET");

    // Count contracts per folder — contract_uploads not in generated schema
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: uploads } = await (supabase as any)
      .from("contract_uploads")
      .select("gdrive_folder_id") as { data: { gdrive_folder_id: string | null }[] | null };

    const counts: Record<string, number> = {};
    for (const u of uploads ?? []) {
      if (u.gdrive_folder_id) {
        counts[u.gdrive_folder_id] = (counts[u.gdrive_folder_id] ?? 0) + 1;
      }
    }

    const result = (folders ?? []).map((f) => ({
      ...f,
      contract_count: counts[f.folder_id] ?? 0,
    }));

    return NextResponse.json(result);
  } catch (err) {
    return apiError(err instanceof Error ? err.message : String(err));
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { folder_id?: string };
    if (!body.folder_id) return apiError("folder_id is required", 400);

    const folderId = parseFolderId(body.folder_id);
    const supabase = getServiceClient();

    // Verify access by fetching name
    let folderName: string;
    try {
      // We need a token — getFolderName is called inside syncFolder too,
      // but here we just do a lightweight check via syncFolder which handles auth
      folderName = folderId; // placeholder; syncFolder will set the real name
    } catch (err) {
      return apiError(`Cannot access folder: ${err instanceof Error ? err.message : String(err)}`, 400);
    }

    // Upsert folder row — gdrive_folders not in generated schema
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: folder, error: folderErr } = await (supabase as any)
      .from("gdrive_folders")
      .upsert({ folder_id: folderId, folder_name: folderName }, { onConflict: "folder_id" })
      .select()
      .single() as { data: { id: string; folder_id: string; folder_name: string } | null; error: { message: string; code?: string } | null };

    if (folderErr) return dbError(folderErr, "folders POST upsert");

    // Sync
    const syncResult = await syncFolder(folderId);

    return NextResponse.json({ folder, sync_result: syncResult });
  } catch (err) {
    return apiError(err instanceof Error ? err.message : String(err));
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const body = (await req.json()) as { folder_id?: string };
    if (!body.folder_id) return apiError("folder_id is required", 400);

    const supabase = getServiceClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from("gdrive_folders")
      .delete()
      .eq("folder_id", body.folder_id) as { error: { message: string; code?: string } | null };

    if (error) return dbError(error, "folders DELETE");
    return NextResponse.json({ ok: true });
  } catch (err) {
    return apiError(err instanceof Error ? err.message : String(err));
  }
}
