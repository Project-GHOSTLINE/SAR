/**
 * Page: /dashboard
 *
 * Dashboard principal Partners - Version simplifiée pour utilisateurs non-techniques
 * Design clair, explications détaillées, langage accessible
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
          <p className="text-gray-600">Chargement de votre espace...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center max-w-md mx-auto mt-8">
        <p className="text-red-800 font-medium mb-2">Une erreur est survenue</p>
        <p className="text-red-600 text-sm mb-4">{error}</p>
        <button
          onClick={loadDashboard}
          className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition text-sm font-medium"
        >
          Réessayer
        </button>
      </div>
    )
  }

  if (!dashboard) {
    return null
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header avec bienvenue */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-6 text-white">
        <h1 className="text-2xl font-bold mb-2">
          👋 Bienvenue dans votre espace partenaire
        </h1>
        <p className="text-blue-100 mb-4">
          Voici un résumé de votre participation au projet
        </p>
        <div className="bg-white/20 rounded-lg p-3 inline-block">
          <p className="text-sm text-blue-100 mb-1">Votre code de référence</p>
          <p className="text-xl font-mono font-bold">{dashboard.partner.ref_code}</p>
          <p className="text-xs text-blue-100 mt-1">
            Utilisez ce code pour suivre vos références
          </p>
        </div>
      </div>

      {/* État du projet - Bandeau info */}
      <div className="bg-amber-50 border-l-4 border-amber-400 rounded-r-lg p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <span className="text-2xl">ℹ️</span>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-semibold text-amber-900">
              Phase actuelle du projet
            </h3>
            <p className="text-sm text-amber-800 mt-1">
              {dashboard.project_state.phase}
            </p>
            <p className="text-xs text-amber-700 mt-2">
              Nombre de partenaires actifs comme vous: <strong>{dashboard.project_state.participants_active}</strong>
            </p>
          </div>
        </div>
      </div>

      {/* Section: Comment ça marche - Toujours visible */}
      <div className="bg-blue-50 rounded-xl p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-3 flex items-center">
          <span className="text-2xl mr-2">💡</span>
          Comment ça fonctionne ?
        </h2>
        <div className="space-y-3 text-sm text-gray-700">
          <div className="flex items-start">
            <span className="text-lg mr-2">1️⃣</span>
            <div>
              <strong>Vous partagez</strong> votre lien avec des personnes qui pourraient avoir besoin d'un prêt
            </div>
          </div>
          <div className="flex items-start">
            <span className="text-lg mr-2">2️⃣</span>
            <div>
              <strong>Elles font une demande</strong> en utilisant votre lien de référence
            </div>
          </div>
          <div className="flex items-start">
            <span className="text-lg mr-2">3️⃣</span>
            <div>
              <strong>Vous gagnez des crédits</strong> quand leur demande avance (soumise, vérifiée, financée)
            </div>
          </div>
          <div className="flex items-start">
            <span className="text-lg mr-2">4️⃣</span>
            <div>
              <strong>Vous utilisez vos crédits</strong> pour réduire votre propre solde (si vous avez un prêt)
            </div>
          </div>
        </div>
      </div>

      {/* Section: Vos statistiques */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
          <span className="text-2xl mr-2">📊</span>
          Vos statistiques
        </h2>

        <div className="bg-white rounded-xl border-2 border-gray-200 p-6">
          <p className="text-sm text-gray-600 mb-4">
            Voici le suivi de vos actions et de leur impact réel
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Partages */}
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl">📤</span>
                <span className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded-full">
                  Actions
                </span>
              </div>
              <p className="text-3xl font-bold text-gray-900 mb-1">
                {dashboard.impact_cards.shares}
              </p>
              <p className="text-xs font-medium text-gray-600 mb-2">Partages</p>
              <p className="text-xs text-gray-500">
                Nombre de fois que vous avez partagé votre lien
              </p>
            </div>

            {/* Clics */}
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl">👆</span>
                <span className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded-full">
                  Intérêt
                </span>
              </div>
              <p className="text-3xl font-bold text-gray-900 mb-1">
                {dashboard.impact_cards.clicks}
              </p>
              <p className="text-xs font-medium text-gray-600 mb-2">Clics</p>
              <p className="text-xs text-gray-500">
                Personnes qui ont cliqué sur votre lien
              </p>
            </div>

            {/* Demandes */}
            <div className="bg-green-50 rounded-lg p-4 border border-green-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl">📝</span>
                <span className="text-xs bg-green-200 text-green-700 px-2 py-1 rounded-full">
                  +10 crédits
                </span>
              </div>
              <p className="text-3xl font-bold text-green-700 mb-1">
                {dashboard.impact_cards.applications}
              </p>
              <p className="text-xs font-medium text-gray-600 mb-2">Demandes</p>
              <p className="text-xs text-gray-500">
                Demandes de prêt soumises grâce à vous
              </p>
            </div>

            {/* Vérifications */}
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl">✅</span>
                <span className="text-xs bg-blue-200 text-blue-700 px-2 py-1 rounded-full">
                  +15 crédits
                </span>
              </div>
              <p className="text-3xl font-bold text-blue-700 mb-1">
                {dashboard.impact_cards.ibv}
              </p>
              <p className="text-xs font-medium text-gray-600 mb-2">Vérifications</p>
              <p className="text-xs text-gray-500">
                Vérifications bancaires complétées
              </p>
            </div>

            {/* Financés */}
            <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl">💰</span>
                <span className="text-xs bg-purple-200 text-purple-700 px-2 py-1 rounded-full">
                  +50 crédits
                </span>
              </div>
              <p className="text-3xl font-bold text-purple-700 mb-1">
                {dashboard.impact_cards.funded}
              </p>
              <p className="text-xs font-medium text-gray-600 mb-2">Financés</p>
              <p className="text-xs text-gray-500">
                Prêts approuvés et versés
              </p>
            </div>
          </div>

          {/* Explication des crédits */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-900 font-medium mb-2">
              💡 Comment gagner des crédits ?
            </p>
            <ul className="text-xs text-blue-800 space-y-1">
              <li>• <strong>Demande soumise</strong> = 10 crédits</li>
              <li>• <strong>Vérification bancaire</strong> = 15 crédits</li>
              <li>• <strong>Prêt financé</strong> = 50 crédits</li>
              <li className="pt-2 text-blue-700">
                ⚠️ Maximum 150 crédits par mois pour éviter les abus
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Section: Vos crédits */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
          <span className="text-2xl mr-2">💳</span>
          Vos crédits accumulés
        </h2>

        <div className="bg-white rounded-xl border-2 border-gray-200 overflow-hidden">
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Total gagné */}
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-2">Total gagné</p>
                <p className="text-4xl font-bold text-gray-900 mb-1">
                  {dashboard.credits.total.toFixed(0)}
                </p>
                <p className="text-xs text-gray-500">
                  Tous vos crédits depuis le début
                </p>
              </div>

              {/* Déjà utilisé */}
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-2">Déjà utilisé</p>
                <p className="text-4xl font-bold text-green-600 mb-1">
                  {dashboard.credits.applied.toFixed(0)}
                </p>
                <p className="text-xs text-gray-500">
                  Appliqué sur votre solde
                </p>
              </div>

              {/* Disponible */}
              <div className="text-center bg-white rounded-lg p-4 border-2 border-blue-300">
                <p className="text-sm text-blue-600 font-semibold mb-2">💰 Disponible maintenant</p>
                <p className="text-5xl font-bold text-blue-600 mb-1">
                  {dashboard.credits.available.toFixed(0)}
                </p>
                <p className="text-xs text-gray-600 font-medium">
                  Crédits prêts à utiliser
                </p>
              </div>
            </div>
          </div>

          <div className="p-6 bg-gray-50 border-t border-gray-200">
            <div className="flex items-start mb-4">
              <span className="text-xl mr-2">ℹ️</span>
              <div>
                <p className="text-sm font-semibold text-gray-900 mb-1">
                  Comment utiliser vos crédits ?
                </p>
                <p className="text-sm text-gray-600">
                  Vos crédits peuvent être appliqués sur votre solde de prêt actuel.
                  Chaque crédit réduit directement votre montant dû.
                  C'est comme un rabais sur votre prêt !
                </p>
              </div>
            </div>

            <Link
              href="/partners/credits"
              className="inline-block bg-blue-600 text-white font-medium py-3 px-6 rounded-lg hover:bg-blue-700 transition text-sm"
            >
              Voir l'historique détaillé →
            </Link>
          </div>
        </div>
      </div>

      {/* Section: Prochaine action */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-6 text-white">
        <h2 className="text-xl font-bold mb-3 flex items-center">
          <span className="text-2xl mr-2">🚀</span>
          Que faire maintenant ?
        </h2>
        <p className="text-blue-100 mb-6">
          Partagez votre lien avec quelqu'un qui pourrait avoir besoin d'un prêt.
          Plus vous aidez de personnes, plus vous gagnez de crédits !
        </p>
        <Link
          href="/partners/contribute"
          className="inline-block bg-white text-blue-600 font-bold py-4 px-8 rounded-lg hover:bg-blue-50 transition shadow-lg"
        >
          Partager mon lien de référence
        </Link>
      </div>

      {/* Activité récente */}
      {dashboard.timeline.length > 0 && (
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
            <span className="text-2xl mr-2">📅</span>
            Votre activité récente
          </h2>
          <div className="bg-white rounded-xl border-2 border-gray-200 overflow-hidden">
            <div className="divide-y divide-gray-200">
              {dashboard.timeline.slice(0, 10).map((event, idx) => (
                <div key={idx} className="p-4 hover:bg-gray-50 transition">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        {event.label}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(event.at).toLocaleDateString('fr-CA', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                    <span className="text-xl">✓</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Footer avec aide */}
      <div className="bg-gray-100 rounded-xl p-6 text-center border-2 border-gray-200">
        <p className="text-sm text-gray-700 mb-3">
          Des questions sur le fonctionnement du programme ?
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link
            href="/partners/project"
            className="inline-block bg-white text-gray-700 font-medium py-2 px-4 rounded-lg hover:bg-gray-50 transition text-sm border border-gray-300"
          >
            📖 Comprendre le projet
          </Link>
          <a
            href="mailto:support@solutionargentrapide.ca"
            className="inline-block bg-white text-gray-700 font-medium py-2 px-4 rounded-lg hover:bg-gray-50 transition text-sm border border-gray-300"
          >
            ✉️ Contacter le support
          </a>
        </div>
      </div>
    </div>
  )
}
