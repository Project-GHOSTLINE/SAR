/**
 * 📄 Page Exemple - Widgets VoPay
 * Démonstration de tous les widgets disponibles
 * URL: /admin/exemple-widgets
 */

'use client'

import {
  VoPayBalance,
  VoPayTransactions,
  VoPayTodayVolume,
  VoPayStats,
  VoPayBalanceMini
} from '@/components/widgets/VoPayWidgets'

export default function ExempleWidgetsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              📊 Exemple d'Utilisation des Widgets VoPay
            </h1>
            <p className="text-gray-600">
              Tous les widgets se mettent à jour automatiquement toutes les 30 secondes
            </p>
          </div>

          {/* Section 1: Widgets Principaux */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              1. Widgets Principaux (Grid 3 colonnes)
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <VoPayBalance />
              <VoPayTodayVolume />
              <VoPayStats />
            </div>
          </div>

          {/* Section 2: Widget Mini */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              2. Widget Mini Balance (Compact)
            </h2>
            <div className="max-w-sm">
              <VoPayBalanceMini />
            </div>
          </div>

          {/* Section 3: Transactions */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              3. Transactions Récentes (Limite: 5)
            </h2>
            <VoPayTransactions limit={5} />
          </div>

          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              4. Transactions Récentes (Limite: 10)
            </h2>
            <VoPayTransactions limit={10} />
          </div>

          {/* Section 4: Layout Sidebar */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              5. Layout Sidebar (Balance Mini + Stats)
            </h2>
            <div className="flex gap-6">
              {/* Sidebar */}
              <aside className="w-64 space-y-4">
                <VoPayBalanceMini />
                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                  <h3 className="font-semibold mb-2">Navigation</h3>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li>• Dashboard</li>
                    <li>• Transactions</li>
                    <li>• Rapports</li>
                  </ul>
                </div>
              </aside>

              {/* Contenu principal */}
              <div className="flex-1">
                <VoPayStats />
              </div>
            </div>
          </div>

          {/* Code Examples */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              💻 Exemples de Code
            </h2>

            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-gray-700 mb-2">Balance VoPay:</h3>
                <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto">
                  <code>{`import { VoPayBalance } from '@/components/widgets/VoPayWidgets'

<VoPayBalance />`}</code>
                </pre>
              </div>

              <div>
                <h3 className="font-semibold text-gray-700 mb-2">Transactions (5 dernières):</h3>
                <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto">
                  <code>{`import { VoPayTransactions } from '@/components/widgets/VoPayWidgets'

<VoPayTransactions limit={5} />`}</code>
                </pre>
              </div>

              <div>
                <h3 className="font-semibold text-gray-700 mb-2">Volume du Jour:</h3>
                <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto">
                  <code>{`import { VoPayTodayVolume } from '@/components/widgets/VoPayWidgets'

<VoPayTodayVolume />`}</code>
                </pre>
              </div>

              <div>
                <h3 className="font-semibold text-gray-700 mb-2">Statistiques:</h3>
                <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto">
                  <code>{`import { VoPayStats } from '@/components/widgets/VoPayWidgets'

<VoPayStats />`}</code>
                </pre>
              </div>

              <div>
                <h3 className="font-semibold text-gray-700 mb-2">Balance Mini:</h3>
                <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto">
                  <code>{`import { VoPayBalanceMini } from '@/components/widgets/VoPayWidgets'

<VoPayBalanceMini />`}</code>
                </pre>
              </div>
            </div>
          </div>

          {/* Documentation Link */}
          <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-blue-900 mb-2">
              📖 Documentation Complète
            </h3>
            <p className="text-blue-700 mb-4">
              Consultez le fichier <code className="bg-blue-100 px-2 py-1 rounded">VOPAY-WIDGETS-GUIDE.md</code> pour plus d'exemples et d'options avancées.
            </p>
            <ul className="space-y-2 text-sm text-blue-800">
              <li>✅ Auto-refresh toutes les 30 secondes</li>
              <li>✅ Hook personnalisé <code className="bg-blue-100 px-1 rounded">useVoPayData</code></li>
              <li>✅ Responsive et mobile-friendly</li>
              <li>✅ Boutons de refresh manuel</li>
              <li>✅ Gestion des erreurs intégrée</li>
            </ul>
          </div>
        </div>
      </div>
  )
}
