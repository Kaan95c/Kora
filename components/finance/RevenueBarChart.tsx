"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export type RevenueBar = { month: string; collected: number; expected: number };

/**
 * Graphique "Revenue Trends" de la page Finance, isolé pour chargement via
 * `next/dynamic`. Les libellés des séries sont passés en props (i18n côté page).
 */
export default function RevenueBarChart({
  data,
  collectedLabel,
  expectedLabel,
}: {
  data: RevenueBar[];
  collectedLabel: string;
  expectedLabel: string;
}) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart
        data={data}
        margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
        barGap={4}
      >
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="#c4c8be"
          opacity={0.3}
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
          cursor={{ fill: "rgba(82,99,76,0.06)" }}
          contentStyle={{
            background: "#ffffff",
            border: "1px solid #c4c8be",
            borderRadius: 8,
            fontSize: 13,
          }}
          formatter={(value, name) => [`$${Number(value).toLocaleString()}`, name]}
        />
        <Bar
          dataKey="collected"
          fill="#52634c"
          radius={[4, 4, 0, 0]}
          name={collectedLabel}
        />
        <Bar
          dataKey="expected"
          fill="#f8dac5"
          radius={[4, 4, 0, 0]}
          name={expectedLabel}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
