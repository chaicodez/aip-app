"use client";

const CATEGORY_ICONS: Record<string, string> = {
  COMMERCIAL: "💰",
  TERM: "📅",
  PAYMENT: "💳",
  MODULES: "📦",
  LEGAL: "⚖️",
  PERFORMANCE: "🚀",
};

const DOT_COLORS = [
  "bg-blue-500", "bg-green-500", "bg-orange-500",
  "bg-purple-500", "bg-teal-500", "bg-red-500",
];

function fmtAcv(n: number | null) {
  if (!n) return "—";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n}`;
}

interface Variable {
  id: string;
  category: string;
  variable_name: string;
  variable_value: string | null;
  numeric_value: number | null;
  unit: string | null;
  confidence: string | null;
}

interface Contract {
  id: string;
  customer_name: string | null;
  file_name: string;
  acv: number | null;
  industry: string | null;
  contract_variables: Variable[];
}

interface ComparisonTableProps {
  contracts: Contract[];
  selectedIds: Set<string>;
  onReset: () => void;
  commonOnly: boolean;
  onCommonOnly: (v: boolean) => void;
  highlightOutliers: boolean;
  onHighlightOutliers: (v: boolean) => void;
}

export default function ComparisonTable({
  contracts,
  selectedIds,
  onReset,
  commonOnly,
  onCommonOnly,
  highlightOutliers,
  onHighlightOutliers,
}: ComparisonTableProps) {
  const selected = contracts.filter((c) => selectedIds.has(c.id));
  if (selected.length < 2) return null;

  // Build variable map: category -> variable_name -> contractId -> variable
  const categories = new Map<string, Map<string, Map<string, Variable>>>();
  for (const c of selected) {
    for (const v of c.contract_variables) {
      if (!categories.has(v.category)) categories.set(v.category, new Map());
      const catMap = categories.get(v.category)!;
      if (!catMap.has(v.variable_name)) catMap.set(v.variable_name, new Map());
      catMap.get(v.variable_name)!.set(c.id, v);
    }
  }

  function exportCsv() {
    const rows: string[][] = [["Category", "Variable", ...selected.map((c) => c.customer_name ?? c.file_name)]];
    categories.forEach((varMap, cat) => {
      varMap.forEach((contractMap, varName) => {
        rows.push([cat, varName, ...selected.map((c) => contractMap.get(c.id)?.variable_value ?? "—")]);
      });
    });
    const csv = rows.map((r) => r.map((cell) => `"${cell}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "contract-comparison.csv";
    a.click();
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-amber-50">
        <span className="text-sm font-medium text-amber-800">
          Comparing {selected.length} contracts
        </span>
        <div className="flex items-center gap-2">
          <button className="text-xs text-gray-600 hover:text-gray-900 px-2 py-1 rounded border border-gray-300">
            Edit
          </button>
          <button className="text-xs text-white bg-gray-900 px-3 py-1 rounded hover:bg-gray-700">
            Compare ({selected.length})
          </button>
          <button onClick={onReset} className="text-xs text-gray-600 hover:text-gray-900 px-2 py-1 rounded border border-gray-300">
            Reset
          </button>
          <button onClick={exportCsv} className="text-xs text-gray-600 hover:text-gray-900 px-2 py-1 rounded border border-gray-300">
            CSV
          </button>
        </div>
      </div>

      {/* Toggles */}
      <div className="flex gap-4 px-4 py-2 border-b border-gray-100 text-xs text-gray-500">
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input type="checkbox" checked={commonOnly} onChange={(e) => onCommonOnly(e.target.checked)} className="rounded" />
          Common variables only
        </label>
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input type="checkbox" checked={highlightOutliers} onChange={(e) => onHighlightOutliers(e.target.checked)} className="rounded" />
          Highlight outliers
        </label>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="sticky left-0 bg-gray-50 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide w-48">
                Variable
              </th>
              {selected.map((c, i) => (
                <th key={c.id} className="px-4 py-3 text-left min-w-40">
                  <div className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${DOT_COLORS[i % DOT_COLORS.length]}`} />
                    <span className="text-xs font-semibold text-gray-900 truncate">
                      {c.customer_name ?? c.file_name}
                    </span>
                  </div>
                  <div className="text-xs text-gray-400 pl-3.5 mt-0.5">
                    {fmtAcv(c.acv)}{c.industry ? ` · ${c.industry}` : ""}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {Array.from(categories.entries()).map(([cat, varMap]) => {
              const rows = Array.from(varMap.entries()).filter(([, contractMap]) => {
                if (!commonOnly) return true;
                const count = selected.filter((c) => contractMap.has(c.id)).length;
                return count >= 2;
              });
              if (rows.length === 0) return null;

              return [
                <tr key={`cat-${cat}`}>
                  <td
                    colSpan={selected.length + 1}
                    className="sticky left-0 px-4 py-2 bg-amber-50 text-xs font-medium text-amber-800"
                  >
                    {CATEGORY_ICONS[cat] ?? "•"} {cat}
                  </td>
                </tr>,
                ...rows.map(([varName, contractMap]) => {
                  const numericValues = selected
                    .map((c) => contractMap.get(c.id)?.numeric_value)
                    .filter((v): v is number => v !== null && v !== undefined);
                  const maxVal = numericValues.length > 0 ? Math.max(...numericValues) : null;
                  const minVal = numericValues.length > 0 ? Math.min(...numericValues) : null;

                  return (
                    <tr key={`${cat}-${varName}`} className="hover:bg-gray-50">
                      <td className="sticky left-0 bg-white px-4 py-2.5 text-xs text-gray-600 font-medium truncate max-w-48">
                        {varName}
                      </td>
                      {selected.map((c) => {
                        const v = contractMap.get(c.id);
                        if (!v) {
                          return (
                            <td key={c.id} className="px-4 py-2.5 text-xs text-gray-300">—</td>
                          );
                        }
                        const conf = v.confidence ?? "medium";
                        const borderClass =
                          conf === "high" ? "border-l-2 border-green-400" :
                          conf === "low" ? "border-l-2 border-red-400" :
                          "border-l-2 border-amber-400";

                        let textClass = "text-gray-700";
                        if (highlightOutliers && v.numeric_value !== null && maxVal !== null && minVal !== null && maxVal !== minVal) {
                          if (v.numeric_value === maxVal) textClass = "text-green-600 font-medium";
                          else if (v.numeric_value === minVal) textClass = "text-red-600 font-medium";
                          else textClass = "text-gray-500";
                        }

                        const indicator =
                          highlightOutliers && v.numeric_value !== null && maxVal !== null && minVal !== null && maxVal !== minVal
                            ? v.numeric_value === maxVal ? " ▲" : v.numeric_value === minVal ? " ▼" : ""
                            : "";

                        return (
                          <td key={c.id} className={`px-4 py-2.5 text-xs ${borderClass} pl-3`}>
                            <span className={textClass}>
                              {v.variable_value ?? "—"}{indicator}
                            </span>
                          </td>
                        );
                      })}
                    </tr>
                  );
                }),
              ];
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
