/**
 * API Endpoint: Recherche de clients SAR avec détection de fraude
 *
 * GET /api/admin/clients-sar/search
 *
 * Query params:
 * - q: Terme de recherche (nom, email, téléphone, margill_id, dossier_id/contrat, NAS)
 * - minScore: Score de fraude minimum (0-100)
 * - etatDossier: Filtrer par état (Actif, Fermé, etc.)
 * - flagIBV: true/false - filtrer par présence/absence d'IBV
 * - flagMauvaisCreance: true/false - filtrer par mauvaises créances
 * - limit: Nombre de résultats (défaut: 50, max: 200)
 * - offset: Pagination
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    // Paramètres de recherche
    const query = searchParams.get('q') || ''
    const minScore = parseInt(searchParams.get('minScore') || '0')
    const etatDossier = searchParams.get('etatDossier')
    const flagIBV = searchParams.get('flagIBV')
    const flagMauvaisCreance = searchParams.get('flagMauvaisCreance')
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200)
    const offset = parseInt(searchParams.get('offset') || '0')

    const supabase = getSupabaseServer()

    // Construire la requête
    let queryBuilder = supabase
      .from('clients_sar')
      .select('*', { count: 'exact' })
      .gte('score_fraude', minScore)
      .order('score_fraude', { ascending: false })
      .order('date_creation_dossier', { ascending: false })
      .range(offset, offset + limit - 1)

    // Appliquer les filtres
    if (query && query.trim() !== '') {
      const searchTerm = query.trim()
      queryBuilder = queryBuilder.or(
        `nom_complet.ilike.%${searchTerm}%,` +
        `email.ilike.%${searchTerm}%,` +
        `telephone.ilike.%${searchTerm}%,` +
        `telephone_mobile.ilike.%${searchTerm}%,` +
        `margill_id.ilike.%${searchTerm}%,` +
        `dossier_id.ilike.%${searchTerm}%,` +
        `nas.ilike.%${searchTerm}%`
      )
    }

    if (etatDossier) {
      queryBuilder = queryBuilder.eq('etat_dossier', etatDossier)
    }

    if (flagIBV !== null) {
      if (flagIBV === 'true') {
        queryBuilder = queryBuilder.eq('flag_pas_ibv', true)
      } else if (flagIBV === 'false') {
        queryBuilder = queryBuilder.eq('flag_pas_ibv', false)
      }
    }

    if (flagMauvaisCreance === 'true') {
      queryBuilder = queryBuilder.eq('flag_mauvaise_creance', true)
    }

    // Exécuter la requête
    const { data, error, count } = await queryBuilder

    if (error) {
      console.error('Erreur recherche clients SAR:', error)
      return NextResponse.json(
        { error: 'Erreur lors de la recherche' },
        { status: 500 }
      )
    }

    // Calculer les niveaux de risque
    const clients = (data || []).map(client => ({
      ...client,
      niveau_risque: client.score_fraude >= 80 ? 'CRITIQUE' :
                     client.score_fraude >= 60 ? 'ÉLEVÉ' :
                     client.score_fraude >= 40 ? 'MOYEN' : 'FAIBLE'
    }))

    return NextResponse.json({
      success: true,
      data: clients,
      pagination: {
        total: count || 0,
        limit,
        offset,
        hasMore: (count || 0) > offset + limit
      }
    })

  } catch (error: any) {
    console.error('Exception recherche clients SAR:', error)
    return NextResponse.json(
      { error: error.message || 'Erreur serveur' },
      { status: 500 }
    )
  }
}
