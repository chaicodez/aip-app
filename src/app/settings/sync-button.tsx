"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function SyncButton({ vendorId }: { vendorId: string }) {
  const [loading, setLoading] = useState(false);
  const [done, setDone]       = useState(false);
  const router = useRouter();

  const handleSync = async () => {
    setLoading(true);
    setDone(false);
    try {
      await fetch(`/api/vendors/${vendorId}/sync`, { method: "POST" });
      setDone(true);
      router.refresh(); // re-fetch server component data
    } finally {
      setLoading(false);
      setTimeout(() => setDone(false), 3000);
    }
  };

  return (
    <button
      onClick={handleSync}
      disabled={loading}
      className={`text-xs px-3 py-1.5 rounded-lg border transition-colors shrink-0 ${
        done
          ? "border-green-200 bg-green-50 text-green-700"
          : "border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
      }`}
    >
      {loading ? "Syncing…" : done ? "Synced ✓" : "Sync now"}
    </button>
  );
}
