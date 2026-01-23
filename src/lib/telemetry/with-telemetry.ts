/**
 * WITH_TELEMETRY - API Route Wrapper
 *
 * Wraps Next.js API routes to automatically capture telemetry
 * Compatible with existing withPerf() wrapper
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  getTraceContext,
  getOrCreateTraceId,
  updateTraceContext,
  incrementSpanCount
} from './context'
import {
  writeRequest,
  writeSpan
} from './batcher'
import {
  redactErrorMessage,
  redactStackTrace,
  createSafeMetadata,
  getStatusCategory,
  classifySource,
  extractRoutePattern,
  isTelemetryEnabled
} from './index'

export interface TelemetryOptions {
  /**
   * Custom span name (default: inferred from path)
   */
  spanName?: string

  /**
   * Capture request body (default: false for privacy)
   */
  captureBody?: boolean

  /**
   * Keys to redact from metadata
   */
  redactKeys?: string[]

  /**
   * Skip telemetry for this route (default: false)
   */
  skip?: boolean

  /**
   * Custom metadata to attach
   */
  metadata?: Record<string, any>
}

/**
 * Wrapper for API routes (Next.js App Router)
 *
 * Usage:
 *   export const GET = withTelemetry(async (req) => {...})
 *   export const POST = withTelemetry(async (req) => {...}, { captureBody: true })
 */
export function withTelemetry<T extends (req: NextRequest) => Promise<Response>>(
  handler: T,
  options: TelemetryOptions = {}
): T {
  return (async (req: NextRequest) => {
    // Skip if telemetry disabled or explicitly skipped
    if (!isTelemetryEnabled() || options.skip) {
      return handler(req)
    }

    const startTime = performance.now()
    const ctx = getTraceContext()

    // Get or create trace context
    const traceId = ctx?.traceId || getOrCreateTraceId()
    const method = req.method
    const path = new URL(req.url).pathname
    const source = classifySource(path)

    let response: Response
    let status: number
    let error: Error | null = null
    let bytesIn: number | undefined
    let bytesOut: number | undefined

    try {
      // Measure request body size
      if (options.captureBody && method !== 'GET' && method !== 'HEAD') {
        try {
          const clone = req.clone()
          const body = await clone.text()
          bytesIn = Buffer.byteLength(body, 'utf8')
        } catch {
          // Ignore body capture errors
        }
      }

      // Call handler
      response = await handler(req)
      status = response.status

      // Measure response body size
      try {
        const clone = response.clone()
        const body = await clone.text()
        bytesOut = Buffer.byteLength(body, 'utf8')
      } catch {
        // Ignore body measurement errors
      }

      return response
    } catch (err) {
      error = err as Error
      status = 500
      throw err  // Re-throw after capturing
    } finally {
      const durationMs = Math.round(performance.now() - startTime)

      // Write request telemetry (async, non-blocking)
      writeRequest({
        trace_id: traceId,
        parent_trace_id: ctx?.parentTraceId,
        method,
        path: extractRoutePattern(path),
        status,
        duration_ms: durationMs,
        source,
        env: ctx?.env || (process.env.NODE_ENV === 'production' ? 'production' : 'development'),
        ip_hash: ctx?.ipHash,
        ua_hash: ctx?.uaHash,
        region: ctx?.region,
        user_id: ctx?.userId,
        role: ctx?.role,
        error_code: error ? 'HANDLER_ERROR' : undefined,
        error_message_redacted: error ? redactErrorMessage(error) : undefined,
        bytes_in: bytesIn,
        bytes_out: bytesOut,
        db_call_count: ctx?.dbCallCount || 0,
        db_total_ms: ctx?.dbTotalMs || 0,
        vercel_id: ctx?.vercelId,
        vercel_region: ctx?.vercelRegion,
        meta_redacted: options.metadata ? createSafeMetadata(options.metadata) : undefined
      }).catch(err => {
        console.error('[Telemetry] Failed to write request:', err)
      })

      // Write span for handler execution
      writeSpan({
        trace_id: traceId,
        span_name: options.spanName || `${method} ${path}`,
        span_type: 'internal',
        target: path,
        start_time: new Date(Date.now() - durationMs).toISOString(),
        duration_ms: durationMs,
        status: error ? 'error' : status >= 400 ? 'error' : 'success',
        operation: method,
        bytes_in: bytesIn,
        bytes_out: bytesOut,
        error_type: error?.name,
        error_message_redacted: error ? redactErrorMessage(error) : undefined,
        error_stack_trace: error ? redactStackTrace(error) : undefined,
        meta_redacted: createSafeMetadata({
          route_pattern: extractRoutePattern(path),
          status_category: getStatusCategory(status)
        })
      }).catch(err => {
        console.error('[Telemetry] Failed to write span:', err)
      })

      // Increment span counter in context
      if (ctx) {
        incrementSpanCount()
      }
    }
  }) as T
}

