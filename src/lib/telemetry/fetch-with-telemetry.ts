/**
 * FETCH_WITH_TELEMETRY - External API Wrapper
 *
 * Universal fetch wrapper with:
 * - Automatic retry logic
 * - Timeout handling
 * - Performance metrics (DNS, TLS, TTFB)
 * - Telemetry tracking
 * - Provider classification
 */

import { getTraceContext, incrementSpanCount } from './context'
import { writeSpan } from './batcher'
import {
  redactErrorMessage,
  createSafeMetadata,
  extractProvider,
  isRetryableError,
  isTelemetryEnabled
} from './index'

export interface FetchTelemetryOptions extends RequestInit {
  /**
   * Provider name ('vopay', 'quickbooks', 'resend', etc.)
   * Auto-detected from URL if not provided
   */
  provider?: string

  /**
   * Retry configuration
   */
  retry?: {
    maxAttempts?: number      // Default: 3
    initialDelayMs?: number   // Default: 1000
    maxDelayMs?: number       // Default: 10000
    backoffMultiplier?: number // Default: 2
    retryOn?: number[]        // HTTP status codes to retry on
  }

  /**
   * Timeout in milliseconds
   * Default: 30000 (30 seconds)
   */
  timeoutMs?: number

  /**
   * Custom metadata to attach to span
   */
  metadata?: Record<string, any>

  /**
   * Redact request/response from metadata
   */
  redactPayload?: boolean  // Default: true
}

interface RetryConfig {
  maxAttempts: number
  initialDelayMs: number
  maxDelayMs: number
  backoffMultiplier: number
  retryOn: number[]
}

/**
 * Universal fetch wrapper with telemetry
 *
 * Usage:
 *   const res = await fetchWithTelemetry('https://api.vopay.com/balance', {
 *     provider: 'vopay',
 *     method: 'GET',
 *     headers: {...},
 *     retry: { maxAttempts: 3 },
 *     timeoutMs: 10000
 *   })
 */
