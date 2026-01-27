/**
 * API: POST /api/seo/collect/gsc
 *
 * Collecte les métriques Google Search Console et les stocke dans Supabase
 */

import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

// Vérifier l'authentification admin
function isAuthenticated(request: NextRequest): boolean {
  const token = request.cookies.get('admin-session')?.value
  const apiKey = request.headers.get('x-api-key')
  return !!token || apiKey === process.env.ADMIN_PASSWORD
}

// Initialize Supabase
function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase credentials manquants')
  }

  return createClient(supabaseUrl, supabaseKey)
}

/**
 * POST /api/seo/collect/gsc
 *
 * Collecte les métriques GSC et les stocke dans Supabase
 *
 * Body:
 * - date: Date à collecter (format: YYYY-MM-DD, défaut: hier)
 * - force: Forcer la recollecte même si existe déjà
 */
export async function POST(request: NextRequest) {
  try {
    // Vérifier authentification
    if (!isAuthenticated(request)) {
      return NextResponse.json(
        { success: false, error: 'Non autorisé' },
        { status: 401 }
      )
    }

    const body = await request.json().catch(() => ({}))
    const targetDate = body.date || getYesterday()
    const force = body.force || false

    const supabase = getSupabaseClient()
    const domain = 'solutionargentrapide.ca'

    // Vérifier si déjà collecté
    if (!force) {
      const { data: existing } = await supabase
        .from('seo_gsc_metrics_daily')
        .select('id')
        .eq('date', targetDate)
        .eq('domain', domain)
        .single()

      if (existing) {
        return NextResponse.json({
          success: true,
          message: 'Métriques GSC déjà collectées pour cette date',
          date: targetDate,
          existing: true
        })
      }
    }

    // Vérifier si GSC est configuré
    if (!process.env.GA_SERVICE_ACCOUNT_JSON) {
      return NextResponse.json({
        success: false,
        error: 'Google Search Console non configuré',
        message: 'GA_SERVICE_ACCOUNT_JSON requis'
      }, { status: 503 })
    }

    // Collecter les données GSC
    console.log('🔍 Collecte des métriques Google Search Console depuis l\'API...')

    const gscData = await collectRealGSCData(domain, targetDate)

    const { data, error } = await supabase
      .from('seo_gsc_metrics_daily')
      .upsert([gscData], { onConflict: 'date,domain' })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({
      success: true,
      message: 'Métriques Google Search Console collectées avec succès',
      date: targetDate,
      data
    })

  } catch (error: any) {
    console.error('❌ Erreur collecte GSC:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Erreur lors de la collecte GSC',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/seo/collect/gsc
 *
 * Récupère les métriques GSC stockées
 */
export async function GET(request: NextRequest) {
  try {
    if (!isAuthenticated(request)) {
      return NextResponse.json(
        { success: false, error: 'Non autorisé' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate') || get30DaysAgo()
    const endDate = searchParams.get('endDate') || getYesterday()

    const supabase = getSupabaseClient()

    const { data, error } = await supabase
      .from('seo_gsc_metrics_daily')
      .select('*')
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: false })

    if (error) throw error

    return NextResponse.json({
      success: true,
      data,
      count: data.length,
      dateRange: { startDate, endDate }
    })

  } catch (error: any) {
    console.error('❌ Erreur récupération GSC:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Erreur lors de la récupération',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}

// ============================================
// FONCTIONS UTILITAIRES
// ============================================

/**
 * Collecte les vraies données depuis l'API Google Search Console
 */
async function collectRealGSCData(domain: string, date: string) {
  const credentials = JSON.parse(process.env.GA_SERVICE_ACCOUNT_JSON!)
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/webmasters.readonly']
  })

  const searchconsole = google.searchconsole({ version: 'v1', auth })
  const siteUrl = `sc-domain:${domain}`

  try {
    // 1. Métriques globales
    const overviewResponse = await searchconsole.searchanalytics.query({
      siteUrl,
      requestBody: {
        startDate: date,
        endDate: date,
        dimensions: [],
        rowLimit: 1
      }
    })

    const overview = overviewResponse.data.rows?.[0] || {
      clicks: 0,
      impressions: 0,
      ctr: 0,
      position: 0
    }

    // 2. Top queries
    const queriesResponse = await searchconsole.searchanalytics.query({
      siteUrl,
      requestBody: {
        startDate: date,
        endDate: date,
        dimensions: ['query'],
        rowLimit: 100
      }
    })

    const topQueries = (queriesResponse.data.rows || []).slice(0, 20).map((row: any) => ({
      query: row.keys?.[0] || '',
      clicks: row.clicks || 0,
      impressions: row.impressions || 0,
      ctr: row.ctr || 0,
      position: row.position || 0
    }))

    // 3. Top pages
    const pagesResponse = await searchconsole.searchanalytics.query({
      siteUrl,
      requestBody: {
        startDate: date,
        endDate: date,
        dimensions: ['page'],
        rowLimit: 100
      }
    })

    const topPages = (pagesResponse.data.rows || []).slice(0, 20).map((row: any) => ({
      page: row.keys?.[0] || '',
      clicks: row.clicks || 0,
      impressions: row.impressions || 0,
      ctr: row.ctr || 0,
      position: row.position || 0
    }))

    // 4. Breakdown par device
    const devicesResponse = await searchconsole.searchanalytics.query({
      siteUrl,
      requestBody: {
        startDate: date,
        endDate: date,
        dimensions: ['device'],
        rowLimit: 10
      }
    })

    const deviceBreakdown: any = {}
    devicesResponse.data.rows?.forEach((row: any) => {
      const device = row.keys?.[0] || 'unknown'
      deviceBreakdown[device] = {
        clicks: row.clicks || 0,
        impressions: row.impressions || 0,
        ctr: row.ctr || 0,
        position: row.position || 0
      }
    })

    // 5. Breakdown par country
    const countriesResponse = await searchconsole.searchanalytics.query({
      siteUrl,
      requestBody: {
        startDate: date,
        endDate: date,
        dimensions: ['country'],
        rowLimit: 10
      }
    })

    const countryBreakdown: any = {}
    countriesResponse.data.rows?.forEach((row: any) => {
      const country = row.keys?.[0] || 'unknown'
      countryBreakdown[country] = {
        clicks: row.clicks || 0,
        impressions: row.impressions || 0,
        ctr: row.ctr || 0,
        position: row.position || 0
      }
    })

    return {
      domain,
      date,
      total_clicks: overview.clicks || 0,
      total_impressions: overview.impressions || 0,
      avg_ctr: overview.ctr || 0,
      avg_position: overview.position || 0,
      top_queries: topQueries,
      top_pages: topPages,
      device_breakdown: deviceBreakdown,
      country_breakdown: countryBreakdown,
      collected_at: new Date().toISOString()
    }

  } catch (error: any) {
    console.error('❌ Erreur lors de l\'appel API Google Search Console:', error)
    throw error
  }
}

function getYesterday(): string {
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 4) // GSC a un délai de ~3 jours
  return yesterday.toISOString().split('T')[0]
}

function get30DaysAgo(): string {
  const date = new Date()
  date.setDate(date.getDate() - 34) // 30 jours + 4 jours de délai
  return date.toISOString().split('T')[0]
}
