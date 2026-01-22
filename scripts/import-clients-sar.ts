#!/usr/bin/env tsx
/**
 * Script d'import des clients SAR depuis le CSV Margill vers Supabase
 *
 * Usage:
 *   tsx scripts/import-clients-sar.ts /path/to/clientsar.csv
 *
 * Options:
 *   --dry-run: Affiche les données sans les insérer
 *   --batch-size=100: Taille des lots pour l'insertion (défaut: 100)
 *   --skip-duplicates: Ignore les clients déjà présents (par margill_id)
 */

// Charger les variables d'environnement
import { config } from 'dotenv'
import * as fs from 'fs'
import * as path from 'path'
import { parse } from 'csv-parse/sync'
import { createClient } from '@supabase/supabase-js'

// Charger .env.local
config({ path: path.join(process.cwd(), '.env.local') })

// Configuration
const BATCH_SIZE = parseInt(process.env.BATCH_SIZE || '100')
const DRY_RUN = process.argv.includes('--dry-run')
const SKIP_DUPLICATES = process.argv.includes('--skip-duplicates')

// Obtenir le chemin du fichier CSV
const csvFilePath = process.argv.find(arg => !arg.startsWith('--') && arg.endsWith('.csv'))
  || '/Users/xunit/Desktop/clientsar.csv'

// Client Supabase avec SERVICE_ROLE_KEY
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY!

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variables d\'environnement Supabase manquantes')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

// Mapping des colonnes CSV vers les champs de la table
interface MargillClient {
  'Emprunteur - Identifiant': string
  'Emprunteur - Prénom': string
  'Emprunteur - Nom': string
  'Emprunteur - Prénom Nom': string
  'Emprunteur - Date de naissance': string
  'Date de naissance client': string
  'Emprunteur - Numéro d\'assurance sociale': string
  'Emprunteur - Courriel': string
  'Emprunteur - Numéro de Téléphone': string
  'Emprunteur - Numéro de Mobile': string
  'Emprunteur - Adresse 1': string
  'Emprunteur - Adresse 2': string
  'Emprunteur - Ville': string
  'Emprunteur - Province, État': string
  'Emprunteur - Code postal': string
  'Emprunteur - Pays': string
  'Employeur': string
  'Téléphone de l\'employeur': string
  'Date d\'embauche': string
  'Emprunteur - Occupation': string
  'Personne à contacter chez l\'employeur': string
  'Contact 1': string
  'Téléphone contact 1': string
  'Contact 2': string
  'Téléphone contact 2': string
  'Compte bancaire CA - Institution': string
  'Compte bancaire CA - Transit': string
  'Compte bancaire CA - Numéro de compte': string
  'Capital d\'origine': string
  'Montant des paiements (Original)': string
  'Fréquence des paiements (Originale)(incluant jours)': string
  'État du Dossier': string
  'Responsable du Dossier': string
  'Date de création du Dossier': string
  'Dernière mise à jour du Dossier': string
  'Total des paiements Positifs (Prêt complet)': string
  'Total des paiements Négatifs (Prêt complet)': string
  'Nombre d\'occurrences de Pmt fait (tous) (pour période)': string
  'Nombre d\'occurrences de Pmt non payé (tous) (pour période)': string
  'Nombre d\'occurrences des Mauvaises créances (pour période)': string
  'Solde à Date Fin rapport': string
  'Solde Capital à recevoir à Date de Fin rapport': string
  'Première transaction positive - Date': string
  'Dernière transaction positive - Date': string
  'Dernière transaction positive - Montant': string
  'Dernier paiement Payé (tous États de ligne Payé)(Prêt complet) - État de ligne': string
  'Lien IBV': string
  'Identification GPM du Dossier': string
  [key: string]: string
}

