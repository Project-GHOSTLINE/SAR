/**
 * Lib pour matcher les paths dynamiques avec le catalog
 * Ex: /api/clients/uuid123 -> /api/clients/:id
 */

import { catalog } from '@/data/catalog-export';

export interface RouteMatch {
  id: string;
  catalogPath: string;
  method: string;
  params: Record<string, string>;
}

/**
 * Normalise un path pour matching
 * /api/applications/RL55202 -> /api/applications/:ref
 * /api/clients/uuid -> /api/clients/:id
 */
export function normalizePathPattern(path: string): string {
  return path
    // UUID v4
    .replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/gi, '/:uuid')
    // Refs style RL\d+
    .replace(/\/RL\d+/g, '/:ref')
    // Numeric IDs
    .replace(/\/\d+$/g, '/:id')
    // IPs
    .replace(/\/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/g, '/:ip')
    // Long tokens/hashes
    .replace(/\/[a-zA-Z0-9_-]{32,}/g, '/:token');
}

/**
 * Matcher un path réel avec une route du catalog
 */
export function matchRoute(method: string, path: string): RouteMatch | null {
  // Essayer match exact d'abord
  const exactMatch = catalog.routes.find(
    r => r.methods.includes(method) && r.path === path
  );

  if (exactMatch) {
    return {
      id: exactMatch.id,
      catalogPath: exactMatch.path,
      method,
      params: {}
    };
  }

  // Essayer match avec params
  const normalized = normalizePathPattern(path);
  const paramMatch = catalog.routes.find(
    r => r.methods.includes(method) && normalizePathPattern(r.path) === normalized
  );

  if (paramMatch) {
    const params = extractParams(paramMatch.path, path);
    return {
      id: paramMatch.id,
      catalogPath: paramMatch.path,
      method,
      params
    };
  }

  return null;
}

/**
 * Extraire les params d'un path
 * catalogPath: /api/clients/:id
 * actualPath: /api/clients/abc123
 * -> { id: 'abc123' }
 */
function extractParams(catalogPath: string, actualPath: string): Record<string, string> {
  const catalogParts = catalogPath.split('/');
  const actualParts = actualPath.split('/');
  const params: Record<string, string> = {};

  for (let i = 0; i < catalogParts.length; i++) {
    const part = catalogParts[i];
    if (part.startsWith(':')) {
      const key = part.slice(1);
      params[key] = actualParts[i] || '';
    }
  }

  return params;
}

/**
 * Get route by ID
 */
export function getRouteById(id: string) {
  return catalog.routes.find(r => r.id === id);
}

/**
 * Search routes
 */
export function searchRoutes(query: string) {
  const q = query.toLowerCase();
  return catalog.routes.filter(r =>
    r.path.toLowerCase().includes(q) ||
    r.description.toLowerCase().includes(q) ||
    (r as any).tablesTouched?.some((t: string) => t.toLowerCase().includes(q))
  );
}

/**
 * Get all catalog
 */
export function getCatalog() {
  return catalog;
}
