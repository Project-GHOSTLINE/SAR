'use client'

import { useEffect } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

declare global {
  interface Window {
    gtag: (...args: any[]) => void
    dataLayer: any[]
    _axcb?: any[]
    axeptioSettings?: any
  }
}

export default function GoogleAnalytics() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const GA_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID

  // Track page views when route changes
  useEffect(() => {
    if (!GA_ID || typeof window === 'undefined' || !window.gtag) return

    const url = pathname + (searchParams.toString() ? `?${searchParams.toString()}` : '')
    window.gtag('config', GA_ID, {
      page_path: url
    })
  }, [pathname, searchParams, GA_ID])

  // Wait for Axeptio consent before loading GA
  useEffect(() => {
    if (!GA_ID || typeof window === 'undefined') return

    let gaLoaded = false
    let checkInterval: NodeJS.Timeout
    let fallbackTimeout: NodeJS.Timeout

    const loadGA = () => {
      if (gaLoaded) return
      gaLoaded = true

      console.log('✅ Loading Google Analytics')

      // Load gtag.js script
      const script1 = document.createElement('script')
      script1.async = true
      script1.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`
      document.head.appendChild(script1)

      // Initialize dataLayer and gtag
      window.dataLayer = window.dataLayer || []
      window.gtag = function() { window.dataLayer.push(arguments) }
      window.gtag('js', new Date())
      window.gtag('config', GA_ID, {
        page_path: window.location.pathname,
        send_page_view: true,
        anonymize_ip: true,
        cookie_flags: 'SameSite=None;Secure'
      })
    }

    // Wait for Axeptio SDK to be fully loaded
    const waitForAxeptio = () => {
      checkInterval = setInterval(() => {
        // Check if Axeptio SDK is loaded AND widget is present
        if (window._axcb && typeof window._axcb.push === 'function') {
          clearInterval(checkInterval)
          clearTimeout(fallbackTimeout)

          console.log('🍪 Axeptio SDK ready - Registering consent listener')

          window._axcb.push((axeptio: any) => {
            axeptio.on('cookies:complete', (choices: any) => {
              console.log('🍪 Consent received:', choices)
              if (choices.google_analytics) {
                console.log('✅ Analytics consent given')
                loadGA()
              } else {
                console.log('❌ Analytics consent denied')
              }
            })
          })
        }
      }, 200)

      // Fallback: if Axeptio doesn't initialize in 10 seconds, skip GA
      fallbackTimeout = setTimeout(() => {
        clearInterval(checkInterval)
        if (!gaLoaded) {
          console.log('⚠️ Axeptio timeout - GA will not load without consent')
        }
      }, 10000)
    }

    // Start waiting after a small delay to let Axeptio initialize first
    const initDelay = setTimeout(waitForAxeptio, 500)

    return () => {
      clearInterval(checkInterval)
      clearTimeout(fallbackTimeout)
      clearTimeout(initDelay)
    }
  }, [GA_ID])

  return null
}
