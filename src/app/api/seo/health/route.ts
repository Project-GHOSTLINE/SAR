import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

/**
 * Vérifier l'authentification admin
 * Support: x-api-key header OU admin-session cookie
 */
function isAuthenticated(request: NextRequest): boolean {
  const token = request.cookies.get('admin-session')?.value
  const apiKey = request.headers.get('x-api-key')
  return !!token || apiKey === process.env.ADMIN_PASSWORD
}

/**
 * Tester la validité des credentials Google Analytics
 */
function checkGoogleAnalytics(): {
  configured: boolean
  credentials_valid: boolean
  property_id: string | null
  status: 'operational' | 'degraded' | 'down'
  details?: string
} {
  const hasServiceAccount = !!process.env.GA_SERVICE_ACCOUNT_JSON
  const hasPropertyId = !!process.env.GA_PROPERTY_ID

  if (!hasServiceAccount || !hasPropertyId) {
    return {
      configured: false,
      credentials_valid: false,
      property_id: null,
      status: 'down',
      details: 'GA_SERVICE_ACCOUNT_JSON ou GA_PROPERTY_ID manquant'
    }
  }

  // Essayer de parser le JSON
  try {
    const credentials = JSON.parse(process.env.GA_SERVICE_ACCOUNT_JSON!)
    const hasRequiredFields = credentials.project_id && credentials.private_key && credentials.client_email

    if (!hasRequiredFields) {
      return {
        configured: true,
        credentials_valid: false,
        property_id: process.env.GA_PROPERTY_ID || null,
        status: 'degraded',
        details: 'Service account JSON invalide (champs manquants)'
      }
    }

    return {
      configured: true,
      credentials_valid: true,
      property_id: process.env.GA_PROPERTY_ID?.trim() || null,
      status: 'operational'
    }
  } catch (error) {
    return {
      configured: true,
      credentials_valid: false,
      property_id: process.env.GA_PROPERTY_ID || null,
      status: 'degraded',
      details: 'Service account JSON malformé (parse error)'
    }
  }
}

/**
 * Tester la validité de la clé API Semrush
 */
function checkSemrush(): {
  configured: boolean
  api_key_valid: boolean
  status: 'operational' | 'degraded' | 'down'
  details?: string
} {
  const apiKey = process.env.SEMRUSH_API_KEY

  if (!apiKey) {
    return {
      configured: false,
      api_key_valid: false,
      status: 'down',
      details: 'SEMRUSH_API_KEY manquant'
    }
  }

  // Vérifier format basique de la clé (au moins 20 caractères alphanumériques)
  // Note: Semrush API keys peuvent varier en format, on vérifie juste une longueur minimale
  const trimmedKey = apiKey.trim()
  const isValidFormat = trimmedKey.length >= 20 && /^[a-zA-Z0-9]+$/.test(trimmedKey)

  if (!isValidFormat) {
    return {
      configured: true,
      api_key_valid: false,
      status: 'degraded',
      details: `Format de clé API invalide (length: ${trimmedKey.length})`
    }
  }

  return {
    configured: true,
    api_key_valid: true,
    status: 'operational'
  }
}

/**
 * Tester la connexion Supabase et récupérer les dernières collectes
 */
async function checkDatabase(): Promise<{
  supabase_connected: boolean
  tables_exist: string[]
  last_collection_ga4: string | null
  last_collection_semrush: string | null
  error?: string
}> {
  try {
    const supabase = getSupabaseServer()

    // Test de connexion: simple query
    const { error: connectionError } = await supabase
      .from('seo_ga4_metrics_daily')
      .select('id')
      .limit(1)

    if (connectionError && connectionError.code === '42P01') {
      // Table n'existe pas
      return {
        supabase_connected: true,
        tables_exist: [],
        last_collection_ga4: null,
        last_collection_semrush: null,
        error: 'Table seo_ga4_metrics_daily n\'existe pas - exécutez la migration'
      }
    }

    if (connectionError) {
      throw connectionError
    }

    // Vérifier les tables existantes
    const tables: string[] = []

    // Test seo_ga4_metrics_daily
    const { error: ga4Error } = await supabase
      .from('seo_ga4_metrics_daily')
      .select('id')
      .limit(1)
    if (!ga4Error) tables.push('seo_ga4_metrics_daily')

    // Test seo_semrush_domain_daily
    const { error: semrushError } = await supabase
      .from('seo_semrush_domain_daily')
      .select('id')
      .limit(1)
    if (!semrushError) tables.push('seo_semrush_domain_daily')

    // Récupérer dernières collectes
    let lastGA4 = null
    let lastSemrush = null

    if (tables.includes('seo_ga4_metrics_daily')) {
      const { data: ga4Data } = await supabase
        .from('seo_ga4_metrics_daily')
        .select('date')
        .order('date', { ascending: false })
        .limit(1)
        .single()

      lastGA4 = ga4Data?.date || null
    }

    if (tables.includes('seo_semrush_domain_daily')) {
      const { data: semrushData } = await supabase
        .from('seo_semrush_domain_daily')
        .select('date')
        .order('date', { ascending: false })
        .limit(1)
        .single()

      lastSemrush = semrushData?.date || null
    }

    return {
      supabase_connected: true,
      tables_exist: tables,
      last_collection_ga4: lastGA4,
      last_collection_semrush: lastSemrush
    }

  } catch (error: any) {
    return {
      supabase_connected: false,
      tables_exist: [],
      last_collection_ga4: null,
      last_collection_semrush: null,
      error: error.message || 'Erreur de connexion Supabase'
    }
  }
}

