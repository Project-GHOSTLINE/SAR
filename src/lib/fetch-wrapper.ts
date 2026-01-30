/**
 * Fetch Wrapper - Auto-inject visit headers
 *
 * Wraps native fetch to automatically include x-sar-visit-id header
 * on all API calls to your domain.
 *
 * Usage:
 *   import { fetchWithVisit } from '@/lib/fetch-wrapper'
 *
 *   // Instead of fetch()
 *   const res = await fetchWithVisit('/api/...')
 *
 * Or globally override fetch (use with caution):
 *   import { installFetchInterceptor } from '@/lib/fetch-wrapper'
 *   installFetchInterceptor() // Call in root layout
 */

import { getVisitHeaders } from './visit-tracking';

/**
 * Fetch with automatic visit headers
 */
export async function fetchWithVisit(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  // Get visit headers
  const visitHeaders = getVisitHeaders();

  // Merge headers
  const headers = new Headers(init?.headers);
  Object.entries(visitHeaders).forEach(([key, value]) => {
    headers.set(key, value);
  });

  // Make request
  return fetch(input, {
    ...init,
    headers,
  });
}

/**
 * Install global fetch interceptor
 * This wraps window.fetch to automatically inject visit headers
 *
 * ⚠️ Use with caution - only intercepts same-origin requests
 */
export function installFetchInterceptor() {
  if (typeof window === 'undefined') {
    return;
  }

  const originalFetch = window.fetch;

  window.fetch = async function (
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response> {
    // Get URL
    const url =
      typeof input === 'string'
        ? input
        : input instanceof URL
        ? input.href
        : input.url;

    // Only inject headers for same-origin requests
    const isSameOrigin =
      url.startsWith('/') ||
      url.startsWith(window.location.origin) ||
      url.startsWith('http://localhost') ||
      url.startsWith('http://127.0.0.1');

    if (!isSameOrigin) {
      return originalFetch(input, init);
    }

    // Get visit headers
    const visitHeaders = getVisitHeaders();

    // Merge headers
    const headers = new Headers(init?.headers);
    Object.entries(visitHeaders).forEach(([key, value]) => {
      // Don't override if already set
      if (!headers.has(key)) {
        headers.set(key, value);
      }
    });

    // Make request
    return originalFetch(input, {
      ...init,
      headers,
    });
  };

  if (process.env.NODE_ENV === 'development') {
    console.log('[Fetch Interceptor] Installed - visit headers will be auto-injected');
  }
}
