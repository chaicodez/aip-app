"use client";

const DOT_COLORS = [
  "bg-blue-500",
  "bg-green-500",
  "bg-orange-500",
  "bg-purple-500",
  "bg-teal-500",
  "bg-red-500",
];

function fmtAcv(n: number | null) {
  if (!n) return "—";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n}`;
}

function fmtSyncTime(ts: string | null) {
  if (!ts) return "Never synced";
  const d = new Date(ts);
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

interface Contract {
  id: string;
  customer_name: string | null;
  file_name: string;
  acv: number | null;
  industry: string | null;
  contract_variables: { id: string; category: string }[];
}

interface Folder {
  id: string;
  folder_id: string;
  folder_name: string | null;
  last_synced_at: string | null;
}

interface ContractSidebarProps {
  contracts: Contract[];
  folders: Folder[];
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
  searchQuery: string;
  activeFilters: string[];
  onAddFolder: () => void;
  onSync: (folderId: string) => void;
}

export default function ContractSidebar({
  contracts,
  folders,
  selectedIds,
  onToggle,
  searchQuery,
  activeFilters,
  onAddFolder,
  onSync,
}: ContractSidebarProps) {
  const filtered = contracts.filter((c) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const name = (c.customer_name ?? c.file_name).toLowerCase();
      const ind = (c.industry ?? "").toLowerCase();
      if (!name.includes(q) && !ind.includes(q)) return false;
    }
    if (activeFilters.includes("ACV > $100K") && (c.acv ?? 0) <= 100_000) return false;
    return true;
  });

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-900">
            Client Contracts{" "}
            <span className="text-gray-400 font-normal">({contracts.length})</span>
          </h2>
        </div>
        <button
          onClick={onAddFolder}
          className="w-full border border-gray-300 rounded-md py-1.5 text-sm text-gray-600 hover:bg-gray-50 hover:border-gray-400 transition-colors"
        >
          + Add Drive Folder
        </button>
      </div>

      <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
        {filtered.length === 0 ? (
          <div className="p-6 text-center text-sm text-gray-400">
            {contracts.length === 0
              ? "No contracts yet. Add a Google Drive folder to begin."
              : "No contracts match your search."}
          </div>
        ) : (
          filtered.map((c, i) => {
            const label = c.customer_name ?? c.file_name;
            const checked = selectedIds.has(c.id);
            const moduleCount = new Set(c.contract_variables.map((v) => v.category)).size;
            return (
              <div
                key={c.id}
                className={`flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 ${
                  checked ? "bg-gray-50" : ""
                }`}
                onClick={() => onToggle(c.id)}
              >
                <span
                  className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${
                    DOT_COLORS[i % DOT_COLORS.length]
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-sm truncate ${
                      checked ? "font-semibold text-gray-900" : "text-gray-800"
                    }`}
                  >
                    {label}
                  </p>
                  <p className="text-xs text-gray-400 truncate">
                    {fmtAcv(c.acv)}
                    {c.industry ? ` · ${c.industry}` : ""}
                    {moduleCount > 0 ? ` · ${moduleCount} vars` : ""}
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => onToggle(c.id)}
                  onClick={(e) => e.stopPropagation()}
                  className="mt-1 h-4 w-4 rounded border-gray-300 text-gray-900 cursor-pointer"
                />
              </div>
            );
          })
        )}
      </div>

      {folders.length > 0 && (
        <div className="border-t border-gray-200 p-4 space-y-2">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Connected Folders</p>
          {folders.map((f) => (
            <div key={f.id} className="flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-xs font-medium text-gray-700 truncate">
                  {f.folder_name ?? f.folder_id}
                </p>
                <p className="text-xs text-gray-400">{fmtSyncTime(f.last_synced_at)}</p>
              </div>
              <button
                onClick={() => onSync(f.id)}
                className="ml-2 text-xs text-blue-600 hover:text-blue-800 font-medium flex-shrink-0"
              >
                Sync
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
