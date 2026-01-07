#!/usr/bin/env node
/**
 * 🧪 TEST COMPLET DES WEBHOOKS - SAR
 * Exécute les 3 méthodes de test et génère un rapport complet
 */

import { spawn } from 'child_process'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Couleurs pour console
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  bold: '\x1b[1m',
}

function log(color, ...args) {
  console.log(color, ...args, colors.reset)
}

/**
 * Exécute un script de test
 */
function runTestScript(scriptPath) {
  return new Promise((resolve, reject) => {
    const child = spawn('node', [scriptPath], {
      stdio: 'inherit',
      env: { ...process.env }
    })

    child.on('exit', (code) => {
      if (code === 0) {
        resolve(true)
      } else {
        resolve(false)
      }
    })

    child.on('error', (error) => {
      console.error('Erreur d\'exécution:', error)
      reject(error)
    })
  })
}

/**
 * Vérifie que le serveur est accessible
 */
async function checkServerHealth() {
  try {
    const response = await fetch('http://localhost:3000/api/webhooks/vopay')
    return response.ok
  } catch (error) {
    return false
  }
}

/**
 * Affiche le banner
 */
function showBanner() {
  log(colors.cyan + colors.bold, '\n' + '═'.repeat(70))
  log(colors.cyan + colors.bold, '🧪 TEST COMPLET DES WEBHOOKS - Solution Argent Rapide')
  log(colors.cyan + colors.bold, '═'.repeat(70))
  console.log()
  log(colors.blue, '📋 3 Méthodes de Test:')
  log(colors.blue, '   1️⃣  Appels Directs avec Fetch (vérification basique)')
  log(colors.blue, '   2️⃣  Simulation de Payloads Réels (test fonctionnel)')
  log(colors.blue, '   3️⃣  Validation Sécurité & Signatures (test sécurité)')
  console.log()
}

/**
 * Programme principal
 */
