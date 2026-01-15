#!/usr/bin/env node
/**
 * 🚀 STRESS TEST ANIMÉ - SAR Performance Pipeline
 *
 * Test de charge avec animations en temps réel
 * Visualisation "wow" avec couleurs, graphiques ASCII et Miro sync
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://dllyzfuqjzuhvshrlmuq.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRsbHl6ZnVxanp1aHZzaHJsbXVxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTk5NTk4MSwiZXhwIjoyMDgxNTcxOTgxfQ.Qg5eQwDxeAtTDXplNkQZa4hOp_dSMBIu_DKbuquryFo'
const MIRO_TOKEN = 'eyJtaXJvLm9yaWdpbiI6ImV1MDEifQ_eznJ0arv-ekrq9HvsBD0W86uroY'
const MIRO_API = 'https://api.miro.com/v2'

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// 🎨 Couleurs ANSI
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m'
}

// 🎯 Routes à tester
const ROUTES = [
  { path: '/api/admin/messages', name: 'Messages', critical: true },
  { path: '/api/admin/support/tickets', name: 'Support', critical: true },
  { path: '/api/admin/analytics', name: 'Analytics', critical: false },
  { path: '/api/admin/vopay/transactions', name: 'VoPay', critical: true },
  { path: '/api/admin/clients', name: 'Clients', critical: true },
  { path: '/api/admin/loans', name: 'Loans', critical: true },
  { path: '/api/performance-diagnostic', name: 'Diagnostic', critical: false }
]

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

// ⚡ Config stress test
const CONFIG = {
  concurrent: 10,      // Requêtes parallèles
  iterations: 5,       // Nombre de vagues
  delayBetweenWaves: 1000  // ms entre vagues
}

// 📊 Résultats globaux
const results = {
  totalRequests: 0,
  successRequests: 0,
  failedRequests: 0,
  totalDuration: 0,
  routeStats: new Map()
}

/**
 * 🎨 Affichage animé du header
 */
function printHeader() {
  console.clear()
  console.log(colors.cyan + colors.bright)
  console.log('╔════════════════════════════════════════════════════════════════╗')
  console.log('║     🚀 SAR PERFORMANCE STRESS TEST - AQUEDUC VELOCITY 🚀     ║')
  console.log('╚════════════════════════════════════════════════════════════════╝')
  console.log(colors.reset)
  console.log(colors.dim + `Base URL: ${BASE_URL}`)
  console.log(`Config: ${CONFIG.concurrent} concurrent × ${CONFIG.iterations} waves`)
  console.log(`Routes: ${ROUTES.length} endpoints` + colors.reset)
  console.log('')
}

/**
 * ⚡ Test d'une route
 */
async function testRoute(route, phase = null) {
  const startTime = performance.now()
  let status = 0
  let error = null

  try {
    const response = await fetch(`${BASE_URL}${route.path}`, {
      method: 'GET',
      headers: {
        'User-Agent': 'SAR-StressTest/1.0'
      }
    })
    status = response.status
  } catch (err) {
    error = err.message
    status = 0
  }

  const endTime = performance.now()
  const durationMs = Math.round(endTime - startTime)

  // Logger dans Supabase
  if (phase) {
    await supabase.from('api_performance_logs').insert({
      route: route.path,
      method: 'GET',
      status,
      duration_ms: durationMs,
      phase,
      user_agent: 'SAR-StressTest/1.0'
    }).catch(() => {}) // Silently fail si table n'existe pas encore
  }

  return { route: route.path, name: route.name, status, durationMs, error, critical: route.critical }
}

/**
 * 🎯 Test d'une vague
 */
async function testWave(waveNumber, phase) {
  const promises = []

  for (let i = 0; i < CONFIG.concurrent; i++) {
    const route = ROUTES[Math.floor(Math.random() * ROUTES.length)]
    promises.push(testRoute(route, phase))
  }

  const waveResults = await Promise.all(promises)

  // Mettre à jour stats
  waveResults.forEach(result => {
    results.totalRequests++
    results.totalDuration += result.durationMs

    if (result.status >= 200 && result.status < 400) {
      results.successRequests++
    } else {
      results.failedRequests++
    }

    // Stats par route
    if (!results.routeStats.has(result.name)) {
      results.routeStats.set(result.name, {
        count: 0,
        totalMs: 0,
        minMs: Infinity,
        maxMs: 0,
        errors: 0
      })
    }

    const stats = results.routeStats.get(result.name)
    stats.count++
    stats.totalMs += result.durationMs
    stats.minMs = Math.min(stats.minMs, result.durationMs)
    stats.maxMs = Math.max(stats.maxMs, result.durationMs)
    if (result.status >= 400 || result.status === 0) stats.errors++
  })

  return waveResults
}

/**
 * 🎨 Afficher barre de progression animée
 */
