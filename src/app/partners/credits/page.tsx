/**
 * Page: /credits
 *
 * Ledger transparent + règles claires
 * Affiche historique des crédits + règles MVP
 */

'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface CreditEntry {
  id: string
  created_at: string
  credit_amount: number
  reason: string
  source_type: string
}

export default function CreditsPage() {
  const [credits, setCredits] = useState({
    total: 0,
    applied: 0,
    available: 0
  })
  const [ledger, setLedger] = useState<CreditEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadCredits()
  }, [])

  const loadCredits = async () => {
    try {
      // Note: Dans un vrai MVP, on ajouterait un endpoint /api/partners/credits/ledger
      // Pour l'instant, on utilise les données du dashboard
      const response = await fetch('/api/partners/me')
      const data = await response.json()

      if (response.ok) {
        setCredits(data.credits)
        // Timeline contient les événements, pas exactement le ledger
        // Dans un MVP complet, on ajouterait un endpoint dédié
      }
    } catch (error) {
      console.error('Erreur chargement crédits:', error)
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

  return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-white rounded-lg border border-gray-200 p-8">
        <h1 className="text-2xl font-semibold text-gray-900 mb-8">
          Crédits
        </h1>

        {/* Résumé */}
        <div className="grid grid-cols-3 gap-6 mb-8 pb-8 border-b border-gray-200">
          <div>
            <p className="text-sm text-gray-600 mb-1">Total gagné</p>
            <p className="text-3xl font-semibold text-gray-900">
              {credits.total.toFixed(2)}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-1">Appliqué</p>
            <p className="text-3xl font-semibold text-green-600">
              {credits.applied.toFixed(2)}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-1">Disponible</p>
            <p className="text-3xl font-semibold text-blue-600">
              {credits.available.toFixed(2)}
            </p>
          </div>
        </div>

        {/* Règles MVP */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Règles de crédits (MVP)
          </h2>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-300">
                  <th className="text-left py-2 font-medium text-gray-900">Événement</th>
                  <th className="text-right py-2 font-medium text-gray-900">Crédits</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                <tr>
                  <td className="py-3 text-gray-700">Demande soumise</td>
                  <td className="py-3 text-right font-semibold text-green-600">+10</td>
                </tr>
                <tr>
                  <td className="py-3 text-gray-700">Vérification bancaire complétée</td>
                  <td className="py-3 text-right font-semibold text-green-600">+15</td>
                </tr>
                <tr>
                  <td className="py-3 text-gray-700">Prêt financé</td>
                  <td className="py-3 text-right font-semibold text-green-600">+50</td>
                </tr>
              </tbody>
            </table>

            <div className="mt-6 pt-6 border-t border-gray-300">
              <p className="text-xs text-gray-600">
                <strong>Plafond:</strong> 150 crédits par partenaire par période de 30 jours
              </p>
              <p className="text-xs text-gray-600 mt-2">
                <strong>Application:</strong> Les crédits disponibles peuvent être appliqués
                sur votre solde (sous conditions, validation manuelle en phase MVP)
              </p>
            </div>
          </div>
        </div>

        {/* Historique (placeholder - À implémenter avec endpoint dédié) */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Historique des crédits
          </h2>

          {ledger.length === 0 ? (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
              <p className="text-gray-600">
                Aucun crédit gagné pour le moment.
              </p>
              <p className="text-sm text-gray-500 mt-2">
                Les crédits apparaîtront ici lorsque des demandes référées aboutiront.
              </p>
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-lg divide-y divide-gray-200">
              {ledger.map((entry) => (
                <div key={entry.id} className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {entry.reason}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(entry.created_at).toLocaleDateString('fr-CA', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                  <p className="text-lg font-semibold text-green-600">
                    +{entry.credit_amount.toFixed(2)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Note transparence */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
          <h3 className="text-sm font-semibold text-amber-900 mb-2">
            Transparence
          </h3>
          <p className="text-sm text-amber-800">
            Tous les crédits sont tracés et auditables. Aucun crédit n'est
            attribué sans événement vérifiable (demande, vérification bancaire,
            ou financement). L'application des crédits sur votre solde est
            soumise à validation manuelle en phase MVP.
          </p>
        </div>

        {/* Link retour dashboard */}
        <div className="mt-8 text-center">
          <Link
            href="/partners/dashboard"
            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
          >
            ← Retour au tableau de bord
          </Link>
        </div>
      </div>
    </div>
  )
}
