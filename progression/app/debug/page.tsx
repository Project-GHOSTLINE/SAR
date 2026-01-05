'use client'

import { useEffect, useState } from 'react'
import { RefreshCw, AlertCircle, CheckCircle, XCircle, Clock, Database, Webhook, Link as LinkIcon, MessageSquare, Activity } from 'lucide-react'

interface Application {
  id: string
  origin: string
  name: string
  email: string
  phone: string
  amount_cents: number
  status: string
  created_at: string
  status_updated_at: string
}

interface Event {
  id: string
  application_id: string
  type: string
  payload: any
  created_at: string
}

interface MagicLink {
  id: string
  application_id: string
  expires_at: string
  uses: number
  max_uses: number
  created_at: string
  last_used_at: string
  revoked_at: string | null
}

interface Note {
  id: string
  application_id: string
  message: string
  created_at: string
}

interface Stats {
  total_applications: number
  total_events: number
  total_magic_links: number
  active_magic_links: number
  applications_by_status: Record<string, number>
  applications_by_origin: Record<string, number>
}

export default function DebugPage() {
  const [apiKey, setApiKey] = useState('')
  const [authenticated, setAuthenticated] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [applications, setApplications] = useState<Application[]>([])
  const [events, setEvents] = useState<Event[]>([])
  const [magicLinks, setMagicLinks] = useState<MagicLink[]>([])
  const [notes, setNotes] = useState<Note[]>([])
  const [stats, setStats] = useState<Stats | null>(null)

  const [activeTab, setActiveTab] = useState<'overview' | 'applications' | 'events' | 'links' | 'notes'>('overview')

  const fetchData = async () => {
    if (!apiKey) return

    setLoading(true)
    setError(null)

    try {
      // Fetch all data in parallel
      const [appsRes, eventsRes, linksRes, notesRes] = await Promise.all([
        fetch('/api/debug/applications', { headers: { 'x-api-key': apiKey } }),
        fetch('/api/debug/events', { headers: { 'x-api-key': apiKey } }),
        fetch('/api/debug/magic-links', { headers: { 'x-api-key': apiKey } }),
        fetch('/api/debug/notes', { headers: { 'x-api-key': apiKey } }),
      ])

      if (!appsRes.ok || !eventsRes.ok || !linksRes.ok || !notesRes.ok) {
        throw new Error('Non autorisé')
      }

      const appsData = await appsRes.json()
      const eventsData = await eventsRes.json()
      const linksData = await linksRes.json()
      const notesData = await notesRes.json()

      setApplications(appsData.data || [])
      setEvents(eventsData.data || [])
      setMagicLinks(linksData.data || [])
      setNotes(notesData.data || [])

      // Calculate stats
      const apps = appsData.data || []
      const evts = eventsData.data || []
      const lnks = linksData.data || []

      const statusCounts: Record<string, number> = {}
      const originCounts: Record<string, number> = {}

      apps.forEach((app: Application) => {
        statusCounts[app.status] = (statusCounts[app.status] || 0) + 1
        originCounts[app.origin || 'Unknown'] = (originCounts[app.origin || 'Unknown'] || 0) + 1
      })

      const activeLinks = lnks.filter((link: MagicLink) =>
        new Date(link.expires_at) > new Date() &&
        !link.revoked_at &&
        link.uses < link.max_uses
      )

      setStats({
        total_applications: apps.length,
        total_events: evts.length,
        total_magic_links: lnks.length,
        active_magic_links: activeLinks.length,
        applications_by_status: statusCounts,
        applications_by_origin: originCounts,
      })

      setAuthenticated(true)
    } catch (err) {
      setError('Erreur lors du chargement des données. Vérifiez la clé API.')
      setAuthenticated(false)
    } finally {
      setLoading(false)
    }
  }

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    fetchData()
  }

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
          <div className="flex items-center gap-3 mb-6">
            <Database className="w-8 h-8 text-indigo-600" />
            <h1 className="text-2xl font-bold text-slate-900">Debug Dashboard</h1>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Clé API Admin
              </label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="Entrez la clé API..."
                required
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                <AlertCircle className="w-4 h-4" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? 'Chargement...' : 'Accéder au Dashboard'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-900 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Activity className="w-8 h-8 text-indigo-600" />
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Dashboard Debug API</h1>
                <p className="text-sm text-slate-600">Monitoring en temps réel</p>
              </div>
            </div>
            <button
              onClick={fetchData}
              disabled={loading}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Rafraîchir
            </button>
          </div>
        </div>

        {/* Stats Overview */}
        {stats && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center gap-3 mb-2">
                <Database className="w-6 h-6 text-blue-600" />
                <h3 className="font-semibold text-slate-700">Applications</h3>
              </div>
              <p className="text-3xl font-bold text-slate-900">{stats.total_applications}</p>
              <p className="text-sm text-slate-600 mt-1">Dossiers créés</p>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center gap-3 mb-2">
                <Webhook className="w-6 h-6 text-purple-600" />
                <h3 className="font-semibold text-slate-700">Événements</h3>
              </div>
              <p className="text-3xl font-bold text-slate-900">{stats.total_events}</p>
              <p className="text-sm text-slate-600 mt-1">Webhooks reçus</p>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center gap-3 mb-2">
                <LinkIcon className="w-6 h-6 text-green-600" />
                <h3 className="font-semibold text-slate-700">Magic Links</h3>
              </div>
              <p className="text-3xl font-bold text-slate-900">{stats.active_magic_links}</p>
              <p className="text-sm text-slate-600 mt-1">Actifs sur {stats.total_magic_links}</p>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center gap-3 mb-2">
                <MessageSquare className="w-6 h-6 text-orange-600" />
                <h3 className="font-semibold text-slate-700">Notes</h3>
              </div>
              <p className="text-3xl font-bold text-slate-900">{notes.length}</p>
              <p className="text-sm text-slate-600 mt-1">Messages clients</p>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="flex border-b border-slate-200 overflow-x-auto">
            {[
              { key: 'overview', label: 'Vue d\'ensemble', icon: Activity },
              { key: 'applications', label: 'Applications', icon: Database },
              { key: 'events', label: 'Événements', icon: Webhook },
              { key: 'links', label: 'Magic Links', icon: LinkIcon },
              { key: 'notes', label: 'Notes', icon: MessageSquare },
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key as any)}
                className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors whitespace-nowrap ${
                  activeTab === key
                    ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>

          <div className="p-6">
            {/* Overview Tab */}
            {activeTab === 'overview' && stats && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">Par Statut</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {Object.entries(stats.applications_by_status).map(([status, count]) => (
                      <div key={status} className="bg-slate-50 rounded-lg p-4">
                        <p className="text-sm font-medium text-slate-600">{status}</p>
                        <p className="text-2xl font-bold text-slate-900">{count}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">Par Origine</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {Object.entries(stats.applications_by_origin).map(([origin, count]) => (
                      <div key={origin} className="bg-slate-50 rounded-lg p-4">
                        <p className="text-sm font-medium text-slate-600">{origin}</p>
                        <p className="text-2xl font-bold text-slate-900">{count}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Applications Tab */}
            {activeTab === 'applications' && (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">ID</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Client</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Email</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Montant</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Statut</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Origine</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Créé</th>
                    </tr>
                  </thead>
                  <tbody>
                    {applications.map((app) => (
                      <tr key={app.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="py-3 px-4 text-sm font-mono text-slate-900">{app.id}</td>
                        <td className="py-3 px-4 text-sm text-slate-900">{app.name || '-'}</td>
                        <td className="py-3 px-4 text-sm text-slate-600">{app.email || '-'}</td>
                        <td className="py-3 px-4 text-sm font-medium text-slate-900">
                          {app.amount_cents ? `${(app.amount_cents / 100).toFixed(2)} $` : '-'}
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700">
                            {app.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm text-slate-600">{app.origin}</td>
                        <td className="py-3 px-4 text-sm text-slate-600">
                          {new Date(app.created_at).toLocaleDateString('fr-CA')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {applications.length === 0 && (
                  <p className="text-center py-8 text-slate-500">Aucune application</p>
                )}
              </div>
            )}

            {/* Events Tab */}
            {activeTab === 'events' && (
              <div className="space-y-3">
                {events.map((event) => (
                  <div key={event.id} className="bg-slate-50 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Webhook className="w-4 h-4 text-purple-600" />
                        <span className="font-medium text-slate-900">{event.type}</span>
                      </div>
                      <span className="text-xs text-slate-500">
                        {new Date(event.created_at).toLocaleString('fr-CA')}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 mb-2">Application: {event.application_id}</p>
                    <pre className="text-xs bg-white p-3 rounded border border-slate-200 overflow-x-auto">
                      {JSON.stringify(event.payload, null, 2)}
                    </pre>
                  </div>
                ))}
                {events.length === 0 && (
                  <p className="text-center py-8 text-slate-500">Aucun événement</p>
                )}
              </div>
            )}

            {/* Magic Links Tab */}
            {activeTab === 'links' && (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Application</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Utilisations</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Expiration</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Statut</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Créé</th>
                    </tr>
                  </thead>
                  <tbody>
                    {magicLinks.map((link) => {
                      const isExpired = new Date(link.expires_at) < new Date()
                      const isRevoked = !!link.revoked_at
                      const isMaxed = link.uses >= link.max_uses
                      const isActive = !isExpired && !isRevoked && !isMaxed

                      return (
                        <tr key={link.id} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="py-3 px-4 text-sm font-mono text-slate-900">{link.application_id}</td>
                          <td className="py-3 px-4 text-sm text-slate-900">
                            {link.uses} / {link.max_uses}
                          </td>
                          <td className="py-3 px-4 text-sm text-slate-600">
                            {new Date(link.expires_at).toLocaleString('fr-CA')}
                          </td>
                          <td className="py-3 px-4">
                            {isActive && (
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                                <CheckCircle className="w-3 h-3" />
                                Actif
                              </span>
                            )}
                            {isExpired && (
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                                <Clock className="w-3 h-3" />
                                Expiré
                              </span>
                            )}
                            {isRevoked && (
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                                <XCircle className="w-3 h-3" />
                                Révoqué
                              </span>
                            )}
                            {isMaxed && !isExpired && !isRevoked && (
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
                                <AlertCircle className="w-3 h-3" />
                                Max atteint
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-sm text-slate-600">
                            {new Date(link.created_at).toLocaleDateString('fr-CA')}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                {magicLinks.length === 0 && (
                  <p className="text-center py-8 text-slate-500">Aucun magic link</p>
                )}
              </div>
            )}

            {/* Notes Tab */}
            {activeTab === 'notes' && (
              <div className="space-y-3">
                {notes.map((note) => (
                  <div key={note.id} className="bg-slate-50 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <span className="text-sm font-medium text-slate-900">
                        Application: {note.application_id}
                      </span>
                      <span className="text-xs text-slate-500">
                        {new Date(note.created_at).toLocaleString('fr-CA')}
                      </span>
                    </div>
                    <p className="text-sm text-slate-700">{note.message}</p>
                  </div>
                ))}
                {notes.length === 0 && (
                  <p className="text-center py-8 text-slate-500">Aucune note</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
