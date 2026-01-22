// Script pour débugger les données Flinks dans Supabase
require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

console.log('URL:', supabaseUrl ? '✅' : '❌')
console.log('Key:', supabaseKey ? '✅' : '❌')

const supabase = createClient(supabaseUrl, supabaseKey)

async function debugFlinksData() {
  const clientId = 'cfe31f12-21f1-4e65-94da-059a5d2d559d'

  console.log('🔍 Récupération des données Flinks pour:', clientId)

  const { data, error } = await supabase
    .from('client_analyses')
    .select('*')
    .eq('id', clientId)
    .single()

  if (error) {
    console.error('❌ Erreur:', error)
    return
  }

  console.log('\n📊 Données complètes:')
  console.log('Source:', data.source)
  console.log('Client:', data.client_name)
  console.log('\n📦 Structure raw_data:')
  console.log(JSON.stringify(data.raw_data, null, 2))

  // Vérifier la structure clientInfo
  if (data.raw_data?.clientInfo) {
    console.log('\n👤 clientInfo:')
    console.log(JSON.stringify(data.raw_data.clientInfo, null, 2))
  }

  // Vérifier daysDetected
  if (data.raw_data?.clientInfo?.daysDetected) {
    console.log('\n📅 daysDetected (texte brut):')
    console.log(data.raw_data.clientInfo.daysDetected)
    console.log('\n📏 Longueur:', data.raw_data.clientInfo.daysDetected.length)
  }

  if (data.raw_data?.daysDetected) {
    console.log('\n📅 daysDetected (racine):')
    console.log(data.raw_data.daysDetected)
  }

  // Vérifier les paychecks
  if (data.raw_data?.paychecks) {
    console.log('\n💰 Nombre de paychecks:', data.raw_data.paychecks.length)
    console.log('Premier paycheck:', JSON.stringify(data.raw_data.paychecks[0], null, 2))
  }

  // Vérifier les accounts
  if (data.raw_data?.accounts) {
    console.log('\n🏦 Nombre de comptes:', data.raw_data.accounts.length)
    console.log('Premier compte:', JSON.stringify(data.raw_data.accounts[0], null, 2))
  }
}

debugFlinksData()
