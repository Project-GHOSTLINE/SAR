/**
 * Dashboard Partners - Design UX optimisé 40-60 ans
 *
 * Philosophie: Reconnaissance + Orientation + Motivation douce
 * Pas un dashboard fintech, pas de pression, pas de comparaison
 *
 * PROTECTION: Accessible uniquement aux partenaires authentifiés
 */

'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { PartnerDashboard } from '@/types/partners'

export default function DashboardPage() {
  const router = useRouter()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [dashboard, setDashboard] = useState<PartnerDashboard | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    checkAuthAndLoadDashboard()
  }, [])

  const checkAuthAndLoadDashboard = async () => {
    try {
      // Vérifier session de développement FIRST
      const devSession = await fetch('/api/partners/check-session')
      if (!devSession.ok) {
        // Pas authentifié - rediriger vers login
        router.push('/partners')
        return
      }

      setIsAuthenticated(true)

      // Charger les données du dashboard
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

  const handlePartage = () => {
    // TODO: Rediriger vers /partners/contribute ou afficher modal partage
    alert('Fonctionnalité de partage en développement.\n\nDans la version finale:\n• Message pré-écrit à copier\n• Boutons WhatsApp, SMS, Email\n• Génération de lien unique')
  }

  const handleVoirDetail = () => {
    // TODO: Rediriger vers /partners/credits ou afficher modal détails
    alert('Détails des crédits en développement.\n\nDans la version finale:\n• Historique complet des crédits\n• Explication du calcul\n• Dates et événements')
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-6"></div>
          <p className="text-gray-600 text-xl font-medium">Chargement...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="bg-red-50 border-2 border-red-200 rounded-3xl p-10 text-center max-w-2xl mx-auto mt-8 shadow-xl">
        <span className="text-5xl mb-4 block">⚠️</span>
        <p className="text-red-900 font-bold text-2xl mb-3">Erreur</p>
        <p className="text-red-700 text-lg mb-6">{error}</p>
        <button
          onClick={checkAuthAndLoadDashboard}
          className="bg-red-600 text-white text-xl font-bold px-8 py-4 rounded-2xl hover:bg-red-700 transition shadow-lg border-4 border-red-700"
        >
          Réessayer
        </button>
      </div>
    )
  }

  // Not authenticated (redirection en cours)
  if (!isAuthenticated || !dashboard) {
    return null
  }

  return (
    <div className="space-y-10 pb-12" style={{ fontSize: '18px', lineHeight: '1.6' }}>

      {/* BLOC 1 — RECONNAISSANCE (LE PLUS IMPORTANT, AVANT LES CHIFFRES) */}
      <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-3xl p-10 md:p-12 shadow-xl border-2 border-green-200">
        <div className="flex items-start gap-4 mb-6">
          <div className="w-20 h-20 bg-green-200 rounded-full flex items-center justify-center flex-shrink-0 border-4 border-green-300">
            <span className="text-5xl">🤝</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 leading-tight">
            Merci pour votre participation
          </h2>
        </div>

        <div className="space-y-4 text-lg md:text-xl text-gray-800 ml-0 md:ml-24">
          <p>Ce que vous faites <strong>aide de vraies personnes</strong></p>
          <p>et contribue à <strong>améliorer nos services</strong>.</p>
          <p className="pt-2 text-green-800 font-bold">Vous pouvez participer à votre rythme.</p>
        </div>
      </div>

      {/* BLOC 2 — IMPACT SIMPLE (RÉSULTATS COMPRÉHENSIBLES) */}
      <div className="bg-white rounded-3xl p-10 md:p-12 shadow-xl border-2 border-gray-200">
        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-10 flex items-center gap-4 flex-wrap">
          <span className="text-5xl">📊</span>
          <span>Votre impact jusqu'à maintenant</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Card 1 - Personnes ont vu */}
          <div className="bg-blue-50 rounded-2xl p-8 text-center border-2 border-blue-200 shadow-md">
            <div className="text-6xl font-black text-blue-600 mb-3">
              {dashboard.impact_cards.clicks}
            </div>
            <div className="flex items-center justify-center gap-2 mb-2">
              <span className="text-4xl">👀</span>
              <p className="text-xl font-bold text-gray-900">Personnes</p>
            </div>
            <p className="text-gray-700 text-lg">ont vu</p>
          </div>

          {/* Card 2 - Demandes reçues */}
          <div className="bg-green-50 rounded-2xl p-8 text-center border-2 border-green-200 shadow-md">
            <div className="text-6xl font-black text-green-600 mb-3">
              {dashboard.impact_cards.applications}
            </div>
            <div className="flex items-center justify-center gap-2 mb-2">
              <span className="text-4xl">📝</span>
              <p className="text-xl font-bold text-gray-900">Demandes</p>
            </div>
            <p className="text-gray-700 text-lg">reçues</p>
          </div>

          {/* Card 3 - Prêt financé */}
          <div className="bg-purple-50 rounded-2xl p-8 text-center border-2 border-purple-200 shadow-md">
            <div className="text-6xl font-black text-purple-600 mb-3">
              {dashboard.impact_cards.funded}
            </div>
            <div className="flex items-center justify-center gap-2 mb-2">
              <span className="text-4xl">💳</span>
              <p className="text-xl font-bold text-gray-900">Prêt</p>
            </div>
            <p className="text-gray-700 text-lg">financé</p>
          </div>
        </div>

        <p className="text-center text-gray-600 text-lg">
          Ces chiffres sont mis à jour automatiquement.
        </p>
      </div>

      {/* BLOC 3 — CE QUE ÇA T'APPORTE (ARGENT, BIEN DIT) */}
      <div className="bg-white rounded-3xl p-10 md:p-12 shadow-xl border-2 border-gray-200">
        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-10 flex items-center gap-4 flex-wrap">
          <span className="text-5xl">💰</span>
          <span>Crédits liés à votre participation</span>
        </h2>

        <div className="bg-gradient-to-br from-green-50 to-emerald-100 rounded-3xl p-10 md:p-12 border-4 border-green-300 text-center mb-8 shadow-lg">
          <p className="text-gray-700 text-lg mb-4">Crédits accumulés</p>
          <div className="text-7xl md:text-8xl font-black text-green-700 mb-6">
            {dashboard.credits.available.toFixed(0)} $
          </div>
          <p className="text-xl text-gray-800 leading-relaxed">
            Ces crédits peuvent être appliqués<br />
            à votre solde chez SAR, si applicable.
          </p>
        </div>

        <p className="text-center text-gray-700 font-bold text-lg">
          Aucun paiement direct. Aucun engagement.
        </p>
      </div>

      {/* BLOC 4 — ACTION GUIDÉE (MAX 2 ACTIONS) */}
      <div className="bg-white rounded-3xl p-10 md:p-12 shadow-xl border-2 border-gray-200">
        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-10 flex items-center gap-4 flex-wrap">
          <span className="text-5xl">👉</span>
          <span>Que pouvez-vous faire maintenant?</span>
        </h2>

        <div className="space-y-6">
          {/* Action 1 - Partager */}
          <button
            onClick={handlePartage}
            className="w-full bg-blue-50 hover:bg-blue-100 rounded-2xl p-8 border-4 border-blue-300 transition text-left shadow-lg group"
          >
            <div className="flex items-start gap-5">
              <span className="text-5xl flex-shrink-0 group-hover:scale-110 transition-transform">📤</span>
              <div>
                <p className="text-2xl font-bold text-gray-900 mb-3">
                  Partager une information
                </p>
                <p className="text-gray-700 text-lg leading-relaxed">
                  Aider une autre personne et continuer à accumuler des crédits.
                </p>
              </div>
            </div>
          </button>

          {/* Action 2 - Voir détails */}
          <button
            onClick={handleVoirDetail}
            className="w-full bg-gray-50 hover:bg-gray-100 rounded-2xl p-8 border-4 border-gray-300 transition text-left shadow-lg group"
          >
            <div className="flex items-start gap-5">
              <span className="text-5xl flex-shrink-0 group-hover:scale-110 transition-transform">📜</span>
              <div>
                <p className="text-2xl font-bold text-gray-900 mb-3">
                  Voir le détail de vos crédits
                </p>
                <p className="text-gray-700 text-lg leading-relaxed">
                  Comprendre comment ils ont été calculés.
                </p>
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* BLOC 5 — TRANSPARENCE / CONFIANCE */}
      <div className="bg-blue-50 rounded-3xl p-8 md:p-10 border-2 border-blue-200 shadow-lg">
        <h3 className="text-2xl font-bold text-gray-900 mb-5 flex items-center gap-3">
          <span className="text-3xl">ℹ️</span>
          <span>À propos de ce projet</span>
        </h3>
        <div className="space-y-3 text-lg text-gray-800">
          <p>Ce projet est <strong>en phase de test</strong>.</p>
          <p>Vos commentaires nous aident à l'améliorer.</p>
          <p className="pt-2 text-blue-900 font-bold">Vous pouvez arrêter à tout moment.</p>
        </div>
      </div>

    </div>
  )
}
