'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, Search, User, Mail, Phone, MapPin, Calendar, TrendingUp,
  MessageSquare, FileText, CreditCard, HeadphonesIcon, Activity, AlertTriangle,
  CheckCircle, XCircle, Database, BarChart3
} from 'lucide-react'
import AdminNav from '@/components/admin/AdminNav'

interface UnifiedMetrics {
  client_id: string
  metrics: {
    client_name: string
    client_email: string
    client_phone: string
    client_status: string
    client_address: {
      line1: string
      city: string
      province: string
      postal_code: string
    }
    total_contact_messages: number
    total_support_tickets: number
    total_email_messages: number
    total_applications: number
    total_vopay_transactions: number
    total_sessions: number
    total_telemetry_events: number
    first_contact_date: string
    last_activity_date: string
    engagement_score: number
  }
  coherence: {
    score: number
    status: 'excellent' | 'good' | 'concerning' | 'critical'
    flags: string[]
    checks_performed: number
  }
  summary: {
    total_interactions: number
    total_transactions: number
    data_completeness: number
    profile_risk: 'high' | 'low'
  }
  data_sources: {
    client: any
    contact_messages: any[]
    applications: any[]
    vopay_transactions: any[]
    support_tickets: any[]
    email_messages: any[]
    analytics_sessions: any[]
    telemetry_events: any[]
  }
}

