/**
 * 🔒 Security Testing Dashboard
 * Interface pour tester tous les accès interdits
 */

'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Shield, AlertTriangle, CheckCircle, XCircle, Play, FileText } from 'lucide-react'

interface TestResult {
  name: string
  category: string
  status: 'passed' | 'failed' | 'running' | 'pending'
  details?: string
  timestamp?: string
}

const TEST_CATEGORIES = [
  {
    id: 'auth',
    name: 'Authentication',
    icon: '🔐',
    tests: [
      'Admin sans authentification',
      'Token JWT invalide',
      'Session expirée',
      'Brute force protection',
    ],
  },
  {
    id: 'sentinel',
    name: 'Sentinel Protection',
    icon: '🛡️',
    tests: [
      'Command injection',
      'Path traversal',
      'Fleet access control',
      'Execute sans auth',
    ],
  },
  {
    id: 'osint',
    name: 'OSINT Access',
    icon: '🔍',
    tests: ['Network scan', 'Advanced features', 'Bypass tests', 'Exploit chains'],
  },
  {
    id: 'injection',
    name: 'Injection Tests',
    icon: '💉',
    tests: ['SQL Injection', 'XSS', 'Command Injection', 'LDAP Injection'],
  },
  {
    id: 'ratelimit',
    name: 'Rate Limiting',
    icon: '⏱️',
    tests: ['API rate limit', 'Login attempts', 'Form submission', 'Burst protection'],
  },
]

