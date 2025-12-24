'use client'

import { useEffect } from 'react'

declare global {
  interface Window {
    axeptioSettings: {
      clientId: string
      cookiesVersion: string
    }
  }
}

export default function Axeptio() {
  useEffect(() => {
    // Configuration Axeptio
    window.axeptioSettings = {
      clientId: "6942e2e1ed7f7412dd4a11f2",
      cookiesVersion: "1257bf70-6df8-4962-a0ba-272366be4584"
    }

    // Chargement du script Axeptio
    const script = document.createElement('script')
    script.src = "https://static.axept.io/sdk.js"
    script.async = true
    document.body.appendChild(script)

    return () => {
      // Cleanup si nécessaire
      const existingScript = document.querySelector('script[src="https://static.axept.io/sdk.js"]')
      if (existingScript) {
        existingScript.remove()
      }
    }
  }, [])

  return null
}
