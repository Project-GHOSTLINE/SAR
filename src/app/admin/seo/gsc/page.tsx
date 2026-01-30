import { Search, TrendingUp, MousePointer } from 'lucide-react';

export default function GoogleSearchConsolePage() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Search className="w-8 h-8 text-teal-500" />
          <h1 className="text-3xl font-bold">Google Search Console</h1>
        </div>
        <p className="text-gray-600">Top queries, pages, CTR, position moyenne, impressions</p>
      </div>

      <div className="grid grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-sm text-gray-600 mb-2">Total Impressions</h3>
          <div className="text-3xl font-bold text-teal-600">45.2K</div>
          <p className="text-sm text-green-500 mt-2">+12% vs last month</p>
        </div>

        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-sm text-gray-600 mb-2">Total Clicks</h3>
          <div className="text-3xl font-bold text-blue-600">2,847</div>
          <p className="text-sm text-green-500 mt-2">+8% vs last month</p>
        </div>

        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-sm text-gray-600 mb-2">CTR Moyen</h3>
          <div className="text-3xl font-bold text-purple-600">6.3%</div>
          <p className="text-sm text-gray-500 mt-2">Above industry avg</p>
        </div>

        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-sm text-gray-600 mb-2">Position Moyenne</h3>
          <div className="text-3xl font-bold text-orange-600">12.4</div>
          <p className="text-sm text-green-500 mt-2">-2.1 positions</p>
        </div>
      </div>

      <div className="bg-teal-50 border border-teal-200 rounded-lg p-6">
        <h3 className="font-semibold text-teal-900 mb-2">🚧 En développement</h3>
        <p className="text-teal-700">
          Cette page nécessite l'intégration de <strong>Google Search Console API</strong>. Affichera les top queries, pages, CTR, et position pour chaque page indexée.
        </p>
      </div>
    </div>
  );
}
