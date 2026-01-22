/**
 * Script d'import des clients SAR depuis XLSX avec traçage complet
 *
 * Pipeline:
 * 1. Lecture XLSX → Validation → Transformation → Insertion Supabase
 * 2. Traçage à chaque étape
 * 3. Vérifications de dataflow
 */

import * as fs from 'fs'
import * as path from 'path'
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

// Charger les variables d'environnement
config({ path: path.join(process.cwd(), '.env.local') })

// ================== CONFIGURATION ==================
const xlsxFilePath = process.argv[2] || '/Users/xunit/Desktop/Margiil Files/liste-client-sar.xlsx'
const BATCH_SIZE = 100
const DRY_RUN = process.argv.includes('--dry-run')
const SKIP_DUPLICATES = process.argv.includes('--skip-duplicates')

// Variables d'environnement Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variables d\'environnement Supabase manquantes')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

// ================== TYPES ==================
interface ClientSAR {
  margill_id: string
  dossier_id?: string
  identifiant_unique_1?: string
  identifiant_unique_2?: string
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
  flag_documents_email?: boolean
}

interface PipelineStats {
  step: string
  input: number
  output: number
  errors: number
  duration: number
  details?: any
}

// ================== TRAÇAGE PIPELINE ==================
const pipelineTrace: PipelineStats[] = []

function logPipelineStep(step: string, input: number, output: number, errors: number, startTime: number, details?: any) {
  const duration = Date.now() - startTime
  pipelineTrace.push({ step, input, output, errors, duration, details })

  const emoji = errors > 0 ? '⚠️' : '✅'
  console.log(`\n${emoji} ${step}`)
  console.log(`   📥 Input: ${input}`)
  console.log(`   📤 Output: ${output}`)
  if (errors > 0) console.log(`   ❌ Errors: ${errors}`)
  console.log(`   ⏱️  Duration: ${duration}ms`)
  if (details) {
    Object.keys(details).forEach(key => {
      console.log(`   📊 ${key}: ${JSON.stringify(details[key])}`)
    })
  }
}

// ================== UTILITAIRES ==================
function parseDate(dateStr: string | number): string | undefined {
  if (!dateStr) return undefined

  try {
    // Si c'est un nombre Excel (jours depuis 1900-01-01)
    if (typeof dateStr === 'number') {
      const excelEpoch = new Date(1899, 11, 30)
      const date = new Date(excelEpoch.getTime() + dateStr * 86400000)
      return date.toISOString().split('T')[0]
    }

    // Si c'est une chaîne
    const str = String(dateStr).trim()
    if (str === '') return undefined

    // Format YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
      return str
    }

    // Format MM-DD-YYYY ou DD-MM-YYYY
    const parts = str.split(/[-/]/)
    if (parts.length === 3) {
      const [a, b, c] = parts
      // Si année en premier
      if (a.length === 4) return `${a}-${b.padStart(2, '0')}-${c.padStart(2, '0')}`
      // Sinon on assume MM-DD-YYYY (format Margill)
      return `${c}-${a.padStart(2, '0')}-${b.padStart(2, '0')}`
    }
  } catch (e) {
    console.warn(`⚠️  Date invalide: ${dateStr}`)
  }
  return undefined
}

function parseAmount(amount: string | number): number | undefined {
  if (!amount && amount !== 0) return undefined

  try {
    if (typeof amount === 'number') return amount

    const cleanAmount = String(amount).replace(/[$\s,]/g, '').trim()
    const parsed = parseFloat(cleanAmount)
    return isNaN(parsed) ? undefined : parsed
  } catch (e) {
    return undefined
  }
}

function parseInteger(int: string | number): number | undefined {
  if (!int && int !== 0) return undefined

  try {
    if (typeof int === 'number') return Math.floor(int)

    const parsed = parseInt(String(int), 10)
    return isNaN(parsed) ? undefined : parsed
  } catch (e) {
    return undefined
  }
}

