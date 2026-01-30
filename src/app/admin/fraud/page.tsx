"use client";

import { useEffect, useState } from "react";

type FraudStats = {
  total_detections: number;
  critical_ips: number;
  high_risk_ips: number;
  bots: number;
  scrapers: number;
  suspicious: number;
  converters: number;
  engaged: number;
  unresolved_signals: number;
  avg_fraud_score: number;
};

type FraudDetection = {
  ip: string;
  visit_id: string;
  client_id?: string;
  user_id?: string;
  total_requests: number;
  total_events: number;
  correlation_score: number;
  fraud_score: number;
  classification: string;
  is_likely_bot: boolean;
  is_velocity_abuse: boolean;
  is_low_correlation: boolean;
  requests_per_minute: number;
  first_seen: string;
  last_seen: string;
  // Device info
  device_label?: string;
  browser_label?: string;
  device_type?: string;
  browser?: string;
  browser_version?: string;
  os?: string;
  os_version?: string;
  viewport_width?: string;
  viewport_height?: string;
  screen_width?: string;
  screen_height?: string;
};

type IpRisk = {
  ip: string;
  total_visits: number;
  avg_fraud_score: number;
  max_fraud_score: number;
  bot_count: number;
  scraper_count: number;
  suspicious_count: number;
  converter_count: number;
  risk_level: string;
  first_seen: string;
  last_seen: string;
};

type SuspiciousPattern = {
  pattern: string;
  occurrences: number;
  sample_ips: string[];
};

type FraudSignal = {
  id: string;
  ip: string;
  visit_id: string;
  signal_type: string;
  severity: string;
  score: number;
  evidence: any;
  detected_at: string;
};

