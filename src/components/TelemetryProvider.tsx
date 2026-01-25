/**
 * Telemetry Provider Component
 *
 * Automatically tracks page views when mounted
 * Place at root layout to track all pages
 */

'use client'

import { useEffect } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { trackPageView } from '@/lib/utils/telemetry-client'

export function TelemetryProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    // Track page view on mount and route changes
    trackPageView(pathname)
  }, [pathname, searchParams])

  return <>{children}</>
}
