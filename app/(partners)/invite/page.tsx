/**
 * Page: /invite?token=XXX
 *
 * Activation partenaire via token d'invitation
 * Ton: Sobre, factuel, consent simple (pas contrat)
 */

'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

export default function InvitePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [consentAccepted, setConsentAccepted] = useState(false)

  useEffect(() => {
    if (!token) {
      setError('Aucun token d\'invitation détecté dans l\'URL.')
    }
  }, [token])

  const handleActivate = async () => {
    if (!token || !consentAccepted) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/partners/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de l\'activation')
      }

      // Activation réussie, redirect vers onboarding
      router.push('/onboarding')
    } catch (err: any) {
      setError(err.message || 'Erreur serveur')
      setIsLoading(false)
    }
  }

  if (!token) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Lien invalide
        </h2>
        <p className="text-gray-600">
          Aucun token d'invitation trouvé. Vérifiez votre lien.
        </p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-lg border border-gray-200 p-8">
        <h1 className="text-2xl font-semibold text-gray-900 mb-4">
          Invitation — Accès Partenaire
        </h1>

        <div className="space-y-6 text-gray-700">
          <p>
            Vous avez reçu une invitation à participer au projet Partners de
            Solution Argent Rapide (phase test).
          </p>

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
            <h3 className="font-semibold text-gray-900 mb-3">
              Ce que cela signifie
            </h3>
            <ul className="space-y-2 text-sm">
              <li>
                • Vous pouvez <strong>partager une information</strong> sur nos services
                à des personnes qui pourraient en bénéficier.
              </li>
              <li>
                • Si une demande aboutit (vérification bancaire complétée,
                prêt financé), vous recevez une <strong>contrepartie mesurée</strong> en
                crédits.
              </li>
              <li>
                • Les crédits peuvent être appliqués sur votre solde (sous
                conditions).
              </li>
              <li>
                • Participation <strong>facultative</strong>. Aucune obligation.
              </li>
            </ul>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
            <h3 className="font-semibold text-gray-900 mb-3">
              Ce que ce n'est pas
            </h3>
            <ul className="space-y-2 text-sm text-gray-700">
              <li>❌ Ce n'est <strong>pas un emploi</strong></li>
              <li>❌ Ce n'est <strong>pas une promesse de revenu</strong></li>
              <li>❌ Ce n'est <strong>pas un programme de marketing</strong></li>
              <li>❌ Il n'y a <strong>pas de niveaux, badges, ou gamification</strong></li>
            </ul>
          </div>

          <div className="border-t border-gray-200 pt-6">
            <h3 className="font-semibold text-gray-900 mb-3">
              Consent (opt-in simple)
            </h3>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={consentAccepted}
                onChange={(e) => setConsentAccepted(e.target.checked)}
                className="mt-1 h-5 w-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">
                J'ai lu et compris les informations ci-dessus. J'accepte de
                participer au projet Partners (phase test) et de recevoir une
                contrepartie en crédits selon les règles établies. Je comprends
                que cette participation est facultative et que je peux me
                retirer à tout moment.
              </span>
            </label>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4 text-sm">
              {error}
            </div>
          )}

          <button
            onClick={handleActivate}
            disabled={!consentAccepted || isLoading}
            className="w-full bg-blue-600 text-white font-medium py-3 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
          >
            {isLoading ? 'Activation en cours...' : 'Accepter et continuer'}
          </button>
        </div>
      </div>
    </div>
  )
}
