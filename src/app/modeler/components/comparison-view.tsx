"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { fmtD, fmtTick, fmt, COLORS, type SavedScenario } from "@/app/modeler/types";

export function ComparisonView({
  savedScenarios, onBack, onClear,
}: {
  savedScenarios: SavedScenario[];
  onBack: () => void;
  onClear: () => void;
}) {
  const comparisonData = savedScenarios.map((s) => ({
    name: s.name,
    ARR: Math.round(s.arr),
    TCV: Math.round(s.tcv),
  }));

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-5">
        <button onClick={onBack} className="text-sm border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-100 text-gray-600">← Builder</button>
        <span className="font-medium text-gray-900">Scenario comparison</span>
      </div>

      {savedScenarios.length === 0 ? (
        <div className="bg-gray-50 rounded-xl p-10 text-center text-sm text-gray-400">No saved scenarios yet.</div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
            {savedScenarios.map((s) => (
              <div key={s.localId} className="bg-white border border-gray-200 rounded-xl p-3.5">
                <p className="text-xs font-medium text-gray-900 mb-1 truncate">{s.name}</p>
                <span className="inline-block bg-purple-50 text-purple-700 text-xs px-1.5 py-0.5 rounded font-medium mb-2">{s.modelLabel}</span>
                <div className="space-y-1.5 mt-2">
                  {([["ARR", fmtD(s.arr), true], ["TCV", fmtD(s.tcv), false], ["Employees", s.employees.toLocaleString(), false], ["Term", `${s.term}mo`, false], ["Impl", fmt(s.implFee), false]] as [string, string, boolean][]).map(([k, v, bold]) => (
                    <div key={k} className="flex justify-between text-xs">
                      <span className="text-gray-400">{k}</span>
                      <span className={bold ? "font-semibold text-purple-700" : "font-medium text-gray-900"}>{v}</span>
                    </div>
                  ))}
                </div>
                <div className="flex flex-wrap gap-1 mt-2">
                  {s.modules.map((m) => (
                    <span key={m} className="bg-gray-100 text-gray-500 text-xs px-1.5 py-0.5 rounded">{m}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4">
            <p className="text-xs font-medium text-gray-900 mb-3">ARR and TCV across scenarios</p>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={comparisonData} margin={{ top: 4, right: 16, bottom: 4, left: 8 }}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tickFormatter={fmtTick} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={56} />
                <Tooltip formatter={(v) => [typeof v === "number" ? fmtD(v) : "$0"]} contentStyle={{ fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="ARR" fill={COLORS.arr} radius={[3, 3, 0, 0]} />
                <Bar dataKey="TCV" fill={COLORS.tcv} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}

      <button onClick={onClear} className="text-xs text-red-500 hover:text-red-700 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50">Clear all</button>
    </div>
  );
}
