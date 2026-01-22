import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'
import { jwtVerify } from 'jose'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const JWT_SECRET = process.env.JWT_SECRET || 'sar-admin-secret-key-2024'

export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication
    const token = request.cookies.get('admin-session')?.value

    if (!token) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    try {
      const secret = new TextEncoder().encode(JWT_SECRET)
      await jwtVerify(token, secret)
    } catch {
      return NextResponse.json({ error: 'Session invalide' }, { status: 401 })
    }

    const supabase = getSupabase()
    if (!supabase) {
      return NextResponse.json({ error: 'Database unavailable' }, { status: 500 })
    }

    // Parse filters
    const { searchParams } = new URL(request.url)
    const provider = searchParams.get('provider')
    const status = searchParams.get('status')
    const dateFrom = searchParams.get('date_from')
    const dateTo = searchParams.get('date_to')

    // Build query
    let query = supabase
      .from('webhook_logs')
      .select('*')
      .order('received_at', { ascending: false })
      .limit(1000) // Limit export to 1000 records

    if (provider) query = query.eq('provider', provider)
    if (status) query = query.eq('status', status)
    if (dateFrom) query = query.gte('received_at', dateFrom)
    if (dateTo) query = query.lte('received_at', dateTo)

    const { data: webhooks, error } = await query

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch webhooks', details: error.message },
        { status: 500 }
      )
    }

    // Generate CSV
    const headers = [
      'ID',
      'Provider',
      'Event Type',
      'Status',
      'External ID',
      'Environment',
      'Processing Time (ms)',
      'Retry Count',
      'Error Message',
      'Received At',
      'Processed At'
    ]

    const rows = webhooks?.map(w => [
      w.id,
      w.provider,
      w.event_type,
      w.status,
      w.external_id || '',
      w.environment,
      w.processing_time_ms || '',
      w.retry_count || 0,
      w.error_message || '',
      new Date(w.received_at).toISOString(),
      w.processed_at ? new Date(w.processed_at).toISOString() : ''
    ]) || []

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n')

    const filename = `webhooks_export_${new Date().toISOString().split('T')[0]}.csv`

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`
      }
    })
  } catch (error) {
    console.error('Error in /api/admin/webhooks/export:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
