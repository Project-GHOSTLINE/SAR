/**
 * Script pour créer la table vopay_webhook_logs dans Supabase
 * Usage: node setup-vopay-webhook-table.mjs
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

// Configuration Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Erreur: Variables d\'environnement Supabase manquantes')
  console.error('Vérifiez que NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_KEY sont définis')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function setupTable() {
  console.log('🚀 Configuration de la table vopay_webhook_logs...\n')

  try {
    // Lire le fichier SQL
    const sql = readFileSync('./supabase-vopay-webhooks.sql', 'utf8')

    console.log('📄 Exécution du script SQL...')

    // Exécuter le SQL
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql })

    if (error) {
      // Si la fonction exec_sql n'existe pas, on essaie avec une autre méthode
      if (error.message.includes('function') && error.message.includes('does not exist')) {
        console.log('\n⚠️  La fonction exec_sql n\'existe pas.')
        console.log('📋 Veuillez copier le contenu de supabase-vopay-webhooks.sql')
        console.log('   et l\'exécuter manuellement dans le SQL Editor de Supabase:\n')
        console.log('   👉 https://supabase.com/dashboard/project/dllyzfuqjzuhvshrlmuq/sql/new\n')
        process.exit(0)
      }

      throw error
    }

    console.log('✅ Table créée avec succès!\n')

    // Vérifier que la table existe
    const { data: tables, error: checkError } = await supabase
      .from('vopay_webhook_logs')
      .select('*')
      .limit(1)

    if (checkError) {
      console.error('⚠️  Erreur lors de la vérification:', checkError.message)
    } else {
      console.log('✅ Table vopay_webhook_logs accessible\n')
    }

    console.log('📊 Structure de la table:')
    console.log('  - id (UUID, primary key)')
    console.log('  - transaction_id (TEXT, indexed)')
    console.log('  - transaction_type (TEXT)')
    console.log('  - transaction_amount (DECIMAL)')
    console.log('  - status (TEXT, indexed)')
    console.log('  - failure_reason (TEXT, nullable)')
    console.log('  - environment (TEXT)')
    console.log('  - validation_key (TEXT)')
    console.log('  - is_validated (BOOLEAN)')
    console.log('  - raw_payload (JSONB)')
    console.log('  - updated_at (TIMESTAMPTZ)')
    console.log('  - received_at (TIMESTAMPTZ, indexed)')
    console.log('  - processed_at (TIMESTAMPTZ)')
    console.log('  - created_at (TIMESTAMPTZ)\n')

    console.log('🎉 Configuration terminée!')
    console.log('\n📝 Prochaines étapes:')
    console.log('1. Déployer l\'application sur Vercel')
    console.log('2. Configurer le sous-domaine api.solutionargentrapide.ca')
    console.log('3. Configurer le webhook dans VoPay avec l\'URL:')
    console.log('   https://api.solutionargentrapide.ca/api/webhooks/vopay')

  } catch (error) {
    console.error('❌ Erreur:', error.message)
    console.log('\n📋 Méthode alternative:')
    console.log('Copiez le contenu de supabase-vopay-webhooks.sql')
    console.log('et exécutez-le manuellement dans le SQL Editor de Supabase:\n')
    console.log('👉 https://supabase.com/dashboard/project/dllyzfuqjzuhvshrlmuq/sql/new\n')
    process.exit(1)
  }
}

setupTable()
