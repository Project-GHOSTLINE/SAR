'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  LogOut, TrendingUp, TrendingDown, Users, FileText,
  AlertTriangle, RefreshCw, Activity, Bell, Mail,
  Phone, ChevronRight, MoreHorizontal, Search, Loader2,
  DollarSign, Calendar, Clock, CheckCircle, XCircle,
  X, User, Send, MessageSquare, Tag, ExternalLink
} from 'lucide-react'

interface Message {
  id: string
  nom: string
  email: string
  telephone: string
  question: string
  date: string
  lu: boolean
  status: string
  reference: string
  client_ip?: string
  client_user_agent?: string
  client_device?: string
  client_browser?: string
  client_os?: string
  client_timezone?: string
  client_language?: string
  client_screen_resolution?: string
  referrer?: string
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
}

interface EmailLog {
  id: string
  messageId: string
  type: string
  to: string
  subject: string
  content: string
  sentBy: string
  date: string
}

interface NoteLog {
  id: string
  messageId: string
  from: string
  to: string
  content: string
  date: string
}

interface WebhookStats {
  total: number
  totalSuccessful: number
  totalFailed: number
  totalPending: number
  totalCancelled: number
  weekTotal: number
  weekSuccessful: number
  weekFailed: number
  weekPending: number
  weekSuccessRate: number
  monthTotal: number
  monthSuccessRate: number
  todayVolume: number
  yesterdayVolume: number
  weekVolume: number
  monthVolume: number
  volumeChange: number
  recentTransactions: any[]
  failedTransactions: any[]
  failedCount: number
  dailyStats: any[]
}

interface RecentTransaction {
  id: string
  transaction_id: string
  transaction_type: string
  transaction_amount: number
  status: string
  failure_reason?: string
  received_at: string
  environment: string
}

// Extraire l'option selectionnee et la source du message
function extractOptionFromMessage(question: string): { source: string | null; option: string | null; message: string } {
  // Format: [Source] [Option] Message
  // Ex: [Espace Client - Reporter un paiement] message
  // Ex: [Analyse Demande] [Ou en est ma demande de credit?] message
  // Ex: [Formulaire Contact] [Espace Client - Releve ou solde de compte] message

  let source: string | null = null
  let option: string | null = null
  let cleanMessage = question

  // Detecter source Analyse Demande ou Formulaire Accueil
  const analyseMatch = question.match(/\[(Analyse Demande|Formulaire Accueil)\]/)
  if (analyseMatch) {
    source = analyseMatch[1]
    cleanMessage = cleanMessage.replace(/\[(Analyse Demande|Formulaire Accueil)\]\s*/g, '')
  }

  // Detecter option Analyse (entre crochets apres la source)
  const analyseOptionMatch = cleanMessage.match(/\[([^\]]+)\]/)
  if (analyseOptionMatch && source) {
    option = analyseOptionMatch[1]
    cleanMessage = cleanMessage.replace(/\[[^\]]+\]\s*/g, '').trim()
  }

  // Detecter format Espace Client
  const espaceClientMatch = question.match(/\[Espace Client - ([^\]]+)\]/)
  if (espaceClientMatch) {
    source = 'Espace Client'
    option = espaceClientMatch[1]
    cleanMessage = question.replace(/\[Formulaire Contact\]\s*/g, '').replace(/\[Espace Client - [^\]]+\]\s*/g, '').trim()
  }

  // Detecter Formulaire Contact simple
  if (!source && question.includes('[Formulaire Contact]')) {
    source = 'Formulaire Contact'
    cleanMessage = question.replace(/\[Formulaire Contact\]\s*/g, '').trim()
  }

  return {
    source,
    option,
    message: cleanMessage || 'Aucun message additionnel'
  }
}

// Couleur selon la source
function getSourceColor(source: string | null): string {
  if (!source) return 'bg-gray-100 text-gray-600'
  const colors: Record<string, string> = {
    'Espace Client': 'bg-purple-100 text-purple-700',
    'Analyse Demande': 'bg-blue-100 text-blue-700',
    'Formulaire Accueil': 'bg-indigo-100 text-indigo-700',
    'Formulaire Contact': 'bg-cyan-100 text-cyan-700'
  }
  return colors[source] || 'bg-gray-100 text-gray-600'
}

// Couleur selon l'option
function getOptionColor(option: string | null): string {
  if (!option) return 'bg-gray-100 text-gray-600'
  const colors: Record<string, string> = {
    // Espace Client options
    'Reporter un paiement': 'bg-blue-100 text-blue-700',
    'Reduire mes paiements': 'bg-emerald-100 text-emerald-700',
    'Signaler un changement': 'bg-violet-100 text-violet-700',
    'Releve ou solde de compte': 'bg-amber-100 text-amber-700',
    'Arrangement de paiement': 'bg-rose-100 text-rose-700',
    // Analyse Demande options
    'Ou en est ma demande de credit?': 'bg-sky-100 text-sky-700',
    'Je veux annuler ma demande': 'bg-red-100 text-red-700',
    'Question sur mon remboursement': 'bg-orange-100 text-orange-700',
    'Autre question': 'bg-gray-100 text-gray-700'
  }
  return colors[option] || 'bg-gray-100 text-gray-600'
}