// ================== LECTURE XLSX ==================
async function readXLSX(): Promise<any[]> {
  const startTime = Date.now()
  console.log('📖 ÉTAPE 1: Lecture du fichier XLSX...')
  console.log(`   📁 Fichier: ${xlsxFilePath}`)

  try {
    // Utiliser Python car xlsx n'est pas installé
    const pythonScript = `
import openpyxl
import json
import sys

wb = openpyxl.load_workbook('${xlsxFilePath}', read_only=True, data_only=True)
ws = wb.active

# Lire le header
headers = [cell.value for cell in ws[1]]

# Lire toutes les lignes
data = []
for row in ws.iter_rows(min_row=2, values_only=True):
    row_dict = {}
    for idx, (header, value) in enumerate(zip(headers, row)):
        if header:
            row_dict[str(header)] = value
    if row_dict:
        data.append(row_dict)

print(json.dumps(data, default=str))
wb.close()
`

    fs.writeFileSync('/tmp/read-xlsx-import.py', pythonScript)

    const { execSync } = require('child_process')
    const output = execSync('python3 /tmp/read-xlsx-import.py', {
      maxBuffer: 50 * 1024 * 1024,
      encoding: 'utf-8'
    })

    const records = JSON.parse(output)

    logPipelineStep(
      'Lecture XLSX',
      records.length,
      records.length,
      0,
      startTime,
      {
        fileSize: fs.statSync(xlsxFilePath).size,
        fileName: path.basename(xlsxFilePath)
      }
    )

    return records
  } catch (error: any) {
    console.error('❌ Erreur lecture XLSX:', error.message)
    logPipelineStep('Lecture XLSX', 0, 0, 1, startTime, { error: error.message })
    throw error
  }
}

