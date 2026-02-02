/**
 * Dashboard Partners - Design moderne et UX optimale
 * Compréhension en 3 secondes : Stats → Crédits → Action
 */

'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import type { PartnerDashboard } from '@/types/partners'

export default function DashboardPage() {
  const [dashboard, setDashboard] = useState<PartnerDashboard | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadDashboard()
  }, [])

  const loadDashboard = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/partners/me')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erreur chargement dashboard')
      }

      setDashboard(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center max-w-md mx-auto mt-8 shadow-lg">
        <p className="text-red-800 font-semibold mb-2">Erreur</p>
        <p className="text-red-600 text-sm mb-4">{error}</p>
        <button
          onClick={loadDashboard}
          className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition"
        >
          Réessayer
        </button>
      </div>
    )
  }

  if (!dashboard) {
    return null
  }

  const hasActivity = dashboard.impact_cards.shares > 0 ||
                      dashboard.impact_cards.clicks > 0 ||
                      dashboard.impact_cards.applications > 0

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* HERO SECTION - Identité et code */}
      <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 rounded-2xl p-8 shadow-xl">
        <div className="relative z-10">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">
                Votre espace partenaire
              </h1>
              <p className="text-blue-100 text-lg">
                {dashboard.project_state.phase}
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-5 border border-white/20">
              <p className="text-blue-100 text-sm mb-1">Code de référence</p>
              <p className="text-3xl font-bold text-white font-mono tracking-wider">
                {dashboard.partner.ref_code}
              </p>
            </div>
          </div>
        </div>

        {/* Decorative pattern */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full -ml-24 -mb-24"></div>
      </div>

      {/* GRID PRINCIPAL - 2 colonnes responsive */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* COLONNE GAUCHE - Stats (2/3 sur desktop) */}
        <div className="lg:col-span-2 space-y-6">

          {/* VOS CHIFFRES - Grid de 5 cards */}
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4">📊 Vos chiffres</h2>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {/* Partages */}
              <div className="bg-white rounded-xl p-4 shadow-md hover:shadow-lg transition border border-gray-100">
                <div className="text-center">
                  <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-2">
                    <span className="text-xl">📤</span>
                  </div>
                  <p className="text-3xl font-bold text-gray-900 mb-1">
                    {dashboard.impact_cards.shares}
                  </p>
                  <p className="text-xs font-medium text-gray-600">Partages</p>
                </div>
              </div>

              {/* Clics */}
              <div className="bg-white rounded-xl p-4 shadow-md hover:shadow-lg transition border border-gray-100">
                <div className="text-center">
                  <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-2">
                    <span className="text-xl">👆</span>
                  </div>
                  <p className="text-3xl font-bold text-gray-900 mb-1">
                    {dashboard.impact_cards.clicks}
                  </p>
                  <p className="text-xs font-medium text-gray-600">Clics</p>
                </div>
              </div>

              {/* Demandes */}
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 shadow-md hover:shadow-lg transition border border-green-200">
                <div className="text-center">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                    <span className="text-xl">📝</span>
                  </div>
                  <p className="text-3xl font-bold text-green-700 mb-1">
                    {dashboard.impact_cards.applications}
                  </p>
                  <p className="text-xs font-medium text-gray-700">Demandes</p>
                  <p className="text-[10px] text-green-600 font-semibold mt-1">+10 crédits</p>
                </div>
              </div>

              {/* Vérifications */}
              <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-4 shadow-md hover:shadow-lg transition border border-blue-200">
                <div className="text-center">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
                    <span className="text-xl">✅</span>
                  </div>
                  <p className="text-3xl font-bold text-blue-700 mb-1">
                    {dashboard.impact_cards.ibv}
                  </p>
                  <p className="text-xs font-medium text-gray-700">Vérif. bancaire</p>
                  <p className="text-[10px] text-blue-600 font-semibold mt-1">+15 crédits</p>
                </div>
              </div>

              {/* Financés */}
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-4 shadow-md hover:shadow-lg transition border border-purple-200">
                <div className="text-center">
                  <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-2">
                    <span className="text-xl">💰</span>
                  </div>
                  <p className="text-3xl font-bold text-purple-700 mb-1">
                    {dashboard.impact_cards.funded}
                  </p>
                  <p className="text-xs font-medium text-gray-700">Financés</p>
                  <p className="text-[10px] text-purple-600 font-semibold mt-1">+50 crédits</p>
                </div>
              </div>
            </div>
          </div>

          {/* COMMENT ÇA MARCHE - Compact */}
          {!hasActivity && (
            <div className="bg-blue-50 rounded-xl p-5 border border-blue-200 shadow-sm">
              <h3 className="font-bold text-gray-900 mb-3 flex items-center">
                <span className="text-lg mr-2">💡</span>
                Comment ça marche ?
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-700">
                <div className="flex items-start space-x-2">
                  <span className="font-bold text-blue-600">1.</span>
                  <span>Partagez votre lien</span>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="font-bold text-blue-600">2.</span>
                  <span>Ils font une demande</span>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="font-bold text-blue-600">3.</span>
                  <span>Vous gagnez des crédits</span>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="font-bold text-blue-600">4.</span>
                  <span>Réduisez votre solde</span>
                </div>
              </div>
            </div>
          )}

          {/* ACTIVITÉ RÉCENTE */}
          {dashboard.timeline.length > 0 && (
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-4">📅 Activité récente</h2>
              <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
                <div className="divide-y divide-gray-100">
                  {dashboard.timeline.slice(0, 5).map((event, idx) => (
                    <div key={idx} className="p-4 hover:bg-gray-50 transition">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">
                            {event.label}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(event.at).toLocaleDateString('fr-CA', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                        <span className="text-green-500 text-xl">✓</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* COLONNE DROITE - Crédits + Action (1/3 sur desktop) */}
        <div className="space-y-6">

          {/* VOS CRÉDITS - Card sticky */}
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl shadow-xl border-2 border-green-200 overflow-hidden sticky top-6">
            <div className="p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                <span className="text-xl mr-2">💳</span>
                Vos crédits
              </h2>

              {/* Disponible - BIG */}
              <div className="bg-white rounded-xl p-6 mb-4 text-center shadow-md">
                <p className="text-sm text-gray-600 mb-2">Disponible</p>
                <p className="text-6xl font-bold text-green-600 mb-2">
                  {dashboard.credits.available.toFixed(0)}
                </p>
                <p className="text-xs text-gray-500">crédits à utiliser</p>
              </div>

              {/* Total et Utilisé - Small */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-white/70 rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-600 mb-1">Total gagné</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {dashboard.credits.total.toFixed(0)}
                  </p>
                </div>
                <div className="bg-white/70 rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-600 mb-1">Utilisé</p>
                  <p className="text-2xl font-bold text-green-600">
                    {dashboard.credits.applied.toFixed(0)}
                  </p>
                </div>
              </div>

              {/* Info */}
              <div className="bg-blue-50 rounded-lg p-3 text-xs text-blue-900 border border-blue-200">
                <p className="font-medium mb-1">💡 Chaque crédit = 1$ de rabais</p>
                <p className="text-blue-700">Appliquez-les sur votre solde de prêt</p>
              </div>
            </div>
          </div>

          {/* ACTION PRINCIPALE - CTA fort */}
          <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl p-6 shadow-xl text-white">
            <h3 className="text-xl font-bold mb-3 flex items-center">
              <span className="text-2xl mr-2">🚀</span>
              Prochaine étape
            </h3>
            <p className="text-blue-100 text-sm mb-5">
              Partagez votre lien pour gagner plus de crédits
            </p>
            <Link
              href="/partners/contribute"
              className="block w-full bg-white text-blue-600 font-bold py-4 px-6 rounded-xl hover:bg-blue-50 transition text-center shadow-lg"
            >
              Partager maintenant →
            </Link>
          </div>

          {/* AIDE */}
          <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
            <p className="text-sm text-gray-700 mb-3 font-medium">
              Besoin d'aide ?
            </p>
            <div className="space-y-2">
              <Link
                href="/partners/project"
                className="block w-full text-left bg-white text-gray-700 py-2 px-3 rounded-lg hover:bg-gray-100 transition text-sm border border-gray-200"
              >
                📖 Guide complet
              </Link>
              <a
                href="mailto:support@solutionargentrapide.ca"
                className="block w-full text-left bg-white text-gray-700 py-2 px-3 rounded-lg hover:bg-gray-100 transition text-sm border border-gray-200"
              >
                ✉️ Contacter le support
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
