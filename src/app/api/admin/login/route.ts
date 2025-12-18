import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { SignJWT } from 'jose'

const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH!
const JWT_SECRET = process.env.JWT_SECRET!

// Rate limiting simple en memoire (en production, utiliser Redis)
const loginAttempts = new Map<string, { count: number; lastAttempt: number }>()
const MAX_ATTEMPTS = 5
const LOCKOUT_TIME = 15 * 60 * 1000 // 15 minutes

function getClientIP(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0] ||
         request.headers.get('x-real-ip') ||
         'unknown'
}

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const attempt = loginAttempts.get(ip)

  if (!attempt) return false

  // Reset si lockout expire
  if (now - attempt.lastAttempt > LOCKOUT_TIME) {
    loginAttempts.delete(ip)
    return false
  }

  return attempt.count >= MAX_ATTEMPTS
}

function recordAttempt(ip: string): void {
  const now = Date.now()
  const attempt = loginAttempts.get(ip)

  if (!attempt || now - attempt.lastAttempt > LOCKOUT_TIME) {
    loginAttempts.set(ip, { count: 1, lastAttempt: now })
  } else {
    loginAttempts.set(ip, { count: attempt.count + 1, lastAttempt: now })
  }
}

function clearAttempts(ip: string): void {
  loginAttempts.delete(ip)
}

export async function POST(request: NextRequest) {
  const clientIP = getClientIP(request)

  // Verifier rate limit
  if (isRateLimited(clientIP)) {
    return NextResponse.json(
      { error: 'Trop de tentatives. Reessayez dans 15 minutes.' },
      { status: 429 }
    )
  }

  try {
    const body = await request.json()
    const { password } = body

    // Validation
    if (!password || typeof password !== 'string' || password.length > 100) {
      return NextResponse.json(
        { error: 'Mot de passe requis' },
        { status: 400 }
      )
    }

    // Verifier credentials
    if (!ADMIN_PASSWORD_HASH) {
      console.error('ADMIN_PASSWORD_HASH not configured')
      return NextResponse.json(
        { error: 'Configuration serveur invalide' },
        { status: 500 }
      )
    }

    const isValid = await bcrypt.compare(password, ADMIN_PASSWORD_HASH)

    if (!isValid) {
      recordAttempt(clientIP)
      return NextResponse.json(
        { error: 'Mot de passe incorrect' },
        { status: 401 }
      )
    }

    // Succes - clear les tentatives
    clearAttempts(clientIP)

    // Create JWT token
    const secret = new TextEncoder().encode(JWT_SECRET)
    const token = await new SignJWT({ role: 'admin' })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('24h')
      .sign(secret)

    const response = NextResponse.json({ success: true })

    response.cookies.set('admin_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24, // 24 hours
      path: '/'
    })

    return response
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}
