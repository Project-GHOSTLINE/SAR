/**
 * Support Diagnostics
 * Fonctions pour capturer automatiquement les informations de diagnostic
 */

// Interface pour les infos browser
export interface BrowserInfo {
  name: string
  version: string
  userAgent: string
}

// Interface pour les infos système
export interface SystemInfo {
  platform: string
  language: string
  languages: string[]
  timezone: string
  screen: {
    width: number
    height: number
    colorDepth: number
  }
  connection?: {
    online: boolean
    effectiveType?: string
    downlink?: number
  }
}

// Interface pour les logs console
export interface ConsoleLog {
  type: 'error' | 'warn' | 'unhandledrejection'
  message: string
  timestamp: string
  filename?: string
  lineno?: number
  colno?: number
  stack?: string
  reason?: any
}

// Interface pour les tests de connexion
export interface ConnectionTests {
  supabase: boolean
  network: boolean
  timestamp: string
}

// Détecter le navigateur
export function detectBrowser(): string {
  const userAgent = navigator.userAgent

  if (userAgent.includes('Firefox/')) {
    return 'Firefox'
  } else if (userAgent.includes('Edg/')) {
    return 'Edge'
  } else if (userAgent.includes('Chrome/')) {
    return 'Chrome'
  } else if (userAgent.includes('Safari/') && !userAgent.includes('Chrome')) {
    return 'Safari'
  } else if (userAgent.includes('Opera/') || userAgent.includes('OPR/')) {
    return 'Opera'
  }

  return 'Unknown'
}

// Extraire la version du navigateur
export function extractBrowserVersion(): string {
  const userAgent = navigator.userAgent
  const browser = detectBrowser()

  let match: RegExpMatchArray | null = null

  switch (browser) {
    case 'Firefox':
      match = userAgent.match(/Firefox\/(\d+\.\d+)/)
      break
    case 'Edge':
      match = userAgent.match(/Edg\/(\d+\.\d+)/)
      break
    case 'Chrome':
      match = userAgent.match(/Chrome\/(\d+\.\d+)/)
      break
    case 'Safari':
      match = userAgent.match(/Version\/(\d+\.\d+)/)
      break
    case 'Opera':
      match = userAgent.match(/(?:Opera|OPR)\/(\d+\.\d+)/)
      break
  }

  return match ? match[1] : 'Unknown'
}

// Collecter les infos du navigateur
export function collectBrowserInfo(): BrowserInfo {
  return {
    name: detectBrowser(),
    version: extractBrowserVersion(),
    userAgent: navigator.userAgent
  }
}

// Collecter les infos système
export function collectSystemInfo(): SystemInfo {
  const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection

  return {
    platform: navigator.platform,
    language: navigator.language,
    languages: navigator.languages ? Array.from(navigator.languages) : [navigator.language],
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    screen: {
      width: window.screen.width,
      height: window.screen.height,
      colorDepth: window.screen.colorDepth
    },
    connection: connection ? {
      online: navigator.onLine,
      effectiveType: connection.effectiveType,
      downlink: connection.downlink
    } : {
      online: navigator.onLine
    }
  }
}

// Collecter l'URL de la page actuelle
export function collectPageInfo() {
  return {
    url: window.location.href,
    referrer: document.referrer,
    title: document.title,
    pathname: window.location.pathname,
    search: window.location.search,
    hash: window.location.hash
  }
}

// Variable globale pour stocker les logs console
let consoleErrors: ConsoleLog[] = []
let isConsoleMonitoring = false

