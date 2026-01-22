/**
 * API Endpoint: Statistiques des clients SAR
 *
 * GET /api/admin/clients-sar/stats
 *
 * Retourne:
 * - Nombre total de clients
 * - Répartition par score de fraude
 * - Top 10 patterns de fraude
 * - Statistiques par état de dossier
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseServer()

    // Statistiques globales
    const [
      totalClients,
      clientsSansIBV,
      clientsMauvaisesCreances,
      clientsRisqueCritique,
      clientsRisqueEleve,
      clientsRisqueMoyen,
      etatsDistribution
    ] = await Promise.all([
      // Total de clients
      supabase.from('clients_sar').select('*', { count: 'exact', head: true }),

      // Clients sans IBV
      supabase.from('clients_sar').select('*', { count: 'exact', head: true }).eq('flag_pas_ibv', true),

      // Clients avec mauvaises créances
      supabase.from('clients_sar').select('*', { count: 'exact', head: true }).eq('flag_mauvaise_creance', true),

      // Risque CRITIQUE (>= 80)
      supabase.from('clients_sar').select('*', { count: 'exact', head: true }).gte('score_fraude', 80),

      // Risque ÉLEVÉ (60-79)
      supabase.from('clients_sar').select('*', { count: 'exact', head: true }).gte('score_fraude', 60).lt('score_fraude', 80),

      // Risque MOYEN (40-59)
      supabase.from('clients_sar').select('*', { count: 'exact', head: true }).gte('score_fraude', 40).lt('score_fraude', 60),

      // Distribution par état de dossier
      supabase.from('clients_sar').select('etat_dossier')
    ])

    // Calculer la distribution des états
    const etatsCount: Record<string, number> = {}
    if (etatsDistribution.data) {
      etatsDistribution.data.forEach(row => {
        const etat = row.etat_dossier || 'Inconnu'
        etatsCount[etat] = (etatsCount[etat] || 0) + 1
      })
    }

    // Top 10 clients à risque
    const { data: topRisque } = await supabase
      .from('clients_sar')
      .select('margill_id, nom_complet, score_fraude, etat_dossier, date_creation_dossier')
      .order('score_fraude', { ascending: false })
      .limit(10)

    return NextResponse.json({
      success: true,
      stats: {
        total: totalClients.count || 0,
        sansIBV: clientsSansIBV.count || 0,
        mauvaisesCreances: clientsMauvaisesCreances.count || 0,
        risque: {
          critique: clientsRisqueCritique.count || 0,
          eleve: clientsRisqueEleve.count || 0,
          moyen: clientsRisqueMoyen.count || 0,
          faible: (totalClients.count || 0) - (clientsRisqueCritique.count || 0) - (clientsRisqueEleve.count || 0) - (clientsRisqueMoyen.count || 0)
        },
        parEtat: etatsCount,
        topRisque: topRisque || []
      }
    })

  } catch (error: any) {
    console.error('Exception stats clients SAR:', error)
    return NextResponse.json(
      { error: error.message || 'Erreur serveur' },
      { status: 500 }
    )
  }
}
