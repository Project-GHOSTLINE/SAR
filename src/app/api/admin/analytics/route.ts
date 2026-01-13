import { NextRequest, NextResponse } from 'next/server'
import { BetaAnalyticsDataClient } from '@google-analytics/data'
import type { AnalyticsResponse, AnalyticsRow } from '@/types/analytics'

// Vérifier l'authentification admin
function isAuthenticated(request: NextRequest): boolean {
  const token = request.cookies.get('admin-session')?.value
  return !!token
}

// Initialize Analytics Data Client
function getAnalyticsClient() {
  const propertyId = process.env.GA_PROPERTY_ID

  if (!propertyId) {
    throw new Error('GA_PROPERTY_ID non configuré dans .env.local')
  }

  // Option 1: Service Account JSON en variable d'environnement
  if (process.env.GA_SERVICE_ACCOUNT_JSON) {
    try {
      const credentials = JSON.parse(process.env.GA_SERVICE_ACCOUNT_JSON)
      return new BetaAnalyticsDataClient({ credentials })
    } catch (error) {
      console.error('Erreur parsing GA_SERVICE_ACCOUNT_JSON:', error)
      throw new Error('Credentials Google Analytics invalides')
    }
  }

  // Option 2: Fichier credentials (GOOGLE_APPLICATION_CREDENTIALS)
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    return new BetaAnalyticsDataClient()
  }

  // Option 3: Mode développement (utilise les credentials par défaut)
  console.warn('⚠️ Aucun credential GA configuré - mode dev')
  return null
}

/**
 * GET /api/admin/analytics
 *
 * Récupère les données Analytics avec filtres personnalisés
 *
 * Query params:
 * - startDate: Date de début (format: YYYY-MM-DD ou '7daysAgo')
 * - endDate: Date de fin (format: YYYY-MM-DD ou 'today')
 * - metrics: Métriques à récupérer (comma-separated)
 * - dimensions: Dimensions à grouper (comma-separated)
 */
