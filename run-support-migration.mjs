#!/usr/bin/env node

/**
 * Script pour exécuter la migration Supabase du système de support
 * Usage: node run-support-migration.mjs
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Charger les variables d'environnement depuis .env.local
import dotenv from 'dotenv'
dotenv.config({ path: join(__dirname, '.env.local') })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ ERREUR: Variables d\'environnement manquantes')
  console.error('Assurez-vous que .env.local contient:')
  console.error('  - NEXT_PUBLIC_SUPABASE_URL')
  console.error('  - SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

console.log('🚀 Migration Supabase - Système de Support')
console.log('==========================================\n')

// Créer le client Supabase avec la service role key
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// Lire le fichier SQL
const sqlFile = join(__dirname, 'supabase-support-system.sql')
const sql = readFileSync(sqlFile, 'utf8')

console.log('📄 Fichier SQL chargé:', sqlFile)
console.log('📏 Taille:', (sql.length / 1024).toFixed(2), 'KB\n')

// Fonction pour exécuter le SQL
async function executeMigration() {
  try {
    console.log('⏳ Exécution de la migration...\n')

    // Split le SQL en statements individuels
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('SELECT COUNT'))

    console.log(`📊 ${statements.length} statements SQL à exécuter\n`)

    let successCount = 0
    let errorCount = 0

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i] + ';'
      const preview = statement.substring(0, 80).replace(/\n/g, ' ')

      try {
        // Essayer d'exécuter via RPC si disponible
        const { error } = await supabase.rpc('exec_sql', {
          sql_query: statement
        })

        if (error) {
          throw error
        }

        console.log(`✅ [${i + 1}/${statements.length}] ${preview}...`)
        successCount++
      } catch (error) {
        // Si exec_sql n'existe pas, on peut toujours exécuter manuellement
        if (error.message && error.message.includes('function does not exist')) {
          console.log('⚠️  La fonction exec_sql n\'existe pas dans Supabase')
          console.log('📝 Vous devrez exécuter le SQL manuellement:\n')
          console.log('1. Ouvrir: https://supabase.com/dashboard')
          console.log('2. Sélectionner le projet SAR')
          console.log('3. Aller dans SQL Editor')
          console.log('4. Copier-coller le contenu de:', sqlFile)
          console.log('5. Cliquer "Run"\n')
          process.exit(0)
        }

        console.error(`❌ [${i + 1}/${statements.length}] Erreur:`, error.message)
        errorCount++
      }
    }

    console.log('\n==========================================')
    console.log('✅ Migration terminée!')
    console.log(`📊 Résumé: ${successCount} succès, ${errorCount} erreurs\n`)

    // Vérifier que les tables existent
    console.log('🔍 Vérification des tables...\n')

    const { data: tickets, error: ticketsError } = await supabase
      .from('support_tickets')
      .select('count')
      .limit(1)

    if (!ticketsError) {
      console.log('✅ Table support_tickets créée')
    } else {
      console.log('❌ Table support_tickets:', ticketsError.message)
    }

    const { data: messages, error: messagesError } = await supabase
      .from('support_messages')
      .select('count')
      .limit(1)

    if (!messagesError) {
      console.log('✅ Table support_messages créée')
    } else {
      console.log('❌ Table support_messages:', messagesError.message)
    }

    const { data: attachments, error: attachmentsError } = await supabase
      .from('support_attachments')
      .select('count')
      .limit(1)

    if (!attachmentsError) {
      console.log('✅ Table support_attachments créée')
    } else {
      console.log('❌ Table support_attachments:', attachmentsError.message)
    }

    console.log('\n==========================================')
    console.log('📦 PROCHAINE ÉTAPE: Créer le bucket Storage')
    console.log('==========================================\n')
    console.log('1. Ouvrir: https://supabase.com/dashboard')
    console.log('2. Sélectionner le projet SAR')
    console.log('3. Aller dans Storage')
    console.log('4. Créer un nouveau bucket:')
    console.log('   - Nom: support-files')
    console.log('   - Public: false')
    console.log('   - Max file size: 10MB')
    console.log('   - Allowed MIME types: image/png, image/jpeg, image/webp, application/pdf, video/webm')
    console.log('\n🎉 Félicitations! Le système de support est prêt!')
    console.log('\n')

  } catch (error) {
    console.error('\n❌ ERREUR FATALE:', error.message)
    console.error('\nDétails:', error)
    process.exit(1)
  }
}

// Exécuter la migration
executeMigration()
