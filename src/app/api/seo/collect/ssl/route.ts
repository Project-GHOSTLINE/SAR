/**
 * API: POST /api/seo/collect/ssl
 *
 * Collecte les métriques SSL/TLS depuis SSL Labs API
 * Analyse la qualité et sécurité du certificat SSL
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const maxDuration = 300 // 5 minutes timeout (SSL Labs scans take 60-120 seconds)

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
 * POST /api/seo/collect/ssl
 *
 * Lance un scan SSL Labs et stocke les résultats
 *
 * Body:
 * - host: Hostname à scanner (défaut: solutionargentrapide.ca)
 * - date: Date à enregistrer (défaut: aujourd'hui)
 * - force: Forcer nouvelle analyse (ignorer cache SSL Labs)
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
    const host = body.host || 'solutionargentrapide.ca'
    const targetDate = body.date || getToday()
    const force = body.force || false

    const supabase = getSupabaseClient()

    // Vérifier si déjà scanné aujourd'hui
    if (!force) {
      const { data: existing } = await supabase
        .from('seo_ssl_checks')
        .select('id, grade, cert_days_remaining')
        .eq('host', host)
        .eq('date', targetDate)
        .single()

      if (existing) {
        return NextResponse.json({
          success: true,
          message: 'Scan SSL déjà effectué aujourd\'hui',
          date: targetDate,
          host,
          grade: existing.grade,
          cert_days_remaining: existing.cert_days_remaining,
          existing: true
        })
      }
    }

    // Scanner SSL Labs
    console.log(`🔍 Lancement scan SSL Labs pour ${host}...`)
    console.log('⏳ Cela peut prendre 60-120 secondes...')

    const startTime = Date.now()
    const sslLabsResult = await scanSSLLabs(host, force)
    const scanDuration = Math.round((Date.now() - startTime) / 1000)

    // Créer l'objet complet avec métadonnées
    const sslData = {
      ...sslLabsResult,
      host,
      date: targetDate,
      scan_duration_seconds: scanDuration
    }

    const { data, error } = await supabase
      .from('seo_ssl_checks')
      .upsert([sslData], { onConflict: 'host,date' })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({
      success: true,
      message: 'Scan SSL Labs terminé avec succès',
      host,
      date: targetDate,
      scan_duration_seconds: scanDuration,
      data: {
        grade: data.grade,
        cert_days_remaining: data.cert_days_remaining,
        supports_tls_1_3: data.supports_tls_1_3,
        hsts_enabled: data.hsts_enabled
      }
    })

  } catch (error: any) {
    console.error('❌ Erreur scan SSL:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Erreur lors du scan SSL',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/seo/collect/ssl
 *
 * Récupère les scans SSL stockés
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
    const host = searchParams.get('host') || 'solutionargentrapide.ca'

    const supabase = getSupabaseClient()

    const { data, error } = await supabase
      .from('seo_ssl_checks')
      .select('*')
      .eq('host', host)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: false })

    if (error) throw error

    return NextResponse.json({
      success: true,
      data,
      count: data.length,
      dateRange: { startDate, endDate },
      host
    })

  } catch (error: any) {
    console.error('❌ Erreur récupération SSL:', error)
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
 * Lance un scan SSL Labs et attend les résultats
 */
