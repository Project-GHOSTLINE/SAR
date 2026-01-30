import { Eye, Activity, Users, MousePointer } from 'lucide-react';

export default function RealtimeMonitorPage() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Eye className="w-8 h-8 text-emerald-500" />
          <h1 className="text-3xl font-bold">Real-time Monitor</h1>
          <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-sm font-semibold rounded-full">
            LIVE
          </span>
        </div>
        <p className="text-gray-600">Monitoring en temps réel des visites, événements, conversions</p>
      </div>

      <div className="grid grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-sm text-gray-600 mb-2">Active Visitors</h3>
          <div className="text-3xl font-bold text-emerald-600">47</div>
          <p className="text-sm text-gray-500 mt-2">Right now</p>
        </div>

        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-sm text-gray-600 mb-2">Page Views (5min)</h3>
          <div className="text-3xl font-bold text-blue-600">124</div>
          <p className="text-sm text-gray-500 mt-2">Last 5 minutes</p>
        </div>

        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-sm text-gray-600 mb-2">Events (1min)</h3>
          <div className="text-3xl font-bold text-purple-600">18</div>
          <p className="text-sm text-gray-500 mt-2">Last minute</p>
        </div>

        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-sm text-gray-600 mb-2">Conversions (today)</h3>
          <div className="text-3xl font-bold text-green-600">7</div>
          <p className="text-sm text-green-500 mt-2">+2 last hour</p>
        </div>
      </div>

      <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-6">
        <h3 className="font-semibold text-emerald-900 mb-2">🚧 En développement</h3>
        <p className="text-emerald-700 mb-4">
          Cette page utilisera <strong>telemetry_requests</strong> avec WebSocket ou polling pour afficher l'activité en temps réel.
        </p>
        <div className="text-sm text-emerald-600">
          <strong>Features prévues:</strong>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>Active visitors map (géolocalisation)</li>
            <li>Live event stream</li>
            <li>Conversion funnel en temps réel</li>
            <li>Top pages actuellement visitées</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
