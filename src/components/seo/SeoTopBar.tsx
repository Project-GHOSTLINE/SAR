"use client";

import { RangeOption, DeviceOption } from "./types";

interface SeoTopBarProps {
  range: RangeOption;
  device: DeviceOption;
  onRangeChange: (range: RangeOption) => void;
  onDeviceChange: (device: DeviceOption) => void;
  onRefresh?: () => void;
}

export default function SeoTopBar({
  range,
  device,
  onRangeChange,
  onDeviceChange,
  onRefresh,
}: SeoTopBarProps) {
  return (
    <div className="bg-white dark:bg-zinc-900 border-b border-gray-200 dark:border-zinc-800 px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Title */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            SEO Command Center
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            GA4, GSC, Semrush & Speed Insights unifiés
          </p>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3">
          {/* Range selector */}
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600 dark:text-gray-400">
              Période:
            </label>
            <select
              value={range}
              onChange={(e) => onRangeChange(e.target.value as RangeOption)}
              className="px-3 py-1.5 text-sm border border-gray-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="7d">7 jours</option>
              <option value="30d">30 jours</option>
              <option value="90d">90 jours</option>
            </select>
          </div>

          {/* Device selector */}
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600 dark:text-gray-400">
              Device:
            </label>
            <select
              value={device}
              onChange={(e) => onDeviceChange(e.target.value as DeviceOption)}
              className="px-3 py-1.5 text-sm border border-gray-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Tous</option>
              <option value="mobile">Mobile</option>
              <option value="desktop">Desktop</option>
            </select>
          </div>

          {/* Refresh button */}
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="px-4 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 border border-gray-300 dark:border-zinc-700 rounded-lg transition-colors"
            >
              Actualiser
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
