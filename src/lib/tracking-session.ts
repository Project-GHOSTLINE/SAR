/**
 * Visitor ID Tracking System
 *
 * First-party cookie system for tracking visitors across sessions and IPs.
 * Cookie persists for 30 days and enables IP → visitor_id → client_id linking.
 */

const VISITOR_ID_COOKIE = 'sar_visitor_id'
const VISITOR_ID_DURATION = 30 * 24 * 60 * 60 * 1000 // 30 days in ms

/**
 * Get or create a visitor ID
 *
 * If cookie exists: return existing UUID
 * If not: generate new UUID, set cookie, return UUID
 */
export function getOrCreateVisitorId(): string {
  // Check if we're in browser environment
  if (typeof window === 'undefined') {
    return '' // SSR fallback
  }

  // Try to get existing cookie
  let visitorId = getCookie(VISITOR_ID_COOKIE)

  if (!visitorId || !isValidUUID(visitorId)) {
    // Generate new visitor ID
    visitorId = generateUUID()

    // Set cookie with 30 day expiration
    setCookie(VISITOR_ID_COOKIE, visitorId, VISITOR_ID_DURATION)

    console.log('[Tracking] New visitor ID created:', visitorId)
  } else {
    console.log('[Tracking] Existing visitor ID:', visitorId)
  }

  return visitorId
}

/**
 * Get a cookie value by name
 */
export function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null

  const value = `; ${document.cookie}`
  const parts = value.split(`; ${name}=`)

  if (parts.length === 2) {
    const cookieValue = parts.pop()?.split(';').shift()
    return cookieValue || null
  }

  return null
}

/**
 * Set a cookie with expiration
 */
export function setCookie(name: string, value: string, maxAge: number): void {
  if (typeof document === 'undefined') return

  const expires = new Date(Date.now() + maxAge).toUTCString()

  document.cookie = [
    `${name}=${value}`,
    `path=/`,
    `max-age=${Math.floor(maxAge / 1000)}`,
    `expires=${expires}`,
    `SameSite=Lax`,
    window.location.protocol === 'https:' ? 'Secure' : ''
  ].filter(Boolean).join('; ')

  console.log('[Tracking] Cookie set:', name, '=', value.substring(0, 8) + '...')
}

/**
 * Delete a cookie
 */
export function deleteCookie(name: string): void {
  if (typeof document === 'undefined') return

  document.cookie = `${name}=; path=/; max-age=0`
  console.log('[Tracking] Cookie deleted:', name)
}

/**
 * Generate a UUID v4
 */
function generateUUID(): string {
  // Use crypto.randomUUID if available (modern browsers)
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }

  // Fallback: manual UUID generation
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

/**
 * Validate UUID format
 */
function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(uuid)
}

/**
 * Get visitor metadata (for debugging/logging)
 */
export function getVisitorMetadata(): {
  visitorId: string
  cookieExists: boolean
  browserSupport: {
    cookies: boolean
    crypto: boolean
    localStorage: boolean
  }
} {
  const visitorId = getOrCreateVisitorId()
  const cookieExists = getCookie(VISITOR_ID_COOKIE) !== null

  return {
    visitorId,
    cookieExists,
    browserSupport: {
      cookies: typeof document !== 'undefined' && navigator.cookieEnabled,
      crypto: typeof crypto !== 'undefined' && !!crypto.randomUUID,
      localStorage: typeof localStorage !== 'undefined'
    }
  }
}

/**
 * Reset visitor ID (for testing)
 */
export function resetVisitorId(): string {
  deleteCookie(VISITOR_ID_COOKIE)
  return getOrCreateVisitorId()
}
