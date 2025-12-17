'use client'

import { useEffect } from 'react'

export default function CreditRequestPage() {
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      console.log("Message recu du domaine :", event.origin, event.data)
      if (event.origin === "https://argentrapide.margill.com") {
        if (event.data && event.data.type === "redirect" && event.data.url) {
          console.log("Redirection demandee :", event.data.url)
          window.location.href = event.data.url
        }
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [])

  return (
    <div className="py-8 bg-sar-grey min-h-screen">
      <div className="container mx-auto px-4">
        <h1 className="section-title text-center">Demandez votre credit</h1>
        <p className="section-subtitle text-center">Remplissez le formulaire ci-dessous pour soumettre votre demande</p>

        <div className="flex justify-center">
          <iframe
            src="https://argentrapide.margill.com/myform.htm?origin=argentrapide&langue=Fran%C3%A7ais"
            style={{
              border: 'none',
              height: '900px',
              width: '100%',
              maxWidth: '1250px',
              overflow: 'hidden'
            }}
            allow="camera; microphone"
            title="Formulaire de demande de credit"
          />
        </div>
      </div>
    </div>
  )
}
