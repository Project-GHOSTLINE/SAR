/**
 * API Route Scanner
 *
 * Scanne tous les fichiers route.ts dans src/app/api/**
 * et génère api-catalog.generated.json
 *
 * Usage:
 *   npx tsx scripts/scan-api-routes.ts
 */

import * as fs from 'fs'
import * as path from 'path'
import * as crypto from 'crypto'

interface ApiRoute {
  id: string
  path: string
  methods: string[]
  description: string
  auth: string
  inputSchema: string | null
  outputCodes: number[]
  externalCalls: string[]
  tablesTouched: string[]
  fileRef: {
    file: string
    lines: string
  }
  middleware: string[]
  rateLimit: boolean
  cors: boolean
}

interface ScanResult {
  totalRoutes: number
  scannedAt: string
  routes: ApiRoute[]
}

// Convertir chemin fichier vers chemin API
function filePathToApiPath(filePath: string): string {
  // Exemple: src/app/api/telemetry/track-event/route.ts -> /api/telemetry/track-event
  const apiDir = 'src/app/api/'
  const idx = filePath.indexOf(apiDir)
  if (idx === -1) return ''

  let apiPath = filePath.substring(idx + apiDir.length)
  // Enlever /route.ts
  apiPath = apiPath.replace(/\/route\.ts$/, '')
  // Remplacer [param] par :param
  apiPath = apiPath.replace(/\[([^\]]+)\]/g, ':$1')

  return `/api/${apiPath}`
}

