/**
 * Route ID Mapper
 *
 * Génère des IDs stables pour les routes API
 * Exemple: POST /api/telemetry/track-event -> telemetry_track_event
 */

/**
 * Génère un ID stable pour une route API
 */
export function generateRouteId(method: string, path: string): string {
  const cleanPath = path
    .replace(/^\/api\//, '') // Enlever /api/
    .replace(/\//g, '_') // Remplacer / par _
    .replace(/[:\-\[\]]/g, '_') // Remplacer caractères spéciaux
    .replace(/_+/g, '_') // Fusionner underscores multiples
    .replace(/^_|_$/g, '') // Trim underscores

  return `${method.toLowerCase()}_${cleanPath}`
}

/**
 * Normalise un path dynamique vers un pattern
 * /api/clients/550e8400 -> /api/clients/:id
 * /api/applications/RL55202 -> /api/applications/:ref
 */
export function toPathPattern(path: string): string {
  return path
    // UUID (8-4-4-4-12)
    .replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(\/|$)/gi, '/:uuid$1')
    // UUID court (sans tirets)
    .replace(/\/[0-9a-f]{32}(\/|$)/gi, '/:uuid$1')
    // RL + chiffres (références SAR)
    .replace(/\/RL\d+(\/|$)/g, '/:ref$1')
    .replace(/\/SAR-\d+(\/|$)/g, '/:ref$1')
    // Nombres purs (IDs)
    .replace(/\/\d+(\/|$)/g, '/:id$1')
    // Emails
    .replace(/\/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(\/|$)/g, '/:email$1')
    // Tokens longs (32+ caractères alphanumériques)
    .replace(/\/[a-zA-Z0-9]{32,}(\/|$)/g, '/:token$1')
}

/**
 * Parse un path avec query params
 */
export function parsePathWithQuery(fullPath: string): { path: string; query: Record<string, string> } {
  const [path, queryString] = fullPath.split('?')
  const query: Record<string, string> = {}

  if (queryString) {
    const params = new URLSearchParams(queryString)
    params.forEach((value, key) => {
      query[key] = value
    })
  }

  return { path, query }
}

/**
 * Match un path réel contre un pattern
 * /api/clients/123 match /api/clients/:id
 */
export function matchPathPattern(realPath: string, pattern: string): boolean {
  const realParts = realPath.split('/').filter(Boolean)
  const patternParts = pattern.split('/').filter(Boolean)

  if (realParts.length !== patternParts.length) {
    return false
  }

  for (let i = 0; i < realParts.length; i++) {
    const realPart = realParts[i]
    const patternPart = patternParts[i]

    // Si c'est un param dynamique, ça match toujours
    if (patternPart.startsWith(':')) {
      continue
    }

    // Sinon, doit être identique
    if (realPart !== patternPart) {
      return false
    }
  }

  return true
}

/**
 * Trouve la route du catalogue qui correspond à un path réel
 */
export function findRouteByPath(
  method: string,
  realPath: string,
  catalog: Array<{ path: string; methods: string[] }>
): typeof catalog[0] | null {
  // 1. Chercher un match exact
  const exactMatch = catalog.find(
    r => r.path === realPath && r.methods.includes(method.toUpperCase())
  )
  if (exactMatch) return exactMatch

  // 2. Chercher un match par pattern
  const patternMatch = catalog.find(r => {
    if (!r.methods.includes(method.toUpperCase())) return false
    return matchPathPattern(realPath, r.path)
  })

  return patternMatch || null
}
