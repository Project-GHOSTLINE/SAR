console.log('🚀 Collecte des données Semrush depuis la production...\n')

const response = await fetch('https://admin.solutionargentrapide.ca/api/seo/collect/semrush', {
  method: 'POST',
  headers: {
    'x-api-key': 'FredRosa%1978',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ force: true })
})

const data = await response.json()

console.log('📊 Résultat de la collecte:\n')
console.log(JSON.stringify(data, null, 2))

if (data.success) {
  console.log('\n✅ Collecte réussie !')
  console.log(`📅 Date: ${data.date}`)
  console.log(`🔄 Mode: ${data.mock ? 'MOCK (API non accessible)' : 'RÉEL (API Semrush)'}`)

  if (data.data) {
    console.log('\n📈 Métriques collectées:')
    console.log(`   🏆 Domain Rank: ${data.data.domain_rank?.toLocaleString()}`)
    console.log(`   🔍 Mots-clés organiques: ${data.data.organic_keywords}`)
    console.log(`   👥 Trafic organique: ${data.data.organic_traffic?.toLocaleString()} visiteurs/mois`)
    console.log(`   🔗 Total backlinks: ${data.data.total_backlinks?.toLocaleString()}`)
    console.log(`   ⭐ Authority Score: ${data.data.authority_score}/100`)
  }
} else {
  console.log('\n❌ Erreur lors de la collecte:', data.error)
}
