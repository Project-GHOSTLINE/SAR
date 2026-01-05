import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_KEY

console.log('🔍 Vérification Supabase...')
console.log('URL:', supabaseUrl)
console.log('Key:', supabaseKey ? supabaseKey.substring(0, 20) + '...' : 'MISSING')
console.log('')

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Credentials manquants')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

// Vérifier les webhooks
const { data, error, count } = await supabase
  .from('vopay_webhook_logs')
  .select('*', { count: 'exact' })
  .order('received_at', { ascending: false })
  .limit(10)

if (error) {
  console.error('❌ Erreur Supabase:', error)
  process.exit(1)
}

console.log('✅ Webhooks trouvés:', count)
console.log('')

if (data && data.length > 0) {
  console.log('📊 Derniers webhooks:')
  data.forEach((w, i) => {
    console.log(`${i + 1}. ${w.transaction_id} - ${w.status} - ${w.transaction_amount} CAD`)
  })
} else {
  console.log('⚠️ Aucun webhook en base de données')
}
