"use client";

import { useEffect, useState, useCallback } from "react";
import QueryBar from "./components/query-bar";
import ContractSidebar from "./components/contract-sidebar";
import ComparisonTable from "./components/comparison-table";
import LeakagePanel from "./components/leakage-panel";
import FolderModal from "./components/folder-modal";

interface Variable {
  id: string;
  category: string;
  variable_name: string;
  variable_value: string | null;
  numeric_value: number | null;
  unit: string | null;
  confidence: string | null;
  page_reference: string | null;
}

interface Contract {
  id: string;
  customer_name: string | null;
  file_name: string;
  acv: number | null;
  industry: string | null;
  status: string;
  contract_variables: Variable[];
}

interface Folder {
  id: string;
  folder_id: string;
  folder_name: string | null;
  last_synced_at: string | null;
  contract_count: number;
}

export default function AnalyzerPage() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [commonOnly, setCommonOnly] = useState(false);
  const [highlightOutliers, setHighlightOutliers] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    const [contractsRes, foldersRes] = await Promise.all([
      fetch("/api/analyzer/contracts"),
      fetch("/api/analyzer/folders"),
    ]);
    if (contractsRes.ok) setContracts(await contractsRes.json());
    if (foldersRes.ok) setFolders(await foldersRes.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  function toggleSelected(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleSync(folderId: string) {
    await fetch(`/api/analyzer/folders/${folderId}/sync`, { method: "POST" });
    fetchData();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-sm" style={{ color: "var(--text-secondary)" }}>
        Loading contracts...
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-53px)] overflow-hidden" style={{ background: "var(--bg-primary)" }}>
      {/* Sidebar */}
      <aside className="w-72 flex-shrink-0 flex flex-col overflow-hidden" style={{ background: "#fff", borderRight: "1px solid var(--separator)" }}>
        <ContractSidebar
          contracts={contracts}
          folders={folders}
          selectedIds={selectedIds}
          onToggle={toggleSelected}
          searchQuery={searchQuery}
          activeFilters={activeFilters}
          onAddFolder={() => setShowModal(true)}
          onSync={handleSync}
        />
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto p-6 space-y-5">
        <QueryBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          activeFilters={activeFilters}
          onFiltersChange={setActiveFilters}
        />

        {selectedIds.size < 2 ? (
          <div className="text-center py-20 text-sm" style={{ color: "var(--text-secondary)" }}>
            <p className="text-2xl mb-3">📋</p>
            <p className="font-medium mb-1" style={{ color: "var(--text-primary)" }}>Select contracts to compare</p>
            <p>Choose 2 or more contracts from the sidebar to begin analysis.</p>
          </div>
        ) : (
          <>
            <ComparisonTable
              contracts={contracts}
              selectedIds={selectedIds}
              onReset={() => setSelectedIds(new Set())}
              commonOnly={commonOnly}
              onCommonOnly={setCommonOnly}
              highlightOutliers={highlightOutliers}
              onHighlightOutliers={setHighlightOutliers}
            />
            <LeakagePanel contracts={contracts} selectedIds={selectedIds} />
          </>
        )}
      </main>

      {showModal && (
        <FolderModal onClose={() => setShowModal(false)} onSuccess={fetchData} />
      )}
    </div>
  );
}
