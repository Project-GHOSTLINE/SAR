import { NextRequest, NextResponse } from 'next/server'
import type { AnalyticsDashboardData, AnalyticsDeviceSummary, AnalyticsTopPage, AnalyticsTrafficSource, AnalyticsGeography } from '@/types/analytics'
import { getOrSet } from '@/lib/cache'
import { withPerf } from '@/lib/perf'

// Force dynamic rendering (uses cookies for auth)
export const dynamic = 'force-dynamic'

// Vérifier l'authentification admin
function isAuthenticated(request: NextRequest): boolean {
  const token = request.cookies.get('admin-session')?.value
  const apiKey = request.headers.get('x-api-key')
  return !!token || apiKey === process.env.ADMIN_PASSWORD
}

/**
 * GET /api/admin/analytics/dashboard
 *
 * Retourne les données Analytics agrégées pour le dashboard admin
 *
 * Query params:
 * - period: '7d' | '30d' | '90d' (default: '7d')
 *
 * OPTIMIZED: Uses 5-minute cache to avoid hitting Google Analytics API on every request
 */
async function handleGET(request: NextRequest) {
  try {
    // Vérifier authentification
    if (!isAuthenticated(request)) {
      return NextResponse.json(
        { success: false, error: 'Non autorisé' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || '7d'

    // Mapper period to GA4 date range
    const dateRangeMap: Record<string, string> = {
      '7d': '7daysAgo',
      '30d': '30daysAgo',
      '90d': '90daysAgo'
    }

    const startDate = dateRangeMap[period] || '7daysAgo'

    // OPTIMIZED: Cache expensive Google Analytics API call (5 min TTL)
    // Key: dashboard:{period} ensures separate cache per time period
    const analyticsData = await getOrSet(
      `dashboard:${period}`,
      async () => {
        // Récupérer les données brutes via l'API principale
        const baseUrl = new URL(request.url).origin
        const analyticsResponse = await fetch(
          `${baseUrl}/api/admin/analytics?startDate=${startDate}&endDate=today`,
          {
            headers: {
              Cookie: request.headers.get('cookie') || ''
            }
          }
        )

        if (!analyticsResponse.ok) {
          throw new Error('Erreur lors de la récupération des données Analytics')
        }

        const data = await analyticsResponse.json()

        if (!data.success) {
          throw new Error(data.error || 'Erreur Analytics')
        }

        return data
      },
      300 // 5 minutes cache
    )

    // Agréger les données par device
    const deviceMap = new Map<string, AnalyticsDeviceSummary>()

    analyticsData.data.forEach((row: any) => {
      const category = row.device.category
      const existing = deviceMap.get(category) || {
        category,
        users: 0,
        sessions: 0,
        pageViews: 0,
        conversions: 0,
        revenue: 0,
        bounceRate: 0,
        avgSessionDuration: 0
      }

      deviceMap.set(category, {
        ...existing,
        users: existing.users + row.metrics.totalUsers,
        sessions: existing.sessions + row.metrics.sessions,
        pageViews: existing.pageViews + row.metrics.screenPageViews,
        conversions: existing.conversions + row.metrics.conversions,
        revenue: existing.revenue + row.metrics.totalRevenue,
        bounceRate: existing.bounceRate + row.metrics.bounceRate,
        avgSessionDuration: existing.avgSessionDuration + row.metrics.averageSessionDuration
      })
    })

    // Calculer les moyennes pour bounce rate et session duration
    const devices = Array.from(deviceMap.values()).map(device => {
      const count = analyticsData.data.filter((r: any) => r.device.category === device.category).length
      return {
        ...device,
        bounceRate: count > 0 ? device.bounceRate / count : 0,
        avgSessionDuration: count > 0 ? device.avgSessionDuration / count : 0
      }
    })

    // Agréger les sources de trafic
    const sourceMap = new Map<string, AnalyticsTrafficSource>()

    analyticsData.data.forEach((row: any) => {
      const key = `${row.source.source}_${row.source.medium}`
      const existing = sourceMap.get(key) || {
        source: row.source.source,
        medium: row.source.medium,
        users: 0,
        sessions: 0,
        conversions: 0,
        revenue: 0
      }

      sourceMap.set(key, {
        ...existing,
        users: existing.users + row.metrics.totalUsers,
        sessions: existing.sessions + row.metrics.sessions,
        conversions: existing.conversions + row.metrics.conversions,
        revenue: existing.revenue + row.metrics.totalRevenue
      })
    })

    const trafficSources = Array.from(sourceMap.values())
      .sort((a, b) => b.users - a.users)
      .slice(0, 10) // Top 10 sources

    // Agréger par géographie
    const geoMap = new Map<string, AnalyticsGeography>()

    analyticsData.data.forEach((row: any) => {
      const key = `${row.location.country}_${row.location.city}`
      const existing = geoMap.get(key) || {
        country: row.location.country,
        city: row.location.city,
        users: 0,
        sessions: 0,
        conversions: 0
      }

      geoMap.set(key, {
        ...existing,
        users: existing.users + row.metrics.totalUsers,
        sessions: existing.sessions + row.metrics.sessions,
        conversions: existing.conversions + row.metrics.conversions
      })
    })

    const geography = Array.from(geoMap.values())
      .sort((a, b) => b.users - a.users)
      .slice(0, 10) // Top 10 locations

    // Construire la réponse dashboard
    const dashboardData: AnalyticsDashboardData = {
      overview: {
        totalUsers: analyticsData.summary.totalUsers,
        totalSessions: analyticsData.summary.totalSessions,
        totalPageViews: analyticsData.summary.totalPageViews,
        totalConversions: analyticsData.summary.totalConversions,
        totalRevenue: analyticsData.summary.totalRevenue,
        averageSessionDuration: analyticsData.summary.averageSessionDuration,
        bounceRate: analyticsData.summary.bounceRate,
        newUsersRate: analyticsData.data.reduce((sum: number, row: any) => sum + row.metrics.newUsers, 0) /
          (analyticsData.summary.totalUsers || 1)
      },
      devices,
      topPages: [], // TODO: Implémenter avec dimension 'pagePath'
      trafficSources,
      geography,
      trends: [] // TODO: Implémenter avec dateRanges multiples
    }

    return NextResponse.json({
      success: true,
      data: dashboardData,
      period,
      dateRange: analyticsData.dateRange
    })

  } catch (error: any) {
    console.error('❌ Erreur Analytics Dashboard API:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Erreur lors de la récupération du dashboard Analytics'
      },
      { status: 500 }
    )
  }
}

export const GET = withPerf('admin/analytics/dashboard', handleGET)
