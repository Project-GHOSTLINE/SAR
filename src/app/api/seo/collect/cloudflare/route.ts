/**
 * API: POST /api/seo/collect/cloudflare
 *
 * Collecte les métriques Cloudflare Analytics
 * Utilise Cloudflare GraphQL Analytics API
 */

import { NextRequest, NextResponse } from 'next/server'
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
 * POST /api/seo/collect/cloudflare
 *
 * Collecte les métriques Cloudflare Analytics
 *
 * Body:
 * - date: Date à collecter (défaut: hier)
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

    // Vérifier credentials Cloudflare
    if (!process.env.CLOUDFLARE_API_TOKEN) {
      return NextResponse.json({
        success: false,
        error: 'Cloudflare credentials manquants',
        message: 'CLOUDFLARE_API_TOKEN requis'
      }, { status: 503 })
    }

    // Récupérer le Zone ID si non fourni
    let zoneId = process.env.CLOUDFLARE_ZONE_ID
    if (!zoneId) {
      console.log('🔍 CLOUDFLARE_ZONE_ID non fourni, récupération automatique...')
      zoneId = await getCloudflareZoneId()
    }

    const supabase = getSupabaseClient()

    // Vérifier si déjà collecté
    if (!force) {
      const { data: existing } = await supabase
        .from('seo_cloudflare_analytics_daily')
        .select('id')
        .eq('date', targetDate)
        .single()

      if (existing) {
        return NextResponse.json({
          success: true,
          message: 'Métriques Cloudflare déjà collectées pour cette date',
          date: targetDate,
          existing: true
        })
      }
    }

    // Collecter les données Cloudflare
    console.log(`🔍 Collecte Cloudflare Analytics pour ${targetDate}...`)

    const cloudflareData = await collectCloudflareData(targetDate, zoneId)

    const { data, error } = await supabase
      .from('seo_cloudflare_analytics_daily')
      .upsert([cloudflareData], { onConflict: 'date' })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({
      success: true,
      message: 'Métriques Cloudflare Analytics collectées avec succès',
      date: targetDate,
      data
    })

  } catch (error: any) {
    console.error('❌ Erreur collecte Cloudflare:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Erreur lors de la collecte Cloudflare',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/seo/collect/cloudflare
 *
 * Récupère les métriques Cloudflare stockées
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
      .from('seo_cloudflare_analytics_daily')
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
    console.error('❌ Erreur récupération Cloudflare:', error)
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
 * Récupère automatiquement le Zone ID depuis Cloudflare
 */
async function getCloudflareZoneId(): Promise<string> {
  const apiToken = process.env.CLOUDFLARE_API_TOKEN!

  try {
    const response = await fetch('https://api.cloudflare.com/client/v4/zones', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch zones: ${response.status}`)
    }

    const data = await response.json()

    if (!data.success || !data.result || data.result.length === 0) {
      throw new Error('Aucune zone Cloudflare trouvée')
    }

    // Trouver la zone pour solutionargentrapide.ca
    const zone = data.result.find((z: any) =>
      z.name === 'solutionargentrapide.ca' ||
      z.name.includes('solutionargentrapide')
    )

    if (!zone) {
      // Prendre la première zone disponible
      console.log(`⚠️ Zone 'solutionargentrapide.ca' non trouvée, utilisation de: ${data.result[0].name}`)
      return data.result[0].id
    }

    console.log(`✅ Zone trouvée: ${zone.name} (${zone.id})`)
    return zone.id

  } catch (error: any) {
    console.error('❌ Erreur récupération Zone ID:', error)
    throw new Error(`Impossible de récupérer le Zone ID: ${error.message}`)
  }
}

/**
 * Collecte les données depuis l'API Cloudflare GraphQL
 */
async function collectCloudflareData(date: string, zoneId: string) {
  const apiToken = process.env.CLOUDFLARE_API_TOKEN!

  // Dates pour la query (format ISO)
  const datetime = `${date}T00:00:00Z`
  const datetimeEnd = `${date}T23:59:59Z`

  // GraphQL query pour obtenir les analytics
  const query = `
    query {
      viewer {
        zones(filter: { zoneTag: "${zoneId}" }) {
          httpRequests1dGroups(
            limit: 1
            filter: { date: "${date}" }
          ) {
            sum {
              requests
              cachedRequests
              bytes
              cachedBytes
              threats
              pageViews
            }
            uniq {
              uniques
            }
          }
          httpRequests1dByResponseStatus: httpRequests1dGroups(
            limit: 10
            filter: { date: "${date}" }
            orderBy: [sum_requests_DESC]
          ) {
            dimensions {
              edgeResponseStatus
            }
            sum {
              requests
            }
          }
          httpRequests1dByCountry: httpRequests1dGroups(
            limit: 10
            filter: { date: "${date}" }
            orderBy: [sum_requests_DESC]
          ) {
            dimensions {
              clientCountryName
            }
            sum {
              requests
              bytes
            }
          }
        }
      }
    }
  `

  try {
    const response = await fetch('https://api.cloudflare.com/client/v4/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiToken}`
      },
      body: JSON.stringify({ query })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(`Cloudflare API error: ${response.status} - ${JSON.stringify(errorData)}`)
    }

    const result = await response.json()

    // Extraire les données
    const zones = result.data?.viewer?.zones || []
    if (zones.length === 0) {
      throw new Error('Aucune zone Cloudflare trouvée')
    }

    const zone = zones[0]
    const metrics = zone.httpRequests1dGroups?.[0] || {}
    const sum = metrics.sum || {}
    const uniq = metrics.uniq || {}

    // Calculer les métriques
    const totalRequests = sum.requests || 0
    const cachedRequests = sum.cachedRequests || 0
    const uncachedRequests = totalRequests - cachedRequests
    const cacheHitRatio = totalRequests > 0 ? (cachedRequests / totalRequests) * 100 : 0

    const bandwidthBytes = sum.bytes || 0
    const bandwidthCached = sum.cachedBytes || 0
    const bandwidthUncached = bandwidthBytes - bandwidthCached

    const threatsBlocked = sum.threats || 0
    const uniqueVisitors = uniq.uniques || 0

    // Breakdown par status code
    const statusBreakdown = zone.httpRequests1dByResponseStatus || []
    let status2xx = 0, status3xx = 0, status4xx = 0, status5xx = 0

    statusBreakdown.forEach((item: any) => {
      const status = item.dimensions?.edgeResponseStatus || 0
      const requests = item.sum?.requests || 0

      if (status >= 200 && status < 300) status2xx += requests
      else if (status >= 300 && status < 400) status3xx += requests
      else if (status >= 400 && status < 500) status4xx += requests
      else if (status >= 500 && status < 600) status5xx += requests
    })

    // Top countries
    const countryBreakdown = zone.httpRequests1dByCountry || []
    const topCountries = countryBreakdown.map((item: any) => ({
      country: item.dimensions?.clientCountryName || 'Unknown',
      requests: item.sum?.requests || 0,
      bytes: item.sum?.bytes || 0
    }))

    return {
      date,
      total_requests: totalRequests,
      cached_requests: cachedRequests,
      uncached_requests: uncachedRequests,
      cache_hit_ratio: Math.round(cacheHitRatio * 100) / 100,

      bandwidth_bytes: bandwidthBytes,
      bandwidth_cached_bytes: bandwidthCached,
      bandwidth_uncached_bytes: bandwidthUncached,

      threats_blocked: threatsBlocked,
      challenges_issued: 0, // Not available in this query

      bot_requests: 0, // Would need separate bot analytics query
      human_requests: totalRequests,
      bot_percentage: 0,

      status_2xx: status2xx,
      status_3xx: status3xx,
      status_4xx: status4xx,
      status_5xx: status5xx,

      top_countries: topCountries,
      top_paths: [], // Would need separate query

      desktop_requests: 0, // Would need device type query
      mobile_requests: 0,
      other_requests: 0,

      analytics_data: {
        unique_visitors: uniqueVisitors,
        page_views: sum.pageViews || 0,
        raw_metrics: metrics
      },

      collected_at: new Date().toISOString()
    }

  } catch (error: any) {
    console.error('❌ Erreur lors de l\'appel API Cloudflare:', error)
    throw error
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
