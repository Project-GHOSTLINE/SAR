"use client";

import { useState, useEffect } from "react";
import { Tab } from "@headlessui/react";
import AdminNav from "@/components/admin/AdminNav";
import SeoTopBar from "@/components/seo/SeoTopBar";
import KpiGrid from "@/components/seo/KpiGrid";
import TimelineChart from "@/components/seo/TimelineChart";
import GscDetails from "@/components/seo/GscDetails";
import RecommendationsPanel from "@/components/seo/RecommendationsPanel";
import ExplorerIpPanel from "@/components/seo/ExplorerIpPanel";
import {
  SeoOverview,
  IpData,
  RangeOption,
  DeviceOption,
} from "@/components/seo/types";

export default function SeoPage() {
  const [range, setRange] = useState<RangeOption>("30d");
  const [device, setDevice] = useState<DeviceOption>("all");
  const [overview, setOverview] = useState<SeoOverview | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch overview data
  const fetchOverview = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/seo/overview?range=${range}&device=${device}`
      );
      if (res.ok) {
        const data = await res.json();
        setOverview(data);
      }
    } catch (err) {
      console.error("Failed to fetch overview:", err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch IP data
  const fetchIpData = async (ip: string): Promise<IpData | null> => {
    try {
      const res = await fetch(`/api/seo/ip/${ip}?range=${range}`);
      if (res.ok) {
        return await res.json();
      }
      return null;
    } catch (err) {
      console.error("Failed to fetch IP data:", err);
      throw err;
    }
  };

  useEffect(() => {
    fetchOverview();
  }, [range, device]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black">
      <AdminNav />

      <div className="flex flex-col">
        {/* Top Bar */}
        <SeoTopBar
          range={range}
          device={device}
          onRangeChange={setRange}
          onDeviceChange={setDevice}
          onRefresh={fetchOverview}
        />

        {/* Tabs */}
        <div className="flex-1">
          <Tab.Group>
            <Tab.List className="flex border-b border-gray-200 dark:border-zinc-800 px-6 bg-white dark:bg-zinc-900">
              <Tab
                className={({ selected }) =>
                  `px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
                    selected
                      ? "border-blue-500 text-blue-600 dark:text-blue-400"
                      : "border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                  }`
                }
              >
                Command Center
              </Tab>
              <Tab
                className={({ selected }) =>
                  `px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
                    selected
                      ? "border-blue-500 text-blue-600 dark:text-blue-400"
                      : "border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                  }`
                }
              >
                Explorer IP
              </Tab>
            </Tab.List>

            <Tab.Panels className="p-6">
              {/* Tab 1: Command Center */}
              <Tab.Panel>
                <div className="space-y-6">
                  {/* KPI Grid */}
                  <KpiGrid kpis={overview?.kpis || null} loading={loading} />

                  {/* Recommendations Panel */}
                  {overview && overview.kpis && (
                    <RecommendationsPanel kpis={overview.kpis} />
                  )}

                  {/* Timeline Chart */}
                  {overview && overview.timeline.length > 0 && (
                    <TimelineChart data={overview.timeline} />
                  )}

                  {/* GSC Details (Top Queries & Top Pages) */}
                  {overview && (overview.gscQueries || overview.gscPages) && (
                    <GscDetails
                      topQueries={overview.gscQueries || []}
                      topPages={overview.gscPages || []}
                    />
                  )}

                  {/* Top Pages */}
                  {overview && overview.topPages.length > 0 && (
                    <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg p-6">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                        Top Pages
                      </h3>
                      <div className="space-y-2">
                        {overview.topPages.slice(0, 10).map((page, i) => (
                          <div
                            key={i}
                            className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-zinc-800 last:border-0"
                          >
                            <span className="text-sm text-gray-900 dark:text-white">
                              {page.path}
                            </span>
                            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                              {page.views || page.count || 0} vues
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Meta Info */}
                  {overview && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
                      Dernière mise à jour: {overview.meta.lastUpdated} •{" "}
                      {overview.meta.dataPoints} jours de données
                    </div>
                  )}
                </div>
              </Tab.Panel>

              {/* Tab 2: Explorer IP */}
              <Tab.Panel>
                <ExplorerIpPanel onSearch={fetchIpData} />
              </Tab.Panel>
            </Tab.Panels>
          </Tab.Group>
        </div>
      </div>
    </div>
  );
}