// ================== TRANSFORMATION ==================
function transformClient(row: any): ClientSAR | null {
  try {
    // Colonne 1: Margill ID (OBLIGATOIRE)
    const margillId = String(row['Emprunteur - Identifiant'] || '').trim()
    if (!margillId || margillId === '') {
      return null // Ligne invalide
    }

    // Construire le client
    const client: ClientSAR = {
      // Identifiants
      margill_id: margillId,
      dossier_id: row['Identification GPM du Dossier'] ? String(row['Identification GPM du Dossier']).trim() : undefined,
      identifiant_unique_1: row['Emprunteur - Identifiant unique 1'] ? String(row['Emprunteur - Identifiant unique 1']).trim() : undefined,
      identifiant_unique_2: row['Emprunteur - Identifiant unique 2'] ? String(row['Emprunteur - Identifiant unique 2']).trim() : undefined,

      // Informations personnelles
      prenom: row['Emprunteur - Prénom'] ? String(row['Emprunteur - Prénom']).trim() : undefined,
      nom: row['Emprunteur - Nom'] ? String(row['Emprunteur - Nom']).trim() : undefined,
      nom_complet: row['Emprunteur - Prénom Nom'] ? String(row['Emprunteur - Prénom Nom']).trim() : undefined,
      date_naissance: parseDate(row['Emprunteur - Date de naissance'] || row['Date de naissance client']),
      nas: row['Emprunteur - Numéro d\'assurance sociale'] ? String(row['Emprunteur - Numéro d\'assurance sociale']).trim() : undefined,

      // Contact
      email: row['Emprunteur - Courriel'] ? String(row['Emprunteur - Courriel']).trim().toLowerCase() : undefined,
      telephone: row['Emprunteur - Numéro de Téléphone'] ? String(row['Emprunteur - Numéro de Téléphone']).trim() : undefined,
      telephone_mobile: row['Emprunteur - Numéro de Mobile'] ? String(row['Emprunteur - Numéro de Mobile']).trim() : undefined,

      // Adresse
      adresse_ligne1: row['Emprunteur - Adresse 1'] ? String(row['Emprunteur - Adresse 1']).trim() : undefined,
      adresse_ligne2: row['Emprunteur - Adresse 2'] ? String(row['Emprunteur - Adresse 2']).trim() : undefined,
      ville: row['Emprunteur - Ville'] ? String(row['Emprunteur - Ville']).trim() : undefined,
      province: row['Emprunteur - Province, État'] ? String(row['Emprunteur - Province, État']).trim() : undefined,
      code_postal: row['Emprunteur - Code postal'] ? String(row['Emprunteur - Code postal']).trim() : undefined,
      pays: row['Emprunteur - Pays'] ? String(row['Emprunteur - Pays']).trim() : undefined,

      // Employeur
      employeur: row['Employeur'] ? String(row['Employeur']).trim() : undefined,
      telephone_employeur: row['Téléphone de l\'employeur'] ? String(row['Téléphone de l\'employeur']).trim() : undefined,
      date_embauche: parseDate(row['Date d\'embauche']),
      occupation: row['Emprunteur - Occupation'] ? String(row['Emprunteur - Occupation']).trim() : undefined,
      personne_contact_employeur: row['Personne à contacter chez l\'employeur'] ? String(row['Personne à contacter chez l\'employeur']).trim() : undefined,

      // Contacts
      contact1_nom: row['Contact 1'] ? String(row['Contact 1']).trim() : undefined,
      contact1_telephone: row['Téléphone contact 1'] ? String(row['Téléphone contact 1']).trim() : undefined,
      contact2_nom: row['Contact 2'] ? String(row['Contact 2']).trim() : undefined,
      contact2_telephone: row['Téléphone contact 2'] ? String(row['Téléphone contact 2']).trim() : undefined,

      // Informations bancaires
      banque_institution: row['Compte bancaire CA - Institution'] ? String(row['Compte bancaire CA - Institution']).trim() : undefined,
      banque_transit: row['Compte bancaire CA - Transit'] ? String(row['Compte bancaire CA - Transit']).trim() : undefined,
      banque_compte: row['Compte bancaire CA - Numéro de compte'] ? String(row['Compte bancaire CA - Numéro de compte']).trim() : undefined,

      // Informations financières
      capital_origine: parseAmount(row['Capital d\'origine']),
      montant_paiement: parseAmount(row['Montant des paiements (Original)']),
      frequence_paiement: row['Fréquence des paiements (Originale)(incluant jours)'] ? String(row['Fréquence des paiements (Originale)(incluant jours)']).trim() : undefined,

      // État du dossier
      etat_dossier: row['État du Dossier'] ? String(row['État du Dossier']).trim() : undefined,
      responsable_dossier: row['Responsable du Dossier'] ? String(row['Responsable du Dossier']).trim() : undefined,
      date_creation_dossier: parseDate(row['Date de création du Dossier']),
      date_maj_dossier: parseDate(row['Dernière mise à jour du Dossier']),

      // Statistiques de paiement
      total_paiements_positifs: parseAmount(row['Total des paiements Positifs (Prêt complet)']),
      total_paiements_negatifs: parseAmount(row['Total des paiements Négatifs (Prêt complet)']),
      nombre_paiements_faits: parseInteger(row['Nombre d\'occurrences de Pmt fait (tous) (pour période)']),
      nombre_paiements_non_payes: parseInteger(row['Nombre d\'occurrences de Pmt non payé (tous) (pour période)']),
      nombre_mauvaises_creances: parseInteger(row['Nombre d\'occurrences des Mauvaises créances (pour période)']),

      // Soldes
      solde_actuel: parseAmount(row['Solde à Date Fin rapport']),
      solde_capital_recevoir: parseAmount(row['Solde Capital à recevoir à Date de Fin rapport']),

      // Dates de paiement
      date_premier_paiement: parseDate(row['Première transaction positive - Date']),
      date_dernier_paiement: parseDate(row['Dernière transaction positive - Date']),
      montant_dernier_paiement: parseAmount(row['Dernière transaction positive - Montant']),
      etat_dernier_paiement: row['Dernier paiement Payé (tous États de ligne Payé)(Prêt complet) - État de ligne'] ? String(row['Dernier paiement Payé (tous États de ligne Payé)(Prêt complet) - État de ligne']).trim() : undefined,

      // IBV
      lien_ibv: row['Lien IBV'] ? String(row['Lien IBV']).trim() : undefined,

      // Flags de fraude
      flag_pas_ibv: !row['Lien IBV'] || String(row['Lien IBV']).trim() === '',
      flag_mauvaise_creance: parseInteger(row['Nombre d\'occurrences des Mauvaises créances (pour période)']) > 0,
      flag_paiement_rate_precoce: false, // Calculé après
      flag_documents_email: false
    }

    // Calculer flag_paiement_rate_precoce
    if (client.nombre_paiements_non_payes && client.nombre_paiements_faits) {
      const totalPaiements = client.nombre_paiements_non_payes + client.nombre_paiements_faits
      if (totalPaiements > 0 && client.nombre_paiements_non_payes > 0) {
        // Si raté dans les 3 premiers paiements
        if (client.nombre_paiements_faits <= 3) {
          client.flag_paiement_rate_precoce = true
        }
      }
    }

    return client
  } catch (error: any) {
    console.warn(`⚠️  Erreur transformation client: ${error.message}`)
    return null
  }
}

