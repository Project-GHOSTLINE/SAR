import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/cron/seo-collect
 *
 * Cron job quotidien pour collecter toutes les métriques SEO
 *
 * Cron schedule (Vercel): 0 6 * * * (tous les jours à 6h UTC = 2h EST)
 *
 * Authorization: Vercel Cron Secret ou Admin API Key
 */
export async function GET(request: NextRequest) {
  try {
    // Vérifier l'autorisation (Vercel Cron Secret ou Admin API Key)
    const authHeader = request.headers.get('authorization')
    const apiKey = request.headers.get('x-api-key')
    const cronSecret = process.env.CRON_SECRET || 'cron-secret-sar-2026'

    const isAuthorized =
      authHeader === `Bearer ${cronSecret}` ||
      apiKey === process.env.ADMIN_PASSWORD

    if (!isAuthorized) {
      return NextResponse.json(
        { success: false, error: 'Non autorisé' },
        { status: 401 }
      )
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://admin.solutionargentrapide.ca'
    const results: any = {
      success: true,
      timestamp: new Date().toISOString(),
      collections: {}
    }

    // 1. Collecter Google Analytics 4
    console.log('🔄 Collecte GA4...')
    try {
      const ga4Response = await fetch(`${baseUrl}/api/seo/collect/ga4`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ADMIN_PASSWORD || ''
        },
        body: JSON.stringify({}) // Utilisera la date par défaut (hier)
      })

      const ga4Data = await ga4Response.json()
      results.collections.ga4 = {
        success: ga4Response.ok,
        status: ga4Response.status,
        data: ga4Data
      }

      if (ga4Response.ok) {
        console.log('✅ GA4 collecté:', ga4Data.message)
      } else {
        console.error('❌ Erreur GA4:', ga4Data.error)
      }
    } catch (error: any) {
      console.error('❌ Exception GA4:', error)
      results.collections.ga4 = {
        success: false,
        error: error.message
      }
    }

    // 2. Collecter Google Search Console
    console.log('🔄 Collecte GSC...')
    try {
      const gscResponse = await fetch(`${baseUrl}/api/seo/collect/gsc`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ADMIN_PASSWORD || ''
        },
        body: JSON.stringify({}) // Utilisera la date par défaut (il y a 3 jours)
      })

      const gscData = await gscResponse.json()
      results.collections.gsc = {
        success: gscResponse.ok,
        status: gscResponse.status,
        data: gscData
      }

      if (gscResponse.ok) {
        console.log('✅ GSC collecté:', gscData.message)
      } else {
        console.error('❌ Erreur GSC:', gscData.error)
      }
    } catch (error: any) {
      console.error('❌ Exception GSC:', error)
      results.collections.gsc = {
        success: false,
        error: error.message
      }
    }

    // 3. Collecter Semrush
    console.log('🔄 Collecte Semrush...')
    try {
      const semrushResponse = await fetch(`${baseUrl}/api/seo/collect/semrush`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ADMIN_PASSWORD || ''
        },
        body: JSON.stringify({}) // Utilisera la date par défaut (hier)
      })

      const semrushData = await semrushResponse.json()
      results.collections.semrush = {
        success: semrushResponse.ok,
        status: semrushResponse.status,
        data: semrushData
      }

      if (semrushResponse.ok) {
        console.log('✅ Semrush collecté:', semrushData.message)
      } else {
        console.error('❌ Erreur Semrush:', semrushData.error)
      }
    } catch (error: any) {
      console.error('❌ Exception Semrush:', error)
      results.collections.semrush = {
        success: false,
        error: error.message
      }
    }

    // Log le job dans Supabase
    try {
      await logCollectionJob(results)
    } catch (error) {
      console.error('❌ Erreur log job:', error)
    }

    // Résumé
    const successCount = Object.values(results.collections)
      .filter((c: any) => c.success).length
    const totalCount = Object.keys(results.collections).length

    results.summary = {
      total: totalCount,
      success: successCount,
      failed: totalCount - successCount,
      message: `${successCount}/${totalCount} collections réussies`
    }

    console.log('✅ Cron SEO terminé:', results.summary.message)

    return NextResponse.json(results)

  } catch (error: any) {
    console.error('❌ Erreur cron SEO:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Erreur lors de la collecte SEO',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}

/**
 * Log le job dans seo_collection_jobs
 */
async function logCollectionJob(results: any) {
  const { createClient } = await import('@supabase/supabase-js')

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase credentials manquants')
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  const successCount = Object.values(results.collections)
    .filter((c: any) => c.success).length
  const totalCount = Object.keys(results.collections).length

  await supabase
    .from('seo_collection_jobs')
    .insert([{
      job_type: 'daily_collection',
      status: successCount === totalCount ? 'success' : 'partial_success',
      started_at: results.timestamp,
      completed_at: new Date().toISOString(),
      records_processed: totalCount,
      records_created: successCount,
      records_failed: totalCount - successCount,
      triggered_by: 'cron',
      raw_response: results
    }])
}
