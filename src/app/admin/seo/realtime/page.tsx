'use client';

import { useEffect, useState } from 'react';
import { Eye, Activity, Users, MousePointer, RefreshCw } from 'lucide-react';

interface RealtimeData {
  active_visitors: number;
  unique_ips: number;
  page_views_5min: number;
  page_views_1min: number;
  conversions_today: number;
  top_pages: Array<{ path: string; views: number }>;
  recent_events: Array<{
    event_name: string;
    page_path: string;
    created_at: string;
    visitor_id: string;
  }>;
  timestamp: string;
}

export default function RealtimeMonitorPage() {
  const [data, setData] = useState<RealtimeData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const res = await fetch('/api/seo/realtime');
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
    const interval = setInterval(fetchData, 5000); // Refresh every 5s
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

  if (!data) return null;

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Eye className="w-8 h-8 text-emerald-500" />
            <h1 className="text-3xl font-bold">Real-time Monitor</h1>
            <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-sm font-semibold rounded-full animate-pulse">
              LIVE
            </span>
          </div>
          <p className="text-gray-600">
            Auto-refresh every 5s • Last update: {new Date(data.timestamp).toLocaleTimeString()}
          </p>
        </div>
        <button
          onClick={fetchData}
          className="px-4 py-2 rounded bg-emerald-100 hover:bg-emerald-200 text-emerald-700 flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh Now
        </button>
      </div>

      <div className="grid grid-cols-5 gap-4 mb-8">
        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Active Visitors</span>
            <Users className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-3xl font-bold text-emerald-600">{data.active_visitors}</div>
          <p className="text-sm text-gray-500 mt-2">Last 5 minutes</p>
        </div>

        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Unique IPs</span>
            <Activity className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-3xl font-bold text-blue-600">{data.unique_ips}</div>
          <p className="text-sm text-gray-500 mt-2">Last 5 minutes</p>
        </div>

        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Page Views</span>
            <MousePointer className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-3xl font-bold text-purple-600">{data.page_views_5min}</div>
          <p className="text-sm text-gray-500 mt-2">Last 5 minutes</p>
        </div>

        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Views (1min)</span>
            <Activity className="w-4 h-4 text-orange-500" />
          </div>
          <div className="text-3xl font-bold text-orange-600">{data.page_views_1min}</div>
          <p className="text-sm text-gray-500 mt-2">Last minute</p>
        </div>

        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Conversions</span>
            <Activity className="w-4 h-4 text-green-500" />
          </div>
          <div className="text-3xl font-bold text-green-600">{data.conversions_today}</div>
          <p className="text-sm text-gray-500 mt-2">Today</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6 mb-6">
        {/* Top Pages */}
        <div className="bg-white rounded-lg border">
          <div className="p-4 border-b">
            <h3 className="font-semibold">Top Pages (Last 5min)</h3>
          </div>
          <div className="p-4">
            {data.top_pages.length === 0 ? (
              <p className="text-gray-500 text-sm">No activity</p>
            ) : (
              <div className="space-y-2">
                {data.top_pages.map((page, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="text-sm font-mono truncate flex-1">{page.path}</span>
                    <span className="text-sm font-semibold text-emerald-600 ml-4">
                      {page.views} views
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent Events */}
        <div className="bg-white rounded-lg border">
          <div className="p-4 border-b">
            <h3 className="font-semibold">Recent Events</h3>
          </div>
          <div className="p-4">
            {data.recent_events.length === 0 ? (
              <p className="text-gray-500 text-sm">No events</p>
            ) : (
              <div className="space-y-2">
                {data.recent_events.map((event, i) => (
                  <div key={i} className="text-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-blue-600">{event.event_name}</span>
                      <span className="text-gray-500 text-xs">
                        {new Date(event.created_at).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="text-gray-600 text-xs truncate">{event.page_path}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 text-sm text-emerald-700">
        <strong>🔄 Auto-refresh:</strong> This page refreshes automatically every 5 seconds to show live activity.
      </div>
    </div>
  );
}
