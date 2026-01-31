'use client';

import { useEffect, useState } from 'react';
import { catalog } from '@/data/catalog-export';

export default function TestDataPage() {
  const [summary, setSummary] = useState<any>(null);
  const [liveData, setLiveData] = useState<any[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<any>(null);

  useEffect(() => {
    // Simuler des données de summary (en attendant la vraie API)
    const mockSummary = catalog.routes.slice(0, 20).map((route: any) => ({
      method: route.methods[0],
      path: route.path,
      hits: Math.floor(Math.random() * 10000),
      avg_ms: Math.floor(Math.random() * 200),
      p95_ms: Math.floor(Math.random() * 500),
      errors: Math.floor(Math.random() * 50),
      error_rate_pct: (Math.random() * 5).toFixed(2),
      avg_db_calls: Math.floor(Math.random() * 10),
      p95_db_ms: Math.floor(Math.random() * 100),
      last_seen: new Date().toISOString()
    }));
    setSummary(mockSummary);

    // Simuler live data
    const mockLive = Array.from({ length: 50 }, (_, i) => ({
      trace_id: `trace-${i}`,
      created_at: new Date(Date.now() - i * 5000).toISOString(),
      method: ['GET', 'POST', 'PUT', 'DELETE'][Math.floor(Math.random() * 4)],
      path: catalog.routes[Math.floor(Math.random() * catalog.routes.length)].path,
      status: [200, 201, 400, 404, 500][Math.floor(Math.random() * 5)],
      duration_ms: Math.floor(Math.random() * 500),
      db_call_count: Math.floor(Math.random() * 5),
      visitor_id: `visitor-${Math.floor(Math.random() * 100)}`
    }));
    setLiveData(mockLive);
  }, []);

  const routesWithStats = catalog.routes.map((route: any) => {
    const stats = summary?.find((s: any) => s.path === route.path && s.method === route.methods[0]);
    return { ...route, stats };
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
    <div className="min-h-screen bg-gray-50 p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          🔍 API Explorer - DONNÉES RÉELLES
        </h1>
        <p className="text-gray-600">
          {catalog.totalRoutes} routes cataloguées • Scanné le {new Date(catalog.scannedAt).toLocaleString()}
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-lg border p-4">
          <div className="text-sm text-gray-600 mb-1">Total Routes</div>
          <div className="text-3xl font-bold text-blue-600">{catalog.totalRoutes}</div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="text-sm text-gray-600 mb-1">Avec Auth</div>
          <div className="text-3xl font-bold text-green-600">
            {catalog.routes.filter((r: any) => !r.auth.includes('Public')).length}
          </div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="text-sm text-gray-600 mb-1">Tables Uniques</div>
          <div className="text-3xl font-bold text-purple-600">
            {[...new Set(catalog.routes.flatMap((r: any) => r.tablesTouched))].length}
          </div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="text-sm text-gray-600 mb-1">Services Externes</div>
          <div className="text-3xl font-bold text-orange-600">
            {[...new Set(catalog.routes.flatMap((r: any) => r.externalCalls))].length}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-12 gap-6">
        {/* Left: Routes List */}
        <div className="col-span-4 bg-white rounded-lg border">
          <div className="p-4 border-b">
            <h2 className="font-bold text-lg">Routes Cataloguées</h2>
            <p className="text-sm text-gray-600">Click pour voir détails</p>
          </div>
          <div className="overflow-y-auto h-[600px]">
            {routesWithStats.slice(0, 50).map((route: any) => (
              <button
                key={route.id}
                onClick={() => setSelectedRoute(route)}
                className={`w-full p-4 border-b text-left hover:bg-gray-50 transition ${
                  selectedRoute?.id === route.id ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className={`px-2 py-0.5 text-xs font-mono rounded ${getMethodColor(route.methods[0])}`}>
                    {route.methods[0]}
                  </span>
                  {route.tablesTouched.length > 0 && (
                    <span className="text-xs text-gray-500">
                      {route.tablesTouched.length} tables
                    </span>
                  )}
                </div>
                <div className="font-mono text-sm text-gray-900 mb-1 truncate">{route.path}</div>
                <div className="text-xs text-gray-600 truncate">{route.description}</div>
                {route.stats && (
                  <div className="mt-2 flex gap-3 text-xs text-gray-500">
                    <span>{route.stats.hits.toLocaleString()} hits</span>
                    <span>{Math.round(route.stats.p95_ms)}ms</span>
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Center: Route Details */}
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
                <h3 className="text-sm font-semibold mb-2">🔐 Authentication</h3>
                <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded">
                  {selectedRoute.auth}
                </span>
              </div>

              {/* Tables */}
              {selectedRoute.tablesTouched.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-sm font-semibold mb-2">🗄️ Database Tables ({selectedRoute.tablesTouched.length})</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedRoute.tablesTouched.map((table: string) => (
                      <span key={table} className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded font-mono">
                        {table}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* External Calls */}
              {selectedRoute.externalCalls.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-sm font-semibold mb-2">🌐 External Services ({selectedRoute.externalCalls.length})</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedRoute.externalCalls.map((call: string) => (
                      <span key={call} className="px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded">
                        {call}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Middleware */}
              {selectedRoute.middleware.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-sm font-semibold mb-2">⚙️ Middleware</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedRoute.middleware.map((mw: string) => (
                      <span key={mw} className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded">
                        {mw}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Output Codes */}
              <div className="mb-4">
                <h3 className="text-sm font-semibold mb-2">📤 Output Codes</h3>
                <div className="flex gap-2">
                  {selectedRoute.outputCodes.map((code: number) => (
                    <span
                      key={code}
                      className={`px-2 py-1 text-xs rounded font-mono ${
                        code >= 500 ? 'bg-red-100 text-red-700' :
                        code >= 400 ? 'bg-yellow-100 text-yellow-700' :
                        'bg-green-100 text-green-700'
                      }`}
                    >
                      {code}
                    </span>
                  ))}
                </div>
              </div>

              {/* File Reference */}
              <div className="pt-4 border-t">
                <div className="text-sm text-gray-600">
                  <strong>📁 File:</strong> {selectedRoute.fileRef.file}
                </div>
                <div className="text-sm text-gray-600">
                  <strong>📄 Lines:</strong> {selectedRoute.fileRef.lines}
                </div>
              </div>

              {/* Stats if available */}
              {selectedRoute.stats && (
                <div className="mt-6 pt-4 border-t">
                  <h3 className="text-sm font-semibold mb-3">📊 Runtime Stats (Simulées)</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-gray-50 rounded">
                      <div className="text-xs text-gray-600">Hits</div>
                      <div className="text-lg font-bold">{selectedRoute.stats.hits.toLocaleString()}</div>
                    </div>
                    <div className="p-3 bg-gray-50 rounded">
                      <div className="text-xs text-gray-600">P95 Latency</div>
                      <div className="text-lg font-bold">{Math.round(selectedRoute.stats.p95_ms)}ms</div>
                    </div>
                    <div className="p-3 bg-gray-50 rounded">
                      <div className="text-xs text-gray-600">Errors</div>
                      <div className="text-lg font-bold text-red-600">{selectedRoute.stats.errors}</div>
                    </div>
                    <div className="p-3 bg-gray-50 rounded">
                      <div className="text-xs text-gray-600">DB Calls</div>
                      <div className="text-lg font-bold">{Math.round(selectedRoute.stats.avg_db_calls)}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-gray-400">
              <div className="text-center">
                <div className="text-6xl mb-4">🔍</div>
                <p className="text-lg">Sélectionne une route</p>
                <p className="text-sm">pour voir les détails</p>
              </div>
            </div>
          )}
        </div>

        {/* Right: Mock Live Feed */}
        <div className="col-span-3 bg-white rounded-lg border">
          <div className="p-4 border-b">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <h3 className="font-semibold">Live Requests (Mock)</h3>
            </div>
            <p className="text-xs text-gray-500 mt-1">{liveData.length} requêtes</p>
          </div>
          <div className="overflow-y-auto h-[600px]">
            {liveData.map((req, i) => (
              <div key={i} className="p-3 border-b hover:bg-gray-50 text-xs">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`px-1.5 py-0.5 text-[10px] font-mono rounded ${getMethodColor(req.method)}`}>
                    {req.method}
                  </span>
                  <span className={`px-1.5 py-0.5 text-[10px] rounded font-mono ${
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

      {/* Top Tables */}
      <div className="mt-8 bg-white rounded-lg border p-6">
        <h2 className="text-lg font-bold mb-4">📊 Top 10 Tables les Plus Utilisées</h2>
        <div className="grid grid-cols-2 gap-4">
          {Object.entries(
            catalog.routes.reduce((acc: any, route: any) => {
              route.tablesTouched.forEach((table: string) => {
                acc[table] = (acc[table] || 0) + 1;
              });
              return acc;
            }, {})
          )
            .sort((a: any, b: any) => b[1] - a[1])
            .slice(0, 10)
            .map(([table, count]: any) => (
              <div key={table} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                <span className="font-mono text-sm">{table}</span>
                <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded font-bold">
                  {count} routes
                </span>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
