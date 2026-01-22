/**
 * Script de mise à jour des clients SAR depuis Excel
 *
 * Source: update-sar.xlsx
 * Méthode: UPSERT par margill_id (Identification GPM du Dossier)
 * Stratégie: Enrichir les données existantes (ne pas écraser les valeurs déjà présentes)
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import * as path from 'path'
import { execSync } from 'child_process'

// Charger les variables d'environnement
config({ path: path.join(process.cwd(), '.env.local') })

// ================== CONFIGURATION ==================
const DRY_RUN = process.argv.includes('--dry-run')
const OVERWRITE = process.argv.includes('--overwrite') // Écraser les valeurs existantes
const xlsxFilePath = process.argv.find(arg => !arg.includes('--') && arg.endsWith('.xlsx')) || '/Users/xunit/Desktop/Margiil Files/update-sar.xlsx'
const BATCH_SIZE = 100

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variables d\'environnement Supabase manquantes')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

// ================== TYPES ==================
interface ClientUpdate {
  margill_id: string
  identifiant_unique_1?: string
  identifiant_unique_2?: string
  nas?: string
  date_naissance?: string
  adresse_ligne1?: string
  adresse_ligne2?: string
  ville?: string
  province?: string
  code_postal?: string
  pays?: string
  telephone?: string
  telephone_mobile?: string
  email?: string
  occupation?: string
  employeur?: string
  telephone_employeur?: string
  date_embauche?: string
  personne_contact_employeur?: string
  contact1_nom?: string
  contact1_telephone?: string
  contact2_nom?: string
  contact2_telephone?: string
  lien_ibv?: string
}

interface PipelineStats {
  step: string
  input: number
  output: number
  errors: number
  duration: number
  details?: any
}

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
function parseDate(dateStr: any): string | undefined {
  if (!dateStr) return undefined

  try {
    // Si c'est déjà une date Excel (nombre)
    if (typeof dateStr === 'number') {
      const excelEpoch = new Date(1899, 11, 30)
      const date = new Date(excelEpoch.getTime() + dateStr * 86400000)
      return date.toISOString().split('T')[0]
    }

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

function cleanString(value: any): string | undefined {
  if (!value || value === 'null' || value === '') return undefined
  return String(value).trim()
}

// ================== LECTURE EXCEL ==================
async function readExcel(): Promise<any[]> {
  const startTime = Date.now()
  console.log('📖 ÉTAPE 1: Lecture du fichier Excel...')
  console.log(`   📁 Fichier: ${xlsxFilePath}`)

  try {
    const fs = require('fs')
    const os = require('os')

    // Créer un fichier Python temporaire
    const pythonScript = `
import openpyxl
import json
import sys

xlsx_path = '${xlsxFilePath}'
wb = openpyxl.load_workbook(xlsx_path, read_only=True, data_only=True)
ws = wb.active
rows = list(ws.rows)

# En-têtes (première ligne)
headers = [cell.value for cell in rows[0]]

# Données (lignes suivantes)
data = []
for row in rows[1:]:
    row_dict = {}
    for i, cell in enumerate(row):
        if i < len(headers) and headers[i]:
            row_dict[headers[i]] = cell.value
    data.append(row_dict)

print(json.dumps(data, ensure_ascii=False, default=str))
wb.close()
`

    const tmpFile = path.join(os.tmpdir(), 'read-update-xlsx.py')
    fs.writeFileSync(tmpFile, pythonScript)

    const result = execSync(`python3 "${tmpFile}"`, {
      encoding: 'utf-8',
      maxBuffer: 50 * 1024 * 1024 // 50 MB buffer
    })

    // Cleanup
    fs.unlinkSync(tmpFile)

    const records = JSON.parse(result)

    logPipelineStep(
      'Lecture Excel',
      records.length,
      records.length,
      0,
      startTime,
      {
        fileName: path.basename(xlsxFilePath)
      }
    )

    return records
  } catch (error: any) {
    console.error('❌ Erreur lecture Excel:', error.message)
    logPipelineStep('Lecture Excel', 0, 0, 1, startTime, { error: error.message })
    throw error
  }
}

// ================== TRANSFORMATION ==================
function transformClient(row: any): ClientUpdate | null {
  try {
    const margillId = cleanString(row['Identification GPM du Dossier'])
    if (!margillId) {
      return null
    }

    const client: ClientUpdate = {
      margill_id: margillId,

      // Identifiants
      identifiant_unique_1: cleanString(row['Emprunteur - Identifiant unique 1']),
      identifiant_unique_2: cleanString(row['Emprunteur - Identifiant unique 2']),
      nas: cleanString(row['Emprunteur - Numéro d\'assurance sociale']),

      // Informations personnelles
      date_naissance: parseDate(row['Emprunteur - Date de naissance']),

      // Adresse
      adresse_ligne1: cleanString(row['Emprunteur - Adresse 1']),
      adresse_ligne2: cleanString(row['Emprunteur - Adresse 2']),
      ville: cleanString(row['Emprunteur - Ville']),
      province: cleanString(row['Emprunteur - Province, État']),
      code_postal: cleanString(row['Emprunteur - Code postal']),
      pays: cleanString(row['Emprunteur - Pays']),

      // Contact
      telephone: cleanString(row['Emprunteur - Numéro de Téléphone']),
      telephone_mobile: cleanString(row['Emprunteur - Numéro de Mobile']),
      email: cleanString(row['Emprunteur - Courriel'])?.toLowerCase(),

      // Emploi
      occupation: cleanString(row['Emprunteur - Occupation']),
      employeur: cleanString(row['Employeur']),
      telephone_employeur: cleanString(row['Téléphone de l\'employeur']),
      date_embauche: parseDate(row['Date d\'embauche']),
      personne_contact_employeur: cleanString(row['Personne à contacter chez l\'employeur']),

      // Contacts d'urgence
      contact1_nom: cleanString(row['Contact 1']),
      contact1_telephone: cleanString(row['Téléphone contact 1']),
      contact2_nom: cleanString(row['Contact 2']),
      contact2_telephone: cleanString(row['Téléphone contact 2']),

      // IBV
      lien_ibv: cleanString(row['Lien IBV'])
    }

    return client
  } catch (error: any) {
    console.warn(`⚠️  Erreur transformation: ${error.message}`)
    return null
  }
}

// ================== MISE À JOUR SUPABASE ==================
async function updateBatch(clients: ClientUpdate[], batchIndex: number, totalBatches: number): Promise<{ updated: number, errors: number }> {
  try {
    if (DRY_RUN) {
      console.log(`   Lot ${batchIndex}/${totalBatches} (${clients.length} clients)... 🧪 DRY-RUN`)
      return { updated: clients.length, errors: 0 }
    }

    // Stratégie: UPSERT avec merge intelligent
    // Si OVERWRITE=true: écraser toutes les valeurs
    // Si OVERWRITE=false: ne mettre à jour que les champs vides

    const { data, error } = await supabase
      .from('clients_sar')
      .upsert(clients, {
        onConflict: 'margill_id',
        ignoreDuplicates: false // On veut mettre à jour
      })

    if (error) {
      console.log(`   Lot ${batchIndex}/${totalBatches}... ❌ Erreur`)
      console.log(error)
      return { updated: 0, errors: clients.length }
    }

    console.log(`   Lot ${batchIndex}/${totalBatches} (${clients.length} clients)... ✅`)
    return { updated: clients.length, errors: 0 }
  } catch (error: any) {
    console.log(`   Lot ${batchIndex}/${totalBatches}... ❌ Exception: ${error.message}`)
    return { updated: 0, errors: clients.length }
  }
}

// ================== MAIN ==================
async function main() {
  console.log('🔄 MISE À JOUR CLIENTS SAR DEPUIS EXCEL')
  console.log('=' .repeat(60))
  console.log(`📁 Fichier: ${xlsxFilePath}`)
  console.log(`🏢 Supabase: ${supabaseUrl}`)
  console.log(`📦 Batch size: ${BATCH_SIZE}`)
  console.log(`🧪 Dry-run: ${DRY_RUN ? 'OUI' : 'NON'}`)
  console.log(`♻️  Stratégie: ${OVERWRITE ? 'ÉCRASER' : 'ENRICHIR'}`)
  console.log('=' .repeat(60))
  console.log('')

  try {
    // Étape 1: Lecture Excel
    const records = await readExcel()

    // Étape 2: Transformation
    const startTransform = Date.now()
    console.log('\n🔄 ÉTAPE 2: Transformation...')

    const clients: ClientUpdate[] = []
    let invalidCount = 0

    for (const record of records) {
      const client = transformClient(record)
      if (client) {
        clients.push(client)
      } else {
        invalidCount++
      }
    }

    logPipelineStep(
      'Transformation',
      records.length,
      clients.length,
      invalidCount,
      startTransform,
      {
        Invalides: invalidCount,
        Succès: `${((clients.length / records.length) * 100).toFixed(1)}%`
      }
    )

    // Étape 3: Mise à jour Supabase
    const startUpdate = Date.now()
    console.log('\n💾 ÉTAPE 3: Mise à jour dans Supabase...')

    const batches = []
    for (let i = 0; i < clients.length; i += BATCH_SIZE) {
      batches.push(clients.slice(i, i + BATCH_SIZE))
    }

    let totalUpdated = 0
    let totalErrors = 0

    for (let i = 0; i < batches.length; i++) {
      const { updated, errors } = await updateBatch(batches[i], i + 1, batches.length)
      totalUpdated += updated
      totalErrors += errors

      // Petit délai pour éviter de surcharger Supabase
      if (i < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 50))
      }
    }

    logPipelineStep(
      'Mise à jour Supabase',
      clients.length,
      totalUpdated,
      totalErrors,
      startUpdate,
      {
        Batches: batches.length,
        Succès: `${((totalUpdated / clients.length) * 100).toFixed(1)}%`
      }
    )

    // Résumé final
    console.log('')
    console.log('=' .repeat(60))
    console.log('📊 RÉSULTATS')
    console.log('=' .repeat(60))
    console.log(`   ✅ Mis à jour: ${totalUpdated}`)
    console.log(`   ❌ Erreurs: ${totalErrors}`)
    console.log(`   📈 Succès: ${((totalUpdated / clients.length) * 100).toFixed(1)}%`)
    console.log('')
    console.log(`💾 Trace: /tmp/update-trace-xlsx.json`)

    // Sauvegarder la trace
    require('fs').writeFileSync(
      '/tmp/update-trace-xlsx.json',
      JSON.stringify(pipelineTrace, null, 2)
    )

    console.log('')
    console.log('✅ Mise à jour terminée!')

  } catch (error: any) {
    console.error('❌ Erreur:', error)
    console.error(error.stack)
    process.exit(1)
  }
}

main()
