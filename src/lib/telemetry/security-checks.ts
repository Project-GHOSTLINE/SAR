/**
 * SECURITY CHECKS - Webhook & API Validation
 *
 * Security checks with telemetry tracking:
 * - Webhook signature validation
 * - Replay protection (timestamp windows)
 * - Rate limiting
 * - Payload size checks
 * - Anomaly detection
 */

import { getTraceContext } from './context'
import { writeSecurity } from './batcher'
import { createSafeMetadata, isTelemetryEnabled } from './index'
import crypto from 'crypto'

export type SecurityCheckResult = 'pass' | 'fail' | 'error' | 'skip'
export type SecuritySeverity = 'low' | 'medium' | 'high' | 'critical'

interface SecurityCheck {
  check_name: string
  result: SecurityCheckResult
  severity: SecuritySeverity
  details_redacted?: any
  action_taken?: string
  blocked_reason?: string
  source?: string
  provider?: string
}

/**
 * Track security check result
 */
async function trackSecurityCheck(check: SecurityCheck): Promise<void> {
  if (!isTelemetryEnabled()) return

  const ctx = getTraceContext()
  if (!ctx) return

  await writeSecurity({
    trace_id: ctx.traceId,
    check_name: check.check_name,
    result: check.result,
    severity: check.severity,
    details_redacted: check.details_redacted ? createSafeMetadata(check.details_redacted) : undefined,
    action_taken: check.action_taken,
    blocked_reason: check.blocked_reason,
    source: check.source || 'webhook',
    provider: check.provider
  }).catch(err => {
    console.error('[Telemetry] Failed to write security check:', err)
  })
}

/**
 * Validate webhook signature (HMAC SHA1 - VoPay style)
 */
export async function validateWebhookSignatureSHA1(
  transactionId: string,
  validationKey: string,
  expectedSignature: string,
  provider: string = 'vopay'
): Promise<boolean> {
  try {
    const sharedSecret = process.env.VOPAY_SHARED_SECRET || ''

    // Calculate expected signature: SHA1(SharedSecret + TransactionID)
    const calculatedSignature = crypto
      .createHash('sha1')
      .update(sharedSecret + transactionId)
      .digest('hex')

    const isValid = calculatedSignature === validationKey

    await trackSecurityCheck({
      check_name: 'webhook_signature_sha1',
      result: isValid ? 'pass' : 'fail',
      severity: isValid ? 'low' : 'critical',
      details_redacted: {
        provider,
        transaction_id: transactionId,
        signature_valid: isValid
      },
      action_taken: isValid ? 'allowed' : 'blocked',
      blocked_reason: isValid ? undefined : 'Invalid signature',
      provider
    })

    return isValid
  } catch (err: any) {
    await trackSecurityCheck({
      check_name: 'webhook_signature_sha1',
      result: 'error',
      severity: 'high',
      details_redacted: {
        provider,
        error: err.message
      },
      action_taken: 'blocked',
      blocked_reason: 'Signature validation error',
      provider
    })

    return false
  }
}

/**
 * Validate webhook signature (HMAC SHA256 - QuickBooks style)
 */
export async function validateWebhookSignatureHMAC(
  payload: string,
  receivedSignature: string,
  secret: string,
  provider: string = 'quickbooks'
): Promise<boolean> {
  try {
    // Calculate HMAC-SHA256
    const calculatedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('base64')

    const isValid = calculatedSignature === receivedSignature

    await trackSecurityCheck({
      check_name: 'webhook_signature_hmac',
      result: isValid ? 'pass' : 'fail',
      severity: isValid ? 'low' : 'critical',
      details_redacted: {
        provider,
        signature_valid: isValid
      },
      action_taken: isValid ? 'allowed' : 'blocked',
      blocked_reason: isValid ? undefined : 'Invalid HMAC signature',
      provider
    })

    return isValid
  } catch (err: any) {
    await trackSecurityCheck({
      check_name: 'webhook_signature_hmac',
      result: 'error',
      severity: 'high',
      details_redacted: {
        provider,
        error: err.message
      },
      action_taken: 'blocked',
      blocked_reason: 'Signature validation error',
      provider
    })

    return false
  }
}

/**
 * Replay protection (timestamp window)
 * Rejects webhooks with timestamps outside acceptable window
 */
