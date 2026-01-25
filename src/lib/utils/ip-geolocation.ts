/**
 * IP Geolocation Utilities
 *
 * Capture ASN, Country, IP prefix for fraud detection
 * Uses ipapi.co (free tier: 1000 req/day)
 *
 * SECURITY: Never stores raw IP, only hashed + aggregated metadata
 */

export interface IPGeoData {
  asn: number | null
  country_code: string | null
  ip_prefix: string | null
  is_vpn: boolean
  is_hosting: boolean
  is_proxy: boolean
}

/**
 * Known VPN/Proxy ASNs (partial list - expand as needed)
 * Source: https://github.com/X4BNet/lists_vpn
 */
const KNOWN_VPN_ASNS = new Set([
  // NordVPN
  209103, 206264,
  // ExpressVPN
  396303,
  // ProtonVPN
  62371,
  // Mullvad
  198301,
  // Add more as detected
])

/**
 * Known hosting provider ASNs (not residential)
 * Fraudsters often use VPS/cloud to hide real IP
 */
const KNOWN_HOSTING_ASNS = new Set([
  // DigitalOcean
  14061,
  // AWS
  16509, 14618,
  // Google Cloud
  15169,
  // Microsoft Azure
  8075,
  // Linode
  63949,
  // Vultr
  20473,
  // OVH
  16276,
  // Hetzner
  24940,
])

/**
 * Fetch IP geolocation data from ipapi.co
 *
 * @param ip - Client IP address
 * @returns IPGeoData with ASN, country, IP prefix, VPN/hosting flags
 */
export async function getIPGeoData(ip: string): Promise<IPGeoData> {
  const nullResult: IPGeoData = {
    asn: null,
    country_code: null,
    ip_prefix: null,
    is_vpn: false,
    is_hosting: false,
    is_proxy: false,
  }

  // Skip localhost / private IPs
  if (
    !ip ||
    ip === 'unknown' ||
    ip === '127.0.0.1' ||
    ip.startsWith('::') ||
    ip.startsWith('192.168.') ||
    ip.startsWith('10.') ||
    ip.startsWith('172.16.')
  ) {
    return nullResult
  }

  try {
    // PRODUCTION: Use ipapi.co (1000 req/day free)
    // ALTERNATIVE: ip-api.com (45 req/min free, no HTTPS on free tier)
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 3000) // 3s timeout

    const res = await fetch(`https://ipapi.co/${ip}/json/`, {
      headers: {
        'User-Agent': 'SAR-Telemetry/1.0',
      },
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!res.ok) {
      console.error(`[GeoIP] HTTP ${res.status} for IP ${ip}`)
      return nullResult
    }

    const data = await res.json()

    // Check for error response
    if (data.error) {
      console.error('[GeoIP] API error:', data.reason)
      return nullResult
    }

    // Extract ASN (format: "AS12345" -> 12345)
    const asn = data.asn ? parseInt(data.asn.replace('AS', '')) : null

    // Detect VPN/Hosting/Proxy
    const is_vpn = asn ? KNOWN_VPN_ASNS.has(asn) : false
    const is_hosting = asn ? KNOWN_HOSTING_ASNS.has(asn) : false
    const is_proxy =
      data.org?.toLowerCase().includes('proxy') ||
      data.org?.toLowerCase().includes('vpn') ||
      false

    return {
      asn: asn,
      country_code: data.country_code || null,
      ip_prefix: data.network || null, // Ex: "192.168.1.0/24"
      is_vpn,
      is_hosting,
      is_proxy,
    }
  } catch (error) {
    if ((error as Error).name === 'AbortError') {
      console.error('[GeoIP] Timeout after 3s')
    } else {
      console.error('[GeoIP] Lookup failed:', error)
    }
    return nullResult
  }
}

/**
 * Check if ASN is suspicious (VPN/hosting/proxy)
 *
 * @param asn - Autonomous System Number
 * @returns true if ASN is known VPN/hosting/proxy
 */
export function isSuspiciousASN(asn: number | null): boolean {
  if (!asn) return false
  return KNOWN_VPN_ASNS.has(asn) || KNOWN_HOSTING_ASNS.has(asn)
}

/**
 * DEVELOPMENT ONLY: Mock geolocation for localhost
 *
 * @param ip - Client IP
 * @returns Mock data for testing
 */
export function getMockGeoData(ip: string): IPGeoData {
  if (process.env.NODE_ENV !== 'development') {
    throw new Error('getMockGeoData is for development only')
  }

  // Simulate Canadian user
  if (ip === '127.0.0.1' || ip.startsWith('::')) {
    return {
      asn: 577, // Bell Canada
      country_code: 'CA',
      ip_prefix: '127.0.0.0/8',
      is_vpn: false,
      is_hosting: false,
      is_proxy: false,
    }
  }

  return {
    asn: null,
    country_code: null,
    ip_prefix: null,
    is_vpn: false,
    is_hosting: false,
    is_proxy: false,
  }
}
