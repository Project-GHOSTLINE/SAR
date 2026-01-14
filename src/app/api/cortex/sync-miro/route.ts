import { NextRequest, NextResponse } from 'next/server'
import { MiroCortexSync, type ApiPerformanceData } from '@/lib/miro-cortex-sync'

/**
 * API Route: Synchronise SAR Cortex avec Miro
 * POST /api/cortex/sync-miro
 *
 * Body: {
 *   performanceData: ApiPerformanceData[],
 *   action: 'create' | 'update',
 *   boardId?: string  // Pour update
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { performanceData, action, boardId } = body

    if (!performanceData || !Array.isArray(performanceData)) {
      return NextResponse.json(
        { error: 'performanceData est requis et doit être un array' },
        { status: 400 }
      )
    }

    // Récupérer le token Miro depuis les variables d'environnement
    // En production, il faudrait le stocker dans Supabase après OAuth
    const miroAccessToken = process.env.MIRO_ACCESS_TOKEN

    if (!miroAccessToken) {
      return NextResponse.json(
        {
          error: 'Miro non configuré',
          message: 'Veuillez d\'abord vous connecter à Miro via OAuth'
        },
        { status: 401 }
      )
    }

    // Initialiser le client Miro
    const miroSync = new MiroCortexSync({ accessToken: miroAccessToken })

    let result

    if (action === 'create') {
      // Créer un nouveau board
      console.log('🚀 Création d\'un nouveau board Miro...')
      result = await miroSync.createArchitectureBoard(performanceData)

      return NextResponse.json({
        success: true,
        message: 'Board créé avec succès',
        board: {
          id: result.board.id,
          name: result.board.name,
          url: result.url,
          cardsCount: result.cards.length
        }
      })
    } else if (action === 'update') {
      // Mettre à jour un board existant
      if (!boardId) {
        return NextResponse.json(
          { error: 'boardId est requis pour l\'action update' },
          { status: 400 }
        )
      }

      console.log(`🔄 Mise à jour du board ${boardId}...`)
      await miroSync.updateBoardRealtime(boardId, performanceData)

      return NextResponse.json({
        success: true,
        message: 'Board mis à jour avec succès',
        boardId
      })
    } else {
      return NextResponse.json(
        { error: 'Action invalide. Utilisez "create" ou "update"' },
        { status: 400 }
      )
    }
  } catch (error: any) {
    console.error('❌ Erreur sync Miro:', error)

    return NextResponse.json(
      {
        error: 'Erreur lors de la synchronisation avec Miro',
        details: error.message
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/cortex/sync-miro
 * Retourne le statut de la connexion Miro
 */
export async function GET(request: NextRequest) {
  const miroAccessToken = process.env.MIRO_ACCESS_TOKEN

  return NextResponse.json({
    connected: !!miroAccessToken,
    message: miroAccessToken
      ? 'Miro est connecté et prêt à synchroniser'
      : 'Miro n\'est pas encore configuré. Configurez MIRO_ACCESS_TOKEN dans .env'
  })
}
