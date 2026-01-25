/**
 * Telemetry Provider Component
 *
 * Automatically tracks page views when mounted
 * Place at root layout to track all pages
 */

'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { trackPageView } from '@/lib/utils/telemetry-client'

export function TelemetryProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const lastTrackedPath = useRef<string | null>(null)
  const trackingTimeout = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    // Debounce tracking to prevent rapid-fire calls during hydration
    if (trackingTimeout.current) {
      clearTimeout(trackingTimeout.current)
    }

    trackingTimeout.current = setTimeout(() => {
      // Only track if pathname changed (prevents duplicate tracking)
      if (pathname !== lastTrackedPath.current) {
        trackPageView(pathname)
        lastTrackedPath.current = pathname
      }
    }, 100) // 100ms debounce

    return () => {
      if (trackingTimeout.current) {
        clearTimeout(trackingTimeout.current)
      }
    }
  }, [pathname])

  return <>{children}</>
}
