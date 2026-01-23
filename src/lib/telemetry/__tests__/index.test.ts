/**
 * TESTS: Telemetry Core Functions
 *
 * Unit tests for PII redaction, secrets masking, and utility functions
 */

import {
  redactPII,
  redactSecrets,
  redactErrorMessage,
  createSafeMetadata,
  getStatusCategory,
  formatBytes,
  formatDuration,
  isRetryableError,
  extractProvider,
  classifySource,
  extractRoutePattern,
} from '../index'

describe('Telemetry Core', () => {
  describe('redactPII', () => {
    it('should redact email addresses', () => {
      const input = 'Contact us at support@example.com for help'
      const output = redactPII(input)
      expect(output).toBe('Contact us at [EMAIL] for help')
    })

    it('should redact phone numbers', () => {
      const input = 'Call us at 514-555-1234 or 5145551234'
      const output = redactPII(input)
      expect(output).toContain('[PHONE]')
    })

    it('should redact SSN', () => {
      const input = 'SSN: 123-45-6789'
      const output = redactPII(input)
      expect(output).toBe('SSN: [SSN]')
    })

    it('should redact credit card numbers', () => {
      const input = 'Card: 4532-1234-5678-9010'
      const output = redactPII(input)
      expect(output).toBe('Card: [CARD]')
    })

    it('should redact multiple PII types', () => {
      const input = 'Email: test@test.com, Phone: 514-555-1234, SSN: 123-45-6789'
      const output = redactPII(input)
      expect(output).not.toContain('test@test.com')
      expect(output).not.toContain('514-555-1234')
      expect(output).not.toContain('123-45-6789')
      expect(output).toContain('[EMAIL]')
      expect(output).toContain('[PHONE]')
      expect(output).toContain('[SSN]')
    })
  })

  describe('redactSecrets', () => {
    it('should redact password fields', () => {
      const input = { username: 'admin', password: 'secret123' }
      const output = redactSecrets(input)
      expect(output.username).toBe('admin')
      expect(output.password).toBe('[REDACTED]')
    })

    it('should redact API keys', () => {
      const input = { apiKey: 'abc123', api_key: 'xyz789', data: 'public' }
      const output = redactSecrets(input)
      expect(output.apiKey).toBe('[REDACTED]')
      expect(output.api_key).toBe('[REDACTED]')
      expect(output.data).toBe('public')
    })

    it('should redact nested secrets', () => {
      const input = {
        user: {
          name: 'John',
          credentials: {
            password: 'secret',
            token: 'abc123'
          }
        }
      }
      const output = redactSecrets(input)
      expect(output.user.name).toBe('John')
      expect(output.user.credentials.password).toBe('[REDACTED]')
      expect(output.user.credentials.token).toBe('[REDACTED]')
    })

    it('should handle arrays', () => {
      const input = {
        users: [
          { name: 'Alice', password: 'pass1' },
          { name: 'Bob', password: 'pass2' }
        ]
      }
      const output = redactSecrets(input)
      expect(output.users[0].name).toBe('Alice')
      expect(output.users[0].password).toBe('[REDACTED]')
      expect(output.users[1].name).toBe('Bob')
      expect(output.users[1].password).toBe('[REDACTED]')
    })

    it('should prevent infinite recursion', () => {
      const input = { level: 0 }
      let current: any = input
      for (let i = 0; i < 20; i++) {
        current.nested = { level: i + 1 }
        current = current.nested
      }

      const output = redactSecrets(input)
      expect(output).toBeDefined()
    })
  })

  describe('redactErrorMessage', () => {
    it('should redact PII from error messages', () => {
      const error = new Error('Failed to send email to john@example.com')
      const output = redactErrorMessage(error)
      expect(output).not.toContain('john@example.com')
      expect(output).toContain('[EMAIL]')
    })

    it('should redact Bearer tokens', () => {
      const error = 'Unauthorized: Bearer abc123xyz456'
      const output = redactErrorMessage(error)
      expect(output).toContain('Bearer [REDACTED]')
      expect(output).not.toContain('abc123xyz456')
    })

    it('should handle string errors', () => {
      const output = redactErrorMessage('Error: user@test.com not found')
      expect(output).toContain('[EMAIL]')
    })
  })

  describe('createSafeMetadata', () => {
    it('should create redacted copy of metadata', () => {
      const input = {
        userId: '123',
        email: 'test@example.com',
        apiKey: 'secret',
        publicData: 'visible'
      }
      const output = createSafeMetadata(input)

      expect(output.userId).toBe('123')
      expect(output.email).toContain('[EMAIL]')
      expect(output.apiKey).toBe('[REDACTED]')
      expect(output.publicData).toBe('visible')
    })

    it('should not mutate original object', () => {
      const input = { password: 'secret' }
      const output = createSafeMetadata(input)

      expect(input.password).toBe('secret')
      expect(output.password).toBe('[REDACTED]')
    })

    it('should handle null/undefined', () => {
      expect(createSafeMetadata(null)).toBeNull()
      expect(createSafeMetadata(undefined)).toBeNull()
    })
  })

  describe('getStatusCategory', () => {
    it('should categorize 2xx as success', () => {
      expect(getStatusCategory(200)).toBe('success')
      expect(getStatusCategory(201)).toBe('success')
      expect(getStatusCategory(204)).toBe('success')
    })

    it('should categorize 3xx as success', () => {
      expect(getStatusCategory(301)).toBe('success')
      expect(getStatusCategory(304)).toBe('success')
    })

    it('should categorize 4xx as client_error', () => {
      expect(getStatusCategory(400)).toBe('client_error')
      expect(getStatusCategory(404)).toBe('client_error')
      expect(getStatusCategory(429)).toBe('client_error')
    })

    it('should categorize 5xx as server_error', () => {
      expect(getStatusCategory(500)).toBe('server_error')
      expect(getStatusCategory(502)).toBe('server_error')
      expect(getStatusCategory(504)).toBe('server_error')
    })
  })

  describe('formatBytes', () => {
    it('should format bytes correctly', () => {
      expect(formatBytes(0)).toBe('0 B')
      expect(formatBytes(1024)).toBe('1.00 KB')
      expect(formatBytes(1024 * 1024)).toBe('1.00 MB')
      expect(formatBytes(1024 * 1024 * 1024)).toBe('1.00 GB')
    })
  })

  describe('formatDuration', () => {
    it('should format milliseconds', () => {
      expect(formatDuration(100)).toBe('100ms')
      expect(formatDuration(999)).toBe('999ms')
    })

    it('should format seconds', () => {
      expect(formatDuration(1000)).toBe('1.00s')
      expect(formatDuration(5500)).toBe('5.50s')
    })

    it('should format minutes', () => {
      expect(formatDuration(60000)).toBe('1.00min')
      expect(formatDuration(125000)).toBe('2.08min')
    })
  })

  describe('isRetryableError', () => {
    it('should identify retryable network errors', () => {
      expect(isRetryableError({ code: 'ECONNRESET' })).toBe(true)
      expect(isRetryableError({ code: 'ETIMEDOUT' })).toBe(true)
      expect(isRetryableError({ code: 'ENOTFOUND' })).toBe(true)
    })

    it('should identify retryable HTTP status codes', () => {
      expect(isRetryableError({ status: 429 })).toBe(true)
      expect(isRetryableError({ status: 503 })).toBe(true)
      expect(isRetryableError({ status: 504 })).toBe(true)
    })

    it('should reject non-retryable errors', () => {
      expect(isRetryableError({ code: 'INVALID_INPUT' })).toBe(false)
      expect(isRetryableError({ status: 400 })).toBe(false)
      expect(isRetryableError({ status: 404 })).toBe(false)
    })
  })

  describe('extractProvider', () => {
    it('should extract provider from URL', () => {
      expect(extractProvider('https://api.vopay.com/balance')).toBe('vopay')
      expect(extractProvider('https://oauth.platform.intuit.com/oauth2')).toBe('quickbooks')
      expect(extractProvider('https://api.resend.com/emails')).toBe('resend')
      expect(extractProvider('https://google.com/search')).toBe('google')
    })

    it('should return hostname for unknown providers', () => {
      expect(extractProvider('https://api.unknown.com/v1/data')).toBe('api.unknown.com')
    })

    it('should handle invalid URLs', () => {
      expect(extractProvider('not-a-url')).toBe('unknown')
    })
  })

  describe('classifySource', () => {
    it('should classify webhook paths', () => {
      expect(classifySource('/api/webhooks/vopay')).toBe('webhook')
      expect(classifySource('/api/webhooks/quickbooks')).toBe('webhook')
    })

    it('should classify cron paths', () => {
      expect(classifySource('/api/cron/seo-collect')).toBe('cron')
      expect(classifySource('/api/cron/daily-cleanup')).toBe('cron')
    })

    it('should classify internal paths', () => {
      expect(classifySource('/api/internal/metrics')).toBe('internal')
    })

    it('should classify web paths', () => {
      expect(classifySource('/api/contact/route')).toBe('web')
      expect(classifySource('/api/admin/messages')).toBe('web')
    })
  })

  describe('extractRoutePattern', () => {
    it('should replace UUIDs with placeholder', () => {
      const path = '/api/admin/messages/123e4567-e89b-12d3-a456-426614174000'
      expect(extractRoutePattern(path)).toBe('/api/admin/messages/[uuid]')
    })

    it('should replace numeric IDs', () => {
      expect(extractRoutePattern('/api/users/123')).toBe('/api/users/[id]')
      expect(extractRoutePattern('/api/posts/456/comments/789')).toBe('/api/posts/[id]/comments/[id]')
    })

    it('should replace email addresses', () => {
      expect(extractRoutePattern('/api/users/test@example.com')).toBe('/api/users/[email]')
    })

    it('should handle static routes', () => {
      expect(extractRoutePattern('/api/health')).toBe('/api/health')
      expect(extractRoutePattern('/api/admin/dashboard')).toBe('/api/admin/dashboard')
    })
  })
})
