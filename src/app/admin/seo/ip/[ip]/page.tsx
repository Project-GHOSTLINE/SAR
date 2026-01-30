"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import AdminNav from "@/components/admin/AdminNav";
import {
  ArrowLeftIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
} from "@heroicons/react/24/outline";

interface IpDossierData {
  ip: string;
  intelligence: {
    first_seen: string;
    last_seen: string;
    total_requests: number;
    active_days: number;
    unique_pages: number;
    landing_page: string;
    most_visited_page: string;
    device: string;
    utm_source: string;
    utm_medium: string;
    utm_campaign: string;
    avg_duration_ms: number;
    p50_duration_ms: number;
    p95_duration_ms: number;
    success_count: number;
    client_error_count: number;
    server_error_count: number;
  };
  score: number;
  alerts: Array<{
    level: "CRIT" | "WARN" | "OK";
    title: string;
    description: string;
    action?: string;
    metric: string;
    value?: string | number;
  }>;
  timeline: Array<{
    created_at: string;
    method: string;
    path: string;
    status: number;
    duration_ms: number;
  }>;
  topPaths: Array<{
    path: string;
    count: number;
  }>;
  slowestEndpoints: Array<{
    path: string;
    avg_duration: number;
    count: number;
  }>;
  meta: {
    range: string;
    days: number;
    dataPoints: number;
  };
}

