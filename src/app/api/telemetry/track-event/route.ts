import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { rateLimitFormSubmission } from '@/lib/utils/rate-limiter'

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
 * SECURITY: Rate limited per IP (20 events/minute)
 */
export async function POST(request: NextRequest) {
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

    // 1.5. Ensure session exists in DB (create if first event)
    const { data: existingSession } = await supabase
      .from('client_sessions')
      .select('session_id')
      .eq('session_id', sessionId)
      .maybeSingle()

    if (!existingSession) {
      // Create anonymous session (client_id = NULL)
      await supabase
        .from('client_sessions')
        .insert({
          session_id: sessionId,
          client_id: null,
          last_activity_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()
        })
        .select()
        .single()
    } else {
      // Update last_activity_at
      await supabase
        .from('client_sessions')
        .update({ last_activity_at: new Date().toISOString() })
        .eq('session_id', sessionId)
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
