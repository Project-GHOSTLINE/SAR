'use client'

/**
 * Page VoPay Orphelins
 * Liste et gestion des transactions VoPay sans liens
 */

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

interface VoPayOrphan {
  id: string
  vopay_id: string
  object_type: string
  status: string
  amount: number
  occurred_at: string
  payload_email: string | null
  payload_email_address: string | null
  payload_client_email: string | null
  client_reference: string | null
  payload: Record<string, any>
}

export default function VoPayOrphansPage() {
  const [orphans, setOrphans] = useState<VoPayOrphan[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    loadOrphans()
  }, [])

  async function loadOrphans() {
    try {
      setLoading(true)
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )

      const { data, error } = await supabase
        .from('vw_vopay_orphans')
        .select('*')
        .order('occurred_at', { ascending: false })

      if (error) throw error

      setOrphans(data || [])
    } catch (err) {
      console.error('Erreur chargement orphelins:', err)
    } finally {
      setLoading(false)
    }
  }

  const filteredOrphans = orphans.filter(orphan => {
    // Filter by type
    if (filter !== 'all' && orphan.object_type !== filter) return false

    // Filter by search term
    if (searchTerm) {
      const search = searchTerm.toLowerCase()
      return (
        orphan.vopay_id.toLowerCase().includes(search) ||
        orphan.payload_email?.toLowerCase().includes(search) ||
        orphan.client_reference?.toLowerCase().includes(search)
      )
    }

    return true
  })

  const uniqueTypes = Array.from(new Set(orphans.map(o => o.object_type)))

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">🔍 VoPay Orphelins</h1>
          <p className="text-gray-600 mt-2">
            Transactions sans lien client ou loan
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            label="Total Orphelins"
            value={orphans.length}
            icon="🏦"
            color="red"
          />
          <StatCard
            label="Avec Email"
            value={orphans.filter(o => o.payload_email || o.payload_email_address || o.payload_client_email).length}
            icon="📧"
            color="blue"
          />
          <StatCard
            label="Avec Référence"
            value={orphans.filter(o => o.client_reference).length}
            icon="🔖"
            color="green"
          />
          <StatCard
            label="Sans Info"
            value={orphans.filter(o => !o.payload_email && !o.client_reference).length}
            icon="❓"
            color="gray"
          />
        </div>

        {/* Filters & Search */}
        <div className="bg-white border rounded-lg p-4">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <input
                type="text"
                placeholder="Rechercher (VoPay ID, email, référence)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Type filter */}
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Tous les types ({orphans.length})</option>
              {uniqueTypes.map(type => (
                <option key={type} value={type}>
                  {type} ({orphans.filter(o => o.object_type === type).length})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Alert if many orphans */}
        {orphans.length > 100 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <span className="text-2xl">🚨</span>
              <div>
                <div className="font-bold text-red-900">Taux élevé d'orphelins</div>
                <div className="text-sm text-red-700 mt-1">
                  {orphans.length} transactions sans lien. Considérez d'ajuster les stratégies de matching.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Orphans List */}
        {filteredOrphans.length === 0 ? (
          <div className="bg-white border rounded-lg p-12 text-center">
            <div className="text-4xl mb-3">✅</div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              {searchTerm ? 'Aucun résultat' : 'Aucun orphelin'}
            </h3>
            <p className="text-gray-600">
              {searchTerm
                ? 'Essayez une autre recherche'
                : 'Toutes les transactions VoPay sont liées!'}
            </p>
          </div>
        ) : (
          <div className="bg-white border rounded-lg divide-y">
            {filteredOrphans.map(orphan => (
              <OrphanRow key={orphan.id} orphan={orphan} onRefresh={loadOrphans} />
            ))}
          </div>
        )}

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="font-medium text-blue-900 mb-2">💡 Comment résoudre les orphelins</div>
          <ul className="text-sm text-blue-800 space-y-1 ml-4 list-disc">
            <li>Vérifier si l'email dans payload correspond à un client</li>
            <li>Chercher la référence SAR-LP-XXXXX dans les loans</li>
            <li>Lier manuellement via SQL si match trouvé</li>
            <li>Ajuster les stratégies de matching dans 042_link_vopay_to_clients_loans.sql</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

function OrphanRow({ orphan, onRefresh }: { orphan: VoPayOrphan; onRefresh: () => void }) {
  const [expanded, setExpanded] = useState(false)

  const email = orphan.payload_email || orphan.payload_email_address || orphan.payload_client_email

  return (
    <div className="p-4 hover:bg-gray-50 transition">
      <div className="flex items-start justify-between gap-4">
        {/* Main info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${
              orphan.status === 'successful' ? 'bg-green-100 text-green-800'
              : orphan.status === 'failed' ? 'bg-red-100 text-red-800'
              : 'bg-yellow-100 text-yellow-800'
            }`}>
              {orphan.status}
            </span>
            <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
              {orphan.object_type}
            </span>
          </div>

          <div className="font-medium text-gray-900 mb-1">
            {orphan.vopay_id}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-gray-600">
            {email && (
              <div>
                <span className="text-gray-500">Email:</span> {email}
              </div>
            )}
            {orphan.client_reference && (
              <div>
                <span className="text-gray-500">Référence:</span> {orphan.client_reference}
              </div>
            )}
            <div>
              <span className="text-gray-500">Date:</span> {new Date(orphan.occurred_at).toLocaleDateString('fr-CA')}
            </div>
          </div>
        </div>

        {/* Amount */}
        <div className="text-right">
          <div className="text-2xl font-bold">${orphan.amount?.toFixed(2) || '0.00'}</div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-blue-600 hover:text-blue-800 mt-1"
          >
            {expanded ? '🔼 Masquer' : '🔽 Payload'}
          </button>
        </div>
      </div>

      {/* Expanded payload */}
      {expanded && (
        <div className="mt-4 p-3 bg-gray-50 rounded">
          <div className="text-xs font-medium text-gray-700 mb-2">Payload complet:</div>
          <pre className="text-xs overflow-x-auto">
            {JSON.stringify(orphan.payload, null, 2)}
          </pre>

          {/* Actions */}
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => {
                if (email) {
                  navigator.clipboard.writeText(email)
                  alert('Email copié!')
                }
              }}
              disabled={!email}
              className="px-3 py-1 bg-blue-600 text-white rounded text-xs font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              📋 Copier Email
            </button>
            <button
              onClick={() => {
                navigator.clipboard.writeText(orphan.vopay_id)
                alert('VoPay ID copié!')
              }}
              className="px-3 py-1 bg-gray-600 text-white rounded text-xs font-medium hover:bg-gray-700"
            >
              📋 Copier ID
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value, icon, color }: {
  label: string
  value: number
  icon: string
  color: 'red' | 'blue' | 'green' | 'gray'
}) {
  const colorClasses = {
    red: 'bg-red-50 text-red-900',
    blue: 'bg-blue-50 text-blue-900',
    green: 'bg-green-50 text-green-900',
    gray: 'bg-gray-50 text-gray-900'
  }

  return (
    <div className={`rounded-lg p-4 ${colorClasses[color]}`}>
      <div className="text-2xl mb-2">{icon}</div>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-sm opacity-75">{label}</div>
    </div>
  )
}
