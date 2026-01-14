#!/usr/bin/env node
/**
 * Ajoute automatiquement des shapes (rectangles) au board Miro
 * avec les données de performance des APIs SAR
 */

const TOKEN = 'eyJtaXJvLm9yaWdpbiI6ImV1MDEifQ_eznJ0arv-ekrq9HvsBD0W86uroY'
const BOARD_ID = 'uXjVGQAh0lY=' // Le board qu'on a créé
const MIRO_API = 'https://api.miro.com/v2'

// Données de performance
const apis = [
  { name: 'Messages API', time: 23, emoji: '🟢', color: '#10b981' },
  { name: 'VoPay Transactions', time: 89, emoji: '🟡', color: '#fbbf24' },
  { name: 'VoPay Dashboard', time: 34, emoji: '🟢', color: '#10b981' },
  { name: 'Analytics', time: 234, emoji: '🔴', color: '#ef4444' },
  { name: 'Support Tickets', time: 45, emoji: '🟢', color: '#10b981' },
  { name: 'Download Stats', time: 67, emoji: '🟡', color: '#fbbf24' },
  { name: 'Webhook Stats', time: 12, emoji: '🟢', color: '#10b981' },
]

console.log('🎨 Ajout automatique des shapes au board Miro...')
console.log('=' .repeat(60))
console.log('')

let xOffset = -800
const yOffset = 0
const spacing = 300

for (const api of apis) {
  console.log(`📦 Création: ${api.name} ${api.emoji} ${api.time}ms`)

  try {
    const response = await fetch(`${MIRO_API}/boards/${BOARD_ID}/shapes`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        data: {
          shape: 'rectangle',
          content: `<p><strong>${api.name}</strong></p><p>${api.emoji} <strong>${api.time}ms</strong></p>`
        },
        style: {
          fillColor: api.color,
          fontFamily: 'arial',
          fontSize: '14',
          textAlign: 'center',
          textAlignVertical: 'middle',
          color: '#ffffff'
        },
        position: {
          x: xOffset,
          y: yOffset,
          origin: 'center'
        },
        geometry: {
          width: 250,
          height: 120
        }
      })
    })

    if (!response.ok) {
      const error = await response.text()
      console.log(`   ❌ Erreur: ${error.substring(0, 100)}`)
    } else {
      console.log(`   ✅ Shape créé!`)
    }

    xOffset += spacing
    await new Promise(resolve => setTimeout(resolve, 300)) // Rate limiting

  } catch (error) {
    console.log(`   ❌ Exception: ${error.message}`)
  }
}

console.log('')
console.log('=' .repeat(60))
console.log('🎉 Terminé!')
console.log('')
console.log('🔗 Rafraîchis ton board Miro pour voir les changements:')
console.log(`   https://miro.com/app/board/${BOARD_ID}/`)
console.log('')
