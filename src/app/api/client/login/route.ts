import { NextRequest, NextResponse } from 'next/server'
import { SignJWT } from 'jose'

const JWT_SECRET = process.env.JWT_SECRET || '56K2TFqsBtHQjzihmTS8palyJeA3KZHI1yYsvGEkxWQ='

// TODO: Connect to Supabase for real client authentication
// For now, this is a placeholder that will be connected to the database

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Courriel et mot de passe requis' },
        { status: 400 }
      )
    }

    // TODO: Replace with actual database lookup
    // For now, we'll check against Supabase when connected
    // Placeholder: reject all logins until database is set up

    // Uncomment below when ready for testing with any credentials:
    /*
    const secret = new TextEncoder().encode(JWT_SECRET)
    const token = await new SignJWT({ email, role: 'client' })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('7d')
      .sign(secret)

    const response = NextResponse.json({ success: true })
    response.cookies.set('client_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/'
    })
    return response
    */

    return NextResponse.json(
      { error: 'Systeme en cours de configuration. Veuillez nous contacter au 514 589 1946.' },
      { status: 503 }
    )
  } catch (error) {
    console.error('Client login error:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}
