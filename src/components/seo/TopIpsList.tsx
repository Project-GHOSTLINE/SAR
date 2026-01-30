"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowUpIcon,
  ArrowDownIcon,
  ClockIcon,
} from "@heroicons/react/24/outline";

interface TopIp {
  ip: string;
  total_requests: number;
  unique_pages: number;
  active_days: number;
  last_seen: string;
  first_seen: string;
  landing_page: string;
  device: string;
  utm_source: string;
  avg_duration_ms: number;
  p95_duration_ms: number;
  success_count: number;
  client_error_count: number;
  server_error_count: number;
  score: number;
}

interface TopIpsListProps {
  limit?: number;
}

export default function TopIpsList({ limit = 20 }: TopIpsListProps) {
  const router = useRouter();
  const [ips, setIps] = useState<TopIp[]>([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<"requests" | "last_seen" | "score">(
    "last_seen"
  );

  useEffect(() => {
    fetchTopIps();
  }, [sort, limit]);

  const fetchTopIps = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/seo/ips/top?limit=${limit}&sort=${sort}`);
      if (res.ok) {
        const data = await res.json();
        setIps(data.ips || []);
      }
    } catch (err) {
      console.error("Failed to fetch top IPs:", err);
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 70) return "text-green-600 dark:text-green-400";
    if (score >= 40) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 70) return "bg-green-100 dark:bg-green-900/30";
    if (score >= 40) return "bg-yellow-100 dark:bg-yellow-900/30";
    return "bg-red-100 dark:bg-red-900/30";
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg p-6">
        <div className="text-center text-gray-500 dark:text-gray-400">
          Chargement des IPs...
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg">
      {/* Header with Sort */}
      <div className="p-4 border-b border-gray-200 dark:border-zinc-800">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Top IPs ({ips.length})
          </h3>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Trier par:
            </span>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as any)}
              className="px-3 py-1.5 text-sm border border-gray-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-white"
            >
              <option value="last_seen">Activité récente</option>
              <option value="requests">Nombre de requêtes</option>
              <option value="score">Score qualité</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-zinc-800/50 border-b border-gray-200 dark:border-zinc-800">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                IP Hash
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Score
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Requêtes
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Pages
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Jours
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Dernier vu
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Landing
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-zinc-800">
            {ips.map((ip) => (
              <tr
                key={ip.ip}
                onClick={() => router.push(`/admin/seo/ip/${ip.ip}`)}
                className="hover:bg-gray-50 dark:hover:bg-zinc-800/50 cursor-pointer transition-colors"
              >
                <td className="px-4 py-3 text-sm font-mono text-gray-900 dark:text-white">
                  {ip.ip}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${getScoreBgColor(
                      ip.score
                    )} ${getScoreColor(ip.score)}`}
                  >
                    {ip.score}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-right text-gray-900 dark:text-white font-medium">
                  {ip.total_requests.toLocaleString()}
                </td>
                <td className="px-4 py-3 text-sm text-right text-gray-900 dark:text-white">
                  {ip.unique_pages}
                </td>
                <td className="px-4 py-3 text-sm text-right text-gray-900 dark:text-white">
                  {ip.active_days}
                </td>
                <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                  <div className="flex items-center gap-1">
                    <ClockIcon className="w-3.5 h-3.5" />
                    {new Date(ip.last_seen).toLocaleDateString("fr-FR", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 truncate max-w-xs">
                  {ip.landing_page}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {ips.length === 0 && (
        <div className="p-8 text-center text-gray-500 dark:text-gray-400">
          Aucun IP trouvé
        </div>
      )}
    </div>
  );
}
