#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase credentials manquantes')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

console.log('🔍 Vérification des données réelles vs test...\n')

// Check webhooks
const { data: webhooks, error } = await supabase
  .from('vopay_webhook_logs')
  .select('*')
  .order('received_at', { ascending: false })
  .limit(10)

if (error) {
  console.error('❌ Erreur:', error)
  process.exit(1)
}

console.log(`📊 Total webhooks: ${webhooks?.length || 0}`)

if (!webhooks || webhooks.length === 0) {
  console.log('⚠️  AUCUNE DONNÉE DANS vopay_webhook_logs')
  console.log('   → Dashboard affichera "Pas encore configuré"')
} else {
  console.log('\n🔍 Analyse des 10 dernières transactions:\n')
  
  const testCount = webhooks.filter(w => 
    w.environment?.toLowerCase() === 'sandbox' ||
    w.transaction_id?.includes('test') ||
    w.transaction_id?.includes('TEST')
  ).length
  
  const prodCount = webhooks.length - testCount
  
  console.log(`   ✅ Production: ${prodCount}`)
  console.log(`   🧪 Test/Sandbox: ${testCount}`)
  
  if (testCount > 0) {
    console.log('\n⚠️  DONNÉES DE TEST DÉTECTÉES!')
    console.log('   Les webhooks sandbox sont affichés dans le dashboard')
    console.log('   Recommandation: Filtrer uniquement les transactions production')
  } else {
    console.log('\n✅ Uniquement des données de production')
  }
  
  console.log('\n📋 Dernières transactions:')
  webhooks.forEach((w, i) => {
    const env = w.environment || 'unknown'
    const status = w.status || 'unknown'
    const amount = w.transaction_amount || '0'
    const id = w.transaction_id || 'no-id'
    console.log(`   ${i+1}. ${id.substring(0, 15)}... | ${env.toUpperCase()} | ${status} | ${amount}$`)
  })
}
