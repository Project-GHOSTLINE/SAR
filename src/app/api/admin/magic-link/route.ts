import { NextRequest, NextResponse } from 'next/server'
import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'

const JWT_SECRET = process.env.JWT_SECRET!
const RESEND_API_KEY = process.env.RESEND_API_KEY

// Emails autorises pour l'admin
const ADMIN_EMAILS = [
  'perception@solutionargentrapide.ca',
  'mrosa@solutionargentrapide.ca'
]

// Rate limiting
const magicLinkAttempts = new Map<string, { count: number; lastAttempt: number }>()
const MAX_ATTEMPTS = 3
const WINDOW = 15 * 60 * 1000 // 15 minutes

function isRateLimited(email: string): boolean {
  const now = Date.now()
  const attempt = magicLinkAttempts.get(email)
  if (!attempt) return false
  if (now - attempt.lastAttempt > WINDOW) {
    magicLinkAttempts.delete(email)
    return false
  }
  return attempt.count >= MAX_ATTEMPTS
}

function recordAttempt(email: string): void {
  const now = Date.now()
  const attempt = magicLinkAttempts.get(email)
  if (!attempt || now - attempt.lastAttempt > WINDOW) {
    magicLinkAttempts.set(email, { count: 1, lastAttempt: now })
  } else {
    magicLinkAttempts.set(email, { count: attempt.count + 1, lastAttempt: now })
  }
}

// POST - Envoyer le magic link
export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email requis' }, { status: 400 })
    }

    const normalizedEmail = email.toLowerCase().trim()

    // Verifier si email autorise
    if (!ADMIN_EMAILS.includes(normalizedEmail)) {
      // On retourne succes meme si email non autorise (securite)
      return NextResponse.json({ success: true })
    }

    // Rate limiting
    if (isRateLimited(normalizedEmail)) {
      return NextResponse.json(
        { error: 'Trop de tentatives. Reessayez dans 15 minutes.' },
        { status: 429 }
      )
    }

    recordAttempt(normalizedEmail)

    // Creer le token magic link (expire dans 15 min)
    const secret = new TextEncoder().encode(JWT_SECRET)
    const token = await new SignJWT({ email: normalizedEmail, type: 'magic-link' })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('15m')
      .sign(secret)

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://solutionargentrapide.ca'
    const magicLink = `${baseUrl}/api/admin/magic-link?token=${token}`

    // Envoyer l'email
    if (RESEND_API_KEY) {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: 'SAR Admin <noreply@solutionargentrapide.ca>',
          to: normalizedEmail,
          subject: '🔐 Connexion Admin SAR',
          html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0a0d10; margin: 0; padding: 40px 20px; }
    .container { max-width: 500px; margin: 0 auto; background: linear-gradient(145deg, #181a20 0%, #1a1d24 100%); border-radius: 24px; overflow: hidden; border: 1px solid rgba(255,255,255,0.1); }
    .header { background: linear-gradient(135deg, #00874e 0%, #006341 100%); padding: 40px; text-align: center; }
    .header h1 { margin: 0; color: white; font-size: 28px; font-weight: 700; }
    .content { padding: 40px; text-align: center; }
    .btn { display: inline-block; background: linear-gradient(135deg, #00874e 0%, #006341 100%); color: white !important; text-decoration: none; padding: 18px 48px; border-radius: 16px; font-weight: 600; font-size: 18px; margin: 30px 0; box-shadow: 0 8px 32px rgba(0,135,78,0.3); }
    .btn:hover { transform: translateY(-2px); }
    p { color: #848e9c; line-height: 1.6; margin: 16px 0; }
    .footer { padding: 20px 40px; border-top: 1px solid rgba(255,255,255,0.06); text-align: center; }
    .footer p { font-size: 12px; color: #5e6673; }
    .timer { background: rgba(0,135,78,0.1); color: #00874e; padding: 12px 24px; border-radius: 12px; display: inline-block; margin-top: 20px; font-weight: 500; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🔐 Connexion Admin</h1>
    </div>
    <div class="content">
      <p style="color: white; font-size: 18px;">Clique sur le bouton pour te connecter</p>
      <a href="${magicLink}" class="btn">Connexion Securisee →</a>
      <div class="timer">⏱️ Ce lien expire dans 15 minutes</div>
      <p>Si tu n'as pas demande cette connexion, ignore ce message.</p>
    </div>
    <div class="footer">
      <p>Solution Argent Rapide - Admin Dashboard</p>
    </div>
  </div>
</body>
</html>
          `
        })
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Magic link error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// GET - Verifier le magic link et connecter
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.redirect(new URL('/admin?error=invalid', request.url))
    }

    // Verifier le token
    const secret = new TextEncoder().encode(JWT_SECRET)

    try {
      const { payload } = await jwtVerify(token, secret)

      if (payload.type !== 'magic-link' || !payload.email) {
        return NextResponse.redirect(new URL('/admin?error=invalid', request.url))
      }

      // Creer le token de session
      const sessionToken = await new SignJWT({ role: 'admin', email: payload.email })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('7d')
        .sign(secret)

      // Redirect vers dashboard avec cookie
      const response = NextResponse.redirect(new URL('/admin/dashboard', request.url))

      response.cookies.set('admin_token', sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7 jours
        path: '/'
      })

      return response
    } catch {
      return NextResponse.redirect(new URL('/admin?error=expired', request.url))
    }
  } catch (error) {
    console.error('Magic link verify error:', error)
    return NextResponse.redirect(new URL('/admin?error=server', request.url))
  }
}
