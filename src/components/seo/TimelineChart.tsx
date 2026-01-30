"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { TimelineDataPoint } from "./types";

interface TimelineChartProps {
  data: TimelineDataPoint[];
}

export default function TimelineChart({ data }: TimelineChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-500 dark:text-gray-400">
        Aucune donnée disponible
      </div>
    );
  }

  // Format date for display (YYYY-MM-DD → MM/DD)
  const formattedData = data.map((d) => ({
    ...d,
    dateShort: new Date(d.date).toLocaleDateString("fr-CA", {
      month: "2-digit",
      day: "2-digit",
    }),
  }));

  return (
    <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Timeline ({data.length} jours)
      </h3>

      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={formattedData}>
          <CartesianGrid
            strokeDasharray="3 3"
            className="stroke-gray-200 dark:stroke-zinc-700"
          />
          <XAxis
            dataKey="dateShort"
            className="text-xs text-gray-600 dark:text-gray-400"
            tick={{ fill: "currentColor" }}
          />
          <YAxis
            className="text-xs text-gray-600 dark:text-gray-400"
            tick={{ fill: "currentColor" }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "rgba(0, 0, 0, 0.8)",
              border: "none",
              borderRadius: "8px",
              color: "#fff",
            }}
            labelFormatter={(label) => `Date: ${label}`}
          />
          <Legend
            wrapperStyle={{
              paddingTop: "20px",
            }}
          />

          {/* GA4 Users (Blue) */}
          <Line
            type="monotone"
            dataKey="ga4_users"
            name="GA4 Users"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
          />

          {/* GSC Clicks (Green) */}
          <Line
            type="monotone"
            dataKey="gsc_clicks"
            name="GSC Clicks"
            stroke="#10b981"
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
          />

          {/* Semrush Keywords (Purple) */}
          <Line
            type="monotone"
            dataKey="semrush_keywords"
            name="Semrush Keywords"
            stroke="#8b5cf6"
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
          />

          {/* Speed LCP (Orange) - Secondary axis */}
          <Line
            type="monotone"
            dataKey="avg_lcp_p75"
            name="Speed LCP (ms)"
            stroke="#f59e0b"
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
            yAxisId="right"
          />
        </LineChart>
      </ResponsiveContainer>

      {/* Legend Descriptions */}
      <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
          <span className="text-gray-600 dark:text-gray-400">
            GA4 Users (trafic)
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
          <span className="text-gray-600 dark:text-gray-400">
            GSC Clicks (SEO)
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
          <span className="text-gray-600 dark:text-gray-400">
            Semrush Keywords
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
          <span className="text-gray-600 dark:text-gray-400">
            Speed LCP (perf)
          </span>
        </div>
      </div>
    </div>
  );
}
