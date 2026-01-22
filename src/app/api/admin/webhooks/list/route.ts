import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'
import { jwtVerify } from 'jose'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

const JWT_SECRET = process.env.JWT_SECRET || 'sar-admin-secret-key-2024'

interface WebhookFilters {
  provider?: string
  event_type?: string
  status?: string
  environment?: string
  date_from?: string
  date_to?: string
  limit?: number
  offset?: number
}

export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication with JWT
    const token = request.cookies.get('admin-session')?.value

    if (!token) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        {
          status: 401,
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate, private, max-age=0',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        }
      )
    }

    // Verify JWT validity
    try {
      const secret = new TextEncoder().encode(JWT_SECRET)
      await jwtVerify(token, secret)
    } catch {
      return NextResponse.json(
        { error: 'Session invalide' },
        {
          status: 401,
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate, private, max-age=0',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        }
      )
    }

    const supabase = getSupabase()
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database unavailable' },
        { status: 500 }
      )
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const filters: WebhookFilters = {
      provider: searchParams.get('provider') || undefined,
      event_type: searchParams.get('event_type') || undefined,
      status: searchParams.get('status') || undefined,
      environment: searchParams.get('environment') || 'production', // Default to production only
      date_from: searchParams.get('date_from') || undefined,
      date_to: searchParams.get('date_to') || undefined,
      limit: parseInt(searchParams.get('limit') || '100'),
      offset: parseInt(searchParams.get('offset') || '0')
    }

    // Build query with filters
    let query = supabase
      .from('webhook_logs')
      .select('*', { count: 'exact' })
      .order('received_at', { ascending: false })

    // Apply filters
    if (filters.provider) {
      query = query.eq('provider', filters.provider)
    }
    if (filters.event_type) {
      query = query.eq('event_type', filters.event_type)
    }
    if (filters.status) {
      query = query.eq('status', filters.status)
    }
    if (filters.environment) {
      query = query.eq('environment', filters.environment)
    }
    if (filters.date_from) {
      query = query.gte('received_at', filters.date_from)
    }
    if (filters.date_to) {
      query = query.lte('received_at', filters.date_to)
    }

    // Apply pagination
    const offset = filters.offset || 0
    const limit = filters.limit || 100
    query = query.range(offset, offset + limit - 1)

    const { data: webhooks, error, count } = await query

    if (error) {
      console.error('Error fetching webhooks:', error)
      return NextResponse.json(
        { error: 'Failed to fetch webhooks', details: error.message },
        { status: 500 }
      )
    }

    // Get aggregate stats
    const statsQuery = supabase
      .from('webhook_logs')
      .select('provider, status, processing_time_ms')

    let statsQueryWithFilters = statsQuery
    if (filters.provider) {
      statsQueryWithFilters = statsQueryWithFilters.eq('provider', filters.provider)
    }
    if (filters.environment) {
      statsQueryWithFilters = statsQueryWithFilters.eq('environment', filters.environment)
    }
    if (filters.date_from) {
      statsQueryWithFilters = statsQueryWithFilters.gte('received_at', filters.date_from)
    }
    if (filters.date_to) {
      statsQueryWithFilters = statsQueryWithFilters.lte('received_at', filters.date_to)
    }

    const { data: statsData } = await statsQueryWithFilters

    // Calculate stats
    const stats = {
      total: count || 0,
      by_status: {
        received: 0,
        processing: 0,
        completed: 0,
        failed: 0,
        retrying: 0
      },
      by_provider: {} as Record<string, number>,
      avg_processing_time_ms: 0,
      success_rate: 0
    }

    if (statsData && statsData.length > 0) {
      let totalProcessingTime = 0
      let processedCount = 0

      statsData.forEach((item: any) => {
        // Count by status
        if (item.status) {
          stats.by_status[item.status as keyof typeof stats.by_status] =
            (stats.by_status[item.status as keyof typeof stats.by_status] || 0) + 1
        }

        // Count by provider
        if (item.provider) {
          stats.by_provider[item.provider] = (stats.by_provider[item.provider] || 0) + 1
        }

        // Calculate avg processing time
        if (item.processing_time_ms) {
          totalProcessingTime += item.processing_time_ms
          processedCount++
        }
      })

      // Calculate averages
      if (processedCount > 0) {
        stats.avg_processing_time_ms = Math.round(totalProcessingTime / processedCount)
      }

      // Calculate success rate
      const totalProcessed = stats.by_status.completed + stats.by_status.failed
      if (totalProcessed > 0) {
        stats.success_rate = Math.round((stats.by_status.completed / totalProcessed) * 100)
      }
    }

    // Get unique event types for filters
    const { data: eventTypes } = await supabase
      .from('webhook_logs')
      .select('event_type')
      .order('event_type')

    const uniqueEventTypes = Array.from(new Set(eventTypes?.map(e => e.event_type) || []))

    return NextResponse.json(
      {
        success: true,
        webhooks: webhooks || [],
        pagination: {
          total: count || 0,
          limit: limit,
          offset: offset,
          has_more: (count || 0) > (offset + limit)
        },
        stats,
        filters: {
          available_event_types: uniqueEventTypes,
          available_providers: ['vopay', 'flinks', 'quickbooks'],
          available_statuses: ['received', 'processing', 'completed', 'failed', 'retrying'],
          available_environments: ['production', 'sandbox', 'test']
        }
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, private, max-age=0',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      }
    )
  } catch (error) {
    console.error('Error in /api/admin/webhooks/list:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