/**
 * Calculer le statut global de santé
 */
function calculateOverallHealth(
  gaStatus: string,
  semrushStatus: string,
  dbConnected: boolean
): 'healthy' | 'degraded' | 'unhealthy' {
  if (!dbConnected) return 'unhealthy'

  const downCount = [gaStatus, semrushStatus].filter(s => s === 'down').length
  const degradedCount = [gaStatus, semrushStatus].filter(s => s === 'degraded').length

  if (downCount >= 2) return 'unhealthy'
  if (downCount >= 1 || degradedCount >= 2) return 'degraded'

  return 'healthy'
}

/**
 * GET /api/seo/health
 *
 * Diagnostic complet de tous les services SEO
 *
 * Authentification: x-api-key header OU admin-session cookie
 *
 * Réponse:
 * - services: État de chaque service (GA4, Semrush, Search Console)
 * - database: État Supabase et dernières collectes
 * - overall_health: Santé globale du système
 */
export async function GET(request: NextRequest) {
  try {
    // Vérifier authentification
    if (!isAuthenticated(request)) {
      return NextResponse.json(
        { success: false, error: 'Non autorisé' },
        { status: 401 }
      )
    }

    // Checker tous les services
    const gaCheck = checkGoogleAnalytics()
    const semrushCheck = checkSemrush()
    const dbCheck = await checkDatabase()

    // Calculer santé globale
    const overallHealth = calculateOverallHealth(
      gaCheck.status,
      semrushCheck.status,
      dbCheck.supabase_connected
    )

    // Générer timestamp de test
    const timestamp = new Date().toISOString()

    return NextResponse.json({
      success: true,
      timestamp,
      services: {
        google_analytics: {
          configured: gaCheck.configured,
          credentials_valid: gaCheck.credentials_valid,
          property_id: gaCheck.property_id,
          last_test: timestamp,
          status: gaCheck.status,
          details: gaCheck.details
        },
        semrush: {
          configured: semrushCheck.configured,
          api_key_valid: semrushCheck.api_key_valid,
          last_test: timestamp,
          status: semrushCheck.status,
          details: semrushCheck.details
        },
        search_console: {
          configured: false,
          status: 'down',
          details: 'API non implémentée - À configurer'
        }
      },
      database: {
        supabase_connected: dbCheck.supabase_connected,
        tables_exist: dbCheck.tables_exist,
        last_collection_ga4: dbCheck.last_collection_ga4,
        last_collection_semrush: dbCheck.last_collection_semrush,
        error: dbCheck.error
      },
      overall_health: overallHealth,
      recommendations: generateRecommendations(gaCheck, semrushCheck, dbCheck)
    })

  } catch (error: any) {
    console.error('❌ Erreur health check:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Erreur lors du diagnostic',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}

/**
 * Générer des recommandations basées sur les checks
 */
function generateRecommendations(
  gaCheck: ReturnType<typeof checkGoogleAnalytics>,
  semrushCheck: ReturnType<typeof checkSemrush>,
  dbCheck: Awaited<ReturnType<typeof checkDatabase>>
): string[] {
  const recommendations: string[] = []

  if (gaCheck.status === 'down') {
    recommendations.push('Configurer GA_SERVICE_ACCOUNT_JSON et GA_PROPERTY_ID dans .env.local')
  } else if (gaCheck.status === 'degraded') {
    recommendations.push('Vérifier le format du GA_SERVICE_ACCOUNT_JSON (doit être un JSON valide)')
  }

  if (semrushCheck.status === 'down') {
    recommendations.push('Configurer SEMRUSH_API_KEY dans .env.local')
  } else if (semrushCheck.status === 'degraded') {
    recommendations.push('Vérifier le format de SEMRUSH_API_KEY (32 caractères hexadécimaux)')
  }

  if (!dbCheck.supabase_connected) {
    recommendations.push('Vérifier la connexion Supabase (NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY)')
  }

  if (dbCheck.tables_exist.length === 0) {
    recommendations.push('Exécuter la migration: supabase/migrations/20260121000000_seo_metrics_system.sql')
  }

  if (!dbCheck.last_collection_ga4 && gaCheck.status === 'operational') {
    recommendations.push('Aucune collecte GA4 trouvée - Exécuter POST /api/seo/collect/ga4')
  }

  if (!dbCheck.last_collection_semrush && semrushCheck.status === 'operational') {
    recommendations.push('Aucune collecte Semrush trouvée - Exécuter POST /api/seo/collect/semrush')
  }

  if (recommendations.length === 0) {
    recommendations.push('✅ Tout fonctionne correctement!')
  }

  return recommendations
}