// ================== INSERTION SUPABASE ==================
async function insertBatch(clients: ClientSAR[], batchIndex: number, totalBatches: number): Promise<{ inserted: number, errors: number }> {
  const startTime = Date.now()

  try {
    if (DRY_RUN) {
      console.log(`   Lot ${batchIndex}/${totalBatches} (${clients.length} clients)... 🧪 DRY-RUN (simulation)`)
      return { inserted: clients.length, errors: 0 }
    }

    // Dé-dupliquer dans le lot
    const uniqueClients = Array.from(
      new Map(clients.map(c => [c.margill_id, c])).values()
    )

    if (uniqueClients.length < clients.length) {
      console.log(`   ⚠️  Lot ${batchIndex}: ${clients.length - uniqueClients.length} duplicates internes supprimés`)
    }

    const { data, error } = await supabase
      .from('clients_sar')
      .upsert(uniqueClients, {
        onConflict: 'margill_id',
        ignoreDuplicates: SKIP_DUPLICATES
      })

    if (error) {
      console.log(`   Lot ${batchIndex}/${totalBatches} (${uniqueClients.length} clients)... ❌ Erreur`)
      console.log(error)
      return { inserted: 0, errors: uniqueClients.length }
    }

    const duration = Date.now() - startTime
    console.log(`   Lot ${batchIndex}/${totalBatches} (${uniqueClients.length} clients)... ✅ (${duration}ms)`)
    return { inserted: uniqueClients.length, errors: 0 }
  } catch (error: any) {
    console.log(`   Lot ${batchIndex}/${totalBatches}... ❌ Exception: ${error.message}`)
    return { inserted: 0, errors: clients.length }
  }
}

// ================== VÉRIFICATION DATAFLOW ==================
async function verifyDataflow() {
  console.log('\n🔍 VÉRIFICATION DU DATAFLOW\n')

  const checks = []

  // Check 1: Connexion Supabase
  try {
    const { data, error } = await supabase.from('clients_sar').select('count', { count: 'exact', head: true })
    if (error) throw error
    checks.push({ check: 'Connexion Supabase', status: '✅', details: 'OK' })
  } catch (e: any) {
    checks.push({ check: 'Connexion Supabase', status: '❌', details: e.message })
  }

  // Check 2: Fichier XLSX existe
  try {
    if (!fs.existsSync(xlsxFilePath)) throw new Error('Fichier introuvable')
    const stats = fs.statSync(xlsxFilePath)
    checks.push({ check: 'Fichier XLSX', status: '✅', details: `${(stats.size / 1024 / 1024).toFixed(2)} MB` })
  } catch (e: any) {
    checks.push({ check: 'Fichier XLSX', status: '❌', details: e.message })
  }

  // Check 3: Python disponible
  try {
    const { execSync } = require('child_process')
    const version = execSync('python3 --version', { encoding: 'utf-8' }).trim()
    checks.push({ check: 'Python3', status: '✅', details: version })
  } catch (e: any) {
    checks.push({ check: 'Python3', status: '❌', details: 'Non disponible' })
  }

  // Check 4: openpyxl disponible
  try {
    const { execSync } = require('child_process')
    execSync('python3 -c "import openpyxl"', { encoding: 'utf-8' })
    checks.push({ check: 'openpyxl', status: '✅', details: 'Installé' })
  } catch (e: any) {
    checks.push({ check: 'openpyxl', status: '❌', details: 'Non installé' })
  }

  // Afficher les résultats
  checks.forEach(({ check, status, details }) => {
    console.log(`${status} ${check}: ${details}`)
  })

  const allPassed = checks.every(c => c.status === '✅')
  console.log(`\n${allPassed ? '✅' : '❌'} Vérification dataflow: ${allPassed ? 'PASSED' : 'FAILED'}`)

  return allPassed
}

