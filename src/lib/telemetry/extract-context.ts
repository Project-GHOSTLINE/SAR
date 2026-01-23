/**
 * EXTRACT TELEMETRY CONTEXT FROM MIDDLEWARE
 *
 * Extracts trace context from middleware headers
 * Initializes TraceContext for API routes
 */

import { headers } from 'next/headers'
import { createTraceContext, type TraceContext } from './context'

/**
 * Extract telemetry context from request headers (set by middleware)
 * Returns null if not found or invalid
 */
export async function extractTelemetryContextFromHeaders(): Promise<Partial<TraceContext> | null> {
  try {
    const headersList = await headers()
    const contextHeader = headersList.get('x-telemetry-context')

    if (!contextHeader) {
      return null
    }

    // Decode from base64
    const contextJson = Buffer.from(contextHeader, 'base64').toString('utf-8')
    const context = JSON.parse(contextJson)

    return {
      traceId: context.traceId,
      method: context.method,
      path: context.path,
      ipHash: context.ipHash,
      uaHash: context.uaHash,
      vercelId: context.vercelId,
      vercelRegion: context.vercelRegion,
      role: context.role,
      userId: context.userId
    }
  } catch (err) {
    console.error('[Telemetry] Failed to extract context from headers:', err)
    return null
  }
}

/**
 * Initialize trace context from middleware headers
 * Creates a full TraceContext object ready to use
 */
export async function initTraceContextFromMiddleware(): Promise<TraceContext | null> {
  const middlewareContext = await extractTelemetryContextFromHeaders()

  if (!middlewareContext) {
    return null
  }

  // Create full trace context
  return createTraceContext({
    method: middlewareContext.method || 'GET',
    path: middlewareContext.path || '/',
    source: middlewareContext.path?.startsWith('/api/webhooks/') ? 'webhook'
      : middlewareContext.path?.startsWith('/api/cron/') ? 'cron'
      : 'web',
    userId: middlewareContext.userId,
    role: middlewareContext.role,
    ipHash: middlewareContext.ipHash,
    uaHash: middlewareContext.uaHash,
    vercelId: middlewareContext.vercelId,
    vercelRegion: middlewareContext.vercelRegion
  })
}

/**
 * Get trace ID from headers (quick accessor)
 */
export async function getTraceIdFromHeaders(): Promise<string | null> {
  try {
    const headersList = await headers()
    return headersList.get('x-trace-id')
  } catch {
    return null
  }
}