async function scanSSLLabs(host: string, ignoreCache: boolean = false) {
  const baseUrl = 'https://api.ssllabs.com/api/v3'

  try {
    // 1. Démarrer le scan
    const startUrl = new URL(`${baseUrl}/analyze`)
    startUrl.searchParams.set('host', host)
    startUrl.searchParams.set('fromCache', ignoreCache ? 'off' : 'on')
    startUrl.searchParams.set('maxAge', '24') // Cache 24h
    startUrl.searchParams.set('all', 'done') // Wait for all endpoints

    console.log(`📡 Démarrage scan SSL Labs: ${host}`)

    const startResponse = await fetch(startUrl.toString())
    if (!startResponse.ok) {
      throw new Error(`SSL Labs API error: ${startResponse.status}`)
    }

    let result = await startResponse.json()

    // 2. Polling jusqu'à ce que le scan soit terminé
    let attempts = 0
    const maxAttempts = 60 // 5 minutes max (5s * 60 = 300s)

    while (result.status !== 'READY' && result.status !== 'ERROR' && attempts < maxAttempts) {
      console.log(`⏳ Status: ${result.status} (tentative ${attempts + 1}/${maxAttempts})`)

      // Attendre 5 secondes avant de re-checker
      await new Promise(resolve => setTimeout(resolve, 5000))

      // Re-checker le status
      const checkUrl = new URL(`${baseUrl}/analyze`)
      checkUrl.searchParams.set('host', host)
      checkUrl.searchParams.set('all', 'done')

      const checkResponse = await fetch(checkUrl.toString())
      if (!checkResponse.ok) {
        throw new Error(`SSL Labs API error: ${checkResponse.status}`)
      }

      result = await checkResponse.json()
      attempts++
    }

    if (result.status === 'ERROR') {
      throw new Error(`SSL Labs scan error: ${result.statusMessage || 'Unknown error'}`)
    }

    if (attempts >= maxAttempts) {
      throw new Error('SSL Labs scan timeout (exceeded 5 minutes)')
    }

    console.log(`✅ Scan terminé: Grade ${result.endpoints?.[0]?.grade || 'N/A'}`)

    // 3. Extraire les données
    const endpoint = result.endpoints?.[0] || {}
    const details = endpoint.details || {}
    const cert = details.cert || {}
    const chain = details.chain || {}

    // Calculer jours restants du certificat
    const certExpiry = cert.notAfter ? new Date(cert.notAfter) : null
    const daysRemaining = certExpiry
      ? Math.ceil((certExpiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      : null

    // Protocols supportés
    const protocols = details.protocols || []
    const supportsTLS13 = protocols.some((p: any) => p.name === 'TLS' && p.version === '1.3')
    const supportsTLS12 = protocols.some((p: any) => p.name === 'TLS' && p.version === '1.2')
    const supportsTLS11 = protocols.some((p: any) => p.name === 'TLS' && p.version === '1.1')
    const supportsTLS10 = protocols.some((p: any) => p.name === 'TLS' && p.version === '1.0')
    const supportsSSL3 = protocols.some((p: any) => p.name === 'SSL' && p.version === '3.0')
    const supportsSSL2 = protocols.some((p: any) => p.name === 'SSL' && p.version === '2.0')

    // Vulnérabilités
    const vulns = {
      beast: details.vulnBeast || false,
      heartbleed: details.heartbleed || false,
      poodle: details.poodle || false,
      freak: details.freak || false,
      logjam: details.logjam || false,
      drown: details.drownVulnerable || false
    }

    // HSTS
    const hstsPolicy = details.hstsPolicy || {}
    const hstsEnabled = hstsPolicy.status === 'present'

    return {
      // Grade
      grade: endpoint.grade || null,
      grade_trust_ignored: endpoint.gradeTrustIgnored || null,

      // Certificate
      cert_common_name: cert.commonNames?.[0] || null,
      cert_issuer: cert.issuerLabel || null,
      cert_valid_from: cert.notBefore ? new Date(cert.notBefore).toISOString() : null,
      cert_valid_until: cert.notAfter ? new Date(cert.notAfter).toISOString() : null,
      cert_days_remaining: daysRemaining,
      cert_serial_number: cert.serialNumber || null,

      // Security Features
      has_scts: cert.scts || false,
      supports_tls_1_3: supportsTLS13,
      supports_tls_1_2: supportsTLS12,
      supports_tls_1_1: supportsTLS11,
      supports_tls_1_0: supportsTLS10,
      supports_ssl_3: supportsSSL3,
      supports_ssl_2: supportsSSL2,

      // Vulnerabilities
      vulnerable_beast: vulns.beast,
      vulnerable_heartbleed: vulns.heartbleed,
      vulnerable_poodle: vulns.poodle,
      vulnerable_freak: vulns.freak,
      vulnerable_logjam: vulns.logjam,
      vulnerable_drown: vulns.drown,

      // Forward Secrecy
      forward_secrecy: details.forwardSecrecy || 0,

      // HSTS
      hsts_enabled: hstsEnabled,
      hsts_max_age: hstsPolicy.maxAge || null,
      hsts_preloaded: hstsPolicy.preload || false,

      // Ciphers
      weak_ciphers_count: details.weakCipherCount || 0,
      strong_ciphers_count: details.strongCipherCount || 0,

      // Status
      status: result.status,
      status_message: result.statusMessage || null,

      // Full data
      ssl_labs_data: {
        endpoints: result.endpoints,
        certs: result.certs,
        protocol_details: details.protocols,
        cipher_suites: details.suites
      },

      collected_at: new Date().toISOString()
    }

  } catch (error: any) {
    console.error('❌ Erreur lors du scan SSL Labs:', error)
    throw error
  }
}

function getToday(): string {
  return new Date().toISOString().split('T')[0]
}

function get30DaysAgo(): string {
  const date = new Date()
  date.setDate(date.getDate() - 30)
  return date.toISOString().split('T')[0]
}
