"use client";

import { fmtD, type SavedQuote } from "@/app/cpq/types";
import { StatusBadge } from "@/app/cpq/components/ui";

export function SavedQuotes({ quotes }: { quotes: SavedQuote[] }) {
  if (quotes.length === 0) {
    return (
      <div className="bg-gray-50 rounded-xl p-10 text-center text-sm text-gray-400">
        No saved quotes yet. Build a quote and click Save.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {quotes.map((q) => (
        <div key={q.id} className="bg-white border border-gray-200 rounded-xl p-3.5">
          <div className="flex justify-between items-start mb-1.5">
            <span className="text-xs font-semibold text-gray-900 truncate mr-2">{q.customer_name}</span>
            <StatusBadge status={q.status} />
          </div>
          <p className="text-lg font-bold text-purple-700 mb-2">{fmtD(q.arr)}</p>
          <div className="space-y-1">
            {([["TCV", fmtD(q.tcv)], ["Term", `${q.term_months}mo`], ["Employees", q.employees.toLocaleString()], ["Max disc", `${q.max_discount_pct}%`], ["Date", q.quote_date]] as [string, string][]).map(([k, v]) => (
              <div key={k} className="flex justify-between text-xs">
                <span className="text-gray-400">{k}</span>
                <span className="font-medium text-gray-800">{v}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
