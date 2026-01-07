#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

console.log('🧪 TEST API STATS - Simulation exacte de l\'API\n')
console.log('=' .repeat(60))

// Reproduire exactement ce que fait l'API
const now = new Date()
const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
const firstDayISO = firstDayOfMonth.toISOString()

console.log('\n📅 Date de filtre:')
console.log(`   Début du mois: ${firstDayISO}`)
console.log(`   Date actuelle: ${now.toISOString()}`)

console.log('\n🔍 Requête Supabase...')

const { data: messages, error } = await supabase
  .from('contact_messages')
  .select('id, assigned_to, system_responded, lu, created_at')
  .gte('created_at', firstDayISO)
  .order('created_at', { ascending: false })

if (error) {
  console.error('❌ ERREUR:', error)
  process.exit(1)
}

console.log(`✅ Messages récupérés: ${messages?.length || 0}`)

if (!messages || messages.length === 0) {
  console.log('\n❌ PROBLÈME: Aucun message retourné par la requête!')
  console.log('   Mais le diagnostic en a trouvé 49...')
  console.log('\n💡 Cause possible: Problème de timezone ou format de date')

  // Tester sans filtre
  const { data: allMsgs } = await supabase
    .from('contact_messages')
    .select('id, created_at')
    .order('created_at', { ascending: false })
    .limit(5)

  console.log('\n   Voici les 5 derniers messages:')
  allMsgs?.forEach(m => {
    console.log(`   - ${m.id}: ${m.created_at}`)
  })

  process.exit(1)
}

// Calculer les stats exactement comme l'API
const totalDuMois = messages.length
const reponsesEnvoyees = messages.filter(m => m.system_responded).length
const acheminesSandra = messages.filter(m => m.assigned_to === 'Sandra').length
const acheminesMichel = messages.filter(m => m.assigned_to === 'Michel').length
const nonAchemines = messages.filter(m => !m.assigned_to).length
const reponsesNonEnvoyees = messages.filter(m => !m.system_responded).length

console.log('\n📊 Statistiques calculées:')
console.log(`   totalDuMois: ${totalDuMois}`)
console.log(`   reponsesEnvoyees: ${reponsesEnvoyees}`)
console.log(`   acheminesSandra: ${acheminesSandra}`)
console.log(`   acheminesMichel: ${acheminesMichel}`)
console.log(`   nonAchemines: ${nonAchemines}`)
console.log(`   reponsesNonEnvoyees: ${reponsesNonEnvoyees}`)

const stats = {
  totalDuMois,
  reponsesEnvoyees,
  reponsesNonEnvoyees,
  acheminesSandra,
  acheminesMichel,
  nonAchemines,
  byColleague: {
    Sandra: acheminesSandra,
    Michel: acheminesMichel
  }
}

console.log('\n📦 Objet stats retourné par l\'API:')
console.log(JSON.stringify(stats, null, 2))

console.log('\n' + '='.repeat(60))
console.log('\n✅ SI TU VOIS DES CHIFFRES CI-DESSUS:')
console.log('   Le problème est dans le dashboard front-end, pas dans l\'API')
console.log('\n❌ SI TOUS LES CHIFFRES SONT 0:')
console.log('   Le problème est dans la requête Supabase\n')