export async function GET(request: NextRequest) {
  try {
    // Vérifier authentification
    if (!isAuthenticated(request)) {
      return NextResponse.json(
        { success: false, error: 'Non autorisé' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate') || '7daysAgo'
    const endDate = searchParams.get('endDate') || 'today'
    const metricsParam = searchParams.get('metrics')
    const dimensionsParam = searchParams.get('dimensions')

    // Dimensions par défaut
    const defaultDimensions = [
      { name: 'deviceCategory' },
      { name: 'operatingSystem' },
      { name: 'operatingSystemVersion' },
      { name: 'browser' },
      { name: 'browserVersion' },
      { name: 'screenResolution' },
      { name: 'country' },
      { name: 'region' },
      { name: 'city' },
      { name: 'sessionSource' },
      { name: 'sessionMedium' },
      { name: 'sessionCampaignName' }
    ]

    // Métriques par défaut
    const defaultMetrics = [
      { name: 'activeUsers' },
      { name: 'newUsers' },
      { name: 'totalUsers' },
      { name: 'sessions' },
      { name: 'sessionsPerUser' },
      { name: 'screenPageViews' },
      { name: 'averageSessionDuration' },
      { name: 'bounceRate' },
      { name: 'engagementRate' },
      { name: 'eventCount' },
      { name: 'conversions' },
      { name: 'totalRevenue' }
    ]

    // Parse custom dimensions/metrics si fournis
    const dimensions = dimensionsParam
      ? dimensionsParam.split(',').map(d => ({ name: d.trim() }))
      : defaultDimensions

    const metrics = metricsParam
      ? metricsParam.split(',').map(m => ({ name: m.trim() }))
      : defaultMetrics

    // Initialiser le client
    const analyticsClient = getAnalyticsClient()

    if (!analyticsClient) {
      // Mode mock pour développement
      console.log('📊 Mode MOCK - Retour de données fictives')
      return NextResponse.json(getMockData(startDate, endDate))
    }

    const propertyId = process.env.GA_PROPERTY_ID!

    // Appeler l'API Google Analytics
    const [response] = await analyticsClient.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate, endDate }],
      dimensions,
      metrics,
      limit: 1000 // Max 1000 rows
    })

    // Transformer les données
    const data: AnalyticsRow[] = response.rows?.map(row => {
      const dimensionValues = row.dimensionValues || []
      const metricValues = row.metricValues || []

      return {
        device: {
          category: dimensionValues[0]?.value || 'unknown',
          os: dimensionValues[1]?.value || 'unknown',
          osVersion: dimensionValues[2]?.value || 'unknown',
          browser: dimensionValues[3]?.value || 'unknown',
          browserVersion: dimensionValues[4]?.value || 'unknown',
          screenResolution: dimensionValues[5]?.value || 'unknown',
          platform: 'web'
        },
        location: {
          country: dimensionValues[6]?.value || 'unknown',
          region: dimensionValues[7]?.value || 'unknown',
          city: dimensionValues[8]?.value || 'unknown'
        },
        source: {
          source: dimensionValues[9]?.value || 'direct',
          medium: dimensionValues[10]?.value || 'none',
          campaign: dimensionValues[11]?.value || undefined
        },
        metrics: {
          activeUsers: parseInt(metricValues[0]?.value || '0'),
          newUsers: parseInt(metricValues[1]?.value || '0'),
          totalUsers: parseInt(metricValues[2]?.value || '0'),
          sessions: parseInt(metricValues[3]?.value || '0'),
          sessionsPerUser: parseFloat(metricValues[4]?.value || '0'),
          screenPageViews: parseInt(metricValues[5]?.value || '0'),
          averageSessionDuration: parseFloat(metricValues[6]?.value || '0'),
          bounceRate: parseFloat(metricValues[7]?.value || '0'),
          engagementRate: parseFloat(metricValues[8]?.value || '0'),
          eventCount: parseInt(metricValues[9]?.value || '0'),
          conversions: parseInt(metricValues[10]?.value || '0'),
          totalRevenue: parseFloat(metricValues[11]?.value || '0'),
          engagedSessions: 0,
          userEngagementDuration: 0
        },
        timestamp: new Date().toISOString()
      }
    }) || []

    // Calculer le summary
    const summary = {
      totalUsers: data.reduce((sum, row) => sum + row.metrics.totalUsers, 0),
      totalSessions: data.reduce((sum, row) => sum + row.metrics.sessions, 0),
      totalPageViews: data.reduce((sum, row) => sum + row.metrics.screenPageViews, 0),
      totalConversions: data.reduce((sum, row) => sum + row.metrics.conversions, 0),
      totalRevenue: data.reduce((sum, row) => sum + row.metrics.totalRevenue, 0),
      averageSessionDuration: data.length > 0
        ? data.reduce((sum, row) => sum + row.metrics.averageSessionDuration, 0) / data.length
        : 0,
      bounceRate: data.length > 0
        ? data.reduce((sum, row) => sum + row.metrics.bounceRate, 0) / data.length
        : 0
    }

    const result: AnalyticsResponse = {
      success: true,
      data,
      totalRows: data.length,
      dateRange: { startDate, endDate },
      summary
    }

    return NextResponse.json(result)

  } catch (error: any) {
    console.error('❌ Erreur Analytics API:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Erreur lors de la récupération des données Analytics',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}

/**
 * Données mock pour le développement
 */
function getMockData(startDate: string, endDate: string): AnalyticsResponse {
  const mockRows: AnalyticsRow[] = [
    {
      device: {
        category: 'mobile',
        os: 'iOS',
        osVersion: '17.2',
        browser: 'Safari',
        browserVersion: '17.2',
        screenResolution: '390x844',
        mobileDeviceBranding: 'Apple',
        mobileDeviceModel: 'iPhone 14',
        platform: 'web'
      },
      location: {
        country: 'Canada',
        region: 'Quebec',
        city: 'Montreal'
      },
      source: {
        source: 'google',
        medium: 'organic'
      },
      metrics: {
        activeUsers: 45,
        newUsers: 23,
        totalUsers: 45,
        sessions: 67,
        sessionsPerUser: 1.5,
        screenPageViews: 234,
        averageSessionDuration: 180,
        bounceRate: 0.35,
        engagementRate: 0.65,
        eventCount: 456,
        conversions: 12,
        totalRevenue: 3600,
        engagedSessions: 45,
        userEngagementDuration: 8100
      },
      timestamp: new Date().toISOString()
    },
    {
      device: {
        category: 'desktop',
        os: 'Windows',
        osVersion: '11',
        browser: 'Chrome',
        browserVersion: '120.0',
        screenResolution: '1920x1080',
        platform: 'web'
      },
      location: {
        country: 'Canada',
        region: 'Ontario',
        city: 'Toronto'
      },
      source: {
        source: 'direct',
        medium: 'none'
      },
      metrics: {
        activeUsers: 78,
        newUsers: 34,
        totalUsers: 78,
        sessions: 112,
        sessionsPerUser: 1.4,
        screenPageViews: 456,
        averageSessionDuration: 240,
        bounceRate: 0.28,
        engagementRate: 0.72,
        eventCount: 890,
        conversions: 23,
        totalRevenue: 6900,
        engagedSessions: 81,
        userEngagementDuration: 19680
      },
      timestamp: new Date().toISOString()
    },
    {
      device: {
        category: 'mobile',
        os: 'Android',
        osVersion: '14',
        browser: 'Chrome',
        browserVersion: '120.0',
        screenResolution: '412x915',
        mobileDeviceBranding: 'Samsung',
        mobileDeviceModel: 'Galaxy S23',
        platform: 'web'
      },
      location: {
        country: 'Canada',
        region: 'Quebec',
        city: 'Quebec City'
      },
      source: {
        source: 'facebook',
        medium: 'cpc',
        campaign: 'pret-rapide-2026'
      },
      metrics: {
        activeUsers: 34,
        newUsers: 28,
        totalUsers: 34,
        sessions: 45,
        sessionsPerUser: 1.3,
        screenPageViews: 156,
        averageSessionDuration: 150,
        bounceRate: 0.42,
        engagementRate: 0.58,
        eventCount: 234,
        conversions: 8,
        totalRevenue: 2400,
        engagedSessions: 26,
        userEngagementDuration: 3900
      },
      timestamp: new Date().toISOString()
    }
  ]

  const summary = {
    totalUsers: mockRows.reduce((sum, row) => sum + row.metrics.totalUsers, 0),
    totalSessions: mockRows.reduce((sum, row) => sum + row.metrics.sessions, 0),
    totalPageViews: mockRows.reduce((sum, row) => sum + row.metrics.screenPageViews, 0),
    totalConversions: mockRows.reduce((sum, row) => sum + row.metrics.conversions, 0),
    totalRevenue: mockRows.reduce((sum, row) => sum + row.metrics.totalRevenue, 0),
    averageSessionDuration: mockRows.reduce((sum, row) => sum + row.metrics.averageSessionDuration, 0) / mockRows.length,
    bounceRate: mockRows.reduce((sum, row) => sum + row.metrics.bounceRate, 0) / mockRows.length
  }

  return {
    success: true,
    data: mockRows,
    totalRows: mockRows.length,
    dateRange: { startDate, endDate },
    summary
  }
}
