"use client";

import { fmtD, type SavedQuote } from "@/app/cpq/types";
import { StatusBadge } from "@/app/cpq/components/ui";

export function Approvals({
  quotes, onStatusChange,
}: {
  quotes: SavedQuote[];
  onStatusChange: (id: string, status: "approved" | "rejected") => void;
}) {
  const pending = quotes.filter((q) => q.status === "pending");

  if (pending.length === 0) {
    return (
      <div className="bg-gray-50 rounded-xl p-10 text-center text-sm text-gray-400">
        No pending approvals. Quotes exceeding discount thresholds will appear here.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {pending.map((q) => {
        const approver = q.quote_approvals?.[0]?.required_approver ?? "Sales Manager";
        return (
          <div key={q.id} className="bg-white border border-gray-200 rounded-xl p-4" style={{ borderLeft: "3px solid #d97706" }}>
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className="font-semibold text-sm text-gray-900">{q.customer_name}</span>
              <StatusBadge status={q.status} />
              <span className="ml-auto text-xs text-gray-400">{q.quote_date}</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
              {[
                { label: "ARR", value: fmtD(q.arr), accent: "blue" },
                { label: "Max discount", value: `${q.max_discount_pct}%`, accent: "amber" },
                { label: "Approver", value: approver, accent: "purple" },
                { label: "TCV", value: fmtD(q.tcv), accent: "green" },
              ].map(({ label, value, accent }) => {
                const borders: Record<string, string> = { blue: "#378ADD", amber: "#BA7517", purple: "#7F77DD", green: "#1D9E75" };
                return (
                  <div key={label} className="bg-white border border-gray-100 rounded-lg p-2.5" style={{ borderLeft: `3px solid ${borders[accent]}` }}>
                    <p className="text-xs text-gray-400">{label}</p>
                    <p className="text-sm font-semibold text-gray-900">{value}</p>
                  </div>
                );
              })}
            </div>
            <div className="flex gap-2">
              <button onClick={() => onStatusChange(q.id, "approved")} className="text-sm font-medium px-4 py-1.5 rounded-lg bg-green-600 text-white hover:bg-green-700">Approve</button>
              <button onClick={() => onStatusChange(q.id, "rejected")} className="text-sm px-4 py-1.5 rounded-lg border border-gray-200 text-red-600 hover:bg-red-50">Reject</button>
              <button className="text-sm px-4 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">Request info</button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
