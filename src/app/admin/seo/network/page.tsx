'use client';

import { useEffect, useState } from 'react';
import { Users, Network, Database, RefreshCw } from 'lucide-react';

interface NetworkData {
  success: boolean;
  nodes: Array<{ id: string }>;
  edges: Array<{ source: string; target: string }>;
}

export default function NetworkGraphPage() {
  const [data, setData] = useState<NetworkData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/seo/metrics');
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

  if (!data || !data.success || !data.nodes || !data.edges) return null;

  // Calculate stats
  const totalNodes = (data.nodes || []).length;
  const totalEdges = (data.edges || []).length;

  // Count IPs (nodes that look like IPs)
  const ipNodes = (data.nodes || []).filter(n => /^\d+\.\d+\.\d+\.\d+$/.test(n.id));
  const pageNodes = (data.nodes || []).filter(n => n.id.startsWith('/'));

  // Simple clustering: count unique IPs
  const uniqueIPs = new Set(ipNodes.map(n => n.id)).size;

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Network className="w-8 h-8 text-indigo-500" />
            <h1 className="text-3xl font-bold">Network Graph</h1>
          </div>
          <p className="text-gray-600">
            IP ↔ Page relationships from telemetry_requests
          </p>
        </div>
        <button onClick={fetchData} className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-700">Nodes</h3>
            <Users className="w-5 h-5 text-indigo-500" />
          </div>
          <div className="text-3xl font-bold text-indigo-600">{totalNodes.toLocaleString()}</div>
          <p className="text-sm text-gray-500 mt-2">
            {ipNodes.length} IPs, {pageNodes.length} pages
          </p>
        </div>

        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-700">Connections</h3>
            <Network className="w-5 h-5 text-purple-500" />
          </div>
          <div className="text-3xl font-bold text-purple-600">{totalEdges.toLocaleString()}</div>
          <p className="text-sm text-gray-500 mt-2">IP → Page relationships</p>
        </div>

        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-700">Unique IPs</h3>
            <Database className="w-5 h-5 text-blue-500" />
          </div>
          <div className="text-3xl font-bold text-blue-600">{uniqueIPs}</div>
          <p className="text-sm text-gray-500 mt-2">Distinct sources</p>
        </div>
      </div>

      {/* Sample Connections */}
      <div className="bg-white rounded-lg border">
        <div className="p-4 border-b">
          <h3 className="font-semibold">Recent Connections (Sample)</h3>
        </div>
        <div className="p-4">
          <div className="space-y-2">
            {(data.edges || []).slice(0, 20).map((edge, i) => (
              <div key={i} className="flex items-center gap-4 p-3 bg-gray-50 rounded">
                <span className="font-mono text-sm text-blue-600">{edge.source}</span>
                <span className="text-gray-400">→</span>
                <span className="font-mono text-sm text-gray-700 flex-1">{edge.target}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 bg-indigo-50 border border-indigo-200 rounded-lg p-6">
        <h3 className="font-semibold text-indigo-900 mb-2">📊 Data Source</h3>
        <p className="text-indigo-700 mb-4">
          Network graph built from <code className="bg-indigo-100 px-2 py-1 rounded">telemetry_requests</code> table.
          Shows relationships between IPs and pages they visited.
        </p>
        <div className="mt-4 text-sm text-indigo-600">
          <strong>Graph contains:</strong>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>IP addresses as source nodes</li>
            <li>Page paths as target nodes</li>
            <li>Request connections as edges</li>
            <li>Limited to 1000 most recent requests</li>
            <li>Limited to 500 edges for performance</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
