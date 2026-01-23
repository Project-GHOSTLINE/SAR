/**
 * TELEMETRY BATCHER - Optimized Batch Writes to Supabase
 *
 * Reduces DB load by batching telemetry writes
 * Auto-flushes on: batch size threshold OR time interval
 */

import { createSupabaseServer } from '@/lib/supabase-server'

interface TelemetryRequest {
  trace_id: string
  parent_trace_id?: string
  method: string
  path: string
  status?: number
  duration_ms?: number
  source: string
  env: string
  ip_hash?: string
  ua_hash?: string
  region?: string
  user_id?: string
  role?: string
  error_code?: string
  error_message_redacted?: string
  bytes_in?: number
  bytes_out?: number
  db_call_count?: number
  db_total_ms?: number
  vercel_id?: string
  vercel_region?: string
  meta_redacted?: any
}

interface TelemetrySpan {
  trace_id: string
  parent_span_id?: string
  span_name: string
  span_type: string
  target: string
  start_time: string  // ISO timestamp
  duration_ms: number
  status: string
  operation?: string
  row_count?: number
  bytes_in?: number
  bytes_out?: number
  attempt_number?: number
  max_attempts?: number
  retry_reason?: string
  error_type?: string
  error_message_redacted?: string
  error_stack_trace?: string
  dns_ms?: number
  tls_ms?: number
  ttfb_ms?: number
  download_ms?: number
  meta_redacted?: any
}

interface TelemetrySecurity {
  trace_id: string
  check_name: string
  result: 'pass' | 'fail' | 'error' | 'skip'
  severity: 'low' | 'medium' | 'high' | 'critical'
  details_redacted?: any
  action_taken?: string
  blocked_reason?: string
  source?: string
  provider?: string
}

class TelemetryBatcher {
  private requestBatch: TelemetryRequest[] = []
  private spanBatch: TelemetrySpan[] = []
  private securityBatch: TelemetrySecurity[] = []

  private flushIntervalMs = 5000  // 5 seconds
  private maxBatchSize = 100
  private flushTimer: NodeJS.Timeout | null = null
  private isShuttingDown = false

  constructor() {
    // Start flush timer
    this.startFlushTimer()

    // Graceful shutdown
    if (typeof process !== 'undefined') {
      process.on('beforeExit', () => this.shutdown())
      process.on('SIGTERM', () => this.shutdown())
      process.on('SIGINT', () => this.shutdown())
    }
  }

  /**
   * Add request to batch
   */
  async addRequest(data: TelemetryRequest): Promise<void> {
    if (this.isShuttingDown) {
      // Skip writes during shutdown
      return
    }

    this.requestBatch.push(data)

    // Auto-flush if batch is full
    if (this.requestBatch.length >= this.maxBatchSize) {
      await this.flush()
    }
  }

  /**
   * Add span to batch
   */
  async addSpan(data: TelemetrySpan): Promise<void> {
    if (this.isShuttingDown) {
      return
    }

    this.spanBatch.push(data)

    // Auto-flush if batch is full
    if (this.spanBatch.length >= this.maxBatchSize) {
      await this.flush()
    }
  }

  /**
   * Add security check to batch
   */
  async addSecurity(data: TelemetrySecurity): Promise<void> {
    if (this.isShuttingDown) {
      return
    }

    this.securityBatch.push(data)

    // Auto-flush if batch is full
    if (this.securityBatch.length >= this.maxBatchSize) {
      await this.flush()
    }
  }

  /**
   * Flush all batches to Supabase
   */
  async flush(): Promise<void> {
    // Capture batches and clear immediately (prevent race conditions)
    const requests = [...this.requestBatch]
    const spans = [...this.spanBatch]
    const security = [...this.securityBatch]

    this.requestBatch = []
    this.spanBatch = []
    this.securityBatch = []

    if (requests.length === 0 && spans.length === 0 && security.length === 0) {
      // Nothing to flush
      return
    }

    try {
      const supabase = createSupabaseServer()

      // Parallel bulk inserts
      const promises = []

      if (requests.length > 0) {
        promises.push(
          supabase
            .from('telemetry_requests')
            .insert(requests)
            .then(({ error }) => {
              if (error) {
                console.error('[Telemetry] Failed to write requests:', error.message)
                // Re-add to batch for retry (optional)
                // this.requestBatch.push(...requests)
              } else {
                console.log(`[Telemetry] Wrote ${requests.length} requests`)
              }
            })
        )
      }

      if (spans.length > 0) {
        promises.push(
          supabase
            .from('telemetry_spans')
            .insert(spans)
            .then(({ error }) => {
              if (error) {
                console.error('[Telemetry] Failed to write spans:', error.message)
              } else {
                console.log(`[Telemetry] Wrote ${spans.length} spans`)
              }
            })
        )
      }

      if (security.length > 0) {
        promises.push(
          supabase
            .from('telemetry_security')
            .insert(security)
            .then(({ error }) => {
              if (error) {
                console.error('[Telemetry] Failed to write security checks:', error.message)
              } else {
                console.log(`[Telemetry] Wrote ${security.length} security checks`)
              }
            })
        )
      }

      await Promise.all(promises)
    } catch (err) {
      console.error('[Telemetry] Flush error:', err)
    }
  }

  /**
   * Start auto-flush timer
   */
  private startFlushTimer(): void {
    this.flushTimer = setInterval(() => {
      this.flush().catch(err => {
        console.error('[Telemetry] Timer flush error:', err)
      })
    }, this.flushIntervalMs)
  }

  /**
   * Stop flush timer
   */
  private stopFlushTimer(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer)
      this.flushTimer = null
    }
  }

  /**
   * Graceful shutdown - flush remaining data
   */
  async shutdown(): Promise<void> {
    if (this.isShuttingDown) {
      return
    }

    console.log('[Telemetry] Shutting down, flushing remaining data...')
    this.isShuttingDown = true

    this.stopFlushTimer()
    await this.flush()

    console.log('[Telemetry] Shutdown complete')
  }

  /**
   * Get batch stats (for debugging)
   */
  getStats(): {
    requestsQueued: number
    spansQueued: number
    securityQueued: number
  } {
    return {
      requestsQueued: this.requestBatch.length,
      spansQueued: this.spanBatch.length,
      securityQueued: this.securityBatch.length
    }
  }
}

// Singleton instance
let batcherInstance: TelemetryBatcher | null = null

/**
 * Get batcher singleton
 */
export function getBatcher(): TelemetryBatcher {
  if (!batcherInstance) {
    batcherInstance = new TelemetryBatcher()
  }
  return batcherInstance
}

/**
 * Public API: Write request telemetry
 */
export async function writeRequest(data: TelemetryRequest): Promise<void> {
  const batcher = getBatcher()
  await batcher.addRequest(data)
}

/**
 * Public API: Write span telemetry
 */
export async function writeSpan(data: TelemetrySpan): Promise<void> {
  const batcher = getBatcher()
  await batcher.addSpan(data)
}

/**
 * Public API: Write security check
 */
export async function writeSecurity(data: TelemetrySecurity): Promise<void> {
  const batcher = getBatcher()
  await batcher.addSecurity(data)
}

/**
 * Public API: Force flush (useful for critical operations)
 */
export async function flushTelemetry(): Promise<void> {
  const batcher = getBatcher()
  await batcher.flush()
}

/**
 * Public API: Get stats
 */
export function getTelemetryStats(): ReturnType<TelemetryBatcher['getStats']> {
  const batcher = getBatcher()
  return batcher.getStats()
}
