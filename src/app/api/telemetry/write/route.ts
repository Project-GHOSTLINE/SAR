/**
 * Internal API: Write telemetry to DB
 * Called by middleware (fire-and-forget)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase-server'

export const runtime = 'nodejs' // Use Node.js runtime for DB access

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const supabase = getSupabaseServer()

    // Write to telemetry_requests
    const { error } = await supabase
      .from('telemetry_requests')
      .insert(body)

    if (error) {
      console.error('[Telemetry Write] Error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (err) {
    console.error('[Telemetry Write] Exception:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
