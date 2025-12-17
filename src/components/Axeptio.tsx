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
      cookiesVersion: "solutionargentrapide-fr"
    }

    // Chargement du script Axeptio
    const script = document.createElement('script')
    script.src = "//static.axept.io/sdk.js"
    script.async = true
    document.body.appendChild(script)

    return () => {
      // Cleanup si nécessaire
      const existingScript = document.querySelector('script[src="//static.axept.io/sdk.js"]')
      if (existingScript) {
        existingScript.remove()
      }
    }
  }, [])

  return null
}
