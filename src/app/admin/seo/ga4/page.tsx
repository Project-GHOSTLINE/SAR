import { LineChart, Users, MousePointer, TrendingUp } from 'lucide-react';

export default function GoogleAnalytics4Page() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <LineChart className="w-8 h-8 text-pink-500" />
          <h1 className="text-3xl font-bold">Google Analytics 4</h1>
        </div>
        <p className="text-gray-600">Sessions, events, conversions, engagement rate</p>
      </div>

      <div className="grid grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-sm text-gray-600 mb-2">Total Sessions</h3>
          <div className="text-3xl font-bold text-pink-600">12,847</div>
          <p className="text-sm text-green-500 mt-2">+15% vs last month</p>
        </div>

        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-sm text-gray-600 mb-2">Total Events</h3>
          <div className="text-3xl font-bold text-purple-600">58.4K</div>
          <p className="text-sm text-green-500 mt-2">+22% vs last month</p>
        </div>

        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-sm text-gray-600 mb-2">Engagement Rate</h3>
          <div className="text-3xl font-bold text-blue-600">68%</div>
          <p className="text-sm text-gray-500 mt-2">Above average</p>
        </div>

        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-sm text-gray-600 mb-2">Conversions</h3>
          <div className="text-3xl font-bold text-green-600">847</div>
          <p className="text-sm text-green-500 mt-2">+18% vs last month</p>
        </div>
      </div>

      <div className="bg-pink-50 border border-pink-200 rounded-lg p-6">
        <h3 className="font-semibold text-pink-900 mb-2">🚧 En développement</h3>
        <p className="text-pink-700">
          Cette page nécessite l'intégration de <strong>Google Analytics 4 API</strong>. Affichera les sessions, événements, conversions, et métriques d'engagement enrichies.
        </p>
      </div>
    </div>
  );
}
