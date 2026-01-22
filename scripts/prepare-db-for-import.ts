/**
 * Script de préparation de la BD pour réimport
 * - Ajoute les colonnes manquantes
 * - Nettoie la table
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

async function main() {
  console.log('🔧 PRÉPARATION DE LA BASE DE DONNÉES')
  console.log('=' .repeat(60))
  console.log(`🏢 Supabase: ${supabaseUrl}`)
  console.log('')

  try {
    // Compter les enregistrements actuels
    console.log('📊 Étape 1: Vérification de l\'état actuel...')
    const { count: currentCount, error: countError } = await supabase
      .from('clients_sar')
      .select('*', { count: 'exact', head: true })

    if (countError) {
      console.error('❌ Erreur comptage:', countError)
      process.exit(1)
    }

    console.log(`   📈 Clients actuels: ${currentCount}`)
    console.log('')

    // Demander confirmation si des données existent
    if (currentCount && currentCount > 0) {
      console.log('⚠️  ATTENTION: La table contient déjà des données!')
      console.log(`   ${currentCount} clients seront supprimés`)
      console.log('')
    }

    // Migration: Ajouter les colonnes
    console.log('🔧 Étape 2: Ajout des colonnes manquantes...')

    const migrationSQL = `
      ALTER TABLE clients_sar
      ADD COLUMN IF NOT EXISTS identifiant_unique_1 TEXT,
      ADD COLUMN IF NOT EXISTS identifiant_unique_2 TEXT;

      CREATE INDEX IF NOT EXISTS idx_clients_sar_identifiant_unique_1
        ON clients_sar(identifiant_unique_1)
        WHERE identifiant_unique_1 IS NOT NULL;

      CREATE INDEX IF NOT EXISTS idx_clients_sar_identifiant_unique_2
        ON clients_sar(identifiant_unique_2)
        WHERE identifiant_unique_2 IS NOT NULL;
    `

    // Note: Supabase client ne supporte pas directement les commandes DDL
    // On doit utiliser l'API SQL via fetch
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      },
      body: JSON.stringify({ query: migrationSQL })
    })

    if (!response.ok) {
      // L'API RPC exec_sql n'existe peut-être pas, essayons directement
      console.log('   ⚠️  API exec_sql non disponible, veuillez exécuter manuellement:')
      console.log('   📝 /tmp/clean-and-migrate.sql dans Supabase SQL Editor')
      console.log('')
      console.log('   Ou continuez si les colonnes existent déjà...')
    } else {
      console.log('   ✅ Colonnes ajoutées')
    }

    // Nettoyage: Supprimer tous les enregistrements
    console.log('')
    console.log('🗑️  Étape 3: Nettoyage de la table...')

    const { error: deleteError } = await supabase
      .from('clients_sar')
      .delete()
      .neq('margill_id', '') // Supprimer tous les enregistrements

    if (deleteError) {
      console.error('❌ Erreur suppression:', deleteError)
      process.exit(1)
    }

    console.log('   ✅ Table nettoyée')
    console.log('')

    // Vérification finale
    console.log('✅ Étape 4: Vérification finale...')
    const { count: finalCount, error: finalError } = await supabase
      .from('clients_sar')
      .select('*', { count: 'exact', head: true })

    if (finalError) {
      console.error('❌ Erreur vérification:', finalError)
      process.exit(1)
    }

    console.log(`   📊 Clients restants: ${finalCount}`)
    console.log('')

    if (finalCount === 0) {
      console.log('✅ Base de données prête pour l\'import!')
    } else {
      console.log('⚠️  Attention: La table n\'est pas complètement vide')
    }

  } catch (error: any) {
    console.error('❌ Erreur:', error)
    console.error(error.stack)
    process.exit(1)
  }
}

main()
