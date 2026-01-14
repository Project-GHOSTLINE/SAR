#!/usr/bin/env node
/**
 * Crée une Mind Map sur Miro pour visualiser l'architecture SAR
 * Structure: SAR Cortex au centre, avec branches pour chaque catégorie
 */

const TOKEN = 'eyJtaXJvLm9yaWdpbiI6ImV1MDEifQ_eznJ0arv-ekrq9HvsBD0W86uroY'
const MIRO_API = 'https://api.miro.com/v2'

console.log('🧠 Création Mind Map SAR Architecture')
console.log('=' .repeat(60))
console.log('')

// Étape 1: Créer un nouveau board pour la Mind Map
console.log('📊 Création du board Mind Map...')

const boardResponse = await fetch(`${MIRO_API}/boards`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${TOKEN}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    name: `🧠 SAR Cortex - Mind Map Architecture`,
    description: `Mind Map de l'architecture SAR avec toutes les APIs organisées par catégories`,
  })
})

if (!boardResponse.ok) {
  const error = await boardResponse.text()
  console.error('❌ Erreur création board:', error)
  process.exit(1)
}

const board = await boardResponse.json()
console.log(`✅ Board créé: ${board.name}`)
console.log(`   URL: ${board.viewLink}`)
console.log('')

const BOARD_ID = board.id

// Étape 2: Créer le nœud central "SAR CORTEX"
console.log('🎯 Création du nœud central...')

const centerNode = await fetch(`${MIRO_API}/boards/${BOARD_ID}/shapes`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${TOKEN}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    data: {
      shape: 'round_rectangle',
      content: '<p><strong style="font-size: 24px">🧠 SAR CORTEX</strong></p><p>Système Central des Opérations</p>'
    },
    style: {
      fillColor: '#667eea',
      fontFamily: 'arial',
      fontSize: '18',
      textAlign: 'center',
      textAlignVertical: 'middle',
      color: '#ffffff'
    },
    position: { x: 0, y: 0, origin: 'center' },
    geometry: { width: 350, height: 150 }
  })
})

const centerShape = await centerNode.json()
console.log('✅ Nœud central créé')
console.log('')

// Étape 3: Créer les branches par catégorie
console.log('🌿 Création des branches...')

const categories = [
  {
    name: '💬 Messages',
    color: '#3b82f6',
    angle: -90,
    apis: [
      { name: 'Messages API', time: 23, emoji: '🟢' },
      { name: 'Assign Message', time: 15, emoji: '🟢' }
    ]
  },
  {
    name: '💰 VoPay',
    color: '#10b981',
    angle: -45,
    apis: [
      { name: 'Transactions', time: 89, emoji: '🟡' },
      { name: 'Dashboard', time: 34, emoji: '🟢' },
      { name: 'Balance', time: 28, emoji: '🟢' }
    ]
  },
  {
    name: '📊 Analytics',
    color: '#f59e0b',
    angle: 0,
    apis: [
      { name: 'Analytics API', time: 234, emoji: '🔴' }
    ]
  },
  {
    name: '🔧 Support',
    color: '#8b5cf6',
    angle: 45,
    apis: [
      { name: 'Support Tickets', time: 45, emoji: '🟢' }
    ]
  },
  {
    name: '📥 Downloads',
    color: '#ec4899',
    angle: 90,
    apis: [
      { name: 'Download Stats', time: 67, emoji: '🟡' }
    ]
  },
  {
    name: '🔗 Webhooks',
    color: '#06b6d4',
    angle: 135,
    apis: [
      { name: 'Webhook Stats', time: 12, emoji: '🟢' }
    ]
  }
]

for (const category of categories) {
  // Calculer position de la branche (autour du centre)
  const branchDistance = 400
  const angleRad = (category.angle * Math.PI) / 180
  const branchX = Math.cos(angleRad) * branchDistance
  const branchY = Math.sin(angleRad) * branchDistance

  // Créer le nœud de catégorie
  console.log(`  📁 ${category.name}`)

  const categoryNode = await fetch(`${MIRO_API}/boards/${BOARD_ID}/shapes`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      data: {
        shape: 'round_rectangle',
        content: `<p><strong>${category.name}</strong></p>`
      },
      style: {
        fillColor: category.color,
        fontFamily: 'arial',
        fontSize: '14',
        textAlign: 'center',
        textAlignVertical: 'middle',
        color: '#ffffff'
      },
      position: { x: branchX, y: branchY, origin: 'center' },
      geometry: { width: 200, height: 80 }
    })
  })

  const categoryShape = await categoryNode.json()

  // Créer connecteur du centre vers la catégorie
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
        strokeWidth: '3'
      }
    })
  })

  // Créer les APIs sous cette catégorie
  let apiYOffset = branchY + 150
  for (const api of category.apis) {
    const apiX = branchX + (category.angle > 0 ? 250 : -250)

    const apiNode = await fetch(`${MIRO_API}/boards/${BOARD_ID}/shapes`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        data: {
          shape: 'rectangle',
          content: `<p><strong>${api.name}</strong></p><p>${api.emoji} ${api.time}ms</p>`
        },
        style: {
          fillColor: api.emoji === '🟢' ? '#d1fae5' : api.emoji === '🟡' ? '#fef3c7' : '#fee2e2',
          fontFamily: 'arial',
          fontSize: '12',
          textAlign: 'center',
          textAlignVertical: 'middle',
          color: '#1f2937'
        },
        position: { x: apiX, y: apiYOffset, origin: 'center' },
        geometry: { width: 180, height: 70 }
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
        shape: 'curved',
        style: {
          strokeColor: category.color,
          strokeWidth: '2',
          strokeStyle: 'dashed'
        }
      })
    })

    console.log(`     ✅ ${api.name} ${api.emoji}`)
    apiYOffset += 100
  }

  await new Promise(resolve => setTimeout(resolve, 200))
}

console.log('')
console.log('=' .repeat(60))
console.log('🎉 Mind Map créée avec succès!')
console.log('')
console.log('🔗 Ouvre ce lien pour voir ta Mind Map:')
console.log(`   ${board.viewLink}`)
console.log('')
console.log('📊 Structure:')
console.log('   • Centre: 🧠 SAR CORTEX')
console.log('   • 6 branches de catégories')
console.log('   • Toutes les APIs connectées')
console.log('   • Couleurs par performance')
console.log('')
