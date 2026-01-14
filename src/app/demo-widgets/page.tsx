/**
 * 📄 Page Démo Publique - Widgets VoPay
 * Démonstration accessible sans authentification
 * URL: /demo-widgets
 */

'use client'

import {
  VoPayBalance,
  VoPayTransactions,
  VoPayTodayVolume,
  VoPayStats,
  VoPayBalanceMini
} from '@/components/widgets/VoPayWidgets'
import Link from 'next/link'

export default function DemoWidgetsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                📊 Démo - Widgets VoPay en Temps Réel
              </h1>
              <p className="text-gray-600">
                Mise à jour automatique toutes les 30 secondes • Pas d'authentification requise
              </p>
            </div>
            <Link
              href="/admin"
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              Connexion Admin →
            </Link>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              💡 <strong>Astuce:</strong> Tous ces widgets peuvent être utilisés avec une simple ligne de code.
              Voir les exemples en bas de page.
            </p>
          </div>
        </div>

        {/* Section 1: Widgets Principaux */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Widgets Principaux
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
            Widget Compact (Sidebar)
          </h2>
          <div className="max-w-sm">
            <VoPayBalanceMini />
          </div>
        </div>

        {/* Section 3: Transactions */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Transactions Récentes
          </h2>
          <VoPayTransactions limit={10} />
        </div>

        {/* Code Examples */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            💻 Utilisation Simple (Shortcodes)
          </h2>

          <div className="space-y-6">
            <div>
              <h3 className="font-semibold text-gray-700 mb-2">1. Balance VoPay:</h3>
              <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto text-sm">
                <code>{`import { VoPayBalance } from '@/components/widgets'

<VoPayBalance />`}</code>
              </pre>
            </div>

            <div>
              <h3 className="font-semibold text-gray-700 mb-2">2. Transactions:</h3>
              <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto text-sm">
                <code>{`import { VoPayTransactions } from '@/components/widgets'

<VoPayTransactions limit={10} />`}</code>
              </pre>
            </div>

            <div>
              <h3 className="font-semibold text-gray-700 mb-2">3. Volume du Jour:</h3>
              <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto text-sm">
                <code>{`import { VoPayTodayVolume } from '@/components/widgets'

<VoPayTodayVolume />`}</code>
              </pre>
            </div>

            <div>
              <h3 className="font-semibold text-gray-700 mb-2">4. Statistiques:</h3>
              <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto text-sm">
                <code>{`import { VoPayStats } from '@/components/widgets'

<VoPayStats />`}</code>
              </pre>
            </div>

            <div>
              <h3 className="font-semibold text-gray-700 mb-2">5. Balance Mini:</h3>
              <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto text-sm">
                <code>{`import { VoPayBalanceMini } from '@/components/widgets'

<VoPayBalanceMini />`}</code>
              </pre>
            </div>

            <div>
              <h3 className="font-semibold text-gray-700 mb-2">6. Tout ensemble (Dashboard):</h3>
              <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto text-sm">
                <code>{`import {
  VoPayBalance,
  VoPayTransactions,
  VoPayTodayVolume,
  VoPayStats
} from '@/components/widgets'

export default function DashboardPage() {
  return (
    <div>
      <div className="grid grid-cols-3 gap-6 mb-8">
        <VoPayBalance />
        <VoPayTodayVolume />
        <VoPayStats />
      </div>
      <VoPayTransactions limit={10} />
    </div>
  )
}`}</code>
              </pre>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              ⚡ Fonctionnalités
            </h3>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-center gap-2">
                <span className="text-green-500">✓</span>
                Auto-refresh toutes les 30 secondes
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-500">✓</span>
                Bouton refresh manuel sur chaque widget
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-500">✓</span>
                Données en temps réel depuis l'API VoPay
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-500">✓</span>
                Responsive (mobile + desktop)
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-500">✓</span>
                Gestion des erreurs intégrée
              </li>
            </ul>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              📚 Documentation
            </h3>
            <ul className="space-y-2 text-sm text-gray-700">
              <li>
                <strong>Guide complet:</strong> VOPAY-WIDGETS-GUIDE.md
              </li>
              <li>
                <strong>Shortcodes:</strong> WIDGETS-SHORTCODES.md
              </li>
              <li>
                <strong>Hook source:</strong> src/hooks/useVoPayData.ts
              </li>
              <li>
                <strong>Widgets source:</strong> src/components/widgets/VoPayWidgets.tsx
              </li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-gray-500 text-sm">
          <p>Système créé par Claude Assistant • 2026-01-14</p>
        </div>
      </div>
    </div>
  )
}
