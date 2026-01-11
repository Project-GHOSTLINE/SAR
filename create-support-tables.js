const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')

const supabaseUrl = 'https://dllyzfuqjzuhvshrlmuq.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRsbHl6ZnVxanp1aHZzaHJsbXVxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTk5NTk4MSwiZXhwIjoyMDgxNTcxOTgxfQ.Qg5eQwDxeAtTDXplNkQZa4hOp_dSMBIu_DKbuquryFo'

const supabase = createClient(supabaseUrl, supabaseKey)

async function createSupportTables() {
  console.log('🚀 Création des tables support dans Supabase...\n')

  try {
    // Lire le fichier SQL
    const sqlContent = fs.readFileSync('./supabase-support-system.sql', 'utf8')

    // Diviser en commandes individuelles (séparées par ;)
    const sqlCommands = sqlContent
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0 && !cmd.startsWith('--') && !cmd.includes('SELECT COUNT'))

    console.log(`📝 ${sqlCommands.length} commandes SQL à exécuter\n`)

    // Exécuter chaque commande
    for (let i = 0; i < sqlCommands.length; i++) {
      const command = sqlCommands[i]

      // Skip les commentaires et commandes vides
      if (!command || command.startsWith('--') || command.length < 10) {
        continue
      }

      console.log(`[${i + 1}/${sqlCommands.length}] Exécution...`)

      // Extraire le type de commande pour le log
      const cmdType = command.split(' ')[0].toUpperCase()
      const cmdName = command.substring(0, 60).replace(/\n/g, ' ')
      console.log(`   ${cmdType}: ${cmdName}...`)

      try {
        const { error } = await supabase.rpc('exec_sql', {
          sql_query: command + ';'
        })

        if (error) {
          // Si la fonction exec_sql n'existe pas, utiliser une autre méthode
          if (error.message && error.message.includes('exec_sql')) {
            console.log('   ⚠️  Fonction exec_sql non disponible, utilisation alternative...')

            // Pour les CREATE TABLE, on peut essayer directement
            if (command.includes('CREATE TABLE')) {
              console.log('   ℹ️  Veuillez exécuter ce SQL manuellement dans le SQL Editor de Supabase')
              console.log('   📋 Commande:', command.substring(0, 100) + '...\n')
            }
          } else {
            console.log(`   ❌ Erreur: ${error.message}\n`)
          }
        } else {
          console.log('   ✅ Succès\n')
        }
      } catch (err) {
        console.log(`   ⚠️  Erreur: ${err.message}\n`)
      }
    }

    console.log('\n✅ Script terminé!')
    console.log('\n📌 IMPORTANT:')
    console.log('   Si certaines commandes ont échoué, vous devez les exécuter manuellement')
    console.log('   dans le SQL Editor de Supabase:')
    console.log('   https://supabase.com/dashboard/project/dllyzfuqjzuhvshrlmuq/sql')
    console.log('\n   Le fichier SQL complet est dans: supabase-support-system.sql')

  } catch (error) {
    console.error('❌ Erreur globale:', error)
  }
}

createSupportTables()
