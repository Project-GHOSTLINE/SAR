/**
 * TESTS: Telemetry Context (AsyncLocalStorage)
 *
 * Unit tests for trace context management
 */

import {
  createTraceContext,
  getTraceContext,
  runWithTraceContext,
  updateTraceContext,
  incrementDbCall,
  incrementSpanCount,
  hashWithSalt,
  extractRequestMetadata,
  isInTraceContext,
  getTraceIdSafe,
  getTelemetryPerfContext,
} from '../context'

describe('Telemetry Context', () => {
  describe('createTraceContext', () => {
    it('should create valid trace context', () => {
      const ctx = createTraceContext({
        method: 'GET',
        path: '/api/test'
      })

      expect(ctx.traceId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
      expect(ctx.requestId).toMatch(/^req_\d+_[a-z0-9]+$/)
      expect(ctx.method).toBe('GET')
      expect(ctx.path).toBe('/api/test')
      expect(ctx.source).toBe('web')
      expect(ctx.dbCallCount).toBe(0)
      expect(ctx.dbTotalMs).toBe(0)
      expect(ctx.spanCount).toBe(0)
    })

    it('should classify webhook source', () => {
      const ctx = createTraceContext({
        method: 'POST',
        path: '/api/webhooks/vopay'
      })

      expect(ctx.source).toBe('web') // Default, unless explicitly set
    })

    it('should set admin role', () => {
      const ctx = createTraceContext({
        method: 'GET',
        path: '/api/admin/messages',
        role: 'admin'
      })

      expect(ctx.role).toBe('admin')
      expect(ctx.isAdmin).toBe(true)
    })

    it('should set environment correctly', () => {
      const originalEnv = process.env.NODE_ENV

      process.env.NODE_ENV = 'production'
      const prodCtx = createTraceContext({ method: 'GET', path: '/' })
      expect(prodCtx.env).toBe('production')

      process.env.NODE_ENV = 'development'
      const devCtx = createTraceContext({ method: 'GET', path: '/' })
      expect(devCtx.env).toBe('development')

      process.env.NODE_ENV = originalEnv
    })
  })

  describe('runWithTraceContext', () => {
    it('should run function with trace context', () => {
      const ctx = createTraceContext({ method: 'GET', path: '/test' })

      const result = runWithTraceContext(ctx, () => {
        const currentCtx = getTraceContext()
        expect(currentCtx).toBeDefined()
        expect(currentCtx?.traceId).toBe(ctx.traceId)
        return 'success'
      })

      expect(result).toBe('success')
    })

    it('should isolate contexts', () => {
      const ctx1 = createTraceContext({ method: 'GET', path: '/test1' })
      const ctx2 = createTraceContext({ method: 'GET', path: '/test2' })

      runWithTraceContext(ctx1, () => {
        const current = getTraceContext()
        expect(current?.path).toBe('/test1')

        runWithTraceContext(ctx2, () => {
          const nested = getTraceContext()
          expect(nested?.path).toBe('/test2')
        })

        // Back to ctx1
        const after = getTraceContext()
        expect(after?.path).toBe('/test1')
      })
    })
  })

  describe('getTraceContext', () => {
    it('should return undefined when not in context', () => {
      const ctx = getTraceContext()
      expect(ctx).toBeUndefined()
    })

    it('should return context when in trace', () => {
      const ctx = createTraceContext({ method: 'GET', path: '/test' })

      runWithTraceContext(ctx, () => {
        const current = getTraceContext()
        expect(current).toBeDefined()
        expect(current?.traceId).toBe(ctx.traceId)
      })
    })
  })

  describe('updateTraceContext', () => {
    it('should update context fields', () => {
      const ctx = createTraceContext({ method: 'GET', path: '/test' })

      runWithTraceContext(ctx, () => {
        const before = getTraceContext()
        expect(before?.userId).toBeUndefined()

        updateTraceContext({ userId: 'user123' })

        const after = getTraceContext()
        expect(after?.userId).toBe('user123')
      })
    })

    it('should handle no context gracefully', () => {
      expect(() => updateTraceContext({ userId: 'test' })).not.toThrow()
    })
  })

  describe('incrementDbCall', () => {
    it('should increment DB call counters', () => {
      const ctx = createTraceContext({ method: 'GET', path: '/test' })

      runWithTraceContext(ctx, () => {
        expect(ctx.dbCallCount).toBe(0)
        expect(ctx.dbTotalMs).toBe(0)

        incrementDbCall(50)
        expect(ctx.dbCallCount).toBe(1)
        expect(ctx.dbTotalMs).toBe(50)

        incrementDbCall(100)
        expect(ctx.dbCallCount).toBe(2)
        expect(ctx.dbTotalMs).toBe(150)
      })
    })

    it('should handle no context gracefully', () => {
      expect(() => incrementDbCall(100)).not.toThrow()
    })
  })

  describe('incrementSpanCount', () => {
    it('should increment span counter', () => {
      const ctx = createTraceContext({ method: 'GET', path: '/test' })

      runWithTraceContext(ctx, () => {
        expect(ctx.spanCount).toBe(0)

        incrementSpanCount()
        expect(ctx.spanCount).toBe(1)

        incrementSpanCount()
        expect(ctx.spanCount).toBe(2)
      })
    })

    it('should handle no context gracefully', () => {
      expect(() => incrementSpanCount()).not.toThrow()
    })
  })

  describe('hashWithSalt', () => {
    it('should hash values consistently', () => {
      const hash1 = hashWithSalt('test@example.com')
      const hash2 = hashWithSalt('test@example.com')
      expect(hash1).toBe(hash2)
    })

    it('should produce different hashes for different values', () => {
      const hash1 = hashWithSalt('value1')
      const hash2 = hashWithSalt('value2')
      expect(hash1).not.toBe(hash2)
    })

    it('should produce 16 character hash', () => {
      const hash = hashWithSalt('test')
      expect(hash).toHaveLength(16)
    })
  })

  describe('extractRequestMetadata', () => {
    it('should extract IP and UA', () => {
      const mockRequest = {
        headers: new Headers({
          'x-forwarded-for': '192.168.1.1, 10.0.0.1',
          'user-agent': 'Mozilla/5.0'
        })
      } as Request

      const metadata = extractRequestMetadata(mockRequest)

      expect(metadata.ipHash).toBeDefined()
      expect(metadata.uaHash).toBeDefined()
      expect(metadata.ipHash).toHaveLength(16)
      expect(metadata.uaHash).toHaveLength(16)
    })

    it('should handle missing headers', () => {
      const mockRequest = {
        headers: new Headers()
      } as Request

      const metadata = extractRequestMetadata(mockRequest)

      expect(metadata.ipHash).toBeUndefined()
      expect(metadata.uaHash).toBeUndefined()
    })

    it('should extract Vercel headers', () => {
      const mockRequest = {
        headers: new Headers({
          'x-vercel-id': 'req_abc123',
          'x-vercel-deployment-url': 'sar-git-main.vercel.app'
        })
      } as Request

      const metadata = extractRequestMetadata(mockRequest)

      expect(metadata.vercelId).toBe('req_abc123')
      expect(metadata.vercelRegion).toBe('sar-git-main')
    })
  })

  describe('isInTraceContext', () => {
    it('should return false when not in context', () => {
      expect(isInTraceContext()).toBe(false)
    })

    it('should return true when in context', () => {
      const ctx = createTraceContext({ method: 'GET', path: '/test' })

      runWithTraceContext(ctx, () => {
        expect(isInTraceContext()).toBe(true)
      })
    })
  })

  describe('getTraceIdSafe', () => {
    it('should return no-trace when not in context', () => {
      expect(getTraceIdSafe()).toBe('no-trace')
    })

    it('should return trace ID when in context', () => {
      const ctx = createTraceContext({ method: 'GET', path: '/test' })

      runWithTraceContext(ctx, () => {
        expect(getTraceIdSafe()).toBe(ctx.traceId)
      })
    })
  })

  describe('getTelemetryPerfContext', () => {
    it('should return null when not in context', () => {
      expect(getTelemetryPerfContext()).toBeNull()
    })

    it('should return compatible perf context', () => {
      const ctx = createTraceContext({ method: 'GET', path: '/api/test' })

      runWithTraceContext(ctx, () => {
        incrementDbCall(50)
        incrementDbCall(100)

        const perfCtx = getTelemetryPerfContext()

        expect(perfCtx).not.toBeNull()
        expect(perfCtx?.requestId).toBe(ctx.requestId)
        expect(perfCtx?.route).toBe('/api/test')
        expect(perfCtx?.dbCalls).toBe(2)
        expect(perfCtx?.dbMsTotal).toBe(150)
      })
    })
  })
})
