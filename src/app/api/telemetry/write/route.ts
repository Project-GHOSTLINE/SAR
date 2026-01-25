/**
 * API: POST /api/telemetry/write
 *
 * Purpose: Write telemetry data to Supabase
 * Security: Internal use only, requires TELEMETRY_WRITE_KEY
 * Method: Direct INSERT into telemetry tables
 */

import { getSupabaseServer } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const writeKey = request.headers.get('x-telemetry-key')
    const expectedKey = process.env.TELEMETRY_WRITE_KEY || 'dev-key'

    if (writeKey !== expectedKey) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { type, data } = await request.json()

    if (!type || !data) {
      return NextResponse.json({ error: 'Missing type or data' }, { status: 400 })
    }

    const supabase = getSupabaseServer()

    let tableName: string
    switch (type) {
      case 'request':
        tableName = 'telemetry_requests'
        break
      case 'span':
        tableName = 'telemetry_spans'
        break
      case 'security':
        tableName = 'telemetry_security'
        break
      default:
        return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
    }

    const { data: inserted, error } = await supabase
      .from(tableName)
      .insert(data)
      .select('id')
      .single()

    if (error) {
      console.error(`[telemetry] Write error (${type}):`, error)
      return NextResponse.json({ error: 'Failed to write telemetry', details: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, id: inserted.id, type })
  } catch (error) {
    console.error('[telemetry] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
