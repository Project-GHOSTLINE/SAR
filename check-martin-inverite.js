import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load .env.local
const envPath = join(__dirname, '.env.local')
const envFile = readFileSync(envPath, 'utf-8')
const envVars = {}
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/)
  if (match) {
    envVars[match[1]] = match[2]
  }
})

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variables d\'environnement Supabase manquantes')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkMartinData() {
  console.log('\n🔍 Vérification des données Inverite de Martin Menard...\n')

  const { data, error } = await supabase
    .from('client_analyses')
    .select('*')
    .eq('id', '422af5a0-673e-4530-8dd6-9b330a23ab26')
    .single()

  if (error) {
    console.error('❌ Erreur:', error.message)
    return
  }

  if (!data) {
    console.log('❌ Analyse non trouvée')
    return
  }

  console.log('✅ Analyse trouvée:', data.client_name)
  console.log('📊 Source:', data.source)
  console.log('💰 Balance totale:', data.total_balance)
  console.log('🏦 Nombre de comptes:', data.total_accounts)
  console.log('💳 Nombre de transactions:', data.total_transactions)
  console.log('\n📁 Structure raw_data:')
  console.log(JSON.stringify(data.raw_data, null, 2))

  // Examiner les comptes
  const accounts = data.raw_data?.accounts || data.accounts || []
  console.log(`\n🏦 ${accounts.length} compte(s) trouvé(s):\n`)

  accounts.forEach((account, index) => {
    console.log(`\n--- Compte ${index + 1} ---`)
    console.log('Titre:', account.title || account.accountNumber || 'N/A')
    console.log('Type:', account.type || 'N/A')
    console.log('Balance:', account.current_balance || account.balance || 0)
    console.log('Transactions:', account.transactions?.length || 0)

    // Examiner les 5 premières transactions
    if (account.transactions && account.transactions.length > 0) {
      console.log('\n📝 Structure des 5 premières transactions:')
      account.transactions.slice(0, 5).forEach((tx, txIndex) => {
        console.log(`\nTransaction ${txIndex + 1}:`)
        console.log(JSON.stringify(tx, null, 2))
      })
    }
  })
}

checkMartinData()
