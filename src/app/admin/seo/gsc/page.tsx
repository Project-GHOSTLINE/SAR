'use client';

import { useEffect, useState } from 'react';
import { Search, TrendingUp, MousePointer, RefreshCw } from 'lucide-react';

interface GscData {
  success: boolean;
  data: {
    overview: {
      total_clicks: number;
      total_impressions: number;
      avg_ctr: number;
      avg_position: number;
    };
    topQueries: Array<{
      query: string;
      clicks: number;
      impressions: number;
      ctr: number;
      position: number;
    }>;
    topPages: Array<{
      page: string;
      clicks: number;
      impressions: number;
      ctr: number;
      position: number;
    }>;
  };
}

export default function GoogleSearchConsolePage() {
  const [data, setData] = useState<GscData | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/seo/gsc?days=${days}`);
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

  if (!data || !data.success || !data.data) return null;

  const { overview, topQueries, topPages } = data.data;

  if (!overview) return null;

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Search className="w-8 h-8 text-teal-500" />
            <h1 className="text-3xl font-bold">Google Search Console</h1>
          </div>
          <p className="text-gray-600">Top queries, pages, CTR, position moyenne (last {days} days)</p>
        </div>
        <div className="flex gap-2">
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
          <button
            onClick={() => setDays(90)}
            className={`px-4 py-2 rounded ${days === 90 ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
          >
            90 days
          </button>
          <button onClick={fetchData} className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-sm text-gray-600 mb-2">Total Impressions</h3>
          <div className="text-3xl font-bold text-teal-600">{(overview.total_impressions || 0).toLocaleString()}</div>
          <p className="text-sm text-gray-500 mt-2">Last {days} days</p>
        </div>

        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-sm text-gray-600 mb-2">Total Clicks</h3>
          <div className="text-3xl font-bold text-blue-600">{(overview.total_clicks || 0).toLocaleString()}</div>
          <p className="text-sm text-gray-500 mt-2">Last {days} days</p>
        </div>

        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-sm text-gray-600 mb-2">CTR Moyen</h3>
          <div className="text-3xl font-bold text-purple-600">{((overview.avg_ctr || 0) * 100).toFixed(2)}%</div>
          <p className="text-sm text-gray-500 mt-2">Click-through rate</p>
        </div>

        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-sm text-gray-600 mb-2">Position Moyenne</h3>
          <div className="text-3xl font-bold text-orange-600">{(overview.avg_position || 0).toFixed(1)}</div>
          <p className="text-sm text-gray-500 mt-2">Average position</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Top Queries */}
        <div className="bg-white rounded-lg border">
          <div className="p-4 border-b">
            <h3 className="font-semibold">Top Queries</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Query</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold">Clicks</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold">Impressions</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold">CTR</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold">Position</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {(topQueries || []).slice(0, 20).map((q, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm">{q.query}</td>
                    <td className="px-4 py-3 text-sm text-right">{q.clicks}</td>
                    <td className="px-4 py-3 text-sm text-right">{q.impressions}</td>
                    <td className="px-4 py-3 text-sm text-right">{(q.ctr * 100).toFixed(2)}%</td>
                    <td className="px-4 py-3 text-sm text-right">{q.position.toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top Pages */}
        <div className="bg-white rounded-lg border">
          <div className="p-4 border-b">
            <h3 className="font-semibold">Top Pages</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Page</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold">Clicks</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold">Impressions</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold">CTR</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold">Position</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {(topPages || []).slice(0, 20).map((p, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-mono truncate max-w-xs">{p.page}</td>
                    <td className="px-4 py-3 text-sm text-right">{p.clicks}</td>
                    <td className="px-4 py-3 text-sm text-right">{p.impressions}</td>
                    <td className="px-4 py-3 text-sm text-right">{(p.ctr * 100).toFixed(2)}%</td>
                    <td className="px-4 py-3 text-sm text-right">{p.position.toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
