import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { exec } from 'child_process'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

dotenv.config({ path: join(__dirname, '.env.local') })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY // Utilise service_role key
)

// Essayer de récupérer un client existant
let { data, error } = await supabase
  .from('clients')
  .select('id, first_name, last_name, primary_email')
  .limit(1)
  .single()

// Si aucun client, en créer un
if (error || !data) {
  console.log('📝 Aucun client trouvé, création d\'un client de test...\n')

  const { data: newClient, error: createError } = await supabase
    .from('clients')
    .insert({
      first_name: 'Jean',
      last_name: 'Dupont',
      primary_email: 'jean.dupont@test.com',
      primary_phone: '514-555-1234',
      dob: '1985-05-15',
      status: 'active'
    })
    .select()
    .single()

  if (createError) {
    console.error('❌ Erreur création client:', createError)
    process.exit(1)
  }

  data = newClient
  console.log('✅ Client créé!')
}

console.log('\n✅ Client:')
console.log(`   ID: ${data.id}`)
console.log(`   Nom: ${data.first_name} ${data.last_name}`)
console.log(`   Email: ${data.primary_email}`)

const url = `http://localhost:3002/clients/${data.id}`
console.log(`\n🌐 Ouverture: ${url}\n`)

// Ouvrir dans le navigateur
exec(`open "${url}"`, (error) => {
  if (error) {
    console.error('❌ Erreur ouverture navigateur:', error)
    console.log(`\nℹ️  Copiez ce lien dans votre navigateur: ${url}`)
  }
})