export default function AdminDashboard() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [stats, setStats] = useState({ total: 0, nonLus: 0 })
  const [currentTime, setCurrentTime] = useState<Date | null>(null)
  const [selectedView, setSelectedView] = useState<'dashboard' | 'messages' | 'vopay' | 'margill'>('dashboard')
  const [vopayLoading, setVopayLoading] = useState(false)
  const [vopayError, setVopayError] = useState<string | null>(null)

  // Detail panel states
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null)
  const [messageEmails, setMessageEmails] = useState<EmailLog[]>([])
  const [messageNotes, setMessageNotes] = useState<NoteLog[]>([])
  const [detailLoading, setDetailLoading] = useState(false)
  const [previewEmail, setPreviewEmail] = useState<EmailLog | null>(null)

  const [vopayData, setVopayData] = useState({
    balance: 0,
    available: 0,
    frozen: 0,
    pendingInterac: 0,
    todayInterac: 0,
    weeklyVolume: 0,
    successRate: 0,
    recentTransactions: [] as any[]
  })

  const [webhookStats, setWebhookStats] = useState<WebhookStats | null>(null)
  const [webhookStatsLoading, setWebhookStatsLoading] = useState(false)

  // Filtres pour transactions récentes
  const [txFilterType, setTxFilterType] = useState<'all' | 'deposits' | 'withdrawals'>('all')
  const [txFilterStatus, setTxFilterStatus] = useState<'all' | 'successful' | 'failed' | 'pending'>('all')
  const [txFilterPeriod, setTxFilterPeriod] = useState<'all' | 'today' | '7d' | '30d'>('all')
  const [txFilterAmount, setTxFilterAmount] = useState<'all' | 'small' | 'medium' | 'large'>('all')
  const [txSortBy, setTxSortBy] = useState<'recent' | 'oldest' | 'amount-high' | 'amount-low'>('recent')

  useEffect(() => {
    // Initialiser l'heure côté client seulement pour éviter hydration mismatch
    setCurrentTime(new Date())
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const fetchMessages = async () => {
    try {
      const res = await fetch('/api/admin/messages', { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        setMessages(data.messages || [])
        setStats({ total: data.total || 0, nonLus: data.nonLus || 0 })
      }
    } catch (error) {
      console.error('Erreur:', error)
    }
  }

  const fetchMessageDetails = async (message: Message) => {
    setSelectedMessage(message)
    setDetailLoading(true)
    setMessageEmails([])
    setMessageNotes([])

    try {
      // Marquer comme lu
      await fetch('/api/admin/messages', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ id: message.id })
      })

      // Charger emails et notes
      const res = await fetch(`/api/admin/messages?messageId=${message.id}`, { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        setMessageEmails(data.emails || [])
        setMessageNotes(data.notes || [])
      }

      // Rafraichir la liste
      fetchMessages()
    } catch (error) {
      console.error('Erreur details:', error)
    } finally {
      setDetailLoading(false)
    }
  }

  const closeDetail = () => {
    setSelectedMessage(null)
    setMessageEmails([])
    setMessageNotes([])
  }

  const fetchVopayData = async () => {
    setVopayLoading(true)
    setVopayError(null)
    try {
      const res = await fetch('/api/admin/vopay', { credentials: 'include' })
      if (res.ok) {
        const result = await res.json()
        if (result.success && result.data) {
          setVopayData(result.data)
        }
      } else {
        const error = await res.json()
        setVopayError(error.details || 'Erreur de connexion VoPay')
      }
    } catch (error) {
      console.error('Erreur VoPay:', error)
      setVopayError('Impossible de se connecter à VoPay')
    } finally {
      setVopayLoading(false)
    }
  }

  const fetchWebhookStats = async () => {
    setWebhookStatsLoading(true)
    try {
      const res = await fetch('/api/admin/webhooks/stats', { credentials: 'include' })
      if (res.ok) {
        const result = await res.json()
        if (result.success && result.stats) {
          setWebhookStats(result.stats)
        }
      }
    } catch (error) {
      console.error('Erreur webhook stats:', error)
    } finally {
      setWebhookStatsLoading(false)
    }
  }

  useEffect(() => {
    fetchMessages()
    fetchVopayData()
    fetchWebhookStats()
    const interval = setInterval(() => {
      fetchMessages()
      fetchWebhookStats()
    }, 30000)
    return () => clearInterval(interval)
  }, [])

  const handleLogout = async () => {
    setLoading(true)
    await fetch('/api/admin/logout', { method: 'POST' })
    router.push('/admin')
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD' }).format(amount)
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit' })
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('fr-CA', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  }

  // Fonction pour filtrer et trier les transactions
  const getFilteredTransactions = () => {
    if (!webhookStats?.recentTransactions) return []

    let filtered = [...webhookStats.recentTransactions]

    // Filtre par type (dépôt/retrait)
    if (txFilterType !== 'all') {
      filtered = filtered.filter(tx => {
        const type = tx.transaction_type?.toLowerCase() || ''
        if (txFilterType === 'deposits') {
          return type.includes('deposit') || type.includes('credit') || type.includes('eft_credit')
        } else {
          return type.includes('withdrawal') || type.includes('debit') || type.includes('eft_debit')
        }
      })
    }

    // Filtre par statut
    if (txFilterStatus !== 'all') {
      filtered = filtered.filter(tx => {
        const status = tx.status?.toLowerCase() || ''
        if (txFilterStatus === 'pending') {
          return status === 'pending' || status === 'in progress'
        }
        return status === txFilterStatus
      })
    }

    // Filtre par période
    if (txFilterPeriod !== 'all') {
      const now = new Date()
      filtered = filtered.filter(tx => {
        const txDate = new Date(tx.received_at)
        if (txFilterPeriod === 'today') {
          return txDate.toDateString() === now.toDateString()
        } else if (txFilterPeriod === '7d') {
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          return txDate >= weekAgo
        } else if (txFilterPeriod === '30d') {
          const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
          return txDate >= monthAgo
        }
        return true
      })
    }

    // Filtre par montant
    if (txFilterAmount !== 'all') {
      filtered = filtered.filter(tx => {
        const amount = parseFloat(tx.transaction_amount) || 0
        if (txFilterAmount === 'small') return amount < 500
        if (txFilterAmount === 'medium') return amount >= 500 && amount <= 1000
        if (txFilterAmount === 'large') return amount > 1000
        return true
      })
    }

    // Tri
    filtered.sort((a, b) => {
      if (txSortBy === 'recent') {
        return new Date(b.received_at).getTime() - new Date(a.received_at).getTime()
      } else if (txSortBy === 'oldest') {
        return new Date(a.received_at).getTime() - new Date(b.received_at).getTime()
      } else if (txSortBy === 'amount-high') {
        return (parseFloat(b.transaction_amount) || 0) - (parseFloat(a.transaction_amount) || 0)
      } else if (txSortBy === 'amount-low') {
        return (parseFloat(a.transaction_amount) || 0) - (parseFloat(b.transaction_amount) || 0)
      }
      return 0
    })

    return filtered
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-gray-50 to-emerald-50 flex flex-col">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-lg border-b border-gray-200/50 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-[#00874e] to-emerald-600 rounded-xl flex items-center justify-center shadow-md">
                <span className="text-white text-lg font-bold">$</span>
              </div>
              <div>
                <span className="text-[#003d2c] text-lg font-bold">Solution Argent Rapide</span>
                <span className="text-gray-400 text-sm ml-2 font-medium">Admin</span>
              </div>
            </div>

            {/* Navigation */}
            <nav className="flex items-center gap-1">
              {[
                { id: 'dashboard', label: 'Tableau de bord' },
                { id: 'messages', label: 'Messages', badge: stats.nonLus },
                { id: 'vopay', label: 'VoPay' },
                { id: 'margill', label: 'Margill' },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => setSelectedView(item.id as typeof selectedView)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
                    selectedView === item.id
                      ? 'bg-gradient-to-r from-[#00874e] to-emerald-600 text-white shadow-md'
                      : 'text-gray-600 hover:bg-gray-100 hover:scale-105'
                  }`}
                >
                  {item.label}
                  {item.badge && item.badge > 0 && (
                    <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold min-w-[18px] text-center ${
                      selectedView === item.id
                        ? 'bg-white text-[#00874e]'
                        : 'bg-red-500 text-white'
                    }`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              ))}
              <button
                onClick={() => router.push('/admin/webhooks')}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 text-gray-600 hover:bg-gray-100"
              >
                Webhooks
              </button>
            </nav>

            {/* Right Side */}
            <div className="flex items-center gap-4">
              {/* Date/Time */}
              <div className="text-right">
                <p className="text-gray-900 font-medium" suppressHydrationWarning>{currentTime ? formatTime(currentTime) : '--:--'}</p>
                <p className="text-gray-500 text-xs" suppressHydrationWarning>{currentTime ? formatDate(currentTime) : 'Chargement...'}</p>
              </div>

              {/* Logout */}
              <button
                onClick={handleLogout}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                {loading ? <Loader2 size={18} className="animate-spin" /> : <LogOut size={18} />}
                <span className="text-sm">Deconnexion</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-8">
        {selectedView === 'dashboard' && (
          <>
            {/* Welcome Section */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-[#003d2c] flex items-center gap-3">
                <div className="w-1 h-8 bg-gradient-to-b from-[#00874e] to-emerald-600 rounded-full"></div>
                Tableau de bord
              </h1>
              <p className="text-gray-600 mt-2 ml-7 font-medium">Vue d'ensemble de votre activite</p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-4 gap-6 mb-8">
              {/* Solde VoPay */}
              <div className="bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-100 p-6 group hover:scale-105">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-gray-600 text-sm font-medium">Solde VoPay</span>
                  <div className="w-10 h-10 bg-gradient-to-br from-[#e8f5e9] to-emerald-100 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <DollarSign size={20} className="text-[#00874e]" />
                  </div>
                </div>
                <p className="text-3xl font-bold text-gray-900 mb-2">
                  {vopayLoading ? '...' : formatCurrency(vopayData.balance)}
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 font-medium">Disponible: {formatCurrency(vopayData.available)}</span>
                </div>
              </div>

              {/* Volume Aujourd'hui */}
              <div className="bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-100 p-6 group hover:scale-105">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-gray-600 text-sm font-medium">Volume Aujourd'hui</span>
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <TrendingUp size={20} className="text-blue-600" />
                  </div>
                </div>
                <p className="text-3xl font-bold text-gray-900 mb-2">
                  {webhookStatsLoading ? '...' : formatCurrency(webhookStats?.todayVolume || 0)}
                </p>
                <div className="flex items-center gap-2">
                  {webhookStats && webhookStats.volumeChange !== 0 ? (
                    <>
                      {webhookStats.volumeChange > 0 ? (
                        <TrendingUp size={14} className="text-[#00874e]" />
                      ) : (
                        <TrendingDown size={14} className="text-red-500" />
                      )}
                      <span className={`text-xs font-semibold ${webhookStats.volumeChange > 0 ? 'text-[#00874e]' : 'text-red-500'}`}>
                        {webhookStats.volumeChange > 0 ? '+' : ''}{webhookStats.volumeChange}% vs hier
                      </span>
                    </>
                  ) : (
                    <span className="text-xs text-gray-500 font-medium">Pas de variation</span>
                  )}
                </div>
              </div>

              {/* Transactions Actives */}
              <div className="bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-100 p-6 group hover:scale-105">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-gray-600 text-sm font-medium">Transactions Actives</span>
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Activity size={20} className="text-purple-600" />
                  </div>
                </div>
                <p className="text-3xl font-bold text-gray-900 mb-2">
                  {webhookStatsLoading ? '...' : webhookStats?.totalPending || 0}
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 font-medium">En cours de traitement</span>
                </div>
              </div>

              {/* Taux de Succès */}
              <div className="bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-100 p-6 group hover:scale-105">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-gray-600 text-sm font-medium">Taux de Succès 7j</span>
                  <div className="w-10 h-10 bg-gradient-to-br from-[#e8f5e9] to-emerald-100 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <CheckCircle size={20} className="text-[#00874e]" />
                  </div>
                </div>
                <p className="text-3xl font-bold text-gray-900 mb-2">
                  {webhookStatsLoading ? '...' : `${webhookStats?.weekSuccessRate || 0}%`}
                </p>
                <div className="flex items-center gap-2">
                  {webhookStats && webhookStats.weekSuccessRate >= 90 ? (
                    <span className="text-xs font-semibold text-[#00874e]">Excellent</span>
                  ) : webhookStats && webhookStats.weekSuccessRate >= 75 ? (
                    <span className="text-xs font-semibold text-blue-600">Bon</span>
                  ) : (
                    <span className="text-xs font-semibold text-amber-600">À surveiller</span>
                  )}
                </div>
              </div>
            </div>

            {/* Two Column Layout */}
            <div className="grid grid-cols-3 gap-6">
              {/* Activity Feed - Transactions Récentes */}
              <div className="col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-white border-b border-gray-100 flex items-center justify-between">
                  <h2 className="font-bold text-gray-900 flex items-center gap-2">
                    <Activity size={18} className="text-[#00874e]" />
                    Transactions recentes
                  </h2>
                  <button
                    onClick={fetchWebhookStats}
                    className="text-gray-400 hover:text-[#00874e] transition-all hover:scale-110"
                  >
                    <RefreshCw size={16} className={webhookStatsLoading ? 'animate-spin' : ''} />
                  </button>
                </div>

                {/* Filters Section */}
                {webhookStats?.recentTransactions && webhookStats.recentTransactions.length > 0 && (
                  <div className="px-6 py-4 bg-gray-50 border-b border-gray-100">
                    {/* Active Filters Chips */}
                    <div className={(txFilterType !== 'all' || txFilterStatus !== 'all' || txFilterPeriod !== 'all' || txFilterAmount !== 'all' || txSortBy !== 'recent') ? "no-transition bg-white rounded-lg p-3 mb-4 shadow-sm" : "hidden"}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs text-gray-500 uppercase tracking-wide font-semibold">Filtres actifs</span>
                          <button
                            onClick={() => {
                              setTxFilterType('all')
                              setTxFilterStatus('all')
                              setTxFilterPeriod('all')
                              setTxFilterAmount('all')
                              setTxSortBy('recent')
                            }}
                            className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                          >
                            Tout effacer
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {/* Type Chip */}
                          {txFilterType !== 'all' && (
                            <span className="inline-flex items-center gap-1.5 bg-[#e8f5e9] text-[#00874e] px-3 py-1.5 rounded-full text-sm font-medium shadow-sm">
                              {txFilterType === 'deposits' ? 'Dépôts' : 'Retraits'}
                              <button
                                onClick={() => setTxFilterType('all')}
                                className="hover:bg-[#00874e]/10 rounded-full p-0.5"
                              >
                                <X size={14} />
                              </button>
                            </span>
                          )}

                          {/* Status Chip */}
                          {txFilterStatus !== 'all' && (
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium shadow-sm ${
                              txFilterStatus === 'successful' ? 'bg-green-100 text-green-700' :
                              txFilterStatus === 'failed' ? 'bg-red-100 text-red-700' :
                              'bg-yellow-100 text-yellow-700'
                            }`}>
                              {txFilterStatus === 'successful' ? 'Succès' :
                                txFilterStatus === 'failed' ? 'Échecs' :
                                'En attente'}
                              <button
                                onClick={() => setTxFilterStatus('all')}
                                className="hover:bg-black/5 rounded-full p-0.5"
                              >
                                <X size={14} />
                              </button>
                            </span>
                          )}

                          {/* Period Chip */}
                          {txFilterPeriod !== 'all' && (
                            <span className="inline-flex items-center gap-1.5 bg-blue-100 text-blue-700 px-3 py-1.5 rounded-full text-sm font-medium shadow-sm">
                              {txFilterPeriod === 'today' ? "Aujourd'hui" : txFilterPeriod === '7d' ? '7 jours' : '30 jours'}
                              <button
                                onClick={() => setTxFilterPeriod('all')}
                                className="hover:bg-blue-200 rounded-full p-0.5"
                              >
                                <X size={14} />
                              </button>
                            </span>
                          )}

                          {/* Amount Chip */}
                          {txFilterAmount !== 'all' && (
                            <span className="inline-flex items-center gap-1.5 bg-purple-100 text-purple-700 px-3 py-1.5 rounded-full text-sm font-medium shadow-sm">
                              {txFilterAmount === 'small' ? '< 500$' :
                                txFilterAmount === 'medium' ? '500-1000$' :
                                '> 1000$'}
                              <button
                                onClick={() => setTxFilterAmount('all')}
                                className="hover:bg-purple-200 rounded-full p-0.5"
                              >
                                <X size={14} />
                              </button>
                            </span>
                          )}

                          {/* Sort Chip */}
                          {txSortBy !== 'recent' && (
                            <span className="inline-flex items-center gap-1.5 bg-gray-100 text-gray-700 px-3 py-1.5 rounded-full text-sm font-medium shadow-sm">
                              {txSortBy === 'oldest' ? 'Plus anciens' :
                                txSortBy === 'amount-high' ? 'Montant ↓' :
                                'Montant ↑'}
                              <button
                                onClick={() => setTxSortBy('recent')}
                                className="hover:bg-gray-200 rounded-full p-0.5"
                              >
                                <X size={14} />
                              </button>
                            </span>
                          )}
                        </div>
                    </div>

                    {/* Button-Based Filters */}
                    <div className="bg-white rounded-lg p-4 shadow-sm space-y-4">
                      {/* Type Filter */}
                      <div>
                        <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2 block">Type</label>
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => setTxFilterType('all')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                              txFilterType === 'all'
                                ? 'bg-[#00874e] text-white shadow-md'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                          >
                            Toutes
                          </button>
                          <button
                            onClick={() => setTxFilterType('deposits')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                              txFilterType === 'deposits'
                                ? 'bg-[#00874e] text-white shadow-md'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                          >
                            Dépôts
                          </button>
                          <button
                            onClick={() => setTxFilterType('withdrawals')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                              txFilterType === 'withdrawals'
                                ? 'bg-[#00874e] text-white shadow-md'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                          >
                            Retraits
                          </button>
                        </div>
                      </div>

                      {/* Status Filter */}
                      <div>
                        <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2 block">Statut</label>
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => setTxFilterStatus('all')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                              txFilterStatus === 'all'
                                ? 'bg-[#00874e] text-white shadow-md'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                          >
                            Tous
                          </button>
                          <button
                            onClick={() => setTxFilterStatus('successful')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                              txFilterStatus === 'successful'
                                ? 'bg-green-600 text-white shadow-md'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                          >
                            Succès
                          </button>
                          <button
                            onClick={() => setTxFilterStatus('failed')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                              txFilterStatus === 'failed'
                                ? 'bg-red-600 text-white shadow-md'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                          >
                            Échecs
                          </button>
                          <button
                            onClick={() => setTxFilterStatus('pending')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                              txFilterStatus === 'pending'
                                ? 'bg-yellow-600 text-white shadow-md'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                          >
                            En attente
                          </button>
                        </div>
                      </div>

                      {/* Period Filter */}
                      <div>
                        <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2 block">Période</label>
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => setTxFilterPeriod('all')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                              txFilterPeriod === 'all'
                                ? 'bg-[#00874e] text-white shadow-md'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                          >
                            Toutes
                          </button>
                          <button
                            onClick={() => setTxFilterPeriod('today')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                              txFilterPeriod === 'today'
                                ? 'bg-blue-600 text-white shadow-md'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                          >
                            Aujourd&apos;hui
                          </button>
                          <button
                            onClick={() => setTxFilterPeriod('7d')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                              txFilterPeriod === '7d'
                                ? 'bg-blue-600 text-white shadow-md'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                          >
                            7 jours
                          </button>
                          <button
                            onClick={() => setTxFilterPeriod('30d')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                              txFilterPeriod === '30d'
                                ? 'bg-blue-600 text-white shadow-md'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                          >
                            30 jours
                          </button>
                        </div>
                      </div>

                      {/* Amount Filter */}
                      <div>
                        <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2 block">Montant</label>
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => setTxFilterAmount('all')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                              txFilterAmount === 'all'
                                ? 'bg-[#00874e] text-white shadow-md'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                          >
                            Tous
                          </button>
                          <button
                            onClick={() => setTxFilterAmount('small')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                              txFilterAmount === 'small'
                                ? 'bg-purple-600 text-white shadow-md'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                          >
                            &lt; 500$
                          </button>
                          <button
                            onClick={() => setTxFilterAmount('medium')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                              txFilterAmount === 'medium'
                                ? 'bg-purple-600 text-white shadow-md'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                          >
                            500$ - 1000$
                          </button>
                          <button
                            onClick={() => setTxFilterAmount('large')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                              txFilterAmount === 'large'
                                ? 'bg-purple-600 text-white shadow-md'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                          >
                            &gt; 1000$
                          </button>
                        </div>
                      </div>

                      {/* Sort Filter */}
                      <div>
                        <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2 block">Tri</label>
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => setTxSortBy('recent')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                              txSortBy === 'recent'
                                ? 'bg-[#00874e] text-white shadow-md'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                          >
                            Plus récents
                          </button>
                          <button
                            onClick={() => setTxSortBy('oldest')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                              txSortBy === 'oldest'
                                ? 'bg-gray-700 text-white shadow-md'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                          >
                            Plus anciens
                          </button>
                          <button
                            onClick={() => setTxSortBy('amount-high')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                              txSortBy === 'amount-high'
                                ? 'bg-gray-700 text-white shadow-md'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                          >
                            Montant ↓
                          </button>
                          <button
                            onClick={() => setTxSortBy('amount-low')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                              txSortBy === 'amount-low'
                                ? 'bg-gray-700 text-white shadow-md'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                          >
                            Montant ↑
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Results Count */}
                    <div className="mt-3 text-center">
                      <span className="text-xs text-gray-500 font-medium">
                        {(() => {
                          const filtered = getFilteredTransactions()
                          const total = webhookStats?.recentTransactions?.length || 0
                          if (filtered.length !== total) {
                            return `${filtered.length} résultat(s) sur ${total} transactions`
                          }
                          return `${total} transaction(s)`
                        })()}
                      </span>
                    </div>
                  </div>
                )}

                <div className="divide-y divide-gray-100">
                  {webhookStatsLoading ? (
                    <div className="px-6 py-8 text-center">
                      <Loader2 size={24} className="animate-spin text-[#00874e] mx-auto" />
                    </div>
                  ) : webhookStats?.recentTransactions && webhookStats.recentTransactions.length > 0 ? (
                    (() => {
                      const filteredTransactions = getFilteredTransactions()

                      if (filteredTransactions.length === 0) {
                        return (
                          <div className="px-6 py-12 text-center">
                            <Search size={48} className="text-gray-300 mx-auto mb-4" />
                            <p className="text-gray-500 font-medium mb-2">Aucun résultat</p>
                            <p className="text-sm text-gray-400">
                              Essayez de modifier vos filtres
                            </p>
                          </div>
                        )
                      }

                      return filteredTransactions.slice(0, 10).map((tx: any, i: number) => {
                        const status = tx.status.toLowerCase()
                        const isSuccessful = status === 'successful'
                        const isFailed = status === 'failed'
                        const isPending = status === 'pending' || status === 'in progress'

                        return (
                          <div key={tx.id || i} className="px-6 py-4 flex items-center justify-between hover:bg-gradient-to-r hover:from-gray-50 hover:to-transparent transition-all duration-200 cursor-pointer group">
                            <div className="flex items-center gap-4">
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 ${
                                isSuccessful ? 'bg-gradient-to-br from-[#e8f5e9] to-emerald-100' :
                                isFailed ? 'bg-gradient-to-br from-red-50 to-red-100' :
                                isPending ? 'bg-gradient-to-br from-blue-50 to-blue-100' :
                                'bg-gray-50'
                              }`}>
                                {isSuccessful && <CheckCircle size={18} className="text-[#00874e]" />}
                                {isFailed && <XCircle size={18} className="text-red-500" />}
                                {isPending && <Clock size={18} className="text-blue-600" />}
                                {status === 'cancelled' && <XCircle size={18} className="text-gray-400" />}
                              </div>
                              <div>
                                <p className="font-medium text-gray-900">{tx.transaction_id}</p>
                                <p className="text-sm text-gray-500">
                                  {tx.transaction_type}
                                  {tx.failure_reason && ` - ${tx.failure_reason}`}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className={`font-semibold ${
                                isFailed ? 'text-red-500' :
                                isSuccessful ? 'text-[#00874e]' :
                                'text-gray-900'
                              }`}>
                                {formatCurrency(tx.transaction_amount)}
                              </p>
                              <p className="text-sm text-gray-400">
                                {new Date(tx.received_at).toLocaleTimeString('fr-CA', {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </p>
                            </div>
                          </div>
                        )
                      })
                    })()
                  ) : (
                    <div className="px-6 py-12 text-center">
                      <Activity size={48} className="text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500 font-medium mb-2">Pas encore configuré</p>
                      <p className="text-sm text-gray-400">
                        Aucune transaction de production n'a été reçue
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Sidebar */}
              <div className="space-y-6">
                {/* Quick Stats */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                  <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <div className="w-2 h-2 bg-[#00874e] rounded-full"></div>
                    Statistiques rapides
                  </h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500 text-sm">Taux de succes 7j</span>
                      <span className="font-semibold text-[#00874e]">
                        {webhookStatsLoading ? '...' : `${webhookStats?.weekSuccessRate || 0}%`}
                      </span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-[#00874e] to-emerald-600 rounded-full transition-all duration-500"
                        style={{ width: `${webhookStats?.weekSuccessRate || 0}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between pt-2">
                      <span className="text-gray-500 text-sm">Transactions en attente</span>
                      <span className="font-semibold text-blue-600">
                        {webhookStatsLoading ? '...' : webhookStats?.totalPending || 0}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500 text-sm">Transactions echouees</span>
                      <span className="font-semibold text-red-500">
                        {webhookStatsLoading ? '...' : webhookStats?.weekFailed || 0}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500 text-sm">Montant gele</span>
                      <span className="font-semibold text-amber-600">
                        {vopayLoading ? '...' : formatCurrency(vopayData.frozen)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500 text-sm">Volume 7 jours</span>
                      <span className="font-semibold text-gray-900">
                        {webhookStatsLoading ? '...' : formatCurrency(webhookStats?.weekVolume || 0)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Alertes - Transactions Échouées */}
                {webhookStats && webhookStats.failedCount > 0 && (
                  <div className="bg-gradient-to-br from-red-50 to-red-100 border border-red-200 rounded-xl p-6 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                        <AlertTriangle size={20} className="text-red-600" />
                      </div>
                      <div>
                        <h3 className="font-bold text-red-900">Alertes</h3>
                        <p className="text-sm text-red-700 font-medium">
                          {webhookStats.failedCount} transaction(s) échouée(s)
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedView('vopay')}
                      className="w-full px-4 py-2 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg text-sm font-semibold hover:from-red-700 hover:to-red-800 transition-all shadow-md hover:shadow-lg transform hover:scale-105"
                    >
                      Voir les détails
                    </button>
                  </div>
                )}

                {/* Recent Messages */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-white border-b border-gray-100 flex items-center justify-between">
                    <h3 className="font-bold text-gray-900">Messages recents</h3>
                    {stats.nonLus > 0 && (
                      <span className="text-xs px-2 py-1 rounded-full bg-gradient-to-r from-red-500 to-red-600 text-white font-bold shadow-sm">
                        {stats.nonLus} nouveau(x)
                      </span>
                    )}
                  </div>
                  <div className="divide-y divide-gray-100">
                    {messages.slice(0, 3).map((msg) => (
                      <div key={msg.id} className="px-6 py-4 hover:bg-gradient-to-r hover:from-gray-50 hover:to-transparent transition-all cursor-pointer group">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#e8f5e9] to-emerald-100 flex items-center justify-center text-sm font-bold text-[#00874e] group-hover:scale-110 transition-transform">
                            {msg.nom.split(' ').map(n => n[0]).join('').slice(0, 2)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-gray-900 truncate">{msg.nom}</p>
                              {!msg.lu && <div className="w-2 h-2 bg-blue-500 rounded-full"></div>}
                            </div>
                            <p className="text-sm text-gray-500 truncate">{msg.question}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => setSelectedView('messages')}
                    className="w-full px-6 py-3 text-sm font-semibold text-[#00874e] hover:bg-gradient-to-r hover:from-gray-50 hover:to-white transition-all border-t border-gray-100 flex items-center justify-center gap-1 group"
                  >
                    Voir tous les messages
                    <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Messages View */}
        {selectedView === 'messages' && (
          <div className="flex gap-6">
            {/* Liste des messages */}
            <div className={`${selectedMessage ? 'w-1/2' : 'w-full'} transition-all duration-300`}>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h1 className="text-3xl font-bold text-[#003d2c] flex items-center gap-3">
                    <div className="w-1 h-8 bg-gradient-to-b from-[#00874e] to-emerald-600 rounded-full"></div>
                    Messages
                  </h1>
                  <p className="text-gray-600 mt-2 ml-7 font-medium">{stats.total} message(s) au total</p>
                </div>
                <button
                  onClick={fetchMessages}
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-all shadow-sm hover:shadow hover:scale-105"
                >
                  <RefreshCw size={16} />
                  Actualiser
                </button>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="divide-y divide-gray-100">
                  {messages.map((msg) => {
                    const { option, message: cleanMsg } = extractOptionFromMessage(msg.question)
                    return (
                      <div
                        key={msg.id}
                        onClick={() => fetchMessageDetails(msg)}
                        className={`px-6 py-5 hover:bg-gradient-to-r hover:from-gray-50 hover:to-transparent transition-all cursor-pointer group ${!msg.lu ? 'bg-gradient-to-r from-blue-50/30 to-transparent' : ''} ${selectedMessage?.id === msg.id ? 'ring-2 ring-[#00874e] ring-inset bg-emerald-50/30' : ''}`}
                      >
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#e8f5e9] to-emerald-100 flex items-center justify-center text-sm font-bold text-[#00874e] group-hover:scale-110 transition-transform shadow-sm">
                            {msg.nom.split(' ').map(n => n[0]).join('').slice(0, 2)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                              <p className="font-semibold text-gray-900">{msg.nom}</p>
                              <span className="text-xs px-2 py-1 rounded-lg bg-gray-100 text-gray-500 font-mono font-semibold">#{msg.reference}</span>
                              {!msg.lu && (
                                <span className="text-xs px-2 py-1 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 text-white font-bold shadow-sm">Nouveau</span>
                              )}
                            </div>
                            {/* Option Badge */}
                            {option && (
                              <div className="mb-2">
                                <span className={`text-xs px-3 py-1 rounded-full font-medium ${getOptionColor(option)}`}>
                                  {option}
                                </span>
                              </div>
                            )}
                            <p className="text-gray-700 mb-3 truncate">{cleanMsg}</p>
                            <div className="flex items-center gap-4 text-sm text-gray-500 flex-wrap">
                              <span className="flex items-center gap-1">
                                <Mail size={14} />
                                {msg.email || 'N/A'}
                              </span>
                              {msg.telephone && (
                                <span className="flex items-center gap-1">
                                  <Phone size={14} />
                                  {msg.telephone}
                                </span>
                              )}
                              <span className="flex items-center gap-1">
                                <Clock size={14} />
                                {new Date(msg.date).toLocaleString('fr-CA')}
                              </span>
                            </div>
                          </div>
                          <ChevronRight size={20} className="text-gray-400 flex-shrink-0" />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Panneau de details */}
            {selectedMessage && (
              <div className="w-1/2 bg-white rounded-xl shadow-lg border border-gray-100 sticky top-24 h-fit max-h-[calc(100vh-120px)] overflow-auto">
                {/* Header */}
                <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-white border-b border-gray-100 flex items-center justify-between sticky top-0 z-10 rounded-t-xl">
                  <h2 className="font-bold text-gray-900 flex items-center gap-2">
                    <MessageSquare size={18} className="text-[#00874e]" />
                    Details du message
                  </h2>
                  <button
                    onClick={closeDetail}
                    className="p-2 hover:bg-red-50 rounded-lg transition-all hover:scale-110"
                  >
                    <X size={18} className="text-gray-500 hover:text-red-600" />
                  </button>
                </div>

                {detailLoading ? (
                  <div className="p-8 flex items-center justify-center">
                    <Loader2 size={24} className="animate-spin text-[#00874e]" />
                  </div>
                ) : (
                  <div className="p-6 space-y-6">
                    {/* Info Client */}
                    <div className="bg-gray-50 rounded-xl p-5">
                      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <User size={14} />
                        Information Client
                      </h3>
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <div className="w-14 h-14 rounded-full bg-[#00874e] flex items-center justify-center text-lg font-bold text-white">
                            {selectedMessage.nom.split(' ').map(n => n[0]).join('').slice(0, 2)}
                          </div>
                          <div>
                            <p className="font-bold text-gray-900 text-lg">{selectedMessage.nom}</p>
                            <p className="text-sm text-gray-500 font-mono">#{selectedMessage.reference}</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 gap-3 mt-4">
                          <div className="flex items-center gap-3 p-3 bg-white rounded-lg">
                            <Mail size={18} className="text-[#00874e]" />
                            <div>
                              <p className="text-xs text-gray-500">Courriel</p>
                              <a href={`mailto:${selectedMessage.email}`} className="text-gray-900 font-medium hover:text-[#00874e]">
                                {selectedMessage.email || 'Non fourni'}
                              </a>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 p-3 bg-white rounded-lg">
                            <Phone size={18} className="text-[#00874e]" />
                            <div>
                              <p className="text-xs text-gray-500">Telephone</p>
                              <a href={`tel:${selectedMessage.telephone}`} className="text-gray-900 font-medium hover:text-[#00874e]">
                                {selectedMessage.telephone || 'Non fourni'}
                              </a>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 p-3 bg-white rounded-lg">
                            <Clock size={18} className="text-[#00874e]" />
                            <div>
                              <p className="text-xs text-gray-500">Date de reception</p>
                              <p className="text-gray-900 font-medium">{new Date(selectedMessage.date).toLocaleString('fr-CA')}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Option Selectionnee */}
                    {(() => {
                      const { option } = extractOptionFromMessage(selectedMessage.question)
                      return option ? (
                        <div className="bg-gray-50 rounded-xl p-5">
                          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                            <Tag size={14} />
                            Option Selectionnee
                          </h3>
                          <span className={`inline-block text-sm px-4 py-2 rounded-full font-semibold ${getOptionColor(option)}`}>
                            {option}
                          </span>
                        </div>
                      ) : null
                    })()}

                    {/* Message */}
                    <div className="bg-gray-50 rounded-xl p-5">
                      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <MessageSquare size={14} />
                        Message du Client
                      </h3>
                      <p className="text-gray-800 whitespace-pre-wrap leading-relaxed">
                        {extractOptionFromMessage(selectedMessage.question).message}
                      </p>
                    </div>

                    {/* Métriques de Connexion */}
                    {(selectedMessage.client_ip || selectedMessage.client_device) && (
                      <div className="bg-gray-50 rounded-xl p-5">
                        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                          <Activity size={14} />
                          Métriques de Connexion
                        </h3>
                        <div className="grid grid-cols-2 gap-3">
                          {selectedMessage.client_ip && (
                            <div className="bg-white rounded-lg p-3 border border-gray-100">
                              <p className="text-xs text-gray-500 mb-1">Adresse IP</p>
                              <p className="text-gray-900 font-mono text-sm">{selectedMessage.client_ip}</p>
                            </div>
                          )}
                          {selectedMessage.client_device && (
                            <div className="bg-white rounded-lg p-3 border border-gray-100">
                              <p className="text-xs text-gray-500 mb-1">Appareil</p>
                              <p className="text-gray-900 font-medium text-sm">{selectedMessage.client_device}</p>
                            </div>
                          )}
                          {selectedMessage.client_browser && (
                            <div className="bg-white rounded-lg p-3 border border-gray-100">
                              <p className="text-xs text-gray-500 mb-1">Navigateur</p>
                              <p className="text-gray-900 font-medium text-sm">{selectedMessage.client_browser}</p>
                            </div>
                          )}
                          {selectedMessage.client_os && (
                            <div className="bg-white rounded-lg p-3 border border-gray-100">
                              <p className="text-xs text-gray-500 mb-1">Système</p>
                              <p className="text-gray-900 font-medium text-sm">{selectedMessage.client_os}</p>
                            </div>
                          )}
                          {selectedMessage.client_timezone && (
                            <div className="bg-white rounded-lg p-3 border border-gray-100">
                              <p className="text-xs text-gray-500 mb-1">Fuseau horaire</p>
                              <p className="text-gray-900 font-mono text-sm">{selectedMessage.client_timezone}</p>
                            </div>
                          )}
                          {selectedMessage.client_language && (
                            <div className="bg-white rounded-lg p-3 border border-gray-100">
                              <p className="text-xs text-gray-500 mb-1">Langue</p>
                              <p className="text-gray-900 font-mono text-sm">{selectedMessage.client_language}</p>
                            </div>
                          )}
                          {selectedMessage.client_screen_resolution && (
                            <div className="bg-white rounded-lg p-3 border border-gray-100">
                              <p className="text-xs text-gray-500 mb-1">Résolution</p>
                              <p className="text-gray-900 font-mono text-sm">{selectedMessage.client_screen_resolution}</p>
                            </div>
                          )}
                          {selectedMessage.referrer && (
                            <div className="bg-white rounded-lg p-3 border border-gray-100 col-span-2">
                              <p className="text-xs text-gray-500 mb-1">Page de provenance</p>
                              <p className="text-gray-900 font-mono text-xs truncate">{selectedMessage.referrer}</p>
                            </div>
                          )}
                          {(selectedMessage.utm_source || selectedMessage.utm_medium || selectedMessage.utm_campaign) && (
                            <div className="bg-white rounded-lg p-3 border border-gray-100 col-span-2">
                              <p className="text-xs text-gray-500 mb-2">Tracking Campagne (UTM)</p>
                              <div className="space-y-1 text-xs">
                                {selectedMessage.utm_source && <p><span className="text-gray-500">Source:</span> <span className="text-gray-900 font-medium">{selectedMessage.utm_source}</span></p>}
                                {selectedMessage.utm_medium && <p><span className="text-gray-500">Medium:</span> <span className="text-gray-900 font-medium">{selectedMessage.utm_medium}</span></p>}
                                {selectedMessage.utm_campaign && <p><span className="text-gray-500">Campagne:</span> <span className="text-gray-900 font-medium">{selectedMessage.utm_campaign}</span></p>}
                              </div>
                            </div>
                          )}
                          {selectedMessage.client_user_agent && (
                            <details className="col-span-2">
                              <summary className="text-xs text-[#00874e] cursor-pointer hover:underline mb-2">
                                Voir User-Agent complet
                              </summary>
                              <div className="bg-white rounded-lg p-3 border border-gray-100">
                                <pre className="text-xs text-gray-600 whitespace-pre-wrap break-all">{selectedMessage.client_user_agent}</pre>
                              </div>
                            </details>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Emails Envoyes */}
                    <div className="bg-gray-50 rounded-xl p-5">
                      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <Send size={14} />
                        Emails Envoyes ({messageEmails.length})
                      </h3>
                      {messageEmails.length === 0 ? (
                        <p className="text-gray-500 text-sm italic">Aucun email enregistre</p>
                      ) : (
                        <div className="space-y-3">
                          {messageEmails.map((email) => (
                            <div key={email.id} className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                  <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                                    email.type === 'system' ? 'bg-purple-100 text-purple-700' :
                                    email.type === 'manual' ? 'bg-blue-100 text-blue-700' :
                                    'bg-gray-100 text-gray-700'
                                  }`}>
                                    {email.type === 'system' ? '🤖 Auto' : '✍️ Manuel'}
                                  </span>
                                  <span className="text-xs text-gray-400">
                                    {new Date(email.date).toLocaleString('fr-CA', {
                                      day: 'numeric',
                                      month: 'short',
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })}
                                  </span>
                                </div>
                                <button
                                  onClick={() => setPreviewEmail(email)}
                                  className="text-xs px-3 py-1.5 bg-[#00874e] text-white rounded-lg hover:bg-[#006d3f] transition-colors font-medium flex items-center gap-1"
                                >
                                  <ExternalLink size={12} />
                                  Aperçu
                                </button>
                              </div>
                              <div className="space-y-2">
                                <div className="flex items-start gap-2">
                                  <Mail size={14} className="text-gray-400 mt-0.5 flex-shrink-0" />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs text-gray-500">Destinataire</p>
                                    <p className="text-sm font-medium text-gray-900 truncate">{email.to}</p>
                                  </div>
                                </div>
                                <div className="flex items-start gap-2">
                                  <MessageSquare size={14} className="text-gray-400 mt-0.5 flex-shrink-0" />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs text-gray-500">Objet</p>
                                    <p className="text-sm font-semibold text-gray-900">{email.subject}</p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3">
                      <a
                        href={`mailto:${selectedMessage.email}`}
                        className="flex-1 py-3 bg-[#00874e] text-white rounded-lg text-sm font-semibold hover:bg-[#006d3f] transition-colors flex items-center justify-center gap-2"
                      >
                        <Mail size={16} />
                        Repondre par email
                      </a>
                      {selectedMessage.telephone && (
                        <a
                          href={`tel:${selectedMessage.telephone}`}
                          className="flex-1 py-3 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                        >
                          <Phone size={16} />
                          Appeler
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* VoPay View */}
        {selectedView === 'vopay' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-2xl font-semibold text-[#003d2c]">VoPay</h1>
                <p className="text-gray-500 mt-1">Gestion des paiements Interac</p>
              </div>
              <button
                onClick={fetchVopayData}
                disabled={vopayLoading}
                className="flex items-center gap-2 px-4 py-2 bg-[#00874e] text-white rounded-lg text-sm font-medium hover:bg-[#006d3f] transition-colors disabled:opacity-50"
              >
                <RefreshCw size={16} className={vopayLoading ? 'animate-spin' : ''} />
                {vopayLoading ? 'Chargement...' : 'Rafraichir'}
              </button>
            </div>

            {vopayError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <div className="flex items-center gap-3">
                  <AlertTriangle size={20} className="text-red-500" />
                  <div>
                    <h3 className="font-semibold text-red-800">Erreur de connexion</h3>
                    <p className="text-sm text-red-600">{vopayError}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-4 gap-6 mb-6">
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <span className="text-gray-500 text-sm">Solde total</span>
                <p className="text-2xl font-bold text-gray-900 mt-2">
                  {vopayLoading ? '...' : formatCurrency(vopayData.balance)}
                </p>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <span className="text-gray-500 text-sm">Disponible</span>
                <p className="text-2xl font-bold text-[#00874e] mt-2">
                  {vopayLoading ? '...' : formatCurrency(vopayData.available)}
                </p>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <span className="text-gray-500 text-sm">Gele</span>
                <p className="text-2xl font-bold text-amber-600 mt-2">
                  {vopayLoading ? '...' : formatCurrency(vopayData.frozen)}
                </p>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <span className="text-gray-500 text-sm">En attente</span>
                <p className="text-2xl font-bold text-blue-600 mt-2">
                  {vopayLoading ? '...' : vopayData.pendingInterac}
                </p>
              </div>
            </div>

            {/* Stats supplémentaires */}
            <div className="grid grid-cols-3 gap-6 mb-6">
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <span className="text-gray-500 text-sm">Volume aujourd'hui</span>
                <p className="text-2xl font-bold text-gray-900 mt-2">
                  {vopayLoading ? '...' : formatCurrency(vopayData.todayInterac)}
                </p>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <span className="text-gray-500 text-sm">Volume 7 jours</span>
                <p className="text-2xl font-bold text-gray-900 mt-2">
                  {vopayLoading ? '...' : formatCurrency(vopayData.weeklyVolume)}
                </p>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <span className="text-gray-500 text-sm">Taux de succès</span>
                <p className="text-2xl font-bold text-[#00874e] mt-2">
                  {vopayLoading ? '...' : `${vopayData.successRate}%`}
                </p>
              </div>
            </div>

            {/* Transactions récentes */}
            {!vopayLoading && vopayData.recentTransactions.length > 0 && (
              <div className="bg-white rounded-lg border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-100">
                  <h2 className="font-semibold text-gray-900">Transactions récentes</h2>
                </div>
                <div className="divide-y divide-gray-100">
                  {vopayData.recentTransactions.map((tx, i) => {
                    const status = (tx.TransactionStatus || '').toLowerCase()
                    const amount = parseFloat(tx.CreditAmount || '0') - parseFloat(tx.DebitAmount || '0')
                    return (
                      <div key={i} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50">
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            status.includes('completed') || status.includes('success') ? 'bg-[#e8f5e9]' :
                            status.includes('pending') ? 'bg-blue-50' :
                            'bg-red-50'
                          }`}>
                            {(status.includes('completed') || status.includes('success')) && <CheckCircle size={18} className="text-[#00874e]" />}
                            {status.includes('pending') && <Clock size={18} className="text-blue-600" />}
                            {(status.includes('failed') || status.includes('error') || status.includes('cancelled')) && <XCircle size={18} className="text-red-500" />}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{tx.TransactionID}</p>
                            <p className="text-sm text-gray-500">{tx.TransactionType} - {tx.FullName}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-gray-900">{formatCurrency(amount)}</p>
                          <p className="text-sm text-gray-400">{new Date(tx.TransactionDateTime).toLocaleString('fr-CA')}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {!vopayLoading && !vopayError && vopayData.balance === 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <h2 className="font-semibold text-blue-900 mb-2">Données VoPay chargées</h2>
                <p className="text-blue-700">Les statistiques VoPay sont maintenant connectées en temps réel.</p>
              </div>
            )}
          </div>
        )}

        {/* Margill View */}
        {selectedView === 'margill' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-2xl font-semibold text-[#003d2c]">Margill</h1>
                <p className="text-gray-500 mt-1">Gestion des prets et collections</p>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-8 text-center">
              <FileText size={48} className="text-blue-600 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-blue-900 mb-2">Integration Margill à venir</h2>
              <p className="text-blue-700 mb-6">
                L'integration avec Margill n'est pas encore disponible.<br />
                Cette section affichera les donnees de prets, collections et calendriers de paiements.
              </p>
              <div className="grid grid-cols-2 gap-4 max-w-2xl mx-auto">
                <div className="bg-white rounded-lg p-4 border border-blue-200">
                  <p className="text-sm text-gray-500 mb-1">À implémenter</p>
                  <p className="font-semibold text-gray-900">API Margill</p>
                </div>
                <div className="bg-white rounded-lg p-4 border border-blue-200">
                  <p className="text-sm text-gray-500 mb-1">À implémenter</p>
                  <p className="font-semibold text-gray-900">Synchronisation automatique</p>
                </div>
                <div className="bg-white rounded-lg p-4 border border-blue-200">
                  <p className="text-sm text-gray-500 mb-1">À implémenter</p>
                  <p className="font-semibold text-gray-900">Gestion des NSF</p>
                </div>
                <div className="bg-white rounded-lg p-4 border border-blue-200">
                  <p className="text-sm text-gray-500 mb-1">À implémenter</p>
                  <p className="font-semibold text-gray-900">Rapports mensuels</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Email Preview Modal */}
      {previewEmail && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-semibold text-gray-900 truncate">{previewEmail.subject}</h2>
                <p className="text-sm text-gray-500 mt-1">
                  À: {previewEmail.to} • {new Date(previewEmail.date).toLocaleString('fr-CA')}
                </p>
              </div>
              <button
                onClick={() => setPreviewEmail(null)}
                className="ml-4 p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            {/* Email Content */}
            <div className="flex-1 overflow-auto p-6 bg-gray-50">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <iframe
                  srcDoc={previewEmail.content}
                  sandbox="allow-same-origin"
                  className="w-full h-[600px] border-0"
                  title="Email Preview"
                />
              </div>
            </div>

            {/* Footer Actions */}
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between bg-gray-50">
              <span className={`text-xs px-3 py-1.5 rounded-full font-semibold ${
                previewEmail.type === 'system' ? 'bg-purple-100 text-purple-700' :
                previewEmail.type === 'manual' ? 'bg-blue-100 text-blue-700' :
                'bg-gray-100 text-gray-700'
              }`}>
                {previewEmail.type === 'system' ? '🤖 Email Automatique' : '✍️ Email Manuel'}
              </span>
              <button
                onClick={() => setPreviewEmail(null)}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition-colors font-medium"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-4">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <p className="text-gray-500 text-sm">
            © {new Date().getFullYear()} Solution Argent Rapide. Tous droits reserves.
          </p>
        </div>
      </footer>
    </div>
  )
}