function printProgressBar(current, total, label = '') {
  const width = 50
  const percentage = current / total
  const filled = Math.round(width * percentage)
  const empty = width - filled

  const bar = '█'.repeat(filled) + '░'.repeat(empty)
  const percent = Math.round(percentage * 100)

  let color = colors.green
  if (percent < 30) color = colors.red
  else if (percent < 70) color = colors.yellow

  process.stdout.write('\r' + color + colors.bright)
  process.stdout.write(`${label} [${bar}] ${percent}%`)
  process.stdout.write(colors.reset)
}

/**
 * 🎨 Afficher résultats d'une vague
 */
function printWaveResults(waveNumber, waveResults) {
  console.log(colors.cyan + colors.bright)
  console.log(`\n🌊 VAGUE ${waveNumber}/${CONFIG.iterations}` + colors.reset)
  console.log('─'.repeat(70))

  waveResults.forEach(result => {
    let statusColor = colors.green
    let speedEmoji = '🟢'

    if (result.status >= 400 || result.status === 0) {
      statusColor = colors.red
      speedEmoji = '🔴'
    } else if (result.durationMs > 300) {
      statusColor = colors.red
      speedEmoji = '🔴'
    } else if (result.durationMs > 150) {
      statusColor = colors.yellow
      speedEmoji = '🟠'
    } else if (result.durationMs > 50) {
      speedEmoji = '🟡'
    }

    const criticalMark = result.critical ? '⚠️ ' : '  '

    console.log(
      `${criticalMark}${speedEmoji} ${statusColor}${result.name.padEnd(15)}${colors.reset} ` +
      `${result.durationMs}ms ${colors.dim}(${result.status})${colors.reset}`
    )
  })
}

/**
 * 📊 Afficher résumé final
 */
function printFinalSummary() {
  console.log('\n' + colors.magenta + colors.bright)
  console.log('╔════════════════════════════════════════════════════════════════╗')
  console.log('║                     📊 RÉSULTATS FINAUX                        ║')
  console.log('╚════════════════════════════════════════════════════════════════╝')
  console.log(colors.reset)

  // Stats globales
  const avgMs = Math.round(results.totalDuration / results.totalRequests)
  const successRate = Math.round((results.successRequests / results.totalRequests) * 100)

  console.log(colors.bright + '🎯 STATISTIQUES GLOBALES' + colors.reset)
  console.log('─'.repeat(70))
  console.log(`Total requêtes:       ${colors.cyan}${results.totalRequests}${colors.reset}`)
  console.log(`✅ Succès:            ${colors.green}${results.successRequests}${colors.reset}`)
  console.log(`❌ Échecs:            ${colors.red}${results.failedRequests}${colors.reset}`)
  console.log(`📈 Taux de succès:    ${successRate >= 95 ? colors.green : colors.yellow}${successRate}%${colors.reset}`)
  console.log(`⚡ Temps moyen:       ${avgMs < 100 ? colors.green : colors.yellow}${avgMs}ms${colors.reset}`)
  console.log('')

  // Stats par route
  console.log(colors.bright + '🚀 PERFORMANCE PAR ROUTE' + colors.reset)
  console.log('─'.repeat(70))

  const sortedRoutes = Array.from(results.routeStats.entries())
    .sort((a, b) => (a[1].totalMs / a[1].count) - (b[1].totalMs / b[1].count))

  sortedRoutes.forEach(([name, stats]) => {
    const avgMs = Math.round(stats.totalMs / stats.count)
    let speedColor = colors.green
    let speedEmoji = '🟢'

    if (avgMs > 300) {
      speedColor = colors.red
      speedEmoji = '🔴'
    } else if (avgMs > 150) {
      speedColor = colors.yellow
      speedEmoji = '🟠'
    } else if (avgMs > 50) {
      speedEmoji = '🟡'
    }

    const errorRate = Math.round((stats.errors / stats.count) * 100)
    const errorDisplay = errorRate > 0 ? ` ${colors.red}(${errorRate}% erreurs)${colors.reset}` : ''

    console.log(
      `${speedEmoji} ${name.padEnd(15)} ${speedColor}${avgMs}ms${colors.reset} avg ` +
      `${colors.dim}(${stats.minMs}-${stats.maxMs}ms, ${stats.count} req)${colors.reset}${errorDisplay}`
    )
  })

  console.log('')

  // Recommandations
  console.log(colors.bright + '💡 RECOMMANDATIONS' + colors.reset)
  console.log('─'.repeat(70))

  const slowRoutes = sortedRoutes.filter(([_, stats]) => (stats.totalMs / stats.count) > 200)
  if (slowRoutes.length > 0) {
    console.log(colors.yellow + '⚠️  Routes lentes détectées:' + colors.reset)
    slowRoutes.forEach(([name, stats]) => {
      const avgMs = Math.round(stats.totalMs / stats.count)
      console.log(`   • ${name}: ${avgMs}ms (objectif: <200ms)`)
    })
  } else {
    console.log(colors.green + '✅ Toutes les routes sont performantes (<200ms)' + colors.reset)
  }

  if (results.failedRequests > 0) {
    console.log(colors.red + `\n❌ ${results.failedRequests} requêtes ont échoué - vérifier les logs` + colors.reset)
  }

  console.log('')
}

