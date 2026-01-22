/**
 * Script d'import des clients SAR depuis XML avec traçage complet
 *
 * Pipeline:
 * 1. Lecture XML → Validation → Transformation → Insertion Supabase
 * 2. Traçage à chaque étape
 * 3. Support des numéros MC**** et P****
 */

import * as fs from 'fs'
import * as path from 'path'
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

// Charger les variables d'environnement
config({ path: path.join(process.cwd(), '.env.local') })

// ================== CONFIGURATION ==================
const xmlFilePath = process.argv[2] || '/Users/xunit/Desktop/Margiil Files/liste client-dashboard-new.xml'
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
function parseDate(dateStr: string | number | null | undefined): string | undefined {
  if (!dateStr) return undefined

  try {
    const str = String(dateStr).trim()
    if (str === '' || str === 'null') return undefined

    // Format YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
      return str
    }

    // Format DD/MM/YYYY
    const parts = str.split(/[-/]/)
    if (parts.length === 3) {
      const [a, b, c] = parts
      if (c.length === 4) return `${c}-${b.padStart(2, '0')}-${a.padStart(2, '0')}`
      if (a.length === 4) return `${a}-${b.padStart(2, '0')}-${c.padStart(2, '0')}`
    }
  } catch (e) {
    // Ignore
  }
  return undefined
}

function parseAmount(amount: string | number | null | undefined): number | undefined {
  if (!amount && amount !== 0) return undefined

  try {
    if (typeof amount === 'number') return amount
    const cleanAmount = String(amount).replace(/[$\s,]/g, '').trim()
    if (cleanAmount === '' || cleanAmount === 'null') return undefined
    const parsed = parseFloat(cleanAmount)
    return isNaN(parsed) ? undefined : parsed
  } catch (e) {
    return undefined
  }
}

function parseInteger(int: string | number | null | undefined): number | undefined {
  if (!int && int !== 0) return undefined

  try {
    if (typeof int === 'number') return Math.floor(int)
    const str = String(int).trim()
    if (str === '' || str === 'null') return undefined
    const parsed = parseInt(str, 10)
    return isNaN(parsed) ? undefined : parsed
  } catch (e) {
    return undefined
  }
}

function getXMLValue(obj: any, key: string): string | undefined {
  const value = obj[key]
  if (!value || value === 'null' || (Array.isArray(value) && value.length === 0)) {
    return undefined
  }
  if (Array.isArray(value)) {
    return value[0] ? String(value[0]).trim() : undefined
  }
  return String(value).trim() || undefined
}

// ================== LECTURE XML ==================
async function readXML(): Promise<any[]> {
  const startTime = Date.now()
  console.log('📖 ÉTAPE 1: Lecture du fichier XML...')
  console.log(`   📁 Fichier: ${xmlFilePath}`)

  try {
    // Parser XML avec Python et xml.etree
    const pythonScript = `
import xml.etree.ElementTree as ET
import json
import sys

tree = ET.parse('${xmlFilePath}')
root = tree.getroot()

dossiers = []
for dossier in root.findall('Dossiers'):
    dossier_dict = {}
    for child in dossier:
        tag = child.tag.replace('_', ' ').replace('-', ' ')
        dossier_dict[tag] = child.text
    dossiers.append(dossier_dict)

print(json.dumps(dossiers, ensure_ascii=False))
`

    fs.writeFileSync('/tmp/read-xml-import.py', pythonScript)

    const { execSync } = require('child_process')
    const output = execSync('python3 /tmp/read-xml-import.py', {
      maxBuffer: 100 * 1024 * 1024,
      encoding: 'utf-8'
    })

    const records = JSON.parse(output)

    logPipelineStep(
      'Lecture XML',
      records.length,
      records.length,
      0,
      startTime,
      {
        fileSize: fs.statSync(xmlFilePath).size,
        fileName: path.basename(xmlFilePath)
      }
    )

    return records
  } catch (error: any) {
    console.error('❌ Erreur lecture XML:', error.message)
    logPipelineStep('Lecture XML', 0, 0, 1, startTime, { error: error.message })
    throw error
  }
}

