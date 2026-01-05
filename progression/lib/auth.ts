import { NextRequest } from 'next/server'

/**
 * Verify admin API key from request headers
 */
export function verifyAdminAuth(request: NextRequest): boolean {
  const apiKey = request.headers.get('x-api-key')

  if (!apiKey) {
    return false
  }

  const adminKey = process.env.ADMIN_API_KEY
  if (!adminKey) {
    console.error('ADMIN_API_KEY not configured')
    return false
  }

  return apiKey === adminKey
}
