/**
 * TELEMETRY CONTEXT - AsyncLocalStorage for Trace Propagation
 *
 * Provides trace_id and context propagation across async boundaries
 * Integrates with existing PerfContext from src/lib/perf.ts
 */

import { AsyncLocalStorage } from 'async_hooks'
import { randomUUID } from 'crypto'

export interface TraceContext {
  // Core tracing
  traceId: string               // UUID v4 for distributed tracing
  requestId: string             // Compat with existing perf.ts
  parentTraceId?: string        // For nested requests

  // Request metadata
  method: string                // GET, POST, etc.
  path: string                  // /api/admin/messages
  startTime: number             // performance.now()

  // Source classification
  source: 'web' | 'webhook' | 'cron' | 'internal'
  env: 'production' | 'development' | 'preview'

  // Client context (anonymized)
  ipHash?: string               // SHA256(IP + salt)
  uaHash?: string               // SHA256(UA + salt)
  region?: string               // Vercel region (iad1, sfo1, etc.)

  // Auth context (if authenticated)
  userId?: string
  role?: 'admin' | 'user' | 'anonymous'
  isAdmin?: boolean

  // Performance counters (mutable)
  dbCallCount: number
  dbTotalMs: number
  spanCount: number

  // Vercel integration
  vercelId?: string             // Vercel request ID
  vercelRegion?: string         // Vercel edge region

  // GA4 integration
  ga4SessionId?: string         // Google Analytics session
  ga4ClientId?: string          // GA4 client ID

  // Web Vitals (if from client)
  webVitals?: {
    cls?: number                // Cumulative Layout Shift
    fid?: number                // First Input Delay
    lcp?: number                // Largest Contentful Paint
    fcp?: number                // First Contentful Paint
    ttfb?: number               // Time to First Byte
  }
}

// AsyncLocalStorage instance (singleton)
const traceContextStorage = new AsyncLocalStorage<TraceContext>()

/**
 * Get current trace context
 */
export function getTraceContext(): TraceContext | undefined {
  return traceContextStorage.getStore()
}

/**
 * Get trace ID or generate new one
 */
export function getOrCreateTraceId(): string {
  const ctx = getTraceContext()
  return ctx?.traceId || randomUUID()
}

/**
 * Create new trace context
 */
export function createTraceContext(options: {
  method: string
  path: string
  source?: TraceContext['source']
  env?: TraceContext['env']
  parentTraceId?: string
  userId?: string
  role?: TraceContext['role']
  ipHash?: string
  uaHash?: string
  region?: string
  vercelId?: string
  vercelRegion?: string
}): TraceContext {
  const traceId = randomUUID()
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`

  return {
    traceId,
    requestId,
    parentTraceId: options.parentTraceId,
    method: options.method,
    path: options.path,
    startTime: performance.now(),
    source: options.source || 'web',
    env: (process.env.NODE_ENV === 'production'
      ? 'production'
      : process.env.VERCEL_ENV === 'preview'
        ? 'preview'
        : 'development') as TraceContext['env'],
    ipHash: options.ipHash,
    uaHash: options.uaHash,
    region: options.region,
    userId: options.userId,
    role: options.role || 'anonymous',
    isAdmin: options.role === 'admin',
    dbCallCount: 0,
    dbTotalMs: 0,
    spanCount: 0,
    vercelId: options.vercelId,
    vercelRegion: options.vercelRegion
  }
}

/**
 * Run function with trace context
 */
export function runWithTraceContext<T>(
  context: TraceContext,
  fn: () => T
): T {
  return traceContextStorage.run(context, fn)
}

/**
 * Update current trace context (mutate counters)
 */
export function updateTraceContext(updates: Partial<TraceContext>): void {
  const ctx = getTraceContext()
  if (ctx) {
    Object.assign(ctx, updates)
  }
}

/**
 * Increment DB call counter
 */
export function incrementDbCall(durationMs: number): void {
  const ctx = getTraceContext()
  if (ctx) {
    ctx.dbCallCount++
    ctx.dbTotalMs += durationMs
  }
}

/**
 * Increment span counter
 */
export function incrementSpanCount(): void {
  const ctx = getTraceContext()
  if (ctx) {
    ctx.spanCount++
  }
}

/**
 * Hash value with salt (for IP/UA anonymization)
 */
export function hashWithSalt(value: string): string {
  const crypto = require('crypto')
  const salt = process.env.TELEMETRY_HASH_SALT || 'sar-telemetry-2026'
  return crypto
    .createHash('sha256')
    .update(value + salt)
    .digest('hex')
    .substring(0, 16) // 16 chars = 64 bits entropy
}

/**
 * Extract metadata from Request object
 */
export function extractRequestMetadata(req: Request): {
  ipHash?: string
  uaHash?: string
  vercelId?: string
  vercelRegion?: string
} {
  const headers = req.headers

  // IP (Vercel forwards real IP)
  const ip = headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || headers.get('x-real-ip')

  // User-Agent
  const ua = headers.get('user-agent')

  // Vercel specific headers
  const vercelId = headers.get('x-vercel-id') || undefined
  const vercelRegion = headers.get('x-vercel-deployment-url')?.split('.')[0] || undefined

  return {
    ipHash: ip ? hashWithSalt(ip) : undefined,
    uaHash: ua ? hashWithSalt(ua) : undefined,
    vercelId,
    vercelRegion
  }
}

/**
 * Check if we're in a trace context
 */
export function isInTraceContext(): boolean {
  return getTraceContext() !== undefined
}

/**
 * Get trace ID for logging (safe - returns 'no-trace' if not in context)
 */
export function getTraceIdSafe(): string {
  return getTraceContext()?.traceId || 'no-trace'
}

/**
 * Integration with existing PerfContext from src/lib/perf.ts
 * Returns compatible object for backward compatibility
 */
export function getTelemetryPerfContext(): {
  requestId: string
  route: string
  dbCalls: number
  dbMsTotal: number
} | null {
  const ctx = getTraceContext()
  if (!ctx) return null

  return {
    requestId: ctx.requestId,
    route: ctx.path,
    dbCalls: ctx.dbCallCount,
    dbMsTotal: ctx.dbTotalMs
  }
}
