import { NextRequest, NextResponse } from 'next/server'
import { BetaAnalyticsDataClient } from '@google-analytics/data'
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

// Initialize Analytics Data Client
function getAnalyticsClient() {
  const propertyId = process.env.GA_PROPERTY_ID

  if (!propertyId) {
    throw new Error('GA_PROPERTY_ID non configuré')
  }

  if (process.env.GA_SERVICE_ACCOUNT_JSON) {
    try {
      const credentials = JSON.parse(process.env.GA_SERVICE_ACCOUNT_JSON)
      return new BetaAnalyticsDataClient({ credentials })
    } catch (error) {
      console.error('Erreur parsing GA_SERVICE_ACCOUNT_JSON:', error)
      throw new Error('Credentials Google Analytics invalides')
    }
  }

  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    return new BetaAnalyticsDataClient()
  }

  return null
}

/**
 * POST /api/seo/collect/ga4
 *
 * Collecte les métriques GA4 et les stocke dans Supabase
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
    const measurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || 'G-F130RBTZDC'
    const propertyId = process.env.GA_PROPERTY_ID || '340237010'

    // Vérifier si déjà collecté
    if (!force) {
      const { data: existing } = await supabase
        .from('seo_ga4_metrics_daily')
        .select('id')
        .eq('date', targetDate)
        .eq('measurement_id', measurementId)
        .single()

      if (existing) {
        return NextResponse.json({
          success: true,
          message: 'Métriques déjà collectées pour cette date',
          date: targetDate,
          existing: true
        })
      }
    }

    const analyticsClient = getAnalyticsClient()

    if (!analyticsClient) {
      // Mode mock pour développement
      const mockData = generateMockGA4Data(targetDate, measurementId, propertyId)

      const { data, error } = await supabase
        .from('seo_ga4_metrics_daily')
        .upsert([mockData], { onConflict: 'date,measurement_id' })
        .select()
        .single()

      if (error) throw error

      return NextResponse.json({
        success: true,
        message: 'Métriques GA4 collectées (MODE MOCK)',
        date: targetDate,
        data,
        mock: true
      })
    }

    // Collecter les métriques GA4
    const metrics = await collectGA4Metrics(analyticsClient, propertyId, targetDate)

    // Préparer les données pour Supabase
    const dbData = {
      measurement_id: measurementId,
      property_id: propertyId,
      date: targetDate,
      ...metrics
    }

    // Insérer dans Supabase
    const { data, error } = await supabase
      .from('seo_ga4_metrics_daily')
      .upsert([dbData], { onConflict: 'date,measurement_id' })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({
      success: true,
      message: 'Métriques GA4 collectées avec succès',
      date: targetDate,
      data
    })

  } catch (error: any) {
    console.error('❌ Erreur collecte GA4:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Erreur lors de la collecte GA4',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/seo/collect/ga4
 *
 * Récupère les métriques GA4 stockées
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
      .from('seo_ga4_metrics_daily')
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
    console.error('❌ Erreur récupération GA4:', error)
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

async function collectGA4Metrics(client: BetaAnalyticsDataClient, propertyId: string, date: string) {
  // Requête 1: Métriques de base
  const [basicResponse] = await client.runReport({
    property: `properties/${propertyId}`,
    dateRanges: [{ startDate: date, endDate: date }],
    metrics: [
      { name: 'activeUsers' },
      { name: 'newUsers' },
      { name: 'sessions' },
      { name: 'engagedSessions' },
      { name: 'engagementRate' },
      { name: 'bounceRate' },
      { name: 'averageSessionDuration' },
      { name: 'screenPageViewsPerSession' },
      { name: 'conversions' },
      { name: 'eventCount' }
    ]
  })

  const basicMetrics = basicResponse.rows?.[0]?.metricValues || []

  // Requête 2: Traffic sources
  const [sourcesResponse] = await client.runReport({
    property: `properties/${propertyId}`,
    dateRanges: [{ startDate: date, endDate: date }],
    dimensions: [{ name: 'sessionDefaultChannelGroup' }],
    metrics: [{ name: 'activeUsers' }]
  })

  const sources: Record<string, number> = {}
  sourcesResponse.rows?.forEach(row => {
    const channel = row.dimensionValues?.[0]?.value || 'Unknown'
    const users = parseInt(row.metricValues?.[0]?.value || '0')
    sources[channel] = users
  })

  // Requête 3: Device breakdown
  const [devicesResponse] = await client.runReport({
    property: `properties/${propertyId}`,
    dateRanges: [{ startDate: date, endDate: date }],
    dimensions: [{ name: 'deviceCategory' }],
    metrics: [{ name: 'activeUsers' }]
  })

  const devices: Record<string, number> = {}
  devicesResponse.rows?.forEach(row => {
    const device = row.dimensionValues?.[0]?.value || 'Unknown'
    const users = parseInt(row.metricValues?.[0]?.value || '0')
    devices[device] = users
  })

  // Requête 4: Top pages
  const [pagesResponse] = await client.runReport({
    property: `properties/${propertyId}`,
    dateRanges: [{ startDate: date, endDate: date }],
    dimensions: [{ name: 'pagePath' }],
    metrics: [
      { name: 'screenPageViews' },
      { name: 'activeUsers' }
    ],
    limit: 10,
    orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }]
  })

  const topPages = pagesResponse.rows?.map(row => ({
    page: row.dimensionValues?.[0]?.value || '/',
    views: parseInt(row.metricValues?.[0]?.value || '0'),
    users: parseInt(row.metricValues?.[1]?.value || '0')
  })) || []

  // Requête 5: Top events
  const [eventsResponse] = await client.runReport({
    property: `properties/${propertyId}`,
    dateRanges: [{ startDate: date, endDate: date }],
    dimensions: [{ name: 'eventName' }],
    metrics: [{ name: 'eventCount' }],
    limit: 10,
    orderBys: [{ metric: { metricName: 'eventCount' }, desc: true }]
  })

  const topEvents = eventsResponse.rows?.map(row => ({
    event_name: row.dimensionValues?.[0]?.value || 'unknown',
    count: parseInt(row.metricValues?.[0]?.value || '0')
  })) || []

  return {
    users: parseInt(basicMetrics[0]?.value || '0'),
    new_users: parseInt(basicMetrics[1]?.value || '0'),
    sessions: parseInt(basicMetrics[2]?.value || '0'),
    engaged_sessions: parseInt(basicMetrics[3]?.value || '0'),
    engagement_rate: parseFloat(basicMetrics[4]?.value || '0'),
    bounce_rate: parseFloat(basicMetrics[5]?.value || '0'),
    average_session_duration: parseFloat(basicMetrics[6]?.value || '0'),
    pages_per_session: parseFloat(basicMetrics[7]?.value || '0'),
    conversions: parseInt(basicMetrics[8]?.value || '0'),
    total_events: parseInt(basicMetrics[9]?.value || '0'),
    conversion_rate: 0, // À calculer si nécessaire
    organic_traffic: sources['Organic Search'] || 0,
    direct_traffic: sources['Direct'] || 0,
    referral_traffic: sources['Referral'] || 0,
    social_traffic: sources['Organic Social'] || 0,
    paid_traffic: (sources['Paid Search'] || 0) + (sources['Paid Social'] || 0),
    email_traffic: sources['Email'] || 0,
    desktop_users: devices['desktop'] || 0,
    mobile_users: devices['mobile'] || 0,
    tablet_users: devices['tablet'] || 0,
    top_pages: topPages,
    top_events: topEvents,
    collected_at: new Date().toISOString()
  }
}

function generateMockGA4Data(date: string, measurementId: string, propertyId: string) {
  return {
    measurement_id: measurementId,
    property_id: propertyId,
    date,
    users: Math.floor(Math.random() * 500) + 100,
    new_users: Math.floor(Math.random() * 300) + 50,
    sessions: Math.floor(Math.random() * 700) + 150,
    engaged_sessions: Math.floor(Math.random() * 500) + 100,
    engagement_rate: Math.random() * 30 + 60,
    bounce_rate: Math.random() * 20 + 25,
    average_session_duration: Math.random() * 150 + 120,
    pages_per_session: Math.random() * 2 + 2,
    conversions: Math.floor(Math.random() * 30) + 5,
    conversion_rate: Math.random() * 5 + 2,
    organic_traffic: Math.floor(Math.random() * 300) + 80,
    direct_traffic: Math.floor(Math.random() * 150) + 40,
    referral_traffic: Math.floor(Math.random() * 50) + 10,
    social_traffic: Math.floor(Math.random() * 40) + 5,
    paid_traffic: Math.floor(Math.random() * 30) + 5,
    email_traffic: Math.floor(Math.random() * 20) + 3,
    desktop_users: Math.floor(Math.random() * 200) + 80,
    mobile_users: Math.floor(Math.random() * 250) + 100,
    tablet_users: Math.floor(Math.random() * 50) + 10,
    total_events: Math.floor(Math.random() * 2000) + 500,
    top_pages: [
      { page: '/', views: 450, users: 230 },
      { page: '/demande', views: 320, users: 180 },
      { page: '/about', views: 120, users: 90 }
    ],
    top_events: [
      { event_name: 'page_view', count: 1200 },
      { event_name: 'click', count: 450 },
      { event_name: 'scroll', count: 380 }
    ],
    collected_at: new Date().toISOString()
  }
}

function getYesterday(): string {
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  return yesterday.toISOString().split('T')[0]
}

function get30DaysAgo(): string {
  const date = new Date()
  date.setDate(date.getDate() - 30)
  return date.toISOString().split('T')[0]
}
