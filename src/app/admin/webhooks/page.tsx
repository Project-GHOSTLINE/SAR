'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  RefreshCw, AlertTriangle, CheckCircle, XCircle, Clock,
  Send, Mail, ChevronLeft, Loader2, Filter, Calendar
} from 'lucide-react'
import AdminNav from '@/components/admin/AdminNav'

interface VoPayWebhook {
  id: string
  transaction_id: string
  transaction_type: string
  transaction_amount: number
  currency: string
  status: string
  failure_reason: string | null
  environment: string
  is_validated: boolean
  received_at: string
  updated_at: string
  raw_payload: any
}

const STATUS_COLORS = {
  successful: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
  pending: 'bg-yellow-100 text-yellow-800',
  'in progress': 'bg-blue-100 text-blue-800',
  cancelled: 'bg-gray-100 text-gray-800'
}

const STATUS_ICONS = {
  successful: CheckCircle,
  failed: XCircle,
  pending: Clock,
  'in progress': RefreshCw,
  cancelled: XCircle
}

export default function WebhooksPage() {
  const router = useRouter()
  const [webhooks, setWebhooks] = useState<VoPayWebhook[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')
  const [sending, setSending] = useState<string | null>(null)

  useEffect(() => {
    fetchWebhooks()
  }, [])

  const fetchWebhooks = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/webhooks/list', {
        cache: 'no-store'
      })
      if (!response.ok) {
        console.error('Failed to fetch webhooks:', response.status)
        setWebhooks([])
        return
      }
      const data = await response.json()
      setWebhooks(Array.isArray(data.webhooks) ? data.webhooks : [])
    } catch (error) {
      console.error('Error fetching webhooks:', error)
      setWebhooks([])
    } finally {
      setLoading(false)
    }
  }

  const sendFailedAlert = async (webhook: VoPayWebhook) => {
    if (!confirm(`Envoyer une alerte email pour la transaction ${webhook.transaction_id}?`)) {
      return
    }

    try {
      setSending(webhook.id)
      const response = await fetch('/api/admin/webhooks/send-alert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ webhookId: webhook.id })
      })

      if (!response.ok) throw new Error('Failed to send alert')

      alert('Email envoyé avec succès!')
    } catch (error) {
      console.error('Error sending alert:', error)
      alert('Erreur lors de l\'envoi de l\'email')
    } finally {
      setSending(null)
    }
  }

  const filteredWebhooks = webhooks.filter(w => {
    if (filter === 'all') return true
    return w.status === filter
  })

  const stats = {
    total: webhooks.length,
    successful: webhooks.filter(w => w.status === 'successful').length,
    failed: webhooks.filter(w => w.status === 'failed').length,
    pending: webhooks.filter(w => w.status === 'pending' || w.status === 'in progress').length
  }

  if (loading) {
    return (
      <>
        <AdminNav currentPage="/admin/webhooks" />
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
        </div>
      </>
    )
  }

  return (
    <>
      <AdminNav currentPage="/admin/webhooks" />
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b">
          <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
              <div>
                <h1 className="text-4xl font-bold text-gray-900">Webhooks VoPay</h1>
                <p className="text-base text-gray-500">Gestion des notifications de transaction</p>
              </div>
            </div>
            <button
              onClick={fetchWebhooks}
              className="flex items-center gap-3 px-5 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <RefreshCw className="w-5 h-5" />
              Actualiser
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-8">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-base text-gray-500">Total</p>
                <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <Calendar className="w-10 h-10 text-gray-400" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-8">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-base text-gray-500">Réussies</p>
                <p className="text-3xl font-bold text-green-600">{stats.successful}</p>
              </div>
              <CheckCircle className="w-10 h-10 text-green-400" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-8">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-base text-gray-500">Échouées</p>
                <p className="text-3xl font-bold text-red-600">{stats.failed}</p>
              </div>
              <XCircle className="w-10 h-10 text-red-400" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-8">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-base text-gray-500">En attente</p>
                <p className="text-3xl font-bold text-yellow-600">{stats.pending}</p>
              </div>
              <Clock className="w-10 h-10 text-yellow-400" />
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow mb-8">
          <div className="p-6 border-b">
            <div className="flex items-center gap-3 text-base">
              <Filter className="w-5 h-5 text-gray-400" />
              <span className="text-gray-500">Filtrer par statut:</span>
              <div className="flex gap-3 flex-wrap">
                {['all', 'successful', 'failed', 'pending', 'in progress', 'cancelled'].map((status) => (
                  <button
                    key={status}
                    onClick={() => setFilter(status)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                      filter === status
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {status === 'all' ? 'Tous' : status}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">
                    Transaction
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">
                    Montant
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">
                    Statut
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredWebhooks.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-base text-gray-500">
                      Aucun webhook trouvé
                    </td>
                  </tr>
                ) : (
                  filteredWebhooks.map((webhook) => {
                    const StatusIcon = STATUS_ICONS[webhook.status as keyof typeof STATUS_ICONS] || Clock
                    return (
                      <tr key={webhook.id} className="hover:bg-gray-50">
                        <td className="px-6 py-6 whitespace-nowrap">
                          <div className="text-base font-medium text-gray-900">
                            {webhook.transaction_id}
                          </div>
                          <div className="text-sm text-gray-500">{webhook.environment}</div>
                        </td>
                        <td className="px-6 py-6 whitespace-nowrap">
                          <div className="text-base text-gray-900">{webhook.transaction_type}</div>
                        </td>
                        <td className="px-6 py-6 whitespace-nowrap">
                          <div className="text-base font-medium text-gray-900">
                            {webhook.transaction_amount.toFixed(2)} {webhook.currency}
                          </div>
                        </td>
                        <td className="px-6 py-6 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ${
                              STATUS_COLORS[webhook.status as keyof typeof STATUS_COLORS] || 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            <StatusIcon className="w-4 h-4" />
                            {webhook.status}
                          </span>
                          {webhook.failure_reason && (
                            <div className="mt-2 text-sm text-red-600">
                              {webhook.failure_reason}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-6 whitespace-nowrap">
                          <div className="text-base text-gray-900">
                            {new Date(webhook.received_at).toLocaleDateString('fr-CA')}
                          </div>
                          <div className="text-sm text-gray-500">
                            {new Date(webhook.received_at).toLocaleTimeString('fr-CA')}
                          </div>
                        </td>
                        <td className="px-6 py-6 whitespace-nowrap text-base">
                          {webhook.status === 'failed' && (
                            <button
                              onClick={() => sendFailedAlert(webhook)}
                              disabled={sending === webhook.id}
                              className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {sending === webhook.id ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                              ) : (
                                <Mail className="w-5 h-5" />
                              )}
                              Envoyer Alerte
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
    </>
  )
}
