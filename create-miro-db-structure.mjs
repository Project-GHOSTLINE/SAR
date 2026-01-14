#!/usr/bin/env node
/**
 * Crée une Mind Map Miro pour visualiser la structure DB complète de SAR
 * Incluant: Tables actuelles + Nouvelles tables du package + Relations
 */

const TOKEN = 'eyJtaXJvLm9yaWdpbiI6ImV1MDEifQ_eznJ0arv-ekrq9HvsBD0W86uroY'
const MIRO_API = 'https://api.miro.com/v2'

console.log('🗄️  Création Mind Map - Structure DB SAR Complète')
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
    name: `🗄️ SAR Database Structure - Actuel + Restructuration`,
    description: `Visualisation complète de la structure SAR: 26 tables existantes + nouvelles tables du package de restructuration + views timeline`,
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

// Étape 2: Créer le nœud central "SAR DATABASE"
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
      content: '<p><strong style="font-size: 32px">🗄️ SAR DATABASE</strong></p><p style="font-size: 18px">Structure Complète</p><p style="font-size: 14px">26 tables actuelles + Package restructuration</p>'
    },
    style: {
      fillColor: '#1a1a2e',
      fontFamily: 'arial',
      fontSize: '20',
      textAlign: 'center',
      textAlignVertical: 'middle',
      color: '#ffffff'
    },
    position: { x: 0, y: 0, origin: 'center' },
    geometry: { width: 500, height: 180 }
  })
})

const centerShape = await centerNode.json()
console.log('✅ Nœud central créé')
console.log('')

// Étape 3: Créer les branches principales
console.log('🌿 Création des branches principales...')

const branches = [
  {
    name: '📊 TABLES ACTUELLES',
    color: '#10b981',
    x: -1200,
    y: -400,
    tables: [
      { name: 'loan_applications', desc: 'Demandes de prêt (TITAN)', records: '~500' },
      { name: 'loan_objectives', desc: 'Objectifs business', records: '~10' },
      { name: 'cortex_rules', desc: 'Règles IA scoring', records: '~20' },
      { name: 'cortex_execution_logs', desc: 'Logs exécution Cortex', records: '~5000' },
      { name: 'client_accounts', desc: 'Comptes clients', records: '~300' },
      { name: 'client_transactions', desc: 'Ledger transactions', records: '~2000' },
      { name: 'client_analyses', desc: 'Analyses crédit', records: '~400' },
      { name: 'fraud_cases', desc: 'Cas de fraude', records: '~50' },
      { name: 'contact_messages', desc: 'Messages formulaire', records: '~800' },
      { name: 'emails_envoyes', desc: 'Emails envoyés', records: '~1500' },
      { name: 'notes_internes', desc: 'Notes internes', records: '~600' },
      { name: 'support_tickets', desc: 'Tickets support', records: '~200' },
      { name: 'support_messages', desc: 'Messages support', records: '~500' },
      { name: 'support_attachments', desc: 'Pièces jointes', records: '~100' },
      { name: 'vopay_webhook_logs', desc: 'Logs webhooks VoPay', records: '~1000' },
      { name: 'security_logs', desc: 'Logs de sécurité', records: '~3000' },
    ]
  },
  {
    name: '🆕 NOUVELLES TABLES',
    color: '#3b82f6',
    x: 1200,
    y: -400,
    tables: [
      { name: 'clients', desc: '👤 Table CANONIQUE client', records: 'NEW', highlight: true },
      { name: 'communications', desc: '💬 Communications unifiées', records: 'NEW' },
      { name: 'communication_attachments', desc: '📎 Pièces jointes comm', records: 'NEW' },
      { name: 'loans', desc: '💰 Prêts versionnés', records: 'NEW' },
      { name: 'payment_schedules', desc: '📅 Échéanciers', records: 'NEW' },
      { name: 'payment_schedule_versions', desc: '📋 Versions échéanciers', records: 'NEW' },
      { name: 'payment_events', desc: '🔔 Événements paiement', records: 'NEW' },
      { name: 'vopay_objects', desc: '🏦 VoPay normalisé', records: 'NEW' },
    ]
  },
  {
    name: '👁️ VIEWS & TIMELINE',
    color: '#f59e0b',
    x: -1200,
    y: 600,
    tables: [
      { name: 'vw_client_timeline', desc: '📜 Timeline complète client', records: 'VIEW', highlight: true },
      { name: 'vw_client_summary', desc: '📊 Résumé client', records: 'VIEW' },
      { name: 'vw_support_as_communications', desc: '🔗 Support → Communications', records: 'VIEW' },
    ]
  },
  {
    name: '🔄 PHASES MIGRATION',
    color: '#8b5cf6',
    x: 1200,
    y: 600,
    tables: [
      { name: 'Phase 0', desc: 'Préparation + Backup', records: '✅' },
      { name: 'Phase 1', desc: 'clients + client_id', records: '🔄' },
      { name: 'Phase 2', desc: 'Communications unifiées', records: '⏳' },
      { name: 'Phase 3', desc: 'Loans + Payments', records: '⏳' },
      { name: 'Phase 4', desc: 'VoPay normalisé', records: '⏳' },
      { name: 'Phase 5', desc: 'Timeline Views', records: '⏳' },
      { name: 'Phase 6', desc: 'RLS + Performance', records: '⏳' },
    ]
  }
]

