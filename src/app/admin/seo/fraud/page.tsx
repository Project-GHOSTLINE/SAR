'use client';

import { useEffect, useState } from 'react';
import { Shield, AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react';

interface FraudData {
  success: boolean;
  overview: {
    fraud_accuracy: number;
    bots_detected: number;
    clean_sessions: number;
    total_ips_analyzed: number;
    recent_bot_activity: number;
  };
  suspicious_ips: Array<{
    ip: string;
    visitor_ids: string[];
    total_requests: number;
    zero_duration_count: number;
    avg_duration: number;
    unique_pages: number;
    suspicious_score: number;
    reasons: string[];
  }>;
}

export default function FraudDetectionPage() {
  const [data, setData] = useState<FraudData | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(7);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/fraud/live?days=${days}`);
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [days]);

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  if (!data || !data.success) return null;

  const { overview, suspicious_ips } = data;

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Shield className="w-8 h-8 text-orange-500" />
            <h1 className="text-3xl font-bold">Fraud Detection</h1>
          </div>
          <p className="text-gray-600">
            Bot detection from telemetry patterns (last {days} days)
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setDays(1)}
            className={`px-4 py-2 rounded ${days === 1 ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
          >
            1 day
          </button>
          <button
            onClick={() => setDays(7)}
            className={`px-4 py-2 rounded ${days === 7 ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
          >
            7 days
          </button>
          <button
            onClick={() => setDays(30)}
            className={`px-4 py-2 rounded ${days === 30 ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
          >
            30 days
          </button>
          <button onClick={fetchData} className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-700">Fraud Accuracy</h3>
            <CheckCircle className="w-5 h-5 text-green-500" />
          </div>
          <div className="text-3xl font-bold text-green-600">{overview.fraud_accuracy}%</div>
          <p className="text-sm text-gray-500 mt-2">{overview.total_ips_analyzed} IPs analyzed</p>
        </div>

        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-700">Bots Detected</h3>
            <Shield className="w-5 h-5 text-red-500" />
          </div>
          <div className="text-3xl font-bold text-red-600">{overview.bots_detected}</div>
          <p className="text-sm text-gray-500 mt-2">Last {days} days</p>
        </div>

        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-700">Clean Sessions</h3>
            <CheckCircle className="w-5 h-5 text-green-500" />
          </div>
          <div className="text-3xl font-bold text-green-600">{overview.clean_sessions}</div>
          <p className="text-sm text-gray-500 mt-2">Verified legitimate</p>
        </div>
      </div>

      {/* Suspicious IPs Table */}
      <div className="bg-white rounded-lg border">
        <div className="p-4 border-b">
          <h3 className="font-semibold">Suspicious IPs (Top 20)</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold">IP</th>
                <th className="px-4 py-3 text-right text-sm font-semibold">Score</th>
                <th className="px-4 py-3 text-right text-sm font-semibold">Requests</th>
                <th className="px-4 py-3 text-right text-sm font-semibold">Visitor IDs</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Reasons</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {suspicious_ips.map((ip, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-mono">{ip.ip}</td>
                  <td className="px-4 py-3 text-sm text-right">
                    <span className={`font-bold ${
                      ip.suspicious_score >= 80 ? 'text-red-600' :
                      ip.suspicious_score >= 60 ? 'text-orange-600' : 'text-yellow-600'
                    }`}>
                      {ip.suspicious_score}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-right">{ip.total_requests}</td>
                  <td className="px-4 py-3 text-sm text-right">{ip.visitor_ids.length}</td>
                  <td className="px-4 py-3 text-sm">
                    <div className="flex flex-wrap gap-1">
                      {ip.reasons.map((reason, idx) => (
                        <span key={idx} className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs">
                          {reason}
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
