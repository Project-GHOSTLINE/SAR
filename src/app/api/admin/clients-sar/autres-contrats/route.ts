import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const margillId = searchParams.get('margill_id')

    if (!margillId) {
      return NextResponse.json(
        { success: false, error: 'margill_id requis' },
        { status: 400 }
      )
    }

    // Récupérer le client principal
    const { data: client, error: clientError } = await supabase
      .from('clients_sar')
      .select('email, telephone, telephone_mobile, nom_complet')
      .eq('margill_id', margillId)
      .single()

    if (clientError || !client) {
      return NextResponse.json(
        { success: false, error: 'Client non trouvé' },
        { status: 404 }
      )
    }

    const autresContrats: any[] = []

    // Chercher par email
    if (client.email) {
      const { data: emailMatches } = await supabase
        .from('clients_sar')
        .select('margill_id, dossier_id, nom_complet, etat_dossier, score_fraude, date_creation_dossier')
        .eq('email', client.email)
        .neq('margill_id', margillId)
        .order('date_creation_dossier', { ascending: false })

      if (emailMatches && emailMatches.length > 0) {
        autresContrats.push(...emailMatches.map(c => ({ ...c, match_type: 'email' })))
      }
    }

    // Chercher par téléphone
    if (client.telephone) {
      const { data: telMatches } = await supabase
        .from('clients_sar')
        .select('margill_id, dossier_id, nom_complet, etat_dossier, score_fraude, date_creation_dossier')
        .eq('telephone', client.telephone)
        .neq('margill_id', margillId)
        .order('date_creation_dossier', { ascending: false })

      if (telMatches && telMatches.length > 0) {
        // Éviter les doublons
        const nouveaux = telMatches.filter(t => !autresContrats.find(a => a.margill_id === t.margill_id))
        autresContrats.push(...nouveaux.map(c => ({ ...c, match_type: 'telephone' })))
      }
    }

    // Chercher par mobile
    if (client.telephone_mobile) {
      const { data: mobileMatches } = await supabase
        .from('clients_sar')
        .select('margill_id, dossier_id, nom_complet, etat_dossier, score_fraude, date_creation_dossier')
        .eq('telephone_mobile', client.telephone_mobile)
        .neq('margill_id', margillId)
        .order('date_creation_dossier', { ascending: false })

      if (mobileMatches && mobileMatches.length > 0) {
        const nouveaux = mobileMatches.filter(m => !autresContrats.find(a => a.margill_id === m.margill_id))
        autresContrats.push(...nouveaux.map(c => ({ ...c, match_type: 'mobile' })))
      }
    }

    // Chercher par nom (similitude)
    if (client.nom_complet) {
      const { data: nomMatches } = await supabase
        .from('clients_sar')
        .select('margill_id, dossier_id, nom_complet, etat_dossier, score_fraude, date_creation_dossier')
        .ilike('nom_complet', `%${client.nom_complet}%`)
        .neq('margill_id', margillId)
        .order('date_creation_dossier', { ascending: false })

      if (nomMatches && nomMatches.length > 0) {
        const nouveaux = nomMatches.filter(n => !autresContrats.find(a => a.margill_id === n.margill_id))
        autresContrats.push(...nouveaux.map(c => ({ ...c, match_type: 'nom' })))
      }
    }

    return NextResponse.json({
      success: true,
      contrats: autresContrats,
      total: autresContrats.length
    })
  } catch (error) {
    console.error('Erreur autres contrats:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}