// Initialiser le monitoring des erreurs console
export function initConsoleMonitoring() {
  if (isConsoleMonitoring) return

  isConsoleMonitoring = true

  // Capturer console.error
  const originalError = console.error
  console.error = (...args: any[]) => {
    consoleErrors.push({
      type: 'error',
      message: args.map(a => String(a)).join(' '),
      timestamp: new Date().toISOString(),
      stack: new Error().stack
    })

    // Garder seulement les 50 dernières erreurs
    if (consoleErrors.length > 50) {
      consoleErrors = consoleErrors.slice(-50)
    }

    originalError.apply(console, args)
  }

  // Capturer console.warn
  const originalWarn = console.warn
  console.warn = (...args: any[]) => {
    consoleErrors.push({
      type: 'warn',
      message: args.map(a => String(a)).join(' '),
      timestamp: new Date().toISOString(),
      stack: new Error().stack
    })

    // Garder seulement les 50 dernières erreurs
    if (consoleErrors.length > 50) {
      consoleErrors = consoleErrors.slice(-50)
    }

    originalWarn.apply(console, args)
  }

  // Capturer window.onerror
  window.addEventListener('error', (event) => {
    consoleErrors.push({
      type: 'error',
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      timestamp: new Date().toISOString()
    })

    // Garder seulement les 50 dernières erreurs
    if (consoleErrors.length > 50) {
      consoleErrors = consoleErrors.slice(-50)
    }
  })

  // Capturer unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    consoleErrors.push({
      type: 'unhandledrejection',
      message: 'Unhandled Promise Rejection',
      reason: event.reason,
      timestamp: new Date().toISOString()
    })

    // Garder seulement les 50 dernières erreurs
    if (consoleErrors.length > 50) {
      consoleErrors = consoleErrors.slice(-50)
    }
  })
}

// Récupérer les logs console
export function getConsoleLogs(): ConsoleLog[] {
  return [...consoleErrors]
}

// Effacer les logs console
export function clearConsoleLogs() {
  consoleErrors = []
}

// Tester la connexion aux services
export async function runConnectionTests(): Promise<ConnectionTests> {
  const tests: ConnectionTests = {
    supabase: false,
    network: navigator.onLine,
    timestamp: new Date().toISOString()
  }

  // Test Supabase (essayer de faire une requête simple)
  try {
    const res = await fetch('/api/admin/support/stats', {
      method: 'HEAD',
      credentials: 'include'
    })
    tests.supabase = res.ok || res.status === 401 // 401 signifie que Supabase fonctionne, juste pas auth
  } catch (e) {
    tests.supabase = false
  }

  return tests
}

// Collecter tous les diagnostics
export async function collectAllDiagnostics() {
  const browserInfo = collectBrowserInfo()
  const systemInfo = collectSystemInfo()
  const pageInfo = collectPageInfo()
  const consoleLogs = getConsoleLogs()
  const connectionTests = await runConnectionTests()

  return {
    browser_info: browserInfo,
    system_info: systemInfo,
    page_url: pageInfo.url,
    console_logs: consoleLogs.length > 0 ? consoleLogs : undefined,
    connection_tests: connectionTests
  }
}

// Formater les diagnostics pour affichage
export function formatDiagnosticsForDisplay(diagnostics: any): string {
  const lines: string[] = []

  if (diagnostics.browser_info) {
    lines.push(`Browser: ${diagnostics.browser_info.name} ${diagnostics.browser_info.version}`)
  }

  if (diagnostics.system_info) {
    lines.push(`OS: ${diagnostics.system_info.platform}`)
    lines.push(`Résolution: ${diagnostics.system_info.screen.width}x${diagnostics.system_info.screen.height}`)
    lines.push(`Timezone: ${diagnostics.system_info.timezone}`)
    lines.push(`Langue: ${diagnostics.system_info.language}`)
  }

  if (diagnostics.page_url) {
    lines.push(`Page: ${diagnostics.page_url}`)
  }

  if (diagnostics.console_logs && diagnostics.console_logs.length > 0) {
    lines.push(`Erreurs console: ${diagnostics.console_logs.length}`)
    diagnostics.console_logs.slice(0, 3).forEach((log: ConsoleLog) => {
      lines.push(`  - ${log.message.substring(0, 100)}`)
    })
  }

  if (diagnostics.connection_tests) {
    lines.push(`Supabase: ${diagnostics.connection_tests.supabase ? '✅' : '❌'}`)
    lines.push(`Réseau: ${diagnostics.connection_tests.network ? '✅' : '❌'}`)
  }

  return lines.join('\n')
}
