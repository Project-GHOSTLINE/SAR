/**
 * QuickBooks API Client
 * Utility functions for interacting with QuickBooks Online API
 */

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export interface QuickBooksTokens {
  access_token: string
  realm_id: string
  expires_at: string
}

/**
 * Get valid QuickBooks access token
 * Automatically refreshes if expired
 */
export async function getValidAccessToken(): Promise<QuickBooksTokens | null> {
  try {
    const { data: tokens, error } = await supabase
      .from('quickbooks_tokens')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (error || !tokens) {
      console.error('No QuickBooks tokens found')
      return null
    }

    // Check if token needs refresh
    const expiryDate = new Date(tokens.expires_at)
    const now = new Date()

    if (expiryDate <= now) {
      // Token expired, refresh it
      const refreshed = await refreshToken(tokens.refresh_token)
      if (!refreshed) return null

      return {
        access_token: refreshed.access_token,
        realm_id: tokens.realm_id,
        expires_at: refreshed.expires_at
      }
    }

    return {
      access_token: tokens.access_token,
      realm_id: tokens.realm_id,
      expires_at: tokens.expires_at
    }

  } catch (error) {
    console.error('Error getting access token:', error)
    return null
  }
}

/**
 * Refresh expired access token
 */
async function refreshToken(refreshToken: string) {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL}/api/quickbooks/auth/refresh`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken })
      }
    )

    if (!response.ok) return null

    return await response.json()
  } catch (error) {
    console.error('Error refreshing token:', error)
    return null
  }
}

/**
 * Make API request to QuickBooks
 */
export async function quickbooksRequest<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T | null> {
  try {
    const tokens = await getValidAccessToken()
    if (!tokens) {
      throw new Error('No valid QuickBooks token available')
    }

    const baseUrl = process.env.INTUIT_ENVIRONMENT === 'production'
      ? 'https://quickbooks.api.intuit.com'
      : 'https://sandbox-quickbooks.api.intuit.com'

    const url = `${baseUrl}/v3/company/${tokens.realm_id}/${endpoint}`

    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${tokens.access_token}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        ...options?.headers
      }
    })

    if (!response.ok) {
      const error = await response.text()
      console.error(`QuickBooks API error (${response.status}):`, error)
      throw new Error(`QuickBooks API error: ${response.status}`)
    }

    return await response.json()

  } catch (error) {
    console.error('QuickBooks request error:', error)
    return null
  }
}

/**
 * Query QuickBooks entities with pagination
 */
export async function queryQuickBooks<T>(
  entity: string,
  query: string = '',
  startPosition: number = 1,
  maxResults: number = 1000
): Promise<T[]> {
  try {
    const fullQuery = query
      ? `SELECT * FROM ${entity} ${query} STARTPOSITION ${startPosition} MAXRESULTS ${maxResults}`
      : `SELECT * FROM ${entity} STARTPOSITION ${startPosition} MAXRESULTS ${maxResults}`

    const response = await quickbooksRequest<any>(
      `query?query=${encodeURIComponent(fullQuery)}`
    )

    if (!response || !response.QueryResponse) {
      return []
    }

    return response.QueryResponse[entity] || []

  } catch (error) {
    console.error(`Error querying ${entity}:`, error)
    return []
  }
}

/**
 * Get all entities with automatic pagination
 */
export async function getAllEntities<T>(
  entity: string,
  query: string = ''
): Promise<T[]> {
  const allResults: T[] = []
  let startPosition = 1
  const maxResults = 1000 // QuickBooks max per request

  while (true) {
    const results = await queryQuickBooks<T>(entity, query, startPosition, maxResults)

    if (results.length === 0) break

    allResults.push(...results)

    if (results.length < maxResults) {
      // Last page reached
      break
    }

    startPosition += maxResults
  }

  console.log(`✅ Fetched ${allResults.length} ${entity} records from QuickBooks`)
  return allResults
}

/**
 * Get single entity by ID
 */
export async function getEntityById<T>(
  entity: string,
  id: string
): Promise<T | null> {
  try {
    const response = await quickbooksRequest<any>(`${entity.toLowerCase()}/${id}`)
    return response?.[entity] || null
  } catch (error) {
    console.error(`Error getting ${entity} ${id}:`, error)
    return null
  }
}

/**
 * Create or update entity in QuickBooks
 */
export async function upsertEntity<T>(
  entity: string,
  data: any
): Promise<T | null> {
  try {
    const response = await quickbooksRequest<any>(entity.toLowerCase(), {
      method: 'POST',
      body: JSON.stringify(data)
    })

    return response?.[entity] || null
  } catch (error) {
    console.error(`Error upserting ${entity}:`, error)
    return null
  }
}
