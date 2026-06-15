"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export type RevenuePoint = { month: string; amount: number };

/**
 * Graphique "Revenue Growth" du dashboard, isolé dans son propre module pour
 * être chargé via `next/dynamic` (Recharts ~ lourd, non critique au 1er rendu).
 */
export default function RevenueAreaChart({ data }: { data: RevenuePoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#52634c" stopOpacity={0.15} />
            <stop offset="100%" stopColor="#52634c" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="#c4c8be"
          opacity={0.4}
          vertical={false}
        />
        <XAxis
          dataKey="month"
          tick={{ fontSize: 11, fill: "#444841" }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          tickFormatter={(value) => `$${Number(value) / 1000}k`}
          tick={{ fontSize: 11, fill: "#444841" }}
          tickLine={false}
          axisLine={false}
          width={45}
        />
        <Tooltip
          contentStyle={{
            background: "#ffffff",
            border: "1px solid #c4c8be",
            borderRadius: 8,
            fontSize: 13,
          }}
          formatter={(value) => [`$${Number(value).toLocaleString()}`, "Revenue"]}
        />
        <Area
          type="monotone"
          dataKey="amount"
          stroke="#52634c"
          strokeWidth={2}
          fill="url(#revenueGradient)"
          dot={{ fill: "#52634c", r: 3, strokeWidth: 0 }}
          activeDot={{ r: 5, fill: "#52634c" }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