interface ClientSAR {
  margill_id: string
  dossier_id?: string
  prenom?: string
  nom?: string
  nom_complet?: string
  date_naissance?: string
  nas?: string
  email?: string
  telephone?: string
  telephone_mobile?: string
  adresse_ligne1?: string
  adresse_ligne2?: string
  ville?: string
  province?: string
  code_postal?: string
  pays?: string
  employeur?: string
  telephone_employeur?: string
  date_embauche?: string
  occupation?: string
  personne_contact_employeur?: string
  contact1_nom?: string
  contact1_telephone?: string
  contact2_nom?: string
  contact2_telephone?: string
  banque_institution?: string
  banque_transit?: string
  banque_compte?: string
  capital_origine?: number
  montant_paiement?: number
  frequence_paiement?: string
  etat_dossier?: string
  responsable_dossier?: string
  date_creation_dossier?: string
  date_maj_dossier?: string
  total_paiements_positifs?: number
  total_paiements_negatifs?: number
  nombre_paiements_faits?: number
  nombre_paiements_non_payes?: number
  nombre_mauvaises_creances?: number
  solde_actuel?: number
  solde_capital_recevoir?: number
  date_premier_paiement?: string
  date_dernier_paiement?: string
  montant_dernier_paiement?: number
  etat_dernier_paiement?: string
  lien_ibv?: string
  flag_pas_ibv?: boolean
  flag_mauvaise_creance?: boolean
  flag_paiement_rate_precoce?: boolean
  raw_data?: any
}

// Fonction pour parser une date au format MM-DD-YYYY ou YYYY-MM-DD
function parseDate(dateStr: string): string | undefined {
  if (!dateStr || dateStr.trim() === '') return undefined

  try {
    // Essayer différents formats
    const parts = dateStr.split(/[-/]/)
    if (parts.length === 3) {
      // Format YYYY-MM-DD
      if (parts[0].length === 4) {
        return dateStr
      }
      // Format MM-DD-YYYY ou DD-MM-YYYY - on assume MM-DD-YYYY pour Margill
      const [month, day, year] = parts
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
    }
  } catch (e) {
    console.warn(`⚠️  Date invalide: ${dateStr}`)
  }
  return undefined
}

// Fonction pour parser un montant monétaire
function parseAmount(amountStr: string): number | undefined {
  if (!amountStr || amountStr.trim() === '') return undefined

  try {
    // Enlever les espaces, virgules, et symboles $
    const cleanAmount = amountStr.replace(/[$\s,]/g, '').trim()
    const amount = parseFloat(cleanAmount)
    return isNaN(amount) ? undefined : amount
  } catch (e) {
    return undefined
  }
}

// Fonction pour parser un entier
function parseInteger(intStr: string): number | undefined {
  if (!intStr || intStr.trim() === '') return undefined

  try {
    const int = parseInt(intStr, 10)
    return isNaN(int) ? undefined : int
  } catch (e) {
    return undefined
  }
}

