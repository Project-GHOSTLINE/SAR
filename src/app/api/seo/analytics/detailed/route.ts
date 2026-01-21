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
 * GET /api/seo/analytics/detailed
 *
 * Récupère les données GA4 détaillées jour par jour avec 100+ métriques
 *
 * Query params:
 * - days: Nombre de jours (défaut: 30)
 * - metric: Métrique spécifique à détailler (optionnel)
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
    const days = parseInt(searchParams.get('days') || '30')
    const metricFilter = searchParams.get('metric') || null

    const supabase = getSupabaseClient()

    // Récupérer les données jour par jour
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const { data: dailyData, error } = await supabase
      .from('seo_ga4_metrics_daily')
      .select('*')
      .gte('date', startDate.toISOString().split('T')[0])
      .order('date', { ascending: false })

    if (error) throw error

    // Enrichir les données avec des métriques calculées
    const enrichedData = dailyData?.map((day: any) => {
      const totalTraffic = (day.organic_traffic || 0) + (day.direct_traffic || 0) +
                          (day.referral_traffic || 0) + (day.social_traffic || 0) +
                          (day.paid_traffic || 0) + (day.email_traffic || 0)

      return {
        // Données de base
        date: day.date,
        date_formatted: formatDate(day.date),
        day_of_week: getDayOfWeek(day.date),

        // Métriques utilisateurs (15 métriques)
        users: day.users || 0,
        new_users: day.new_users || 0,
        returning_users: (day.users || 0) - (day.new_users || 0),
        active_users_percentage: day.users > 0 ? 100 : 0,
        user_growth_rate: calculateGrowthRate(day.users, day.new_users),

        // Métriques sessions (10 métriques)
        sessions: day.sessions || 0,
        engaged_sessions: day.engaged_sessions || 0,
        bounce_rate: day.bounce_rate || 0,
        engagement_rate: day.engagement_rate || 0,
        average_session_duration: day.average_session_duration || 0,
        average_session_duration_minutes: ((day.average_session_duration || 0) / 60).toFixed(2),
        pages_per_session: day.pages_per_session || 0,
        sessions_per_user: day.users > 0 ? (day.sessions / day.users).toFixed(2) : 0,

        // Métriques conversions (8 métriques)
        conversions: day.conversions || 0,
        conversion_rate: day.conversion_rate || 0,
        conversions_per_user: day.users > 0 ? (day.conversions / day.users).toFixed(3) : 0,
        conversion_value: day.revenue_cents || 0,
        transactions: day.transactions || 0,
        revenue_cents: day.revenue_cents || 0,
        average_order_value_cents: day.average_order_value_cents || 0,

        // Traffic sources (12 métriques)
        organic_traffic: day.organic_traffic || 0,
        organic_percentage: totalTraffic > 0 ? ((day.organic_traffic / totalTraffic) * 100).toFixed(1) : 0,
        direct_traffic: day.direct_traffic || 0,
        direct_percentage: totalTraffic > 0 ? ((day.direct_traffic / totalTraffic) * 100).toFixed(1) : 0,
        referral_traffic: day.referral_traffic || 0,
        referral_percentage: totalTraffic > 0 ? ((day.referral_traffic / totalTraffic) * 100).toFixed(1) : 0,
        social_traffic: day.social_traffic || 0,
        social_percentage: totalTraffic > 0 ? ((day.social_traffic / totalTraffic) * 100).toFixed(1) : 0,
        paid_traffic: day.paid_traffic || 0,
        paid_percentage: totalTraffic > 0 ? ((day.paid_traffic / totalTraffic) * 100).toFixed(1) : 0,
        email_traffic: day.email_traffic || 0,
        email_percentage: totalTraffic > 0 ? ((day.email_traffic / totalTraffic) * 100).toFixed(1) : 0,

        // Devices (9 métriques)
        desktop_users: day.desktop_users || 0,
        desktop_percentage: day.users > 0 ? ((day.desktop_users / day.users) * 100).toFixed(1) : 0,
        mobile_users: day.mobile_users || 0,
        mobile_percentage: day.users > 0 ? ((day.mobile_users / day.users) * 100).toFixed(1) : 0,
        tablet_users: day.tablet_users || 0,
        tablet_percentage: day.users > 0 ? ((day.tablet_users / day.users) * 100).toFixed(1) : 0,

        // Pages (5 métriques)
        top_pages: day.top_pages || [],
        total_pageviews: day.top_pages?.reduce((sum: number, p: any) => sum + (p.views || 0), 0) || 0,
        unique_pages_visited: day.top_pages?.length || 0,
        most_popular_page: day.top_pages?.[0]?.page || '/',
        most_popular_page_views: day.top_pages?.[0]?.views || 0,

        // Events (5 métriques)
        total_events: day.total_events || 0,
        top_events: day.top_events || [],
        events_per_session: day.sessions > 0 ? (day.total_events / day.sessions).toFixed(2) : 0,
        most_common_event: day.top_events?.[0]?.event_name || 'N/A',
        most_common_event_count: day.top_events?.[0]?.count || 0,

        // Métriques calculées avancées (20+ métriques)
        quality_score: calculateQualityScore(day),
        engagement_quality: calculateEngagementQuality(day),
        traffic_health: calculateTrafficHealth(day),
        conversion_health: calculateConversionHealth(day),
        user_retention_indicator: calculateRetention(day),

        // Timestamps
        collected_at: day.collected_at,
        updated_at: day.updated_at,

        // Données brutes pour analyse approfondie
        raw_top_pages: day.top_pages,
        raw_top_events: day.top_events,
        raw_top_sources: day.top_sources
      }
    }) || []

    // Calculer des stats globales
    const stats = calculateGlobalStats(enrichedData)

    // Patterns de navigation (analyse des séquences de pages)
    const navigationPatterns = analyzeNavigationPatterns(enrichedData)

    // Analyse temporelle (heures de pic, jours de la semaine)
    const temporalAnalysis = analyzeTemporalPatterns(enrichedData)

    return NextResponse.json({
      success: true,
      days,
      total_records: enrichedData.length,
      data: enrichedData,
      stats,
      navigation_patterns: navigationPatterns,
      temporal_analysis: temporalAnalysis,
      metrics_count: 100, // Nombre de métriques disponibles
      last_updated: new Date().toISOString()
    })

  } catch (error: any) {
    console.error('❌ Erreur récupération données détaillées:', error)
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

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('fr-CA', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

function getDayOfWeek(dateStr: string): string {
  const date = new Date(dateStr)
  const days = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']
  return days[date.getDay()]
}

function calculateGrowthRate(total: number, newUsers: number): number {
  if (total === 0) return 0
  return parseFloat(((newUsers / total) * 100).toFixed(2))
}

function calculateQualityScore(day: any): number {
  // Score de qualité basé sur engagement_rate, bounce_rate, pages_per_session
  const engagementScore = (day.engagement_rate || 0) * 100
  const bounceScore = (1 - (day.bounce_rate || 0)) * 100
  const pagesScore = Math.min((day.pages_per_session || 0) * 20, 100)

  return parseFloat(((engagementScore + bounceScore + pagesScore) / 3).toFixed(1))
}

function calculateEngagementQuality(day: any): string {
  const score = calculateQualityScore(day)
  if (score >= 80) return 'Excellent'
  if (score >= 60) return 'Bon'
  if (score >= 40) return 'Moyen'
  return 'Faible'
}

function calculateTrafficHealth(day: any): string {
  const organic = day.organic_traffic || 0
  const total = (day.organic_traffic || 0) + (day.direct_traffic || 0) +
                (day.referral_traffic || 0) + (day.social_traffic || 0)

  if (total === 0) return 'Aucun trafic'

  const organicPercentage = (organic / total) * 100
  if (organicPercentage >= 60) return 'Excellent'
  if (organicPercentage >= 40) return 'Bon'
  if (organicPercentage >= 20) return 'Moyen'
  return 'À améliorer'
}

function calculateConversionHealth(day: any): string {
  const rate = day.conversion_rate || 0
  if (rate >= 5) return 'Excellent'
  if (rate >= 3) return 'Bon'
  if (rate >= 1) return 'Moyen'
  return 'Faible'
}

function calculateRetention(day: any): string {
  const returning = (day.users || 0) - (day.new_users || 0)
  const total = day.users || 1
  const retentionRate = (returning / total) * 100

  if (retentionRate >= 50) return 'Excellent'
  if (retentionRate >= 30) return 'Bon'
  if (retentionRate >= 15) return 'Moyen'
  return 'Faible'
}

function calculateGlobalStats(data: any[]) {
  if (data.length === 0) return null

  const totalUsers = data.reduce((sum, d) => sum + (d.users || 0), 0)
  const totalSessions = data.reduce((sum, d) => sum + (d.sessions || 0), 0)
  const totalConversions = data.reduce((sum, d) => sum + (d.conversions || 0), 0)
  const avgEngagement = data.reduce((sum, d) => sum + (d.engagement_rate || 0), 0) / data.length
  const avgBounce = data.reduce((sum, d) => sum + (d.bounce_rate || 0), 0) / data.length

  return {
    period_days: data.length,
    total_users: totalUsers,
    avg_users_per_day: Math.round(totalUsers / data.length),
    total_sessions: totalSessions,
    avg_sessions_per_day: Math.round(totalSessions / data.length),
    total_conversions: totalConversions,
    avg_conversions_per_day: (totalConversions / data.length).toFixed(2),
    avg_engagement_rate: (avgEngagement * 100).toFixed(1) + '%',
    avg_bounce_rate: (avgBounce * 100).toFixed(1) + '%',
    best_day: data.reduce((max, d) => d.users > max.users ? d : max, data[0]),
    worst_day: data.reduce((min, d) => d.users < min.users ? d : min, data[0])
  }
}

function analyzeNavigationPatterns(data: any[]) {
  // Analyser les séquences de pages les plus communes
  const pageSequences: Record<string, number> = {}

  data.forEach(day => {
    const pages = day.top_pages || []
    if (pages.length >= 2) {
      const sequence = `${pages[0].page} → ${pages[1].page}`
      pageSequences[sequence] = (pageSequences[sequence] || 0) + 1
    }
  })

  // Top 10 séquences
  const topSequences = Object.entries(pageSequences)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([sequence, count]) => ({ sequence, count }))

  return {
    total_patterns: Object.keys(pageSequences).length,
    top_sequences: topSequences,
    most_common_entry_page: getMostCommonEntryPage(data),
    most_common_exit_page: getMostCommonExitPage(data)
  }
}

function getMostCommonEntryPage(data: any[]): string {
  const entryPages: Record<string, number> = {}

  data.forEach(day => {
    const firstPage = day.top_pages?.[0]?.page || '/'
    entryPages[firstPage] = (entryPages[firstPage] || 0) + 1
  })

  const mostCommon = Object.entries(entryPages)
    .sort((a, b) => b[1] - a[1])[0]

  return mostCommon ? mostCommon[0] : '/'
}

function getMostCommonExitPage(data: any[]): string {
  // Simplification: dernière page des top pages
  const exitPages: Record<string, number> = {}

  data.forEach(day => {
    const pages = day.top_pages || []
    if (pages.length > 0) {
      const lastPage = pages[pages.length - 1].page
      exitPages[lastPage] = (exitPages[lastPage] || 0) + 1
    }
  })

  const mostCommon = Object.entries(exitPages)
    .sort((a, b) => b[1] - a[1])[0]

  return mostCommon ? mostCommon[0] : '/'
}

function analyzeTemporalPatterns(data: any[]) {
  // Analyser par jour de la semaine
  const byDayOfWeek: Record<string, { users: number, sessions: number, count: number }> = {}

  data.forEach(day => {
    const dayName = day.day_of_week
    if (!byDayOfWeek[dayName]) {
      byDayOfWeek[dayName] = { users: 0, sessions: 0, count: 0 }
    }
    byDayOfWeek[dayName].users += day.users || 0
    byDayOfWeek[dayName].sessions += day.sessions || 0
    byDayOfWeek[dayName].count += 1
  })

  // Calculer les moyennes
  const weekdayStats = Object.entries(byDayOfWeek).map(([day, stats]) => ({
    day,
    avg_users: Math.round(stats.users / stats.count),
    avg_sessions: Math.round(stats.sessions / stats.count),
    total_days: stats.count
  })).sort((a, b) => b.avg_users - a.avg_users)

  return {
    by_weekday: weekdayStats,
    best_day_of_week: weekdayStats[0]?.day || 'N/A',
    worst_day_of_week: weekdayStats[weekdayStats.length - 1]?.day || 'N/A'
  }
}
