/**
 * Simple In-Memory Cache - PHASE 3.3
 *
 * Purpose: Cache expensive operations (external APIs, heavy aggregations)
 * Use case: Analytics dashboard KPIs (Google Analytics calls are slow + expensive)
 *
 * TTL: 5 minutes (300s) default - analytics don't need to be real-time
 *
 * Usage:
 * ```typescript
 * import { getOrSet } from '@/lib/cache'
 *
 * const data = await getOrSet('dashboard:7d', async () => {
 *   return await fetchExpensiveData()
 * }, 300) // 5 minutes TTL
 * ```
 */

interface CacheEntry<T> {
  value: T
  expiresAt: number
}

// Global cache store (in-memory)
const cache = new Map<string, CacheEntry<any>>()

// Stats for monitoring
export interface CacheStats {
  hits: number
  misses: number
  size: number
  keys: string[]
}

let cacheHits = 0
let cacheMisses = 0

/**
 * Get value from cache or compute it
 *
 * @param key - Unique cache key
 * @param computeFn - Async function to compute value if not cached
 * @param ttlSeconds - Time to live in seconds (default: 300s = 5 min)
 * @returns Cached or computed value
 */
export async function getOrSet<T>(
  key: string,
  computeFn: () => Promise<T>,
  ttlSeconds: number = 300
): Promise<T> {
  const now = Date.now()
  const entry = cache.get(key)

  // Cache hit
  if (entry && entry.expiresAt > now) {
    cacheHits++
    console.log(`[CACHE] HIT: ${key} (expires in ${Math.round((entry.expiresAt - now) / 1000)}s)`)
    return entry.value
  }

  // Cache miss - compute value
  cacheMisses++
  console.log(`[CACHE] MISS: ${key} - computing...`)

  const value = await computeFn()

  // Store in cache with TTL
  cache.set(key, {
    value,
    expiresAt: now + (ttlSeconds * 1000)
  })

  console.log(`[CACHE] SET: ${key} (TTL: ${ttlSeconds}s)`)

  return value
}

/**
 * Invalidate (clear) cache entry
 *
 * @param key - Cache key to invalidate
 */
export function invalidate(key: string): void {
  if (cache.delete(key)) {
    console.log(`[CACHE] INVALIDATED: ${key}`)
  }
}

/**
 * Invalidate all cache entries matching a pattern
 *
 * @param pattern - Regex pattern or prefix string
 *
 * Example:
 * ```typescript
 * invalidatePattern('dashboard:') // Clears all dashboard caches
 * invalidatePattern(/^analytics:/) // Regex pattern
 * ```
 */
export function invalidatePattern(pattern: string | RegExp): void {
  const regex = typeof pattern === 'string' ? new RegExp(`^${pattern}`) : pattern
  let count = 0

  cache.forEach((_, key) => {
    if (regex.test(key)) {
      cache.delete(key)
      count++
    }
  })

  console.log(`[CACHE] INVALIDATED ${count} entries matching: ${pattern}`)
}

/**
 * Clear all cache entries
 */
export function clearAll(): void {
  const size = cache.size
  cache.clear()
  cacheHits = 0
  cacheMisses = 0
  console.log(`[CACHE] CLEARED: ${size} entries`)
}

/**
 * Get cache statistics
 */
export function getStats(): CacheStats {
  return {
    hits: cacheHits,
    misses: cacheMisses,
    size: cache.size,
    keys: Array.from(cache.keys())
  }
}

/**
 * Clean up expired entries (run periodically)
 */
export function cleanup(): void {
  const now = Date.now()
  let count = 0

  cache.forEach((entry, key) => {
    if (entry.expiresAt <= now) {
      cache.delete(key)
      count++
    }
  })

  if (count > 0) {
    console.log(`[CACHE] CLEANUP: Removed ${count} expired entries`)
  }
}

// Auto-cleanup every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(cleanup, 5 * 60 * 1000)
}

/**
 * Get value from cache without computing
 *
 * @param key - Cache key
 * @returns Cached value or undefined
 */
export function get<T>(key: string): T | undefined {
  const now = Date.now()
  const entry = cache.get(key)

  if (entry && entry.expiresAt > now) {
    return entry.value
  }

  return undefined
}

/**
 * Set value in cache
 *
 * @param key - Cache key
 * @param value - Value to cache
 * @param ttlSeconds - Time to live in seconds (default: 300s)
 */
export function set<T>(key: string, value: T, ttlSeconds: number = 300): void {
  const now = Date.now()

  cache.set(key, {
    value,
    expiresAt: now + (ttlSeconds * 1000)
  })

  console.log(`[CACHE] SET: ${key} (TTL: ${ttlSeconds}s)`)
}
