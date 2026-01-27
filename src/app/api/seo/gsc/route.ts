/**
 * API: GET /api/seo/gsc
 *
 * Google Search Console (Webmaster Tools) Data
 * Récupère les métriques de performance de recherche
 */

import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'

export const dynamic = 'force-dynamic'

// Vérifier l'authentification admin
function isAuthenticated(request: NextRequest): boolean {
  const token = request.cookies.get('admin-session')?.value
  const apiKey = request.headers.get('x-api-key')
  return !!token || apiKey === process.env.ADMIN_PASSWORD
}

/**
 * GET /api/seo/gsc
 *
 * Query params:
 * - startDate: Date de début (format: YYYY-MM-DD, défaut: 30 jours avant)
 * - endDate: Date de fin (format: YYYY-MM-DD, défaut: aujourd'hui)
 * - dimensions: Dimensions à grouper (page, query, device, country)
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

    const { searchParams } = new URL(request.url)
    const endDate = searchParams.get('endDate') || getToday()
    const startDate = searchParams.get('startDate') || get30DaysAgo()
    const dimensions = searchParams.get('dimensions')?.split(',') || ['query']

    // Vérifier credentials
    if (!process.env.GA_SERVICE_ACCOUNT_JSON) {
      return NextResponse.json({
        success: false,
        error: 'Google Search Console non configuré',
        message: 'GA_SERVICE_ACCOUNT_JSON requis'
      }, { status: 503 })
    }

    // Initialiser le client GSC
    const credentials = JSON.parse(process.env.GA_SERVICE_ACCOUNT_JSON)
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/webmasters.readonly']
    })

    const searchconsole = google.searchconsole({ version: 'v1', auth })
    const siteUrl = 'sc-domain:solutionargentrapide.ca' // ou 'https://solutionargentrapide.ca/'

    // Requête principale
    const response = await searchconsole.searchanalytics.query({
      siteUrl,
      requestBody: {
        startDate,
        endDate,
        dimensions,
        rowLimit: 1000,
        dataState: 'final' // ou 'all' pour inclure les données préliminaires
      }
    })

    const rows = response.data.rows || []

    // Calculer les métriques globales
    const overview = {
      totalClicks: rows.reduce((sum, row) => sum + (row.clicks || 0), 0),
      totalImpressions: rows.reduce((sum, row) => sum + (row.impressions || 0), 0),
      avgCTR: 0,
      avgPosition: 0
    }

    if (rows.length > 0) {
      overview.avgCTR = overview.totalClicks / overview.totalImpressions
      overview.avgPosition = rows.reduce((sum, row) => sum + (row.position || 0), 0) / rows.length
    }

    // Grouper par dimension
    const groupedData = rows.map(row => ({
      keys: row.keys || [],
      clicks: row.clicks || 0,
      impressions: row.impressions || 0,
      ctr: row.ctr || 0,
      position: row.position || 0
    }))

    return NextResponse.json({
      success: true,
      data: {
        overview,
        rows: groupedData,
        totalRows: rows.length,
        dateRange: { startDate, endDate },
        dimensions
      }
    })

  } catch (error: any) {
    console.error('❌ Erreur Google Search Console:', error)

    // Erreur d'authentification spécifique
    if (error.message?.includes('invalid_grant') || error.message?.includes('unauthorized')) {
      return NextResponse.json({
        success: false,
        error: 'Authentification Google Search Console échouée',
        message: 'Vérifiez que le service account a accès à Search Console',
        details: error.message
      }, { status: 401 })
    }

    return NextResponse.json({
      success: false,
      error: error.message || 'Erreur lors de la récupération des données GSC',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 })
  }
}

// ============================================
// FONCTIONS UTILITAIRES
// ============================================

function getToday(): string {
  const today = new Date()
  today.setDate(today.getDate() - 3) // GSC a un délai de ~3 jours
  return today.toISOString().split('T')[0]
}

function get30DaysAgo(): string {
  const date = new Date()
  date.setDate(date.getDate() - 33) // 30 jours + 3 jours de délai
  return date.toISOString().split('T')[0]
}
