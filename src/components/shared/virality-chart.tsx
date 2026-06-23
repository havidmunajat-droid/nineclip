"use client";

import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { EngagementPoint } from "@/lib/types";
import { formatDuration } from "@/lib/utils";

/** The engagement / virality timeline — area chart with lime gradient. */
export function ViralityChart({
  data,
  height = 220,
  showAxes = true,
}: {
  data: EngagementPoint[];
  height?: number;
  showAxes?: boolean;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="viralFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(74 96% 50%)" stopOpacity={0.55} />
            <stop offset="100%" stopColor="hsl(74 96% 50%)" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        {showAxes && (
          <XAxis
            dataKey="t"
            tickFormatter={(t) => formatDuration(Number(t))}
            stroke="hsl(0 0% 40%)"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            minTickGap={40}
          />
        )}
        {showAxes && (
          <YAxis
            domain={[0, 100]}
            stroke="hsl(0 0% 40%)"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            width={28}
          />
        )}
        <Tooltip
          cursor={{ stroke: "hsl(74 96% 50%)", strokeWidth: 1, strokeDasharray: "4 4" }}
          contentStyle={{
            background: "hsl(0 0% 7%)",
            border: "1px solid hsl(0 0% 16%)",
            borderRadius: 10,
            fontSize: 12,
          }}
          labelFormatter={(t) => `Menit ${formatDuration(Number(t))}`}
          formatter={(v: number) => [`${v}/100`, "Skor"]}
        />
        <Area
          type="monotone"
          dataKey="score"
          stroke="hsl(74 96% 50%)"
          strokeWidth={2}
          fill="url(#viralFill)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
