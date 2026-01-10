import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'
import { jwtVerify } from 'jose'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const fetchCache = 'force-no-store'
export const revalidate = 0

// CORS headers helper
function corsHeaders(origin: string | null) {
  // Allow requests from inverite.com, flinks.com and admin.solutionargentrapide.ca
  const allowedOrigins = [
    'https://inverite.com',
    'https://app.inverite.com',
    'https://www.inverite.com',
    'https://dashboard.flinks.com',
    'https://flinks.com',
    'https://fin.ag',
    'https://admin.solutionargentrapide.ca',
    'http://localhost:3000'
  ]

  const isAllowed = origin && allowedOrigins.some(allowed => origin.includes(allowed.replace('https://', '')))

  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : allowedOrigins[0],
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Cookie, Authorization',
    'Access-Control-Allow-Credentials': 'true',
  }
}

/**
 * OPTIONS - Handle CORS preflight
 */
export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin')
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders(origin)
  })
}

/**
 * POST /api/admin/client-analysis
 * Reçoit les données d'analyse client depuis l'extension Chrome Inverite/Flinks
 */
export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin')
  try {
    // Vérification de l'authentification admin - Cookie OU Token Bearer
    const cookieHeader = request.headers.get('cookie')
    const authorizationHeader = request.headers.get('authorization')
    const bearerToken = authorizationHeader?.replace('Bearer ', '')

    const hasValidCookie = cookieHeader?.includes('admin-session=')
    const hasValidToken = !!bearerToken

    if (!hasValidCookie && !hasValidToken) {
      return NextResponse.json(
        { error: 'Non autorisé - Session admin ou token Bearer requis' },
        { status: 401, headers: corsHeaders(origin) }
      )
    }

    // Si token Bearer fourni, valider avec JWT
    if (hasValidToken) {
      try {
        const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'sar-admin-secret-key-2024')
        await jwtVerify(bearerToken!, secret)
        console.log('✅ Token Bearer validé')
      } catch (err) {
        console.error('❌ Token Bearer invalide:', err)
        return NextResponse.json(
          { error: 'Token Bearer invalide ou expiré' },
          { status: 401, headers: corsHeaders(origin) }
        )
      }
    }

    const supabase = getSupabase()
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database unavailable' },
        { status: 500, headers: corsHeaders(origin) }
      )
    }

    // Récupérer les données depuis le body
    const body = await request.json()

    // Validation des données requises
    if (!body.client_name || !body.raw_data) {
      return NextResponse.json(
        { error: 'client_name et raw_data sont requis' },
        { status: 400, headers: corsHeaders(origin) }
      )
    }

    // Préparer les données pour insertion
    const analysisData = {
      client_name: body.client_name,
      source: body.source || 'inverite', // 'inverite' ou 'flinks'
      inverite_guid: body.inverite_guid || null,
      raw_data: body.raw_data,
      status: 'pending',
      assigned_to: body.assigned_to || null,
      tags: body.tags || []
    }

    // Insérer dans Supabase
    const { data, error } = await supabase
      .from('client_analyses')
      .insert([analysisData])
      .select()
      .single()

    if (error) {
      console.error('Erreur Supabase insert:', error)
      return NextResponse.json(
        { error: 'Échec de l\'insertion', details: error.message },
        { status: 500, headers: corsHeaders(origin) }
      )
    }

    console.log('✅ Analyse client sauvegardée:', {
      id: data.id,
      name: data.client_name,
      accounts: data.total_accounts,
      balance: data.total_balance
    })

    // 🚀 NOUVEAU: Extraire comptes, transactions, téléphones dans tables normalisées
    try {
      const { data: processResult, error: processError } = await supabase
        .rpc('process_analysis', { p_analysis_id: data.id })

      if (processError) {
        console.warn('⚠️ Erreur extraction données normalisées:', processError)
        // Ne pas bloquer - les données sont déjà sauvegardées dans raw_data
      } else if (processResult && processResult.length > 0) {
        const result = processResult[0]
        console.log('✅ Données normalisées extraites:', {
          accounts: result.accounts_extracted,
          transactions: result.transactions_extracted,
          phones: result.phones_extracted
        })
      }
    } catch (processErr) {
      console.warn('⚠️ Impossible d\'extraire données normalisées:', processErr)
      // Continuer quand même - les données sont dans raw_data
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Analyse sauvegardée avec succès',
        data: {
          id: data.id,
          client_name: data.client_name,
          total_accounts: data.total_accounts,
          total_balance: data.total_balance,
          total_transactions: data.total_transactions,
          created_at: data.created_at
        }
      },
      { headers: corsHeaders(origin) }
    )

  } catch (error) {
    console.error('Erreur API client-analysis:', error)
    const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue'

    return NextResponse.json(
      {
        error: 'Erreur lors de la sauvegarde',
        details: errorMessage
      },
      { status: 500, headers: corsHeaders(origin) }
    )
  }
}

