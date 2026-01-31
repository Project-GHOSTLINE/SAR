'use client';

import { useEffect, useState } from 'react';
import { LineChart, Users, MousePointer, TrendingUp, RefreshCw } from 'lucide-react';

interface GA4Data {
  success: boolean;
  status: string;
  metrics: {
    ga4_users?: number;
    ga4_sessions?: number;
    ga4_conversions?: number;
    ga4_engagement_rate?: number;
  };
}

export default function GoogleAnalytics4Page() {
  const [data, setData] = useState<GA4Data | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/seo/ga4-status');
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
    const interval = setInterval(fetchData, 60000); // Refresh every minute
    return () => clearInterval(interval);
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

  if (!data || !data.success) {
    return (
      <div className="p-8">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h3 className="font-semibold text-yellow-900 mb-2">No GA4 Data</h3>
          <p className="text-yellow-700">GA4 metrics not available yet.</p>
        </div>
      </div>
    );
  }

  const { metrics } = data;

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <LineChart className="w-8 h-8 text-pink-500" />
            <h1 className="text-3xl font-bold">Google Analytics 4</h1>
          </div>
          <p className="text-gray-600">Latest GA4 metrics from seo_unified_daily_plus</p>
        </div>
        <button onClick={fetchData} className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-sm text-gray-600 mb-2">Total Users</h3>
          <div className="text-3xl font-bold text-pink-600">
            {metrics.ga4_users ? metrics.ga4_users.toLocaleString() : 'N/A'}
          </div>
          <p className="text-sm text-gray-500 mt-2">From GA4</p>
        </div>

        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-sm text-gray-600 mb-2">Total Sessions</h3>
          <div className="text-3xl font-bold text-purple-600">
            {metrics.ga4_sessions ? metrics.ga4_sessions.toLocaleString() : 'N/A'}
          </div>
          <p className="text-sm text-gray-500 mt-2">From GA4</p>
        </div>

        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-sm text-gray-600 mb-2">Engagement Rate</h3>
          <div className="text-3xl font-bold text-blue-600">
            {metrics.ga4_engagement_rate ? `${(metrics.ga4_engagement_rate * 100).toFixed(1)}%` : 'N/A'}
          </div>
          <p className="text-sm text-gray-500 mt-2">From GA4</p>
        </div>

        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-sm text-gray-600 mb-2">Conversions</h3>
          <div className="text-3xl font-bold text-green-600">
            {metrics.ga4_conversions ? metrics.ga4_conversions.toLocaleString() : 'N/A'}
          </div>
          <p className="text-sm text-gray-500 mt-2">From GA4</p>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="font-semibold text-blue-900 mb-2">📊 Data Source</h3>
        <p className="text-blue-700">
          This page displays GA4 metrics from the <code className="bg-blue-100 px-2 py-1 rounded">seo_unified_daily_plus</code> view.
          Data is synced daily from Google Analytics 4 and stored in Supabase.
        </p>
      </div>
    </div>
  );
}
