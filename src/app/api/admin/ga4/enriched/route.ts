/**
 * GA4 ENRICHED DATA API
 *
 * Agrège et enrichit les données GA4 pour le dashboard dataflow
 */

import { NextRequest, NextResponse } from 'next/server'
import { BetaAnalyticsDataClient } from '@google-analytics/data'

export const dynamic = 'force-dynamic'

// Auth check
function isAuthenticated(request: NextRequest): boolean {
  const token = request.cookies.get('admin-session')?.value
  return !!token
}

// Initialize GA4 client
function getAnalyticsClient() {
  if (process.env.GA_SERVICE_ACCOUNT_JSON) {
    try {
      // Fix malformed JSON by replacing literal newlines with \n escape sequences
      let jsonString = process.env.GA_SERVICE_ACCOUNT_JSON

      // Check if JSON has literal newlines (bad) and fix them
      if (jsonString.includes('\n') && !jsonString.includes('\\n')) {
        console.log('[GA4] Fixing malformed JSON with literal newlines')
        jsonString = jsonString.replace(/\n/g, '\\n')
      }

      const credentials = JSON.parse(jsonString)

      // Ensure private_key has actual newlines for the crypto library
      if (credentials.private_key && !credentials.private_key.includes('\n')) {
        credentials.private_key = credentials.private_key.replace(/\\n/g, '\n')
      }

      return new BetaAnalyticsDataClient({ credentials })
    } catch (error) {
      console.error('Error parsing GA credentials:', error)
      return null
    }
  }

  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    return new BetaAnalyticsDataClient()
  }

  return null
}

export async function GET(request: NextRequest) {
  try {
    // Auth check
    if (!isAuthenticated(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate') || '7daysAgo'
    const endDate = searchParams.get('endDate') || 'today'

    const client = getAnalyticsClient()

    if (!client) {
      console.log('[GA4 Enriched] No GA client - credentials missing or invalid')
      return NextResponse.json({ error: 'GA4 credentials not configured', unavailable: true }, { status: 503 })
    }

    if (!process.env.GA_PROPERTY_ID) {
      console.log('[GA4 Enriched] No GA_PROPERTY_ID')
      return NextResponse.json({ error: 'GA4 Property ID not configured', unavailable: true }, { status: 503 })
    }

    console.log('[GA4 Enriched] Client initialized, Property ID:', process.env.GA_PROPERTY_ID)

    const propertyId = process.env.GA_PROPERTY_ID

    // Fetch multiple reports in parallel
    let summaryReport, deviceReport, browserReport, locationReport, sourceReport, timeSeriesReport, realtimeReport

    try {
      [summaryReport, deviceReport, browserReport, locationReport, sourceReport, timeSeriesReport, realtimeReport] = await Promise.all([
      // Summary metrics
      client.runReport({
        property: `properties/${propertyId}`,
        dateRanges: [{ startDate, endDate }],
        metrics: [
          { name: 'totalUsers' },
          { name: 'newUsers' },
          { name: 'activeUsers' },
          { name: 'sessions' },
          { name: 'screenPageViews' },
          { name: 'averageSessionDuration' },
          { name: 'bounceRate' },
          { name: 'engagementRate' },
        ],
      }),

      // Device breakdown
      client.runReport({
        property: `properties/${propertyId}`,
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: 'deviceCategory' }],
        metrics: [{ name: 'activeUsers' }],
      }),

      // Browser breakdown
      client.runReport({
        property: `properties/${propertyId}`,
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: 'browser' }],
        metrics: [{ name: 'activeUsers' }],
        orderBys: [{ metric: { metricName: 'activeUsers' }, desc: true }],
        limit: 10,
      }),

      // Location breakdown
      client.runReport({
        property: `properties/${propertyId}`,
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: 'country' }, { name: 'city' }],
        metrics: [{ name: 'activeUsers' }],
        orderBys: [{ metric: { metricName: 'activeUsers' }, desc: true }],
        limit: 20,
      }),

      // Traffic sources
      client.runReport({
        property: `properties/${propertyId}`,
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: 'sessionSource' }, { name: 'sessionMedium' }],
        metrics: [{ name: 'activeUsers' }, { name: 'conversions' }],
        orderBys: [{ metric: { metricName: 'activeUsers' }, desc: true }],
        limit: 10,
      }),

      // Time series
      client.runReport({
        property: `properties/${propertyId}`,
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: 'date' }],
        metrics: [
          { name: 'activeUsers' },
          { name: 'sessions' },
          { name: 'screenPageViews' },
        ],
        orderBys: [{ dimension: { dimensionName: 'date' }, desc: false }],
      }),

      // Realtime data
      client.runRealtimeReport({
        property: `properties/${propertyId}`,
        metrics: [{ name: 'activeUsers' }],
      }).catch(() => null), // Realtime might not be available
    ])
      console.log('[GA4 Enriched] ✅ GA4 API call successful')
    } catch (gaError: any) {
      console.error('[GA4 Enriched] ❌ GA4 API failed:', {
        message: gaError.message,
        code: gaError.code,
        details: gaError.details
      })
      return NextResponse.json({
        error: `GA4 API error: ${gaError.message}`,
        unavailable: true
      }, { status: 503 })
    }

    // Parse summary
    const summaryRow = summaryReport[0].rows?.[0]
    const summary = {
      totalUsers: parseInt(summaryRow?.metricValues?.[0]?.value || '0'),
      newUsers: parseInt(summaryRow?.metricValues?.[1]?.value || '0'),
      activeUsers: parseInt(summaryRow?.metricValues?.[2]?.value || '0'),
      sessions: parseInt(summaryRow?.metricValues?.[3]?.value || '0'),
      pageViews: parseInt(summaryRow?.metricValues?.[4]?.value || '0'),
      averageSessionDuration: parseFloat(summaryRow?.metricValues?.[5]?.value || '0'),
      bounceRate: parseFloat(summaryRow?.metricValues?.[6]?.value || '0'),
      engagementRate: parseFloat(summaryRow?.metricValues?.[7]?.value || '0'),
    }

    // Parse devices
    const totalDeviceUsers = deviceReport[0].rows?.reduce(
      (sum, row) => sum + parseInt(row.metricValues?.[0]?.value || '0'),
      0
    ) || 1
    const devices = deviceReport[0].rows?.map(row => ({
      category: row.dimensionValues?.[0]?.value || 'unknown',
      users: parseInt(row.metricValues?.[0]?.value || '0'),
      percentage: (parseInt(row.metricValues?.[0]?.value || '0') / totalDeviceUsers) * 100,
    })) || []

    // Parse browsers
    const browsers = browserReport[0].rows?.map(row => ({
      name: row.dimensionValues?.[0]?.value || 'unknown',
      users: parseInt(row.metricValues?.[0]?.value || '0'),
      percentage: 0, // Can calculate if needed
    })) || []

    // Parse locations
    const locations = locationReport[0].rows?.map(row => ({
      country: row.dimensionValues?.[0]?.value || 'unknown',
      city: row.dimensionValues?.[1]?.value || 'unknown',
      users: parseInt(row.metricValues?.[0]?.value || '0'),
    })) || []

    // Parse sources
    const sources = sourceReport[0].rows?.map(row => ({
      source: row.dimensionValues?.[0]?.value || 'direct',
      medium: row.dimensionValues?.[1]?.value || 'none',
      users: parseInt(row.metricValues?.[0]?.value || '0'),
      conversions: parseInt(row.metricValues?.[1]?.value || '0'),
    })) || []

    // Parse time series
    const timeSeries = timeSeriesReport[0].rows?.map(row => ({
      date: row.dimensionValues?.[0]?.value || '',
      users: parseInt(row.metricValues?.[0]?.value || '0'),
      sessions: parseInt(row.metricValues?.[1]?.value || '0'),
      pageViews: parseInt(row.metricValues?.[2]?.value || '0'),
    })) || []

    // Parse realtime
    const realtime = realtimeReport?.[0] ? {
      activeUsers: parseInt(realtimeReport[0].rows?.[0]?.metricValues?.[0]?.value || '0'),
      topPages: [], // Would need separate realtime report for pages
    } : null

    const result = {
      summary,
      devices,
      browsers,
      locations,
      sources,
      timeSeries,
      realtime,
    }

    return NextResponse.json(result)

  } catch (error: any) {
    console.error('GA4 enriched API error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch GA4 data' },
      { status: 500 }
    )
  }
}

