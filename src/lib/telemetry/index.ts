/**
 * TELEMETRY CORE LIBRARY
 *
 * Main entry point for telemetry system
 * Exports all public APIs and utilities
 */

// Re-export context management
export {
  type TraceContext,
  getTraceContext,
  getOrCreateTraceId,
  createTraceContext,
  runWithTraceContext,
  updateTraceContext,
  incrementDbCall,
  incrementSpanCount,
  hashWithSalt,
  extractRequestMetadata,
  isInTraceContext,
  getTraceIdSafe,
  getTelemetryPerfContext
} from './context'

// Re-export batch writers
export {
  writeRequest,
  writeSpan,
  writeSecurity,
  flushTelemetry,
  getTelemetryStats
} from './batcher'

/**
 * PII REDACTION - Remove sensitive information
 */

// Patterns for automatic PII detection
const PII_PATTERNS = {
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
  phone: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g,
  ssn: /\b\d{3}-\d{2}-\d{4}\b/g,
  creditCard: /\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b/g,
  postalCode: /\b[A-Z]\d[A-Z] ?\d[A-Z]\d\b/gi,  // Canadian postal
  ipv4: /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g,
}

// Secret/token keys to redact in objects
const SECRET_KEYS = [
  'password',
  'secret',
  'token',
  'key',
  'api_key',
  'apiKey',
  'apiSecret',
  'privateKey',
  'private_key',
  'jwt',
  'sessionId',
  'session_id',
  'sessionToken',
  'session_token',
  'authToken',
  'auth_token',
  'accessToken',
  'access_token',
  'refreshToken',
  'refresh_token',
  'bearerToken',
  'bearer_token',
  'clientSecret',
  'client_secret',
  'sharedSecret',
  'shared_secret',
  'webhookSecret',
  'webhook_secret',
  'encryptionKey',
  'encryption_key'
]

/**
 * Redact PII from string
 */
export function redactPII(text: string): string {
  if (!text || typeof text !== 'string') return text

  let redacted = text

  // Replace emails
  redacted = redacted.replace(PII_PATTERNS.email, '[EMAIL]')

  // Replace phone numbers
  redacted = redacted.replace(PII_PATTERNS.phone, '[PHONE]')

  // Replace SSN
  redacted = redacted.replace(PII_PATTERNS.ssn, '[SSN]')

  // Replace credit cards
  redacted = redacted.replace(PII_PATTERNS.creditCard, '[CARD]')

  // Replace postal codes
  redacted = redacted.replace(PII_PATTERNS.postalCode, '[POSTAL]')

  // Replace IP addresses
  redacted = redacted.replace(PII_PATTERNS.ipv4, '[IP]')

  return redacted
}

/**
 * Redact secrets from object (recursive)
 */
export function redactSecrets(obj: any, maxDepth = 5): any {
  if (maxDepth <= 0) return '[MAX_DEPTH]'
  if (obj === null || obj === undefined) return obj
  if (typeof obj !== 'object') return obj

  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map(item => redactSecrets(item, maxDepth - 1))
  }

  // Handle objects
  const redacted: any = {}

  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase()

    // Check if key is in secret list
    if (SECRET_KEYS.some(secretKey => lowerKey.includes(secretKey.toLowerCase()))) {
      redacted[key] = '[REDACTED]'
      continue
    }

    // Recursively redact nested objects
    if (typeof value === 'object' && value !== null) {
      redacted[key] = redactSecrets(value, maxDepth - 1)
    } else if (typeof value === 'string') {
      // Redact PII from string values
      redacted[key] = redactPII(value)
    } else {
      redacted[key] = value
    }
  }

  return redacted
}

/**
 * Redact error message (remove PII + secrets)
 */
export function redactErrorMessage(error: Error | string): string {
  const message = typeof error === 'string' ? error : error.message

  // Redact PII
  let redacted = redactPII(message)

  // Redact common secret patterns
  // e.g., "Bearer abc123" → "Bearer [REDACTED]"
  redacted = redacted.replace(/Bearer\s+[\w-]+/gi, 'Bearer [REDACTED]')
  redacted = redacted.replace(/Token\s+[\w-]+/gi, 'Token [REDACTED]')
  redacted = redacted.replace(/key=[\w-]+/gi, 'key=[REDACTED]')

  return redacted
}

/**
 * Redact stack trace (keep structure, remove sensitive paths)
 */
