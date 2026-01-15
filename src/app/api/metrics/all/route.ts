import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    )

    // 1. Tables principales
    const tables = ['clients', 'loans', 'communications', 'payment_events', 'vopay_objects',
                    'vopay_webhook_logs', 'audit_log', 'applications', 'payment_schedules']

    const tableCounts: any = {}
    for (const table of tables) {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true })

      tableCounts[table] = count || 0
    }

    // 2. Vues Timeline
    const { count: timelineCount } = await supabase
      .from('vw_client_timeline')
      .select('*', { count: 'exact', head: true })

    const { count: timelineByTypeCount } = await supabase
      .from('vw_client_timeline_by_type')
      .select('*', { count: 'exact', head: true })

    const { count: summaryCount } = await supabase
      .from('vw_client_summary')
      .select('*', { count: 'exact', head: true })

    // 3. Vues VoPay
    const { count: vopayByClientCount } = await supabase
      .from('vw_vopay_by_client')
      .select('*', { count: 'exact', head: true })

    const { count: vopayOrphansCount } = await supabase
      .from('vw_vopay_orphans')
      .select('*', { count: 'exact', head: true })

    const { count: vopayStatCount } = await supabase
      .from('vw_vopay_summary')
      .select('*', { count: 'exact', head: true })

    // 4. Vues Audit
    const { count: auditRecentCount } = await supabase
      .from('vw_audit_recent')
      .select('*', { count: 'exact', head: true })

    const { count: auditStatsCount } = await supabase
      .from('vw_audit_stats_by_table')
      .select('*', { count: 'exact', head: true })

    // 5. Vues Performance
    const { count: cacheHitCount } = await supabase
      .from('vw_performance_cache_hit_ratio')
      .select('*', { count: 'exact', head: true })

    const { count: tableSizesCount } = await supabase
      .from('vw_performance_table_sizes')
      .select('*', { count: 'exact', head: true })

    const { count: indexUsageCount } = await supabase
      .from('vw_performance_index_usage')
      .select('*', { count: 'exact', head: true })

    const { count: bloatCheckCount } = await supabase
      .from('vw_performance_bloat_check')
      .select('*', { count: 'exact', head: true })

    // 6. VoPay par status
    const { data: vopayByStatus } = await supabase
      .from('vopay_objects')
      .select('status')

    const vopayStatusCounts = vopayByStatus?.reduce((acc: any, row) => {
      const status = row.status || 'NULL'
      acc[status] = (acc[status] || 0) + 1
      return acc
    }, {}) || {}

    // 7. Communications par type
    const { data: commByType } = await supabase
      .from('communications')
      .select('communication_type')

    const commTypeCounts = commByType?.reduce((acc: any, row) => {
      const type = row.communication_type || 'NULL'
      acc[type] = (acc[type] || 0) + 1
      return acc
    }, {}) || {}

    // 8. Loans par status
    const { data: loansByStatus } = await supabase
      .from('loans')
      .select('status')

    const loanStatusCounts = loansByStatus?.reduce((acc: any, row) => {
      const status = row.status || 'NULL'
      acc[status] = (acc[status] || 0) + 1
      return acc
    }, {}) || {}

    // 9. Payment Events par type
    const { data: paymentsByType } = await supabase
      .from('payment_events')
      .select('event_type')

    const paymentTypeCounts = paymentsByType?.reduce((acc: any, row) => {
      const type = row.event_type || 'NULL'
      acc[type] = (acc[type] || 0) + 1
      return acc
    }, {}) || {}

    return NextResponse.json({
      tables: tableCounts,
      views: {
        timeline: {
          vw_client_timeline: timelineCount || 0,
          vw_client_timeline_by_type: timelineByTypeCount || 0,
          vw_client_summary: summaryCount || 0
        },
        vopay: {
          vw_vopay_by_client: vopayByClientCount || 0,
          vw_vopay_orphans: vopayOrphansCount || 0,
          vw_vopay_summary: vopayStatCount || 0
        },
        audit: {
          vw_audit_recent: auditRecentCount || 0,
          vw_audit_stats_by_table: auditStatsCount || 0
        },
        performance: {
          vw_performance_cache_hit_ratio: cacheHitCount || 0,
          vw_performance_table_sizes: tableSizesCount || 0,
          vw_performance_index_usage: indexUsageCount || 0,
          vw_performance_bloat_check: bloatCheckCount || 0
        }
      },
      breakdowns: {
        vopay_by_status: vopayStatusCounts,
        communications_by_type: commTypeCounts,
        loans_by_status: loanStatusCounts,
        payment_events_by_type: paymentTypeCounts
      }
    })
  } catch (err: any) {
    console.error('Metrics API error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
