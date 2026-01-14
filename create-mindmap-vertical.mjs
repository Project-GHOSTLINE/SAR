#!/usr/bin/env node
/**
 * Crée une Mind Map VERTICALE sur Miro
 * Structure: SAR Cortex en haut, catégories en dessous, APIs sous chaque catégorie
 */

const TOKEN = 'eyJtaXJvLm9yaWdpbiI6ImV1MDEifQ_eznJ0arv-ekrq9HvsBD0W86uroY'
const MIRO_API = 'https://api.miro.com/v2'

console.log('🧠 Création Mind Map VERTICALE - SAR Architecture')
console.log('=' .repeat(60))
console.log('')

// Étape 1: Créer un nouveau board
console.log('📊 Création du board...')

const boardResponse = await fetch(`${MIRO_API}/boards`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${TOKEN}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    name: `🧠 SAR Cortex - Architecture Verticale`,
    description: `Architecture SAR en format vertical - Toutes les APIs organisées hiérarchiquement`,
  })
})

if (!boardResponse.ok) {
  const error = await boardResponse.text()
  console.error('❌ Erreur:', error)
  process.exit(1)
}

const board = await boardResponse.json()
console.log(`✅ Board créé: ${board.name}`)
console.log(`   URL: ${board.viewLink}`)
console.log('')

const BOARD_ID = board.id

// Étape 2: Créer le nœud en haut "SAR CORTEX"
console.log('🎯 Création du nœud principal en haut...')

const centerNode = await fetch(`${MIRO_API}/boards/${BOARD_ID}/shapes`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${TOKEN}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    data: {
      shape: 'round_rectangle',
      content: '<p><strong style="font-size: 28px">🧠 SAR CORTEX</strong></p><p style="font-size: 16px">Système Central des Opérations</p>'
    },
    style: {
      fillColor: '#667eea',
      fontFamily: 'arial',
      fontSize: '20',
      textAlign: 'center',
      textAlignVertical: 'middle',
      color: '#ffffff'
    },
    position: { x: 0, y: -800, origin: 'center' },
    geometry: { width: 400, height: 150 }
  })
})

const centerShape = await centerNode.json()
console.log('✅ Nœud principal créé')
console.log('')

// Étape 3: Créer les catégories horizontalement
console.log('🌿 Création des catégories...')

const categories = [
  {
    name: '💬 Messages',
    color: '#3b82f6',
    x: -1000,
    apis: [
      { name: 'Messages List', time: 23, emoji: '🟢' },
      { name: 'Assign Message', time: 15, emoji: '🟢' }
    ]
  },
  {
    name: '💰 VoPay',
    color: '#10b981',
    x: -600,
    apis: [
      { name: 'Transactions', time: 89, emoji: '🟡' },
      { name: 'Dashboard', time: 34, emoji: '🟢' },
      { name: 'Balance Check', time: 28, emoji: '🟢' }
    ]
  },
  {
    name: '📊 Analytics',
    color: '#f59e0b',
    x: -200,
    apis: [
      { name: 'Analytics API', time: 234, emoji: '🔴' },
      { name: 'Reports', time: 156, emoji: '🟠' }
    ]
  },
  {
    name: '🔧 Support',
    color: '#8b5cf6',
    x: 200,
    apis: [
      { name: 'Support Tickets', time: 45, emoji: '🟢' },
      { name: 'Live Chat', time: 12, emoji: '🟢' }
    ]
  },
  {
    name: '📥 Downloads',
    color: '#ec4899',
    x: 600,
    apis: [
      { name: 'Download Stats', time: 67, emoji: '🟡' },
      { name: 'File Manager', time: 34, emoji: '🟢' }
    ]
  },
  {
    name: '🔗 Webhooks',
    color: '#06b6d4',
    x: 1000,
    apis: [
      { name: 'Webhook Stats', time: 12, emoji: '🟢' },
      { name: 'Event Logs', time: 23, emoji: '🟢' }
    ]
  }
]

const categoryY = -500 // Niveau des catégories

for (const category of categories) {
  console.log(`  📁 ${category.name}`)

  // Créer le nœud de catégorie
  const categoryNode = await fetch(`${MIRO_API}/boards/${BOARD_ID}/shapes`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      data: {
        shape: 'round_rectangle',
        content: `<p><strong style="font-size: 18px">${category.name}</strong></p>`
      },
      style: {
        fillColor: category.color,
        fontFamily: 'arial',
        fontSize: '16',
        textAlign: 'center',
        textAlignVertical: 'middle',
        color: '#ffffff'
      },
      position: { x: category.x, y: categoryY, origin: 'center' },
      geometry: { width: 220, height: 90 }
    })
  })

  const categoryShape = await categoryNode.json()

  // Connecter du centre vers la catégorie
  await fetch(`${MIRO_API}/boards/${BOARD_ID}/connectors`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      startItem: { id: centerShape.id },
      endItem: { id: categoryShape.id },
      shape: 'curved',
      style: {
        strokeColor: category.color,
        strokeWidth: '4'
      }
    })
  })

  // Créer les APIs verticalement sous la catégorie
  let apiY = -250 // Position de départ des APIs
  for (const api of category.apis) {
    const apiNode = await fetch(`${MIRO_API}/boards/${BOARD_ID}/shapes`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        data: {
          shape: 'rectangle',
          content: `<p><strong>${api.name}</strong></p><p style="font-size: 16px">${api.emoji} <strong>${api.time}ms</strong></p>`
        },
        style: {
          fillColor: api.emoji === '🟢' ? '#d1fae5' : api.emoji === '🟡' ? '#fef3c7' : api.emoji === '🟠' ? '#fed7aa' : '#fee2e2',
          fontFamily: 'arial',
          fontSize: '13',
          textAlign: 'center',
          textAlignVertical: 'middle',
          color: '#1f2937',
          borderColor: category.color,
          borderWidth: '2'
        },
        position: { x: category.x, y: apiY, origin: 'center' },
        geometry: { width: 200, height: 85 }
      })
    })

    const apiShape = await apiNode.json()

    // Connecter catégorie vers API
    await fetch(`${MIRO_API}/boards/${BOARD_ID}/connectors`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        startItem: { id: categoryShape.id },
        endItem: { id: apiShape.id },
        shape: 'elbowed',
        style: {
          strokeColor: category.color,
          strokeWidth: '2'
        }
      })
    })

    console.log(`     ✅ ${api.name} ${api.emoji} ${api.time}ms`)
    apiY += 120 // Espacement vertical entre APIs
  }

  await new Promise(resolve => setTimeout(resolve, 300))
}

console.log('')
console.log('=' .repeat(60))
console.log('🎉 Mind Map VERTICALE créée avec succès!')
console.log('')
console.log('🔗 Ouvre ce lien:')
console.log(`   ${board.viewLink}`)
console.log('')
console.log('📊 Structure:')
console.log('   • En HAUT: 🧠 SAR CORTEX')
console.log('   • Niveau 2: 6 catégories (horizontal)')
console.log('   • Niveau 3: APIs sous chaque catégorie (vertical)')
console.log('   • Connecteurs colorés')
console.log('   • 14 APIs au total')
console.log('')