export function redactStackTrace(error: Error): string | undefined {
  if (!error.stack) return undefined

  // Only include stack in development
  if (process.env.NODE_ENV === 'production') {
    return '[STACK_OMITTED_IN_PROD]'
  }

  // Redact absolute paths (keep relative structure)
  let stack = error.stack
  stack = stack.replace(/\/[\w\/-]+\/(src|pages|app)\//g, '.../$1/')
  stack = stack.replace(/\(.*?node_modules.*?\)/g, '(node_modules/...)')

  // Limit stack trace length
  const lines = stack.split('\n')
  if (lines.length > 10) {
    return lines.slice(0, 10).join('\n') + '\n... (truncated)'
  }

  return stack
}

/**
 * Create safe metadata object (redacted)
 */
export function createSafeMetadata(data: any): any {
  if (!data) return null

  // Clone to avoid mutating original
  const cloned = JSON.parse(JSON.stringify(data))

  // Redact secrets and PII
  return redactSecrets(cloned)
}

/**
 * Measure function execution time
 */
export async function measureAsync<T>(
  fn: () => Promise<T>
): Promise<{ result: T; durationMs: number }> {
  const start = performance.now()
  const result = await fn()
  const durationMs = Math.round(performance.now() - start)

  return { result, durationMs }
}

/**
 * Measure sync function execution time
 */
export function measureSync<T>(
  fn: () => T
): { result: T; durationMs: number } {
  const start = performance.now()
  const result = fn()
  const durationMs = Math.round(performance.now() - start)

  return { result, durationMs }
}

/**
 * Determine HTTP status category
 */
export function getStatusCategory(status: number): 'success' | 'client_error' | 'server_error' {
  if (status >= 200 && status < 400) return 'success'
  if (status >= 400 && status < 500) return 'client_error'
  return 'server_error'
}

/**
 * Format bytes to human-readable
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`
}

/**
 * Format duration to human-readable
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`
  return `${(ms / 60000).toFixed(2)}min`
}

/**
 * Check if error is retryable
 */
export function isRetryableError(error: any): boolean {
  // Network errors
  if (error.code === 'ECONNRESET') return true
  if (error.code === 'ETIMEDOUT') return true
  if (error.code === 'ENOTFOUND') return true

  // HTTP status codes that are retryable
  if (error.status === 429) return true  // Rate limit
  if (error.status === 503) return true  // Service unavailable
  if (error.status === 504) return true  // Gateway timeout

  return false
}

/**
 * Extract provider from URL
 */
export function extractProvider(url: string): string {
  try {
    const hostname = new URL(url).hostname

    // Known providers
    if (hostname.includes('vopay')) return 'vopay'
    if (hostname.includes('quickbooks') || hostname.includes('intuit')) return 'quickbooks'
    if (hostname.includes('resend')) return 'resend'
    if (hostname.includes('margill')) return 'margill'
    if (hostname.includes('google')) return 'google'
    if (hostname.includes('supabase')) return 'supabase'
    if (hostname.includes('vercel')) return 'vercel'

    // Default: use hostname
    return hostname
  } catch {
    return 'unknown'
  }
}

/**
 * Classify request source from path
 */
export function classifySource(path: string): 'web' | 'webhook' | 'cron' | 'internal' {
  if (path.startsWith('/api/webhooks/')) return 'webhook'
  if (path.startsWith('/api/cron/')) return 'cron'
  if (path.startsWith('/api/internal/')) return 'internal'
  return 'web'
}

/**
 * Extract route pattern (for grouping similar requests)
 * Example: /api/admin/messages/123 → /api/admin/messages/[id]
 */
export function extractRoutePattern(path: string): string {
  // Replace UUIDs
  let pattern = path.replace(
    /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
    '[uuid]'
  )

  // Replace numeric IDs
  pattern = pattern.replace(/\/\d+\b/g, '/[id]')

  // Replace dynamic segments (common patterns)
  pattern = pattern.replace(/\/[a-z0-9_-]+@[a-z0-9.-]+/gi, '/[email]')

  return pattern
}

/**
 * Check if telemetry is enabled (can be disabled via env var)
 */
export function isTelemetryEnabled(): boolean {
  return process.env.TELEMETRY_ENABLED !== 'false'
}

/**
 * Get telemetry environment
 */
export function getTelemetryEnv(): 'production' | 'development' | 'preview' {
  if (process.env.NODE_ENV === 'production') return 'production'
  if (process.env.VERCEL_ENV === 'preview') return 'preview'
  return 'development'
}
