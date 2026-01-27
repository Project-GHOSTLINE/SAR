'use client'

import { useEffect } from 'react'
import { initClickTracking, stopClickTracking } from '@/lib/telemetry/click-tracker'

/**
 * Click Heatmap Tracker Component
 *
 * Automatically tracks all clicks on the page for heatmap visualization
 * Only runs on client-side (public pages, not admin)
 */
export default function ClickHeatmapTracker() {
  useEffect(() => {
    // Only track on non-admin pages
    if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/admin')) {
      initClickTracking()
    }

    // Cleanup on unmount
    return () => {
      stopClickTracking()
    }
  }, [])

  return null // This component renders nothing
}
