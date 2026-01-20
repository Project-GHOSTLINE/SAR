'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Receipt, CheckCircle, XCircle, AlertCircle, RefreshCw,
  ExternalLink, Database, Webhook, BarChart3, Settings,
  Users, FileText, DollarSign, Clock, Activity, Zap,
  Cloud, Link as LinkIcon, Power, Play, Pause
} from 'lucide-react'
import AdminNav from '@/components/admin/AdminNav'

interface EndpointStatus {
  name: string
  endpoint: string
  status: 'connected' | 'disconnected' | 'error' | 'pending'
  lastSync?: string
  recordCount?: number
  description: string
  category: 'auth' | 'sync' | 'webhook' | 'report'
}

interface QuickBooksConnection {
  connected: boolean
  companyName?: string
  realmId?: string
  lastSync?: string
  tokenExpiry?: string
}

export default function QuickBooksPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [connection, setConnection] = useState<QuickBooksConnection>({
    connected: false
  })
  const [endpoints, setEndpoints] = useState<EndpointStatus[]>([
    // AUTH ENDPOINTS
    {
      name: 'OAuth Connection',
      endpoint: '/api/quickbooks/auth/connect',
      status: 'disconnected',
      description: 'Connexion OAuth avec QuickBooks',
      category: 'auth'
    },
    {
      name: 'Token Refresh',
      endpoint: '/api/quickbooks/auth/refresh',
      status: 'disconnected',
      description: 'Rafraîchissement automatique du token',
      category: 'auth'
    },

    // SYNC ENDPOINTS
    {
      name: 'Customers',
      endpoint: '/api/quickbooks/sync/customers',
      status: 'pending',
      description: 'Synchronisation des clients',
      category: 'sync',
      recordCount: 0
    },
    {
      name: 'Invoices',
      endpoint: '/api/quickbooks/sync/invoices',
      status: 'pending',
      description: 'Synchronisation des factures',
      category: 'sync',
      recordCount: 0
    },
    {
      name: 'Payments',
      endpoint: '/api/quickbooks/sync/payments',
      status: 'pending',
      description: 'Synchronisation des paiements',
      category: 'sync',
      recordCount: 0
    },
    {
      name: 'Accounts',
      endpoint: '/api/quickbooks/sync/accounts',
      status: 'pending',
      description: 'Synchronisation du plan comptable',
      category: 'sync',
      recordCount: 0
    },
    {
      name: 'Vendors',
      endpoint: '/api/quickbooks/sync/vendors',
      status: 'pending',
      description: 'Synchronisation des fournisseurs',
      category: 'sync',
      recordCount: 0
    },
    {
      name: 'Full Sync',
      endpoint: '/api/quickbooks/sync/all',
      status: 'pending',
      description: 'Synchronisation complète de toutes les données',
      category: 'sync'
    },

    // WEBHOOK ENDPOINTS
    {
      name: 'Webhook Receiver',
      endpoint: '/api/webhooks/quickbooks',
      status: 'pending',
      description: 'Réception des événements en temps réel',
      category: 'webhook'
    },

    // REPORT ENDPOINTS
    {
      name: 'Profit & Loss',
      endpoint: '/api/quickbooks/reports/profit-loss',
      status: 'pending',
      description: 'Rapport des profits et pertes',
      category: 'report'
    },
    {
      name: 'Balance Sheet',
      endpoint: '/api/quickbooks/reports/balance-sheet',
      status: 'pending',
      description: 'Bilan comptable',
      category: 'report'
    },
    {
      name: 'Cash Flow',
      endpoint: '/api/quickbooks/reports/cash-flow',
      status: 'pending',
      description: 'Flux de trésorerie',
      category: 'report'
    },
    {
      name: 'Aged Receivables',
      endpoint: '/api/quickbooks/reports/aged-receivables',
      status: 'pending',
      description: 'Comptes clients âgés',
      category: 'report'
    }
  ])

  const [activeCategory, setActiveCategory] = useState<string>('all')

  useEffect(() => {
    checkConnection()
  }, [])

  const checkConnection = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/quickbooks/status', {
        credentials: 'include'
      })

      if (res.ok) {
        const data = await res.json()
        setConnection(data.connection || { connected: false })

        // Update endpoints status based on connection
        if (data.connection?.connected) {
          setEndpoints(prev => prev.map(ep => ({
            ...ep,
            status: ep.category === 'auth' ? 'connected' : ep.status
          })))
        }
      }
    } catch (error) {
      console.error('Error checking connection:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleConnect = async () => {
    try {
      const res = await fetch('/api/quickbooks/auth/connect', {
        credentials: 'include'
      })

      if (res.ok) {
        const data = await res.json()
        if (data.authUrl) {
          window.location.href = data.authUrl
        }
      }
    } catch (error) {
      console.error('Error connecting:', error)
    }
  }

  const handleSync = async (endpoint: string) => {
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        credentials: 'include'
      })

      if (res.ok) {
        const data = await res.json()
        // Update endpoint status
        setEndpoints(prev => prev.map(ep =>
          ep.endpoint === endpoint
            ? { ...ep, status: 'connected', lastSync: new Date().toISOString(), recordCount: data.count || 0 }
            : ep
        ))
      }
    } catch (error) {
      console.error('Error syncing:', error)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case 'disconnected':
        return <XCircle className="w-5 h-5 text-red-500" />
      case 'error':
        return <AlertCircle className="w-5 h-5 text-orange-500" />
      case 'pending':
        return <Clock className="w-5 h-5 text-gray-400" />
      default:
        return <Clock className="w-5 h-5 text-gray-400" />
    }
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'auth':
        return <Power className="w-4 h-4" />
      case 'sync':
        return <RefreshCw className="w-4 h-4" />
      case 'webhook':
        return <Webhook className="w-4 h-4" />
      case 'report':
        return <BarChart3 className="w-4 h-4" />
      default:
        return <Activity className="w-4 h-4" />
    }
  }

  const filteredEndpoints = activeCategory === 'all'
    ? endpoints
    : endpoints.filter(ep => ep.category === activeCategory)

  const categories = [
    { id: 'all', name: 'Tous', icon: Activity },
    { id: 'auth', name: 'Authentification', icon: Power },
    { id: 'sync', name: 'Synchronisation', icon: RefreshCw },
    { id: 'webhook', name: 'Webhooks', icon: Webhook },
    { id: 'report', name: 'Rapports', icon: BarChart3 }
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNav currentPage="/admin/quickbooks" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <Receipt className="w-8 h-8 text-[#10B981]" />
                QuickBooks Integration
              </h1>
              <p className="mt-2 text-sm text-gray-600">
                Gérez la connexion et la synchronisation avec QuickBooks Online
              </p>
            </div>

            <button
              onClick={checkConnection}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Actualiser
            </button>
          </div>
        </div>

        {/* Connection Status Card */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                connection.connected ? 'bg-green-100' : 'bg-gray-100'
              }`}>
                <Receipt className={`w-6 h-6 ${
                  connection.connected ? 'text-green-600' : 'text-gray-400'
                }`} />
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {connection.connected ? 'Connecté' : 'Non connecté'}
                </h3>
                {connection.companyName && (
                  <p className="text-sm text-gray-600">
                    Entreprise: {connection.companyName}
                  </p>
                )}
                {connection.lastSync && (
                  <p className="text-xs text-gray-500">
                    Dernière sync: {new Date(connection.lastSync).toLocaleString('fr-CA')}
                  </p>
                )}
              </div>
            </div>

            {!connection.connected && (
              <button
                onClick={handleConnect}
                className="flex items-center gap-2 px-6 py-3 bg-[#10B981] text-white rounded-lg hover:bg-[#0D9668] transition-colors font-medium"
              >
                <LinkIcon className="w-5 h-5" />
                Connecter QuickBooks
              </button>
            )}
          </div>
        </div>

        {/* Category Filters */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {categories.map(cat => {
            const Icon = cat.icon
            const count = cat.id === 'all'
              ? endpoints.length
              : endpoints.filter(ep => ep.category === cat.id).length

            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-colors ${
                  activeCategory === cat.id
                    ? 'bg-[#10B981] text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
                }`}
              >
                <Icon className="w-4 h-4" />
                {cat.name}
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                  activeCategory === cat.id
                    ? 'bg-white text-[#10B981]'
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  {count}
                </span>
              </button>
            )
          })}
        </div>

        {/* Endpoints Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredEndpoints.map((endpoint) => (
            <div
              key={endpoint.endpoint}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  {getCategoryIcon(endpoint.category)}
                  <h3 className="font-semibold text-gray-900">{endpoint.name}</h3>
                </div>
                {getStatusIcon(endpoint.status)}
              </div>

              <p className="text-sm text-gray-600 mb-3">
                {endpoint.description}
              </p>

              <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                <code className="bg-gray-100 px-2 py-1 rounded font-mono">
                  {endpoint.endpoint.split('/').pop()}
                </code>
                {endpoint.recordCount !== undefined && (
                  <span className="font-medium">
                    {endpoint.recordCount} records
                  </span>
                )}
              </div>

              {endpoint.lastSync && (
                <p className="text-xs text-gray-500 mb-3">
                  Dernière sync: {new Date(endpoint.lastSync).toLocaleString('fr-CA')}
                </p>
              )}

              {endpoint.category === 'sync' && connection.connected && (
                <button
                  onClick={() => handleSync(endpoint.endpoint)}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-[#10B981] text-white rounded-lg hover:bg-[#0D9668] transition-colors text-sm font-medium"
                >
                  <Play className="w-4 h-4" />
                  Synchroniser
                </button>
              )}

              {endpoint.category === 'report' && connection.connected && (
                <button
                  onClick={() => window.open(endpoint.endpoint, '_blank')}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
                >
                  <ExternalLink className="w-4 h-4" />
                  Voir le rapport
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Webhook Configuration */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <Webhook className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-blue-900 mb-2">
                Configuration Webhook QuickBooks
              </h3>
              <p className="text-sm text-blue-800 mb-3">
                Configurez cette URL dans le dashboard Intuit Developer pour recevoir les événements en temps réel:
              </p>
              <div className="bg-white rounded-lg p-3 border border-blue-300">
                <code className="text-sm font-mono text-blue-900">
                  https://admin.solutionargentrapide.ca/api/webhooks/quickbooks
                </code>
              </div>
              <a
                href="https://developer.intuit.com"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 mt-3 text-sm text-blue-700 hover:text-blue-900 font-medium"
              >
                <ExternalLink className="w-4 h-4" />
                Ouvrir Intuit Developer Dashboard
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
