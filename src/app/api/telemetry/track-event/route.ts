import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createHash } from 'crypto'
import { rateLimitFormSubmission } from '@/lib/utils/rate-limiter'
import { parseUserAgent, stripQueryParams as stripQueryParamsUtil } from '@/lib/utils/ua-parser'
import { getIPGeoData, getMockGeoData } from '@/lib/utils/ip-geolocation'
import {
  trackTelemetryPerformance,
  trackSessionCreated,
  trackSecurityEvent,
} from '@/lib/utils/vercel-observability'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * Hash value with salt for anonymization (Node.js crypto)
 * SECURITY: TELEMETRY_HASH_SALT must be set (no fallback)
 */
function hashWithSalt(value: string): string | null {
  const salt = process.env.TELEMETRY_HASH_SALT

  if (!salt) {
    console.error('[SECURITY] TELEMETRY_HASH_SALT not set - skipping hash')
    return null
  }

  return createHash('sha256')
    .update(value + salt)
    .digest('hex')
    .substring(0, 16) // 16 chars = 64 bits entropy
}

/**
 * POST /api/telemetry/track-event
 *
 * Client-side event tracking (page views, form interactions, button clicks)
 * Linked to session_id (pseudonymous) until client linkage
 *
 * PHASE 2: Captures referrer + UTM + device + geo data on FIRST event
 *
 * Payload MUST be sanitized (whitelist keys only)
 * SECURITY: Rate limited per IP (20 events/minute)
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now() // Vercel Observability: Track performance

  try {
    // 0. RATE LIMITING: Prevent abuse (20 events per minute per IP)
    const clientIP =
      request.headers.get('x-forwarded-for')?.split(',')[0] ||
      request.headers.get('x-real-ip') ||
      'unknown'

    const rateLimit = await rateLimitFormSubmission(clientIP)
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded. Please slow down.',
          resetAt: rateLimit.resetAt.toISOString(),
        },
        { status: 429 }
      )
    }

    // 1. Extract session_id from cookie (required)
    const sessionId = request.cookies.get('sar_session_id')?.value
    if (!sessionId) {
      return NextResponse.json(
        { error: 'No session ID found' },
        { status: 400 }
      )
    }

    // 2. Parse request body (before session check, need UTM params)
    const body = await request.json()
    const {
      event_type,
      event_name,
      page_url,
      referrer_url,
      duration_ms,
      payload,
      // NEW: UTM params from client
      utm_source,
      utm_medium,
      utm_campaign,
    } = body

    // 1.5. Ensure session exists in DB (create if first event)
    const { data: existingSession } = await supabase
      .from('client_sessions')
      .select('session_id')
      .eq('session_id', sessionId)
      .maybeSingle()

    if (!existingSession) {
      // ========================================================================
      // FIRST EVENT: Capture EVERYTHING (referrer, UTM, device, geo)
      // ========================================================================
      console.log('[TrackEvent] First event for session:', sessionId.substring(0, 16) + '...')

      // Extract server-side data
      const userAgent = request.headers.get('user-agent') || 'unknown'
      const referrer = request.headers.get('referer') || referrer_url || null

      // Parse device metadata (server-side)
      const parsedUA = parseUserAgent(userAgent)

      // Hash IP/UA with salt
      const ipHash = clientIP && clientIP !== 'unknown' ? hashWithSalt(clientIP) : null
      const uaHash = userAgent && userAgent !== 'unknown' ? hashWithSalt(userAgent) : null

      // Geolocation (ASN, Country, IP prefix)
      const geoData = process.env.NODE_ENV === 'development'
        ? getMockGeoData(clientIP)
        : await getIPGeoData(clientIP)

      console.log('[TrackEvent] Captured data:', {
        referrer: referrer ? stripQueryParamsUtil(referrer) : null,
        utm_source,
        utm_medium,
        utm_campaign,
        device: parsedUA.device_type,
        browser: parsedUA.browser,
        os: parsedUA.os,
        asn: geoData.asn,
        country: geoData.country_code,
        is_vpn: geoData.is_vpn,
      })

      // Create anonymous session with FULL metadata
      const { error: sessionInsertError } = await supabase
        .from('client_sessions')
        .insert({
          session_id: sessionId,
          client_id: null, // Anonymous until voluntary linkage
          last_activity_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
          // Attribution data (captured ONCE at first event)
          first_referrer: referrer ? stripQueryParamsUtil(referrer) : null,
          first_utm_source: utm_source || null,
          first_utm_medium: utm_medium || null,
          first_utm_campaign: utm_campaign || null,
          // Device metadata (server-parsed)
          device_type: parsedUA.device_type,
          browser: parsedUA.browser,
          os: parsedUA.os,
          // Security hashes
          ip_hash: ipHash,
          ua_hash: uaHash,
          // Geolocation (Phase 2)
          asn: geoData.asn,
          country_code: geoData.country_code,
          ip_prefix: geoData.ip_prefix,
        })
        .select()
        .single()

      if (sessionInsertError) {
        console.error('[TrackEvent] Failed to create session:', sessionInsertError)
        // Continue anyway, event can still be logged
      }

      // Vercel Observability: Track session creation
      trackSessionCreated(
        parsedUA.device_type || 'unknown',
        !!(utm_source || utm_medium || utm_campaign),
        geoData.country_code || 'unknown'
      )

      // SECURITY EVENTS: Detect VPN/Proxy on first visit
      if (geoData.is_vpn || geoData.is_proxy) {
        console.warn('[Security] VPN/Proxy detected on first visit:', {
          session: sessionId.substring(0, 16) + '...',
          asn: geoData.asn,
          is_vpn: geoData.is_vpn,
          is_proxy: geoData.is_proxy,
        })

        try {
          await supabase
            .from('security_events')
            .insert({
              session_id: sessionId,
              event_type: 'vpn_detected',
              ip_hash: ipHash,
              ip_prefix: geoData.ip_prefix,
              ua_hash: uaHash,
              asn: geoData.asn,
              country_code: geoData.country_code,
              meta: {
                is_vpn: geoData.is_vpn,
                is_proxy: geoData.is_proxy,
                is_hosting: geoData.is_hosting,
                detected_at: 'first_visit',
              },
            })

          // Vercel Observability: Track VPN/Proxy detection
          trackSecurityEvent('vpn_detected', geoData.asn || 0)
        } catch (securityError) {
          console.warn('[Security] Failed to log VPN event (table may not exist):', securityError)
          // Non-critical, continue
        }
      }

      // SECURITY EVENTS: Detect hosting provider (bot indicator)
      if (geoData.is_hosting) {
        console.warn('[Security] Hosting provider detected on first visit:', {
          session: sessionId.substring(0, 16) + '...',
          asn: geoData.asn,
        })

        try {
          await supabase
            .from('security_events')
            .insert({
              session_id: sessionId,
              event_type: 'bot_detected',
              ip_hash: ipHash,
              ip_prefix: geoData.ip_prefix,
              ua_hash: uaHash,
              asn: geoData.asn,
              country_code: geoData.country_code,
              meta: {
                reason: 'hosting_provider_asn',
                asn: geoData.asn,
                detected_at: 'first_visit',
              },
            })

          // Vercel Observability: Track bot detection
          trackSecurityEvent('bot_detected', geoData.asn || 0)
        } catch (securityError) {
          console.warn('[Security] Failed to log bot event (table may not exist):', securityError)
          // Non-critical, continue
        }
      }
    } else {
      // Update last_activity_at (session already exists)
      await supabase
        .from('client_sessions')
        .update({ last_activity_at: new Date().toISOString() })
        .eq('session_id', sessionId)
    }

    // 3. Validate required fields
    if (!event_type || !event_name) {
      return NextResponse.json(
        { error: 'Missing required fields: event_type, event_name' },
        { status: 400 }
      )
    }

    // 4. Extract trace_id from header (optional, for correlation)
    const traceId = request.headers.get('x-trace-id') || undefined

    // 5. Sanitize payload (whitelist keys only, strip PII)
    const sanitizedPayload = sanitizePayload(payload)

    // 6. Strip query params from URLs (privacy)
    const cleanPageUrl = stripQueryParamsUtil(page_url)
    const cleanReferrerUrl = stripQueryParamsUtil(referrer_url)

    // 7. Insert event into database
    const { data, error } = await supabase
      .from('client_telemetry_events')
      .insert({
        session_id: sessionId,
        trace_id: traceId,
        event_type,
        event_name,
        page_url: cleanPageUrl,
        referrer_url: cleanReferrerUrl,
        duration_ms: duration_ms ? parseInt(duration_ms) : null,
        payload: sanitizedPayload
      })
      .select('id')
      .single()

    if (error) {
      console.error('[TrackEvent] Insert error:', error)
      return NextResponse.json(
        { error: 'Failed to insert event', details: error.message },
        { status: 500 }
      )
    }

    // Vercel Observability: Track successful request
    const duration = Date.now() - startTime
    trackTelemetryPerformance('/api/telemetry/track-event', duration, true)

    return NextResponse.json({
      success: true,
      event_id: data.id
    })

  } catch (error) {
    // ENHANCED LOGGING: Capture full error details for debugging
    console.error('[TrackEvent] CRITICAL ERROR:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined,
      sessionId: request.cookies.get('sar_session_id')?.value?.substring(0, 16) + '...',
      timestamp: new Date().toISOString()
    })

    // Vercel Observability: Track failed request
    const duration = Date.now() - startTime
    trackTelemetryPerformance('/api/telemetry/track-event', duration, false)

    return NextResponse.json(
      {
        error: 'Internal server error',
        // Include error details in development
        ...(process.env.NODE_ENV === 'development' && {
          debug: {
            message: error instanceof Error ? error.message : String(error),
            type: error instanceof Error ? error.name : typeof error
          }
        })
      },
      { status: 500 }
    )
  }
}

/**
 * Sanitize payload: Allow only whitelisted keys, strip PII
 *
 * Whitelist: step, field_count, scroll_depth, button_id, form_field
 */
function sanitizePayload(payload: any): Record<string, any> {
  if (!payload || typeof payload !== 'object') {
    return {}
  }

  const allowedKeys = [
    'step',
    'field_count',
    'scroll_depth',
    'button_id',
    'form_field',
    'section',
    'action',
    'value'
  ]

  const sanitized: Record<string, any> = {}

  for (const key of allowedKeys) {
    if (payload[key] !== undefined) {
      // Additional check: no PII in values
      const value = payload[key]
      if (typeof value === 'string') {
        // Strip if looks like email, phone, or contains PII patterns
        if (containsPII(value)) {
          continue // Skip this field
        }
      }
      sanitized[key] = value
    }
  }

  return sanitized
}

/**
 * Check if string contains PII patterns
 */
function containsPII(str: string): boolean {
  const piiPatterns = [
    /@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/, // email
    /\d{3}[-.]?\d{3}[-.]?\d{4}/, // phone
    /\b\d{9}\b/, // SSN-like
    /\b[A-Z][a-z]+ [A-Z][a-z]+\b/ // Full name (capitalized)
  ]

  return piiPatterns.some(pattern => pattern.test(str))
}

// stripQueryParams is now imported from @/lib/utils/ua-parser
