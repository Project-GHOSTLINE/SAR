const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  'https://dllyzfuqjzuhvshrlmuq.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRsbHl6ZnVxanp1aHZzaHJsbXVxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTk5NTk4MSwiZXhwIjoyMDgxNTcxOTgxfQ.Qg5eQwDxeAtTDXplNkQZa4hOp_dSMBIu_DKbuquryFo'
)

async function checkNickolasData() {
  console.log('🔍 Recherche de Nickolas Jerome (Flinks) dans Supabase...\n')

  const { data, error } = await supabase
    .from('client_analyses')
    .select('*')
    .or('client_name.ilike.%Nickolas%,client_name.ilike.%Jerome%,client_email.eq.njerome91@gmail.com')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('❌ Erreur:', error)
    return
  }

  if (!data || data.length === 0) {
    console.log('❌ Aucune donnée trouvée pour Nickolas Jerome')
    console.log('   Email recherché: njerome91@gmail.com')
    console.log('   Request ID Flinks: 46EBE571-4003-4314-9C5F-DD6829070465')
    return
  }

  console.log(`📊 ${data.length} analyse(s) trouvée(s)\n`)

  const analysis = data[0]
  console.log('✅ Client trouvé:', analysis.client_name)
  console.log('📧 Email:', analysis.client_email || 'N/A')
  console.log('📍 Adresse:', analysis.client_address || 'N/A')
  console.log('🏦 Source:', analysis.source)
  console.log('📅 Créé le:', new Date(analysis.created_at).toLocaleString('fr-CA'))
  console.log('📅 Modifié le:', new Date(analysis.updated_at).toLocaleString('fr-CA'))
  console.log('🆔 ID:', analysis.id)
  console.log('📊 Status:', analysis.status)
  console.log('📈 Total comptes:', analysis.total_accounts)
  console.log('💰 Balance totale:', analysis.total_balance, '$')
  console.log('📋 Total transactions:', analysis.total_transactions)

  console.log('\n📦 Détail des comptes dans raw_data:')
  if (analysis.raw_data && analysis.raw_data.accounts) {
    const accounts = analysis.raw_data.accounts
    console.log('   Nombre de comptes:', accounts.length, '\n')

    accounts.forEach((account, index) => {
      console.log(`   📁 Compte ${index + 1}:`)
      console.log('      Type:', account.type || account.accountType || 'N/A')
      console.log('      Numéro:', account.accountNumber || account.account || 'N/A')
      console.log('      Institution:', account.institutionName || account.institution || 'N/A')
      console.log('      Balance:', account.balance || account.currentBalance || 'N/A', '$')
      console.log('      Transactions:', account.transactions ? account.transactions.length : 0)

      // Afficher quelques transactions
      if (account.transactions && account.transactions.length > 0) {
        console.log('      Dernières transactions:')
        account.transactions.slice(0, 3).forEach((tx, txIndex) => {
          console.log(`         ${txIndex + 1}. ${tx.description || 'N/A'} - ${tx.date || 'N/A'}`)
        })
      }
      console.log('')
    })

    console.log('✅ TOUTES LES DONNÉES FLINKS SONT PRÉSENTES!')
  } else {
    console.log('⚠️  Aucun compte trouvé dans raw_data')
  }

  // Vérifier le Request ID Flinks
  if (analysis.raw_data && analysis.raw_data.requestId) {
    console.log('\n🔑 Request ID Flinks:', analysis.raw_data.requestId)
  }
  if (analysis.raw_data && analysis.raw_data.loginId) {
    console.log('🔑 Login ID Flinks:', analysis.raw_data.loginId)
  }
}

checkNickolasData().catch(console.error)
