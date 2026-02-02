/**
 * POST /api/partners/login
 *
 * Authentification simple pour développement
 * Vérifie le mot de passe et crée une session
 */

import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// Mot de passe de développement
const DEV_PASSWORD = process.env.ADMIN_PASSWORD || 'FredRosa%1978'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { password } = body

    if (!password) {
      return NextResponse.json(
        { success: false, error: 'Mot de passe requis' },
        { status: 400 }
      )
    }

    // Vérifier le mot de passe
    if (password !== DEV_PASSWORD) {
      return NextResponse.json(
        { success: false, error: 'Mot de passe incorrect' },
        { status: 401 }
      )
    }

    // Créer une session simple (cookie)
    const response = NextResponse.json(
      { success: true, message: 'Connexion réussie' },
      { status: 200 }
    )

    // Créer un cookie de session (valide 7 jours)
    response.cookies.set('partners-dev-session', 'authenticated', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 jours
      path: '/',
    })

    return response
  } catch (error) {
    console.error('Erreur login:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}
