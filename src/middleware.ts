import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

const JWT_SECRET = process.env.JWT_SECRET || 'sar-admin-secret-key-2024'

/**
 * Generate UUID v4 (compatible with Edge Runtime)
 */
function generateUUID(): string {
  return crypto.randomUUID()
}

/**
 * Hash value with salt for anonymization (using Web Crypto API)
 */
async function hashWithSalt(value: string): Promise<string> {
  const salt = process.env.TELEMETRY_HASH_SALT || 'sar-telemetry-2026'
  const encoder = new TextEncoder()
  const data = encoder.encode(value + salt)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  return hashHex.substring(0, 16) // 16 chars = 64 bits entropy
}

export async function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || ''
  const { pathname } = request.nextUrl
  const isApiRoute = pathname.startsWith('/api/')

  // TELEMETRY: Generate trace_id for request tracing
  const traceId = generateUUID()

  // Extract request metadata (anonymized)
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || 'unknown'
  const ua = request.headers.get('user-agent') || 'unknown'
  const vercelId = request.headers.get('x-vercel-id') || undefined
  const vercelRegion = request.headers.get('x-vercel-deployment-url')?.split('.')[0] || undefined

  // Hash IP and UA for privacy
  const ipHash = ip !== 'unknown' ? await hashWithSalt(ip) : undefined
  const uaHash = ua !== 'unknown' ? await hashWithSalt(ua) : undefined

  // SESSION TRACKING: Generate or retrieve session_id (NO DB write, cookie only)
  let sessionId = request.cookies.get('sar_session_id')?.value
  if (!sessionId || sessionId.length !== 64) {
    // Generate 32-byte random hex (64 chars) using Web Crypto API
    sessionId = Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
  }

  // Will be set after auth check
  let userRole: 'admin' | 'user' | 'anonymous' = 'anonymous'
  let userId: string | undefined

  // CHECK AUTHENTICATION FIRST - before any rewrite
  // Protect ALL admin pages except login page and public report page (/analyse)
  const isPublicReportPage = pathname.startsWith('/analyse')
  const isAdminRoute = pathname.startsWith('/admin') && pathname !== '/admin'
  const isAdminSubdomainRoute = hostname.startsWith('admin.') &&
                                 pathname !== '/' &&
                                 !pathname.startsWith('/_next') &&
                                 !isApiRoute &&
                                 !isPublicReportPage

  if (isAdminRoute || isAdminSubdomainRoute) {
    const token = request.cookies.get('admin-session')?.value

    if (!token) {
      const loginUrl = hostname.startsWith('admin.') ? '/' : '/admin'
      return NextResponse.redirect(new URL(loginUrl, request.url))
    }

    try {
      const secret = new TextEncoder().encode(JWT_SECRET)
      const verified = await jwtVerify(token, secret)

      // Extract user context from JWT payload
      userRole = 'admin'  // JWT verified = admin role
      userId = (verified.payload as any).userId  // If present in JWT
    } catch {
      const response = NextResponse.redirect(new URL(hostname.startsWith('admin.') ? '/' : '/admin', request.url))
      response.cookies.delete('admin-session')
      return response
    }
  }

  // Handle admin subdomain rewrites AFTER auth check
  if (hostname.startsWith('admin.')) {
    if (pathname === '/') {
      return NextResponse.rewrite(new URL('/admin', request.url))
    }
    if (!pathname.startsWith('/admin') && !isApiRoute && !pathname.startsWith('/_next')) {
      return NextResponse.rewrite(new URL('/admin' + pathname, request.url))
    }
  }

  // Handle client subdomain
  if (hostname.startsWith('client.')) {
    if (pathname === '/') {
      return NextResponse.rewrite(new URL('/client', request.url))
    }
    if (!pathname.startsWith('/client') && !isApiRoute && !pathname.startsWith('/_next')) {
      return NextResponse.rewrite(new URL('/client' + pathname, request.url))
    }
  }

  // Create response with telemetry headers
  const response = NextResponse.next()

  // Set session cookie (httpOnly, secure, sameSite=lax)
  response.cookies.set('sar_session_id', sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 90 * 24 * 60 * 60, // 90 days
    path: '/'
  })

  // Add trace_id to response headers (for client-side tracking)
  response.headers.set('x-trace-id', traceId)

  // Add session_id to headers for API routes to consume
  response.headers.set('x-sar-session-id', sessionId)

  // Add telemetry context header (for API routes to read)
  const telemetryContext = JSON.stringify({
    traceId,
    sessionId, // Available for downstream APIs
    method: request.method,
    path: pathname,
    ipHash,
    uaHash,
    vercelId,
    vercelRegion,
    role: userRole,
    userId
  })
  response.headers.set('x-telemetry-context', Buffer.from(telemetryContext).toString('base64'))

  // TELEMETRY: Write request to DB via internal API (async, fire-and-forget)
  // Using internal API route because Edge Runtime can't reliably write to DB
  const startTime = Date.now()
  const baseUrl = request.nextUrl.origin

  // Fire-and-forget: call internal API, don't await
  fetch(`${baseUrl}/api/telemetry/write`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-telemetry-key': process.env.TELEMETRY_WRITE_KEY || 'dev-key'
    },
    body: JSON.stringify({
      type: 'request',
      data: {
        trace_id: traceId,
        method: request.method,
        path: pathname,
        status: 200, // Default, actual status unknown at middleware level
        duration_ms: Date.now() - startTime,
        source: pathname.startsWith('/api/webhooks') ? 'webhook' :
                pathname.startsWith('/api/cron') ? 'cron' :
                pathname.startsWith('/api/') ? 'internal' : 'web',
        env: process.env.VERCEL_ENV || (process.env.NODE_ENV === 'production' ? 'production' : 'development'),
        ip_hash: ipHash,
        ua_hash: uaHash,
        region: vercelRegion,
        user_id: userId,
        role: userRole,
        vercel_id: vercelId,
        vercel_region: vercelRegion,
      }
    })
  }).catch(() => {
    // Silently fail - don't break request
  })

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icon-|sw.js|manifest.json|downloads/|api/telemetry/write).*)']
}