export default function FraudDetectionPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<FraudStats | null>(null);
  const [detections, setDetections] = useState<FraudDetection[]>([]);
  const [ipRisks, setIpRisks] = useState<IpRisk[]>([]);
  const [patterns, setPatterns] = useState<SuspiciousPattern[]>([]);
  const [signals, setSignals] = useState<FraudSignal[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const [minScore, setMinScore] = useState<number>(50);

  useEffect(() => {
    fetchFraudData();
    const interval = setInterval(fetchFraudData, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, [filter, minScore]);

  async function fetchFraudData() {
    try {
      const params = new URLSearchParams();
      params.set("min_score", minScore.toString());
      if (filter !== "all") params.set("classification", filter);

      const res = await fetch(`/api/fraud/live?${params.toString()}`);
      const data = await res.json();

      setStats(data.stats);
      setDetections(data.detections);
      setIpRisks(data.ip_risks);
      setPatterns(data.patterns);
      setSignals(data.signals);
    } catch (err) {
      console.error("Failed to fetch fraud data:", err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">🚨 Fraud Detection NSA</h1>
        <p>Chargement...</p>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">🚨 Fraud Detection NSA</h1>
        <button
          onClick={fetchFraudData}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Rafraîchir
        </button>
      </div>

      {/* Stats KPIs */}
      {stats && (
        <div className="grid grid-cols-5 gap-4">
          <div className="bg-red-50 border border-red-200 rounded p-4">
            <div className="text-sm text-gray-600">IPs Critiques</div>
            <div className="text-3xl font-bold text-red-600">{stats.critical_ips}</div>
          </div>
          <div className="bg-orange-50 border border-orange-200 rounded p-4">
            <div className="text-sm text-gray-600">IPs Risque Élevé</div>
            <div className="text-3xl font-bold text-orange-600">{stats.high_risk_ips}</div>
          </div>
          <div className="bg-yellow-50 border border-yellow-200 rounded p-4">
            <div className="text-sm text-gray-600">Bots Détectés</div>
            <div className="text-3xl font-bold text-yellow-700">{stats.bots}</div>
          </div>
          <div className="bg-purple-50 border border-purple-200 rounded p-4">
            <div className="text-sm text-gray-600">Scrapers</div>
            <div className="text-3xl font-bold text-purple-600">{stats.scrapers}</div>
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded p-4">
            <div className="text-sm text-gray-600">Signaux Non Résolus</div>
            <div className="text-3xl font-bold text-gray-800">{stats.unresolved_signals}</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-4 items-center bg-white border rounded p-4">
        <div>
          <label className="text-sm font-medium mr-2">Classification:</label>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="border rounded px-3 py-1"
          >
            <option value="all">Tous</option>
            <option value="BOT">Bots</option>
            <option value="SCRAPER">Scrapers</option>
            <option value="SUSPICIOUS">Suspects</option>
            <option value="CONVERTER">Converteurs</option>
            <option value="ENGAGED">Engagés</option>
          </select>
        </div>
        <div>
          <label className="text-sm font-medium mr-2">Score Min:</label>
          <input
            type="number"
            value={minScore}
            onChange={(e) => setMinScore(parseInt(e.target.value))}
            className="border rounded px-3 py-1 w-20"
            min="0"
            max="100"
          />
        </div>
      </div>

      {/* Suspicious Patterns */}
      {patterns.length > 0 && (
        <div className="bg-white border rounded p-4">
          <h2 className="text-xl font-bold mb-4">⚠️ Patterns Suspects Détectés</h2>
          <div className="space-y-2">
            {patterns.map((pattern, idx) => (
              <div key={idx} className="flex justify-between items-center p-3 bg-red-50 border border-red-200 rounded">
                <div>
                  <div className="font-semibold">{pattern.pattern}</div>
                  <div className="text-sm text-gray-600">
                    {pattern.occurrences} occurrence(s) - Échantillon: {pattern.sample_ips.slice(0, 3).join(", ")}
                  </div>
                </div>
                <div className="text-2xl font-bold text-red-600">{pattern.occurrences}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* IP Risk Profiles */}
      <div className="bg-white border rounded p-4">
        <h2 className="text-xl font-bold mb-4">🎯 Profils de Risque par IP</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left p-2">IP</th>
                <th className="text-left p-2">Niveau</th>
                <th className="text-right p-2">Score Moy</th>
                <th className="text-right p-2">Score Max</th>
                <th className="text-right p-2">Visites</th>
                <th className="text-right p-2">Bots</th>
                <th className="text-right p-2">Scrapers</th>
                <th className="text-right p-2">Suspects</th>
                <th className="text-left p-2">Dernière Vue</th>
              </tr>
            </thead>
            <tbody>
              {ipRisks.map((risk) => (
                <tr key={risk.ip} className="border-b hover:bg-gray-50">
                  <td className="p-2 font-mono text-xs">
                    <a href={`/admin/seo/ip/${risk.ip}`} className="text-blue-600 hover:underline">
                      {risk.ip}
                    </a>
                  </td>
                  <td className="p-2">
                    <span
                      className={`px-2 py-1 rounded text-xs font-bold ${
                        risk.risk_level === "CRITICAL"
                          ? "bg-red-100 text-red-800"
                          : risk.risk_level === "HIGH"
                          ? "bg-orange-100 text-orange-800"
                          : risk.risk_level === "MEDIUM"
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {risk.risk_level}
                    </span>
                  </td>
                  <td className="p-2 text-right">{risk.avg_fraud_score}</td>
                  <td className="p-2 text-right font-bold">{risk.max_fraud_score}</td>
                  <td className="p-2 text-right">{risk.total_visits}</td>
                  <td className="p-2 text-right">{risk.bot_count}</td>
                  <td className="p-2 text-right">{risk.scraper_count}</td>
                  <td className="p-2 text-right">{risk.suspicious_count}</td>
                  <td className="p-2 text-xs text-gray-600">
                    {new Date(risk.last_seen).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Live Fraud Detections */}
      <div className="bg-white border rounded p-4">
        <h2 className="text-xl font-bold mb-4">🔴 Détections en Temps Réel</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left p-2">IP</th>
                <th className="text-left p-2">Visit ID</th>
                <th className="text-left p-2">Device</th>
                <th className="text-left p-2">Classification</th>
                <th className="text-right p-2">Score Fraude</th>
                <th className="text-right p-2">Correlation</th>
                <th className="text-right p-2">Req/Events</th>
                <th className="text-right p-2">Req/Min</th>
                <th className="text-left p-2">Flags</th>
                <th className="text-left p-2">Dernière Vue</th>
              </tr>
            </thead>
            <tbody>
              {detections.map((det, idx) => (
                <tr key={idx} className="border-b hover:bg-gray-50">
                  <td className="p-2 font-mono text-xs">
                    <a href={`/admin/seo/ip/${det.ip}`} className="text-blue-600 hover:underline">
                      {det.ip}
                    </a>
                  </td>
                  <td className="p-2 font-mono text-xs">{det.visit_id?.slice(0, 8)}...</td>
                  <td className="p-2">
                    {det.device_label || det.device_type ? (
                      <div className="text-xs">
                        <div className="font-semibold text-gray-900">
                          {det.device_label || det.device_type || 'Unknown Device'}
                        </div>
                        {det.browser_label && (
                          <div className="text-gray-600">{det.browser_label}</div>
                        )}
                        {det.viewport_width && det.viewport_height && (
                          <div className="text-gray-500">{det.viewport_width}×{det.viewport_height}</div>
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-400 text-xs">No device info</span>
                    )}
                  </td>
                  <td className="p-2">
                    <span
                      className={`px-2 py-1 rounded text-xs font-bold ${
                        det.classification === "BOT"
                          ? "bg-red-100 text-red-800"
                          : det.classification === "SCRAPER"
                          ? "bg-orange-100 text-orange-800"
                          : det.classification === "SUSPICIOUS"
                          ? "bg-yellow-100 text-yellow-800"
                          : det.classification === "CONVERTER"
                          ? "bg-green-100 text-green-800"
                          : "bg-blue-100 text-blue-800"
                      }`}
                    >
                      {det.classification}
                    </span>
                  </td>
                  <td className="p-2 text-right font-bold text-red-600">{det.fraud_score}</td>
                  <td className="p-2 text-right">{det.correlation_score}</td>
                  <td className="p-2 text-right">
                    {det.total_requests}/{det.total_events}
                  </td>
                  <td className="p-2 text-right">{det.requests_per_minute?.toFixed(1)}</td>
                  <td className="p-2 text-xs">
                    {det.is_likely_bot && <span className="bg-red-100 text-red-800 px-1 rounded mr-1">BOT</span>}
                    {det.is_velocity_abuse && <span className="bg-orange-100 text-orange-800 px-1 rounded mr-1">VEL</span>}
                    {det.is_low_correlation && <span className="bg-yellow-100 text-yellow-800 px-1 rounded">LOW</span>}
                  </td>
                  <td className="p-2 text-xs text-gray-600">
                    {new Date(det.last_seen).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Unresolved Fraud Signals */}
      {signals.length > 0 && (
        <div className="bg-white border rounded p-4">
          <h2 className="text-xl font-bold mb-4">🚨 Signaux de Fraude Non Résolus</h2>
          <div className="space-y-2">
            {signals.slice(0, 10).map((signal) => (
              <div
                key={signal.id}
                className={`p-3 border rounded ${
                  signal.severity === "critical"
                    ? "bg-red-50 border-red-200"
                    : signal.severity === "high"
                    ? "bg-orange-50 border-orange-200"
                    : signal.severity === "medium"
                    ? "bg-yellow-50 border-yellow-200"
                    : "bg-gray-50 border-gray-200"
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-semibold">{signal.signal_type}</div>
                    <div className="text-sm text-gray-600">
                      IP: {signal.ip} | Visit: {signal.visit_id?.slice(0, 8)}... | Score: {signal.score}
                    </div>
                    {signal.evidence && (
                      <div className="text-xs text-gray-500 mt-1">
                        {JSON.stringify(signal.evidence)}
                      </div>
                    )}
                  </div>
                  <span
                    className={`px-2 py-1 rounded text-xs font-bold uppercase ${
                      signal.severity === "critical"
                        ? "bg-red-200 text-red-900"
                        : signal.severity === "high"
                        ? "bg-orange-200 text-orange-900"
                        : signal.severity === "medium"
                        ? "bg-yellow-200 text-yellow-900"
                        : "bg-gray-200 text-gray-900"
                    }`}
                  >
                    {signal.severity}
                  </span>
                </div>
                <div className="text-xs text-gray-500 mt-2">
                  Détecté: {new Date(signal.detected_at).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
