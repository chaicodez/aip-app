"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts";

// ─── ProServ: hours by resource (horizontal bars) ────────────────────────────
export function ProServChart({
  resources,
}: {
  resources: { name: string; hours: number }[];
}) {
  const data = resources.map((r) => ({
    name: r.name.split(" ")[0],
    Hours: r.hours,
  }));

  return (
    <ResponsiveContainer width="100%" height={Math.max(160, data.length * 44)}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 4, right: 16, bottom: 4, left: 8 }}
      >
        <XAxis type="number" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
        <YAxis
          type="category"
          dataKey="name"
          tick={{ fontSize: 12 }}
          width={68}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          formatter={(v: number) => [`${v}h`, "Hours"]}
          contentStyle={{ fontSize: 12 }}
        />
        <Bar dataKey="Hours" radius={[0, 3, 3, 0]} fill="#7F77DD" />
      </BarChart>
    </ResponsiveContainer>
  );
}

// ─── Profitability: Revenue vs Cost stacked bar ──────────────────────────────
export function ProfitabilityChart({
  arr,
  implFee,
  proservCost,
  rdCost,
}: {
  arr: number;
  implFee: number;
  proservCost: number;
  rdCost: number;
}) {
  const data = [
    { name: "Revenue", ARR: arr, "Impl fee": implFee, ProServ: 0, "R&D": 0 },
    { name: "Costs", ARR: 0, "Impl fee": 0, ProServ: proservCost, "R&D": rdCost },
  ];

  const fmtK = (v: number) =>
    v >= 1_000_000
      ? `$${(v / 1_000_000).toFixed(1)}M`
      : v >= 1000
      ? `$${(v / 1000).toFixed(0)}k`
      : `$${v}`;

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 8, right: 16, bottom: 4, left: 8 }}>
        <XAxis dataKey="name" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
        <YAxis
          tickFormatter={fmtK}
          tick={{ fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          width={56}
        />
        <Tooltip formatter={(v: number) => [fmtK(v)]} contentStyle={{ fontSize: 12 }} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="ARR" stackId="a" fill="#7F77DD" radius={[0, 0, 0, 0]}>
          {data.map((_, i) => (
            <Cell key={i} fill={i === 0 ? "#7F77DD" : "transparent"} />
          ))}
        </Bar>
        <Bar dataKey="Impl fee" stackId="a" fill="#AFA9EC">
          {data.map((_, i) => (
            <Cell key={i} fill={i === 0 ? "#AFA9EC" : "transparent"} />
          ))}
        </Bar>
        <Bar dataKey="ProServ" stackId="a" fill="#BA7517">
          {data.map((_, i) => (
            <Cell key={i} fill={i === 1 ? "#BA7517" : "transparent"} />
          ))}
        </Bar>
        <Bar dataKey="R&D" stackId="a" fill="#E24B4A" radius={[3, 3, 0, 0]}>
          {data.map((_, i) => (
            <Cell key={i} fill={i === 1 ? "#E24B4A" : "transparent"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