// Fonction pour transformer une ligne CSV en objet ClientSAR
function transformClient(row: MargillClient): ClientSAR | null {
  const margillId = row['Emprunteur - Identifiant']?.trim()

  // Ignorer les lignes sans ID ou avec ID vide
  if (!margillId || margillId === '') {
    return null
  }

  const lienIBV = row['Lien IBV']?.trim()
  const nombreMauvaisesCreances = parseInteger(row['Nombre d\'occurrences des Mauvaises créances (pour période)']) || 0

  // Date de naissance - essayer les deux champs
  const dateNaissance = parseDate(row['Emprunteur - Date de naissance']) || parseDate(row['Date de naissance client'])

  // Calculer les flags de fraude
  const flagPasIBV = !lienIBV || lienIBV === ''
  const flagMauvaisCreance = nombreMauvaisesCreances > 0

  // Vérifier paiement raté précoce (si paiements non payés > 0 et date création < 3 mois)
  const dateCreation = parseDate(row['Date de création du Dossier'])
  const nombrePaiementsNonPayes = parseInteger(row['Nombre d\'occurrences de Pmt non payé (tous) (pour période)']) || 0
  let flagPaiementRatePrecoce = false

  if (dateCreation && nombrePaiementsNonPayes > 0) {
    const dateCreationObj = new Date(dateCreation)
    const datePremierPaiement = parseDate(row['Première transaction positive - Date'])
    if (datePremierPaiement) {
      const datePremierPaiementObj = new Date(datePremierPaiement)
      const diffMonths = (datePremierPaiementObj.getTime() - dateCreationObj.getTime()) / (1000 * 60 * 60 * 24 * 30)
      flagPaiementRatePrecoce = diffMonths <= 3
    }
  }

  const client: ClientSAR = {
    margill_id: margillId,
    dossier_id: row['Identification GPM du Dossier']?.trim(),
    prenom: row['Emprunteur - Prénom']?.trim(),
    nom: row['Emprunteur - Nom']?.trim(),
    nom_complet: row['Emprunteur - Prénom Nom']?.trim(),
    date_naissance: dateNaissance,
    nas: row['Emprunteur - Numéro d\'assurance sociale']?.trim(),
    email: row['Emprunteur - Courriel']?.trim().toLowerCase(),
    telephone: row['Emprunteur - Numéro de Téléphone']?.trim(),
    telephone_mobile: row['Emprunteur - Numéro de Mobile']?.trim(),
    adresse_ligne1: row['Emprunteur - Adresse 1']?.trim(),
    adresse_ligne2: row['Emprunteur - Adresse 2']?.trim(),
    ville: row['Emprunteur - Ville']?.trim(),
    province: row['Emprunteur - Province, État']?.trim(),
    code_postal: row['Emprunteur - Code postal']?.trim(),
    pays: row['Emprunteur - Pays']?.trim() || 'CA',
    employeur: row['Employeur']?.trim(),
    telephone_employeur: row['Téléphone de l\'employeur']?.trim(),
    date_embauche: parseDate(row['Date d\'embauche']),
    occupation: row['Emprunteur - Occupation']?.trim(),
    personne_contact_employeur: row['Personne à contacter chez l\'employeur']?.trim(),
    contact1_nom: row['Contact 1']?.trim(),
    contact1_telephone: row['Téléphone contact 1']?.trim(),
    contact2_nom: row['Contact 2']?.trim(),
    contact2_telephone: row['Téléphone contact 2']?.trim(),
    banque_institution: row['Compte bancaire CA - Institution']?.trim(),
    banque_transit: row['Compte bancaire CA - Transit']?.trim(),
    banque_compte: row['Compte bancaire CA - Numéro de compte']?.trim(),
    capital_origine: parseAmount(row['Capital d\'origine']),
    montant_paiement: parseAmount(row['Montant des paiements (Original)']),
    frequence_paiement: row['Fréquence des paiements (Originale)(incluant jours)']?.trim(),
    etat_dossier: row['État du Dossier']?.trim(),
    responsable_dossier: row['Responsable du Dossier']?.trim(),
    date_creation_dossier: parseDate(row['Date de création du Dossier']),
    date_maj_dossier: parseDate(row['Dernière mise à jour du Dossier']),
    total_paiements_positifs: parseAmount(row['Total des paiements Positifs (Prêt complet)']),
    total_paiements_negatifs: parseAmount(row['Total des paiements Négatifs (Prêt complet)']),
    nombre_paiements_faits: parseInteger(row['Nombre d\'occurrences de Pmt fait (tous) (pour période)']),
    nombre_paiements_non_payes: nombrePaiementsNonPayes,
    nombre_mauvaises_creances: nombreMauvaisesCreances,
    solde_actuel: parseAmount(row['Solde à Date Fin rapport']),
    solde_capital_recevoir: parseAmount(row['Solde Capital à recevoir à Date de Fin rapport']),
    date_premier_paiement: parseDate(row['Première transaction positive - Date']),
    date_dernier_paiement: parseDate(row['Dernière transaction positive - Date']),
    montant_dernier_paiement: parseAmount(row['Dernière transaction positive - Montant']),
    etat_dernier_paiement: row['Dernier paiement Payé (tous États de ligne Payé)(Prêt complet) - État de ligne']?.trim(),
    lien_ibv: lienIBV,
    flag_pas_ibv: flagPasIBV,
    flag_mauvaise_creance: flagMauvaisCreance,
    flag_paiement_rate_precoce: flagPaiementRatePrecoce,
    raw_data: row // Conserver les données brutes pour référence
  }

  return client
}

