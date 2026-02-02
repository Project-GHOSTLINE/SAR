import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

interface Concordance {
  type: 'email' | 'telephone' | 'telephone_mobile' | 'employeur' | 'ville' | 'adresse' | 'banque_compte' | 'contact_nom' | 'banque_institution'
  valeur: string
  clients: Array<{
    margill_id: string
    nom_complet: string
    score_fraude: number
    etat_dossier?: string
  }>
  nombre: number
  risque: 'critique' | 'eleve' | 'moyen' | 'faible'
}

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

    // Récupérer le client
    const { data: client, error: clientError } = await supabase
      .from('clients_sar')
      .select('*')
      .eq('margill_id', margillId)
      .single()

    if (clientError || !client) {
      return NextResponse.json(
        { success: false, error: 'Client non trouvé' },
        { status: 404 }
      )
    }

    const concordances: Concordance[] = []

    // 1. Email partagé
    if (client.email) {
      const { data: emailMatches } = await supabase
        .from('clients_sar')
        .select('margill_id, nom_complet, score_fraude, etat_dossier')
        .eq('email', client.email)
        .neq('margill_id', margillId)

      if (emailMatches && emailMatches.length > 0) {
        concordances.push({
          type: 'email',
          valeur: client.email,
          clients: emailMatches,
          nombre: emailMatches.length,
          risque: emailMatches.length >= 3 ? 'critique' : emailMatches.length >= 2 ? 'eleve' : 'moyen'
        })
      }
    }

    // 2. Téléphone fixe partagé
    if (client.telephone) {
      const { data: telMatches } = await supabase
        .from('clients_sar')
        .select('margill_id, nom_complet, score_fraude, etat_dossier')
        .eq('telephone', client.telephone)
        .neq('margill_id', margillId)

      if (telMatches && telMatches.length > 0) {
        concordances.push({
          type: 'telephone',
          valeur: client.telephone,
          clients: telMatches,
          nombre: telMatches.length,
          risque: telMatches.length >= 3 ? 'critique' : telMatches.length >= 2 ? 'eleve' : 'moyen'
        })
      }
    }

    // 3. Téléphone mobile partagé
    if (client.telephone_mobile) {
      const { data: mobileMatches } = await supabase
        .from('clients_sar')
        .select('margill_id, nom_complet, score_fraude, etat_dossier')
        .eq('telephone_mobile', client.telephone_mobile)
        .neq('margill_id', margillId)

      if (mobileMatches && mobileMatches.length > 0) {
        concordances.push({
          type: 'telephone_mobile',
          valeur: client.telephone_mobile,
          clients: mobileMatches,
          nombre: mobileMatches.length,
          risque: mobileMatches.length >= 3 ? 'critique' : mobileMatches.length >= 2 ? 'eleve' : 'moyen'
        })
      }
    }

    // 4. Employeur partagé
    if (client.employeur) {
      const { data: employeurMatches } = await supabase
        .from('clients_sar')
        .select('margill_id, nom_complet, score_fraude, etat_dossier')
        .eq('employeur', client.employeur)
        .neq('margill_id', margillId)

      if (employeurMatches && employeurMatches.length > 0) {
        concordances.push({
          type: 'employeur',
          valeur: client.employeur,
          clients: employeurMatches,
          nombre: employeurMatches.length,
          risque: 'faible' // Employeur partagé = moins suspect
        })
      }
    }

    // 5. Ville + Province partagée
    if (client.ville && client.province) {
      const { data: villeMatches } = await supabase
        .from('clients_sar')
        .select('margill_id, nom_complet, score_fraude, etat_dossier')
        .eq('ville', client.ville)
        .eq('province', client.province)
        .neq('margill_id', margillId)

      if (villeMatches && villeMatches.length > 0 && villeMatches.length <= 20) {
        concordances.push({
          type: 'ville',
          valeur: `${client.ville}, ${client.province}`,
          clients: villeMatches,
          nombre: villeMatches.length,
          risque: 'faible'
        })
      }
    }

    // 6. Adresse complète partagée
    if (client.adresse_ligne1) {
      const { data: adresseMatches } = await supabase
        .from('clients_sar')
        .select('margill_id, nom_complet, score_fraude, etat_dossier')
        .eq('adresse_ligne1', client.adresse_ligne1)
        .neq('margill_id', margillId)

      if (adresseMatches && adresseMatches.length > 0) {
        concordances.push({
          type: 'adresse',
          valeur: client.adresse_ligne1,
          clients: adresseMatches,
          nombre: adresseMatches.length,
          risque: adresseMatches.length >= 3 ? 'critique' : adresseMatches.length >= 2 ? 'eleve' : 'moyen'
        })
      }
    }

    // 7. Compte bancaire partagé
    if (client.banque_compte) {
      const { data: compteMatches } = await supabase
        .from('clients_sar')
        .select('margill_id, nom_complet, score_fraude, etat_dossier')
        .eq('banque_compte', client.banque_compte)
        .neq('margill_id', margillId)

      if (compteMatches && compteMatches.length > 0) {
        concordances.push({
          type: 'banque_compte',
          valeur: client.banque_compte,
          clients: compteMatches,
          nombre: compteMatches.length,
          risque: 'critique' // Compte bancaire partagé = très suspect!
        })
      }
    }

    // 8. Institution bancaire partagée
    if (client.banque_institution) {
      const { data: banqueMatches } = await supabase
        .from('clients_sar')
        .select('margill_id, nom_complet, score_fraude, etat_dossier')
        .eq('banque_institution', client.banque_institution)
        .neq('margill_id', margillId)

      if (banqueMatches && banqueMatches.length > 0 && banqueMatches.length <= 50) {
        concordances.push({
          type: 'banque_institution',
          valeur: client.banque_institution,
          clients: banqueMatches,
          nombre: banqueMatches.length,
          risque: 'faible' // Banque commune = normal
        })
      }
    }

    // 9. Contacts d'urgence qui sont aussi des clients
    const contactNames = []
    if (client.contact1_nom) contactNames.push(client.contact1_nom)
    if (client.contact2_nom) contactNames.push(client.contact2_nom)

    for (const contactName of contactNames) {
      if (contactName) {
        const { data: contactMatches } = await supabase
          .from('clients_sar')
          .select('margill_id, nom_complet, score_fraude, etat_dossier')
          .ilike('nom_complet', `%${contactName}%`)
          .neq('margill_id', margillId)

        if (contactMatches && contactMatches.length > 0) {
          concordances.push({
            type: 'contact_nom',
            valeur: contactName,
            clients: contactMatches,
            nombre: contactMatches.length,
            risque: contactMatches.length >= 2 ? 'eleve' : 'moyen'
          })
        }
      }
    }

    // Trier par risque et nombre
    const risqueOrder = { critique: 0, eleve: 1, moyen: 2, faible: 3 }
    concordances.sort((a, b) => {
      if (risqueOrder[a.risque] !== risqueOrder[b.risque]) {
        return risqueOrder[a.risque] - risqueOrder[b.risque]
      }
      return b.nombre - a.nombre
    })

    return NextResponse.json({
      success: true,
      concordances,
      total: concordances.length,
      critique: concordances.filter(c => c.risque === 'critique').length,
      eleve: concordances.filter(c => c.risque === 'eleve').length
    })
  } catch (error) {
    console.error('Erreur concordances:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}
