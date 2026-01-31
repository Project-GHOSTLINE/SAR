'use client';

import { useEffect, useState } from 'react';
import { Globe, TrendingUp, Link as LinkIcon, RefreshCw } from 'lucide-react';

interface SemrushData {
  overview: {
    organic_keywords: number;
    organic_traffic: number;
    organic_cost: number;
    paid_keywords: number;
  };
  backlinks: {
    total: number;
    domains: number;
    authority_score: number;
  };
  top_keywords: Array<{
    keyword: string;
    position: number;
    volume: number;
    cpc: number;
    competition: number;
    traffic: number;
  }>;
  domain: string;
  timestamp: string;
}

export default function SemrushPage() {
  const [data, setData] = useState<SemrushData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/seo/semrush');
      if (!res.ok) throw new Error('Failed to fetch');
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

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

  if (error || !data) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h3 className="font-semibold text-red-900 mb-2">Error</h3>
          <p className="text-red-700">{error || 'Failed to load Semrush data'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Globe className="w-8 h-8 text-cyan-500" />
            <h1 className="text-3xl font-bold">Semrush</h1>
          </div>
          <p className="text-gray-600">
            SEO metrics for {data.domain} • Updated: {new Date(data.timestamp).toLocaleString()}
          </p>
        </div>
        <button
          onClick={fetchData}
          className="px-4 py-2 rounded bg-cyan-100 hover:bg-cyan-200 text-cyan-700 flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-sm text-gray-600 mb-2">Organic Keywords</h3>
          <div className="text-3xl font-bold text-cyan-600">{data.overview.organic_keywords.toLocaleString()}</div>
          <p className="text-sm text-gray-500 mt-2">Ranking keywords</p>
        </div>

        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-sm text-gray-600 mb-2">Organic Traffic</h3>
          <div className="text-3xl font-bold text-blue-600">{data.overview.organic_traffic.toLocaleString()}</div>
          <p className="text-sm text-gray-500 mt-2">Monthly visits</p>
        </div>

        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-sm text-gray-600 mb-2">Authority Score</h3>
          <div className="text-3xl font-bold text-purple-600">{data.backlinks.authority_score}</div>
          <p className="text-sm text-gray-500 mt-2">/100</p>
        </div>

        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-sm text-gray-600 mb-2">Total Backlinks</h3>
          <div className="text-3xl font-bold text-green-600">{data.backlinks.total.toLocaleString()}</div>
          <p className="text-sm text-gray-500 mt-2">From {data.backlinks.domains} domains</p>
        </div>
      </div>

      {/* Backlinks Details */}
      <div className="bg-white rounded-lg border p-6 mb-8">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <LinkIcon className="w-5 h-5" />
          Backlinks Profile
        </h3>
        <div className="grid grid-cols-3 gap-6">
          <div>
            <div className="text-sm text-gray-600 mb-1">Total Backlinks</div>
            <div className="text-2xl font-bold">{data.backlinks.total.toLocaleString()}</div>
          </div>
          <div>
            <div className="text-sm text-gray-600 mb-1">Referring Domains</div>
            <div className="text-2xl font-bold">{data.backlinks.domains.toLocaleString()}</div>
          </div>
          <div>
            <div className="text-sm text-gray-600 mb-1">Authority Score</div>
            <div className="text-2xl font-bold">{data.backlinks.authority_score}/100</div>
          </div>
        </div>
      </div>

      {/* Top Keywords */}
      <div className="bg-white rounded-lg border">
        <div className="p-4 border-b">
          <h3 className="font-semibold">Top Organic Keywords (Top 20)</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold">Keyword</th>
                <th className="px-4 py-3 text-right text-sm font-semibold">Position</th>
                <th className="px-4 py-3 text-right text-sm font-semibold">Volume</th>
                <th className="px-4 py-3 text-right text-sm font-semibold">Traffic</th>
                <th className="px-4 py-3 text-right text-sm font-semibold">CPC</th>
                <th className="px-4 py-3 text-right text-sm font-semibold">Competition</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data.top_keywords.map((kw, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm">{kw.keyword}</td>
                  <td className="px-4 py-3 text-sm text-right">
                    <span
                      className={`font-semibold ${
                        kw.position <= 3 ? 'text-green-600' : kw.position <= 10 ? 'text-blue-600' : 'text-gray-600'
                      }`}
                    >
                      #{kw.position}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-right">{kw.volume.toLocaleString()}</td>
                  <td className="px-4 py-3 text-sm text-right">{kw.traffic.toFixed(2)}</td>
                  <td className="px-4 py-3 text-sm text-right">${kw.cpc.toFixed(2)}</td>
                  <td className="px-4 py-3 text-sm text-right">
                    <span
                      className={`px-2 py-1 rounded text-xs font-semibold ${
                        kw.competition > 0.7 ? 'bg-red-100 text-red-700' : kw.competition > 0.4 ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'
                      }`}
                    >
                      {(kw.competition * 100).toFixed(0)}%
                    </span>
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
