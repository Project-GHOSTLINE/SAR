import { Globe, TrendingUp, Link as LinkIcon } from 'lucide-react';

export default function SemrushPage() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Globe className="w-8 h-8 text-cyan-500" />
          <h1 className="text-3xl font-bold">Semrush</h1>
        </div>
        <p className="text-gray-600">Keywords, traffic, rank, authority, backlinks</p>
      </div>

      <div className="grid grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-sm text-gray-600 mb-2">Organic Keywords</h3>
          <div className="text-3xl font-bold text-cyan-600">1,284</div>
          <p className="text-sm text-green-500 mt-2">+47 this month</p>
        </div>

        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-sm text-gray-600 mb-2">Organic Traffic</h3>
          <div className="text-3xl font-bold text-blue-600">8.4K</div>
          <p className="text-sm text-green-500 mt-2">+12% growth</p>
        </div>

        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-sm text-gray-600 mb-2">Authority Score</h3>
          <div className="text-3xl font-bold text-purple-600">42</div>
          <p className="text-sm text-gray-500 mt-2">Above average</p>
        </div>

        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-sm text-gray-600 mb-2">Total Backlinks</h3>
          <div className="text-3xl font-bold text-green-600">547</div>
          <p className="text-sm text-green-500 mt-2">+18 new links</p>
        </div>
      </div>

      <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-6">
        <h3 className="font-semibold text-cyan-900 mb-2">🚧 En développement</h3>
        <p className="text-cyan-700">
          Cette page nécessite l'intégration de <strong>Semrush API</strong>. Affichera les keywords organiques, traffic estimates, backlinks profile, et competitor analysis.
        </p>
      </div>
    </div>
  );
}
