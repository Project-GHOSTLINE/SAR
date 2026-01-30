/**
 * Client-Side Telemetry Utilities
 *
 * Captures attribution data (referrer, UTM params) for tracking
 * Compatible with Identity Graph (visit_id tracking)
 */

import { getVisitHeaders, getOrCreateVisitId } from '@/lib/visit-tracking'

export interface TelemetryEventData {
  event_name: string
  page_path?: string
  referrer?: string | null
  utm?: {
    source?: string | null
    medium?: string | null
    campaign?: string | null
    term?: string | null
    content?: string | null
  } | null
  device?: {
    viewport?: { width: number; height: number }
    screen?: { width: number; height: number }
    devicePixelRatio?: number
  } | null
  properties?: Record<string, any>
}

/**
 * Extract UTM parameters from current URL
 *
 * Looks for: utm_source, utm_medium, utm_campaign, utm_term, utm_content
 */
export function extractUTMParams() {
  if (typeof window === 'undefined') {
    return null
  }

  const params = new URLSearchParams(window.location.search)
  const utm = {
    source: params.get('utm_source'),
    medium: params.get('utm_medium'),
    campaign: params.get('utm_campaign'),
    term: params.get('utm_term'),
    content: params.get('utm_content'),
  }

  // Return null if no UTM params
  if (Object.values(utm).every((v) => v === null)) {
    return null
  }

  return utm
}

/**
 * Get document referrer (where user came from)
 *
 * Returns full referrer URL or null if same-origin or no referrer
 */
export function getDocumentReferrer(): string | null {
  if (typeof document === 'undefined') {
    return null
  }

  const referrer = document.referrer

  // Filter out same-origin referrers (internal navigation)
  if (referrer && typeof window !== 'undefined') {
    try {
      const referrerURL = new URL(referrer)
      const currentURL = new URL(window.location.href)

      // If same origin, don't track (internal navigation)
      if (referrerURL.origin === currentURL.origin) {
        return null
      }

      return referrer
    } catch {
      return referrer
    }
  }

  return referrer || null
}

/**
 * Get device info (non-invasive)
 */
function getDeviceInfo() {
  if (typeof window === 'undefined') {
    return null
  }

  return {
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight,
    },
    screen: {
      width: window.screen.width,
      height: window.screen.height,
    },
    devicePixelRatio: window.devicePixelRatio || 1,
  }
}

/**
 * Send telemetry event to server
 *
 * @param eventData - Event data to track
 * @returns Promise resolving to event ID or null on failure
 */
export async function trackEvent(
  eventData: TelemetryEventData
): Promise<string | null> {
  try {
    // Ensure visit_id exists
    getOrCreateVisitId()

    // Auto-inject attribution data if not provided
    const utm = eventData.utm || extractUTMParams()
    const referrer = eventData.referrer !== undefined ? eventData.referrer : getDocumentReferrer()
    const device = eventData.device || getDeviceInfo()
    const page_path = eventData.page_path || (typeof window !== 'undefined' ? window.location.pathname : undefined)

    const payload = {
      event_name: eventData.event_name,
      page_path,
      referrer,
      utm,
      device,
      properties: eventData.properties || null,
      timestamp: new Date().toISOString(),
    }

    const response = await fetch('/api/telemetry/track-event', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getVisitHeaders(), // Include visit_id header
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      console.error('[Telemetry] Failed to track event:', response.statusText)
      return null
    }

    const result = await response.json()
    return result.id || null
  } catch (error) {
    console.error('[Telemetry] Error tracking event:', error)
    return null
  }
}

/**
 * Track page view (convenience function)
 *
 * Automatically captures referrer and UTM params
 */
export async function trackPageView(pageName?: string): Promise<void> {
  await trackEvent({
    event_name: 'page_view',
    page_path: pageName || (typeof window !== 'undefined' ? window.location.pathname : '/'),
  })
}

/**
 * Track form interaction (convenience function)
 */
export async function trackFormInteraction(
  action: 'start' | 'step' | 'abandon' | 'submit',
  formName: string,
  properties?: Record<string, any>
): Promise<void> {
  await trackEvent({
    event_name: `form_${action}`,
    properties: { form_name: formName, ...properties },
  })
}

/**
 * Track button click (convenience function)
 */
export async function trackButtonClick(
  buttonId: string,
  buttonLabel?: string
): Promise<void> {
  await trackEvent({
    event_name: 'click',
    properties: { button_id: buttonId, label: buttonLabel },
  })
}
