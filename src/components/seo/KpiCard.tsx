"use client";

import { ArrowUpIcon, ArrowDownIcon } from "@heroicons/react/24/solid";

interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: number;
  status?: "GOOD" | "WARN" | "CRIT" | null;
  onClick?: () => void;
}

export default function KpiCard({
  title,
  value,
  subtitle,
  trend,
  status,
  onClick,
}: KpiCardProps) {
  const getTrendColor = (trend: number) => {
    if (trend > 0) return "text-green-500";
    if (trend < 0) return "text-red-500";
    return "text-gray-500";
  };

  const getStatusColor = (status: string) => {
    if (status === "GOOD") return "bg-green-500/10 text-green-500";
    if (status === "WARN") return "bg-yellow-500/10 text-yellow-500";
    if (status === "CRIT") return "bg-red-500/10 text-red-500";
    return "bg-gray-500/10 text-gray-500";
  };

  return (
    <div
      onClick={onClick}
      className={`bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg p-4 ${
        onClick ? "cursor-pointer hover:border-blue-500 transition-colors" : ""
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">
          {title}
        </h3>
        {status && (
          <span
            className={`px-2 py-0.5 text-xs font-semibold rounded ${getStatusColor(
              status
            )}`}
          >
            {status}
          </span>
        )}
      </div>

      {/* Value */}
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold text-gray-900 dark:text-white">
          {typeof value === "number" ? value.toLocaleString() : value}
        </span>
        {trend !== undefined && trend !== 0 && (
          <div className={`flex items-center gap-0.5 text-sm ${getTrendColor(trend)}`}>
            {trend > 0 ? (
              <ArrowUpIcon className="w-3 h-3" />
            ) : (
              <ArrowDownIcon className="w-3 h-3" />
            )}
            <span>{Math.abs(trend)}%</span>
          </div>
        )}
      </div>

      {/* Subtitle */}
      {subtitle && (
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          {subtitle}
        </p>
      )}
    </div>
  );
}
