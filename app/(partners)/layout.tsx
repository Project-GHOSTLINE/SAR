/**
 * Layout Partners - MVP Solution Argent Rapide
 *
 * Ton: Sobre, transparence radicale, "projet en développement"
 * NO marketing vendeur, NO promesse de revenu
 */

import { ReactNode } from 'react'
import Link from 'next/link'

export const metadata = {
  title: 'Accès Partenaire — Projet en développement | SAR',
  description: 'Contribution mesurée, contrepartie claire. Rien d\'estimé, rien d\'exagéré.',
}

export default function PartnersLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header sobre */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-semibold text-gray-900">
                SAR — Accès Partenaire
              </h1>
              <p className="text-xs text-gray-500 mt-1">
                Projet en développement • Phase test
              </p>
            </div>
            <nav className="flex gap-4 text-sm">
              <Link
                href="/project"
                className="text-gray-600 hover:text-gray-900 transition"
              >
                Le projet
              </Link>
              <Link
                href="/dashboard"
                className="text-gray-600 hover:text-gray-900 transition"
              >
                Tableau de bord
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        {children}
      </main>

      {/* Footer sobre */}
      <footer className="bg-white border-t border-gray-200 mt-16">
        <div className="max-w-4xl mx-auto px-4 py-6 text-center">
          <p className="text-sm text-gray-500">
            Ce projet n'est ni un emploi ni une promesse de revenu.
          </p>
          <p className="text-xs text-gray-400 mt-2">
            Contribution facultative • Règles transparentes • Données mesurées
          </p>
        </div>
      </footer>
    </div>
  )
}
