import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const revalidate = 0

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
 * GET /api/seo/metrics
 *
 * Récupère un résumé complet des métriques SEO avec détails multi-périodes
 *
 * Query params:
 * - period: '7d' | '30d' | '90d' (défaut: 30d)
 * - source: 'ga4' | 'gsc' | 'semrush' | 'all' (défaut: all)
 * - detailed: 'true' | 'false' (défaut: true) - Retourne les données détaillées par période
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
    const period = searchParams.get('period') || '30d'
    const source = searchParams.get('source') || 'all'
    const detailed = searchParams.get('detailed') !== 'false'

    const supabase = getSupabaseClient()
    const response: any = {
      success: true,
      period
    }

    // Google Analytics 4
    if (source === 'all' || source === 'ga4') {
      const ga4Periods = await fetchMultiPeriodData(
        supabase,
        'seo_ga4_metrics_daily',
        detailed
      )

      response.ga4 = {
        today: {
          data: ga4Periods.today[0] || null,
          summary: calculateGA4Summary(ga4Periods.today),
          description: 'Données Google Analytics 4 pour aujourd\'hui'
        },
        yesterday: {
          data: ga4Periods.yesterday[0] || null,
          summary: calculateGA4Summary(ga4Periods.yesterday),
          description: 'Données Google Analytics 4 pour hier'
        },
        last_week: {
          records: ga4Periods.last_week.length,
          summary: calculateGA4Summary(ga4Periods.last_week),
          trend: calculateTrend(ga4Periods.last_week, 'users'),
          description: 'Données agrégées des 7 derniers jours'
        },
        last_month: {
          records: ga4Periods.last_month.length,
          summary: calculateGA4Summary(ga4Periods.last_month),
          trend: calculateTrend(ga4Periods.last_month, 'users'),
          description: 'Données agrégées des 30 derniers jours'
        },
        last_year: {
          records: ga4Periods.last_year.length,
          summary: calculateGA4Summary(ga4Periods.last_year),
          trend: calculateTrend(ga4Periods.last_year, 'users'),
          description: 'Données agrégées des 365 derniers jours'
        }
      }
    }

    // Google Search Console
    if (source === 'all' || source === 'gsc') {
      const gscPeriods = await fetchMultiPeriodData(
        supabase,
        'seo_gsc_metrics_daily',
        detailed
      )

      response.gsc = {
        today: {
          data: gscPeriods.today[0] || null,
          summary: calculateGSCSummary(gscPeriods.today),
          description: 'Données Google Search Console pour aujourd\'hui'
        },
        yesterday: {
          data: gscPeriods.yesterday[0] || null,
          summary: calculateGSCSummary(gscPeriods.yesterday),
          description: 'Données Google Search Console pour hier'
        },
        last_week: {
          records: gscPeriods.last_week.length,
          summary: calculateGSCSummary(gscPeriods.last_week),
          trend: calculateTrend(gscPeriods.last_week, 'clicks'),
          description: 'Données agrégées des 7 derniers jours'
        },
        last_month: {
          records: gscPeriods.last_month.length,
          summary: calculateGSCSummary(gscPeriods.last_month),
          trend: calculateTrend(gscPeriods.last_month, 'clicks'),
          description: 'Données agrégées des 30 derniers jours'
        },
        last_year: {
          records: gscPeriods.last_year.length,
          summary: calculateGSCSummary(gscPeriods.last_year),
          trend: calculateTrend(gscPeriods.last_year, 'clicks'),
          description: 'Données agrégées des 365 derniers jours'
        }
      }
    }

    // Semrush
    if (source === 'all' || source === 'semrush') {
      const semrushPeriods = await fetchMultiPeriodData(
        supabase,
        'seo_semrush_domain_daily',
        detailed
      )

      response.semrush = {
        today: {
          data: semrushPeriods.today[0] || null,
          summary: calculateSemrushSummary(semrushPeriods.today),
          description: 'Données Semrush pour aujourd\'hui'
        },
        yesterday: {
          data: semrushPeriods.yesterday[0] || null,
          summary: calculateSemrushSummary(semrushPeriods.yesterday),
          description: 'Données Semrush pour hier'
        },
        last_week: {
          records: semrushPeriods.last_week.length,
          summary: calculateSemrushSummary(semrushPeriods.last_week),
          trend: calculateTrend(semrushPeriods.last_week, 'organic_keywords'),
          description: 'Données agrégées des 7 derniers jours'
        },
        last_month: {
          records: semrushPeriods.last_month.length,
          summary: calculateSemrushSummary(semrushPeriods.last_month),
          trend: calculateTrend(semrushPeriods.last_month, 'organic_keywords'),
          description: 'Données agrégées des 30 derniers jours'
        },
        last_year: {
          records: semrushPeriods.last_year.length,
          summary: calculateSemrushSummary(semrushPeriods.last_year),
          trend: calculateTrend(semrushPeriods.last_year, 'organic_keywords'),
          description: 'Données agrégées des 365 derniers jours'
        }
      }
    }

    // Keywords tracking
    if (source === 'all') {
      const { data: keywords } = await supabase
        .from('seo_keywords_tracking')
        .select('*')
        .eq('active', true)
        .order('priority', { ascending: true })
        .order('current_position', { ascending: true })
        .limit(20)

      response.keywords = {
        total: keywords?.length || 0,
        top10: keywords?.filter(k => k.current_position && k.current_position <= 10).length || 0,
        improved: keywords?.filter(k => k.position_change && k.position_change > 0).length || 0,
        declined: keywords?.filter(k => k.position_change && k.position_change < 0).length || 0,
        topKeywords: keywords?.slice(0, 10) || [],
        description: `Suivi de ${keywords?.length || 0} mots-clés stratégiques sur ${(keywords && keywords.length > 0) ? Math.max(...keywords.map(k => {
          const lastCheck = new Date(k.last_checked_at || k.updated_at)
          const now = new Date()
          return Math.floor((now.getTime() - lastCheck.getTime()) / (1000 * 60 * 60 * 24))
        })) : 0} jours`
      }
    }

    // Audit issues
    if (source === 'all') {
      const { data: audits } = await supabase
        .from('seo_audit_log')
        .select('*')
        .in('status', ['open', 'in_progress'])
        .order('priority', { ascending: false })
        .order('detected_at', { ascending: true })
        .limit(10)

      response.audits = {
        total: audits?.length || 0,
        critical: audits?.filter(a => a.severity === 'critical').length || 0,
        errors: audits?.filter(a => a.severity === 'error').length || 0,
        warnings: audits?.filter(a => a.severity === 'warning').length || 0,
        pendingIssues: audits || []
      }
    }

    return NextResponse.json(response)

  } catch (error: any) {
    console.error('❌ Erreur récupération métriques SEO:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Erreur lors de la récupération des métriques',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}

// ============================================
// FONCTIONS UTILITAIRES
// ============================================

async function fetchMultiPeriodData(supabase: any, tableName: string, detailed: boolean) {
  const today = new Date().toISOString().split('T')[0]
  const yesterday = getDaysAgo(1)
  const weekAgo = getDaysAgo(7)
  const monthAgo = getDaysAgo(30)
  const yearAgo = getDaysAgo(365)

  const [todayData, yesterdayData, weekData, monthData, yearData] = await Promise.all([
    // Today
    supabase
      .from(tableName)
      .select('*')
      .eq('date', today)
      .order('date', { ascending: false })
      .then((r: any) => r.data || []),

    // Yesterday
    supabase
      .from(tableName)
      .select('*')
      .eq('date', yesterday)
      .order('date', { ascending: false })
      .then((r: any) => r.data || []),

    // Last 7 days
    supabase
      .from(tableName)
      .select('*')
      .gte('date', weekAgo)
      .lte('date', yesterday)
      .order('date', { ascending: false })
      .then((r: any) => r.data || []),

    // Last 30 days
    supabase
      .from(tableName)
      .select('*')
      .gte('date', monthAgo)
      .lte('date', yesterday)
      .order('date', { ascending: false })
      .then((r: any) => r.data || []),

    // Last 365 days
    supabase
      .from(tableName)
      .select('*')
      .gte('date', yearAgo)
      .lte('date', yesterday)
      .order('date', { ascending: false })
      .then((r: any) => r.data || [])
  ])

  return {
    today: todayData,
    yesterday: yesterdayData,
    last_week: weekData,
    last_month: monthData,
    last_year: yearData
  }
}

// ============================================
// FONCTIONS DE CALCUL
// ============================================

function calculateGA4Summary(data: any[]) {
  if (data.length === 0) return null

  return {
    total_users: data.reduce((sum, d) => sum + (d.users || 0), 0),
    total_sessions: data.reduce((sum, d) => sum + (d.sessions || 0), 0),
    avg_engagement_rate: average(data.map(d => d.engagement_rate || 0)),
    avg_bounce_rate: average(data.map(d => d.bounce_rate || 0)),
    total_conversions: data.reduce((sum, d) => sum + (d.conversions || 0), 0),
    total_organic_traffic: data.reduce((sum, d) => sum + (d.organic_traffic || 0), 0),
    mobile_percentage: data.length > 0
      ? (data.reduce((sum, d) => sum + (d.mobile_users || 0), 0) /
         data.reduce((sum, d) => sum + (d.users || 0), 0) * 100)
      : 0
  }
}

function calculateGSCSummary(data: any[]) {
  if (data.length === 0) return null

  return {
    total_clicks: data.reduce((sum, d) => sum + (d.clicks || 0), 0),
    total_impressions: data.reduce((sum, d) => sum + (d.impressions || 0), 0),
    avg_ctr: average(data.map(d => d.ctr || 0)),
    avg_position: average(data.map(d => d.average_position || 0)),
    mobile_clicks_percentage: data.length > 0
      ? (data.reduce((sum, d) => sum + (d.mobile_clicks || 0), 0) /
         data.reduce((sum, d) => sum + (d.clicks || 0), 0) * 100)
      : 0
  }
}

function calculateSemrushSummary(data: any[]) {
  if (data.length === 0) return null

  const latest = data[0]

  return {
    current_organic_keywords: latest?.organic_keywords || 0,
    current_authority_score: latest?.authority_score || 0,
    avg_organic_traffic: average(data.map(d => d.organic_traffic || 0)),
    total_backlinks: latest?.total_backlinks || 0,
    referring_domains: latest?.referring_domains || 0
  }
}

function calculateTrend(data: any[], field: string): string {
  if (data.length < 2) return 'stable'

  const recent = data.slice(0, Math.floor(data.length / 2))
  const older = data.slice(Math.floor(data.length / 2))

  const recentAvg = average(recent.map(d => d[field] || 0))
  const olderAvg = average(older.map(d => d[field] || 0))

  const change = ((recentAvg - olderAvg) / olderAvg) * 100

  if (change > 5) return 'up'
  if (change < -5) return 'down'
  return 'stable'
}

function average(arr: number[]): number {
  if (arr.length === 0) return 0
  return arr.reduce((sum, n) => sum + n, 0) / arr.length
}

function getDaysAgo(days: number): string {
  const date = new Date()
  date.setDate(date.getDate() - days)
  return date.toISOString().split('T')[0]
}
