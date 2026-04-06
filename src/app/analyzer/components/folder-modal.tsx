"use client";

import { useState } from "react";

function parseFolderIdFromInput(input: string): string {
  const foldersMatch = input.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  if (foldersMatch) return foldersMatch[1];
  try {
    const url = new URL(input);
    const id = url.searchParams.get("id");
    if (id) return id;
  } catch {
    // not a URL
  }
  return input.trim();
}

interface FolderModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function FolderModal({ onClose, onSuccess }: FolderModalProps) {
  const [input, setInput] = useState("");
  const [folderId, setFolderId] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  function handleInputChange(val: string) {
    setInput(val);
    setFolderId(parseFolderIdFromInput(val));
  }

  async function handleSubmit() {
    if (!folderId) return;
    setStatus("loading");
    setMessage("Scanning...");

    try {
      const res = await fetch("/api/analyzer/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folder_id: folderId }),
      });

      const data = (await res.json()) as {
        sync_result?: { total: number; new: number; skipped: number; failed: number };
        error?: string;
      };

      if (!res.ok) {
        setStatus("error");
        setMessage(data.error ?? "Unknown error");
        return;
      }

      const sr = data.sync_result;
      setStatus("success");
      setMessage(
        `Done! Found ${sr?.total ?? 0} files · ${sr?.new ?? 0} extracted · ${sr?.skipped ?? 0} skipped · ${sr?.failed ?? 0} failed`
      );
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 2000);
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Network error");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
        <h2 className="text-base font-semibold text-gray-900 mb-1">
          Connect Google Drive Folder
        </h2>
        <p className="text-xs text-gray-500 mb-4">
          Paste a Google Drive folder URL or ID. Make sure the folder is shared with your service
          account.
        </p>

        <label className="block text-xs font-medium text-gray-700 mb-1">
          Folder URL or ID
        </label>
        <input
          type="text"
          value={input}
          onChange={(e) => handleInputChange(e.target.value)}
          placeholder="https://drive.google.com/drive/folders/... or folder ID"
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 mb-1"
        />
        {folderId && folderId !== input && (
          <p className="text-xs text-gray-400 mb-4">Parsed ID: {folderId}</p>
        )}

        {status === "error" && (
          <p className="text-xs text-red-600 mt-2 mb-2">{message}</p>
        )}
        {status === "success" && (
          <p className="text-xs text-green-600 mt-2 mb-2">{message}</p>
        )}
        {status === "loading" && (
          <p className="text-xs text-gray-500 mt-2 mb-2 animate-pulse">{message}</p>
        )}

        <div className="flex gap-2 mt-4">
          <button
            onClick={onClose}
            disabled={status === "loading"}
            className="flex-1 border border-gray-300 rounded-md py-2 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!folderId || status === "loading" || status === "success"}
            className="flex-1 bg-gray-900 text-white rounded-md py-2 text-sm hover:bg-gray-700 disabled:opacity-50"
          >
            {status === "loading" ? "Syncing..." : "Connect & Sync"}
          </button>
        </div>
      </div>
    </div>
  );
}
