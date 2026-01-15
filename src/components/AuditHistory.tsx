'use client'

/**
 * Composant Audit History
 * Affiche l'historique complet des modifications pour un client
 */

import { useEffect, useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'

interface AuditEntry {
  audit_id: string
  table_name: string
  operation: 'INSERT' | 'UPDATE' | 'DELETE'
  changed_at: string
  changed_by: string | null
  old_values: Record<string, any> | null
  new_values: Record<string, any> | null
}

interface AuditHistoryProps {
  clientId: string
  limit?: number
}

export function AuditHistory({ clientId, limit = 50 }: AuditHistoryProps) {
  const [history, setHistory] = useState<AuditEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadHistory()
  }, [clientId, limit])

  async function loadHistory() {
    try {
      setLoading(true)

      const response = await fetch(`/api/audit/${clientId}`)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erreur chargement audit')
      }

      const data = await response.json()
      setHistory(data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur chargement audit')
      console.error('Erreur audit history:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">❌ {error}</p>
        <p className="text-sm text-red-600 mt-2">
          Vérifiez que SUPABASE_SERVICE_ROLE_KEY est configurée dans .env.local
        </p>
      </div>
    )
  }

  if (history.length === 0) {
    return (
      <div className="bg-gray-50 border rounded-lg p-8 text-center">
        <div className="text-4xl mb-2">📝</div>
        <p className="text-gray-600">Aucun historique de modifications</p>
        <p className="text-sm text-gray-500 mt-1">
          Les changements apparaîtront ici automatiquement
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold">Historique des modifications</h3>
        <span className="text-sm text-gray-500">{history.length} événements</span>
      </div>

      <div className="space-y-3">
        {history.map(entry => (
          <AuditEntryCard key={entry.audit_id} entry={entry} />
        ))}
      </div>
    </div>
  )
}

function AuditEntryCard({ entry }: { entry: AuditEntry }) {
  const [expanded, setExpanded] = useState(false)

  const operationColors = {
    INSERT: 'bg-green-100 text-green-800',
    UPDATE: 'bg-blue-100 text-blue-800',
    DELETE: 'bg-red-100 text-red-800'
  }

  const operationIcons = {
    INSERT: '➕',
    UPDATE: '✏️',
    DELETE: '🗑️'
  }

  // Déterminer les champs modifiés (pour UPDATE)
  const changedFields = entry.operation === 'UPDATE' && entry.old_values && entry.new_values
    ? Object.keys(entry.new_values).filter(key =>
        JSON.stringify(entry.old_values?.[key]) !== JSON.stringify(entry.new_values?.[key])
      )
    : []

  return (
    <div className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1">
          <span className="text-2xl">{operationIcons[entry.operation]}</span>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${operationColors[entry.operation]}`}>
                {entry.operation}
              </span>
              <span className="text-sm font-medium text-gray-700">{entry.table_name}</span>
            </div>
            <div className="text-sm text-gray-600">
              {entry.changed_by || 'Système'} • {formatDistanceToNow(new Date(entry.changed_at), {
                addSuffix: true,
                locale: fr
              })}
            </div>
          </div>
        </div>

        {/* Expand button */}
        {(entry.old_values || entry.new_values) && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            {expanded ? '🔼 Masquer' : '🔽 Détails'}
          </button>
        )}
      </div>

      {/* Changed fields summary (UPDATE only) */}
      {entry.operation === 'UPDATE' && changedFields.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {changedFields.map(field => (
            <span key={field} className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs">
              {field}
            </span>
          ))}
        </div>
      )}

      {/* Expanded details */}
      {expanded && (
        <div className="mt-4 space-y-3">
          {entry.operation === 'UPDATE' && changedFields.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-medium text-gray-700">Changements:</div>
              {changedFields.map(field => (
                <FieldChange
                  key={field}
                  field={field}
                  oldValue={entry.old_values?.[field]}
                  newValue={entry.new_values?.[field]}
                />
              ))}
            </div>
          )}

          {entry.operation === 'INSERT' && entry.new_values && (
            <div>
              <div className="text-xs font-medium text-gray-700 mb-2">Données créées:</div>
              <pre className="text-xs bg-gray-50 p-2 rounded overflow-x-auto">
                {JSON.stringify(entry.new_values, null, 2)}
              </pre>
            </div>
          )}

          {entry.operation === 'DELETE' && entry.old_values && (
            <div>
              <div className="text-xs font-medium text-gray-700 mb-2">Données supprimées:</div>
              <pre className="text-xs bg-gray-50 p-2 rounded overflow-x-auto">
                {JSON.stringify(entry.old_values, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function FieldChange({ field, oldValue, newValue }: {
  field: string
  oldValue: any
  newValue: any
}) {
  const formatValue = (val: any) => {
    if (val === null) return '(vide)'
    if (typeof val === 'object') return JSON.stringify(val)
    return String(val)
  }

  return (
    <div className="bg-gray-50 rounded p-2">
      <div className="text-xs font-medium text-gray-700 mb-1">{field}</div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <span className="text-gray-500">Avant:</span>
          <div className="text-red-600 font-mono">{formatValue(oldValue)}</div>
        </div>
        <div>
          <span className="text-gray-500">Après:</span>
          <div className="text-green-600 font-mono">{formatValue(newValue)}</div>
        </div>
      </div>
    </div>
  )
}

/**
 * Composant Audit Stats
 * Affiche statistiques d'audit globales
 */
export function AuditStats() {
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStats()
  }, [])

  async function loadStats() {
    try {
      const response = await fetch('/api/audit/stats')

      if (!response.ok) {
        throw new Error('Erreur chargement stats audit')
      }

      const data = await response.json()
      setStats(data)
    } catch (err) {
      console.error('Erreur audit stats:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading || !stats) return null

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <StatCard
        label="Total Événements"
        value={stats.total_events}
        icon="📝"
      />
      <StatCard
        label="Tables Tracées"
        value={stats.unique_tables}
        icon="🗄️"
      />
      <StatCard
        label="Insertions"
        value={stats.by_operation.INSERT || 0}
        icon="➕"
      />
      <StatCard
        label="Modifications"
        value={stats.by_operation.UPDATE || 0}
        icon="✏️"
      />
    </div>
  )
}

function StatCard({ label, value, icon }: {
  label: string
  value: number
  icon: string
}) {
  return (
    <div className="bg-white border rounded-lg p-4">
      <div className="text-2xl mb-2">{icon}</div>
      <div className="text-2xl font-bold">{value.toLocaleString()}</div>
      <div className="text-sm text-gray-600">{label}</div>
    </div>
  )
}
