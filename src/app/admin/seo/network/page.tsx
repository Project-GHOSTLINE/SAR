import { Users, Network, Database } from 'lucide-react';

export default function NetworkGraphPage() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Network className="w-8 h-8 text-indigo-500" />
          <h1 className="text-3xl font-bold">Network Graph</h1>
        </div>
        <p className="text-gray-600">
          Visualisation des relations: IP ↔ sessions ↔ users ↔ clients
        </p>
      </div>

      <div className="grid grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-700">Nodes</h3>
            <Users className="w-5 h-5 text-indigo-500" />
          </div>
          <div className="text-3xl font-bold text-indigo-600">5,284</div>
          <p className="text-sm text-gray-500 mt-2">Entities tracked</p>
        </div>

        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-700">Connections</h3>
            <Network className="w-5 h-5 text-purple-500" />
          </div>
          <div className="text-3xl font-bold text-purple-600">12,847</div>
          <p className="text-sm text-gray-500 mt-2">Relationships</p>
        </div>

        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-700">Clusters</h3>
            <Database className="w-5 h-5 text-blue-500" />
          </div>
          <div className="text-3xl font-bold text-blue-600">47</div>
          <p className="text-sm text-gray-500 mt-2">Identity groups</p>
        </div>
      </div>

      <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-6">
        <h3 className="font-semibold text-indigo-900 mb-2">🚧 En développement</h3>
        <p className="text-indigo-700 mb-4">
          Cette page utilisera <code className="bg-indigo-100 px-2 py-1 rounded">visitor_identity_graph</code>
          {' '}et <code className="bg-indigo-100 px-2 py-1 rounded">network_correlation</code>
          {' '}pour visualiser le graphe d'identité complet.
        </p>
        <div className="mt-4 text-sm text-indigo-600">
          <strong>Relations trackées:</strong>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>IP → visitor_id (multi-IP tracking)</li>
            <li>visitor_id → visit_id (sessions)</li>
            <li>visit_id → user_id (auth)</li>
            <li>visitor_id → application_id (submissions)</li>
            <li>application_id → client_id (conversions)</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
