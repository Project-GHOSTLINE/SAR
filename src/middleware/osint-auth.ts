/**
 * 🔐 OSINT Authentication Middleware
 * Protège les routes OSINT avec JWT + Admin role
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

// Rate limiting storage
const rateLimits = new Map<string, { count: number; reset: number }>()

interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetIn?: number
}

/**
 * Rate limiter: 5 requêtes/heure par IP
 */
function checkRateLimit(ip: string, maxRequests: number = 5, windowMs: number = 3600000): RateLimitResult {
  const now = Date.now()
  const record = rateLimits.get(ip)

  // Nettoyer les vieux records (garbage collection)
  if (rateLimits.size > 10000) {
    Array.from(rateLimits.entries()).forEach(([key, value]) => {
      if (now > value.reset) {
        rateLimits.delete(key)
      }
    })
  }

  if (!record || now > record.reset) {
    rateLimits.set(ip, { count: 1, reset: now + windowMs })
    return { allowed: true, remaining: maxRequests - 1 }
  }

  if (record.count >= maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetIn: Math.ceil((record.reset - now) / 1000)
    }
  }

  record.count++
  return { allowed: true, remaining: maxRequests - record.count }
}

/**
 * Logger les événements de sécurité
 */
async function logSecurityEvent(event: {
  type: string
  ip: string
  path: string
  user_id?: string
  has_token?: boolean
  success?: boolean
  reason?: string
}) {
  try {
    await supabase.from('security_logs').insert({
      event_type: event.type,
      ip_address: event.ip,
      request_path: event.path,
      user_id: event.user_id,
      metadata: {
        has_token: event.has_token,
        success: event.success,
        reason: event.reason
      },
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('[SecurityLog] Failed to log event:', error)
  }
}

/**
 * Middleware d'authentification pour routes OSINT
 */
export async function osintAuthMiddleware(request: NextRequest): Promise<NextResponse | null> {
  const ip = request.ip || request.headers.get('x-forwarded-for') || 'unknown'
  const path = request.nextUrl.pathname

  // 1. Rate limiting
  const rateLimit = checkRateLimit(ip)
  if (!rateLimit.allowed) {
    await logSecurityEvent({
      type: 'osint_rate_limited',
      ip,
      path,
      success: false,
      reason: 'Rate limit exceeded'
    })

    return NextResponse.json(
      {
        success: false,
        error: 'Rate limit exceeded',
        message: `Too many requests. Try again in ${rateLimit.resetIn} seconds.`
      },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': '5',
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(rateLimit.resetIn)
        }
      }
    )
  }

  // 2. Vérifier token JWT
  const authHeader = request.headers.get('authorization')
  const token = authHeader?.replace('Bearer ', '')

  if (!token) {
    await logSecurityEvent({
      type: 'osint_access_denied',
      ip,
      path,
      has_token: false,
      success: false,
      reason: 'No authentication token'
    })

    return NextResponse.json(
      {
        success: false,
        error: 'Authentication required',
        message: 'OSINT routes require admin authentication. Please provide a valid JWT token.'
      },
      { status: 401 }
    )
  }

  // 3. Vérifier token avec Supabase
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token)

    if (error || !user) {
      await logSecurityEvent({
        type: 'osint_access_denied',
        ip,
        path,
        has_token: true,
        success: false,
        reason: 'Invalid token'
      })

      return NextResponse.json(
        {
          success: false,
          error: 'Invalid token',
          message: 'JWT verification failed. Please login again.'
        },
        { status: 401 }
      )
    }

    // 4. Vérifier rôle admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'admin') {
      await logSecurityEvent({
        type: 'osint_access_denied',
        ip,
        path,
        user_id: user.id,
        has_token: true,
        success: false,
        reason: 'Insufficient permissions'
      })

      return NextResponse.json(
        {
          success: false,
          error: 'Forbidden',
          message: 'OSINT routes require admin role. Your role: ' + (profile?.role || 'none')
        },
        { status: 403 }
      )
    }

    // 5. Accès autorisé
    await logSecurityEvent({
      type: 'osint_access_granted',
      ip,
      path,
      user_id: user.id,
      has_token: true,
      success: true
    })

    // Ajouter headers avec infos rate limit
    const response = NextResponse.next()
    response.headers.set('X-RateLimit-Limit', '5')
    response.headers.set('X-RateLimit-Remaining', String(rateLimit.remaining))

    return null // Continue avec la requête

  } catch (error: any) {
    await logSecurityEvent({
      type: 'osint_error',
      ip,
      path,
      has_token: true,
      success: false,
      reason: error.message
    })

    return NextResponse.json(
      {
        success: false,
        error: 'Authentication error',
        message: 'An error occurred while verifying your credentials.'
      },
      { status: 500 }
    )
  }
}

/**
 * Whitelist IP (optionnel pour production)
 */
const ALLOWED_IPS = process.env.OSINT_ALLOWED_IPS?.split(',') || []

export function checkIPWhitelist(ip: string): boolean {
  if (ALLOWED_IPS.length === 0) return true // Pas de whitelist configurée
  return ALLOWED_IPS.includes(ip)
}