const createdShapes = { center: centerShape }

for (const branch of branches) {
  console.log(`  📁 ${branch.name}`)

  // Créer le nœud de branche
  const branchNode = await fetch(`${MIRO_API}/boards/${BOARD_ID}/shapes`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      data: {
        shape: 'round_rectangle',
        content: `<p><strong style="font-size: 20px">${branch.name}</strong></p><p style="font-size: 12px">${branch.tables.length} items</p>`
      },
      style: {
        fillColor: branch.color,
        fontFamily: 'arial',
        fontSize: '16',
        textAlign: 'center',
        textAlignVertical: 'middle',
        color: '#ffffff'
      },
      position: { x: branch.x, y: branch.y, origin: 'center' },
      geometry: { width: 280, height: 100 }
    })
  })

  const branchShape = await branchNode.json()
  createdShapes[branch.name] = branchShape

  // Connecter du centre vers la branche
  await fetch(`${MIRO_API}/boards/${BOARD_ID}/connectors`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      startItem: { id: centerShape.id },
      endItem: { id: branchShape.id },
      shape: 'curved',
      style: {
        strokeColor: branch.color,
        strokeWidth: '5'
      }
    })
  })

  // Créer les tables sous cette branche
  let tableY = branch.y + 180
  for (const table of branch.tables) {
    const isHighlight = table.highlight || false
    const bgColor = isHighlight ? '#fef3c7' : '#f3f4f6'
    const borderColor = isHighlight ? '#f59e0b' : branch.color
    const borderWidth = isHighlight ? '4' : '2'

    const tableNode = await fetch(`${MIRO_API}/boards/${BOARD_ID}/shapes`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        data: {
          shape: 'rectangle',
          content: `<p><strong style="font-size: 14px">${table.name}</strong></p><p style="font-size: 11px">${table.desc}</p><p style="font-size: 10px; color: #6b7280;">Records: ${table.records}</p>`
        },
        style: {
          fillColor: bgColor,
          fontFamily: 'arial',
          fontSize: '12',
          textAlign: 'center',
          textAlignVertical: 'middle',
          color: '#1f2937',
          borderColor: borderColor,
          borderWidth: borderWidth
        },
        position: { x: branch.x, y: tableY, origin: 'center' },
        geometry: { width: 250, height: 90 }
      })
    })

    const tableShape = await tableNode.json()

    // Connecter branche vers table
    await fetch(`${MIRO_API}/boards/${BOARD_ID}/connectors`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        startItem: { id: branchShape.id },
        endItem: { id: tableShape.id },
        shape: 'elbowed',
        style: {
          strokeColor: branch.color,
          strokeWidth: '2'
        }
      })
    })

    console.log(`     ✅ ${table.name}`)
    tableY += 110
  }

  await new Promise(resolve => setTimeout(resolve, 300))
}

// Étape 4: Ajouter des relations clés (client_id)
console.log('')
console.log('🔗 Ajout des relations clés...')

