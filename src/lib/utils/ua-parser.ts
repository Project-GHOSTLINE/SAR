/**
 * Server-side User-Agent parsing (NEVER trust client-provided data)
 *
 * Source: request.headers.get('user-agent')
 * Privacy: No fingerprinting, only aggregated categories
 * Retention: 90 days (stored in client_sessions)
 */

export interface ParsedUA {
  device_type: 'Desktop' | 'Mobile' | 'Tablet' | 'Unknown'
  browser: string
  os: string
}

/**
 * Parse User-Agent string (simple regex-based, no external lib)
 */
export function parseUserAgent(ua: string | null): ParsedUA {
  if (!ua) {
    return {
      device_type: 'Unknown',
      browser: 'Unknown',
      os: 'Unknown'
    }
  }

  // Device type detection
  let device_type: ParsedUA['device_type'] = 'Desktop'
  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
    device_type = 'Tablet'
  } else if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) {
    device_type = 'Mobile'
  }

  // Browser detection
  let browser = 'Unknown'
  if (ua.includes('Chrome') && !ua.includes('Edg')) {
    browser = 'Chrome'
  } else if (ua.includes('Edg')) {
    browser = 'Edge'
  } else if (ua.includes('Safari') && !ua.includes('Chrome')) {
    browser = 'Safari'
  } else if (ua.includes('Firefox')) {
    browser = 'Firefox'
  } else if (ua.includes('MSIE') || ua.includes('Trident/')) {
    browser = 'IE'
  } else if (ua.includes('Opera') || ua.includes('OPR')) {
    browser = 'Opera'
  }

  // OS detection
  let os = 'Unknown'
  if (ua.includes('Windows NT 10.0')) {
    os = 'Windows 10'
  } else if (ua.includes('Windows NT')) {
    os = 'Windows'
  } else if (ua.includes('Mac OS X')) {
    os = 'macOS'
  } else if (ua.includes('Android')) {
    os = 'Android'
  } else if (ua.includes('iPhone') || ua.includes('iPad')) {
    os = 'iOS'
  } else if (ua.includes('Linux')) {
    os = 'Linux'
  }

  return {
    device_type,
    browser,
    os
  }
}

/**
 * Strip query params from URL (privacy: remove tracking params)
 */
export function stripQueryParams(url: string | null | undefined): string | null {
  if (!url) return null

  try {
    const parsed = new URL(url)
    return parsed.origin + parsed.pathname
  } catch {
    // Not a full URL, might be just pathname
    return url.split('?')[0] || null
  }
}
