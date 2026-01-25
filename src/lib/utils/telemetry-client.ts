/**
 * Client-Side Telemetry Utilities
 *
 * Captures attribution data (referrer, UTM params) for tracking
 */

export interface TelemetryEventData {
  event_type: string
  event_name: string
  page_url?: string
  referrer_url?: string | null
  duration_ms?: number
  payload?: Record<string, any>
  // Attribution data (captured from URL/browser)
  utm_source?: string | null
  utm_medium?: string | null
  utm_campaign?: string | null
}

/**
 * Extract UTM parameters from current URL
 *
 * Looks for: utm_source, utm_medium, utm_campaign, utm_term, utm_content
 */
export function extractUTMParams(): {
  utm_source: string | null
  utm_medium: string | null
  utm_campaign: string | null
} {
  if (typeof window === 'undefined') {
    return { utm_source: null, utm_medium: null, utm_campaign: null }
  }

  const params = new URLSearchParams(window.location.search)

  return {
    utm_source: params.get('utm_source'),
    utm_medium: params.get('utm_medium'),
    utm_campaign: params.get('utm_campaign'),
  }
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
 * Send telemetry event to server
 *
 * @param eventData - Event data to track
 * @returns Promise resolving to event ID or null on failure
 */
export async function trackEvent(
  eventData: TelemetryEventData
): Promise<string | null> {
  try {
    // Auto-inject attribution data if not provided
    const utm = extractUTMParams()
    const referrer = getDocumentReferrer()

    const payload: TelemetryEventData = {
      ...eventData,
      page_url: eventData.page_url || (typeof window !== 'undefined' ? window.location.pathname : undefined),
      referrer_url: eventData.referrer_url || referrer,
      utm_source: eventData.utm_source !== undefined ? eventData.utm_source : utm.utm_source,
      utm_medium: eventData.utm_medium !== undefined ? eventData.utm_medium : utm.utm_medium,
      utm_campaign: eventData.utm_campaign !== undefined ? eventData.utm_campaign : utm.utm_campaign,
    }

    const response = await fetch('/api/telemetry/track-event', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      console.error('[Telemetry] Failed to track event:', response.statusText)
      return null
    }

    const result = await response.json()
    return result.event_id || null
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
    event_type: 'page_view',
    event_name: pageName || (typeof window !== 'undefined' ? window.location.pathname : '/'),
  })
}

/**
 * Track form interaction (convenience function)
 */
export async function trackFormInteraction(
  action: 'start' | 'step' | 'abandon' | 'submit',
  formName: string,
  payload?: Record<string, any>
): Promise<void> {
  await trackEvent({
    event_type: `form_${action}`,
    event_name: formName,
    payload,
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
    event_type: 'button_click',
    event_name: buttonId,
    payload: buttonLabel ? { label: buttonLabel } : undefined,
  })
}
