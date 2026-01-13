'use client'

import Script from 'next/script'
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

  useEffect(() => {
    if (!GA_ID || typeof window === 'undefined') return

    // Track page views
    const url = pathname + (searchParams.toString() ? `?${searchParams.toString()}` : '')

    if (window.gtag) {
      window.gtag('config', GA_ID, {
        page_path: url
      })
    }
  }, [pathname, searchParams, GA_ID])

  // Initialize GA only after Axeptio consent
  useEffect(() => {
    if (!GA_ID || typeof window === 'undefined') return

    // Check if Axeptio is present
    if (window._axcb) {
      window._axcb.push((axeptio: any) => {
        axeptio.on('cookies:complete', (choices: any) => {
          // Only initialize if user consented to analytics
          if (choices.google_analytics) {
            console.log('✅ Analytics consent given - Initializing GA4')
            initializeGA()
          } else {
            console.log('❌ Analytics consent denied')
          }
        })
      })
    } else {
      // No Axeptio, initialize directly (development)
      console.log('⚠️ No Axeptio detected - Initializing GA4 directly')
      initializeGA()
    }

    function initializeGA() {
      if (window.gtag) {
        window.gtag('js', new Date())
        window.gtag('config', GA_ID!, {
          page_path: window.location.pathname,
          send_page_view: true,
          anonymize_ip: true, // RGPD compliance
          cookie_flags: 'SameSite=None;Secure'
        })
      }
    }
  }, [GA_ID])

  if (!GA_ID) {
    console.warn('⚠️ Google Analytics Measurement ID not found')
    return null
  }

  return (
    <>
      <Script
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
      />
      <Script
        id="google-analytics-init"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());

            // Don't send page view yet, wait for consent
            gtag('config', '${GA_ID}', {
              page_path: window.location.pathname,
              send_page_view: false,
              anonymize_ip: true
            });
          `
        }}
      />
    </>
  )
}
