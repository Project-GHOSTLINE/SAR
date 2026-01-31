'use client';

import { useEffect, useState } from 'react';
import { Zap, TrendingUp, Clock, RefreshCw } from 'lucide-react';

interface PerformanceData {
  overall: {
    total_requests: number;
    p50_ms: number;
    p95_ms: number;
    avg_ms: number;
  };
  pages: Array<{
    path: string;
    requests: number;
    p50_ms: number;
    p95_ms: number;
    avg_ms: number;
    status_2xx: number;
    status_4xx: number;
    status_5xx: number;
  }>;
  period_days: number;
}

export default function PerformanceMonitorPage() {
  const [data, setData] = useState<PerformanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(7);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/seo/performance?days=${days}`);
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

  if (!data) return null;

  const getPerformanceColor = (ms: number) => {
    if (ms < 100) return 'text-green-600';
    if (ms < 500) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Zap className="w-8 h-8 text-yellow-500" />
            <h1 className="text-3xl font-bold">Performance Monitor</h1>
          </div>
          <p className="text-gray-600">Response times from telemetry (last {days} days)</p>
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

      <div className="grid grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-sm text-gray-600 mb-2">Total Requests</h3>
          <div className="text-3xl font-bold">{data.overall.total_requests.toLocaleString()}</div>
          <p className="text-sm text-gray-500 mt-2">Last {days} days</p>
        </div>

        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-sm text-gray-600 mb-2">P50 (Median)</h3>
          <div className={`text-3xl font-bold ${getPerformanceColor(data.overall.p50_ms)}`}>
            {data.overall.p50_ms}ms
          </div>
          <p className="text-sm text-gray-500 mt-2">50% faster than</p>
        </div>

        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-sm text-gray-600 mb-2">P95</h3>
          <div className={`text-3xl font-bold ${getPerformanceColor(data.overall.p95_ms)}`}>
            {data.overall.p95_ms}ms
          </div>
          <p className="text-sm text-gray-500 mt-2">95% faster than</p>
        </div>

        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-sm text-gray-600 mb-2">Average</h3>
          <div className={`text-3xl font-bold ${getPerformanceColor(data.overall.avg_ms)}`}>
            {data.overall.avg_ms}ms
          </div>
          <p className="text-sm text-gray-500 mt-2">Mean response</p>
        </div>
      </div>

      <div className="bg-white rounded-lg border">
        <div className="p-4 border-b">
          <h3 className="font-semibold">Performance by Page (Top 50)</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold">Page</th>
                <th className="px-4 py-3 text-right text-sm font-semibold">Requests</th>
                <th className="px-4 py-3 text-right text-sm font-semibold">P50</th>
                <th className="px-4 py-3 text-right text-sm font-semibold">P95</th>
                <th className="px-4 py-3 text-right text-sm font-semibold">Avg</th>
                <th className="px-4 py-3 text-right text-sm font-semibold">2xx</th>
                <th className="px-4 py-3 text-right text-sm font-semibold">4xx</th>
                <th className="px-4 py-3 text-right text-sm font-semibold">5xx</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data.pages.map((page, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-mono">{page.path}</td>
                  <td className="px-4 py-3 text-sm text-right">{page.requests}</td>
                  <td className={`px-4 py-3 text-sm text-right font-semibold ${getPerformanceColor(page.p50_ms)}`}>
                    {page.p50_ms}ms
                  </td>
                  <td className={`px-4 py-3 text-sm text-right font-semibold ${getPerformanceColor(page.p95_ms)}`}>
                    {page.p95_ms}ms
                  </td>
                  <td className={`px-4 py-3 text-sm text-right ${getPerformanceColor(page.avg_ms)}`}>
                    {page.avg_ms}ms
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-green-600">{page.status_2xx}</td>
                  <td className="px-4 py-3 text-sm text-right text-yellow-600">{page.status_4xx}</td>
                  <td className="px-4 py-3 text-sm text-right text-red-600">{page.status_5xx}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
