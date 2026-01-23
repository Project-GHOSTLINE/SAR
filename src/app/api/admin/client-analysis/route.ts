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
    // Vérification de l'authentification admin - Cookie OU Token Bearer OU Origine de confiance
    const cookieHeader = request.headers.get('cookie')
    const authorizationHeader = request.headers.get('authorization')
    const bearerToken = authorizationHeader?.replace('Bearer ', '')

    const hasValidCookie = cookieHeader?.includes('admin-session=')

    // Origines de confiance (extensions Chrome sur Flinks/Inverite)
    const trustedOrigins = [
      'dashboard.flinks.com',
      'flinks.com',
      'fin.ag',
      'inverite.com',
      'app.inverite.com',
      'www.inverite.com'
    ]
    const isTrustedOrigin = origin && trustedOrigins.some(trusted => origin.includes(trusted))

    // Si c'est une origine de confiance, pas besoin de vérifier le token JWT
    if (isTrustedOrigin) {
      // Passer la validation - l'extension est autorisée
    } else if (hasValidCookie) {
      // Admin authentifié via cookie
    } else if (bearerToken) {
      // Valider le JWT seulement si ce n'est pas une origine de confiance
      try {
        const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'sar-admin-secret-key-2024')
        await jwtVerify(bearerToken, secret)
      } catch (err) {
        return NextResponse.json(
          { error: 'Token Bearer invalide ou expiré' },
          { status: 401, headers: corsHeaders(origin) }
        )
      }
    } else {
      // Aucune authentification valide
      return NextResponse.json(
        { error: 'Non autorisé - Session admin, token JWT, ou origine de confiance requis' },
        { status: 401, headers: corsHeaders(origin) }
      )
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

    // Vérifier si ce GUID existe déjà
    const guidToCheck = body.inverite_guid
    let existingAnalysis = null

    if (guidToCheck) {
      const { data: existing } = await supabase
        .from('client_analyses')
        .select('id, inverite_guid')
        .eq('inverite_guid', guidToCheck)
        .maybeSingle()

      existingAnalysis = existing
    }

    // Extraire les informations client depuis raw_data
    const rawData = body.raw_data || {}
    let clientEmail = null
    let clientPhones: string[] = []
    let clientAddress = null

    // Pour Inverite: extraire depuis contacts array
    if (rawData.contacts && Array.isArray(rawData.contacts)) {
      const emailContact = rawData.contacts.find((c: any) => c.type === 'email')
      if (emailContact?.contact) {
        clientEmail = emailContact.contact
      }

      const phoneContacts = rawData.contacts.filter((c: any) => c.type === 'phone')
      if (phoneContacts.length > 0) {
        clientPhones = phoneContacts.map((c: any) => c.contact?.replace(/,$/, '')).filter(Boolean)
      }

      clientAddress = rawData.address || null
    }

    // Pour Flinks: extraire depuis clientInfo
    if (rawData.clientInfo) {
      const clientInfo = rawData.clientInfo
      clientEmail = clientEmail || clientInfo.email || null
      clientAddress = clientAddress || clientInfo.address || null

      if (clientInfo.phone) {
        clientPhones = [clientInfo.phone]
      }
    }

    // Calculer les totaux depuis les comptes
    const accounts = rawData.accounts || []
    const totalAccounts = accounts.length
    const totalBalance = accounts.reduce((sum: number, acc: any) => {
      const balance = parseFloat(acc.current_balance || acc.balance || 0)
      return sum + balance
    }, 0)
    const totalTransactions = accounts.reduce((sum: number, acc: any) => {
      return sum + (acc.transactions?.length || 0)
    }, 0)

    // Préparer les données (client_phones sera géré dans table séparée)
    const analysisData: any = {
      client_name: body.client_name,
      client_email: clientEmail,
      client_address: clientAddress,
      source: body.source || 'inverite', // 'inverite' ou 'flinks'
      inverite_guid: body.inverite_guid || null,
      raw_data: body.raw_data,
      total_accounts: totalAccounts,
      total_balance: totalBalance,
      total_transactions: totalTransactions,
      status: 'pending',
      assigned_to: body.assigned_to || null,
      // Nouvelles colonnes pour Inverite risk score et microloans
      inverite_risk_score: body.inverite_risk_score || null,
      risk_level: body.risk_level || null,
      microloans_data: body.microloans_data || null
    }

    let data, error

    if (existingAnalysis) {
      // MISE À JOUR de l'analyse existante
      const updateResult = await supabase
        .from('client_analyses')
        .update({
          client_name: analysisData.client_name,
          client_email: analysisData.client_email,
          client_address: analysisData.client_address,
          raw_data: analysisData.raw_data,
          source: analysisData.source,
          total_accounts: analysisData.total_accounts,
          total_balance: analysisData.total_balance,
          total_transactions: analysisData.total_transactions,
          inverite_risk_score: analysisData.inverite_risk_score,
          risk_level: analysisData.risk_level,
          microloans_data: analysisData.microloans_data,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingAnalysis.id)
        .select()
        .single()

      data = updateResult.data
      error = updateResult.error
    } else {
      // CRÉATION d'une nouvelle analyse
      const insertResult = await supabase
        .from('client_analyses')
        .insert([analysisData])
        .select()
        .single()

      data = insertResult.data
      error = insertResult.error
    }

    if (error) {
      console.error('Erreur Supabase:', error)
      return NextResponse.json(
        { error: existingAnalysis ? 'Échec de la mise à jour' : 'Échec de l\'insertion', details: error.message },
        { status: 500, headers: corsHeaders(origin) }
      )
    }

    // Extraire comptes, transactions, téléphones dans tables normalisées
    try {
      const { data: processResult, error: processError } = await supabase
        .rpc('process_analysis', { p_analysis_id: data.id })

      if (processError) {
        // Ne pas bloquer - les données sont déjà sauvegardées dans raw_data
      }
    } catch (processErr) {
      // Continuer quand même - les données sont dans raw_data
    }

    // Créer un job d'analyse automatique pour calculer SAR score et recommandation
    try {
      // Vérifier si un job existe déjà pour cette analyse
      const { data: existingJob } = await supabase
        .from('analysis_jobs')
        .select('id, status')
        .eq('analysis_id', data.id)
        .in('status', ['pending', 'processing'])
        .maybeSingle()

      if (!existingJob) {
        // Créer un nouveau job avec priorité haute pour analyses nouvelles/mises à jour
        await supabase
          .from('analysis_jobs')
          .insert({
            analysis_id: data.id,
            status: 'pending',
            priority: existingAnalysis ? 'normal' : 'high'
          })

        // Déclencher le worker automatiquement pour traiter le job immédiatement
        // Fire-and-forget: ne pas attendre la réponse pour ne pas bloquer
        const workerUrl = process.env.NEXT_PUBLIC_BASE_URL
          ? `${process.env.NEXT_PUBLIC_BASE_URL}/api/worker/process-jobs`
          : `${request.nextUrl.origin}/api/worker/process-jobs`

        fetch(workerUrl, { method: 'GET' }).catch(err => {
          console.error('Erreur déclenchement worker:', err)
        })
      }
    } catch (jobErr) {
      // Ne pas bloquer si la création du job échoue - l'analyse est sauvegardée
      console.error('Erreur création analysis_job:', jobErr)
    }

    return NextResponse.json(
      {
        success: true,
        message: existingAnalysis ? 'Analyse mise à jour avec succès' : 'Analyse créée avec succès',
        isUpdate: !!existingAnalysis,
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

    // Si ID fourni, permettre l'accès public (pour les rapports partagés)
    // Sinon, nécessite authentification pour lister toutes les analyses
    const authHeader = request.headers.get('cookie')
    const isAuthenticated = authHeader?.includes('admin-session=')

    if (!id && !isAuthenticated) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      )
    }
    const status = searchParams.get('status')
    const assigned_to = searchParams.get('assigned_to')
    const source = searchParams.get('source')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Si ID fourni, retourner directement cette analyse avec ses scores et recommandation
    if (id) {
      const { data: singleData, error: singleError } = await supabase
        .from('client_analyses')
        .select(`
          *,
          scores:analysis_scores(*),
          recommendation:analysis_recommendations(*),
          job:analysis_jobs(*)
        `)
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

      // Formater la réponse avec les données jointes
      const formattedData = {
        ...singleData,
        // Prendre le dernier score si plusieurs existent
        scores: Array.isArray(singleData.scores) && singleData.scores.length > 0
          ? singleData.scores[singleData.scores.length - 1]
          : null,
        // Prendre la dernière recommandation si plusieurs existent
        recommendation: Array.isArray(singleData.recommendation) && singleData.recommendation.length > 0
          ? singleData.recommendation[singleData.recommendation.length - 1]
          : null,
        // Prendre le dernier job si plusieurs existent
        job: Array.isArray(singleData.job) && singleData.job.length > 0
          ? singleData.job.sort((a: any, b: any) =>
              new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            )[0]
          : null
      }

      return NextResponse.json({
        success: true,
        data: formattedData
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
    // if (body.tags !== undefined) updateData.tags = body.tags // Colonne tags non disponible dans structure simple

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
