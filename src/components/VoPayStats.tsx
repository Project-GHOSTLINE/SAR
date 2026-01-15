'use client'

/**
 * Composant VoPay Statistics
 * Affiche stats détaillées VoPay pour un client ou global
 */

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

interface VoPayTransaction {
  id: string
  vopay_id: string
  object_type: string
  status: string
  amount: number
  occurred_at: string
  client_id: string | null
  loan_id: string | null
}

interface VoPayStatsProps {
  clientId?: string // Si fourni, stats pour ce client uniquement
}

export function VoPayStats({ clientId }: VoPayStatsProps) {
  const [stats, setStats] = useState<any>(null)
  const [transactions, setTransactions] = useState<VoPayTransaction[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadVoPayData()
  }, [clientId])

  async function loadVoPayData() {
    try {
      setLoading(true)

      if (clientId) {
        // Stats pour un client spécifique via API
        const response = await fetch(`/api/vopay/stats/${clientId}`)

        if (!response.ok) {
          throw new Error('Erreur chargement stats VoPay')
        }

        const { stats: clientStats, transactions: clientTransactions } = await response.json()
        setStats(clientStats)
        setTransactions(clientTransactions || [])
      } else {
        // Stats globales via API
        const response = await fetch('/api/vopay/stats')

        if (!response.ok) {
          throw new Error('Erreur chargement stats VoPay globales')
        }

        const { stats: globalStats, transactions: globalTransactions } = await response.json()
        setStats(globalStats)
        setTransactions(globalTransactions || [])
      }
    } catch (err) {
      console.error('Erreur VoPay stats:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-white border rounded-lg p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-3 gap-4">
            <div className="h-20 bg-gray-200 rounded"></div>
            <div className="h-20 bg-gray-200 rounded"></div>
            <div className="h-20 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="bg-white border rounded-lg p-6">
        <p className="text-gray-500">Aucune transaction VoPay</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Total Transactions"
          value={clientId ? stats.vopay_transaction_count : stats.total_transactions}
          icon="🏦"
          color="blue"
        />
        <StatCard
          label="Succès"
          value={clientId ? stats.successful_count : stats.successful_count}
          icon="✅"
          color="green"
        />
        <StatCard
          label="Échecs"
          value={clientId ? stats.failed_count : stats.failed_count}
          icon="❌"
          color="red"
        />
        <StatCard
          label="Montant Total"
          value={`$${(clientId ? stats.total_successful_amount : stats.total_amount).toFixed(2)}`}
          icon="💰"
          color="purple"
        />
      </div>

      {/* Success Rate */}
      {!clientId && stats.success_rate && (
        <div className="bg-white border rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Taux de succès</span>
            <span className="text-2xl font-bold text-green-600">{stats.success_rate}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-green-500 h-2 rounded-full transition-all"
              style={{ width: `${stats.success_rate}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* Recent Transactions */}
      <div className="bg-white border rounded-lg p-6">
        <h3 className="text-lg font-bold mb-4">Transactions récentes</h3>
        <div className="space-y-2">
          {transactions.length === 0 ? (
            <p className="text-gray-500 text-sm">Aucune transaction</p>
          ) : (
            transactions.map(tx => (
              <TransactionRow key={tx.id} transaction={tx} />
            ))
          )}
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, icon, color }: {
  label: string
  value: string | number
  icon: string
  color: 'blue' | 'green' | 'red' | 'purple'
}) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-900',
    green: 'bg-green-50 text-green-900',
    red: 'bg-red-50 text-red-900',
    purple: 'bg-purple-50 text-purple-900'
  }

  return (
    <div className={`rounded-lg p-4 ${colorClasses[color]}`}>
      <div className="text-2xl mb-2">{icon}</div>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-sm opacity-75">{label}</div>
    </div>
  )
}

function TransactionRow({ transaction }: { transaction: VoPayTransaction }) {
  const statusColor = transaction.status === 'successful' ? 'text-green-600'
    : transaction.status === 'failed' ? 'text-red-600'
    : 'text-yellow-600'

  const statusIcon = transaction.status === 'successful' ? '✅'
    : transaction.status === 'failed' ? '❌'
    : '⏳'

  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
      <div className="flex items-center gap-3">
        <span className="text-xl">{statusIcon}</span>
        <div>
          <div className="font-medium text-sm">{transaction.vopay_id}</div>
          <div className="text-xs text-gray-500">
            {transaction.object_type} • {new Date(transaction.occurred_at).toLocaleDateString('fr-CA')}
          </div>
        </div>
      </div>
      <div className="text-right">
        <div className="font-bold">${transaction.amount?.toFixed(2) || '0.00'}</div>
        <div className={`text-xs font-medium ${statusColor}`}>
          {transaction.status}
        </div>
      </div>
    </div>
  )
}

/**
 * Composant VoPay Orphans Alert
 * Affiche alerte si trop de transactions sans liens
 */
export function VoPayOrphansAlert() {
  const [orphanCount, setOrphanCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadOrphansCount()
  }, [])

  async function loadOrphansCount() {
    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )

      const { count } = await supabase
        .from('vw_vopay_orphans')
        .select('*', { count: 'exact', head: true })

      setOrphanCount(count || 0)
    } catch (err) {
      console.error('Erreur orphans count:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return null

  if (orphanCount === 0) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-center gap-2">
          <span className="text-xl">✅</span>
          <div>
            <div className="font-medium text-green-900">Aucun orphelin VoPay</div>
            <div className="text-sm text-green-700">Toutes les transactions sont liées</div>
          </div>
        </div>
      </div>
    )
  }

  const isWarning = orphanCount < 100
  const isCritical = orphanCount >= 100

  return (
    <div className={`border rounded-lg p-4 ${
      isCritical ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200'
    }`}>
      <div className="flex items-start gap-3">
        <span className="text-2xl">{isCritical ? '🔴' : '⚠️'}</span>
        <div className="flex-1">
          <div className={`font-bold ${isCritical ? 'text-red-900' : 'text-yellow-900'}`}>
            {orphanCount} transactions VoPay sans lien
          </div>
          <div className={`text-sm mt-1 ${isCritical ? 'text-red-700' : 'text-yellow-700'}`}>
            Ces transactions n'ont pas de client_id ou loan_id associé.
          </div>
          <button
            onClick={() => window.location.href = '/admin/vopay/orphans'}
            className={`mt-2 text-sm font-medium ${
              isCritical ? 'text-red-700 hover:text-red-900' : 'text-yellow-700 hover:text-yellow-900'
            }`}
          >
            Voir les orphelins →
          </button>
        </div>
      </div>
    </div>
  )
}