// Note explicative sur client_id
const noteNode = await fetch(`${MIRO_API}/boards/${BOARD_ID}/shapes`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${TOKEN}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    data: {
      shape: 'rectangle',
      content: `<p><strong style="font-size: 16px">🔑 CLEF DE VOÛTE: client_id</strong></p><p style="font-size: 12px">Toutes les tables existantes recevront une colonne client_id qui référence clients.id</p><p style="font-size: 11px; color: #059669;">• loan_applications.client_id</p><p style="font-size: 11px; color: #059669;">• client_accounts.client_id</p><p style="font-size: 11px; color: #059669;">• contact_messages.client_id</p><p style="font-size: 11px; color: #059669;">• support_tickets.client_id</p><p style="font-size: 11px; color: #059669;">• fraud_cases → via loan_applications</p><p style="font-size: 10px; margin-top: 8px;">Match: email (prioritaire) + phone (fallback)</p>`
    },
    style: {
      fillColor: '#d1fae5',
      fontFamily: 'arial',
      fontSize: '12',
      textAlign: 'left',
      textAlignVertical: 'middle',
      color: '#065f46',
      borderColor: '#10b981',
      borderWidth: '3'
    },
    position: { x: 0, y: -600, origin: 'center' },
    geometry: { width: 400, height: 240 }
  })
})

const noteShape = await noteNode.json()
console.log('✅ Note explicative ajoutée')

// Connecter note au centre
await fetch(`${MIRO_API}/boards/${BOARD_ID}/connectors`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${TOKEN}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    startItem: { id: noteShape.id },
    endItem: { id: centerShape.id },
    shape: 'curved',
    style: {
      strokeColor: '#10b981',
      strokeWidth: '3',
      strokeStyle: 'dashed'
    }
  })
})

// Ajouter légende timeline
const timelineNote = await fetch(`${MIRO_API}/boards/${BOARD_ID}/shapes`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${TOKEN}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    data: {
      shape: 'rectangle',
      content: `<p><strong style="font-size: 14px">📜 vw_client_timeline contient:</strong></p><p style="font-size: 11px;">• Communications (tous canaux)</p><p style="font-size: 11px;">• Transactions (ledger complet)</p><p style="font-size: 11px;">• Cas de fraude</p><p style="font-size: 11px;">• Support tickets</p><p style="font-size: 10px; margin-top: 6px; color: #d97706;">→ Tout est trié par timestamp</p><p style="font-size: 10px; color: #d97706;">→ "Dossier médical" instantané</p>`
    },
    style: {
      fillColor: '#fef3c7',
      fontFamily: 'arial',
      fontSize: '11',
      textAlign: 'left',
      textAlignVertical: 'middle',
      color: '#78350f',
      borderColor: '#f59e0b',
      borderWidth: '3'
    },
    position: { x: -1200, y: 1350, origin: 'center' },
    geometry: { width: 280, height: 180 }
  })
})

console.log('✅ Légende timeline ajoutée')

// Statistiques finales
const statsNote = await fetch(`${MIRO_API}/boards/${BOARD_ID}/shapes`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${TOKEN}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    data: {
      shape: 'round_rectangle',
      content: `<p><strong style="font-size: 16px">📊 STATISTIQUES</strong></p><p style="font-size: 12px;">Tables actuelles: 26</p><p style="font-size: 12px;">Nouvelles tables: 8</p><p style="font-size: 12px;">Views: 3</p><p style="font-size: 12px;">Phases migration: 6</p><p style="font-size: 12px;">Fichiers SQL: 18</p><p style="font-size: 10px; margin-top: 8px; color: #6b7280;">Package créé: 2026-01-14</p>`
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
    position: { x: 1200, y: 1300, origin: 'center' },
    geometry: { width: 280, height: 180 }
  })
})

console.log('✅ Statistiques ajoutées')

console.log('')
console.log('=' .repeat(60))
console.log('🎉 Mind Map Structure DB créée avec succès!')
console.log('')
console.log('🔗 Ouvre ce lien:')
console.log(`   ${board.viewLink}`)
console.log('')
console.log('📊 Structure:')
console.log('   • Centre: SAR DATABASE')
console.log('   • 4 branches principales')
console.log('   • 16 tables actuelles visualisées')
console.log('   • 8 nouvelles tables du package')
console.log('   • 3 views timeline')
console.log('   • 7 phases de migration')
console.log('   • Notes explicatives sur client_id et timeline')
console.log('')
