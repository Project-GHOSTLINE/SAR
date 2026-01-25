/**
 * EXEMPLE D'INSTRUMENTATION TÉLÉMÉTRIE
 * 
 * Ce fichier montre comment instrumenter la route /api/admin/analytics
 * avec de la télémétrie complète.
 * 
 * Comparez avec: src/app/api/admin/analytics/route.ts
 */

import { NextRequest, NextResponse } from 'next/server'
import { BetaAnalyticsDataClient } from '@google-analytics/data'
import { telemetry } from '@/lib/telemetry'  // ← Import telemetry
import type { AnalyticsResponse, AnalyticsRow } from '@/types/analytics'

export const dynamic = 'force-dynamic'

function isAuthenticated(request: NextRequest): boolean {
  const token = request.cookies.get('admin-session')?.value
  const apiKey = request.headers.get('x-api-key')
  return !!token || apiKey === process.env.ADMIN_PASSWORD
}

function getAnalyticsClient() {
  const propertyId = process.env.GA_PROPERTY_ID?.trim()
  if (!propertyId) throw new Error('GA_PROPERTY_ID non configuré')

  if (process.env.GA_SERVICE_ACCOUNT_JSON) {
    try {
      const credentials = JSON.parse(process.env.GA_SERVICE_ACCOUNT_JSON)
      return new BetaAnalyticsDataClient({ credentials })
    } catch (error) {
      console.error('Erreur parsing GA_SERVICE_ACCOUNT_JSON:', error)
      throw new Error('Credentials Google Analytics invalides')
    }
  }

  return null
}

