/**
 * API: POST /api/seo/collect/pagespeed
 *
 * Collecte les métriques Google PageSpeed Insights et Core Web Vitals
 * Utilise l'API publique PageSpeed Insights v5
 */

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
 * POST /api/seo/collect/pagespeed
 *
 * Collecte les métriques PageSpeed Insights
 *
 * Body:
 * - url: URL à analyser (défaut: homepage)
 * - date: Date à enregistrer (défaut: aujourd'hui)
 * - strategy: 'mobile' ou 'desktop' (défaut: mobile)
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
    const url = body.url || 'https://solutionargentrapide.ca/'
    const targetDate = body.date || getToday()
    const strategy = body.strategy || 'mobile' // 'mobile' or 'desktop'
    const force = body.force || false

    const supabase = getSupabaseClient()

    // Vérifier si déjà collecté
    if (!force) {
      const { data: existing } = await supabase
        .from('seo_pagespeed_metrics_daily')
        .select('id')
        .eq('date', targetDate)
        .eq('url', url)
        .eq('device_type', strategy)
        .single()

      if (existing) {
        return NextResponse.json({
          success: true,
          message: 'Métriques PageSpeed déjà collectées pour cette date',
          date: targetDate,
          url,
          strategy,
          existing: true
        })
      }
    }

    // Collecter les données PageSpeed Insights
    console.log(`🔍 Collecte PageSpeed Insights pour ${url} (${strategy})...`)

    const pageSpeedData = await collectPageSpeedData(url, strategy)

    const { data, error } = await supabase
      .from('seo_pagespeed_metrics_daily')
      .upsert([pageSpeedData], { onConflict: 'url,date,device_type' })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({
      success: true,
      message: 'Métriques PageSpeed Insights collectées avec succès',
      date: targetDate,
      url,
      strategy,
      data
    })

  } catch (error: any) {
    console.error('❌ Erreur collecte PageSpeed:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Erreur lors de la collecte PageSpeed',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/seo/collect/pagespeed
 *
 * Récupère les métriques PageSpeed stockées
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
    const endDate = searchParams.get('endDate') || getToday()
    const url = searchParams.get('url') || 'https://solutionargentrapide.ca/'

    const supabase = getSupabaseClient()

    const { data, error } = await supabase
      .from('seo_pagespeed_metrics_daily')
      .select('*')
      .eq('url', url)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: false })

    if (error) throw error

    return NextResponse.json({
      success: true,
      data,
      count: data.length,
      dateRange: { startDate, endDate },
      url
    })

  } catch (error: any) {
    console.error('❌ Erreur récupération PageSpeed:', error)
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

/**
 * Collecte les données depuis l'API PageSpeed Insights
 */
async function collectPageSpeedData(url: string, strategy: 'mobile' | 'desktop') {
  // API PageSpeed Insights v5
  const apiUrl = new URL('https://www.googleapis.com/pagespeedonline/v5/runPagespeed')
  apiUrl.searchParams.set('url', url)
  apiUrl.searchParams.set('strategy', strategy)
  apiUrl.searchParams.set('category', 'performance')
  apiUrl.searchParams.set('category', 'accessibility')
  apiUrl.searchParams.set('category', 'best-practices')
  apiUrl.searchParams.set('category', 'seo')

  // Note: Optionnel - Ajouter une clé API pour augmenter les limites
  // if (process.env.GOOGLE_PAGESPEED_API_KEY) {
  //   apiUrl.searchParams.set('key', process.env.GOOGLE_PAGESPEED_API_KEY)
  // }

  try {
    const response = await fetch(apiUrl.toString(), {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(`PageSpeed API error: ${response.status} - ${JSON.stringify(errorData)}`)
    }

    const result = await response.json()

    // Extraire les métriques du rapport Lighthouse
    const lighthouse = result.lighthouseResult
    const audits = lighthouse?.audits || {}

    // Core Web Vitals
    const fcp = audits['first-contentful-paint']?.numericValue || null
    const lcp = audits['largest-contentful-paint']?.numericValue || null
    const cls = audits['cumulative-layout-shift']?.numericValue || null
    const fid = audits['max-potential-fid']?.numericValue || null // FID n'est pas directement mesurable
    const tti = audits['interactive']?.numericValue || null
    const tbt = audits['total-blocking-time']?.numericValue || null
    const speedIndex = audits['speed-index']?.numericValue || null

    // Scores
    const categories = lighthouse?.categories || {}
    const performanceScore = Math.round((categories.performance?.score || 0) * 100)
    const accessibilityScore = Math.round((categories.accessibility?.score || 0) * 100)
    const bestPracticesScore = Math.round((categories['best-practices']?.score || 0) * 100)
    const seoScore = Math.round((categories.seo?.score || 0) * 100)

    // Catégories Core Web Vitals
    const fcpCategory = getMetricCategory(fcp, [1800, 3000]) // Fast < 1.8s, Slow > 3s
    const lcpCategory = getMetricCategory(lcp, [2500, 4000]) // Fast < 2.5s, Slow > 4s
    const clsCategory = cls !== null ? (cls < 0.1 ? 'FAST' : cls < 0.25 ? 'AVERAGE' : 'SLOW') : null
    const fidCategory = getMetricCategory(fid, [100, 300]) // Fast < 100ms, Slow > 300ms

    return {
      url,
      date: getToday(),
      performance_score: performanceScore,
      accessibility_score: accessibilityScore,
      best_practices_score: bestPracticesScore,
      seo_score: seoScore,
      pwa_score: null, // PWA n'est pas toujours disponible

      // Core Web Vitals (en millisecondes)
      fcp_ms: fcp ? Math.round(fcp) : null,
      lcp_ms: lcp ? Math.round(lcp) : null,
      cls_score: cls,
      fid_ms: fid ? Math.round(fid) : null,
      tti_ms: tti ? Math.round(tti) : null,
      tbt_ms: tbt ? Math.round(tbt) : null,
      speed_index: speedIndex ? Math.round(speedIndex) : null,

      // Catégories
      fcp_category: fcpCategory,
      lcp_category: lcpCategory,
      cls_category: clsCategory,
      fid_category: fidCategory,

      // Données complètes Lighthouse (pour analyse détaillée)
      lighthouse_data: {
        finalUrl: lighthouse?.finalUrl,
        fetchTime: lighthouse?.fetchTime,
        categories: categories,
        audits: {
          fcp: audits['first-contentful-paint'],
          lcp: audits['largest-contentful-paint'],
          cls: audits['cumulative-layout-shift'],
          fid: audits['max-potential-fid'],
          tti: audits['interactive'],
          tbt: audits['total-blocking-time'],
          speedIndex: audits['speed-index']
        }
      },

      device_type: strategy,
      collected_at: new Date().toISOString()
    }

  } catch (error: any) {
    console.error('❌ Erreur lors de l\'appel API PageSpeed Insights:', error)
    throw error
  }
}

/**
 * Détermine la catégorie d'une métrique (FAST, AVERAGE, SLOW)
 */
function getMetricCategory(value: number | null, thresholds: [number, number]): string | null {
  if (value === null) return null
  const [fastThreshold, slowThreshold] = thresholds
  if (value < fastThreshold) return 'FAST'
  if (value < slowThreshold) return 'AVERAGE'
  return 'SLOW'
}

function getToday(): string {
  return new Date().toISOString().split('T')[0]
}

function get30DaysAgo(): string {
  const date = new Date()
  date.setDate(date.getDate() - 30)
  return date.toISOString().split('T')[0]
}
