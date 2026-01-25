import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * POST /api/telemetry/track-event
 *
 * Client-side event tracking (page views, form interactions, button clicks)
 * Linked to session_id (pseudonymous) until client linkage
 *
 * Payload MUST be sanitized (whitelist keys only)
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Extract session_id from cookie (required)
    const sessionId = request.cookies.get('sar_session_id')?.value
    if (!sessionId) {
      return NextResponse.json(
        { error: 'No session ID found' },
        { status: 400 }
      )
    }

    // 2. Parse request body
    const body = await request.json()
    const {
      event_type,
      event_name,
      page_url,
      referrer_url,
      duration_ms,
      payload
    } = body

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
    const cleanPageUrl = stripQueryParams(page_url)
    const cleanReferrerUrl = stripQueryParams(referrer_url)

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

    return NextResponse.json({
      success: true,
      event_id: data.id
    })

  } catch (error) {
    console.error('[TrackEvent] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
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

/**
 * Strip query params from URL (keep only origin + pathname)
 */
function stripQueryParams(url?: string): string | undefined {
  if (!url) return undefined

  try {
    const parsed = new URL(url)
    return parsed.origin + parsed.pathname
  } catch {
    // If not a full URL, return as-is (might be just a pathname)
    return url.split('?')[0]
  }
}
