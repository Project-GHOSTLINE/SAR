import { NextRequest, NextResponse } from 'next/server'
import { createVoPayClient } from '@/lib/vopay'

// Force dynamic rendering
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET /api/admin/vopay
 * Récupère les statistiques VoPay en temps réel
 */
export async function GET(request: NextRequest) {
  try {
    // Vérification de l'authentification admin
    const authHeader = request.headers.get('cookie')
    if (!authHeader?.includes('admin-session=')) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      )
    }

    // Création du client VoPay
    const vopay = createVoPayClient()

    // Récupération des stats
    const stats = await vopay.getStats()

    return NextResponse.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('VoPay API Error:', error)

    // Gestion des erreurs
    const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue'

    return NextResponse.json(
      {
        error: 'Erreur lors de la récupération des données VoPay',
        details: errorMessage
      },
      { status: 500 }
    )
  }
}