// ================== TRANSFORMATION ==================
function transformClient(row: any): ClientSAR | null {
  try {
    // ID_GPM est le Margill ID (OBLIGATOIRE)
    const margillId = getXMLValue(row, 'ID GPM')
    if (!margillId || margillId === '') {
      return null
    }

    // ID_Prêt est le numéro de contrat (MC****, P****)
    const dossierId = getXMLValue(row, 'ID Prêt')

    // Construire le nom complet
    const prenom = getXMLValue(row, 'Emprunteur   Prénom')
    const nom = getXMLValue(row, 'Emprunteur   Nom')
    const nomComplet = prenom && nom ? `${prenom} ${nom}` : (prenom || nom)

    const client: ClientSAR = {
      // Identifiants
      margill_id: margillId,
      dossier_id: dossierId,
      // identifiant_unique_2: getXMLValue(row, 'Emprunteur   Identifiant unique 2'), // Colonne pas encore créée

      // Informations personnelles
      prenom: prenom,
      nom: nom,
      nom_complet: nomComplet,
      date_naissance: parseDate(getXMLValue(row, 'Emprunteur   Date de naissance')),

      // Contact
      email: getXMLValue(row, 'Emprunteur   Courriel')?.toLowerCase(),
      telephone_mobile: getXMLValue(row, 'Emprunteur   Numéro de Mobile'),

      // Employeur
      employeur: getXMLValue(row, 'Employeur'),
      telephone_employeur: getXMLValue(row, 'Téléphone de l employeur'),
      personne_contact_employeur: getXMLValue(row, 'Personne à contacter chez l employeur'),

      // Banque
      banque_institution: getXMLValue(row, 'Compte bancaire CA   Institution'),
      banque_transit: getXMLValue(row, 'Compte bancaire CA   Transit'),
      banque_compte: getXMLValue(row, 'Compte bancaire CA   No. de compte'),

      // État du dossier
      etat_dossier: getXMLValue(row, 'État du Dossier'),
      responsable_dossier: getXMLValue(row, 'État SAR'),

      // Statistiques financières
      capital_origine: parseAmount(getXMLValue(row, 'Capital d origine')),
      solde_actuel: parseAmount(getXMLValue(row, 'Solde final')),
      total_paiements_positifs: parseAmount(getXMLValue(row, 'Total de la colonne  Paiement   Prêt complet ')),
      frequence_paiement: getXMLValue(row, 'Méthode de paiement'),

      // Statistiques de paiement
      nombre_paiements_faits: parseInteger(getXMLValue(row, 'Nombre de Pmt fait  tous   pour période ')),
      nombre_paiements_non_payes: parseInteger(getXMLValue(row, 'Nombre de Pmt non payé  tous   pour période ')),

      // Dates
      date_creation_dossier: parseDate(getXMLValue(row, 'Date d origine du prêt')),
      date_maj_dossier: parseDate(getXMLValue(row, 'Dernière mise à jour du Dossier')),
      date_dernier_paiement: parseDate(getXMLValue(row, 'Dernier paiement Payé   Date')),

      // IBV (pas dans ce XML, on suppose absent)
      lien_ibv: undefined,

      // Flags de fraude
      flag_pas_ibv: true, // Pas d'info IBV dans ce XML
      flag_mauvaise_creance: false,
      flag_paiement_rate_precoce: false,
      flag_documents_email: false
    }

    // Calculer flag_paiement_rate_precoce
    if (client.nombre_paiements_non_payes && client.nombre_paiements_faits) {
      if (client.nombre_paiements_faits <= 3 && client.nombre_paiements_non_payes > 0) {
        client.flag_paiement_rate_precoce = true
      }
    }

    return client
  } catch (error: any) {
    console.warn(`⚠️  Erreur transformation: ${error.message}`)
    return null
  }
}

