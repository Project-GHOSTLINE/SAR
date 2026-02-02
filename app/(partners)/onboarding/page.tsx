/**
 * Page: /onboarding
 *
 * Objectifs + préférences + génération ref link
 * Ton: Sobre, questions simples, pas de vente
 */

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)

  const [preferences, setPreferences] = useState({
    preferred_channels: [] as string[],
    goals: ''
  })

  const channels = [
    { id: 'whatsapp', label: 'WhatsApp' },
    { id: 'sms', label: 'SMS' },
    { id: 'messenger', label: 'Messenger' }
  ]

  const toggleChannel = (channelId: string) => {
    setPreferences(prev => ({
      ...prev,
      preferred_channels: prev.preferred_channels.includes(channelId)
        ? prev.preferred_channels.filter(c => c !== channelId)
        : [...prev.preferred_channels, channelId]
    }))
  }

  const handleComplete = async () => {
    // Note: Preferences are optional, just redirect to dashboard
    // Si on voulait sauvegarder, on ferait un PATCH /api/partners/me (à implémenter si besoin)
    router.push('/dashboard')
  }

  if (step === 1) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg border border-gray-200 p-8">
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">
            Configuration — Étape 1/2
          </h1>
          <p className="text-gray-600 mb-8">
            Choisissez comment vous préférez partager l'information (facultatif)
          </p>

          <div className="space-y-4">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Canaux préférés (optionnel)
            </label>

            {channels.map(channel => (
              <label
                key={channel.id}
                className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition"
              >
                <input
                  type="checkbox"
                  checked={preferences.preferred_channels.includes(channel.id)}
                  onChange={() => toggleChannel(channel.id)}
                  className="h-5 w-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                />
                <span className="text-gray-900">{channel.label}</span>
              </label>
            ))}
          </div>

          <button
            onClick={() => setStep(2)}
            className="w-full mt-8 bg-blue-600 text-white font-medium py-3 px-4 rounded-lg hover:bg-blue-700 transition"
          >
            Suivant
          </button>

          <button
            onClick={() => router.push('/dashboard')}
            className="w-full mt-3 text-gray-600 hover:text-gray-900 text-sm"
          >
            Passer cette étape
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-lg border border-gray-200 p-8">
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">
          Configuration — Étape 2/2
        </h1>
        <p className="text-gray-600 mb-8">
          Partagez vos objectifs si vous le souhaitez (facultatif)
        </p>

        <div className="space-y-4">
          <label className="block">
            <span className="block text-sm font-medium text-gray-700 mb-2">
              Pourquoi participez-vous ? (optionnel)
            </span>
            <textarea
              value={preferences.goals}
              onChange={(e) => setPreferences(prev => ({ ...prev, goals: e.target.value }))}
              rows={4}
              placeholder="Ex: Réduire mon solde, aider d'autres personnes, tester le projet..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
            />
          </label>

          <p className="text-xs text-gray-500">
            Cette information nous aide à améliorer le projet. Elle reste privée.
          </p>
        </div>

        <div className="flex gap-4 mt-8">
          <button
            onClick={() => setStep(1)}
            className="flex-1 bg-gray-100 text-gray-700 font-medium py-3 px-4 rounded-lg hover:bg-gray-200 transition"
          >
            Retour
          </button>
          <button
            onClick={handleComplete}
            disabled={isLoading}
            className="flex-1 bg-blue-600 text-white font-medium py-3 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 transition"
          >
            {isLoading ? 'Chargement...' : 'Terminer'}
          </button>
        </div>

        <button
          onClick={() => router.push('/dashboard')}
          className="w-full mt-3 text-gray-600 hover:text-gray-900 text-sm"
        >
          Passer cette étape
        </button>
      </div>
    </div>
  )
}
