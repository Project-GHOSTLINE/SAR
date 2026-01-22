import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

export async function GET() {
  try {
    // Récupérer tous les clients
    const { data: clients, error } = await supabase
      .from('clients_sar')
      .select('margill_id, email, telephone, telephone_mobile, adresse_ligne1, banque_compte, contact1_nom, contact2_nom, nom_complet')

    if (error || !clients) {
      console.error('Erreur récupération clients:', error)
      return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
    }

    // Créer des maps pour compter les occurrences
    const emailMap = new Map<string, number>()
    const telephoneMap = new Map<string, number>()
    const mobileMap = new Map<string, number>()
    const adresseMap = new Map<string, number>()
    const compteMap = new Map<string, number>()

    // Compter les occurrences
    for (const client of clients) {
      if (client.email) {
        emailMap.set(client.email, (emailMap.get(client.email) || 0) + 1)
      }
      if (client.telephone) {
        telephoneMap.set(client.telephone, (telephoneMap.get(client.telephone) || 0) + 1)
      }
      if (client.telephone_mobile) {
        mobileMap.set(client.telephone_mobile, (mobileMap.get(client.telephone_mobile) || 0) + 1)
      }
      if (client.adresse_ligne1) {
        adresseMap.set(client.adresse_ligne1, (adresseMap.get(client.adresse_ligne1) || 0) + 1)
      }
      if (client.banque_compte) {
        compteMap.set(client.banque_compte, (compteMap.get(client.banque_compte) || 0) + 1)
      }
    }

    // Identifier les clients avec concordances critiques/élevées
    const clientsAvecConcordances = new Set<string>()

    for (const client of clients) {
      let hasCritique = false
      let hasEleve = false

      // Email partagé (critique si 3+, élevé si 2+)
      if (client.email && emailMap.get(client.email)! > 1) {
        if (emailMap.get(client.email)! >= 3) hasCritique = true
        else hasEleve = true
      }

      // Téléphone partagé
      if (client.telephone && telephoneMap.get(client.telephone)! > 1) {
        if (telephoneMap.get(client.telephone)! >= 3) hasCritique = true
        else hasEleve = true
      }

      // Mobile partagé
      if (client.telephone_mobile && mobileMap.get(client.telephone_mobile)! > 1) {
        if (mobileMap.get(client.telephone_mobile)! >= 3) hasCritique = true
        else hasEleve = true
      }

      // Adresse partagée
      if (client.adresse_ligne1 && adresseMap.get(client.adresse_ligne1)! > 1) {
        if (adresseMap.get(client.adresse_ligne1)! >= 3) hasCritique = true
        else hasEleve = true
      }

      // Compte bancaire partagé (toujours critique)
      if (client.banque_compte && compteMap.get(client.banque_compte)! > 1) {
        hasCritique = true
      }

      // Contact = Client (toujours élevé)
      if (client.contact1_nom || client.contact2_nom) {
        const contactNames = [client.contact1_nom, client.contact2_nom].filter(Boolean)
        for (const contactName of contactNames) {
          const found = clients.some(c =>
            c.margill_id !== client.margill_id &&
            c.nom_complet &&
            contactName &&
            c.nom_complet.toLowerCase().includes(contactName.toLowerCase())
          )
          if (found) {
            hasEleve = true
            break
          }
        }
      }

      if (hasCritique || hasEleve) {
        clientsAvecConcordances.add(client.margill_id)
      }
    }

    return NextResponse.json({
      success: true,
      total: clientsAvecConcordances.size,
      clientIds: Array.from(clientsAvecConcordances)
    })
  } catch (error) {
    console.error('Erreur concordances stats:', error)
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
  }
}
