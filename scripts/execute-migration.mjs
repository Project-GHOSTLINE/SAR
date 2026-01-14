#!/usr/bin/env node
/**
 * 🚀 Script d'Exécution Migration TITAN
 * Ouvre Supabase SQL Editor et guide l'utilisateur
 */

import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { exec } from 'child_process'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Couleurs
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
  magenta: '\x1b[35m',
  bold: '\x1b[1m',
}

function log(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

async function executeMigration() {
  log('blue', '\n🚀 ════════════════════════════════════════')
  log('blue', '🚀   TITAN Migration - Exécution')
  log('blue', '🚀 ════════════════════════════════════════\n')

  // 1. Lire le fichier SQL
  const sqlPath = join(__dirname, '../database/titan-system.sql')
  let sqlContent

  try {
    sqlContent = readFileSync(sqlPath, 'utf8')
    log('green', `✅ Fichier SQL chargé (${sqlContent.length} caractères, ${sqlContent.split('\n').length} lignes)`)
  } catch (error) {
    log('red', `❌ Erreur lecture fichier: ${error.message}`)
    process.exit(1)
  }

  // 2. Extraire le project ID
  const projectId = process.env.SUPABASE_PROJECT_ID || 'dllyzfuqjzuhvshrlmuq'
  const editorUrl = `https://supabase.com/dashboard/project/${projectId}/sql/new`

  log('magenta', '\n📋 INSTRUCTIONS D\'EXÉCUTION:')
  log('blue', '─────────────────────────────────────────\n')

  log('yellow', '1️⃣  Ouvrir le SQL Editor Supabase')
  log('blue', `   URL: ${editorUrl}\n`)

  log('yellow', '2️⃣  Copier le contenu du fichier SQL')
  log('blue', `   Fichier: database/titan-system.sql`)
  log('blue', `   Lignes: ${sqlContent.split('\n').length} lignes\n`)

  log('yellow', '3️⃣  Coller dans l\'éditeur et exécuter')
  log('blue', '   Cliquer sur "Run" ou Cmd/Ctrl+Enter\n')

  log('yellow', '4️⃣  Vérifier les résultats')
  log('blue', '   - 15 tables créées')
  log('blue', '   - Fonctions et triggers installés')
  log('blue', '   - Seeds de données insérés\n')

  log('magenta', '─────────────────────────────────────────\n')

  // 3. Copier le SQL dans le clipboard (si pbcopy disponible sur macOS)
  try {
    const { platform } = process
    if (platform === 'darwin') {
      const pbcopy = exec('pbcopy')
      pbcopy.stdin.write(sqlContent)
      pbcopy.stdin.end()
      log('green', '✅ SQL copié dans le clipboard!')
      log('blue', '   Vous pouvez maintenant coller (Cmd+V) dans SQL Editor\n')
    }
  } catch (error) {
    log('yellow', '⚠️  Impossible de copier automatiquement')
    log('blue', '   Copiez manuellement depuis database/titan-system.sql\n')
  }

  // 4. Ouvrir le browser
  log('blue', '🌐 Ouverture du SQL Editor dans votre navigateur...\n')

  try {
    const { platform } = process
    const openCmd = platform === 'darwin' ? 'open' : platform === 'win32' ? 'start' : 'xdg-open'
    exec(`${openCmd} "${editorUrl}"`, (error) => {
      if (error) {
        log('yellow', '⚠️  Impossible d\'ouvrir automatiquement le navigateur')
        log('blue', `   Ouvrez manuellement: ${editorUrl}`)
      } else {
        log('green', '✅ SQL Editor ouvert dans votre navigateur!')
      }
    })
  } catch (error) {
    log('yellow', `⚠️  Erreur ouverture navigateur: ${error.message}`)
  }

  log('magenta', '\n📝 APRÈS L\'EXÉCUTION:')
  log('blue', '─────────────────────────────────────────\n')
  log('blue', '   Exécutez: node scripts/test-titan-system.mjs')
  log('blue', '   Pour vérifier que tout fonctionne\n')

  log('blue', '════════════════════════════════════════\n')
}

// Exécuter
executeMigration().catch((error) => {
  log('red', `\n❌ Erreur fatale: ${error.message}`)
  process.exit(1)
})