export async function fetchWithTelemetry(
  url: string,
  options: FetchTelemetryOptions = {}
): Promise<Response> {
  const ctx = getTraceContext()

  // Extract options
  const {
    provider: providerOption,
    retry: retryOptions,
    timeoutMs = 30000,
    metadata,
    redactPayload = true,
    ...fetchOptions
  } = options

  // Auto-detect provider from URL
  const provider = providerOption || extractProvider(url)

  // Retry config
  const retryConfig: RetryConfig = {
    maxAttempts: retryOptions?.maxAttempts || 3,
    initialDelayMs: retryOptions?.initialDelayMs || 1000,
    maxDelayMs: retryOptions?.maxDelayMs || 10000,
    backoffMultiplier: retryOptions?.backoffMultiplier || 2,
    retryOn: retryOptions?.retryOn || [429, 502, 503, 504]
  }

  // Attempt counter
  let attempt = 0
  let lastError: Error | null = null
  let response: Response | null = null

  // Timing metrics
  let dnsMs: number | undefined
  let tlsMs: number | undefined
  let ttfbMs: number | undefined
  let downloadMs: number | undefined
  let totalMs: number = 0

  const overallStart = performance.now()

  while (attempt < retryConfig.maxAttempts) {
    attempt++

    try {
      // Create abort controller for timeout
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

      const attemptStart = performance.now()

      // Execute fetch
      response = await fetch(url, {
        ...fetchOptions,
        signal: controller.signal,
        headers: {
          ...fetchOptions.headers,
          // Propagate trace ID
          'x-trace-id': ctx?.traceId || 'unknown'
        }
      })

      clearTimeout(timeoutId)

      const attemptDuration = Math.round(performance.now() - attemptStart)

      // Estimate TTFB (time to first byte - roughly when response headers received)
      ttfbMs = attemptDuration

      // If successful, break retry loop
      if (response.ok) {
        totalMs = Math.round(performance.now() - overallStart)
        break
      }

      // Check if should retry based on status
      if (!retryConfig.retryOn.includes(response.status)) {
        // Don't retry this status code
        totalMs = Math.round(performance.now() - overallStart)
        break
      }

      // Retry - will loop
      lastError = new Error(`HTTP ${response.status}: ${response.statusText}`)

      // Calculate backoff delay
      if (attempt < retryConfig.maxAttempts) {
        const delay = Math.min(
          retryConfig.initialDelayMs * Math.pow(retryConfig.backoffMultiplier, attempt - 1),
          retryConfig.maxDelayMs
        )
        await sleep(delay)
      }

    } catch (err: any) {
      lastError = err

      // Check if retryable error
      const shouldRetry = isRetryableError(err) && attempt < retryConfig.maxAttempts

      if (!shouldRetry) {
        totalMs = Math.round(performance.now() - overallStart)
        break
      }

      // Calculate backoff delay
      if (attempt < retryConfig.maxAttempts) {
        const delay = Math.min(
          retryConfig.initialDelayMs * Math.pow(retryConfig.backoffMultiplier, attempt - 1),
          retryConfig.maxDelayMs
        )
        await sleep(delay)
      }
    }
  }

  // Final state
  const status = response ? response.status : 0
  const success = response?.ok || false
  const error = !success ? lastError : null

  // Measure response body size (if successful)
  let bytesOut: number | undefined
  if (response && success) {
    try {
      const clone = response.clone()
      const body = await clone.text()
      bytesOut = Buffer.byteLength(body, 'utf8')
    } catch {
      // Ignore body measurement errors
    }
  }

  // Write telemetry span (if enabled and in context)
  if (isTelemetryEnabled() && ctx) {
    writeSpan({
      trace_id: ctx.traceId,
      span_name: `fetch_${provider}`,
      span_type: 'external',
      target: provider,
      start_time: new Date(Date.now() - totalMs).toISOString(),
      duration_ms: totalMs,
      status: success ? 'success' : error?.name === 'AbortError' ? 'timeout' : 'error',
      operation: fetchOptions.method || 'GET',
      bytes_out: bytesOut,
      attempt_number: attempt,
      max_attempts: retryConfig.maxAttempts,
      retry_reason: attempt > 1 ? (error ? error.message : `HTTP ${status}`) : undefined,
      error_type: error?.name,
      error_message_redacted: error ? redactErrorMessage(error) : undefined,
      dns_ms: dnsMs,
      tls_ms: tlsMs,
      ttfb_ms: ttfbMs,
      download_ms: downloadMs,
      meta_redacted: createSafeMetadata({
        provider,
        url: redactPayload ? '[REDACTED]' : url,
        status,
        retries: attempt - 1,
        ...metadata
      })
    }).catch(err => {
      console.error('[Telemetry] Failed to write external API span:', err)
    })

    incrementSpanCount()
  }

  // Return response or throw error
  if (response) {
    return response
  } else {
    throw lastError || new Error('Request failed after retries')
  }
}

/**
 * Sleep utility for retry delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Convenience wrapper for JSON APIs
 */
export async function fetchJsonWithTelemetry<T = any>(
  url: string,
  options: FetchTelemetryOptions = {}
): Promise<T> {
  const response = await fetchWithTelemetry(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    }
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`)
  }

  return response.json()
}

/**
 * POST JSON with telemetry
 */
export async function postJsonWithTelemetry<T = any>(
  url: string,
  body: any,
  options: Omit<FetchTelemetryOptions, 'method' | 'body'> = {}
): Promise<T> {
  return fetchJsonWithTelemetry<T>(url, {
    ...options,
    method: 'POST',
    body: JSON.stringify(body)
  })
}

/**
 * GET JSON with telemetry
 */
export async function getJsonWithTelemetry<T = any>(
  url: string,
  options: Omit<FetchTelemetryOptions, 'method'> = {}
): Promise<T> {
  return fetchJsonWithTelemetry<T>(url, {
    ...options,
    method: 'GET'
  })
}