// ================== INSERTION SUPABASE ==================
async function insertBatch(clients: ClientSAR[], batchIndex: number, totalBatches: number): Promise<{ inserted: number, errors: number }> {
  try {
    if (DRY_RUN) {
      console.log(`   Lot ${batchIndex}/${totalBatches} (${clients.length} clients)... 🧪 DRY-RUN`)
      return { inserted: clients.length, errors: 0 }
    }

    // Dé-dupliquer dans le lot
    const uniqueClients = Array.from(
      new Map(clients.map(c => [c.margill_id, c])).values()
    )

    if (uniqueClients.length < clients.length) {
      console.log(`   ⚠️  Lot ${batchIndex}: ${clients.length - uniqueClients.length} duplicates supprimés`)
    }

    const { data, error } = await supabase
      .from('clients_sar')
      .upsert(uniqueClients, {
        onConflict: 'margill_id',
        ignoreDuplicates: SKIP_DUPLICATES
      })

    if (error) {
      console.log(`   Lot ${batchIndex}/${totalBatches}... ❌ Erreur`)
      console.log(error)
      return { inserted: 0, errors: uniqueClients.length }
    }

    console.log(`   Lot ${batchIndex}/${totalBatches} (${uniqueClients.length} clients)... ✅`)
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

  // Check Supabase
  try {
    const { data, error } = await supabase.from('clients_sar').select('count', { count: 'exact', head: true })
    if (error) throw error
    checks.push({ check: 'Connexion Supabase', status: '✅', details: 'OK' })
  } catch (e: any) {
    checks.push({ check: 'Connexion Supabase', status: '❌', details: e.message })
  }

  // Check fichier XML
  try {
    if (!fs.existsSync(xmlFilePath)) throw new Error('Fichier introuvable')
    const stats = fs.statSync(xmlFilePath)
    checks.push({ check: 'Fichier XML', status: '✅', details: `${(stats.size / 1024 / 1024).toFixed(2)} MB` })
  } catch (e: any) {
    checks.push({ check: 'Fichier XML', status: '❌', details: e.message })
  }

  // Check Python
  try {
    const { execSync } = require('child_process')
    const version = execSync('python3 --version', { encoding: 'utf-8' }).trim()
    checks.push({ check: 'Python3', status: '✅', details: version })
  } catch (e: any) {
    checks.push({ check: 'Python3', status: '❌', details: 'Non disponible' })
  }

  checks.forEach(({ check, status, details }) => {
    console.log(`${status} ${check}: ${details}`)
  })

  const allPassed = checks.every(c => c.status === '✅')
  console.log(`\n${allPassed ? '✅' : '❌'} Vérification dataflow: ${allPassed ? 'PASSED' : 'FAILED'}`)

  return allPassed
}

// ================== MAIN ==================
async function main() {
  console.log('🚀 IMPORT CLIENTS SAR DEPUIS XML')
  console.log('=' .repeat(60))
  console.log(`📁 Fichier: ${xmlFilePath}`)
  console.log(`🏢 Supabase: ${supabaseUrl}`)
  console.log(`📦 Batch size: ${BATCH_SIZE}`)
  console.log(`🧪 Dry-run: ${DRY_RUN ? 'OUI' : 'NON'}`)
  console.log('=' .repeat(60))

  // Vérification préalable
  const dataflowOK = await verifyDataflow()
  if (!dataflowOK) {
    console.error('\n❌ Vérification dataflow échouée')
    process.exit(1)
  }

  try {
    // ÉTAPE 1: Lecture XML
    const records = await readXML()

    // ÉTAPE 2: Transformation
    console.log('\n🔄 ÉTAPE 2: Transformation...')
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
        'Invalides': records.length - clients.length,
        'Succès': `${((clients.length / records.length) * 100).toFixed(1)}%`
      }
    )

    // Statistiques
    const withMC = clients.filter(c => c.dossier_id?.startsWith('MC')).length
    const withP = clients.filter(c => c.dossier_id?.startsWith('P')).length
    const withDossier = clients.filter(c => c.dossier_id).length

    console.log('\n📊 Statistiques:')
    console.log(`   - Avec N° contrat: ${withDossier} (${((withDossier / clients.length) * 100).toFixed(1)}%)`)
    console.log(`   - Format MC****: ${withMC} (${((withMC / clients.length) * 100).toFixed(1)}%)`)
    console.log(`   - Format P****: ${withP} (${((withP / clients.length) * 100).toFixed(1)}%)`)

    // ÉTAPE 3: Insertion
    console.log('\n💾 ÉTAPE 3: Insertion dans Supabase...')
    const startInsert = Date.now()

    let totalInserted = 0
    let totalErrors = 0

    const batches: ClientSAR[][] = []
    for (let i = 0; i < clients.length; i += BATCH_SIZE) {
      batches.push(clients.slice(i, i + BATCH_SIZE))
    }

    for (let i = 0; i < batches.length; i++) {
      const result = await insertBatch(batches[i], i + 1, batches.length)
      totalInserted += result.inserted
      totalErrors += result.errors

      if (i < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 50))
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
        'Succès': `${((totalInserted / clients.length) * 100).toFixed(1)}%`
      }
    )

    // RÉSUMÉ
    console.log('\n' + '='.repeat(60))
    console.log('📊 RÉSULTATS')
    console.log('='.repeat(60))
    console.log(`   ✅ Insérés: ${totalInserted}`)
    console.log(`   ❌ Erreurs: ${totalErrors}`)
    console.log(`   📈 Succès: ${((totalInserted / clients.length) * 100).toFixed(1)}%`)

    // Trace
    const traceFile = '/tmp/import-trace-xml.json'
    fs.writeFileSync(traceFile, JSON.stringify(pipelineTrace, null, 2))
    console.log(`\n💾 Trace: ${traceFile}`)

    console.log('\n✅ Import terminé!')

  } catch (error: any) {
    console.error('\n❌ Erreur fatale:', error)
    console.error(error.stack)
    process.exit(1)
  }
}

main()