/**
 * GET /api/admin/client-analysis
 * Liste toutes les analyses clients avec filtres optionnels
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

    const supabase = getSupabase()
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database unavailable' },
        { status: 500 }
      )
    }

    // Récupérer les paramètres de filtre
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const status = searchParams.get('status')
    const assigned_to = searchParams.get('assigned_to')
    const source = searchParams.get('source')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Si ID fourni, retourner directement cette analyse
    if (id) {
      const { data: singleData, error: singleError } = await supabase
        .from('client_analyses')
        .select('*')
        .eq('id', id)
        .is('deleted_at', null)
        .single()

      if (singleError) {
        console.error('Erreur Supabase select single:', singleError)
        return NextResponse.json(
          { error: 'Analyse non trouvée', details: singleError.message },
          { status: 404 }
        )
      }

      return NextResponse.json({
        success: true,
        data: singleData
      })
    }

    // Construire la requête pour liste
    let query = supabase
      .from('client_analyses')
      .select('*', { count: 'exact' })
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    // Appliquer les filtres
    if (status) {
      query = query.eq('status', status)
    }

    if (assigned_to) {
      query = query.eq('assigned_to', assigned_to)
    }

    if (source) {
      query = query.eq('source', source)
    }

    // Pagination
    query = query.range(offset, offset + limit - 1)

    const { data, error, count } = await query

    if (error) {
      console.error('Erreur Supabase select:', error)
      return NextResponse.json(
        { error: 'Échec de la récupération', details: error.message },
        { status: 500 }
      )
    }

    // Calculer les stats globales
    const { data: stats } = await supabase
      .from('client_analyses')
      .select('status, assigned_to')
      .is('deleted_at', null)

    const statsCalculated = {
      total: count || 0,
      pending: stats?.filter(s => s.status === 'pending').length || 0,
      reviewed: stats?.filter(s => s.status === 'reviewed').length || 0,
      approved: stats?.filter(s => s.status === 'approved').length || 0,
      rejected: stats?.filter(s => s.status === 'rejected').length || 0,
      by_assignee: {
        sandra: stats?.filter(s => s.assigned_to === 'Sandra').length || 0,
        michel: stats?.filter(s => s.assigned_to === 'Michel').length || 0,
        unassigned: stats?.filter(s => !s.assigned_to).length || 0
      }
    }

    return NextResponse.json({
      success: true,
      data: data || [],
      stats: statsCalculated,
      pagination: {
        total: count || 0,
        offset,
        limit,
        hasMore: (count || 0) > offset + limit
      }
    })

  } catch (error) {
    console.error('Erreur API client-analysis GET:', error)
    const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue'

    return NextResponse.json(
      {
        error: 'Erreur lors de la récupération',
        details: errorMessage
      },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/admin/client-analysis
 * Met à jour une analyse (status, assignation, notes, etc.)
 */
export async function PATCH(request: NextRequest) {
  try {
    // Vérification de l'authentification admin
    const authHeader = request.headers.get('cookie')
    if (!authHeader?.includes('admin-session=')) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      )
    }

    const supabase = getSupabase()
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database unavailable' },
        { status: 500 }
      )
    }

    const body = await request.json()

    // ID requis
    if (!body.id) {
      return NextResponse.json(
        { error: 'ID requis' },
        { status: 400 }
      )
    }

    // Préparer les données de mise à jour
    const updateData: any = {}

    if (body.status) updateData.status = body.status
    if (body.assigned_to !== undefined) updateData.assigned_to = body.assigned_to
    if (body.notes !== undefined) updateData.notes = body.notes
    if (body.tags !== undefined) updateData.tags = body.tags

    // Si status passe à 'reviewed', ajouter reviewed_by et reviewed_at
    if (body.status === 'reviewed') {
      updateData.reviewed_by = body.reviewed_by || 'Admin'
      updateData.reviewed_at = new Date().toISOString()
    }

    // Si assigned_to change, mettre à jour assigned_at
    if (body.assigned_to !== undefined) {
      updateData.assigned_at = new Date().toISOString()
    }

    // Mettre à jour
    const { data, error } = await supabase
      .from('client_analyses')
      .update(updateData)
      .eq('id', body.id)
      .select()
      .single()

    if (error) {
      console.error('Erreur Supabase update:', error)
      return NextResponse.json(
        { error: 'Échec de la mise à jour', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Analyse mise à jour',
      data
    })

  } catch (error) {
    console.error('Erreur API client-analysis PATCH:', error)
    const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue'

    return NextResponse.json(
      {
        error: 'Erreur lors de la mise à jour',
        details: errorMessage
      },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/admin/client-analysis
 * Suppression soft (deleted_at)
 */
export async function DELETE(request: NextRequest) {
  try {
    // Vérification de l'authentification admin
    const authHeader = request.headers.get('cookie')
    if (!authHeader?.includes('admin-session=')) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      )
    }

    const supabase = getSupabase()
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database unavailable' },
        { status: 500 }
      )
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'ID requis' },
        { status: 400 }
      )
    }

    // Soft delete
    const { error } = await supabase
      .from('client_analyses')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)

    if (error) {
      console.error('Erreur Supabase delete:', error)
      return NextResponse.json(
        { error: 'Échec de la suppression', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Analyse supprimée'
    })

  } catch (error) {
    console.error('Erreur API client-analysis DELETE:', error)
    const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue'

    return NextResponse.json(
      {
        error: 'Erreur lors de la suppression',
        details: errorMessage
      },
      { status: 500 }
    )
  }
}