export async function GET(request: NextRequest) {
  // ========================================================================
  // NOUVEAU: Le middleware a déjà créé un trace_id et loggé la requête
  // On peut le récupérer depuis les headers si besoin
  // ========================================================================
  const telemetryHeader = request.headers.get('x-telemetry-context')
  let traceId = telemetry.generateTraceId()
  
  if (telemetryHeader) {
    try {
      const context = JSON.parse(Buffer.from(telemetryHeader, 'base64').toString())
      traceId = context.traceId
      telemetry.setTraceId(traceId)
    } catch {
      // Ignore si header invalide
    }
  }

  try {
    // Vérifier authentification
    if (!isAuthenticated(request)) {
      // ========================================================================
      // NOUVEAU: Logger le security check
      // ========================================================================
      await telemetry.logSecurityCheck({
        check_name: 'authentication',
        result: 'fail',
        severity: 'medium',
        source: 'api',
        provider: 'internal',
        action_taken: 'blocked',
        blocked_reason: 'No valid session or API key'
      })

      return NextResponse.json(
        { success: false, error: 'Non autorisé' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate') || '7daysAgo'
    const endDate = searchParams.get('endDate') || 'today'

    const defaultDimensions = [
      { name: 'deviceCategory' },
      { name: 'operatingSystem' },
      { name: 'browser' },
      { name: 'country' },
      { name: 'city' },
      { name: 'sessionSource' },
      { name: 'sessionMedium' },
      { name: 'sessionCampaignName' },
      { name: 'date' }
    ]

    const defaultMetrics = [
      { name: 'activeUsers' },
      { name: 'newUsers' },
      { name: 'totalUsers' },
      { name: 'sessions' },
      { name: 'screenPageViews' },
      { name: 'averageSessionDuration' },
      { name: 'bounceRate' },
      { name: 'engagementRate' },
      { name: 'conversions' },
      { name: 'totalRevenue' }
    ]

    const analyticsClient = getAnalyticsClient()

    if (!analyticsClient) {
      return NextResponse.json({ success: false, error: 'Client GA4 non configuré' })
    }

    const propertyId = process.env.GA_PROPERTY_ID?.trim()!

    // ========================================================================
    // NOUVEAU: Wrapper l'appel GA4 avec telemetry.measureExternalAPI()
    // ========================================================================
    const response = await telemetry.measureExternalAPI(
      'Google Analytics',           // Provider
      'runReport',                   // Endpoint/Operation
      async () => {
        const [response] = await analyticsClient.runReport({
          property: `properties/${propertyId}`,
          dateRanges: [{ startDate, endDate }],
          dimensions: defaultDimensions,
          metrics: defaultMetrics,
          limit: 1000
        })
        return response
      }
    )

    // LE SPAN EST AUTOMATIQUEMENT LOGGÉ AVEC:
    // - span_name: 'external_api'
    // - span_type: 'external'
    // - target: 'Google Analytics'
    // - operation: 'runReport'
    // - duration_ms: temps réel de l'appel
    // - status: 'success' ou 'error'
    // - error_message_redacted: si erreur (PII removed)

    // ========================================================================
    // NOUVEAU: Tracker la transformation de données
    // ========================================================================
    const data = await telemetry.measureSpan(
      'transform_ga4_data',          // Span name
      'internal',                     // Type
      'data-transformer',             // Target
      'map_rows',                     // Operation
      async () => {
        return response.rows?.map(row => {
          const dimensionValues = row.dimensionValues || []
          const metricValues = row.metricValues || []

          return {
            device: {
              category: dimensionValues[0]?.value || 'unknown',
              os: dimensionValues[1]?.value || 'unknown',
              browser: dimensionValues[2]?.value || 'unknown',
              platform: 'web'
            },
            location: {
              country: dimensionValues[3]?.value || 'unknown',
              city: dimensionValues[4]?.value || 'unknown'
            },
            source: {
              source: dimensionValues[5]?.value || 'direct',
              medium: dimensionValues[6]?.value || 'none',
              campaign: dimensionValues[7]?.value || '(not set)'
            },
            metrics: {
              activeUsers: parseInt(metricValues[0]?.value || '0'),
              newUsers: parseInt(metricValues[1]?.value || '0'),
              totalUsers: parseInt(metricValues[2]?.value || '0'),
              sessions: parseInt(metricValues[3]?.value || '0'),
              pageViews: parseInt(metricValues[4]?.value || '0'),
              avgSessionDuration: parseFloat(metricValues[5]?.value || '0'),
              bounceRate: parseFloat(metricValues[6]?.value || '0'),
              engagementRate: parseFloat(metricValues[7]?.value || '0'),
              conversions: parseInt(metricValues[8]?.value || '0'),
              revenue: parseFloat(metricValues[9]?.value || '0')
            },
            date: dimensionValues[8]?.value || ''
          }
        }) || []
      }
    )

    // LE SPAN EST LOGGÉ AVEC:
    // - span_name: 'transform_ga4_data'
    // - span_type: 'internal'
    // - target: 'data-transformer'
    // - operation: 'map_rows'
    // - duration_ms: temps de transformation
    // - status: 'success'

    // ========================================================================
    // RÉSULTAT FINAL DANS COMMAND CENTER:
    // ========================================================================
    // 1 REQUEST (middleware):
    //   - method: GET
    //   - path: /api/admin/analytics
    //   - duration: 450ms total
    //   - status: 200
    //   - ip_hash: a1b2c3d4...
    //
    // 2 SPANS:
    //   1. external_api → Google Analytics (runReport) - 420ms
    //   2. transform_ga4_data → data-transformer (map_rows) - 25ms
    //
    // Total breakdown visible in "Request Flow" view!

    const summary = {
      totalUsers: data.reduce((sum, row) => sum + row.metrics.totalUsers, 0),
      totalSessions: data.reduce((sum, row) => sum + row.metrics.sessions, 0),
      totalPageViews: data.reduce((sum, row) => sum + row.metrics.pageViews, 0),
      avgSessionDuration: data.length > 0 
        ? data.reduce((sum, row) => sum + row.metrics.avgSessionDuration, 0) / data.length 
        : 0
    }

    const analyticsResponse: AnalyticsResponse = {
      success: true,
      data,
      summary,
      period: { startDate, endDate },
      metadata: {
        rowCount: data.length,
        dimensions: defaultDimensions.map(d => d.name),
        metrics: defaultMetrics.map(m => m.name)
      }
    }

    return NextResponse.json(analyticsResponse)

  } catch (error) {
    console.error('[analytics] Erreur:', error)

    // ========================================================================
    // NOUVEAU: Logger l'erreur dans telemetry
    // ========================================================================
    await telemetry.logSpan({
      span_name: 'analytics_error',
      span_type: 'internal',
      target: 'error-handler',
      operation: 'catch',
      start_time: new Date().toISOString(),
      duration_ms: 0,
      status: 'error',
      error_type: error instanceof Error ? error.constructor.name : 'UnknownError',
      error_message_redacted: error instanceof Error 
        ? telemetry.redactErrorMessage(error.message)
        : 'Unknown error',
      error_stack_trace: error instanceof Error ? error.stack : undefined
    })

    return NextResponse.json(
      { success: false, error: 'Erreur lors de la récupération des données' },
      { status: 500 }
    )
  } finally {
    // ========================================================================
    // NOUVEAU: Nettoyer le contexte de trace
    // ========================================================================
    telemetry.clearTraceId()
  }
}

// ============================================================================
// AVANTAGES DE L'INSTRUMENTATION:
// ============================================================================
//
// 1. VISIBILITÉ COMPLÈTE
//    - Voir exactement combien de temps prend chaque étape
//    - Identifier les goulots d'étranglement (ex: GA4 API = 420ms/450ms)
//    - Tracker les erreurs avec stack traces
//
// 2. DEBUGGING FACILITÉ
//    - Trace ID unique par requête
//    - Voir le flow complet: Request → GA4 → Transform → Response
//    - Logs structurés dans Command Center
//
// 3. MONITORING PRODUCTION
//    - Alertes si latence > seuil
//    - Tracking error rate par endpoint
//    - Performance trends over time
//
// 4. AUCUN IMPACT PERFORMANCE
//    - Overhead < 1ms par span
//    - Writes async (fire-and-forget)
//    - Non-blocking
//
// ============================================================================
// VISUALISATION DANS COMMAND CENTER:
// ============================================================================
//
// Mode "Request Flow":
// ┌─────────────────────────────────────────────────┐
// │ GET /api/admin/analytics                        │
// │ Status: 200 | Duration: 450ms                   │
// │                                                  │
// │ Flow:                                            │
// │ 1. Client → API ..................... 5ms        │
// │ 2. API → Google Analytics ........... 420ms ★   │
// │ 3. API → Data Transformer ........... 25ms       │
// │ 4. API → Response ................... 0ms        │
// │                                                  │
// │ Total: 450ms                                     │
// │ Bottleneck: Google Analytics (93%)               │
// └─────────────────────────────────────────────────┘
//
// Mode "Tracing":
// Trace ID: 1737854321-a1b2c3
// │
// ├─ Request: GET /api/admin/analytics (450ms)
// │  ├─ Span: external_api → Google Analytics (420ms)
// │  └─ Span: transform_ga4_data → data-transformer (25ms)
//
// Mode "Data Flow":
// Real-time chart showing:
// - Requests per minute
// - Average latency trend (450ms)
// - Error rate (0%)
//
// ============================================================================