// Fonction principale d'import
async function importClients() {
  console.log('🚀 Début de l\'import des clients SAR')
  console.log(`📁 Fichier: ${csvFilePath}`)
  console.log(`🏢 Supabase: ${supabaseUrl}`)
  console.log(`📦 Taille des lots: ${BATCH_SIZE}`)
  console.log(`🧪 Mode dry-run: ${DRY_RUN ? 'OUI' : 'NON'}`)
  console.log('')

  // Vérifier l'existence du fichier
  if (!fs.existsSync(csvFilePath)) {
    console.error(`❌ Fichier introuvable: ${csvFilePath}`)
    process.exit(1)
  }

  // Lire le fichier CSV
  console.log('📖 Lecture du fichier CSV...')
  const fileContent = fs.readFileSync(csvFilePath, 'utf-8')

  // Parser le CSV (en ignorant les 3 premières lignes vides/headers)
  const records = parse(fileContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    delimiter: ',',
    relax_column_count: true,
    from_line: 2 // Ignorer la première ligne vide
  }) as MargillClient[]

  console.log(`✅ ${records.length} lignes lues`)
  console.log('')

  // Transformer les données
  console.log('🔄 Transformation des données...')
  const clients = records
    .map(transformClient)
    .filter((c): c is ClientSAR => c !== null)

  console.log(`✅ ${clients.length} clients valides transformés`)
  console.log('')

  // Statistiques de fraude
  const statsIBV = clients.filter(c => c.flag_pas_ibv).length
  const statsMauvaisCreance = clients.filter(c => c.flag_mauvaise_creance).length
  const statsPaiementRatePrecoce = clients.filter(c => c.flag_paiement_rate_precoce).length

  console.log('📊 Statistiques de fraude détectées:')
  console.log(`   - Sans IBV: ${statsIBV} (${((statsIBV / clients.length) * 100).toFixed(1)}%)`)
  console.log(`   - Mauvaises créances: ${statsMauvaisCreance} (${((statsMauvaisCreance / clients.length) * 100).toFixed(1)}%)`)
  console.log(`   - Paiement raté précoce: ${statsPaiementRatePrecoce} (${((statsPaiementRatePrecoce / clients.length) * 100).toFixed(1)}%)`)
  console.log('')

  if (DRY_RUN) {
    console.log('🧪 Mode dry-run: affichage des 5 premiers clients')
    console.log(JSON.stringify(clients.slice(0, 5), null, 2))
    console.log('')
    console.log('✅ Dry-run terminé')
    return
  }

  // Insertion par lots
  console.log('💾 Insertion dans Supabase...')
  let inserted = 0
  let errors = 0
  let skipped = 0

  for (let i = 0; i < clients.length; i += BATCH_SIZE) {
    const batch = clients.slice(i, i + BATCH_SIZE)
    const batchNum = Math.floor(i / BATCH_SIZE) + 1
    const totalBatches = Math.ceil(clients.length / BATCH_SIZE)

    process.stdout.write(`   Lot ${batchNum}/${totalBatches} (${batch.length} clients)... `)

    try {
      if (SKIP_DUPLICATES) {
        // Insertion avec upsert (update si existe, insert sinon)
        const { data, error } = await supabase
          .from('clients_sar')
          .upsert(batch, {
            onConflict: 'margill_id',
            ignoreDuplicates: false
          })

        if (error) {
          console.log(`❌ Erreur`)
          console.error(error)
          errors += batch.length
        } else {
          console.log(`✅`)
          inserted += batch.length
        }
      } else {
        // Insertion simple
        const { data, error } = await supabase
          .from('clients_sar')
          .insert(batch)

        if (error) {
          // Vérifier si c'est une erreur de duplication
          if (error.message.includes('duplicate') || error.code === '23505') {
            console.log(`⚠️  Doublons détectés`)
            skipped += batch.length
          } else {
            console.log(`❌ Erreur`)
            console.error(error)
            errors += batch.length
          }
        } else {
          console.log(`✅`)
          inserted += batch.length
        }
      }
    } catch (e: any) {
      console.log(`❌ Exception`)
      console.error(e.message)
      errors += batch.length
    }

    // Petite pause pour éviter de surcharger l'API
    await new Promise(resolve => setTimeout(resolve, 100))
  }

  console.log('')
  console.log('📊 Résultats de l\'import:')
  console.log(`   ✅ Insérés: ${inserted}`)
  console.log(`   ⚠️  Ignorés (doublons): ${skipped}`)
  console.log(`   ❌ Erreurs: ${errors}`)
  console.log('')
  console.log('✅ Import terminé!')
}

// Exécuter l'import
importClients().catch(error => {
  console.error('❌ Erreur fatale:', error)
  process.exit(1)
})