export default function SecurityDashboard() {
  const [testResults, setTestResults] = useState<TestResult[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  const runSecurityTests = async (categoryId?: string) => {
    setIsRunning(true)
    setTestResults([])

    const categoriesToTest = categoryId
      ? TEST_CATEGORIES.filter((c) => c.id === categoryId)
      : TEST_CATEGORIES

    for (const category of categoriesToTest) {
      for (const testName of category.tests) {
        // Simulate test running
        setTestResults((prev) => [
          ...prev,
          {
            name: testName,
            category: category.name,
            status: 'running',
            timestamp: new Date().toISOString(),
          },
        ])

        await new Promise((resolve) => setTimeout(resolve, 500))

        // Simulate test result (random pour demo)
        const passed = Math.random() > 0.2
        setTestResults((prev) =>
          prev.map((r) =>
            r.name === testName && r.status === 'running'
              ? {
                  ...r,
                  status: passed ? 'passed' : 'failed',
                  details: passed ? 'Accès bloqué correctement' : 'Vulnérabilité détectée!',
                }
              : r
          )
        )
      }
    }

    setIsRunning(false)
  }

  const exportReport = () => {
    const report = {
      timestamp: new Date().toISOString(),
      results: testResults,
      summary: {
        total: testResults.length,
        passed: testResults.filter((r) => r.status === 'passed').length,
        failed: testResults.filter((r) => r.status === 'failed').length,
      },
    }

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `security-report-${Date.now()}.json`
    a.click()
  }

  const passedCount = testResults.filter((r) => r.status === 'passed').length
  const failedCount = testResults.filter((r) => r.status === 'failed').length
  const totalCount = testResults.length

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white py-12">
      <div className="container mx-auto px-4">
        {/* Header */}
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center justify-center gap-3 mb-4">
            <Shield className="w-12 h-12 text-blue-400" />
            <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              Security Testing Dashboard
            </h1>
          </div>
          <p className="text-gray-400 text-lg">
            Mode Recherche & Développement - Test des Sentinelles
          </p>
        </motion.div>

        {/* Stats */}
        {testResults.length > 0 && (
          <motion.div
            className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <div className="bg-gray-800/50 backdrop-blur rounded-xl p-6 border border-gray-700">
              <div className="flex items-center gap-3 mb-2">
                <CheckCircle className="w-6 h-6 text-green-400" />
                <span className="text-gray-400">Tests Réussis</span>
              </div>
              <p className="text-4xl font-bold text-green-400">{passedCount}</p>
            </div>

            <div className="bg-gray-800/50 backdrop-blur rounded-xl p-6 border border-gray-700">
              <div className="flex items-center gap-3 mb-2">
                <XCircle className="w-6 h-6 text-red-400" />
                <span className="text-gray-400">Vulnérabilités</span>
              </div>
              <p className="text-4xl font-bold text-red-400">{failedCount}</p>
            </div>

            <div className="bg-gray-800/50 backdrop-blur rounded-xl p-6 border border-gray-700">
              <div className="flex items-center gap-3 mb-2">
                <Shield className="w-6 h-6 text-blue-400" />
                <span className="text-gray-400">Taux de Sécurité</span>
              </div>
              <p className="text-4xl font-bold text-blue-400">
                {totalCount > 0 ? Math.round((passedCount / totalCount) * 100) : 0}%
              </p>
            </div>
          </motion.div>
        )}

        {/* Test Categories */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          {TEST_CATEGORIES.map((category) => (
            <motion.button
              key={category.id}
              onClick={() => runSecurityTests(category.id)}
              disabled={isRunning}
              className={`p-6 rounded-xl border-2 transition-all ${
                selectedCategory === category.id
                  ? 'bg-blue-500/20 border-blue-500'
                  : 'bg-gray-800/50 border-gray-700 hover:border-gray-600'
              } ${isRunning ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'}`}
              whileHover={!isRunning ? { y: -5 } : {}}
              whileTap={!isRunning ? { scale: 0.95 } : {}}
            >
              <div className="text-4xl mb-3">{category.icon}</div>
              <h3 className="font-semibold text-white mb-1">{category.name}</h3>
              <p className="text-sm text-gray-400">{category.tests.length} tests</p>
            </motion.button>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-center gap-4 mb-8">
          <motion.button
            onClick={() => runSecurityTests()}
            disabled={isRunning}
            className={`px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl font-semibold
              flex items-center gap-3 shadow-lg ${
                isRunning ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-xl'
              }`}
            whileHover={!isRunning ? { scale: 1.05 } : {}}
            whileTap={!isRunning ? { scale: 0.95 } : {}}
          >
            <Play className="w-5 h-5" />
            {isRunning ? 'Tests en cours...' : 'Lancer tous les tests'}
          </motion.button>

          {testResults.length > 0 && (
            <motion.button
              onClick={exportReport}
              className="px-8 py-4 bg-gray-700 hover:bg-gray-600 rounded-xl font-semibold
                flex items-center gap-3"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <FileText className="w-5 h-5" />
              Exporter Rapport
            </motion.button>
          )}
        </div>

        {/* Results */}
        {testResults.length > 0 && (
          <motion.div
            className="bg-gray-800/50 backdrop-blur rounded-xl border border-gray-700 overflow-hidden"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="p-6 border-b border-gray-700">
              <h2 className="text-2xl font-bold">Résultats des Tests</h2>
            </div>

            <div className="divide-y divide-gray-700">
              {testResults.map((result, index) => (
                <motion.div
                  key={`${result.name}-${index}`}
                  className="p-6 hover:bg-gray-700/30 transition-colors"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      {result.status === 'passed' && (
                        <CheckCircle className="w-6 h-6 text-green-400" />
                      )}
                      {result.status === 'failed' && (
                        <XCircle className="w-6 h-6 text-red-400" />
                      )}
                      {result.status === 'running' && (
                        <motion.div
                          className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full"
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        />
                      )}

                      <div>
                        <h3 className="font-semibold text-white">{result.name}</h3>
                        <p className="text-sm text-gray-400">{result.category}</p>
                      </div>
                    </div>

                    <div className="text-right">
                      {result.details && (
                        <p
                          className={`text-sm ${
                            result.status === 'passed' ? 'text-green-400' : 'text-red-400'
                          }`}
                        >
                          {result.details}
                        </p>
                      )}
                      {result.timestamp && (
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(result.timestamp).toLocaleTimeString()}
                        </p>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Warning */}
        <motion.div
          className="mt-8 bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-yellow-400 mt-1" />
            <div>
              <h3 className="font-semibold text-yellow-400 mb-2">
                ⚠️ Mode Développement Uniquement
              </h3>
              <p className="text-sm text-gray-300">
                Ces tests sont conçus pour identifier les vulnérabilités en environnement de
                développement. N'utilisez JAMAIS ces outils sur des systèmes en production sans
                autorisation explicite.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
