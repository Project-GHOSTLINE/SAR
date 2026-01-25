/**
 * Telemetry Library - Real-time instrumentation
 *
 * Automatically captures:
 * - HTTP requests (method, path, status, duration)
 * - Database queries (Supabase operations)
 * - External API calls (GA4, Semrush, QuickBooks, VoPay)
 * - Errors and exceptions
 * - Performance metrics
 *
 * All data is REAL - no mocking, no simulation
 */

import { createHash } from 'crypto'

// ============================================================================
// TYPES
// ============================================================================

export interface TelemetryRequest {
  trace_id: string
  parent_trace_id?: string
  method: string
  path: string
  status?: number
  duration_ms?: number
  source: 'web' | 'webhook' | 'cron' | 'internal'
  env: 'production' | 'development' | 'preview'
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
  meta_redacted?: Record<string, any>
}

export interface TelemetrySpan {
  trace_id: string
  parent_span_id?: string
  span_name: string
  span_type: 'db' | 'external' | 'webhook' | 'internal' | 'cache'
  target: string
  start_time: string
  duration_ms: number
  status: 'success' | 'error' | 'timeout' | 'cached'
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
  meta_redacted?: Record<string, any>
}

export interface TelemetrySecurity {
  trace_id: string
  check_name: string
  result: 'pass' | 'fail' | 'error' | 'skip'
  severity: 'low' | 'medium' | 'high' | 'critical'
  details_redacted?: Record<string, any>
  action_taken?: string
  blocked_reason?: string
  source?: string
  provider?: string
}

// ============================================================================
// CONTEXT - Thread-local storage for trace context
// ============================================================================

let currentTraceId: string | null = null
let currentSpans: Map<string, number> = new Map()

export function generateTraceId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`
}

export function setTraceId(traceId: string) {
  currentTraceId = traceId
  currentSpans.clear()
}

export function getTraceId(): string {
  if (!currentTraceId) {
    currentTraceId = generateTraceId()
  }
  return currentTraceId
}

export function clearTraceId() {
  currentTraceId = null
  currentSpans.clear()
}

// ============================================================================
// HASHING - Privacy-safe IP/UA hashing
// ============================================================================

const HASH_SALT = process.env.TELEMETRY_HASH_SALT || 'default-salt-change-in-production'

export function hashIP(ip: string): string {
  return createHash('sha256')
    .update(ip + HASH_SALT)
    .digest('hex')
    .substring(0, 16)
}

export function hashUserAgent(ua: string): string {
  return createHash('sha256')
    .update(ua + HASH_SALT)
    .digest('hex')
    .substring(0, 16)
}

// ============================================================================
// REDACTION - Remove PII from error messages
// ============================================================================

export function redactErrorMessage(message: string): string {
  return message
    // Remove emails
    .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[EMAIL_REDACTED]')
    // Remove phone numbers
    .replace(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, '[PHONE_REDACTED]')
    // Remove tokens/keys (anything that looks like a secret)
    .replace(/\b[A-Za-z0-9]{32,}\b/g, '[TOKEN_REDACTED]')
    // Remove credit card numbers
    .replace(/\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b/g, '[CC_REDACTED]')
    // Remove IP addresses
    .replace(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, '[IP_REDACTED]')
}

export function redactMetadata(meta: Record<string, any>): Record<string, any> {
  const redacted: Record<string, any> = {}

  for (const [key, value] of Object.entries(meta)) {
    // Skip sensitive keys
    if (
      key.toLowerCase().includes('password') ||
      key.toLowerCase().includes('secret') ||
      key.toLowerCase().includes('token') ||
      key.toLowerCase().includes('key') ||
      key.toLowerCase().includes('auth')
    ) {
      redacted[key] = '[REDACTED]'
      continue
    }

    // Redact string values
    if (typeof value === 'string') {
      redacted[key] = redactErrorMessage(value)
    } else if (typeof value === 'object' && value !== null) {
      redacted[key] = redactMetadata(value)
    } else {
      redacted[key] = value
    }
  }

  return redacted
}

// ============================================================================
// WRITE TO SUPABASE
// ============================================================================

async function writeTelemetry(type: 'request' | 'span' | 'security', data: any) {
  try {
    // Call internal API to write telemetry
    // We use API route instead of direct Supabase to avoid auth issues
    const response = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/telemetry/write`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-telemetry-key': process.env.TELEMETRY_WRITE_KEY || 'dev-key'
      },
      body: JSON.stringify({ type, data })
    })

    if (!response.ok) {
      console.error('[telemetry] Failed to write:', await response.text())
    }
  } catch (error) {
    // Silently fail - telemetry should never break the app
    console.error('[telemetry] Write error:', error)
  }
}