/**
 * 🎨 Animation de loading
 */
function animateLoading(text, duration = 2000) {
  const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']
  let i = 0
  const interval = 80

  return new Promise(resolve => {
    const timer = setInterval(() => {
      process.stdout.write(`\r${colors.cyan}${frames[i]} ${text}...${colors.reset}`)
      i = (i + 1) % frames.length
    }, interval)

    setTimeout(() => {
      clearInterval(timer)
      process.stdout.write('\r' + ' '.repeat(50) + '\r')
      resolve()
    }, duration)
  })
}

/**
 * 🚀 Lancer le stress test
 */
async function runStressTest(phase = null) {
  printHeader()

  await animateLoading('Initialisation du stress test', 1500)

  console.log(colors.green + '✅ Prêt à lancer le test!\n' + colors.reset)

  // Lancer les vagues
  for (let wave = 1; wave <= CONFIG.iterations; wave++) {
    printProgressBar(wave - 1, CONFIG.iterations, '🌊 Progression')

    const waveResults = await testWave(wave, phase)

    console.log('')
    printWaveResults(wave, waveResults)

    if (wave < CONFIG.iterations) {
      await animateLoading(`Préparation vague ${wave + 1}`, CONFIG.delayBetweenWaves)
    }
  }

  printProgressBar(CONFIG.iterations, CONFIG.iterations, '🌊 Progression')
  console.log('\n')

  await animateLoading('Analyse des résultats', 1500)

  printFinalSummary()

  return results
}

/**
 * 🎨 Créer visualisation Miro
 */
async function createMiroVisualization(results) {
  console.log(colors.cyan + '\n📊 Création de la visualisation Miro...' + colors.reset)

  // Créer board
  const boardResponse = await fetch(`${MIRO_API}/boards`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${MIRO_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: `⚡ Stress Test - ${new Date().toLocaleString('fr-CA')}`,
      description: `Résultats du stress test: ${results.totalRequests} requêtes, ${Math.round((results.successRequests/results.totalRequests)*100)}% succès`
    })
  })

  if (!boardResponse.ok) {
    console.log(colors.red + '❌ Erreur création board Miro' + colors.reset)
    return null
  }

  const board = await boardResponse.json()
  const BOARD_ID = board.id

  // Créer les shapes avec heatmap de performance
  const sortedRoutes = Array.from(results.routeStats.entries())
    .sort((a, b) => (b[1].totalMs / b[1].count) - (a[1].totalMs / a[1].count))

  let yPos = -400

  for (const [name, stats] of sortedRoutes) {
    const avgMs = Math.round(stats.totalMs / stats.count)

    let color = '#d1fae5'  // vert
    let borderColor = '#10b981'
    if (avgMs > 300) {
      color = '#fee2e2'  // rouge
      borderColor = '#ef4444'
    } else if (avgMs > 150) {
      color = '#fed7aa'  // orange
      borderColor = '#f97316'
    } else if (avgMs > 50) {
      color = '#fef3c7'  // jaune
      borderColor = '#f59e0b'
    }

    const content = `<p><strong style="font-size: 16px">${name}</strong></p><p style="font-size: 24px; color: ${borderColor}; margin-top: 4px;"><strong>${avgMs}ms</strong></p><p style="font-size: 11px; color: #6b7280; margin-top: 4px;">${stats.minMs}-${stats.maxMs}ms | ${stats.count} req</p>${stats.errors > 0 ? `<p style="font-size: 10px; color: #ef4444;">⚠️ ${stats.errors} erreurs</p>` : ''}`

    await fetch(`${MIRO_API}/boards/${BOARD_ID}/shapes`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MIRO_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        data: {
          shape: 'round_rectangle',
          content
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
        position: { x: 0, y: yPos, origin: 'center' },
        geometry: { width: 280, height: 120 }
      })
    })

    yPos += 150
  }

  console.log(colors.green + `✅ Board Miro créé: ${board.viewLink}` + colors.reset)

  return board.viewLink
}

// 🚀 LANCEMENT
console.log('')
const phase = process.argv[2] || null  // Optionnel: phase (P0, P1, etc.)

runStressTest(phase).then(async (results) => {
  // Créer visualisation Miro
  const miroLink = await createMiroVisualization(results)

  console.log(colors.magenta + colors.bright)
  console.log('╔════════════════════════════════════════════════════════════════╗')
  console.log('║                   ✅ STRESS TEST TERMINÉ!                      ║')
  console.log('╚════════════════════════════════════════════════════════════════╝')
  console.log(colors.reset)

  if (miroLink) {
    console.log(colors.cyan + '🎨 Visualisation Miro:' + colors.reset)
    console.log(`   ${miroLink}`)
    console.log('')
  }

  console.log(colors.dim + '💡 Pour relancer: node scripts/stress-test-animated.mjs [phase]' + colors.reset)
  console.log('')
}).catch(err => {
  console.error(colors.red + '❌ Erreur:', err.message + colors.reset)
  process.exit(1)
})