export default function IpDossierPage() {
  const params = useParams();
  const router = useRouter();
  const ip = params.ip as string;

  const [data, setData] = useState<IpDossierData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [range, setRange] = useState<"7d" | "30d" | "90d">("30d");

  useEffect(() => {
    fetchIpData();
  }, [ip, range]);

  const fetchIpData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/seo/ip/${ip}?range=${range}`);
      if (!res.ok) {
        throw new Error("IP not found");
      }
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 70) return "bg-green-500";
    if (score >= 40) return "bg-yellow-500";
    return "bg-red-500";
  };

  const getScoreLabel = (score: number) => {
    if (score >= 70) return "Excellent";
    if (score >= 40) return "Moyen";
    return "Faible";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-black">
        <AdminNav />
        <div className="p-6 flex items-center justify-center">
          <div className="text-gray-500 dark:text-gray-400">
            Chargement du dossier IP...
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-black">
        <AdminNav />
        <div className="p-6">
          <button
            onClick={() => router.push("/admin/seo")}
            className="mb-4 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          >
            <ArrowLeftIcon className="w-4 h-4" />
            Retour au Command Center
          </button>
          <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-lg p-6 text-center">
            <p className="text-red-900 dark:text-red-200">
              {error || "IP non trouvée"}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const intel = data.intelligence;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black">
      <AdminNav />

      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.push("/admin/seo")}
            className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          >
            <ArrowLeftIcon className="w-4 h-4" />
            Retour au Command Center
          </button>

          <div className="flex items-center gap-3">
            <select
              value={range}
              onChange={(e) => setRange(e.target.value as any)}
              className="px-3 py-1.5 text-sm border border-gray-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-white"
            >
              <option value="7d">7 jours</option>
              <option value="30d">30 jours</option>
              <option value="90d">90 jours</option>
            </select>
          </div>
        </div>

        {/* Title + Score */}
        <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                Dossier IP: {data.ip}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Première visite: {new Date(intel.first_seen).toLocaleDateString("fr-FR")} • Dernière visite: {new Date(intel.last_seen).toLocaleDateString("fr-FR")}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                  Score Qualité
                </div>
                <div className="text-3xl font-bold text-gray-900 dark:text-white">
                  {data.score}/100
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {getScoreLabel(data.score)}
                </div>
              </div>
              <div
                className={`w-16 h-16 rounded-full ${getScoreColor(data.score)} flex items-center justify-center text-white text-2xl font-bold`}
              >
                {data.score}
              </div>
            </div>
          </div>
        </div>

        {/* Alerts */}
        {data.alerts.length > 0 && (
          <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Alertes ({data.alerts.length})
            </h3>
            <div className="space-y-3">
              {data.alerts.map((alert, i) => (
                <div
                  key={i}
                  className={`border-l-4 rounded-r-lg p-4 ${
                    alert.level === "CRIT"
                      ? "border-red-500 bg-red-50 dark:bg-red-900/10"
                      : alert.level === "WARN"
                      ? "border-yellow-500 bg-yellow-50 dark:bg-yellow-900/10"
                      : "border-green-500 bg-green-50 dark:bg-green-900/10"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                      {alert.level === "CRIT" ? (
                        <ExclamationTriangleIcon className="w-5 h-5 text-red-600 dark:text-red-400" />
                      ) : alert.level === "WARN" ? (
                        <InformationCircleIcon className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                      ) : (
                        <CheckCircleIcon className="w-5 h-5 text-green-600 dark:text-green-400" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4
                          className={`font-semibold ${
                            alert.level === "CRIT"
                              ? "text-red-900 dark:text-red-200"
                              : alert.level === "WARN"
                              ? "text-yellow-900 dark:text-yellow-200"
                              : "text-green-900 dark:text-green-200"
                          }`}
                        >
                          {alert.title}
                        </h4>
                        <span className="text-xs px-2 py-0.5 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded">
                          {alert.metric}
                        </span>
                      </div>
                      <p
                        className={`text-sm mb-2 ${
                          alert.level === "CRIT"
                            ? "text-red-700 dark:text-red-300"
                            : alert.level === "WARN"
                            ? "text-yellow-700 dark:text-yellow-300"
                            : "text-green-700 dark:text-green-300"
                        }`}
                      >
                        {alert.description}
                      </p>
                      {alert.action && (
                        <p className="text-xs text-gray-600 dark:text-gray-400 italic">
                          → {alert.action}
                        </p>
                      )}
                    </div>
                    {alert.value && (
                      <div className="flex-shrink-0">
                        <span
                          className={`inline-flex items-center px-3 py-1 rounded-lg text-sm font-bold ${
                            alert.level === "CRIT"
                              ? "bg-red-600 text-white"
                              : alert.level === "WARN"
                              ? "bg-yellow-600 text-white"
                              : "bg-green-600 text-white"
                          }`}
                        >
                          {alert.value}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Intelligence KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg p-4">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
              Total Requêtes
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {intel.total_requests}
            </div>
          </div>
          <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg p-4">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
              Jours Actifs
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {intel.active_days}
            </div>
          </div>
          <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg p-4">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
              Pages Uniques
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {intel.unique_pages}
            </div>
          </div>
          <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg p-4">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
              Device
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {intel.device}
            </div>
          </div>
          <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg p-4">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
              Latence Moyenne
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {intel.avg_duration_ms}ms
            </div>
          </div>
          <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg p-4">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
              p95 Latence
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {intel.p95_duration_ms}ms
            </div>
          </div>
          <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg p-4">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
              Succès
            </div>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {intel.success_count}
            </div>
          </div>
          <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg p-4">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
              Erreurs
            </div>
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">
              {intel.client_error_count + intel.server_error_count}
            </div>
          </div>
        </div>

        {/* Landing + Most Visited */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg p-4">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
              Landing Page
            </div>
            <div className="text-sm font-mono text-gray-900 dark:text-white">
              {intel.landing_page}
            </div>
          </div>
          <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg p-4">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
              Page la Plus Visitée
            </div>
            <div className="text-sm font-mono text-gray-900 dark:text-white">
              {intel.most_visited_page}
            </div>
          </div>
        </div>

        {/* UTM Info */}
        <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg p-4">
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
            Source de Trafic
          </div>
          <div className="flex items-center gap-4 text-sm text-gray-900 dark:text-white">
            <span>
              <strong>Source:</strong> {intel.utm_source}
            </span>
            <span>
              <strong>Medium:</strong> {intel.utm_medium}
            </span>
            <span>
              <strong>Campaign:</strong> {intel.utm_campaign}
            </span>
          </div>
        </div>

        {/* Top Paths */}
        <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Top 10 Pages Visitées
          </h3>
          <div className="space-y-2">
            {data.topPaths.map((item, i) => (
              <div
                key={i}
                className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-zinc-800 last:border-0"
              >
                <span className="text-sm font-mono text-gray-900 dark:text-white">
                  {item.path}
                </span>
                <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  {item.count} visites
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Slowest Endpoints */}
        <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Endpoints les Plus Lents
          </h3>
          <div className="space-y-2">
            {data.slowestEndpoints.map((item, i) => (
              <div
                key={i}
                className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-zinc-800 last:border-0"
              >
                <span className="text-sm font-mono text-gray-900 dark:text-white">
                  {item.path}
                </span>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {item.count} req
                  </span>
                  <span
                    className={`text-sm font-bold ${
                      item.avg_duration >= 1000
                        ? "text-red-600 dark:text-red-400"
                        : item.avg_duration >= 500
                        ? "text-yellow-600 dark:text-yellow-400"
                        : "text-green-600 dark:text-green-400"
                    }`}
                  >
                    {item.avg_duration}ms
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Timeline */}
        <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Timeline (100 dernières requêtes)
          </h3>
          <div className="space-y-1 max-h-96 overflow-y-auto">
            {data.timeline.map((req, i) => (
              <div
                key={i}
                className="flex items-center gap-3 py-2 border-b border-gray-100 dark:border-zinc-800 last:border-0 text-xs"
              >
                <span className="text-gray-500 dark:text-gray-400 w-32">
                  {new Date(req.created_at).toLocaleString("fr-FR", {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
                <span
                  className={`px-2 py-0.5 rounded font-mono ${
                    req.status >= 500
                      ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300"
                      : req.status >= 400
                      ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300"
                      : "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
                  }`}
                >
                  {req.status}
                </span>
                <span className="text-gray-500 dark:text-gray-400 font-mono w-12">
                  {req.method}
                </span>
                <span className="flex-1 font-mono text-gray-900 dark:text-white truncate">
                  {req.path}
                </span>
                <span className="text-gray-500 dark:text-gray-400 w-16 text-right">
                  {req.duration_ms}ms
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Meta */}
        <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
          Période: {data.meta.days} jours • {data.meta.dataPoints} requêtes
          affichées
        </div>
      </div>
    </div>
  );
}