// ================== MAIN ==================
async function main() {
  console.log('🚀 IMPORT CLIENTS SAR DEPUIS XLSX')
  console.log('=' .repeat(60))
  console.log(`📁 Fichier: ${xlsxFilePath}`)
  console.log(`🏢 Supabase: ${supabaseUrl}`)
  console.log(`📦 Taille des lots: ${BATCH_SIZE}`)
  console.log(`🧪 Mode dry-run: ${DRY_RUN ? 'OUI' : 'NON'}`)
  console.log(`🔄 Skip duplicates: ${SKIP_DUPLICATES ? 'OUI' : 'NON'}`)
  console.log('=' .repeat(60))

  // Vérification préalable
  const dataflowOK = await verifyDataflow()
  if (!dataflowOK) {
    console.error('\n❌ Vérification dataflow échouée. Arrêt.')
    process.exit(1)
  }

  try {
    // ÉTAPE 1: Lecture XLSX
    const records = await readXLSX()

    // ÉTAPE 2: Transformation
    console.log('\n🔄 ÉTAPE 2: Transformation des données...')
    const startTransform = Date.now()
    const clients = records
      .map(transformClient)
      .filter((c): c is ClientSAR => c !== null)

    logPipelineStep(
      'Transformation',
      records.length,
      clients.length,
      records.length - clients.length,
      startTransform,
      {
        'Lignes invalides': records.length - clients.length,
        'Taux de succès': `${((clients.length / records.length) * 100).toFixed(1)}%`
      }
    )

    // Statistiques de fraude
    const statsIBV = clients.filter(c => c.flag_pas_ibv).length
    const statsMauvaisCreance = clients.filter(c => c.flag_mauvaise_creance).length
    const statsPaiementRatePrecoce = clients.filter(c => c.flag_paiement_rate_precoce).length
    const withDossierId = clients.filter(c => c.dossier_id).length

    console.log('\n📊 Statistiques de fraude détectées:')
    console.log(`   - Sans IBV: ${statsIBV} (${((statsIBV / clients.length) * 100).toFixed(1)}%)`)
    console.log(`   - Mauvaises créances: ${statsMauvaisCreance} (${((statsMauvaisCreance / clients.length) * 100).toFixed(1)}%)`)
    console.log(`   - Paiement raté précoce: ${statsPaiementRatePrecoce} (${((statsPaiementRatePrecoce / clients.length) * 100).toFixed(1)}%)`)
    console.log(`   - Avec N° contrat (MC): ${withDossierId} (${((withDossierId / clients.length) * 100).toFixed(1)}%)`)

    // ÉTAPE 3: Insertion dans Supabase
    console.log('\n💾 ÉTAPE 3: Insertion dans Supabase...')
    const startInsert = Date.now()

    let totalInserted = 0
    let totalErrors = 0

    // Diviser en lots
    const batches: ClientSAR[][] = []
    for (let i = 0; i < clients.length; i += BATCH_SIZE) {
      batches.push(clients.slice(i, i + BATCH_SIZE))
    }

    // Insérer lot par lot
    for (let i = 0; i < batches.length; i++) {
      const result = await insertBatch(batches[i], i + 1, batches.length)
      totalInserted += result.inserted
      totalErrors += result.errors

      // Petit délai entre les lots pour éviter la surcharge
      if (i < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }

    logPipelineStep(
      'Insertion Supabase',
      clients.length,
      totalInserted,
      totalErrors,
      startInsert,
      {
        'Batches': batches.length,
        'Taux de succès': `${((totalInserted / clients.length) * 100).toFixed(1)}%`
      }
    )

    // RÉSUMÉ FINAL
    console.log('\n' + '='.repeat(60))
    console.log('📊 RÉSULTATS DE L\'IMPORT')
    console.log('='.repeat(60))
    console.log(`   ✅ Insérés: ${totalInserted}`)
    console.log(`   ❌ Erreurs: ${totalErrors}`)
    console.log(`   📈 Taux de succès: ${((totalInserted / clients.length) * 100).toFixed(1)}%`)

    // Trace complète du pipeline
    console.log('\n📋 TRACE DU PIPELINE:')
    console.log('='.repeat(60))
    pipelineTrace.forEach((step, idx) => {
      console.log(`\n${idx + 1}. ${step.step}`)
      console.log(`   Input: ${step.input} | Output: ${step.output} | Errors: ${step.errors}`)
      console.log(`   Duration: ${step.duration}ms`)
      if (step.details) {
        Object.entries(step.details).forEach(([key, val]) => {
          console.log(`   ${key}: ${JSON.stringify(val)}`)
        })
      }
    })

    // Sauvegarder la trace
    const traceFile = '/tmp/import-trace.json'
    fs.writeFileSync(traceFile, JSON.stringify(pipelineTrace, null, 2))
    console.log(`\n💾 Trace sauvegardée: ${traceFile}`)

    console.log('\n✅ Import terminé!')

  } catch (error: any) {
    console.error('\n❌ Erreur fatale:', error)
    console.error(error.stack)
    process.exit(1)
  }
}

// Exécution
main()
