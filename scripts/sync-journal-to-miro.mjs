#!/usr/bin/env node
/**
 * 📊 Synchronisation JOURNAL → Miro
 *
 * Lit les fichiers du dossier JOURNAL et crée/met à jour un board Miro
 * pour visualiser la progression de la restructuration DB SAR
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const TOKEN = 'eyJtaXJvLm9yaWdpbiI6ImV1MDEifQ_eznJ0arv-ekrq9HvsBD0W86uroY'
const MIRO_API = 'https://api.miro.com/v2'
const PROJECT_ROOT = path.join(__dirname, '..')
const JOURNAL_DIR = path.join(PROJECT_ROOT, 'JOURNAL')

console.log('📊 SAR DB Restructuration - Synchronisation JOURNAL → Miro')
console.log('='.repeat(70))
console.log('')

// Lire les fichiers du journal
const readJournalFile = (filename) => {
  const filepath = path.join(JOURNAL_DIR, filename)
  if (fs.existsSync(filepath)) {
    return fs.readFileSync(filepath, 'utf-8')
  }
  return ''
}

// Parser STATUS-BOARD.md
const parseStatusBoard = (content) => {
  const phases = []
  const lines = content.split('\n')

  for (const line of lines) {
    if (line.match(/^- \[(x| )\] P\d/)) {
      const isComplete = line.includes('[x]')
      const phaseMatch = line.match(/P(\d)/)
      const nameMatch = line.match(/— (.+?) /)
      const statusMatch = line.match(/✅|🚀|⏳/)
      const dateMatch = line.match(/\((\d{4}-\d{2}-\d{2})/)

      if (phaseMatch) {
        phases.push({
          number: parseInt(phaseMatch[1]),
          name: nameMatch ? nameMatch[1] : '',
          complete: isComplete,
          status: statusMatch ? statusMatch[0] : '⏳',
          date: dateMatch ? dateMatch[1] : null
        })
      }
    }
  }

  return phases
}

// Parser LOGBOOK.md pour les dernières entrées
const parseLogbook = (content) => {
  const entries = []
  const lines = content.split('\n')
  let currentEntry = null

  for (const line of lines) {
    // Détection d'une nouvelle entrée (format: **HH:MM** - Titre)
    const entryMatch = line.match(/^\*\*(\d{2}:\d{2})\*\* - (.+)$/)
    if (entryMatch) {
      if (currentEntry) entries.push(currentEntry)
      currentEntry = {
        time: entryMatch[1],
        title: entryMatch[2],
        details: []
      }
    } else if (currentEntry && line.startsWith('- ')) {
      currentEntry.details.push(line.substring(2))
    } else if (currentEntry && line.trim().startsWith('✅')) {
      currentEntry.details.push(line.trim())
    }
  }

  if (currentEntry) entries.push(currentEntry)

  // Retourner les 5 dernières entrées
  return entries.slice(-5)
}

console.log('📖 Lecture des fichiers JOURNAL...')
const statusBoardContent = readJournalFile('STATUS-BOARD.md')
const logbookContent = readJournalFile('LOGBOOK.md')

const phases = parseStatusBoard(statusBoardContent)
const recentEntries = parseLogbook(logbookContent)

console.log(`   ✅ ${phases.length} phases détectées`)
console.log(`   ✅ ${recentEntries.length} entrées récentes`)
console.log('')

// Créer le board Miro
console.log('🎨 Création du board Miro...')

const boardResponse = await fetch(`${MIRO_API}/boards`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${TOKEN}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    name: `🗄️ SAR DB Restructuration - Progression Live`,
    description: `Suivi en temps réel de la restructuration "Dossier Médical Client". Mise à jour: ${new Date().toLocaleString('fr-CA')}`,
  })
})

if (!boardResponse.ok) {
  const error = await boardResponse.text()
  console.error('❌ Erreur création board:', error)
  process.exit(1)
}

const board = await boardResponse.json()
const BOARD_ID = board.id

console.log(`✅ Board créé: ${board.name}`)
console.log(`   🔗 URL: ${board.viewLink}`)
console.log('')

// Créer le nœud central
console.log('🎯 Création de la structure...')

const centerNode = await fetch(`${MIRO_API}/boards/${BOARD_ID}/shapes`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${TOKEN}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    data: {
      shape: 'round_rectangle',
      content: '<p><strong style="font-size: 36px">🗄️ SAR DB</strong></p><p><strong style="font-size: 24px">Restructuration</strong></p><p style="font-size: 14px">Dossier Médical Client</p><p style="font-size: 12px; margin-top: 8px;">26 tables → Structure unifiée</p>'
    },
    style: {
      fillColor: '#1e293b',
      fontFamily: 'arial',
      fontSize: '20',
      textAlign: 'center',
      textAlignVertical: 'middle',
      color: '#ffffff'
    },
    position: { x: 0, y: 0, origin: 'center' },
    geometry: { width: 450, height: 200 }
  })
})

const centerShape = await centerNode.json()
console.log('✅ Nœud central créé')

// Créer les phases (positions dynamiques basées sur le nombre)
const phasePositions = [
  { x: -800, y: -500 },  // P0
  { x: 0, y: -500 },     // P1
  { x: 800, y: -500 },   // P2
  { x: -800, y: 500 },   // P3
  { x: 0, y: 500 },      // P4
  { x: 800, y: 500 },    // P5
  { x: 0, y: 1000 }      // P6
]

for (let i = 0; i < phases.length; i++) {
  const phase = phases[i]
  const pos = phasePositions[i]

  // Couleur selon statut
  let color, borderColor, icon
  if (phase.status === '✅') {
    color = '#d1fae5'  // vert clair
    borderColor = '#10b981'
    icon = '✅'
  } else if (phase.status === '🚀') {
    color = '#fef3c7'  // jaune clair
    borderColor = '#f59e0b'
    icon = '🚀'
  } else {
    color = '#f3f4f6'  // gris clair
    borderColor = '#9ca3af'
    icon = '⏳'
  }

  const phaseContent = `<p><strong style="font-size: 18px">${icon} Phase ${phase.number}</strong></p><p style="font-size: 14px; margin-top: 4px;">${phase.name}</p>${phase.date ? `<p style="font-size: 11px; color: #6b7280; margin-top: 6px;">${phase.date}</p>` : ''}`

  const phaseNode = await fetch(`${MIRO_API}/boards/${BOARD_ID}/shapes`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      data: {
        shape: 'round_rectangle',
        content: phaseContent
      },
      style: {
        fillColor: color,
        fontFamily: 'arial',
        fontSize: '14',
        textAlign: 'center',
        textAlignVertical: 'middle',
        color: '#1f2937',
        borderColor: borderColor,
        borderWidth: '4'
      },
      position: { x: pos.x, y: pos.y, origin: 'center' },
      geometry: { width: 280, height: 130 }
    })
  })

  const phaseShape = await phaseNode.json()

  // Connecter au centre
  await fetch(`${MIRO_API}/boards/${BOARD_ID}/connectors`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      startItem: { id: centerShape.id },
      endItem: { id: phaseShape.id },
      shape: 'curved',
      style: {
        strokeColor: borderColor,
        strokeWidth: phase.complete ? '5' : '3',
        strokeStyle: phase.complete ? 'normal' : 'dashed'
      }
    })
  })

  console.log(`   ✅ Phase ${phase.number}: ${phase.name} ${phase.status}`)
}

// Ajouter la légende de progression
const completedCount = phases.filter(p => p.complete).length
const progressText = `<p><strong style="font-size: 16px">📊 PROGRESSION</strong></p><p style="font-size: 20px; margin-top: 8px; color: #059669;"><strong>${completedCount}/${phases.length}</strong> phases complètes</p><p style="font-size: 12px; margin-top: 8px;">✅ Complète</p><p style="font-size: 12px;">🚀 En cours</p><p style="font-size: 12px;">⏳ En attente</p>`

await fetch(`${MIRO_API}/boards/${BOARD_ID}/shapes`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${TOKEN}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    data: {
      shape: 'rectangle',
      content: progressText
    },
    style: {
      fillColor: '#ede9fe',
      fontFamily: 'arial',
      fontSize: '12',
      textAlign: 'center',
      textAlignVertical: 'middle',
      color: '#5b21b6',
      borderColor: '#8b5cf6',
      borderWidth: '3'
    },
    position: { x: -1200, y: 0, origin: 'center' },
    geometry: { width: 280, height: 180 }
  })
})

console.log('✅ Légende de progression ajoutée')

// Ajouter les dernières entrées du logbook
if (recentEntries.length > 0) {
  const logbookContent = recentEntries.map(entry => {
    const details = entry.details.slice(0, 2).join(' • ')
    return `<p style="font-size: 11px;"><strong>${entry.time}</strong> - ${entry.title}</p>${details ? `<p style="font-size: 10px; color: #6b7280;">${details}</p>` : ''}`
  }).join('')

  const logbookText = `<p><strong style="font-size: 14px">📖 ACTIVITÉ RÉCENTE</strong></p><div style="margin-top: 8px;">${logbookContent}</div>`

  await fetch(`${MIRO_API}/boards/${BOARD_ID}/shapes`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      data: {
        shape: 'rectangle',
        content: logbookText
      },
      style: {
        fillColor: '#fef3c7',
        fontFamily: 'arial',
        fontSize: '11',
        textAlign: 'left',
        textAlignVertical: 'top',
        color: '#78350f',
        borderColor: '#f59e0b',
        borderWidth: '3'
      },
      position: { x: 1200, y: 0, origin: 'center' },
      geometry: { width: 350, height: 400 }
    })
  })

  console.log('✅ Activité récente ajoutée')
}

// Statistiques finales
const statsText = `<p><strong style="font-size: 16px">📈 STATISTIQUES</strong></p><p style="font-size: 12px; margin-top: 8px;">Tables existantes: 26</p><p style="font-size: 12px;">Nouvelles tables: 8</p><p style="font-size: 12px;">Views: 3</p><p style="font-size: 12px;">Fichiers SQL: 18+</p><p style="font-size: 10px; margin-top: 12px; color: #6b7280;">Dernière sync:</p><p style="font-size: 10px; color: #6b7280;">${new Date().toLocaleString('fr-CA')}</p>`

await fetch(`${MIRO_API}/boards/${BOARD_ID}/shapes`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${TOKEN}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    data: {
      shape: 'rectangle',
      content: statsText
    },
    style: {
      fillColor: '#dbeafe',
      fontFamily: 'arial',
      fontSize: '12',
      textAlign: 'center',
      textAlignVertical: 'middle',
      color: '#1e40af',
      borderColor: '#3b82f6',
      borderWidth: '3'
    },
    position: { x: 0, y: 800, origin: 'center' },
    geometry: { width: 280, height: 200 }
  })
})

console.log('✅ Statistiques ajoutées')

console.log('')
console.log('='.repeat(70))
console.log('🎉 Board Miro créé avec succès!')
console.log('')
console.log('🔗 Ouvre ce lien pour visualiser la progression:')
console.log(`   ${board.viewLink}`)
console.log('')
console.log('📊 Progression actuelle:')
console.log(`   ${completedCount}/${phases.length} phases complètes`)
phases.forEach(p => {
  console.log(`   ${p.status} Phase ${p.number}: ${p.name}`)
})
console.log('')
console.log('💡 Pour mettre à jour le board, relance ce script:')
console.log('   node scripts/sync-journal-to-miro.mjs')
console.log('')
