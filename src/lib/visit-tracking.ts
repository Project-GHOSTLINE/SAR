/**
 * Visit Tracking - Identity Graph
 *
 * Generates and persists visit_id (UUIDv4) in cookie for 30 days.
 * This enables linking:
 *   IP → visit_id → session_id → user_id → client_id
 *
 * Usage:
 *   import { getOrCreateVisitId, getVisitHeaders } from '@/lib/visit-tracking'
 *
 *   // In client component
 *   const visitId = getOrCreateVisitId()
 *
 *   // In API calls
 *   fetch('/api/...', { headers: getVisitHeaders() })
 */

const VISIT_ID_COOKIE = 'sar_visit_id';
const VISIT_ID_EXPIRY_DAYS = 30;

/**
 * Generate a new UUIDv4
 */
function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for older browsers
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Get or create visit_id from cookie
 * Returns visit_id (UUID) or null if running on server
 */
export function getOrCreateVisitId(): string | null {
  // Only run in browser
  if (typeof window === 'undefined') {
    return null;
  }

  // Try to read from cookie
  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === VISIT_ID_COOKIE) {
      return value;
    }
  }

  // Create new visit_id
  const visitId = generateUUID();
  const expires = new Date();
  expires.setDate(expires.getDate() + VISIT_ID_EXPIRY_DAYS);

  document.cookie = `${VISIT_ID_COOKIE}=${visitId}; expires=${expires.toUTCString()}; path=/; SameSite=Lax`;

  return visitId;
}

/**
 * Get visit_id from cookie (read-only, doesn't create)
 */
export function getVisitId(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === VISIT_ID_COOKIE) {
      return value;
    }
  }

  return null;
}

/**
 * Get headers to include in API calls
 * Returns object with x-sar-visit-id (and x-sar-session-id if available)
 */
export function getVisitHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};

  const visitId = getVisitId();
  if (visitId) {
    headers['x-sar-visit-id'] = visitId;
  }

  // TODO: Add session_id if you implement SAR sessions
  // const sessionId = getSessionId();
  // if (sessionId) {
  //   headers['x-sar-session-id'] = sessionId;
  // }

  return headers;
}

/**
 * Initialize visit tracking on page load
 * Call this in your root layout or _app
 */
export function initVisitTracking() {
  if (typeof window === 'undefined') {
    return;
  }

  // Create visit_id if it doesn't exist
  getOrCreateVisitId();

  // Log for debugging (remove in production)
  if (process.env.NODE_ENV === 'development') {
    console.log('[Visit Tracking] Initialized:', {
      visit_id: getVisitId(),
    });
  }
}

/**
 * Track page view event
 * Sends to /api/telemetry/track-event with visit_id
 */
export async function trackPageView(page: string) {
  if (typeof window === 'undefined') {
    return;
  }

  const visitId = getOrCreateVisitId();
  if (!visitId) {
    return;
  }

  try {
    await fetch('/api/telemetry/track-event', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getVisitHeaders(),
      },
      body: JSON.stringify({
        event_name: 'page_view',
        page_path: page,
        referrer: document.referrer || null,
        utm: extractUTMParams(),
        device: getDeviceInfo(),
        timestamp: new Date().toISOString(),
      }),
    });
  } catch (err) {
    console.error('[Visit Tracking] Failed to track page view:', err);
  }
}

/**
 * Extract UTM parameters from URL
 */
function extractUTMParams() {
  if (typeof window === 'undefined') {
    return null;
  }

  const params = new URLSearchParams(window.location.search);
  const utm = {
    source: params.get('utm_source'),
    medium: params.get('utm_medium'),
    campaign: params.get('utm_campaign'),
    term: params.get('utm_term'),
    content: params.get('utm_content'),
  };

  // Return null if no UTM params
  if (Object.values(utm).every((v) => v === null)) {
    return null;
  }

  return utm;
}

/**
 * Get basic device info (non-invasive)
 */
function getDeviceInfo() {
  if (typeof window === 'undefined') {
    return null;
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
    // User-agent will be captured server-side
  };
}
