import { Zap, TrendingUp, Clock } from 'lucide-react';

export default function PerformanceMonitorPage() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Zap className="w-8 h-8 text-yellow-500" />
          <h1 className="text-3xl font-bold">Performance Monitor</h1>
        </div>
        <p className="text-gray-600">Speed Insights détaillés - LCP, INP, CLS, TTFB metrics</p>
      </div>

      <div className="grid grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-sm text-gray-600 mb-2">LCP (Largest Contentful Paint)</h3>
          <div className="text-3xl font-bold text-green-600">1.2s</div>
          <p className="text-sm text-gray-500 mt-2">Good (&lt;2.5s)</p>
        </div>

        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-sm text-gray-600 mb-2">INP (Interaction to Next Paint)</h3>
          <div className="text-3xl font-bold text-green-600">84ms</div>
          <p className="text-sm text-gray-500 mt-2">Good (&lt;200ms)</p>
        </div>

        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-sm text-gray-600 mb-2">CLS (Cumulative Layout Shift)</h3>
          <div className="text-3xl font-bold text-green-600">0.05</div>
          <p className="text-sm text-gray-500 mt-2">Good (&lt;0.1)</p>
        </div>

        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-sm text-gray-600 mb-2">TTFB (Time to First Byte)</h3>
          <div className="text-3xl font-bold text-yellow-600">450ms</div>
          <p className="text-sm text-gray-500 mt-2">Needs improvement</p>
        </div>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <h3 className="font-semibold text-yellow-900 mb-2">🚧 En développement</h3>
        <p className="text-yellow-700">
          Cette page utilisera les données de <strong>Vercel Speed Insights</strong> et <strong>telemetry_requests.duration_ms</strong> pour afficher les Core Web Vitals par page, device, et période.
        </p>
      </div>
    </div>
  );
}
