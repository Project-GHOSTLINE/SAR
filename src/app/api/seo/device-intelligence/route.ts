/**
 * API: GET /api/seo/device-intelligence
 *
 * Calcule les métriques croisées device (Mobile/Desktop/Tablet)
 * Combine GA4, GSC, et PageSpeed pour insights avancés
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

export async function GET(request: NextRequest) {
  try {
    if (!isAuthenticated(request)) {
      return NextResponse.json(
        { success: false, error: 'Non autorisé' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const days = parseInt(searchParams.get('days') || '7', 10)
    const domain = searchParams.get('domain') || 'solutionargentrapide.ca'

    const supabase = getSupabaseClient()

    // Calculer les dates
    const endDate = new Date().toISOString().split('T')[0]
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0]

    // 1. Récupérer données GSC avec device breakdown
    const { data: gscData } = await supabase
      .from('seo_gsc_metrics_daily')
      .select('*')
      .eq('domain', domain)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: false })

    // 2. Récupérer données GA4 (pour device engagement)
    const { data: ga4Data } = await supabase
      .from('seo_ga4_metrics_daily')
      .select('*')
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: false })

    // 3. Récupérer données PageSpeed (mobile + desktop)
    const { data: pagespeedMobile } = await supabase
      .from('seo_pagespeed_metrics_daily')
      .select('*')
      .eq('device_type', 'mobile')
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: false })
      .limit(1)

    const { data: pagespeedDesktop } = await supabase
      .from('seo_pagespeed_metrics_daily')
      .select('*')
      .eq('device_type', 'desktop')
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: false })
      .limit(1)

    // 4. Agréger les métriques GSC par device
    const gscDeviceStats = aggregateGSCByDevice(gscData || [])
    const ga4DeviceStats = aggregateGA4ByDevice(ga4Data || [])

    // 5. Calculer les métriques dérivées
    const deviceIntelligence = calculateDeviceMetrics(
      gscDeviceStats,
      ga4DeviceStats,
      pagespeedMobile?.[0],
      pagespeedDesktop?.[0]
    )

    // 6. Générer recommandations automatiques
    const recommendations = generateRecommendations(deviceIntelligence)

    return NextResponse.json({
      success: true,
      period: { startDate, endDate, days },
      domain,
      metrics: deviceIntelligence,
      recommendations,
      rawData: {
        gsc: gscDeviceStats,
        ga4: ga4DeviceStats,
        pagespeed: {
          mobile: pagespeedMobile?.[0] || null,
          desktop: pagespeedDesktop?.[0] || null
        }
      }
    })

  } catch (error: any) {
    console.error('❌ Erreur device intelligence:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Erreur lors du calcul des métriques device',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}

// ============================================
// FONCTIONS D'AGRÉGATION
// ============================================

interface DeviceStats {
  clicks: number
  impressions: number
  ctr: number
  position: number
}

function aggregateGSCByDevice(data: any[]): Record<string, DeviceStats> {
  const devices: Record<string, { clicks: number; impressions: number; positions: number[] }> = {
    mobile: { clicks: 0, impressions: 0, positions: [] },
    desktop: { clicks: 0, impressions: 0, positions: [] },
    tablet: { clicks: 0, impressions: 0, positions: [] }
  }

  data.forEach(row => {
    const breakdown = row.device_breakdown || []
    breakdown.forEach((device: any) => {
      const type = device.device.toLowerCase()
      if (devices[type]) {
        devices[type].clicks += device.clicks || 0
        devices[type].impressions += device.impressions || 0
        devices[type].positions.push(device.position || 0)
      }
    })
  })

  // Calculer moyennes
  const result: Record<string, DeviceStats> = {}
  Object.keys(devices).forEach(key => {
    const d = devices[key]
    result[key] = {
      clicks: d.clicks,
      impressions: d.impressions,
      ctr: d.impressions > 0 ? d.clicks / d.impressions : 0,
      position: d.positions.length > 0
        ? d.positions.reduce((a, b) => a + b, 0) / d.positions.length
        : 0
    }
  })

  return result
}

function aggregateGA4ByDevice(data: any[]): Record<string, any> {
  const devices: Record<string, { sessions: number; users: number; durations: number[] }> = {
    mobile: { sessions: 0, users: 0, durations: [] },
    desktop: { sessions: 0, users: 0, durations: [] },
    tablet: { sessions: 0, users: 0, durations: [] }
  }

  data.forEach(row => {
    const breakdown = row.device_breakdown || []
    breakdown.forEach((device: any) => {
      const type = device.device_category?.toLowerCase() || 'unknown'
      if (devices[type]) {
        devices[type].sessions += device.sessions || 0
        devices[type].users += device.active_users || 0
        // Note: GA4 ne fournit pas avg session duration par device dans ce format
        // On peut l'ajouter plus tard si disponible
      }
    })
  })

  const result: Record<string, any> = {}
  Object.keys(devices).forEach(key => {
    const d = devices[key]
    result[key] = {
      sessions: d.sessions,
      users: d.users,
      avgSessionDuration: 0 // TODO: à compléter avec données GA4 détaillées
    }
  })

  return result
}

// ============================================
// CALCUL DES MÉTRIQUES DEVICE
// ============================================

function calculateDeviceMetrics(
  gsc: Record<string, DeviceStats>,
  ga4: Record<string, any>,
  pagespeedMobile: any,
  pagespeedDesktop: any
) {
  const mobile = gsc.mobile || { clicks: 0, impressions: 0, ctr: 0, position: 0 }
  const desktop = gsc.desktop || { clicks: 0, impressions: 0, ctr: 0, position: 0 }
  const tablet = gsc.tablet || { clicks: 0, impressions: 0, ctr: 0, position: 0 }

  const totalClicks = mobile.clicks + desktop.clicks + tablet.clicks
  const totalImpressions = mobile.impressions + desktop.impressions + tablet.impressions

  // Métriques principales
  const metrics = {
    // Traffic share
    trafficShare: {
      mobile: totalClicks > 0 ? (mobile.clicks / totalClicks) * 100 : 0,
      desktop: totalClicks > 0 ? (desktop.clicks / totalClicks) * 100 : 0,
      tablet: totalClicks > 0 ? (tablet.clicks / totalClicks) * 100 : 0
    },

    // Position comparison
    positionComparison: {
      mobile: mobile.position,
      desktop: desktop.position,
      tablet: tablet.position,
      mobileDesktopGap: mobile.position - desktop.position, // Négatif = mobile meilleur
      mobileAdvantage: desktop.position - mobile.position // Positif = mobile meilleur
    },

    // CTR comparison
    ctrComparison: {
      mobile: mobile.ctr * 100,
      desktop: desktop.ctr * 100,
      tablet: tablet.ctr * 100,
      mobileDesktopRatio: desktop.ctr > 0 ? (mobile.ctr / desktop.ctr) * 100 : 0
    },

    // Performance
    performance: {
      mobile: pagespeedMobile?.performance_score || 0,
      desktop: pagespeedDesktop?.performance_score || 0,
      gap: (pagespeedDesktop?.performance_score || 0) - (pagespeedMobile?.performance_score || 0),
      mobileClicksAtRisk: calculateClicksAtRisk(mobile.clicks, pagespeedMobile?.performance_score || 0),
      desktopClicksAtRisk: calculateClicksAtRisk(desktop.clicks, pagespeedDesktop?.performance_score || 0)
    },

    // SEO Conversion (GSC → GA4)
    seoConversion: {
      mobile: calculateSEOConversion(mobile.clicks, ga4.mobile?.sessions || 0),
      desktop: calculateSEOConversion(desktop.clicks, ga4.desktop?.sessions || 0),
      tablet: calculateSEOConversion(tablet.clicks, ga4.tablet?.sessions || 0)
    },

    // Mobile-First Index Score (0-100)
    mobileFirstScore: calculateMobileFirstScore(
      mobile.position,
      desktop.position,
      pagespeedMobile?.performance_score || 0,
      mobile.ctr
    ),

    // Engagement (si données GA4 disponibles)
    engagement: {
      mobileSessions: ga4.mobile?.sessions || 0,
      desktopSessions: ga4.desktop?.sessions || 0,
      tabletSessions: ga4.tablet?.sessions || 0
    },

    // Traffic value potential
    trafficValue: {
      mobile: calculateTrafficValue(mobile.impressions, mobile.ctr),
      desktop: calculateTrafficValue(desktop.impressions, desktop.ctr),
      tablet: calculateTrafficValue(tablet.impressions, tablet.ctr)
    },

    // Résumé
    summary: {
      totalClicks,
      totalImpressions,
      overallCTR: totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0,
      dominantDevice: getDominantDevice(mobile.clicks, desktop.clicks, tablet.clicks)
    }
  }

  return metrics
}

function calculateClicksAtRisk(clicks: number, perfScore: number): number {
  if (perfScore >= 90) return 0
  if (perfScore >= 75) return Math.round(clicks * 0.05) // 5% à risque
  if (perfScore >= 50) return Math.round(clicks * 0.15) // 15% à risque
  return Math.round(clicks * 0.30) // 30% à risque
}

function calculateSEOConversion(gscClicks: number, ga4Sessions: number): number {
  if (gscClicks === 0) return 0
  return Math.min((ga4Sessions / gscClicks) * 100, 100)
}

function calculateMobileFirstScore(
  mobilePosition: number,
  desktopPosition: number,
  mobilePerf: number,
  mobileCTR: number
): number {
  // Composantes:
  // 40% - Performance mobile (0-100)
  // 30% - Position mobile vs desktop (meilleur mobile = bonus)
  // 30% - CTR mobile (indicateur UX)

  const perfScore = mobilePerf * 0.4

  // Position: si mobile meilleur que desktop, bonus
  const positionBonus = Math.max(0, Math.min(30, (desktopPosition - mobilePosition) * 3))

  // CTR: > 5% = excellent
  const ctrScore = Math.min(30, mobileCTR * 600)

  return Math.round(perfScore + positionBonus + ctrScore)
}

function calculateTrafficValue(impressions: number, ctr: number): number {
  // Simple estimation: impressions × CTR × assumed conversion rate (2%)
  return Math.round(impressions * ctr * 0.02)
}

function getDominantDevice(mobileClicks: number, desktopClicks: number, tabletClicks: number): string {
  const max = Math.max(mobileClicks, desktopClicks, tabletClicks)
  if (max === mobileClicks) return 'mobile'
  if (max === desktopClicks) return 'desktop'
  return 'tablet'
}

// ============================================
// RECOMMANDATIONS AUTOMATIQUES
// ============================================

function generateRecommendations(metrics: any): Array<{
  type: 'alert' | 'warning' | 'success' | 'opportunity'
  category: string
  message: string
  impact: 'high' | 'medium' | 'low'
}> {
  const recommendations: any[] = []

  // 1. Performance mobile
  if (metrics.performance.mobile < 75) {
    recommendations.push({
      type: 'alert',
      category: 'Performance',
      message: `Performance mobile (${metrics.performance.mobile}) en dessous de 75 → Optimiser images/JS`,
      impact: 'high'
    })
  }

  // 2. Mobile vs Desktop position
  if (metrics.positionComparison.mobileAdvantage > 3) {
    recommendations.push({
      type: 'success',
      category: 'Mobile-First',
      message: `Position mobile meilleure que desktop (+${metrics.positionComparison.mobileAdvantage.toFixed(1)} positions) → Mobile-first index OK ✅`,
      impact: 'low'
    })
  } else if (metrics.positionComparison.mobileAdvantage < -3) {
    recommendations.push({
      type: 'alert',
      category: 'Mobile-First',
      message: `Position mobile pire que desktop (${metrics.positionComparison.mobileAdvantage.toFixed(1)} positions) → Problème mobile-first index ⚠️`,
      impact: 'high'
    })
  }

  // 3. Traffic share vs engagement
  if (metrics.trafficShare.mobile > 60 && metrics.performance.mobile < metrics.performance.desktop - 15) {
    recommendations.push({
      type: 'opportunity',
      category: 'UX Mobile',
      message: `${metrics.trafficShare.mobile.toFixed(0)}% du trafic est mobile mais performance -${metrics.performance.gap} → Améliorer UX mobile`,
      impact: 'high'
    })
  }

  // 4. SEO Conversion
  if (metrics.seoConversion.mobile < 85) {
    recommendations.push({
      type: 'warning',
      category: 'Conversion',
      message: `Perte de ${(100 - metrics.seoConversion.mobile).toFixed(0)}% des clics mobiles entre GSC et GA4 → Vérifier redirections/temps de chargement`,
      impact: 'medium'
    })
  }

  // 5. Mobile-First Score
  if (metrics.mobileFirstScore >= 90) {
    recommendations.push({
      type: 'success',
      category: 'Score Global',
      message: `Mobile-First Index Score excellent (${metrics.mobileFirstScore}/100) ✅`,
      impact: 'low'
    })
  } else if (metrics.mobileFirstScore < 70) {
    recommendations.push({
      type: 'alert',
      category: 'Score Global',
      message: `Mobile-First Index Score faible (${metrics.mobileFirstScore}/100) → Priorité critique`,
      impact: 'high'
    })
  }

  // 6. Clicks at risk
  const totalClicksAtRisk = metrics.performance.mobileClicksAtRisk + metrics.performance.desktopClicksAtRisk
  if (totalClicksAtRisk > 50) {
    recommendations.push({
      type: 'alert',
      category: 'Risque',
      message: `~${totalClicksAtRisk} clics/semaine à risque à cause de la performance → Potentiel perte de rankings`,
      impact: 'high'
    })
  }

  // 7. CTR opportunities
  if (metrics.ctrComparison.mobile < 3 && metrics.positionComparison.mobile < 10) {
    recommendations.push({
      type: 'opportunity',
      category: 'CTR',
      message: `CTR mobile faible (${metrics.ctrComparison.mobile.toFixed(1)}%) malgré bonne position → Optimiser titles/meta descriptions`,
      impact: 'medium'
    })
  }

  return recommendations
}
