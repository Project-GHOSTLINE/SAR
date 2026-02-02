/**
 * Dashboard Partners - Parcours guidé pour public 40-60 ans
 * Principe : Accompagnement humain, une action à la fois, zéro stress
 */

'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import type { PartnerDashboard } from '@/types/partners'

export default function DashboardPage() {
  const [dashboard, setDashboard] = useState<PartnerDashboard | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showDetails, setShowDetails] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)

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
        throw new Error(data.error || 'Erreur chargement')
      }

      setDashboard(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const copyLink = () => {
    const message = `Bonjour,\n\nJe participe à un test avec Solution Argent Rapide.\n\nSi jamais vous êtes serré financièrement, voici l'information pour faire une demande de prêt.\n\nAucune obligation, c'est juste une option que je voulais partager.\n\nMon code de référence : ${dashboard?.partner.ref_code}\nLien : https://solutionargentrapide.ca/apply?ref=${dashboard?.partner.ref_code}`

    navigator.clipboard.writeText(message)
    setLinkCopied(true)
    setTimeout(() => setLinkCopied(false), 3000)
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
      <div className="max-w-lg mx-auto mt-8 bg-white rounded-2xl border-2 border-red-200 p-8 text-center">
        <p className="text-lg font-semibold text-gray-900 mb-4">
          Une erreur est survenue
        </p>
        <p className="text-gray-600 mb-6">{error}</p>
        <button
          onClick={loadDashboard}
          className="bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 transition font-medium"
        >
          Réessayer
        </button>
      </div>
    )
  }

  if (!dashboard) {
    return null
  }

  const hasShared = dashboard.impact_cards.shares > 0
  const hasResults = dashboard.impact_cards.applications > 0

  return (
    <div className="max-w-2xl mx-auto space-y-8">

      {/* ACCUEIL RASSURANT */}
      <div className="bg-white rounded-2xl border-2 border-gray-200 p-8 text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-3">
          👋 Bonjour
        </h1>
        <p className="text-gray-700 text-lg leading-relaxed mb-6">
          Vous avez accès au projet Partners SAR.
        </p>

        <div className="bg-blue-50 rounded-xl p-6 text-left space-y-3 mb-6">
          <p className="text-gray-700">
            ✓ Ce projet est <strong>volontaire</strong>
          </p>
          <p className="text-gray-700">
            ✓ Vous pouvez <strong>arrêter quand vous voulez</strong>
          </p>
          <p className="text-gray-700">
            ✓ Il n'y a <strong>aucune obligation</strong>
          </p>
        </div>

        <p className="text-gray-600 text-sm">
          Nous allons vous guider étape par étape.
        </p>
      </div>

      {/* CE QUE ÇA FAIT (simple) */}
      <div className="bg-white rounded-2xl border-2 border-gray-200 p-8">
        <h2 className="text-xl font-bold text-gray-900 mb-6 text-center">
          Ce que ce projet vous permet de faire
        </h2>

        <div className="space-y-4 mb-8">
          <div className="flex items-start gap-3 bg-green-50 rounded-xl p-4">
            <span className="text-2xl">✔</span>
            <div>
              <p className="font-semibold text-gray-900 mb-1">
                Aider des personnes autour de vous
              </p>
              <p className="text-sm text-gray-600">
                Partager une information utile
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 bg-blue-50 rounded-xl p-4">
            <span className="text-2xl">✔</span>
            <div>
              <p className="font-semibold text-gray-900 mb-1">
                Contribuer à améliorer nos services
              </p>
              <p className="text-sm text-gray-600">
                Votre participation nous aide à mieux servir
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 bg-purple-50 rounded-xl p-4">
            <span className="text-2xl">✔</span>
            <div>
              <p className="font-semibold text-gray-900 mb-1">
                Réduire votre solde chez SAR
              </p>
              <p className="text-sm text-gray-600">
                Si vous avez un prêt actif avec nous
              </p>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 rounded-xl p-4 text-center">
          <p className="text-sm text-gray-600">
            <strong>Important :</strong> Vous n'avez rien à vendre.<br />
            Vous ne promettez rien à personne.
          </p>
        </div>
      </div>

      {/* ACTION PRINCIPALE (une seule) */}
      <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl p-8 text-white">
        <h2 className="text-xl font-bold mb-4 text-center">
          Aujourd'hui, vous pouvez simplement :
        </h2>

        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 mb-6">
          <p className="text-lg text-center font-medium">
            👉 Partager une information à quelqu'un<br />
            qui pourrait en avoir besoin
          </p>
        </div>

        {!hasShared ? (
          <>
            <p className="text-blue-100 text-sm text-center mb-6">
              Si vous ne connaissez personne maintenant,<br />
              ce n'est pas grave. Vous pourrez revenir plus tard.
            </p>

            <Link
              href="/partners/contribute"
              className="block w-full bg-white text-blue-600 font-bold py-4 px-6 rounded-xl hover:bg-blue-50 transition text-center shadow-lg text-lg"
            >
              Partager une information →
            </Link>
          </>
        ) : (
          <div className="text-center">
            <div className="bg-white/10 rounded-xl p-4 mb-4">
              <p className="text-white font-medium">
                ✓ Vous avez déjà partagé
              </p>
              <p className="text-blue-100 text-sm mt-2">
                Merci pour votre contribution !
              </p>
            </div>
            <Link
              href="/partners/contribute"
              className="inline-block bg-white text-blue-600 font-medium py-3 px-6 rounded-xl hover:bg-blue-50 transition"
            >
              Partager à nouveau
            </Link>
          </div>
        )}
      </div>

      {/* VOTRE PARTICIPATION (simple) */}
      <div className="bg-white rounded-2xl border-2 border-gray-200 p-8">
        <h2 className="text-xl font-bold text-gray-900 mb-6">
          Votre participation
        </h2>

        <div className="space-y-4 mb-6">
          {hasShared ? (
            <div className="flex items-center gap-3 p-4 bg-green-50 rounded-xl">
              <span className="text-2xl">✔</span>
              <div>
                <p className="font-medium text-gray-900">
                  Vous avez partagé une information
                </p>
                <p className="text-sm text-gray-600">
                  Dernière activité : aujourd'hui
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
              <span className="text-2xl">ℹ️</span>
              <div>
                <p className="font-medium text-gray-700">
                  Aucune action pour le moment
                </p>
                <p className="text-sm text-gray-600">
                  Partagez quand vous serez prêt
                </p>
              </div>
            </div>
          )}

          {hasResults ? (
            <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-xl">
              <span className="text-2xl">💰</span>
              <div>
                <p className="font-medium text-gray-900">
                  {dashboard.credits.total.toFixed(0)} crédits gagnés
                </p>
                <p className="text-sm text-gray-600">
                  Grâce à vos références validées
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
              <span className="text-2xl">⏳</span>
              <div>
                <p className="font-medium text-gray-700">
                  Crédits : En attente de validation
                </p>
                <p className="text-sm text-gray-600">
                  Ils seront comptabilisés automatiquement
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Bouton détails (discret) */}
        {hasResults && (
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            {showDetails ? '△ Masquer les détails' : '▽ Voir le détail'}
          </button>
        )}

        {/* Détails (si demandé) */}
        {showDetails && hasResults && (
          <div className="mt-4 p-4 bg-gray-50 rounded-xl text-sm">
            <div className="grid grid-cols-2 gap-3 text-center">
              <div>
                <p className="text-gray-600 mb-1">Demandes</p>
                <p className="text-2xl font-bold text-gray-900">
                  {dashboard.impact_cards.applications}
                </p>
              </div>
              <div>
                <p className="text-gray-600 mb-1">Financés</p>
                <p className="text-2xl font-bold text-green-600">
                  {dashboard.impact_cards.funded}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* BESOIN D'AIDE (visible) */}
      <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-6 text-center">
        <p className="text-lg font-semibold text-gray-900 mb-4">
          Besoin d'aide ou de clarifications ?
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <a
            href="tel:+15148001234"
            className="bg-blue-600 text-white font-medium py-3 px-6 rounded-xl hover:bg-blue-700 transition inline-flex items-center justify-center gap-2"
          >
            📞 Parler à quelqu'un
          </a>
          <a
            href="mailto:support@solutionargentrapide.ca"
            className="bg-white text-gray-700 font-medium py-3 px-6 rounded-xl hover:bg-gray-50 transition border-2 border-gray-200"
          >
            ✉️ Envoyer un message
          </a>
        </div>
        <p className="text-xs text-gray-600 mt-4">
          Nous sommes là pour vous aider, sans jugement
        </p>
      </div>

      {/* Footer discret */}
      <div className="text-center">
        <Link
          href="/partners/project"
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          En savoir plus sur ce projet
        </Link>
      </div>
    </div>
  )
}