export async function checkReplayProtection(
  webhookTimestamp: string | number,
  maxAgeSeconds: number = 300,  // 5 minutes
  provider: string = 'unknown'
): Promise<boolean> {
  try {
    // Parse timestamp
    const webhookTime = typeof webhookTimestamp === 'number'
      ? webhookTimestamp
      : new Date(webhookTimestamp).getTime()

    const now = Date.now()
    const ageSeconds = Math.abs(now - webhookTime) / 1000

    const isValid = ageSeconds <= maxAgeSeconds

    await trackSecurityCheck({
      check_name: 'replay_protection',
      result: isValid ? 'pass' : 'fail',
      severity: isValid ? 'low' : 'high',
      details_redacted: {
        provider,
        age_seconds: Math.round(ageSeconds),
        max_age_seconds: maxAgeSeconds,
        timestamp_valid: isValid
      },
      action_taken: isValid ? 'allowed' : 'blocked',
      blocked_reason: isValid ? undefined : 'Timestamp outside acceptable window',
      provider
    })

    return isValid
  } catch (err: any) {
    await trackSecurityCheck({
      check_name: 'replay_protection',
      result: 'error',
      severity: 'medium',
      details_redacted: {
        provider,
        error: err.message
      },
      action_taken: 'logged',
      provider
    })

    // On error, allow by default (fail open)
    return true
  }
}

/**
 * Check payload size
 * Rejects payloads that are suspiciously large
 */
export async function checkPayloadSize(
  payloadSizeBytes: number,
  maxSizeBytes: number = 1024 * 1024,  // 1 MB default
  provider: string = 'unknown'
): Promise<boolean> {
  try {
    const isValid = payloadSizeBytes <= maxSizeBytes

    await trackSecurityCheck({
      check_name: 'payload_size',
      result: isValid ? 'pass' : 'fail',
      severity: isValid ? 'low' : 'medium',
      details_redacted: {
        provider,
        size_bytes: payloadSizeBytes,
        max_size_bytes: maxSizeBytes,
        size_valid: isValid
      },
      action_taken: isValid ? 'allowed' : 'blocked',
      blocked_reason: isValid ? undefined : 'Payload too large',
      provider
    })

    return isValid
  } catch (err: any) {
    await trackSecurityCheck({
      check_name: 'payload_size',
      result: 'error',
      severity: 'low',
      details_redacted: {
        provider,
        error: err.message
      },
      action_taken: 'logged',
      provider
    })

    return true  // Fail open
  }
}

/**
 * Rate limiting check (simple in-memory counter)
 * For production: use Redis or Vercel KV
 */
const rateLimitCounters = new Map<string, { count: number; resetAt: number }>()

export async function checkRateLimit(
  identifier: string,  // IP or provider
  maxRequests: number = 100,
  windowSeconds: number = 60,
  provider: string = 'unknown'
): Promise<boolean> {
  try {
    const now = Date.now()
    const counter = rateLimitCounters.get(identifier)

    // Clean up expired counters periodically
    if (Math.random() < 0.01) {  // 1% chance
      for (const [key, value] of Array.from(rateLimitCounters.entries())) {
        if (value.resetAt < now) {
          rateLimitCounters.delete(key)
        }
      }
    }

    // Check rate limit
    if (!counter || counter.resetAt < now) {
      // Create new counter
      rateLimitCounters.set(identifier, {
        count: 1,
        resetAt: now + windowSeconds * 1000
      })

      await trackSecurityCheck({
        check_name: 'rate_limit',
        result: 'pass',
        severity: 'low',
        details_redacted: {
          provider,
          identifier_hash: identifier.substring(0, 8),
          count: 1,
          max_requests: maxRequests
        },
        action_taken: 'allowed',
        provider
      })

      return true
    } else {
      // Increment counter
      counter.count++

      const isValid = counter.count <= maxRequests

      if (!isValid) {
        await trackSecurityCheck({
          check_name: 'rate_limit',
          result: 'fail',
          severity: 'medium',
          details_redacted: {
            provider,
            identifier_hash: identifier.substring(0, 8),
            count: counter.count,
            max_requests: maxRequests
          },
          action_taken: 'blocked',
          blocked_reason: 'Rate limit exceeded',
          provider
        })
      }

      return isValid
    }
  } catch (err: any) {
    await trackSecurityCheck({
      check_name: 'rate_limit',
      result: 'error',
      severity: 'low',
      details_redacted: {
        provider,
        error: err.message
      },
      action_taken: 'logged',
      provider
    })

    return true  // Fail open
  }
}

