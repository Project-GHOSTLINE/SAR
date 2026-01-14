/**
 * ⏱️ Rate Limiter
 * Protection contre les abus et spam
 */

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

interface RateLimitConfig {
  maxRequests: number // Nombre maximum de requêtes
  windowMs: number // Fenêtre de temps en ms
  identifier: string // Clé unique (IP, email, etc.)
}

interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: Date
}

// Cache en mémoire pour performance (éviter DB calls constants)
const cache = new Map<
  string,
  { count: number; resetAt: number }
>()

/**
 * Vérifier si une requête est rate limited
 */
export async function checkRateLimit(
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const { maxRequests, windowMs, identifier } = config
  const now = Date.now()
  const cacheKey = `ratelimit:${identifier}`

  // Vérifier le cache d'abord
  let entry = cache.get(cacheKey)

  // Si entry expirée, la supprimer
  if (entry && entry.resetAt < now) {
    cache.delete(cacheKey)
    entry = undefined
  }

  // Si pas d'entry, en créer une
  if (!entry) {
    entry = {
      count: 1,
      resetAt: now + windowMs,
    }
    cache.set(cacheKey, entry)

    return {
      allowed: true,
      remaining: maxRequests - 1,
      resetAt: new Date(entry.resetAt),
    }
  }

  // Incrémenter le compteur
  entry.count++

  // Vérifier si limite dépassée
  if (entry.count > maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: new Date(entry.resetAt),
    }
  }

  return {
    allowed: true,
    remaining: maxRequests - entry.count,
    resetAt: new Date(entry.resetAt),
  }
}

/**
 * Rate limiter spécifique pour soumission de formulaires
 * 3 soumissions par IP par heure
 */
export async function rateLimitFormSubmission(ipAddress: string): Promise<RateLimitResult> {
  return checkRateLimit({
    maxRequests: 3,
    windowMs: 60 * 60 * 1000, // 1 heure
    identifier: `form:${ipAddress}`,
  })
}

/**
 * Rate limiter pour API keys
 */
export async function rateLimitAPIKey(apiKeyId: string): Promise<RateLimitResult> {
  // Récupérer la limite de l'API key depuis la DB
  const { data: apiKey } = await supabase
    .from('api_keys')
    .select('rate_limit_per_hour')
    .eq('id', apiKeyId)
    .single()

  const maxRequests = apiKey?.rate_limit_per_hour || 1000

  return checkRateLimit({
    maxRequests,
    windowMs: 60 * 60 * 1000, // 1 heure
    identifier: `apikey:${apiKeyId}`,
  })
}

/**
 * Nettoyer le cache (à appeler périodiquement)
 */
export function cleanupRateLimitCache(): void {
  const now = Date.now()
  const entries = Array.from(cache.entries())
  for (const [key, entry] of entries) {
    if (entry.resetAt < now) {
      cache.delete(key)
    }
  }
}

// Nettoyer le cache toutes les 5 minutes
if (typeof window === 'undefined') {
  // Seulement côté serveur
  setInterval(cleanupRateLimitCache, 5 * 60 * 1000)
}
