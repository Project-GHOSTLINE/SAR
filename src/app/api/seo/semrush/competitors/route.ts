import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/seo/semrush/competitors
 *
 * Analyse approfondie des concurrents avec Semrush
 *
 * Query params:
 * - domain: Domaine à analyser (défaut: solutionargentrapide.ca)
 * - database: Base de données (défaut: ca)
 * - limit: Nombre de concurrents (défaut: 20)
 * - type: Type d'analyse (organic, paid, keyword_gap)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const domain = searchParams.get('domain') || 'solutionargentrapide.ca'
    const database = searchParams.get('database') || 'ca'
    const limit = parseInt(searchParams.get('limit') || '20')
    const analysisType = searchParams.get('type') || 'organic'

    if (!process.env.SEMRUSH_API_KEY) {
      return NextResponse.json(
        { success: false, error: 'SEMRUSH_API_KEY non configurée' },
        { status: 500 }
      )
    }

    const apiKey = process.env.SEMRUSH_API_KEY

    let result: any = {}

    switch (analysisType) {
      case 'organic':
        result = await getOrganicCompetitors(domain, database, apiKey, limit)
        break

      case 'paid':
        result = await getPaidCompetitors(domain, database, apiKey, limit)
        break

      case 'keyword_gap':
        result = await getKeywordGap(domain, database, apiKey, limit)
        break

      default:
        return NextResponse.json(
          { success: false, error: 'Type d\'analyse invalide' },
          { status: 400 }
        )
    }

    return NextResponse.json({
      success: true,
      domain,
      database,
      type: analysisType,
      ...result
    })

  } catch (error: any) {
    console.error('❌ Erreur competitors analysis:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Erreur lors de l\'analyse des concurrents',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}

/**
 * Concurrents organiques
 */
async function getOrganicCompetitors(
  domain: string,
  database: string,
  apiKey: string,
  limit: number
) {
  const url = `https://api.semrush.com/?type=domain_organic_organic&key=${apiKey}&domain=${domain}&database=${database}&export_columns=Dn,Cr,Np,Or,Ot,Oc&display_limit=${limit}`

  const response = await fetch(url)
  const csvText = await response.text()
  const data = parseSemrushCSV(csvText)

  const competitors = data.map((row: any, index: number) => ({
    rank: index + 1,
    domain: row.Dn || row.Domain || '',
    competition_level: parseFloat(row.Cr || row['Competition Level'] || '0'),
    common_keywords: parseInt(row.Np || row['Common Keywords'] || '0'),
    organic_keywords: parseInt(row.Or || row['SE Keywords'] || '0'),
    organic_traffic: parseInt(row.Ot || row['SE Traffic'] || '0'),
    organic_traffic_cost: Math.round(parseFloat(row.Oc || row['SE Traffic Cost'] || '0') * 100),
    threat_score: calculateThreatScore(
      parseFloat(row.Cr || '0'),
      parseInt(row.Np || '0'),
      parseInt(row.Ot || '0')
    )
  }))

  return {
    competitors,
    count: competitors.length
  }
}

/**
 * Concurrents payants (Ads)
 */
async function getPaidCompetitors(
  domain: string,
  database: string,
  apiKey: string,
  limit: number
) {
  const url = `https://api.semrush.com/?type=domain_adwords_adwords&key=${apiKey}&domain=${domain}&database=${database}&export_columns=Dn,Cr,Np,Ad,At,Ac&display_limit=${limit}`

  const response = await fetch(url)
  const csvText = await response.text()
  const data = parseSemrushCSV(csvText)

  const competitors = data.map((row: any, index: number) => ({
    rank: index + 1,
    domain: row.Dn || row.Domain || '',
    competition_level: parseFloat(row.Cr || row['Competition Level'] || '0'),
    common_keywords: parseInt(row.Np || row['Common Keywords'] || '0'),
    paid_keywords: parseInt(row.Ad || row['Paid Keywords'] || '0'),
    paid_traffic: parseInt(row.At || row['Paid Traffic'] || '0'),
    paid_traffic_cost: Math.round(parseFloat(row.Ac || row['Paid Traffic Cost'] || '0') * 100)
  }))

  return {
    competitors,
    count: competitors.length
  }
}

/**
 * Keyword Gap Analysis - Trouve les opportunités manquées
 */
async function getKeywordGap(
  domain: string,
  database: string,
  apiKey: string,
  limit: number
) {
  // D'abord, obtenir le top concurrent
  const competitorsUrl = `https://api.semrush.com/?type=domain_organic_organic&key=${apiKey}&domain=${domain}&database=${database}&export_columns=Dn&display_limit=1`

  const competitorsResponse = await fetch(competitorsUrl)
  const competitorsCsvText = await competitorsResponse.text()
  const competitorsData = parseSemrushCSV(competitorsCsvText)

  if (competitorsData.length === 0) {
    return {
      opportunities: [],
      count: 0,
      message: 'Aucun concurrent trouvé'
    }
  }

  const topCompetitor = competitorsData[0].Dn || competitorsData[0].Domain

  // Obtenir les mots-clés du concurrent que nous n'avons pas
  const gapUrl = `https://api.semrush.com/?type=domain_organic&key=${apiKey}&domain=${topCompetitor}&database=${database}&export_columns=Ph,Po,Nq,Cp,Co,Nr,Td&display_limit=${limit}`

  const gapResponse = await fetch(gapUrl)
  const gapCsvText = await gapResponse.text()
  const gapData = parseSemrushCSV(gapCsvText)

  // Obtenir nos propres mots-clés
  const ourUrl = `https://api.semrush.com/?type=domain_organic&key=${apiKey}&domain=${domain}&database=${database}&export_columns=Ph&display_limit=1000`

  const ourResponse = await fetch(ourUrl)
  const ourCsvText = await ourResponse.text()
  const ourData = parseSemrushCSV(ourCsvText)

  const ourKeywords = new Set(ourData.map((row: any) => row.Ph || row.Keyword || ''))

  // Filtrer pour trouver les opportunités
  const opportunities = gapData
    .filter((row: any) => !ourKeywords.has(row.Ph || row.Keyword || ''))
    .map((row: any) => ({
      keyword: row.Ph || row.Keyword || '',
      competitor_position: parseInt(row.Po || row.Position || '0'),
      search_volume: parseInt(row.Nq || row['Search Volume'] || '0'),
      cpc: parseFloat(row.Cp || row.CPC || '0'),
      competition: parseFloat(row.Co || row.Competition || '0'),
      difficulty: parseInt(row.Td || row['Keyword Difficulty'] || '0'),
      opportunity_score: calculateOpportunityScore(
        parseInt(row.Nq || '0'),
        parseFloat(row.Co || '0'),
        parseInt(row.Td || '0')
      ),
      found_on: topCompetitor
    }))
    .sort((a: any, b: any) => b.opportunity_score - a.opportunity_score)
    .slice(0, limit)

  return {
    opportunities,
    count: opportunities.length,
    analyzed_competitor: topCompetitor
  }
}

/**
 * Calcule un score de menace pour un concurrent
 */
function calculateThreatScore(
  competitionLevel: number,
  commonKeywords: number,
  traffic: number
): number {
  // Normaliser chaque métrique (0-100)
  const competitionScore = competitionLevel * 100
  const keywordsScore = Math.min((commonKeywords / 50) * 100, 100)
  const trafficScore = Math.min((traffic / 5000) * 100, 100)

  // Moyenne pondérée
  return Math.round(
    (competitionScore * 0.4) + (keywordsScore * 0.3) + (trafficScore * 0.3)
  )
}

/**
 * Calcule un score d'opportunité pour un mot-clé
 */
function calculateOpportunityScore(
  volume: number,
  competition: number,
  difficulty: number
): number {
  const volumeScore = Math.min((volume / 1000) * 50, 100)
  const competitionScore = (1 - competition) * 100
  const difficultyScore = (100 - difficulty)

  return Math.round(
    (volumeScore * 0.4) + (competitionScore * 0.3) + (difficultyScore * 0.3)
  )
}

/**
 * Parse les données CSV de Semrush
 */
function parseSemrushCSV(csvText: string): any[] {
  const lines = csvText.trim().split('\n')
  if (lines.length < 2) return []

  const headers = lines[0].split(';')
  const data = []

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(';')
    const row: any = {}

    headers.forEach((header, index) => {
      row[header.trim()] = values[index]?.trim() || ''
    })

    data.push(row)
  }

  return data
}
