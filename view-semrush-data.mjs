import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://dllyzfuqjzuhvshrlmuq.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRsbHl6ZnVxanp1aHZzaHJsbXVxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU5OTU5ODEsImV4cCI6MjA4MTU3MTk4MX0.xskVblRlKdbTST1Mdgz76oR7N2rDq8ZOUgaN-f_TTM4'

const supabase = createClient(supabaseUrl, supabaseKey)

console.log('🔍 Récupération des données Semrush depuis Supabase...\n')

const { data, error } = await supabase
  .from('seo_semrush_domain_daily')
  .select('*')
  .order('date', { ascending: false })
  .limit(3)

if (error) {
  console.error('❌ Erreur:', error)
  process.exit(1)
}

if (!data || data.length === 0) {
  console.log('⚠️  Aucune donnée Semrush trouvée dans la base de données')
  process.exit(0)
}

console.log(`✅ ${data.length} enregistrement(s) trouvé(s)\n`)
console.log('═'.repeat(60))

data.forEach((record, index) => {
  console.log(`\n📊 Enregistrement ${index + 1}`)
  console.log('─'.repeat(60))
  console.log(`📅 Date: ${record.date}`)
  console.log(`🌐 Domaine: ${record.domain}`)
  console.log(`🏆 Domain Rank: ${record.domain_rank?.toLocaleString() || 'N/A'}`)
  console.log(`📈 Changement de rank: ${record.domain_rank_change > 0 ? '+' : ''}${record.domain_rank_change || 0}`)
  console.log()
  console.log(`🔍 Mots-clés organiques: ${record.organic_keywords || 0}`)
  console.log(`👥 Trafic organique: ${record.organic_traffic?.toLocaleString() || 0} visiteurs/mois`)
  console.log(`💰 Valeur du trafic: ${(record.organic_traffic_cost / 100).toFixed(2)} $`)
  console.log()
  console.log(`🔗 Total backlinks: ${record.total_backlinks?.toLocaleString() || 0}`)
  console.log(`🌍 Domaines référents: ${record.referring_domains || 0}`)
  console.log(`📍 IPs référentes: ${record.referring_ips || 0}`)
  console.log(`✅ Follow backlinks: ${record.follow_backlinks || 0}`)
  console.log(`⭐ Authority Score: ${record.authority_score || 0}/100`)
  console.log()

  if (record.top_organic_keywords && record.top_organic_keywords.length > 0) {
    console.log('🎯 Top 5 Mots-clés:')
    record.top_organic_keywords.slice(0, 5).forEach((kw, i) => {
      console.log(`   ${i + 1}. "${kw.keyword}" - Position ${kw.position} - Volume ${kw.volume?.toLocaleString()}`)
    })
    console.log()
  }

  if (record.top_competitors && record.top_competitors.length > 0) {
    console.log('🥊 Top 3 Concurrents:')
    record.top_competitors.slice(0, 3).forEach((comp, i) => {
      console.log(`   ${i + 1}. ${comp.domain} - ${comp.common_keywords} mots-clés communs - ${comp.organic_traffic?.toLocaleString()} trafic`)
    })
    console.log()
  }

  if (record.organic_positions_distribution) {
    console.log('📊 Distribution des positions:')
    const dist = record.organic_positions_distribution
    console.log(`   Top 3: ${dist.top3 || 0} mots-clés`)
    console.log(`   4-10: ${dist['4-10'] || 0} mots-clés`)
    console.log(`   11-20: ${dist['11-20'] || 0} mots-clés`)
    console.log(`   21-50: ${dist['21-50'] || 0} mots-clés`)
    console.log(`   51+: ${dist['51+'] || 0} mots-clés`)
  }

  console.log()
  console.log(`🕐 Collecté le: ${new Date(record.collected_at).toLocaleString('fr-CA')}`)

  if (index < data.length - 1) {
    console.log('\n' + '═'.repeat(60))
  }
})

console.log('\n' + '═'.repeat(60))
console.log('\n✅ Terminé !')