// ============================================================================
// PUBLIC API - Request Logging
// ============================================================================

export async function logRequest(data: Partial<TelemetryRequest>) {
  const request: TelemetryRequest = {
    trace_id: data.trace_id || getTraceId(),
    method: data.method || 'UNKNOWN',
    path: data.path || '/unknown',
    source: data.source || 'web',
    env: (process.env.VERCEL_ENV as any) || 'development',
    ...data,
  }

  await writeTelemetry('request', request)
}

// ============================================================================
// PUBLIC API - Span Logging
// ============================================================================

export async function logSpan(data: Partial<TelemetrySpan>) {
  const span: TelemetrySpan = {
    trace_id: data.trace_id || getTraceId(),
    span_name: data.span_name || 'unknown',
    span_type: data.span_type || 'internal',
    target: data.target || 'unknown',
    start_time: data.start_time || new Date().toISOString(),
    duration_ms: data.duration_ms || 0,
    status: data.status || 'success',
    ...data,
  }

  await writeTelemetry('span', span)
}

// ============================================================================
// PUBLIC API - Security Check Logging
// ============================================================================

export async function logSecurityCheck(data: Partial<TelemetrySecurity>) {
  const check: TelemetrySecurity = {
    trace_id: data.trace_id || getTraceId(),
    check_name: data.check_name || 'unknown',
    result: data.result || 'error',
    severity: data.severity || 'low',
    ...data,
  }

  await writeTelemetry('security', check)
}

// ============================================================================
// HELPERS - Measure execution time
// ============================================================================

export async function measureSpan<T>(
  spanName: string,
  spanType: TelemetrySpan['span_type'],
  target: string,
  operation: string,
  fn: () => Promise<T>
): Promise<T> {
  const startTime = Date.now()
  const start = new Date().toISOString()
  let status: TelemetrySpan['status'] = 'success'
  let errorType: string | undefined
  let errorMessage: string | undefined
  let result: T

  try {
    result = await fn()
    return result
  } catch (error) {
    status = 'error'
    errorType = error instanceof Error ? error.constructor.name : 'UnknownError'
    errorMessage = error instanceof Error ? redactErrorMessage(error.message) : 'Unknown error'
    throw error
  } finally {
    const duration = Date.now() - startTime

    await logSpan({
      span_name: spanName,
      span_type: spanType,
      target,
      operation,
      start_time: start,
      duration_ms: duration,
      status,
      error_type: errorType,
      error_message_redacted: errorMessage,
    })
  }
}

// ============================================================================
// HELPERS - Database Query Wrapper
// ============================================================================

export async function measureDBQuery<T>(
  table: string,
  operation: string,
  fn: () => Promise<T>
): Promise<T> {
  return measureSpan(
    `db_query`,
    'db',
    table,
    operation,
    fn
  )
}

// ============================================================================
// HELPERS - External API Call Wrapper
// ============================================================================

export async function measureExternalAPI<T>(
  provider: string,
  endpoint: string,
  fn: () => Promise<T>
): Promise<T> {
  return measureSpan(
    `external_api`,
    'external',
    provider,
    endpoint,
    fn
  )
}

// ============================================================================
// EXPORTS
// ============================================================================

export const telemetry = {
  // Context
  generateTraceId,
  setTraceId,
  getTraceId,
  clearTraceId,

  // Logging
  logRequest,
  logSpan,
  logSecurityCheck,

  // Helpers
  measureSpan,
  measureDBQuery,
  measureExternalAPI,

  // Privacy
  hashIP,
  hashUserAgent,
  redactErrorMessage,
  redactMetadata,
}

export default telemetry
