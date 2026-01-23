import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/seo/semrush/keyword-research
 *
 * Recherche de nouveaux mots-clés avec Semrush
 *
 * Query params:
 * - keyword: Mot-clé de départ (requis)
 * - database: Base de données (défaut: ca)
 * - limit: Nombre de résultats (défaut: 50)
 * - type: Type de recherche (related, questions, phrase)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const keyword = searchParams.get('keyword')
    const database = searchParams.get('database') || 'ca'
    const limit = parseInt(searchParams.get('limit') || '50')
    const type = searchParams.get('type') || 'related'

    if (!keyword) {
      return NextResponse.json(
        { success: false, error: 'Le paramètre "keyword" est requis' },
        { status: 400 }
      )
    }

    if (!process.env.SEMRUSH_API_KEY) {
      return NextResponse.json(
        { success: false, error: 'SEMRUSH_API_KEY non configurée' },
        { status: 500 }
      )
    }

    const apiKey = process.env.SEMRUSH_API_KEY

    // Choisir le bon endpoint selon le type
    let reportType = 'phrase_related'
    if (type === 'questions') reportType = 'phrase_questions'
    else if (type === 'phrase') reportType = 'phrase_fullsearch'

    // Appel API Semrush
    const url = `https://api.semrush.com/?type=${reportType}&key=${apiKey}&phrase=${encodeURIComponent(keyword)}&database=${database}&export_columns=Ph,Nq,Cp,Co,Nr,Td&display_limit=${limit}`

    const response = await fetch(url)
    const csvText = await response.text()

    // Parse CSV
    const keywords = parseSemrushCSV(csvText)

    // Enrichir les données
    const enrichedKeywords = keywords.map((kw: any) => ({
      keyword: kw.Ph || kw.Keyword || '',
      search_volume: parseInt(kw.Nq || kw['Search Volume'] || '0'),
      cpc: parseFloat(kw.Cp || kw.CPC || '0'),
      competition: parseFloat(kw.Co || kw.Competition || '0'),
      results: parseInt(kw.Nr || kw.Results || '0'),
      difficulty: parseInt(kw.Td || kw['Keyword Difficulty'] || '0'),
      opportunity_score: calculateOpportunityScore(
        parseInt(kw.Nq || '0'),
        parseFloat(kw.Co || '0'),
        parseInt(kw.Td || '0')
      )
    }))

    // Trier par score d'opportunité
    enrichedKeywords.sort((a: any, b: any) => b.opportunity_score - a.opportunity_score)

    return NextResponse.json({
      success: true,
      keyword,
      type,
      database,
      count: enrichedKeywords.length,
      keywords: enrichedKeywords
    })

  } catch (error: any) {
    console.error('❌ Erreur keyword research:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Erreur lors de la recherche de mots-clés',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}

/**
 * Calcule un score d'opportunité pour un mot-clé
 * Basé sur: volume élevé, compétition faible, difficulté raisonnable
 */
function calculateOpportunityScore(
  volume: number,
  competition: number,
  difficulty: number
): number {
  // Volume normalisé (0-100)
  const volumeScore = Math.min((volume / 1000) * 50, 100)

  // Compétition inversée (moins = mieux)
  const competitionScore = (1 - competition) * 100

  // Difficulté inversée (moins = mieux)
  const difficultyScore = (100 - difficulty)

  // Moyenne pondérée
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
