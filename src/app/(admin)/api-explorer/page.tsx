'use client';

import { useEffect, useState } from 'react';
import {
  Search, Activity, AlertTriangle, Database, Zap, Globe,
  Clock, TrendingUp, RefreshCw, ExternalLink, Code, FileCode
} from 'lucide-react';
import AdminNav from '@/components/admin/AdminNav';

interface Route {
  id: string;
  path: string;
  methods: string[];
  description: string;
  auth: string;
  external_calls: string[];
  tables_touched: string[];
  fileRef: { file: string; lines: string };
  stats?: RouteSummary;
}

interface RouteSummary {
  method: string;
  path: string;
  hits: number;
  avg_ms: number;
  p95_ms: number;
  errors: number;
  error_rate_pct: number;
  avg_db_calls: number;
  p95_db_ms: number;
  last_seen: string;
}

interface LiveRequest {
  trace_id: string;
  created_at: string;
  method: string;
  path: string;
  status: number;
  duration_ms: number;
  db_call_count: number;
  error_code?: string;
  visitor_id?: string;
  session_id?: string;
}

export default function ApiExplorerPage() {
  const [catalog, setCatalog] = useState<Route[]>([]);
  const [summary, setSummary] = useState<RouteSummary[]>([]);
  const [liveRequests, setLiveRequests] = useState<LiveRequest[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'errors' | 'slow' | 'db-heavy'>('all');
  const [loading, setLoading] = useState(true);

  // Load catalog
  useEffect(() => {
    fetch('/api/admin/api-explorer/catalog')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setCatalog(data.routes || []);
        }
      })
      .catch(console.error);
  }, []);

  // Load summary
  const loadSummary = async () => {
    try {
      const res = await fetch('/api/admin/api-explorer/summary?days=7');
      const data = await res.json();
      if (data.success) {
        setSummary(data.routes || []);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Load live feed
  const loadLiveFeed = async () => {
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      const { data } = await supabase
        .from('telemetry_requests')
        .select('trace_id, created_at, method, path, status, duration_ms, db_call_count, error_code, visitor_id, session_id')
        .order('created_at', { ascending: false })
        .limit(200);

      setLiveRequests(data || []);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    loadSummary();
    loadLiveFeed();

    // Refresh live feed every 2 seconds
    const interval = setInterval(loadLiveFeed, 2000);
    return () => clearInterval(interval);
  }, []);

  // Merge catalog with summary
  const routesWithStats = catalog.map(route => {
    const stats = summary.find(s =>
      s.method === route.methods[0] &&
      (s.path === route.path || s.path.includes(route.path.split(':')[0]))
    );
    return { ...route, stats };
  });

  // Filter routes
  const filteredRoutes = routesWithStats.filter(route => {
    // Search filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const match = route.path.toLowerCase().includes(q) ||
        route.description.toLowerCase().includes(q) ||
        route.tables_touched.some(t => t.toLowerCase().includes(q));
      if (!match) return false;
    }

    // Type filter
    if (filter === 'errors' && (!route.stats || route.stats.errors === 0)) return false;
    if (filter === 'slow' && (!route.stats || route.stats.p95_ms < 500)) return false;
    if (filter === 'db-heavy' && (!route.stats || route.stats.avg_db_calls < 5)) return false;

    return true;
  });

  const getMethodColor = (method: string) => {
    const colors: Record<string, string> = {
      GET: 'bg-blue-100 text-blue-700',
      POST: 'bg-green-100 text-green-700',
      PUT: 'bg-yellow-100 text-yellow-700',
      PATCH: 'bg-orange-100 text-orange-700',
      DELETE: 'bg-red-100 text-red-700'
    };
    return colors[method] || 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNav currentPage="/admin/api-explorer" />

      <div className="p-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl">
                <Code className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">API Explorer</h1>
                <p className="text-gray-600">
                  {catalog.length} routes cataloguées • {summary.length} avec traffic
                </p>
              </div>
            </div>
            <button
              onClick={() => { loadSummary(); loadLiveFeed(); }}
              className="flex items-center gap-2 px-4 py-2 bg-white border rounded-lg hover:bg-gray-50"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>

          {/* Stats Overview */}
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-white rounded-lg border p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Total Requests (7d)</span>
                <Activity className="w-4 h-4 text-blue-500" />
              </div>
              <div className="text-2xl font-bold text-blue-600">
                {summary.reduce((sum, r) => sum + r.hits, 0).toLocaleString()}
              </div>
            </div>
            <div className="bg-white rounded-lg border p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Error Rate</span>
                <AlertTriangle className="w-4 h-4 text-red-500" />
              </div>
              <div className="text-2xl font-bold text-red-600">
                {summary.length > 0
                  ? ((summary.reduce((sum, r) => sum + r.errors, 0) /
                    summary.reduce((sum, r) => sum + r.hits, 0)) * 100).toFixed(2)
                  : 0}%
              </div>
            </div>
            <div className="bg-white rounded-lg border p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Avg P95 Latency</span>
                <Clock className="w-4 h-4 text-purple-500" />
              </div>
              <div className="text-2xl font-bold text-purple-600">
                {summary.length > 0
                  ? Math.round(summary.reduce((sum, r) => sum + r.p95_ms, 0) / summary.length)
                  : 0}ms
              </div>
            </div>
            <div className="bg-white rounded-lg border p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">DB Intensive</span>
                <Database className="w-4 h-4 text-green-500" />
              </div>
              <div className="text-2xl font-bold text-green-600">
                {summary.filter(r => r.avg_db_calls > 5).length}
              </div>
            </div>
          </div>
        </div>

        {/* Main Layout: 3 columns */}
        <div className="grid grid-cols-12 gap-6">
          {/* LEFT: Routes List */}
          <div className="col-span-4 bg-white rounded-lg border">
            <div className="p-4 border-b">
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search routes..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              {/* Filters */}
              <div className="flex gap-2">
                <button
                  onClick={() => setFilter('all')}
                  className={`px-3 py-1 text-sm rounded ${filter === 'all' ? 'bg-purple-500 text-white' : 'bg-gray-100'}`}
                >
                  All
                </button>
                <button
                  onClick={() => setFilter('errors')}
                  className={`px-3 py-1 text-sm rounded ${filter === 'errors' ? 'bg-red-500 text-white' : 'bg-gray-100'}`}
                >
                  Errors
                </button>
                <button
                  onClick={() => setFilter('slow')}
                  className={`px-3 py-1 text-sm rounded ${filter === 'slow' ? 'bg-orange-500 text-white' : 'bg-gray-100'}`}
                >
                  Slow
                </button>
                <button
                  onClick={() => setFilter('db-heavy')}
                  className={`px-3 py-1 text-sm rounded ${filter === 'db-heavy' ? 'bg-green-500 text-white' : 'bg-gray-100'}`}
                >
                  DB Heavy
                </button>
              </div>
            </div>

            <div className="overflow-y-auto h-[calc(100vh-400px)]">
              {filteredRoutes.map(route => (
                <button
                  key={route.id}
                  onClick={() => setSelectedRoute(route)}
                  className={`w-full p-4 border-b text-left hover:bg-gray-50 transition ${
                    selectedRoute?.id === route.id ? 'bg-purple-50 border-l-4 border-l-purple-500' : ''
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-2 py-0.5 text-xs font-mono rounded ${getMethodColor(route.methods[0])}`}>
                      {route.methods[0]}
                    </span>
                    {route.stats && route.stats.errors > 0 && (
                      <AlertTriangle className="w-4 h-4 text-red-500" />
                    )}
                  </div>
                  <div className="font-mono text-sm text-gray-900 mb-1">{route.path}</div>
                  <div className="text-xs text-gray-600 truncate">{route.description}</div>
                  {route.stats && (
                    <div className="mt-2 flex gap-3 text-xs text-gray-500">
                      <span>{route.stats.hits.toLocaleString()} hits</span>
                      <span>{Math.round(route.stats.p95_ms)}ms p95</span>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* CENTER: Route Details */}
          <div className="col-span-5 bg-white rounded-lg border">
            {selectedRoute ? (
              <div className="p-6">
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-3 py-1 text-sm font-mono rounded ${getMethodColor(selectedRoute.methods[0])}`}>
                      {selectedRoute.methods[0]}
                    </span>
                    <h2 className="text-xl font-mono font-bold">{selectedRoute.path}</h2>
                  </div>
                  <p className="text-gray-600">{selectedRoute.description}</p>
                </div>

                {/* Auth */}
                <div className="mb-4">
                  <h3 className="text-sm font-semibold mb-2">Authentication</h3>
                  <span className={`px-2 py-1 text-xs rounded ${
                    selectedRoute.auth === 'none' ? 'bg-gray-100' : 'bg-green-100 text-green-700'
                  }`}>
                    {selectedRoute.auth}
                  </span>
                </div>

                {/* Tables */}
                {selectedRoute.tables_touched.length > 0 && (
                  <div className="mb-4">
                    <h3 className="text-sm font-semibold mb-2">Database Tables</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedRoute.tables_touched.map(table => (
                        <span key={table} className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded font-mono">
                          {table}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* External calls */}
                {selectedRoute.external_calls.length > 0 && (
                  <div className="mb-4">
                    <h3 className="text-sm font-semibold mb-2">External Calls</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedRoute.external_calls.map(call => (
                        <span key={call} className="px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded">
                          {call}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Runtime Stats */}
                {selectedRoute.stats && (
                  <div className="mb-4">
                    <h3 className="text-sm font-semibold mb-3">Runtime Stats (7d)</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 bg-gray-50 rounded">
                        <div className="text-xs text-gray-600">Total Requests</div>
                        <div className="text-lg font-bold">{selectedRoute.stats.hits.toLocaleString()}</div>
                      </div>
                      <div className="p-3 bg-gray-50 rounded">
                        <div className="text-xs text-gray-600">Error Rate</div>
                        <div className="text-lg font-bold text-red-600">{selectedRoute.stats.error_rate_pct}%</div>
                      </div>
                      <div className="p-3 bg-gray-50 rounded">
                        <div className="text-xs text-gray-600">P95 Latency</div>
                        <div className="text-lg font-bold">{Math.round(selectedRoute.stats.p95_ms)}ms</div>
                      </div>
                      <div className="p-3 bg-gray-50 rounded">
                        <div className="text-xs text-gray-600">Avg DB Calls</div>
                        <div className="text-lg font-bold">{Math.round(selectedRoute.stats.avg_db_calls)}</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* File Reference */}
                <div className="pt-4 border-t">
                  <a
                    href={`vscode://file${process.cwd()}/src/app/${selectedRoute.fileRef.file}`}
                    className="flex items-center gap-2 text-sm text-purple-600 hover:text-purple-700"
                  >
                    <FileCode className="w-4 h-4" />
                    Open in Editor: {selectedRoute.fileRef.file}
                  </a>
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400">
                <div className="text-center">
                  <Code className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Select a route to view details</p>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT: Live Feed */}
          <div className="col-span-3 bg-white rounded-lg border">
            <div className="p-4 border-b">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <h3 className="font-semibold">Live Requests</h3>
              </div>
              <p className="text-xs text-gray-500 mt-1">Last 200 • Refresh 2s</p>
            </div>

            <div className="overflow-y-auto h-[calc(100vh-400px)]">
              {liveRequests.map((req, i) => (
                <div key={i} className="p-3 border-b hover:bg-gray-50 cursor-pointer text-xs">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`px-1.5 py-0.5 text-[10px] font-mono rounded ${getMethodColor(req.method)}`}>
                      {req.method}
                    </span>
                    <span className={`px-1.5 py-0.5 text-[10px] rounded ${
                      req.status >= 500 ? 'bg-red-100 text-red-700' :
                      req.status >= 400 ? 'bg-yellow-100 text-yellow-700' :
                      'bg-green-100 text-green-700'
                    }`}>
                      {req.status}
                    </span>
                    <span className="text-[10px] text-gray-500">{req.duration_ms}ms</span>
                  </div>
                  <div className="font-mono text-[10px] text-gray-700 truncate">{req.path}</div>
                  <div className="text-[10px] text-gray-400 mt-1">
                    {new Date(req.created_at).toLocaleTimeString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