/**
 * Detect injection patterns (SQL, XSS, etc.)
 */
export async function checkInjectionPatterns(
  input: string,
  provider: string = 'unknown'
): Promise<boolean> {
  try {
    const patterns = [
      /(\bDROP\b|\bDELETE\b|\bUPDATE\b|\bINSERT\b).*\b(TABLE|DATABASE)\b/i,  // SQL injection
      /<script|javascript:|onerror=|onload=/i,  // XSS
      /\.\.\//,  // Path traversal
      /;\s*(cat|ls|rm|wget|curl)\s/i,  // Command injection
      /\${.*}/  // Template injection
    ]

    const detected = patterns.some(pattern => pattern.test(input))

    if (detected) {
      await trackSecurityCheck({
        check_name: 'injection_detection',
        result: 'fail',
        severity: 'critical',
        details_redacted: {
          provider,
          pattern_detected: true
        },
        action_taken: 'blocked',
        blocked_reason: 'Injection pattern detected',
        provider
      })

      return false
    }

    return true
  } catch (err: any) {
    await trackSecurityCheck({
      check_name: 'injection_detection',
      result: 'error',
      severity: 'medium',
      details_redacted: {
        provider,
        error: err.message
      },
      action_taken: 'logged',
      provider
    })

    return true  // Fail open
  }
}

/**
 * Verify admin authentication (JWT validation)
 */
export async function checkAdminAuth(
  isAuthenticated: boolean,
  role?: string
): Promise<boolean> {
  try {
    const isValid = isAuthenticated && role === 'admin'

    await trackSecurityCheck({
      check_name: 'admin_auth',
      result: isValid ? 'pass' : 'fail',
      severity: isValid ? 'low' : 'high',
      details_redacted: {
        authenticated: isAuthenticated,
        role: role || 'anonymous',
        auth_valid: isValid
      },
      action_taken: isValid ? 'allowed' : 'blocked',
      blocked_reason: isValid ? undefined : 'Unauthorized - admin access required',
      source: 'api'
    })

    return isValid
  } catch (err: any) {
    await trackSecurityCheck({
      check_name: 'admin_auth',
      result: 'error',
      severity: 'high',
      details_redacted: {
        error: err.message
      },
      action_taken: 'blocked',
      blocked_reason: 'Authentication check error',
      source: 'api'
    })

    return false  // Fail closed for auth
  }
}

/**
 * All-in-one webhook validation
 */
export async function validateWebhook(options: {
  provider: string
  signature?: {
    type: 'sha1' | 'hmac-sha256'
    transactionId?: string
    validationKey?: string
    payload?: string
    receivedSignature?: string
    secret?: string
  }
  timestamp?: string | number
  payloadSize?: number
  ipHash?: string
}): Promise<{
  valid: boolean
  failedChecks: string[]
}> {
  const failedChecks: string[] = []

  // Signature validation
  if (options.signature) {
    if (options.signature.type === 'sha1') {
      const valid = await validateWebhookSignatureSHA1(
        options.signature.transactionId!,
        options.signature.validationKey!,
        options.signature.receivedSignature!,
        options.provider
      )
      if (!valid) failedChecks.push('signature')
    } else if (options.signature.type === 'hmac-sha256') {
      const valid = await validateWebhookSignatureHMAC(
        options.signature.payload!,
        options.signature.receivedSignature!,
        options.signature.secret!,
        options.provider
      )
      if (!valid) failedChecks.push('signature')
    }
  }

  // Replay protection
  if (options.timestamp) {
    const valid = await checkReplayProtection(
      options.timestamp,
      300,
      options.provider
    )
    if (!valid) failedChecks.push('replay_protection')
  }

  // Payload size
  if (options.payloadSize) {
    const valid = await checkPayloadSize(
      options.payloadSize,
      1024 * 1024,
      options.provider
    )
    if (!valid) failedChecks.push('payload_size')
  }

  // Rate limiting
  if (options.ipHash) {
    const valid = await checkRateLimit(
      options.ipHash,
      100,
      60,
      options.provider
    )
    if (!valid) failedChecks.push('rate_limit')
  }

  return {
    valid: failedChecks.length === 0,
    failedChecks
  }
}
