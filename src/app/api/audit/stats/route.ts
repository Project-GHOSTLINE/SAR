import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    )

    const { data, error } = await supabase
      .from('vw_audit_stats_by_table')
      .select('*')

    if (error) {
      console.error('Audit stats error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (data) {
      const totalEvents = data.reduce((sum, row) => sum + row.event_count, 0)
      const uniqueTables = new Set(data.map(row => row.table_name)).size

      const stats = {
        total_events: totalEvents,
        unique_tables: uniqueTables,
        by_operation: data.reduce((acc: any, row) => {
          acc[row.operation] = (acc[row.operation] || 0) + row.event_count
          return acc
        }, {})
      }

      return NextResponse.json(stats)
    }

    return NextResponse.json({ total_events: 0, unique_tables: 0, by_operation: {} })
  } catch (err: any) {
    console.error('Audit stats API error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
