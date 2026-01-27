/**
 * API: POST /api/seo/collect/uptime
 *
 * Collecte les métriques uptime monitoring depuis UptimeRobot
 * Monitore la disponibilité du site 24/7
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
 * POST /api/seo/collect/uptime
 *
 * Collecte les métriques uptime monitoring
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

    // Vérifier credentials UptimeRobot
    if (!process.env.UPTIMEROBOT_API_KEY) {
      return NextResponse.json({
        success: false,
        error: 'UptimeRobot non configuré',
        message: 'UPTIMEROBOT_API_KEY requis. Créez un compte gratuit sur uptimerobot.com',
        setup_guide: '/docs/UPTIME_SETUP.md'
      }, { status: 503 })
    }

    const supabase = getSupabaseClient()

    // Collecter les données UptimeRobot
    console.log('🔍 Collecte UptimeRobot monitors...')

    const uptimeData = await collectUptimeRobotData()

    // Insérer chaque monitor check
    const { data, error } = await supabase
      .from('seo_uptime_checks')
      .insert(uptimeData)
      .select()

    if (error) throw error

    return NextResponse.json({
      success: true,
      message: 'Métriques uptime collectées avec succès',
      monitors_count: uptimeData.length,
      data
    })

  } catch (error: any) {
    console.error('❌ Erreur collecte uptime:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Erreur lors de la collecte uptime',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/seo/collect/uptime
 *
 * Récupère les métriques uptime stockées
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
    const hours = parseInt(searchParams.get('hours') || '24')
    const limit = parseInt(searchParams.get('limit') || '100')

    const supabase = getSupabaseClient()

    const since = new Date()
    since.setHours(since.getHours() - hours)

    const { data, error } = await supabase
      .from('seo_uptime_checks')
      .select('*')
      .gte('timestamp', since.toISOString())
      .order('timestamp', { ascending: false })
      .limit(limit)

    if (error) throw error

    // Calculer les stats
    const stats = {
      total_checks: data.length,
      up_count: data.filter(d => d.status === 2).length,
      down_count: data.filter(d => [8, 9].includes(d.status)).length,
      avg_response_time: data.reduce((sum, d) => sum + (d.response_time_ms || 0), 0) / (data.length || 1),
      uptime_percentage: data.length > 0 ? (data.filter(d => d.status === 2).length / data.length) * 100 : 0
    }

    return NextResponse.json({
      success: true,
      data,
      stats,
      period_hours: hours
    })

  } catch (error: any) {
    console.error('❌ Erreur récupération uptime:', error)
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
 * Collecte les données depuis l'API UptimeRobot
 */
async function collectUptimeRobotData() {
  const apiKey = process.env.UPTIMEROBOT_API_KEY!

  try {
    // API UptimeRobot v2
    const response = await fetch('https://api.uptimerobot.com/v2/getMonitors', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cache-Control': 'no-cache'
      },
      body: new URLSearchParams({
        api_key: apiKey,
        format: 'json',
        logs: '0',
        response_times: '1',
        response_times_average: '180', // Average over 3 minutes
        custom_uptime_ratios: '1-7-30-90' // 1, 7, 30, 90 days
      })
    })

    if (!response.ok) {
      throw new Error(`UptimeRobot API error: ${response.status}`)
    }

    const result = await response.json()

    if (result.stat !== 'ok') {
      throw new Error(`UptimeRobot API error: ${result.error?.message || 'Unknown error'}`)
    }

    const monitors = result.monitors || []

    // Transformer les données pour Supabase
    return monitors.map((monitor: any) => {
      const statusLabels: Record<number, string> = {
        0: 'paused',
        1: 'not_checked_yet',
        2: 'up',
        8: 'down',
        9: 'seems_down'
      }

      // Parse custom uptime ratios (format: "1-99.99-7-100.00-30-99.95-90-99.98")
      const uptimeRatios = monitor.custom_uptime_ratio?.split('-') || []
      const uptime1d = uptimeRatios[1] ? parseFloat(uptimeRatios[1]) : null
      const uptime7d = uptimeRatios[3] ? parseFloat(uptimeRatios[3]) : null
      const uptime30d = uptimeRatios[5] ? parseFloat(uptimeRatios[5]) : null
      const uptime90d = uptimeRatios[7] ? parseFloat(uptimeRatios[7]) : null

      // SSL info (si disponible)
      const sslInfo = monitor.ssl || {}
      const sslExpiryDate = sslInfo.expires_at ? new Date(sslInfo.expires_at * 1000) : null
      const sslDaysRemaining = sslExpiryDate
        ? Math.ceil((sslExpiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        : null

      return {
        monitor_id: monitor.id.toString(),
        monitor_name: monitor.friendly_name || monitor.url,
        url: monitor.url,
        timestamp: new Date().toISOString(),

        status: monitor.status,
        status_label: statusLabels[monitor.status] || 'unknown',

        response_time_ms: monitor.average_response_time || null,
        response_code: null, // Not provided by UptimeRobot API

        uptime_ratio_1d: uptime1d,
        uptime_ratio_7d: uptime7d,
        uptime_ratio_30d: uptime30d,
        uptime_ratio_90d: uptime90d,

        ssl_expiry_date: sslExpiryDate,
        ssl_days_remaining: sslDaysRemaining,

        is_down: monitor.status === 8 || monitor.status === 9,
        down_reason: monitor.status === 8 || monitor.status === 9 ? 'Monitor reported down' : null,
        last_down_at: monitor.last_down_time ? new Date(monitor.last_down_time * 1000).toISOString() : null,
        last_up_at: monitor.last_up_time ? new Date(monitor.last_up_time * 1000).toISOString() : null,

        monitor_data: {
          type: monitor.type,
          sub_type: monitor.sub_type,
          port: monitor.port,
          interval: monitor.interval,
          timeout: monitor.timeout,
          create_datetime: monitor.create_datetime
        }
      }
    })

  } catch (error: any) {
    console.error('❌ Erreur lors de l\'appel API UptimeRobot:', error)
    throw error
  }
}
