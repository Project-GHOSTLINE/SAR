"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MagnifyingGlassIcon, ArrowRightIcon } from "@heroicons/react/24/outline";
import { IpData } from "./types";

interface ExplorerIpPanelProps {
  onSearch: (ip: string) => Promise<IpData | null>;
}

export default function ExplorerIpPanel({ onSearch }: ExplorerIpPanelProps) {
  const router = useRouter();
  const [ipInput, setIpInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<IpData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!ipInput.trim()) return;

    setLoading(true);
    setError(null);
    setData(null);

    try {
      const result = await onSearch(ipInput.trim());
      if (result) {
        setData(result);
      } else {
        setError("IP non trouvé");
      }
    } catch (err: any) {
      setError(err.message || "Erreur lors de la recherche");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Search bar */}
      <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Rechercher un IP
        </h2>
        <div className="flex gap-3">
          <input
            type="text"
            value={ipInput}
            onChange={(e) => setIpInput(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Entrer un IP hash..."
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            onClick={handleSearch}
            disabled={loading || !ipInput.trim()}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
          >
            <MagnifyingGlassIcon className="w-5 h-5" />
            {loading ? "Recherche..." : "Rechercher"}
          </button>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
          Pour trouver un IP: exécuter{" "}
          <code className="px-1 py-0.5 bg-gray-100 dark:bg-zinc-800 rounded">
            SELECT ip FROM ip_to_seo_segment LIMIT 10;
          </code>{" "}
          dans Supabase
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Results */}
      {data && (
        <div className="space-y-6">
          {/* Action Banner */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-200 mb-1">
                  Aperçu rapide de l'IP
                </h3>
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  Voir le dossier complet avec score, alertes, timeline et plus
                </p>
              </div>
              <button
                onClick={() => router.push(`/admin/seo/ip/${ipInput.trim()}`)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
              >
                Voir Dossier Complet
                <ArrowRightIcon className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Intelligence */}
          <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              IP Intelligence
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  First Seen
                </p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {new Date(data.intelligence.first_seen).toLocaleDateString()}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Last Seen
                </p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {new Date(data.intelligence.last_seen).toLocaleDateString()}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Total Requests
                </p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {data.intelligence.total_requests}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Active Days
                </p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {data.intelligence.active_days}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Landing Page
                </p>
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {data.intelligence.landing_page}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Most Visited
                </p>
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {data.intelligence.most_visited_page}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Device
                </p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {data.intelligence.device || "N/A"}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  UTM Source
                </p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {data.intelligence.utm_source || "N/A"}
                </p>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg p-4">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                Avg Duration
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {data.stats.avg_duration}ms
              </p>
            </div>
            <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg p-4">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                Success Rate
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {data.stats.success_rate}%
              </p>
            </div>
            <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg p-4">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                Unique Paths
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {data.stats.unique_paths}
              </p>
            </div>
          </div>

          {/* Top Paths */}
          <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Top Pages
            </h3>
            <div className="space-y-2">
              {data.topPaths.slice(0, 10).map((p, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-zinc-800 last:border-0"
                >
                  <span className="text-sm text-gray-900 dark:text-white truncate flex-1">
                    {p.path}
                  </span>
                  <span className="text-sm font-medium text-gray-500 dark:text-gray-400 ml-4">
                    {p.count} fois
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Timeline */}
          <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Timeline (50 dernières requêtes)
            </h3>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {data.timeline.map((r, i) => (
                <div
                  key={i}
                  className="flex items-center gap-4 py-2 border-b border-gray-100 dark:border-zinc-800 last:border-0 text-xs"
                >
                  <span className="text-gray-500 dark:text-gray-400 w-32 shrink-0">
                    {new Date(r.timestamp).toLocaleString()}
                  </span>
                  <span className="text-gray-900 dark:text-white flex-1 truncate">
                    {r.path}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded ${
                      r.status >= 200 && r.status < 300
                        ? "bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400"
                        : "bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400"
                    }`}
                  >
                    {r.status}
                  </span>
                  <span className="text-gray-500 dark:text-gray-400 w-16 text-right">
                    {r.duration_ms}ms
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
