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
 * GET /api/seo/metrics
 *
 * Récupère un résumé complet des métriques SEO
 *
 * Query params:
 * - period: '7d' | '30d' | '90d' (défaut: 30d)
 * - source: 'ga4' | 'gsc' | 'semrush' | 'all' (défaut: all)
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

    const daysAgo = period === '7d' ? 7 : period === '90d' ? 90 : 30
    const startDate = getDaysAgo(daysAgo)
    const endDate = getDaysAgo(1) // Hier

    const supabase = getSupabaseClient()
    const response: any = {
      success: true,
      period: `${daysAgo}d`,
      dateRange: { startDate, endDate }
    }

    // Google Analytics 4
    if (source === 'all' || source === 'ga4') {
      const { data: ga4Data } = await supabase
        .from('seo_ga4_metrics_daily')
        .select('*')
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: false })

      response.ga4 = {
        records: ga4Data?.length || 0,
        summary: calculateGA4Summary(ga4Data || []),
        latest: ga4Data?.[0] || null,
        trend: calculateTrend(ga4Data || [], 'users')
      }
    }

    // Google Search Console
    if (source === 'all' || source === 'gsc') {
      const { data: gscData } = await supabase
        .from('seo_gsc_metrics_daily')
        .select('*')
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: false })

      response.gsc = {
        records: gscData?.length || 0,
        summary: calculateGSCSummary(gscData || []),
        latest: gscData?.[0] || null,
        trend: calculateTrend(gscData || [], 'clicks')
      }
    }

    // Semrush
    if (source === 'all' || source === 'semrush') {
      const { data: semrushData } = await supabase
        .from('seo_semrush_domain_daily')
        .select('*')
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: false })

      response.semrush = {
        records: semrushData?.length || 0,
        summary: calculateSemrushSummary(semrushData || []),
        latest: semrushData?.[0] || null,
        trend: calculateTrend(semrushData || [], 'organic_keywords')
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
        topKeywords: keywords?.slice(0, 10) || []
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