async function main() {
  showBanner()

  // Vérifier que le serveur est accessible
  log(colors.yellow, '🔍 Vérification du serveur...')
  const serverUp = await checkServerHealth()

  if (!serverUp) {
    log(colors.red, '\n❌ ERREUR: Le serveur Next.js n\'est pas accessible!')
    log(colors.yellow, '\n💡 Démarrez le serveur avec:')
    log(colors.yellow, '   npm run dev')
    log(colors.yellow, '\nPuis relancez ce script.')
    process.exit(1)
  }

  log(colors.green, '✅ Serveur accessible\n')

  // Tableau des résultats
  const results = {
    method1: null,
    method2: null,
    method3: null,
  }

  const startTime = Date.now()

  // Méthode 1: Appels Directs
  try {
    log(colors.cyan, '╔═══════════════════════════════════════════════════════════════════╗')
    log(colors.cyan, '║ MÉTHODE 1: Appels Directs avec Fetch                             ║')
    log(colors.cyan, '╚═══════════════════════════════════════════════════════════════════╝')
    results.method1 = await runTestScript(join(__dirname, 'test-webhooks-method1.mjs'))
  } catch (error) {
    log(colors.red, '❌ Erreur lors de l\'exécution de la Méthode 1')
    results.method1 = false
  }

  console.log('\n')
  await new Promise(resolve => setTimeout(resolve, 1000))

  // Méthode 2: Payloads Réels
  try {
    log(colors.cyan, '╔═══════════════════════════════════════════════════════════════════╗')
    log(colors.cyan, '║ MÉTHODE 2: Simulation de Payloads Réels                          ║')
    log(colors.cyan, '╚═══════════════════════════════════════════════════════════════════╝')
    results.method2 = await runTestScript(join(__dirname, 'test-webhooks-method2.mjs'))
  } catch (error) {
    log(colors.red, '❌ Erreur lors de l\'exécution de la Méthode 2')
    results.method2 = false
  }

  console.log('\n')
  await new Promise(resolve => setTimeout(resolve, 1000))

  // Méthode 3: Sécurité
  try {
    log(colors.cyan, '╔═══════════════════════════════════════════════════════════════════╗')
    log(colors.cyan, '║ MÉTHODE 3: Validation Sécurité & Signatures                      ║')
    log(colors.cyan, '╚═══════════════════════════════════════════════════════════════════╝')
    results.method3 = await runTestScript(join(__dirname, 'test-webhooks-method3.mjs'))
  } catch (error) {
    log(colors.red, '❌ Erreur lors de l\'exécution de la Méthode 3')
    results.method3 = false
  }

  const endTime = Date.now()
  const duration = ((endTime - startTime) / 1000).toFixed(2)

  // Rapport Final
  console.log('\n')
  log(colors.cyan + colors.bold, '═'.repeat(70))
  log(colors.cyan + colors.bold, '📊 RAPPORT FINAL')
  log(colors.cyan + colors.bold, '═'.repeat(70))
  console.log()

  // Résultats par méthode
  log(colors.bold, '📋 Résultats par Méthode:')
  console.log()
  log(results.method1 ? colors.green : colors.red, `   1️⃣  Méthode 1 (Appels Directs):        ${results.method1 ? '✅ PASSÉ' : '❌ ÉCHOUÉ'}`)
  log(results.method2 ? colors.green : colors.red, `   2️⃣  Méthode 2 (Payloads Réels):        ${results.method2 ? '✅ PASSÉ' : '❌ ÉCHOUÉ'}`)
  log(results.method3 ? colors.green : colors.red, `   3️⃣  Méthode 3 (Sécurité):              ${results.method3 ? '✅ PASSÉ' : '❌ ÉCHOUÉ'}`)
  console.log()

  // Statistiques
  const totalTests = 3
  const passedTests = Object.values(results).filter(r => r).length
  const failedTests = totalTests - passedTests
  const successRate = ((passedTests / totalTests) * 100).toFixed(0)

  log(colors.bold, '📈 Statistiques:')
  console.log()
  console.log(`   Total:              ${totalTests} méthodes`)
  log(colors.green, `   Réussis:            ${passedTests} méthodes`)
  if (failedTests > 0) {
    log(colors.red, `   Échoués:            ${failedTests} méthodes`)
  }
  console.log(`   Taux de réussite:   ${successRate}%`)
  console.log(`   Durée totale:       ${duration}s`)
  console.log()

  // Webhooks testés
  log(colors.bold, '🔗 Webhooks Testés:')
  console.log()
  console.log('   ✓ /api/webhooks/vopay (VoPay - Paiements)')
  console.log('   ✓ /api/webhook/margill (Margill - CRM)')
  console.log('   ✓ /api/admin/webhooks/debug (Debug)')
  console.log()

  // Verdict final
  log(colors.cyan + colors.bold, '═'.repeat(70))
  if (passedTests === totalTests) {
    log(colors.green + colors.bold, '✅ SUCCÈS: Tous les tests sont passés!')
    log(colors.green, '\nVos webhooks sont prêts pour la production! 🚀')
  } else {
    log(colors.yellow + colors.bold, '⚠️  ATTENTION: Certains tests ont échoué')
    log(colors.yellow, '\nVeuillez vérifier les erreurs ci-dessus avant le déploiement.')
  }
  log(colors.cyan + colors.bold, '═'.repeat(70))
  console.log()

  // Actions recommandées
  log(colors.magenta, '💡 Actions Recommandées:')
  log(colors.magenta, '   1. Consulter les logs Supabase: table vopay_webhook_logs')
  log(colors.magenta, '   2. Vérifier le dashboard admin: /admin/webhooks')
  log(colors.magenta, '   3. Configurer les webhooks dans VoPay dashboard')
  log(colors.magenta, '   4. Tester avec webhook.site pour debug externe')
  console.log()

  process.exit(failedTests > 0 ? 1 : 0)
}

// Lancer les tests
main().catch(error => {
  log(colors.red, '\n❌ Erreur fatale:', error)
  process.exit(1)
})
