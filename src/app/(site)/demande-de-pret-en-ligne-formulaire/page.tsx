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
    <div className="bg-white dark:bg-gray-900 min-h-screen pt-[72px]">
      {/* Iframe Margill - Optimisé pour mobile et desktop */}
      <iframe
        src="https://argentrapide.margill.com/myform.htm?origin=argentrapide&langue=Français"
        className="w-full"
        style={{
          border: 'none',
          height: 'calc(100vh - 72px)',
          overflow: 'hidden'
        }}
        title="Formulaire de demande de prêt"
      />
    </div>
  )
}
