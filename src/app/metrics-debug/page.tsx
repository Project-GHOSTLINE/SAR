'use client'

/**
 * Page Métriques DEBUG - Version simplifiée
 */

import { useEffect, useState } from 'react'

export default function MetricsDebugPage() {
  const [metrics, setMetrics] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadMetrics()
  }, [])

  async function loadMetrics() {
    try {
      console.log('🔄 Chargement métriques...')
      setLoading(true)
      setError(null)

      const response = await fetch('/api/metrics/all')
      console.log('📡 Response status:', response.status)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const data = await response.json()
      console.log('✅ Data received:', data)

      setMetrics(data)
    } catch (err: any) {
      console.error('❌ Erreur:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold mb-4">🔄 Chargement...</h1>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-red-600 mb-4">❌ Erreur</h1>
          <div className="bg-red-50 border border-red-200 rounded p-4">
            <pre className="text-sm">{error}</pre>
          </div>
          <button
            onClick={loadMetrics}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            🔄 Réessayer
          </button>
        </div>
      </div>
    )
  }

  if (!metrics) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-orange-600 mb-4">⚠️ Aucune donnée</h1>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold text-gray-900">📊 Métriques DEBUG</h1>

        {/* Tables */}
        <div className="bg-white border rounded-lg p-6">
          <h2 className="text-xl font-bold mb-4">📁 Tables</h2>
          <div className="grid grid-cols-3 gap-4">
            {Object.entries(metrics.tables).map(([table, count]: [string, any]) => (
              <div
                key={table}
                className={`p-4 rounded border-2 ${
                  count > 0 ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
                }`}
              >
                <div className={`text-3xl font-bold ${
                  count > 0 ? 'text-green-900' : 'text-gray-400'
                }`}>
                  {count}
                </div>
                <div className="text-sm text-gray-700">{table}</div>
              </div>
            ))}
          </div>
        </div>

        {/* VoPay Breakdowns */}
        <div className="bg-white border rounded-lg p-6">
          <h2 className="text-xl font-bold mb-4">🏦 VoPay par Status</h2>
          <div className="grid grid-cols-4 gap-4">
            {Object.entries(metrics.breakdowns.vopay_by_status).map(([status, count]: [string, any]) => (
              <div
                key={status}
                className={`p-4 rounded border ${
                  count > 0 ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'
                }`}
              >
                <div className={`text-2xl font-bold ${
                  count > 0 ? 'text-blue-900' : 'text-gray-400'
                }`}>
                  {count}
                </div>
                <div className="text-xs text-gray-700">{status}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Raw JSON */}
        <div className="bg-white border rounded-lg p-6">
          <h2 className="text-xl font-bold mb-4">🔍 JSON Brut</h2>
          <pre className="text-xs bg-gray-50 p-4 rounded overflow-x-auto">
            {JSON.stringify(metrics, null, 2)}
          </pre>
        </div>

        {/* Actions */}
        <div className="flex gap-4">
          <button
            onClick={loadMetrics}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            🔄 Rafraîchir
          </button>
          <button
            onClick={() => window.location.href = '/metrics'}
            className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
          >
            ← Retour version complète
          </button>
        </div>
      </div>
    </div>
  )
}
