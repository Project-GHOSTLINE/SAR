import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

dotenv.config({ path: join(__dirname, '.env.local') })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

console.log('\n🔨 Création d\'un client de test...\n')

const { data, error } = await supabase
  .from('clients')
  .insert({
    first_name: 'Jean',
    last_name: 'Dupont',
    primary_email: 'jean.dupont@example.com',
    primary_phone: '514-555-1234',
    dob: '1985-05-15',
    status: 'active'
  })
  .select()
  .single()

if (error) {
  console.error('❌ Error:', error)
  process.exit(1)
}

console.log('✅ Client créé avec succès!')
console.log(`   ID: ${data.id}`)
console.log(`   Nom: ${data.first_name} ${data.last_name}`)
console.log(`   Email: ${data.primary_email}`)
console.log(`\n🌐 Ouvrir dans le navigateur:`)
console.log(`   http://localhost:3002/clients/${data.id}`)
console.log('')
