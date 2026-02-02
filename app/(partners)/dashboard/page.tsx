/**
 * Page: /dashboard
 *
 * Dashboard principal Partners
 * Ordre: Impact mesuré -> Crédits -> Prochaine action simple
 * Appelle uniquement /api/partners/me (pas de write direct Supabase côté client)
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
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <p className="text-red-800 font-medium mb-2">Erreur</p>
        <p className="text-red-600 text-sm">{error}</p>
        <button
          onClick={loadDashboard}
          className="mt-4 text-blue-600 hover:text-blue-700 text-sm font-medium"
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
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">
          Tableau de bord
        </h1>
        <p className="text-sm text-gray-600 mt-1">
          Code référence: <span className="font-mono font-semibold">{dashboard.partner.ref_code}</span>
        </p>
      </div>

      {/* État du projet (contexte) */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h2 className="text-sm font-semibold text-blue-900 mb-2">
          État du projet
        </h2>
        <p className="text-blue-800 text-sm mb-3">
          {dashboard.project_state.phase}
        </p>
        <p className="text-xs text-blue-700">
          Participants actifs: <strong>{dashboard.project_state.participants_active}</strong>
        </p>
      </div>

      {/* 1. IMPACT MESURÉ (cards) */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Impact mesuré
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <p className="text-xs text-gray-600 mb-1">Partages</p>
            <p className="text-2xl font-semibold text-gray-900">
              {dashboard.impact_cards.shares}
            </p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <p className="text-xs text-gray-600 mb-1">Clics</p>
            <p className="text-2xl font-semibold text-gray-900">
              {dashboard.impact_cards.clicks}
            </p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <p className="text-xs text-gray-600 mb-1">Demandes</p>
            <p className="text-2xl font-semibold text-gray-900">
              {dashboard.impact_cards.applications}
            </p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <p className="text-xs text-gray-600 mb-1">Vérif. bancaire</p>
            <p className="text-2xl font-semibold text-gray-900">
              {dashboard.impact_cards.ibv}
            </p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <p className="text-xs text-gray-600 mb-1">Financés</p>
            <p className="text-2xl font-semibold text-blue-600">
              {dashboard.impact_cards.funded}
            </p>
          </div>
        </div>
      </div>

      {/* 2. CRÉDITS */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Crédits
        </h2>
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="grid grid-cols-3 gap-6 mb-6">
            <div>
              <p className="text-xs text-gray-600 mb-1">Total gagné</p>
              <p className="text-2xl font-semibold text-gray-900">
                {dashboard.credits.total.toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-600 mb-1">Appliqué</p>
              <p className="text-2xl font-semibold text-green-600">
                {dashboard.credits.applied.toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-600 mb-1">Disponible</p>
              <p className="text-2xl font-semibold text-blue-600">
                {dashboard.credits.available.toFixed(2)}
              </p>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-4">
            <Link
              href="/credits"
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Voir le détail des crédits →
            </Link>
          </div>
        </div>
      </div>

      {/* 3. PROCHAINE ACTION SIMPLE */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Prochaine action
        </h2>
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <p className="text-gray-700 mb-4">
            Vous pouvez partager votre lien de référence avec des personnes qui
            pourraient bénéficier de nos services.
          </p>
          <Link
            href="/contribute"
            className="inline-block bg-blue-600 text-white font-medium py-3 px-6 rounded-lg hover:bg-blue-700 transition"
          >
            Partager une information
          </Link>
        </div>
      </div>

      {/* Timeline (dernières actions) */}
      {dashboard.timeline.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Activité récente
          </h2>
          <div className="bg-white border border-gray-200 rounded-lg divide-y divide-gray-200">
            {dashboard.timeline.slice(0, 10).map((event, idx) => (
              <div key={idx} className="p-4 flex items-center justify-between">
                <div>
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
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Link vers projet (confiance) */}
      <div className="border-t border-gray-200 pt-8">
        <p className="text-center text-sm text-gray-600">
          Questions sur le projet ?{' '}
          <Link
            href="/project"
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            Voir pourquoi ce projet existe
          </Link>
        </p>
      </div>
    </div>
  )
}