// Générer un ID stable pour une route
function generateRouteId(method: string, path: string): string {
  // Exemple: POST /api/telemetry/track-event -> telemetry_track_event
  const cleanPath = path
    .replace(/^\/api\//, '') // Enlever /api/
    .replace(/\//g, '_') // Remplacer / par _
    .replace(/[:\-\[\]]/g, '_') // Remplacer caractères spéciaux
    .replace(/_+/g, '_') // Fusionner underscores multiples
    .replace(/^_|_$/g, '') // Trim underscores

  return `${method.toLowerCase()}_${cleanPath}`
}

// Extraire les méthodes HTTP du contenu
function extractMethods(content: string): string[] {
  const methods: string[] = []
  const httpMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD']

  for (const method of httpMethods) {
    // Chercher: export async function GET( ou export const GET =
    const regex1 = new RegExp(`export\\s+async\\s+function\\s+${method}\\s*\\(`, 'g')
    const regex2 = new RegExp(`export\\s+const\\s+${method}\\s*=`, 'g')

    if (regex1.test(content) || regex2.test(content)) {
      methods.push(method)
    }
  }

  return methods
}

// Extraire la description depuis les commentaires
function extractDescription(content: string): string {
  // Chercher les commentaires en haut du fichier
  const commentRegex = /\/\*\*[\s\S]*?\*\//
  const match = content.match(commentRegex)

  if (match) {
    const comment = match[0]
    // Extraire la ligne "Purpose:" ou "Description:"
    const purposeMatch = comment.match(/\*\s*(Purpose|Description):\s*(.+)/i)
    if (purposeMatch) {
      return purposeMatch[2].trim()
    }

    // Sinon, prendre la première ligne non-vide
    const lines = comment
      .replace(/\/\*\*|\*\//g, '')
      .split('\n')
      .map(l => l.replace(/^\s*\*\s?/, '').trim())
      .filter(l => l && !l.startsWith('API:') && !l.startsWith('Purpose:') && !l.startsWith('Method:') && !l.startsWith('Security:'))

    if (lines.length > 0) {
      return lines[0]
    }
  }

  return 'No description available'
}

// Extraire le type d'authentification
function extractAuth(content: string): string {
  // Chercher des patterns courants
  if (content.includes('verifyAuth()') || content.includes('await verifyAuth')) {
    return 'JWT Cookie (admin-session)'
  }
  if (content.includes('x-api-key') || content.includes('x-admin-key')) {
    return 'API Key Header'
  }
  if (content.includes('Bearer')) {
    return 'Bearer Token'
  }
  if (content.includes('getServerSession') || content.includes('getSession')) {
    return 'NextAuth Session'
  }

  // Vérifier si la route est publique
  if (content.includes('// Public') || content.includes('Public endpoint') || content.includes('no auth required')) {
    return 'Public (no auth)'
  }

  return 'Unknown / To be verified'
}

// Extraire les tables Supabase touchées
function extractTables(content: string): string[] {
  const tables = new Set<string>()

  // Pattern: .from('table_name')
  const fromRegex = /\.from\(['"]([^'"]+)['"]\)/g
  let match

  while ((match = fromRegex.exec(content)) !== null) {
    tables.add(match[1])
  }

  return Array.from(tables)
}

// Extraire les appels externes
function extractExternalCalls(content: string): string[] {
  const calls = new Set<string>()

  // Chercher fetch() vers des URLs externes
  const fetchRegex = /fetch\s*\(\s*['"`]([^'"`]+)['"`]/g
  let match

  while ((match = fetchRegex.exec(content)) !== null) {
    const url = match[1]
    // Seulement les URLs absolues
    if (url.startsWith('http://') || url.startsWith('https://')) {
      try {
        const hostname = new URL(url).hostname
        calls.add(hostname)
      } catch {
        // Ignore invalid URLs
      }
    }
  }

  // Services connus
  if (content.includes('api.resend.com')) calls.add('api.resend.com')
  if (content.includes('api.twilio.com')) calls.add('api.twilio.com')
  if (content.includes('api.vopay.com')) calls.add('api.vopay.com')
  if (content.includes('api.flinks.com') || content.includes('flinks.io')) calls.add('flinks.io')
  if (content.includes('inverite.com')) calls.add('inverite.com')
  if (content.includes('quickbooks')) calls.add('quickbooks.intuit.com')

  return Array.from(calls)
}

// Extraire les status codes de réponse
function extractOutputCodes(content: string): number[] {
  const codes = new Set<number>()

  // Pattern: { status: 200 } ou NextResponse.json(..., { status: 400 })
  const statusRegex = /status:\s*(\d{3})/g
  let match

  while ((match = statusRegex.exec(content)) !== null) {
    codes.add(parseInt(match[1]))
  }

  // Ajouter 200 par défaut si aucun status trouvé
  if (codes.size === 0) {
    codes.add(200)
  }

  return Array.from(codes).sort()
}

// Détecter CORS
function detectCors(content: string): boolean {
  return content.includes('Access-Control-Allow') || content.includes('corsHeaders')
}

// Détecter rate limiting
function detectRateLimit(content: string): boolean {
  return content.includes('rate limit') || content.includes('rateLimit') || content.includes('rateLimited')
}

// Détecter middleware
function extractMiddleware(content: string): string[] {
  const middleware: string[] = []

  if (content.includes('withPerf(')) middleware.push('Performance Tracking')
  if (content.includes('withTelemetry(')) middleware.push('Telemetry')
  if (content.includes('withAuth(')) middleware.push('Auth Guard')
  if (content.includes('export const runtime')) {
    const runtimeMatch = content.match(/export\s+const\s+runtime\s*=\s*['"]([^'"]+)['"]/)
    if (runtimeMatch) {
      middleware.push(`Runtime: ${runtimeMatch[1]}`)
    }
  }
  if (content.includes('export const dynamic')) {
    const dynamicMatch = content.match(/export\s+const\s+dynamic\s*=\s*['"]([^'"]+)['"]/)
    if (dynamicMatch) {
      middleware.push(`Dynamic: ${dynamicMatch[1]}`)
    }
  }

  return middleware
}

// Trouver tous les fichiers route.ts
function findAllRouteFiles(dir: string): string[] {
  const results: string[] = []

  function walk(currentDir: string) {
    const files = fs.readdirSync(currentDir)

    for (const file of files) {
      const fullPath = path.join(currentDir, file)
      const stat = fs.statSync(fullPath)

      if (stat.isDirectory()) {
        walk(fullPath)
      } else if (file === 'route.ts') {
        results.push(fullPath)
      }
    }
  }

  walk(dir)
  return results
}

// Scanner un fichier route.ts
function scanRoute(filePath: string): ApiRoute {
  const content = fs.readFileSync(filePath, 'utf-8')
  const apiPath = filePathToApiPath(filePath)
  const methods = extractMethods(content)

  // Générer un ID stable basé sur la première méthode (ou GET par défaut)
  const primaryMethod = methods[0] || 'GET'
  const id = generateRouteId(primaryMethod, apiPath)

  // Compter les lignes
  const lineCount = content.split('\n').length

  return {
    id,
    path: apiPath,
    methods,
    description: extractDescription(content),
    auth: extractAuth(content),
    inputSchema: null, // TODO: Zod schema extraction (phase 2)
    outputCodes: extractOutputCodes(content),
    externalCalls: extractExternalCalls(content),
    tablesTouched: extractTables(content),
    fileRef: {
      file: filePath.replace(process.cwd() + '/', ''),
      lines: `1-${lineCount}`
    },
    middleware: extractMiddleware(content),
    rateLimit: detectRateLimit(content),
    cors: detectCors(content)
  }
}

// Main
async function main() {
  console.log('🔍 Scanning API routes...\n')

  const apiDir = path.join(process.cwd(), 'src/app/api')

  if (!fs.existsSync(apiDir)) {
    console.error('❌ Directory not found:', apiDir)
    process.exit(1)
  }

  const routeFiles = findAllRouteFiles(apiDir)
  console.log(`📁 Found ${routeFiles.length} route files\n`)

  const routes: ApiRoute[] = []
  let scanned = 0

  for (const file of routeFiles) {
    try {
      const route = scanRoute(file)
      routes.push(route)
      scanned++

      // Progress
      if (scanned % 20 === 0) {
        console.log(`   Scanned ${scanned}/${routeFiles.length}...`)
      }
    } catch (error) {
      console.error(`⚠️  Error scanning ${file}:`, error)
    }
  }

  console.log(`\n✅ Successfully scanned ${routes.length} routes\n`)

  // Trier par path
  routes.sort((a, b) => a.path.localeCompare(b.path))

  // Générer le résultat
  const result: ScanResult = {
    totalRoutes: routes.length,
    scannedAt: new Date().toISOString(),
    routes
  }

  // Sauvegarder le JSON
  const outputDir = path.join(process.cwd(), 'src/app/(admin)/api-explorer')
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }

  const outputPath = path.join(outputDir, 'api-catalog.generated.json')
  fs.writeFileSync(outputPath, JSON.stringify(result, null, 2), 'utf-8')

  console.log(`📝 Catalog saved to: ${outputPath}`)

  // Stats
  console.log('\n📊 Statistics:')
  console.log(`   Total routes: ${routes.length}`)
  console.log(`   With auth: ${routes.filter(r => !r.auth.includes('Public')).length}`)
  console.log(`   Public: ${routes.filter(r => r.auth.includes('Public')).length}`)
  console.log(`   With CORS: ${routes.filter(r => r.cors).length}`)
  console.log(`   With rate limiting: ${routes.filter(r => r.rateLimit).length}`)
  console.log(`   Unique tables: ${[...new Set(routes.flatMap(r => r.tablesTouched))].length}`)
  console.log(`   External services: ${[...new Set(routes.flatMap(r => r.externalCalls))].length}`)

  // Top tables
  const tableCounts = new Map<string, number>()
  routes.forEach(r => {
    r.tablesTouched.forEach(t => {
      tableCounts.set(t, (tableCounts.get(t) || 0) + 1)
    })
  })

  const topTables = Array.from(tableCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)

  if (topTables.length > 0) {
    console.log('\n📋 Top 10 Tables:')
    topTables.forEach(([table, count]) => {
      console.log(`   ${table}: ${count} routes`)
    })
  }

  console.log('\n✨ Done!\n')
}

main().catch(console.error)
