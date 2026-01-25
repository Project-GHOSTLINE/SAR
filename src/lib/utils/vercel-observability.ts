/**
 * Vercel Observability Helpers
 * Custom metrics and traces for monitoring telemetry system
 */

/**
 * Log custom metric to Vercel Observability
 */
export function recordMetric(
  name: string,
  value: number,
  tags?: Record<string, string>
) {
  // Vercel automatically captures console.log in structured format
  console.log(
    JSON.stringify({
      type: 'metric',
      name,
      value,
      tags: tags || {},
      timestamp: new Date().toISOString(),
    })
  )
}

/**
 * Track telemetry API performance
 */
export function trackTelemetryPerformance(
  endpoint: string,
  durationMs: number,
  success: boolean
) {
  recordMetric('telemetry.api.duration_ms', durationMs, {
    endpoint,
    status: success ? 'success' : 'error',
  })

  if (!success) {
    recordMetric('telemetry.api.errors', 1, { endpoint })
  }
}

/**
 * Track session creation
 */
export function trackSessionCreated(
  deviceType: string,
  hasUTM: boolean,
  country: string
) {
  recordMetric('telemetry.sessions_created', 1, {
    device_type: deviceType,
    has_utm: hasUTM ? 'true' : 'false',
    country,
  })
}

/**
 * Track VPN/Proxy detection
 */
export function trackSecurityEvent(eventType: string, asn: number) {
  recordMetric('telemetry.security_events', 1, {
    event_type: eventType,
    asn: asn.toString(),
  })
}

/**
 * Track ipapi.co quota usage (important: 1000 req/day limit)
 */
export function trackIPApiQuota(remaining: number) {
  recordMetric('telemetry.ipapi_quota_remaining', remaining, {
    service: 'ipapi.co',
  })

  // Alert if quota getting low
  if (remaining < 100) {
    console.warn(
      `[Observability] ipapi.co quota low: ${remaining} requests remaining`
    )
  }
}

/**
 * Create trace span for performance tracking
 */
export function createTraceSpan<T>(
  name: string,
  fn: () => Promise<T>
): Promise<T> {
  const startTime = Date.now()

  return fn()
    .then((result) => {
      const duration = Date.now() - startTime
      recordMetric(`trace.${name}.duration_ms`, duration, { status: 'success' })
      return result
    })
    .catch((error) => {
      const duration = Date.now() - startTime
      recordMetric(`trace.${name}.duration_ms`, duration, { status: 'error' })
      console.error(`[Trace] ${name} failed:`, error)
      throw error
    })
}
