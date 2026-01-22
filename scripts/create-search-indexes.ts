/**
 * Script pour créer les index de recherche optimisés
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import * as path from 'path'

// Charger les variables d'environnement
config({ path: path.join(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variables d\'environnement Supabase manquantes')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

const indexes = [
  {
    name: 'idx_clients_sar_dossier_id',
    description: 'Index sur dossier_id (N° contrat MC/P)',
    sql: `CREATE INDEX IF NOT EXISTS idx_clients_sar_dossier_id ON clients_sar(dossier_id) WHERE dossier_id IS NOT NULL`
  },
  {
    name: 'idx_clients_sar_telephone_mobile',
    description: 'Index sur telephone_mobile',
    sql: `CREATE INDEX IF NOT EXISTS idx_clients_sar_telephone_mobile ON clients_sar(telephone_mobile) WHERE telephone_mobile IS NOT NULL`
  },
  {
    name: 'idx_clients_sar_dossier_id_trgm',
    description: 'Index GIN trigram sur dossier_id (recherche floue)',
    sql: `CREATE INDEX IF NOT EXISTS idx_clients_sar_dossier_id_trgm ON clients_sar USING gin(dossier_id gin_trgm_ops) WHERE dossier_id IS NOT NULL`
  },
  {
    name: 'idx_clients_sar_etat_score',
    description: 'Index composite état + score',
    sql: `CREATE INDEX IF NOT EXISTS idx_clients_sar_etat_score ON clients_sar(etat_dossier, score_fraude DESC) WHERE etat_dossier IS NOT NULL`
  },
  {
    name: 'idx_clients_sar_dates',
    description: 'Index sur dates importantes',
    sql: `CREATE INDEX IF NOT EXISTS idx_clients_sar_dates ON clients_sar(date_creation_dossier DESC, date_dernier_paiement DESC)`
  }
]

async function createIndexes() {
  console.log('⚡ CRÉATION DES INDEX DE RECHERCHE')
  console.log('=' .repeat(60))
  console.log(`🏢 Supabase: ${supabaseUrl}`)
  console.log(`📊 ${indexes.length} index à créer`)
  console.log('')

  let successCount = 0
  let errorCount = 0

  for (const index of indexes) {
    console.log(`📌 ${index.name}`)
    console.log(`   ${index.description}`)

    try {
      // Exécuter via raw SQL
      const { data, error } = await supabase.rpc('exec_sql', {
        query: index.sql
      })

      if (error) {
        console.log(`   ⚠️  RPC non disponible, continuons...`)
        // C'est normal si la fonction exec_sql n'existe pas
        // Les index seront créés manuellement
        console.log(`   📝 À exécuter manuellement:`)
        console.log(`   ${index.sql}`)
      } else {
        console.log(`   ✅ Créé avec succès`)
        successCount++
      }
    } catch (error: any) {
      console.log(`   ⚠️  ${error.message}`)
      console.log(`   📝 À exécuter manuellement:`)
      console.log(`   ${index.sql}`)
      errorCount++
    }

    console.log('')
  }

  console.log('=' .repeat(60))
  console.log('📊 RÉSULTAT')
  console.log('=' .repeat(60))
  console.log(`✅ Succès: ${successCount}`)
  console.log(`⚠️  À créer manuellement: ${errorCount}`)
  console.log('')

  if (errorCount > 0 || successCount === 0) {
    console.log('💡 SOLUTION: Créer les index manuellement via Supabase SQL Editor')
    console.log('')
    console.log('1. Aller sur: https://supabase.com/dashboard/project/dllyzfuqjzuhvshrlmuq')
    console.log('2. Cliquer sur "SQL Editor" (menu gauche)')
    console.log('3. Copier-coller les commandes suivantes:')
    console.log('')
    console.log('-- ============================================')
    console.log('-- Index pour optimiser la recherche')
    console.log('-- ============================================')
    indexes.forEach(idx => {
      console.log('')
      console.log(`-- ${idx.description}`)
      console.log(`${idx.sql};`)
    })
    console.log('')
    console.log('-- Mettre à jour les statistiques')
    console.log('ANALYZE clients_sar;')
    console.log('')
  } else {
    console.log('✅ Tous les index ont été créés avec succès!')
  }
}

createIndexes()