export default function ClientCoherencePage() {
  const router = useRouter()
  const [clientId, setClientId] = useState('')
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<UnifiedMetrics | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function fetchClientMetrics() {
    if (!clientId) {
      setError('Veuillez entrer un ID client')
      return
    }

    setLoading(true)
    setError(null)
    setData(null)

    try {
      const res = await fetch(`/api/analytics/client-unified-metrics?client_id=${clientId}`)
      const result = await res.json()

      if (!result.success) {
        setError(result.error || 'Erreur lors de la récupération des données')
        return
      }

      setData(result)
    } catch (err) {
      setError('Erreur de connexion au serveur')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const coherenceColor = data?.coherence.status === 'excellent' ? 'green' :
                          data?.coherence.status === 'good' ? 'blue' :
                          data?.coherence.status === 'concerning' ? 'orange' : 'red'

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNav currentPage="/admin/client-coherence" />

      <main className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/admin')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft size={20} />
            Retour au tableau de bord
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Vérification de Cohérence Client</h1>
            <p className="mt-2 text-gray-600">
              Merger TOUTES les données d'un client depuis toutes les sources + vérifications de cohérence globales
            </p>
          </div>
        </div>

        {/* Search Box */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Entrez l'ID client (UUID)..."
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchClientMetrics()}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <button
              onClick={fetchClientMetrics}
              disabled={loading || !clientId}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Chargement...
                </>
              ) : (
                <>
                  <Database size={20} />
                  Analyser Client
                </>
              )}
            </button>
          </div>

          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-800">
              <XCircle size={20} />
              {error}
            </div>
          )}
        </div>

        {/* Results */}
        {data && (
          <div className="space-y-6">
            {/* Client Overview */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                  <User size={24} />
                  Profil Client
                </h2>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  data.metrics.client_status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                }`}>
                  {data.metrics.client_status}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-2 text-gray-700">
                  <User size={18} className="text-gray-400" />
                  <span className="font-medium">{data.metrics.client_name}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-700">
                  <Mail size={18} className="text-gray-400" />
                  <span>{data.metrics.client_email}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-700">
                  <Phone size={18} className="text-gray-400" />
                  <span>{data.metrics.client_phone || 'N/A'}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-700">
                  <MapPin size={18} className="text-gray-400" />
                  <span>
                    {data.metrics.client_address.city}, {data.metrics.client_address.province}
                  </span>
                </div>
              </div>
            </div>

            {/* Coherence Score - BIG */}
            <div className={`bg-${coherenceColor}-50 border border-${coherenceColor}-200 rounded-lg p-8`}>
              <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Score de Cohérence Globale</h2>
                <div className="flex items-center justify-center gap-6 mb-6">
                  <div className="text-6xl font-bold" style={{
                    color: coherenceColor === 'green' ? '#10b981' :
                           coherenceColor === 'blue' ? '#3b82f6' :
                           coherenceColor === 'orange' ? '#f59e0b' : '#ef4444'
                  }}>
                    {data.coherence.score}
                  </div>
                  <div className="text-left">
                    <p className="text-sm text-gray-600">sur 100</p>
                    <p className={`text-lg font-semibold text-${coherenceColor}-700`}>
                      {data.coherence.status.toUpperCase()}
                    </p>
                    <p className="text-xs text-gray-500">{data.coherence.checks_performed} vérifications</p>
                  </div>
                </div>

                {data.coherence.flags.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <p className="font-semibold text-gray-900">⚠️ Anomalies Détectées:</p>
                    {data.coherence.flags.map((flag, i) => (
                      <div key={i} className="bg-white border border-orange-300 rounded-lg p-3 text-left">
                        <p className="text-sm text-gray-800">{flag}</p>
                      </div>
                    ))}
                  </div>
                )}

                {data.coherence.flags.length === 0 && (
                  <div className="flex items-center justify-center gap-2 text-green-700">
                    <CheckCircle size={20} />
                    <span className="font-medium">Aucune anomalie détectée - Données cohérentes</span>
                  </div>
                )}
              </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <MetricCard
                icon={<MessageSquare size={20} />}
                label="Messages Contact"
                value={data.metrics.total_contact_messages}
                color="blue"
              />
              <MetricCard
                icon={<FileText size={20} />}
                label="Applications"
                value={data.metrics.total_applications}
                color="green"
              />
              <MetricCard
                icon={<CreditCard size={20} />}
                label="Transactions VoPay"
                value={data.metrics.total_vopay_transactions}
                color="purple"
              />
              <MetricCard
                icon={<Activity size={20} />}
                label="Sessions Analytics"
                value={data.metrics.total_sessions}
                color="orange"
              />
              <MetricCard
                icon={<HeadphonesIcon size={20} />}
                label="Tickets Support"
                value={data.metrics.total_support_tickets}
                color="red"
              />
              <MetricCard
                icon={<Mail size={20} />}
                label="Emails"
                value={data.metrics.total_email_messages}
                color="blue"
              />
              <MetricCard
                icon={<BarChart3 size={20} />}
                label="Events Telemetry"
                value={data.metrics.total_telemetry_events}
                color="green"
              />
              <MetricCard
                icon={<TrendingUp size={20} />}
                label="Score Engagement"
                value={`${data.metrics.engagement_score}/100`}
                color="purple"
              />
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="font-semibold text-gray-900 mb-2">Total Interactions</h3>
                <p className="text-3xl font-bold text-blue-600">{data.summary.total_interactions}</p>
                <p className="text-xs text-gray-500 mt-1">Messages + Sessions + Applications + Tickets</p>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="font-semibold text-gray-900 mb-2">Complétude Données</h3>
                <p className="text-3xl font-bold text-green-600">{data.summary.data_completeness}%</p>
                <p className="text-xs text-gray-500 mt-1">Champs profile remplis</p>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="font-semibold text-gray-900 mb-2">Risque Profil</h3>
                <p className={`text-3xl font-bold ${data.summary.profile_risk === 'high' ? 'text-red-600' : 'text-green-600'}`}>
                  {data.summary.profile_risk === 'high' ? 'ÉLEVÉ' : 'FAIBLE'}
                </p>
                <p className="text-xs text-gray-500 mt-1">Basé sur cohérence données</p>
              </div>
            </div>

            {/* Timeline */}
            {data.metrics.first_contact_date && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Calendar size={20} />
                  Timeline
                </h3>
                <div className="flex items-center gap-8">
                  <div>
                    <p className="text-sm text-gray-600">Premier Contact</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {new Date(data.metrics.first_contact_date).toLocaleDateString('fr-CA')}
                    </p>
                  </div>
                  <div className="flex-1 h-0.5 bg-gray-300"></div>
                  <div>
                    <p className="text-sm text-gray-600">Dernière Activité</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {new Date(data.metrics.last_activity_date).toLocaleDateString('fr-CA')}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Data Sources Summary */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h3 className="font-semibold text-blue-900 mb-4">📊 Sources de Données Analysées</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-blue-700 font-medium">Contact Messages</p>
                  <p className="text-blue-900">{data.data_sources.contact_messages.length} enregistrements</p>
                </div>
                <div>
                  <p className="text-blue-700 font-medium">Applications</p>
                  <p className="text-blue-900">{data.data_sources.applications.length} enregistrements</p>
                </div>
                <div>
                  <p className="text-blue-700 font-medium">VoPay Transactions</p>
                  <p className="text-blue-900">{data.data_sources.vopay_transactions.length} enregistrements</p>
                </div>
                <div>
                  <p className="text-blue-700 font-medium">Support Tickets</p>
                  <p className="text-blue-900">{data.data_sources.support_tickets.length} enregistrements</p>
                </div>
                <div>
                  <p className="text-blue-700 font-medium">Email Messages</p>
                  <p className="text-blue-900">{data.data_sources.email_messages.length} enregistrements</p>
                </div>
                <div>
                  <p className="text-blue-700 font-medium">Analytics Sessions</p>
                  <p className="text-blue-900">{data.data_sources.analytics_sessions.length} enregistrements</p>
                </div>
                <div>
                  <p className="text-blue-700 font-medium">Telemetry Events</p>
                  <p className="text-blue-900">{data.data_sources.telemetry_events.length} enregistrements</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

interface MetricCardProps {
  icon: React.ReactNode
  label: string
  value: string | number
  color: 'blue' | 'green' | 'purple' | 'orange' | 'red'
}

function MetricCard({ icon, label, value, color }: MetricCardProps) {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    purple: 'bg-purple-100 text-purple-600',
    orange: 'bg-orange-100 text-orange-600',
    red: 'bg-red-100 text-red-600',
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center gap-3 mb-2">
        <div className={`w-10 h-10 rounded-lg ${colorClasses[color]} flex items-center justify-center`}>
          {icon}
        </div>
        <span className="text-sm text-gray-600">{label}</span>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  )
}
