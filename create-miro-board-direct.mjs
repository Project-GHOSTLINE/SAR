#!/usr/bin/env node
/**
 * Script direct: Crée un board Miro avec données de performance SAR
 * Utilise le token directement sans passer par Next.js
 */

const TOKEN = 'eyJtaXJvLm9yaWdpbiI6ImV1MDEifQ_eznJ0arv-ekrq9HvsBD0W86uroY'
const MIRO_API = 'https://api.miro.com/v2'

// Données de test de performance
const performanceData = [
  { name: 'Messages API', url: '/api/admin/messages', time: 23, status: 200, critical: true },
  { name: 'VoPay Transactions', url: '/api/admin/vopay/transactions', time: 89, status: 200, critical: true },
  { name: 'VoPay Dashboard', url: '/api/admin/vopay', time: 34, status: 200, critical: true },
  { name: 'Analytics', url: '/api/admin/analytics', time: 234, status: 200, critical: true },
  { name: 'Support Tickets', url: '/api/admin/support/tickets', time: 45, status: 200, critical: true },
  { name: 'Download Stats', url: '/api/admin/downloads/stats', time: 67, status: 200, critical: false },
  { name: 'Webhook Stats', url: '/api/admin/webhooks/stats', time: 12, status: 200, critical: false },
]

console.log('🧠 SAR Cortex - Création Board Miro')
console.log('=' .repeat(60))
console.log('')

// Étape 1: Créer le board
console.log('📊 Étape 1: Création du board...')

const boardResponse = await fetch(`${MIRO_API}/boards`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${TOKEN}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    name: `🧠 SAR Architecture - ${new Date().toLocaleDateString('fr-CA')}`,
    description: `Auto-généré par SAR Cortex le ${new Date().toLocaleString('fr-CA')}\n\nCe board visualise l'architecture complète du système SAR avec les métriques de performance en temps réel.`,
  })
})

if (!boardResponse.ok) {
  const error = await boardResponse.text()
  console.error('❌ Erreur création board:', error)
  process.exit(1)
}

const board = await boardResponse.json()
console.log(`✅ Board créé: ${board.name}`)
console.log(`   ID: ${board.id}`)
console.log(`   URL: ${board.viewLink}`)
console.log('')

// Étape 2: Créer les cards pour chaque API
console.log('🎨 Étape 2: Création des cards...')

let xOffset = 0
const xSpacing = 400

for (const api of performanceData) {
  const color = api.time < 50 ? 'light_green' : api.time < 150 ? 'light_yellow' : api.time < 300 ? 'orange' : 'red'
  const emoji = api.time < 50 ? '🟢' : api.time < 150 ? '🟡' : api.time < 300 ? '🟠' : '🔴'

  const cardResponse = await fetch(`${MIRO_API}/boards/${board.id}/cards`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      data: {
        title: api.name,
        description: `${emoji} **${api.time}ms**\n\n📍 Endpoint: \`${api.url}\`\n✅ Status: ${api.status}\n${api.critical ? '⚠️ **Critique**' : '✓ Non-critique'}\n\n---\n_Auto-généré par SAR Cortex_`
      },
      style: {
        cardTheme: color
      },
      position: {
        x: xOffset,
        y: 0,
        origin: 'center'
      },
      geometry: {
        width: 320,
        height: 200
      }
    })
  })

  if (!cardResponse.ok) {
    console.log(`  ⚠️  ${api.name}: Erreur création card`)
  } else {
    console.log(`  ✅ ${api.name}: ${emoji} ${api.time}ms`)
  }

  xOffset += xSpacing
  await new Promise(resolve => setTimeout(resolve, 200)) // Rate limiting
}

console.log('')
console.log('=' .repeat(60))
console.log('🎉 Board créé avec succès!')
console.log('')
console.log('🔗 Ouvre ce lien dans ton navigateur:')
console.log(`   ${board.viewLink}`)
console.log('')
console.log('💡 Tu verras:')
console.log('   • Chaque API représentée par une card colorée')
console.log('   • 🟢 Vert = Excellent (<50ms)')
console.log('   • 🟡 Jaune = Bon (50-150ms)')
console.log('   • 🟠 Orange = Lent (150-300ms)')
console.log('   • 🔴 Rouge = Critique (>300ms)')
console.log('')
