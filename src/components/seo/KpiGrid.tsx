"use client";

import { SeoKpis } from "./types";
import KpiCard from "./KpiCard";

interface KpiGridProps {
  kpis: SeoKpis | null;
  loading?: boolean;
}

export default function KpiGrid({ kpis, loading }: KpiGridProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg p-4 animate-pulse"
          >
            <div className="h-4 bg-gray-200 dark:bg-zinc-800 rounded w-20 mb-2"></div>
            <div className="h-8 bg-gray-200 dark:bg-zinc-800 rounded w-16"></div>
          </div>
        ))}
      </div>
    );
  }

  if (!kpis) {
    return (
      <div className="text-center py-12 text-gray-500 dark:text-gray-400">
        Aucune donnée disponible
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Row 1: GA4 + GSC */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* GA4 */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
            <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
            Google Analytics 4
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <KpiCard
              title="Users"
              value={kpis.ga4.users}
              trend={kpis.ga4.trend.users}
              subtitle="Total users"
            />
            <KpiCard
              title="Sessions"
              value={kpis.ga4.sessions}
              trend={kpis.ga4.trend.sessions}
              subtitle="Total sessions"
            />
            <KpiCard
              title="Conversions"
              value={kpis.ga4.conversions}
              trend={kpis.ga4.trend.conversions}
              subtitle={`${Math.round((kpis.ga4.conversions / kpis.ga4.sessions) * 100)}% rate`}
            />
            <KpiCard
              title="Engagement"
              value={`${Math.round(kpis.ga4.engagement_rate * 100)}%`}
              subtitle={`Bounce: ${Math.round(kpis.ga4.bounce_rate * 100)}%`}
            />
          </div>
        </div>

        {/* GSC */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
            Google Search Console
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <KpiCard
              title="Clicks"
              value={kpis.gsc.clicks}
              trend={kpis.gsc.trend.clicks}
              subtitle="Organic clicks"
            />
            <KpiCard
              title="Impressions"
              value={kpis.gsc.impressions}
              trend={kpis.gsc.trend.impressions}
              subtitle="Search impressions"
            />
            <KpiCard
              title="CTR"
              value={`${(kpis.gsc.ctr * 100).toFixed(2)}%`}
              subtitle="Click-through rate"
            />
            <KpiCard
              title="Position"
              value={kpis.gsc.position > 0 ? kpis.gsc.position.toFixed(1) : "N/A"}
              subtitle="Avg position"
            />
          </div>
        </div>
      </div>

      {/* Row 2: Semrush + Speed */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Semrush */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
            <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
            Semrush
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <KpiCard
              title="Keywords"
              value={kpis.semrush.keywords}
              trend={kpis.semrush.trend.keywords}
              subtitle="Organic keywords"
            />
            <KpiCard
              title="Traffic"
              value={kpis.semrush.traffic}
              trend={kpis.semrush.trend.traffic}
              subtitle="Est. monthly visits"
            />
            <KpiCard
              title="Domain Rank"
              value={kpis.semrush.rank.toLocaleString()}
              subtitle="Canada ranking"
            />
            <KpiCard
              title="Backlinks"
              value={kpis.semrush.backlinks}
              subtitle={`Authority: ${kpis.semrush.authority}`}
            />
          </div>
        </div>

        {/* Speed Insights */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
            <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
            Speed Insights
          </h3>
          {kpis.speed.lcp_p75 ? (
            <div className="grid grid-cols-2 gap-3">
              <KpiCard
                title="LCP"
                value={`${kpis.speed.lcp_p75}ms`}
                status={kpis.speed.status}
                subtitle="Largest Contentful Paint"
              />
              <KpiCard
                title="INP"
                value={`${kpis.speed.inp_p75}ms`}
                status={kpis.speed.status}
                subtitle="Interaction to Next Paint"
              />
              <KpiCard
                title="CLS"
                value={kpis.speed.cls_p75?.toFixed(3) || "N/A"}
                status={kpis.speed.status}
                subtitle="Cumulative Layout Shift"
              />
              <KpiCard
                title="Samples"
                value={kpis.speed.samples}
                subtitle={`Mobile: ${kpis.speed.mobile_lcp || "N/A"}ms`}
              />
            </div>
          ) : (
            <div className="bg-gray-50 dark:bg-zinc-900 border border-dashed border-gray-300 dark:border-zinc-700 rounded-lg p-6 text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Speed Insights en cours de collecte
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                Les données apparaîtront après configuration du Drain Vercel
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
