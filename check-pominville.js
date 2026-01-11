const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://dllyzfuqjzuhvshrlmuq.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRsbHl6ZnVxanp1aHZzaHJsbXVxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTk5NTk4MSwiZXhwIjoyMDgxNTcxOTgxfQ.Qg5eQwDxeAtTDXplNkQZa4hOp_dSMBIu_DKbuquryFo'

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkPominvilleData() {
  console.log('🔍 Recherche de POMINVILLE CARL dans la base de données...\n')

  const { data, error } = await supabase
    .from('client_analyses')
    .select('*')
    .ilike('client_name', '%POMINVILLE%')
    .order('created_at', { ascending: false })
    .limit(1)

  if (error) {
    console.error('❌ Erreur:', error)
    return
  }

  if (!data || data.length === 0) {
    console.log('❌ Aucune donnée trouvée pour POMINVILLE')
    return
  }

  const analysis = data[0]
  console.log('✅ Client trouvé:', analysis.client_name)
  console.log('📅 Créé le:', analysis.created_at)
  console.log('📅 Modifié le:', analysis.updated_at)
  console.log('🆔 ID:', analysis.id)
  console.log('📊 Status:', analysis.status)
  console.log('\n📦 Données brutes (raw_data):')

  if (analysis.raw_data) {
    const rawData = typeof analysis.raw_data === 'string' ? JSON.parse(analysis.raw_data) : analysis.raw_data

    console.log('   - Comptes:', rawData.accounts?.length || 0)

    if (rawData.accounts && rawData.accounts.length > 0) {
      const account = rawData.accounts[0]
      console.log('   - Balance du 1er compte:', account.balance)
      console.log('   - Transactions:', account.transactions?.length || 0)
      console.log('   - Institution:', account.institutionName || 'N/A')
      console.log('   - Type de compte:', account.type || 'N/A')

      if (account.transactions && account.transactions.length > 0) {
        console.log('\n✅ TOUTES LES DONNÉES SONT PRÉSENTES!')
        console.log('   Le JSON complet de l\'API Inverite a été sauvegardé.')
      } else {
        console.log('\n⚠️  Aucune transaction trouvée dans le compte')
      }
    } else {
      console.log('\n⚠️  Aucun compte trouvé dans raw_data')
    }
  } else {
    console.log('⚠️  Aucune raw_data trouvée')
  }
}

checkPominvilleData().catch(console.error)
