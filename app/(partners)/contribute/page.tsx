/**
 * Page: /contribute
 *
 * Wording: "Partager une information" (pas "invite tes amis")
 * Messages neutres + copy/paste + deep links uniquement
 * NO connexion réelle aux contacts (Gmail/FB)
 */

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function ContributePage() {
  const router = useRouter()
  const [refCode, setRefCode] = useState<string>('')
  const [refUrl, setRefUrl] = useState<string>('')
  const [copied, setCopied] = useState(false)
  const [selectedChannel, setSelectedChannel] = useState<string>('copy')

  useEffect(() => {
    loadRefCode()
  }, [])

  const loadRefCode = async () => {
    try {
      const response = await fetch('/api/partners/me')
      const data = await response.json()

      if (response.ok) {
        setRefCode(data.partner.ref_code)
        setRefUrl(`https://solutionargentrapide.ca/apply?ref=${data.partner.ref_code}`)
      }
    } catch (error) {
      console.error('Erreur chargement ref_code:', error)
    }
  }

  const trackEvent = async (eventType: string) => {
    try {
      await fetch('/api/partners/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_type: eventType,
          ref_code: refCode
        })
      })
    } catch (error) {
      console.error('Erreur tracking event:', error)
    }
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(refUrl)
      setCopied(true)
      await trackEvent('share_copy')

      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Erreur copie:', error)
    }
  }

  const handleDeepLink = (channel: string) => {
    trackEvent(`share_${channel}`)

    const message = encodeURIComponent(
      `J'ai découvert Solution Argent Rapide, une option de prêt court terme. Si ça peut vous aider: ${refUrl}`
    )

    let deepLinkUrl = ''

    switch (channel) {
      case 'whatsapp':
        deepLinkUrl = `https://wa.me/?text=${message}`
        break
      case 'sms':
        deepLinkUrl = `sms:?body=${message}`
        break
      case 'messenger':
        deepLinkUrl = `fb-messenger://share?link=${encodeURIComponent(refUrl)}`
        break
    }

    if (deepLinkUrl) {
      window.open(deepLinkUrl, '_blank')
    }
  }

  const messageTemplate = `J'ai découvert Solution Argent Rapide, une option de prêt court terme. Si ça peut vous aider: ${refUrl}`

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-lg border border-gray-200 p-8">
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">
          Partager une information
        </h1>
        <p className="text-gray-600 mb-8">
          Si vous connaissez quelqu'un qui pourrait bénéficier de nos services,
          vous pouvez partager votre lien de référence.
        </p>

        {/* Choix canal */}
        <div className="mb-8">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Choisir un canal
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setSelectedChannel('copy')}
              className={`p-4 border-2 rounded-lg text-left transition ${
                selectedChannel === 'copy'
                  ? 'border-blue-600 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <p className="font-medium text-gray-900">Copier le lien</p>
              <p className="text-xs text-gray-600 mt-1">À partager manuellement</p>
            </button>

            <button
              onClick={() => setSelectedChannel('whatsapp')}
              className={`p-4 border-2 rounded-lg text-left transition ${
                selectedChannel === 'whatsapp'
                  ? 'border-blue-600 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <p className="font-medium text-gray-900">WhatsApp</p>
              <p className="text-xs text-gray-600 mt-1">Via deep link</p>
            </button>

            <button
              onClick={() => setSelectedChannel('sms')}
              className={`p-4 border-2 rounded-lg text-left transition ${
                selectedChannel === 'sms'
                  ? 'border-blue-600 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <p className="font-medium text-gray-900">SMS</p>
              <p className="text-xs text-gray-600 mt-1">Via deep link</p>
            </button>

            <button
              onClick={() => setSelectedChannel('messenger')}
              className={`p-4 border-2 rounded-lg text-left transition ${
                selectedChannel === 'messenger'
                  ? 'border-blue-600 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <p className="font-medium text-gray-900">Messenger</p>
              <p className="text-xs text-gray-600 mt-1">Via deep link</p>
            </button>
          </div>
        </div>

        {/* Lien de référence */}
        <div className="mb-8">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Votre lien de référence
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={refUrl}
              readOnly
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-900 font-mono text-sm"
            />
            <button
              onClick={handleCopy}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-medium transition"
            >
              {copied ? '✓ Copié' : 'Copier'}
            </button>
          </div>
        </div>

        {/* Message suggéré */}
        <div className="mb-8">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Message suggéré (à personnaliser)
          </label>
          <textarea
            value={messageTemplate}
            readOnly
            rows={4}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-900 text-sm resize-none"
          />
          <p className="text-xs text-gray-500 mt-2">
            Vous pouvez modifier ce message selon votre style.
          </p>
        </div>

        {/* Action selon canal */}
        {selectedChannel === 'copy' ? (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
            <p className="text-sm text-gray-700 mb-4">
              Lien copié. Vous pouvez maintenant le coller où vous le souhaitez
              (message texte, email, note, etc.)
            </p>
            <button
              onClick={handleCopy}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-medium transition"
            >
              Recopier le lien
            </button>
          </div>
        ) : (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
            <p className="text-sm text-gray-700 mb-4">
              Cliquez pour ouvrir {selectedChannel === 'whatsapp' ? 'WhatsApp' : selectedChannel === 'sms' ? 'SMS' : 'Messenger'} avec
              le message pré-rempli.
            </p>
            <button
              onClick={() => handleDeepLink(selectedChannel)}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-medium transition"
            >
              Ouvrir {selectedChannel === 'whatsapp' ? 'WhatsApp' : selectedChannel === 'sms' ? 'SMS' : 'Messenger'}
            </button>
          </div>
        )}

        {/* Note transparence */}
        <div className="mt-8 border-t border-gray-200 pt-6">
          <p className="text-xs text-gray-600">
            <strong>Note:</strong> Nous ne récupérons pas vos contacts. Vous
            contrôlez entièrement avec qui vous partagez cette information. Le
            partage est facultatif et vous ne recevez des crédits que si une
            demande aboutit (vérification bancaire ou financement).
          </p>
        </div>
      </div>
    </div>
  )
}
