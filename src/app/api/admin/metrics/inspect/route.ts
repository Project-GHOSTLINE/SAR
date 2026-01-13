import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { jwtVerify } from 'jose'

function getSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

async function verifyAuth(request: NextRequest): Promise<boolean> {
  try {
    const cookieStore = cookies()
    const token = cookieStore.get('admin-session')

    if (!token) return false

    const secret = new TextEncoder().encode(process.env.JWT_SECRET)
    await jwtVerify(token.value, secret)

    return true
  } catch (error) {
    return false
  }
}

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  // Vérifier l'authentification
  const isAuth = await verifyAuth(request)
  if (!isAuth) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const supabase = getSupabaseClient()

  try {
    // 1. Récupérer toutes les sections
    const { data: sections, error: sectionsError } = await supabase
      .from('admin_sections')
      .select('*')
      .order('sort_order', { ascending: true })

    if (sectionsError) throw sectionsError

    // 2. Récupérer toutes les métriques du registry
    const { data: metrics, error: metricsError } = await supabase
      .from('metric_registry')
      .select('*')
      .order('section_key, display_order', { ascending: true })

    if (metricsError) throw metricsError

    // 3. Statistiques globales sur metric_values
    const { data: valueStats, error: statsError } = await supabase
      .rpc('get_metric_value_stats')
      .single()

    // Si la fonction n'existe pas encore, on fait un query manuel
    let stats: any = {}
    if (statsError) {
      // Fallback: compter manuellement
      const { count: totalValues } = await supabase
        .from('metric_values')
        .select('*', { count: 'exact', head: true })

      const { count: globalValues } = await supabase
        .from('metric_values')
        .select('*', { count: 'exact', head: true })
        .eq('entity_type', 'global')

      const { count: analysisValues } = await supabase
        .from('metric_values')
        .select('*', { count: 'exact', head: true })
        .eq('entity_type', 'analysis')

      const { count: fraudValues } = await supabase
        .from('metric_values')
        .select('*', { count: 'exact', head: true })
        .eq('entity_type', 'fraud_case')

      stats = {
        total_values: totalValues || 0,
        global_values: globalValues || 0,
        analysis_values: analysisValues || 0,
        fraud_case_values: fraudValues || 0,
        sections_count: sections?.length || 0,
        metrics_count: metrics?.length || 0
      }
    } else {
      stats = valueStats
    }

    // 4. Pour chaque section, compter combien de métriques ont des valeurs
    const sectionsWithMetrics = await Promise.all(
      (sections || []).map(async (section) => {
        const sectionMetrics = (metrics || []).filter(m => m.section_key === section.section_key)

        // Compter combien de métriques de cette section ont au moins une valeur
        const metricsWithValuesPromises = sectionMetrics.map(async (metric) => {
          const { count } = await supabase
            .from('metric_values')
            .select('*', { count: 'exact', head: true })
            .eq('metric_key', metric.metric_key)
            .limit(1)

          return {
            ...metric,
            has_values: (count || 0) > 0,
            value_count: count || 0
          }
        })

        const metricsWithValues = await Promise.all(metricsWithValuesPromises)

        return {
          ...section,
          metrics_total: sectionMetrics.length,
          metrics_with_values: metricsWithValues.filter(m => m.has_values).length,
          metrics: metricsWithValues
        }
      })
    )

    // 5. Exemples de valeurs récentes (dernières 10)
    const { data: recentValues, error: recentError } = await supabase
      .from('metric_values')
      .select(`
        *,
        metric_key,
        entity_type,
        entity_id,
        computed_at
      `)
      .order('computed_at', { ascending: false })
      .limit(10)

    return NextResponse.json({
      success: true,
      data: {
        sections: sectionsWithMetrics,
        total_sections: sections?.length || 0,
        total_metrics: metrics?.length || 0,
        stats,
        recent_values: recentValues || [],
        timestamp: new Date().toISOString()
      }
    })

  } catch (error: any) {
    console.error('Metric inspection error:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}
