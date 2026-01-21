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
 * POST /api/seo/collect/semrush
 *
 * Collecte les métriques Semrush et les stocke dans Supabase
 *
 * Body:
 * - date: Date à collecter (format: YYYY-MM-DD, défaut: hier)
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
    const targetDate = body.date || getYesterday()
    const force = body.force || false

    const supabase = getSupabaseClient()
    const domain = 'solutionargentrapide.ca'

    // Vérifier si déjà collecté
    if (!force) {
      const { data: existing } = await supabase
        .from('seo_semrush_domain_daily')
        .select('id')
        .eq('date', targetDate)
        .eq('domain', domain)
        .single()

      if (existing) {
        return NextResponse.json({
          success: true,
          message: 'Métriques Semrush déjà collectées pour cette date',
          date: targetDate,
          existing: true
        })
      }
    }

    // Vérifier si Semrush est configuré
    if (!process.env.SEMRUSH_API_KEY) {
      console.warn('⚠️ Semrush non configuré - utilisation de données mock')

      const mockData = generateMockSemrushData(targetDate, domain)

      const { data, error } = await supabase
        .from('seo_semrush_domain_daily')
        .upsert([mockData], { onConflict: 'date,domain' })
        .select()
        .single()

      if (error) throw error

      return NextResponse.json({
        success: true,
        message: 'Métriques Semrush collectées (MODE MOCK - Configurez Semrush pour vraies données)',
        date: targetDate,
        data,
        mock: true
      })
    }

    // TODO: Implémenter la vraie collecte avec Semrush API
    // Pour l'instant, utiliser des données mock
    const mockData = generateMockSemrushData(targetDate, domain)

    const { data, error } = await supabase
      .from('seo_semrush_domain_daily')
      .upsert([mockData], { onConflict: 'date,domain' })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({
      success: true,
      message: 'Métriques Semrush collectées (implémentation complète à venir)',
      date: targetDate,
      data,
      note: 'Configurez SEMRUSH_API_KEY pour activer la collecte réelle'
    })

  } catch (error: any) {
    console.error('❌ Erreur collecte Semrush:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Erreur lors de la collecte Semrush',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/seo/collect/semrush
 *
 * Récupère les métriques Semrush stockées
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
    const endDate = searchParams.get('endDate') || getYesterday()

    const supabase = getSupabaseClient()

    const { data, error } = await supabase
      .from('seo_semrush_domain_daily')
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
    console.error('❌ Erreur récupération Semrush:', error)
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

function generateMockSemrushData(date: string, domain: string) {
  return {
    domain,
    date,
    domain_rank: Math.floor(Math.random() * 5000000) + 1000000,
    domain_rank_change: Math.floor(Math.random() * 20000) - 10000,
    organic_keywords: Math.floor(Math.random() * 150) + 80,
    organic_traffic: Math.floor(Math.random() * 2000) + 500,
    organic_traffic_cost: Math.floor(Math.random() * 50000) + 10000,
    organic_positions_distribution: {
      top3: Math.floor(Math.random() * 8) + 2,
      '4-10': Math.floor(Math.random() * 15) + 10,
      '11-20': Math.floor(Math.random() * 25) + 15,
      '21-50': Math.floor(Math.random() * 40) + 25,
      '51+': Math.floor(Math.random() * 60) + 30
    },
    paid_keywords: Math.floor(Math.random() * 20) + 5,
    paid_traffic: Math.floor(Math.random() * 100) + 20,
    paid_traffic_cost: Math.floor(Math.random() * 10000) + 2000,
    total_backlinks: Math.floor(Math.random() * 500) + 200,
    referring_domains: Math.floor(Math.random() * 80) + 40,
    referring_ips: Math.floor(Math.random() * 70) + 35,
    follow_backlinks: Math.floor(Math.random() * 350) + 150,
    nofollow_backlinks: Math.floor(Math.random() * 150) + 50,
    authority_score: Math.floor(Math.random() * 30) + 25,
    top_organic_keywords: [
      {
        keyword: 'prêt rapide',
        position: 5,
        volume: 2400,
        difficulty: 45
      },
      {
        keyword: 'prêt argent rapide',
        position: 7,
        volume: 1900,
        difficulty: 42
      },
      {
        keyword: 'prêt personnel rapide',
        position: 9,
        volume: 1200,
        difficulty: 48
      },
      {
        keyword: 'prêt en ligne rapide',
        position: 12,
        volume: 880,
        difficulty: 50
      },
      {
        keyword: 'crédit rapide canada',
        position: 15,
        volume: 720,
        difficulty: 46
      }
    ],
    top_competitors: [
      {
        domain: 'pretrapide24.ca',
        common_keywords: 45,
        organic_traffic: 3500
      },
      {
        domain: 'creditinstant.ca',
        common_keywords: 38,
        organic_traffic: 2800
      },
      {
        domain: 'pretenligne.ca',
        common_keywords: 32,
        organic_traffic: 2200
      }
    ],
    collected_at: new Date().toISOString()
  }
}

function getYesterday(): string {
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  return yesterday.toISOString().split('T')[0]
}

function get30DaysAgo(): string {
  const date = new Date()
  date.setDate(date.getDate() - 30)
  return date.toISOString().split('T')[0]
}
