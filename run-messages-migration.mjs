#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { config } from 'dotenv'

// Charger les variables d'environnement
config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ ERREUR: Variables Supabase manquantes')
  console.error('Assurez-vous que .env.local contient:')
  console.error('  - NEXT_PUBLIC_SUPABASE_URL')
  console.error('  - SUPABASE_SERVICE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

console.log('🚀 Exécution de la migration messages...\n')

// Lire le fichier SQL
const sql = readFileSync('supabase-add-messages-features.sql', 'utf-8')

// Séparer les commandes SQL (basique, peut ne pas fonctionner avec toutes les syntaxes)
const commands = sql
  .split(';')
  .map(cmd => cmd.trim())
  .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'))

console.log(`📝 ${commands.length} commande(s) SQL à exécuter\n`)

// Exécuter chaque commande
for (let i = 0; i < commands.length; i++) {
  const command = commands[i]

  // Ignorer les commentaires
  if (command.startsWith('COMMENT ON')) {
    console.log(`⏭️  [${i + 1}/${commands.length}] Commentaire ignoré`)
    continue
  }

  try {
    console.log(`⚙️  [${i + 1}/${commands.length}] Exécution...`)

    const { data, error } = await supabase.rpc('exec_sql', {
      query: command + ';'
    }).catch(async () => {
      // Si exec_sql n'existe pas, essayer avec la fonction par défaut
      const { data, error } = await supabase.from('_sql').select('*').limit(0)
      return { data, error }
    })

    if (error) {
      // Certaines erreurs sont attendues (ex: colonne existe déjà)
      if (error.message.includes('already exists') || error.message.includes('does not exist')) {
        console.log(`⚠️  [${i + 1}/${commands.length}] ${error.message}`)
      } else {
        console.error(`❌ [${i + 1}/${commands.length}] Erreur:`, error.message)
      }
    } else {
      console.log(`✅ [${i + 1}/${commands.length}] Succès`)
    }
  } catch (err) {
    console.error(`❌ [${i + 1}/${commands.length}] Exception:`, err.message)
  }
}

console.log('\n🏁 Migration terminée!')
console.log('Vérification des nouvelles colonnes...\n')

// Vérifier que les colonnes ont été ajoutées
const { data: testMessage, error: testError } = await supabase
  .from('contact_messages')
  .select('assigned_to, system_responded, assigned_at, assigned_by')
  .limit(1)

if (testError) {
  console.error('❌ Erreur lors de la vérification:', testError.message)
  console.log('\n💡 Solution: Exécutez manuellement le SQL dans le dashboard Supabase')
  console.log('   Dashboard → SQL Editor → Coller le contenu de supabase-add-messages-features.sql')
} else {
  console.log('✅ Les nouvelles colonnes sont accessibles!')
  console.log('   - assigned_to')
  console.log('   - system_responded')
  console.log('   - assigned_at')
  console.log('   - assigned_by')
}

// Afficher les stats
console.log('\n📊 Statistiques des messages:')
const { data: messages, error: statsError } = await supabase
  .from('contact_messages')
  .select('id, assigned_to, system_responded')

if (!statsError && messages) {
  const total = messages.length
  const assigned = messages.filter(m => m.assigned_to).length
  const withResponse = messages.filter(m => m.system_responded).length
  const withoutResponse = messages.filter(m => !m.system_responded).length

  console.log(`   Total: ${total}`)
  console.log(`   Assignés: ${assigned}`)
  console.log(`   Avec réponse système: ${withResponse}`)
  console.log(`   Sans réponse système: ${withoutResponse}`)
}

console.log('\n✨ Terminé!')
