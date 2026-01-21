import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

// Vérifier l'authentification admin
function isAuthenticated(request: NextRequest): boolean {
  const token = request.cookies.get('admin-session')?.value
  const apiKey = request.headers.get('x-api-key')
  return !!token || apiKey === process.env.ADMIN_PASSWORD
}

// Initialize Supabase
function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase credentials manquants')
  }

  return createClient(supabaseUrl, supabaseKey)
}

/**
 * POST /api/seo/collect/gsc
 *
 * Collecte les métriques Google Search Console et les stocke dans Supabase
 *
 * Body:
 * - date: Date à collecter (format: YYYY-MM-DD, défaut: il y a 3 jours - GSC a un délai)
 * - force: Forcer la recollecte même si existe déjà
 */
export async function POST(request: NextRequest) {
  try {
    // Vérifier authentification
    if (!isAuthenticated(request)) {
      return NextResponse.json(
        { success: false, error: 'Non autorisé' },
        { status: 401 }
      )
    }

    const body = await request.json().catch(() => ({}))
    // GSC a un délai de ~3 jours pour les données complètes
    const targetDate = body.date || get3DaysAgo()
    const force = body.force || false

    const supabase = getSupabaseClient()
    const siteUrl = process.env.GSC_SITE_URL || 'https://solutionargentrapide.ca'

    // Vérifier si déjà collecté
    if (!force) {
      const { data: existing } = await supabase
        .from('seo_gsc_metrics_daily')
        .select('id')
        .eq('date', targetDate)
        .eq('site_url', siteUrl)
        .single()

      if (existing) {
        return NextResponse.json({
          success: true,
          message: 'Métriques GSC déjà collectées pour cette date',
          date: targetDate,
          existing: true
        })
      }
    }

    // Vérifier si Google Search Console est configuré
    if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
      console.warn('⚠️ Google Search Console non configuré - utilisation de données mock')

      const mockData = generateMockGSCData(targetDate, siteUrl)

      const { data, error } = await supabase
        .from('seo_gsc_metrics_daily')
        .upsert([mockData], { onConflict: 'date,site_url' })
        .select()
        .single()

      if (error) throw error

      return NextResponse.json({
        success: true,
        message: 'Métriques GSC collectées (MODE MOCK - Configurez Google Search Console pour vraies données)',
        date: targetDate,
        data,
        mock: true
      })
    }

    // TODO: Implémenter la vraie collecte avec Google Search Console API
    // Pour l'instant, utiliser des données mock
    const mockData = generateMockGSCData(targetDate, siteUrl)

    const { data, error } = await supabase
      .from('seo_gsc_metrics_daily')
      .upsert([mockData], { onConflict: 'date,site_url' })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({
      success: true,
      message: 'Métriques GSC collectées (implémentation complète à venir)',
      date: targetDate,
      data,
      note: 'Configurez GOOGLE_SERVICE_ACCOUNT_EMAIL et GOOGLE_PRIVATE_KEY pour activer la collecte réelle'
    })

  } catch (error: any) {
    console.error('❌ Erreur collecte GSC:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Erreur lors de la collecte GSC',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/seo/collect/gsc
 *
 * Récupère les métriques GSC stockées
 */
export async function GET(request: NextRequest) {
  try {
    if (!isAuthenticated(request)) {
      return NextResponse.json(
        { success: false, error: 'Non autorisé' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate') || get30DaysAgo()
    const endDate = searchParams.get('endDate') || get3DaysAgo()

    const supabase = getSupabaseClient()

    const { data, error } = await supabase
      .from('seo_gsc_metrics_daily')
      .select('*')
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: false })

    if (error) throw error

    return NextResponse.json({
      success: true,
      data,
      count: data.length,
      dateRange: { startDate, endDate }
    })

  } catch (error: any) {
    console.error('❌ Erreur récupération GSC:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Erreur lors de la récupération',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}

// ============================================
// FONCTIONS UTILITAIRES
// ============================================

function generateMockGSCData(date: string, siteUrl: string) {
  return {
    site_url: siteUrl,
    date,
    clicks: Math.floor(Math.random() * 500) + 150,
    impressions: Math.floor(Math.random() * 15000) + 5000,
    ctr: Math.random() * 3 + 2,
    average_position: Math.random() * 15 + 10,
    top_queries: [
      {
        query: 'prêt rapide',
        clicks: 85,
        impressions: 2500,
        ctr: 3.4,
        position: 5.2
      },
      {
        query: 'prêt argent rapide',
        clicks: 62,
        impressions: 1800,
        ctr: 3.4,
        position: 6.8
      },
      {
        query: 'prêt personnel rapide',
        clicks: 41,
        impressions: 1200,
        ctr: 3.4,
        position: 8.3
      },
      {
        query: 'prêt en ligne rapide',
        clicks: 28,
        impressions: 950,
        ctr: 2.9,
        position: 11.2
      },
      {
        query: 'crédit rapide canada',
        clicks: 19,
        impressions: 680,
        ctr: 2.8,
        position: 13.5
      }
    ],
    top_pages: [
      {
        page: 'https://solutionargentrapide.ca/',
        clicks: 180,
        impressions: 5500,
        ctr: 3.3
      },
      {
        page: 'https://solutionargentrapide.ca/demande',
        clicks: 120,
        impressions: 3200,
        ctr: 3.8
      },
      {
        page: 'https://solutionargentrapide.ca/about',
        clicks: 45,
        impressions: 1500,
        ctr: 3.0
      }
    ],
    desktop_clicks: Math.floor(Math.random() * 200) + 80,
    mobile_clicks: Math.floor(Math.random() * 250) + 120,
    tablet_clicks: Math.floor(Math.random() * 50) + 20,
    top_countries: [
      { country: 'CAN', clicks: 420, impressions: 14000 }
    ],
    desktop_impressions: Math.floor(Math.random() * 5000) + 3000,
    mobile_impressions: Math.floor(Math.random() * 8000) + 5000,
    rich_results_impressions: Math.floor(Math.random() * 500) + 100,
    total_indexed_pages: 45,
    total_submitted_pages: 52,
    coverage_issues: 3,
    collected_at: new Date().toISOString()
  }
}

function get3DaysAgo(): string {
  const date = new Date()
  date.setDate(date.getDate() - 3)
  return date.toISOString().split('T')[0]
}

function get30DaysAgo(): string {
  const date = new Date()
  date.setDate(date.getDate() - 30)
  return date.toISOString().split('T')[0]
}
