#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variables Supabase manquantes dans .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

console.log('🔍 DIAGNOSTIC STATISTIQUES MESSAGES\n')
console.log('=' .repeat(60))

// 1. Vérifier si les colonnes existent
console.log('\n1️⃣  Vérification des colonnes...\n')

try {
  const { data: testMsg, error: colError } = await supabase
    .from('contact_messages')
    .select('id, assigned_to, system_responded, created_at')
    .limit(1)

  if (colError) {
    console.error('❌ ERREUR: Les colonnes n\'existent pas!')
    console.error('   Message:', colError.message)
    console.log('\n💡 SOLUTION: Tu dois exécuter la migration SQL!')
    console.log('   1. Va sur https://supabase.com/dashboard')
    console.log('   2. SQL Editor')
    console.log('   3. Copie le contenu de: supabase-add-messages-features.sql')
    console.log('   4. Execute (Run)\n')
    process.exit(1)
  } else {
    console.log('✅ Les colonnes existent (assigned_to, system_responded)')
  }
} catch (err) {
  console.error('❌ Erreur lors de la vérification:', err.message)
  process.exit(1)
}

// 2. Compter TOUS les messages
console.log('\n2️⃣  Messages dans la base de données...\n')

const { data: allMessages, error: allError } = await supabase
  .from('contact_messages')
  .select('*')

if (allError) {
  console.error('❌ Erreur:', allError.message)
  process.exit(1)
}

console.log(`   Total dans la base: ${allMessages?.length || 0} messages`)

if (!allMessages || allMessages.length === 0) {
  console.log('\n⚠️  ATTENTION: Aucun message dans la base!')
  console.log('   C\'est normal si tu viens de commencer.')
  console.log('   Envoie un message de test via le formulaire de contact.\n')
  process.exit(0)
}

// 3. Afficher les dates des messages
console.log('\n3️⃣  Dates des messages...\n')

const dates = allMessages
  .map(m => new Date(m.created_at))
  .sort((a, b) => a.getTime() - b.getTime())

const oldest = dates[0]
const newest = dates[dates.length - 1]

console.log(`   Plus ancien: ${oldest.toLocaleDateString('fr-CA')}`)
console.log(`   Plus récent: ${newest.toLocaleDateString('fr-CA')}`)

// 4. Calculer le début du mois
const now = new Date()
const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
console.log(`\n4️⃣  Mois en cours: ${now.toLocaleDateString('fr-CA', { year: 'numeric', month: 'long' })}\n`)
console.log(`   Début du mois: ${firstDayOfMonth.toLocaleDateString('fr-CA')}`)

// 5. Compter les messages du mois
const messagesThisMonth = allMessages.filter(m =>
  new Date(m.created_at) >= firstDayOfMonth
)

console.log(`\n5️⃣  Messages du mois en cours...\n`)
console.log(`   ✅ Total: ${messagesThisMonth.length}`)

if (messagesThisMonth.length === 0) {
  console.log('\n⚠️  AUCUN MESSAGE CE MOIS!')
  console.log(`   Tous tes ${allMessages.length} messages sont des mois précédents.`)
  console.log('   Pour tester, envoie un nouveau message via le formulaire.\n')
  process.exit(0)
}

// 6. Analyser les statistiques
console.log('\n6️⃣  Statistiques détaillées...\n')

const stats = {
  total: messagesThisMonth.length,
  avecReponse: messagesThisMonth.filter(m => m.system_responded === true).length,
  sansReponse: messagesThisMonth.filter(m => m.system_responded === false || !m.system_responded).length,
  sandra: messagesThisMonth.filter(m => m.assigned_to === 'Sandra').length,
  michel: messagesThisMonth.filter(m => m.assigned_to === 'Michel').length,
  nonAchemines: messagesThisMonth.filter(m => !m.assigned_to).length
}

console.log(`   📧 Reçus ce mois: ${stats.total}`)
console.log(`   ✅ Réponses envoyées: ${stats.avecReponse}`)
console.log(`   ❌ Réponses non envoyées: ${stats.sansReponse}`)
console.log(`   👤 Acheminés à Sandra: ${stats.sandra}`)
console.log(`   👤 Acheminés à Michel: ${stats.michel}`)
console.log(`   ⚠️  Non acheminés: ${stats.nonAchemines}`)

// 7. Afficher quelques exemples
console.log('\n7️⃣  Exemples de messages du mois...\n')

messagesThisMonth.slice(0, 3).forEach((msg, i) => {
  console.log(`   ${i + 1}. ${msg.nom} - ${new Date(msg.created_at).toLocaleDateString('fr-CA')}`)
  console.log(`      Réponse: ${msg.system_responded ? '✅ Oui' : '❌ Non'}`)
  console.log(`      Achemié: ${msg.assigned_to || '⚠️  Non'}`)
  console.log('')
})

// 8. Tester l'API
console.log('\n8️⃣  Test de l\'API stats...\n')

try {
  const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/admin/messages/assign/stats`, {
    headers: {
      'Cookie': 'admin-session=test'  // Juste pour tester, ne fonctionnera pas vraiment
    }
  })

  if (!response.ok) {
    console.log('   ⚠️  L\'API nécessite une authentification admin')
    console.log('   C\'est normal, teste via le dashboard admin.')
  } else {
    const data = await response.json()
    console.log('   ✅ API répond:', JSON.stringify(data, null, 2))
  }
} catch (err) {
  console.log('   ℹ️  API locale non accessible (serveur pas démarré)')
  console.log('   C\'est OK, teste directement dans le dashboard admin.')
}

console.log('\n' + '='.repeat(60))
console.log('\n✨ DIAGNOSTIC TERMINÉ!\n')

if (stats.total > 0) {
  console.log('✅ TU DEVRAIS VOIR DES CHIFFRES DANS LE DASHBOARD!')
  console.log('   Si tu ne les vois pas, vérifie:')
  console.log('   1. Que tu es bien connecté en admin')
  console.log('   2. Que tu as actualisé la page (Ctrl+F5)')
  console.log('   3. La console du navigateur (F12) pour voir les erreurs\n')
} else {
  console.log('⚠️  PAS DE MESSAGES CE MOIS')
  console.log('   Pour voir des chiffres:')
  console.log('   1. Envoie un message via le formulaire de contact')
  console.log('   2. Ou attends que de vrais clients envoient des messages\n')
}
