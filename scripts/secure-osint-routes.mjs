#!/usr/bin/env node
/**
 * 🔐 Script d'Auto-Sécurisation des Routes OSINT
 * Ajoute automatiquement le middleware d'authentification à toutes les routes OSINT
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { glob } from 'glob'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')

const COLORS = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
}

const log = (color, msg) => console.log(`${COLORS[color]}${msg}${COLORS.reset}`)

// Routes OSINT à sécuriser
const OSINT_ROUTES_PATTERN = 'src/app/api/osint/**/route.ts'
const SENTINEL_ROUTES_PATTERN = 'src/app/api/sentinel/**/route.ts'

// Template du middleware à injecter
const MIDDLEWARE_IMPORT = `import { osintAuthMiddleware } from '@/middleware/osint-auth'`

const MIDDLEWARE_CHECK = `  // 🔐 Security: Check authentication
  const authError = await osintAuthMiddleware(request)
  if (authError) return authError
`

/**
 * Vérifie si le fichier a déjà le middleware
 */
function hasMiddleware(content) {
  return content.includes('osintAuthMiddleware')
}

/**
 * Ajoute l'import du middleware si absent
 */
function addImport(content) {
  if (content.includes("from '@/middleware/osint-auth'")) {
    return content
  }

  // Trouver la dernière ligne d'import
  const lines = content.split('\n')
  let lastImportIndex = -1

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim().startsWith('import ')) {
      lastImportIndex = i
    }
  }

  if (lastImportIndex === -1) {
    // Aucun import, ajouter au début
    return MIDDLEWARE_IMPORT + '\n\n' + content
  }

  // Insérer après le dernier import
  lines.splice(lastImportIndex + 1, 0, MIDDLEWARE_IMPORT)
  return lines.join('\n')
}

/**
 * Ajoute le check du middleware dans la fonction
 */
function addMiddlewareCheck(content, httpMethod) {
  const functionPattern = new RegExp(
    `(export\\s+async\\s+function\\s+${httpMethod}\\s*\\([^)]*\\)\\s*\\{)`,
    'i'
  )

  const match = content.match(functionPattern)

  if (!match) {
    log('yellow', `  ⚠️  Cannot find ${httpMethod} function`)
    return content
  }

  // Insérer le check juste après l'ouverture de la fonction
  const insertPosition = match.index + match[0].length
  const before = content.substring(0, insertPosition)
  const after = content.substring(insertPosition)

  return before + '\n' + MIDDLEWARE_CHECK + after
}

/**
 * Sécurise un fichier route
 */
function secureRoute(filePath) {
  log('blue', `\n📄 Processing: ${path.relative(projectRoot, filePath)}`)

  let content = fs.readFileSync(filePath, 'utf-8')

  // Vérifier si déjà sécurisé
  if (hasMiddleware(content)) {
    log('green', '  ✅ Already secured - skipping')
    return { secured: false, alreadySecure: true }
  }

  // Ajouter import
  content = addImport(content)
  log('cyan', '  ➕ Added import')

  // Détecter les méthodes HTTP présentes
  const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']
  let methodsSecured = []

  for (const method of methods) {
    const regex = new RegExp(`export\\s+async\\s+function\\s+${method}\\s*\\(`, 'i')
    if (regex.test(content)) {
      content = addMiddlewareCheck(content, method)
      methodsSecured.push(method)
    }
  }

  if (methodsSecured.length > 0) {
    // Backup original
    const backupPath = filePath + '.backup'
    fs.writeFileSync(backupPath, fs.readFileSync(filePath))

    // Écrire le fichier sécurisé
    fs.writeFileSync(filePath, content)

    log('green', `  ✅ Secured ${methodsSecured.join(', ')} methods`)
    log('yellow', `  💾 Backup: ${path.basename(backupPath)}`)

    return { secured: true, methods: methodsSecured, alreadySecure: false }
  } else {
    log('yellow', '  ⚠️  No HTTP methods found')
    return { secured: false, alreadySecure: false }
  }
}

/**
 * Main
 */
async function main() {
  log('cyan', '\n╔═══════════════════════════════════════════════════════════╗')
  log('cyan', '║     🔐 AUTO-SÉCURISATION DES ROUTES OSINT/SENTINEL      ║')
  log('cyan', '╚═══════════════════════════════════════════════════════════╝\n')

  // Trouver toutes les routes OSINT
  const osintFiles = glob.sync(OSINT_ROUTES_PATTERN, { cwd: projectRoot, absolute: true })
  const sentinelFiles = glob.sync(SENTINEL_ROUTES_PATTERN, { cwd: projectRoot, absolute: true })

  const allFiles = [...osintFiles, ...sentinelFiles]

  if (allFiles.length === 0) {
    log('yellow', '⚠️  No OSINT/Sentinel routes found')
    return
  }

  log('blue', `📊 Found ${allFiles.length} route files to check:\n`)
  log('blue', `   OSINT routes: ${osintFiles.length}`)
  log('blue', `   Sentinel routes: ${sentinelFiles.length}`)

  const results = {
    total: allFiles.length,
    secured: 0,
    alreadySecure: 0,
    failed: 0,
  }

  // Traiter chaque fichier
  for (const file of allFiles) {
    try {
      const result = secureRoute(file)

      if (result.secured) {
        results.secured++
      } else if (result.alreadySecure) {
        results.alreadySecure++
      } else {
        results.failed++
      }
    } catch (error) {
      log('red', `  ❌ Error: ${error.message}`)
      results.failed++
    }
  }

  // Résumé
  log('cyan', '\n═══════════════════════════════════════════════════════════')
  log('cyan', '📊 RÉSUMÉ')
  log('cyan', '═══════════════════════════════════════════════════════════\n')

  log('blue', `Total routes: ${results.total}`)
  log('green', `✅ Newly secured: ${results.secured}`)
  log('cyan', `🔐 Already secure: ${results.alreadySecure}`)
  if (results.failed > 0) {
    log('red', `❌ Failed: ${results.failed}`)
  }

  const totalSecure = results.secured + results.alreadySecure
  const percentage = Math.round((totalSecure / results.total) * 100)

  log('cyan', `\n🎯 Security coverage: ${percentage}%\n`)

  if (results.secured > 0) {
    log('yellow', '💡 IMPORTANT:')
    log('yellow', '   1. Vérifiez les changements avec: git diff')
    log('yellow', '   2. Testez chaque route modifiée')
    log('yellow', '   3. Les backups sont dans *.backup')
    log('yellow', '   4. Committez si tout fonctionne\n')

    log('cyan', '🧪 Pour tester:')
    log('blue', '   node scripts/security-test-suite.mjs\n')
  } else if (results.alreadySecure === results.total) {
    log('green', '🎉 All routes are already secured!')
  }

  log('cyan', '═══════════════════════════════════════════════════════════\n')
}

// Run
main().catch((error) => {
  log('red', `\n❌ Fatal error: ${error.message}`)
  process.exit(1)
})
