'use client'

import { useEffect } from 'react'

export default function CreditRequestPage() {
  useEffect(() => {
    // Écouter les messages du formulaire Margill pour les redirections
    const handleMessage = (event: MessageEvent) => {
      console.log('📨 Message reçu du domaine:', event.origin, event.data)

      // Vérifier que le message vient bien de Margill
      if (event.origin === 'https://argentrapide.margill.com') {
        if (event.data && event.data.type === 'redirect' && event.data.url) {
          console.log('🔁 Redirection demandée:', event.data.url)
          window.location.href = event.data.url
        }
      }
    }

    window.addEventListener('message', handleMessage)

    return () => {
      window.removeEventListener('message', handleMessage)
    }
  }, [])

  return (
    <div className="py-12 bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 min-h-screen">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
            Demandez votre crédit
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Remplissez le formulaire ci-dessous pour faire votre demande
          </p>
        </div>

        {/* Iframe Margill */}
        <div className="flex justify-center">
          <iframe
            src="https://argentrapide.margill.com/myform.htm?origin=argentrapide&langue=Français"
            style={{
              border: 'none',
              height: '900px',
              width: '1250px',
              maxWidth: '100%',
              overflow: 'hidden'
            }}
            title="Formulaire de demande de prêt"
          />
        </div>
      </div>
    </div>
  )
}
