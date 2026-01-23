import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/seo/semrush/backlinks
 *
 * Analyse détaillée des backlinks avec Semrush
 *
 * Query params:
 * - domain: Domaine à analyser (défaut: solutionargentrapide.ca)
 * - type: Type d'analyse (overview, referring_domains, anchors, new_lost)
 * - limit: Nombre de résultats (défaut: 100)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const domain = searchParams.get('domain') || 'solutionargentrapide.ca'
    const analysisType = searchParams.get('type') || 'overview'
    const limit = parseInt(searchParams.get('limit') || '100')

    if (!process.env.SEMRUSH_API_KEY) {
      return NextResponse.json(
        { success: false, error: 'SEMRUSH_API_KEY non configurée' },
        { status: 500 }
      )
    }

    const apiKey = process.env.SEMRUSH_API_KEY

    let result: any = {}

    switch (analysisType) {
      case 'overview':
        result = await getBacklinksOverview(domain, apiKey)
        break

      case 'referring_domains':
        result = await getReferringDomains(domain, apiKey, limit)
        break

      case 'anchors':
        result = await getAnchorTexts(domain, apiKey, limit)
        break

      case 'new_lost':
        result = await getNewLostBacklinks(domain, apiKey, limit)
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
      type: analysisType,
      ...result
    })

  } catch (error: any) {
    console.error('❌ Erreur backlinks analysis:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Erreur lors de l\'analyse des backlinks',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}

/**
 * Vue d'ensemble des backlinks
 */
async function getBacklinksOverview(domain: string, apiKey: string) {
  const url = `https://api.semrush.com/?type=backlinks_overview&key=${apiKey}&target=${domain}&target_type=root_domain&export_columns=ascore,total,domains_num,urls_num,ips_num,ipclassc_num,follows_num,nofollows_num,sponsored_num,ugc_num,texts_num,images_num,forms_num,frames_num`

  const response = await fetch(url)
  const csvText = await response.text()
  const data = parseSemrushCSV(csvText)

  if (data.length === 0) {
    return { overview: null }
  }

  const overview = data[0]

  return {
    overview: {
      authority_score: parseInt(overview.ascore || overview['Authority Score'] || '0'),
      total_backlinks: parseInt(overview.total || overview.Total || '0'),
      referring_domains: parseInt(overview.domains_num || overview['Referring Domains'] || '0'),
      referring_pages: parseInt(overview.urls_num || overview['Referring Pages'] || '0'),
      referring_ips: parseInt(overview.ips_num || overview['Referring IPs'] || '0'),
      referring_subnets: parseInt(overview.ipclassc_num || overview['Referring Subnets'] || '0'),
      follow_links: parseInt(overview.follows_num || overview['Follow Links'] || '0'),
      nofollow_links: parseInt(overview.nofollows_num || overview['Nofollow Links'] || '0'),
      sponsored_links: parseInt(overview.sponsored_num || overview['Sponsored Links'] || '0'),
      ugc_links: parseInt(overview.ugc_num || overview['UGC Links'] || '0'),
      text_links: parseInt(overview.texts_num || overview['Text Links'] || '0'),
      image_links: parseInt(overview.images_num || overview['Image Links'] || '0'),
      form_links: parseInt(overview.forms_num || overview['Form Links'] || '0'),
      frame_links: parseInt(overview.frames_num || overview['Frame Links'] || '0')
    }
  }
}

/**
 * Top domaines référents
 */
async function getReferringDomains(domain: string, apiKey: string, limit: number) {
  const url = `https://api.semrush.com/?type=backlinks_refdomains&key=${apiKey}&target=${domain}&target_type=root_domain&export_columns=domain_ascore,backlinks_num,ip,country&display_limit=${limit}`

  const response = await fetch(url)
  const csvText = await response.text()
  const data = parseSemrushCSV(csvText)

  const domains = data.map((row: any) => ({
    domain: row.domain || '',
    authority_score: parseInt(row.domain_ascore || row['Authority Score'] || '0'),
    backlinks_count: parseInt(row.backlinks_num || row['Backlinks'] || '0'),
    ip: row.ip || row.IP || '',
    country: row.country || row.Country || ''
  }))

  return {
    referring_domains: domains,
    count: domains.length
  }
}

/**
 * Analyse des anchor texts
 */
async function getAnchorTexts(domain: string, apiKey: string, limit: number) {
  const url = `https://api.semrush.com/?type=backlinks_anchors&key=${apiKey}&target=${domain}&target_type=root_domain&export_columns=anchor,backlinks_num,domains_num&display_limit=${limit}`

  const response = await fetch(url)
  const csvText = await response.text()
  const data = parseSemrushCSV(csvText)

  const anchors = data.map((row: any) => ({
    anchor_text: row.anchor || row['Anchor Text'] || '',
    backlinks_count: parseInt(row.backlinks_num || row['Backlinks'] || '0'),
    domains_count: parseInt(row.domains_num || row['Domains'] || '0')
  }))

  return {
    anchor_texts: anchors,
    count: anchors.length
  }
}

/**
 * Nouveaux et backlinks perdus
 */
async function getNewLostBacklinks(domain: string, apiKey: string, limit: number) {
  // Nouveaux backlinks (derniers 30 jours)
  const newUrl = `https://api.semrush.com/?type=backlinks_newlost&key=${apiKey}&target=${domain}&target_type=root_domain&backlinks_status=new&export_columns=page_ascore,backlink,anchor,last_seen&display_limit=${limit}`

  const newResponse = await fetch(newUrl)
  const newCsvText = await newResponse.text()
  const newData = parseSemrushCSV(newCsvText)

  // Backlinks perdus
  const lostUrl = `https://api.semrush.com/?type=backlinks_newlost&key=${apiKey}&target=${domain}&target_type=root_domain&backlinks_status=lost&export_columns=page_ascore,backlink,anchor,last_seen&display_limit=${limit}`

  const lostResponse = await fetch(lostUrl)
  const lostCsvText = await lostResponse.text()
  const lostData = parseSemrushCSV(lostCsvText)

  const newBacklinks = newData.map((row: any) => ({
    authority_score: parseInt(row.page_ascore || row['Authority Score'] || '0'),
    backlink: row.backlink || row.Backlink || '',
    anchor: row.anchor || row['Anchor Text'] || '',
    last_seen: row.last_seen || row['Last Seen'] || ''
  }))

  const lostBacklinks = lostData.map((row: any) => ({
    authority_score: parseInt(row.page_ascore || row['Authority Score'] || '0'),
    backlink: row.backlink || row.Backlink || '',
    anchor: row.anchor || row['Anchor Text'] || '',
    last_seen: row.last_seen || row['Last Seen'] || ''
  }))

  return {
    new_backlinks: newBacklinks,
    lost_backlinks: lostBacklinks,
    new_count: newBacklinks.length,
    lost_count: lostBacklinks.length
  }
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