// Mock data for development
function getMockData() {
  return {
    summary: {
      totalUsers: 1247,
      newUsers: 823,
      activeUsers: 456,
      sessions: 1834,
      pageViews: 5672,
      averageSessionDuration: 185.3,
      bounceRate: 0.32,
      engagementRate: 0.68,
    },
    devices: [
      { category: 'mobile', users: 678, percentage: 54.4 },
      { category: 'desktop', users: 456, percentage: 36.6 },
      { category: 'tablet', users: 113, percentage: 9.0 },
    ],
    browsers: [
      { name: 'Chrome', users: 745, percentage: 59.7 },
      { name: 'Safari', users: 334, percentage: 26.8 },
      { name: 'Firefox', users: 89, percentage: 7.1 },
      { name: 'Edge', users: 56, percentage: 4.5 },
      { name: 'Other', users: 23, percentage: 1.9 },
    ],
    locations: [
      { country: 'Canada', city: 'Montreal', users: 456 },
      { country: 'Canada', city: 'Toronto', users: 334 },
      { country: 'Canada', city: 'Vancouver', users: 223 },
      { country: 'Canada', city: 'Quebec City', users: 134 },
      { country: 'Canada', city: 'Ottawa', users: 78 },
      { country: 'United States', city: 'New York', users: 22 },
    ],
    sources: [
      { source: 'google', medium: 'organic', users: 567, conversions: 34 },
      { source: 'direct', medium: 'none', users: 445, conversions: 28 },
      { source: 'facebook', medium: 'cpc', users: 123, conversions: 12 },
      { source: 'instagram', medium: 'social', users: 89, conversions: 8 },
      { source: 'linkedin', medium: 'social', users: 23, conversions: 3 },
    ],
    timeSeries: Array.from({ length: 7 }, (_, i) => {
      const date = new Date()
      date.setDate(date.getDate() - (6 - i))
      return {
        date: date.toISOString().split('T')[0],
        users: Math.floor(150 + Math.random() * 100),
        sessions: Math.floor(200 + Math.random() * 150),
        pageViews: Math.floor(600 + Math.random() * 400),
      }
    }),
    realtime: {
      activeUsers: 12,
      topPages: [
        { path: '/', views: 5 },
        { path: '/demande-de-pret-en-ligne-formulaire', views: 3 },
        { path: '/nous-joindre', views: 2 },
      ],
    },
  }
}
