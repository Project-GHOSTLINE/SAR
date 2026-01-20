/**
 * Performance Instrumentation - PHASE 2
 *
 * Tracks:
 * - HTTP request duration (ms_total)
 * - Response size (bytes_out)
 * - Database calls count (db_calls)
 * - Database total time (db_ms_total)
 * - Request ID for tracing
 *
 * Usage in API route:
 * ```typescript
 * import { withPerf } from '@/lib/perf'
 *
 * export const GET = withPerf('admin/messages', async (request: NextRequest) => {
 *   const supabase = getSupabaseServer()
 *   const { data } = await supabase.from('messages').select('*')
 *   return NextResponse.json({ data })
 * })
 * ```
 *
 * Output: logs/perf.ndjson (newline-delimited JSON)
 */

import { NextRequest, NextResponse } from 'next/server'
import { AsyncLocalStorage } from 'async_hooks'
import fs from 'fs'
import path from 'path'

// ============================================================================
// Request Context Storage
// ============================================================================

export interface PerfContext {
  requestId: string
  route: string
  startTime: number
  dbCalls: number
  dbMsTotal: number
}

const perfStorage = new AsyncLocalStorage<PerfContext>()

/**
 * Get current request performance context
 */
export function getPerfContext(): PerfContext | undefined {
  return perfStorage.getStore()
}

/**
 * Increment database call counter
 */
export function trackDbCall(durationMs: number): void {
  const ctx = perfStorage.getStore()
  if (ctx) {
    ctx.dbCalls++
    ctx.dbMsTotal += durationMs
  }
}

// ============================================================================
// Performance Wrapper for API Routes
// ============================================================================

type NextHandler = (request: NextRequest) => Promise<NextResponse>

/**
 * Wraps API route handler with performance instrumentation
 *
 * @param routeName - Route identifier (e.g., "admin/messages")
 * @param handler - Next.js route handler
 * @returns Wrapped handler with perf logging
 */
export function withPerf(routeName: string, handler: NextHandler): NextHandler {
  return async (request: NextRequest) => {
    const requestId = generateRequestId()
    const startTime = Date.now()

    // Initialize performance context
    const ctx: PerfContext = {
      requestId,
      route: routeName,
      startTime,
      dbCalls: 0,
      dbMsTotal: 0
    }

    let response: NextResponse
    let status = 200
    let bytesOut = 0

    try {
      // Run handler within perf context
      response = await perfStorage.run(ctx, async () => {
        return await handler(request)
      })

      status = response.status

      // Calculate response size (approximate)
      const body = await response.clone().text()
      bytesOut = new TextEncoder().encode(body).length

    } catch (error) {
      status = 500
      bytesOut = 0

      // Re-throw error after logging
      logPerf({
        route: routeName,
        requestId,
        msTotal: Date.now() - startTime,
        status,
        bytesOut,
        dbCalls: ctx.dbCalls,
        dbMsTotal: ctx.dbMsTotal,
        error: error instanceof Error ? error.message : String(error)
      })

      throw error
    }

    // Log performance metrics
    logPerf({
      route: routeName,
      requestId,
      msTotal: Date.now() - startTime,
      status,
      bytesOut,
      dbCalls: ctx.dbCalls,
      dbMsTotal: ctx.dbMsTotal
    })

    return response
  }
}

// ============================================================================
// Logging
// ============================================================================

interface PerfLog {
  route: string
  requestId: string
  msTotal: number
  status: number
  bytesOut: number
  dbCalls: number
  dbMsTotal: number
  error?: string
  timestamp?: string
}

/**
 * Log performance metrics to logs/perf.ndjson
 */
function logPerf(metrics: PerfLog): void {
  const logEntry = {
    ...metrics,
    timestamp: new Date().toISOString()
  }

  // Console output (development)
  if (process.env.NODE_ENV === 'development') {
    const color = metrics.msTotal > 200 ? '\x1b[31m' : metrics.msTotal > 100 ? '\x1b[33m' : '\x1b[32m'
    const reset = '\x1b[0m'

    console.log(
      `${color}[PERF]${reset} ${metrics.route} | ` +
      `${metrics.msTotal}ms | ` +
      `${metrics.dbCalls} DB calls (${metrics.dbMsTotal}ms) | ` +
      `${(metrics.bytesOut / 1024).toFixed(1)}KB | ` +
      `status=${metrics.status}`
    )
  }

  // File output (always)
  try {
    const logsDir = path.join(process.cwd(), 'logs')
    const logFile = path.join(logsDir, 'perf.ndjson')

    // Ensure logs directory exists
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true })
    }

    // Append log entry as newline-delimited JSON
    fs.appendFileSync(logFile, JSON.stringify(logEntry) + '\n', 'utf-8')
  } catch (error) {
    console.error('[PERF] Failed to write log:', error)
  }
}

// ============================================================================
// Utilities
// ============================================================================

/**
 * Generate unique request ID
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}

/**
 * Format bytes to human-readable string
 */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
}

/**
 * Analyze perf logs and generate summary
 *
 * Usage:
 * ```typescript
 * import { analyzePerfLogs } from '@/lib/perf'
 *
 * const summary = analyzePerfLogs()
 * console.log(summary)
 * ```
 */
export function analyzePerfLogs(): string {
  try {
    const logFile = path.join(process.cwd(), 'logs', 'perf.ndjson')

    if (!fs.existsSync(logFile)) {
      return 'No performance logs found'
    }

    const logs = fs.readFileSync(logFile, 'utf-8')
      .split('\n')
      .filter(line => line.trim())
      .map(line => JSON.parse(line) as PerfLog)

    // Group by route
    const byRoute = new Map<string, PerfLog[]>()
    logs.forEach(log => {
      const route = log.route
      if (!byRoute.has(route)) {
        byRoute.set(route, [])
      }
      byRoute.get(route)!.push(log)
    })

    // Calculate stats per route
    let summary = '\n=== PERFORMANCE SUMMARY ===\n\n'

    byRoute.forEach((logs, route) => {
      const times = logs.map(l => l.msTotal).sort((a, b) => a - b)
      const p50 = percentile(times, 50)
      const p95 = percentile(times, 95)
      const p99 = percentile(times, 99)
      const avgDbCalls = Math.round(logs.reduce((sum, l) => sum + l.dbCalls, 0) / logs.length)
      const avgPayload = Math.round(logs.reduce((sum, l) => sum + l.bytesOut, 0) / logs.length)

      const p95Status = p95 > 200 ? '❌' : p95 > 100 ? '⚠️' : '✅'
      const p99Status = p99 > 400 ? '❌' : p99 > 200 ? '⚠️' : '✅'

      summary += `${route} (${logs.length} requests)\n`
      summary += `  p50: ${p50}ms | p95: ${p95}ms ${p95Status} | p99: ${p99}ms ${p99Status}\n`
      summary += `  DB calls: ${avgDbCalls} avg | Payload: ${formatBytes(avgPayload)}\n\n`
    })

    return summary
  } catch (error) {
    return `Error analyzing logs: ${error}`
  }
}

/**
 * Calculate percentile from sorted array
 */
function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0
  const index = Math.ceil((sorted.length * p) / 100) - 1
  return sorted[Math.max(0, index)]
}