/**
 * Track database operation (to be called from DB client)
 */
export async function trackDbOperation<T>(
  operation: string,
  table: string,
  fn: () => Promise<T>
): Promise<T> {
  if (!isTelemetryEnabled()) {
    return fn()
  }

  const ctx = getTraceContext()
  if (!ctx) {
    // Not in telemetry context - just execute
    return fn()
  }

  const startTime = performance.now()
  let result: T
  let error: Error | null = null
  let rowCount: number | undefined

  try {
    result = await fn()

    // Try to extract row count (if result is array or has count property)
    if (Array.isArray(result)) {
      rowCount = result.length
    } else if (result && typeof result === 'object' && 'count' in result) {
      rowCount = (result as any).count
    }

    return result
  } catch (err) {
    error = err as Error
    throw err
  } finally {
    const durationMs = Math.round(performance.now() - startTime)

    // Update context counters
    updateTraceContext({
      dbCallCount: ctx.dbCallCount + 1,
      dbTotalMs: ctx.dbTotalMs + durationMs
    })

    // Write span
    writeSpan({
      trace_id: ctx.traceId,
      span_name: `db_${operation}`,
      span_type: 'db',
      target: table,
      start_time: new Date(Date.now() - durationMs).toISOString(),
      duration_ms: durationMs,
      status: error ? 'error' : 'success',
      operation,
      row_count: rowCount,
      error_type: error?.name,
      error_message_redacted: error ? redactErrorMessage(error) : undefined,
      meta_redacted: createSafeMetadata({
        table
      })
    }).catch(err => {
      console.error('[Telemetry] Failed to write DB span:', err)
    })

    incrementSpanCount()
  }
}

/**
 * Track cache operation
 */
export async function trackCacheOperation<T>(
  operation: 'get' | 'set' | 'delete',
  key: string,
  fn: () => Promise<T>
): Promise<T> {
  if (!isTelemetryEnabled()) {
    return fn()
  }

  const ctx = getTraceContext()
  if (!ctx) {
    return fn()
  }

  const startTime = performance.now()
  let result: T
  let error: Error | null = null
  let status: 'hit' | 'miss' | 'success' | 'error' = 'success'

  try {
    result = await fn()

    // Determine if cache hit/miss (convention: undefined = miss)
    if (operation === 'get' && result === undefined) {
      status = 'miss'
    } else if (operation === 'get') {
      status = 'hit'
    }

    return result
  } catch (err) {
    error = err as Error
    status = 'error'
    throw err
  } finally {
    const durationMs = Math.round(performance.now() - startTime)

    writeSpan({
      trace_id: ctx.traceId,
      span_name: `cache_${operation}`,
      span_type: 'cache',
      target: key,
      start_time: new Date(Date.now() - durationMs).toISOString(),
      duration_ms: durationMs,
      status,
      operation,
      error_type: error?.name,
      error_message_redacted: error ? redactErrorMessage(error) : undefined,
      meta_redacted: createSafeMetadata({
        cache_key: key,
        cache_status: status
      })
    }).catch(err => {
      console.error('[Telemetry] Failed to write cache span:', err)
    })

    incrementSpanCount()
  }
}

/**
 * Generic span tracker (for custom operations)
 */
export async function trackSpan<T>(
  spanName: string,
  spanType: 'internal' | 'external' | 'db' | 'cache' | 'webhook',
  target: string,
  fn: () => Promise<T>,
  metadata?: Record<string, any>
): Promise<T> {
  if (!isTelemetryEnabled()) {
    return fn()
  }

  const ctx = getTraceContext()
  if (!ctx) {
    return fn()
  }

  const startTime = performance.now()
  let result: T
  let error: Error | null = null

  try {
    result = await fn()
    return result
  } catch (err) {
    error = err as Error
    throw err
  } finally {
    const durationMs = Math.round(performance.now() - startTime)

    writeSpan({
      trace_id: ctx.traceId,
      span_name: spanName,
      span_type: spanType,
      target,
      start_time: new Date(Date.now() - durationMs).toISOString(),
      duration_ms: durationMs,
      status: error ? 'error' : 'success',
      error_type: error?.name,
      error_message_redacted: error ? redactErrorMessage(error) : undefined,
      error_stack_trace: error ? redactStackTrace(error) : undefined,
      meta_redacted: metadata ? createSafeMetadata(metadata) : undefined
    }).catch(err => {
      console.error('[Telemetry] Failed to write span:', err)
    })

    incrementSpanCount()
  }
}
