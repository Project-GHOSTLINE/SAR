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
  assigned_to?: string
  assigned_at?: string
  assigned_by?: string
  system_responded?: boolean
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

// Couleur selon l'option (badge)
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

// Couleur selon l'option (bouton filtre)
function getOptionButtonColor(option: string, isSelected: boolean): string {
  const colors: Record<string, { selected: string, normal: string }> = {
    'Reporter un paiement': {
      selected: 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md',
      normal: 'bg-blue-100 text-blue-700 hover:bg-blue-200'
    },
    'Reduire mes paiements': {
      selected: 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-md',
      normal: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
    },
    'Signaler un changement': {
      selected: 'bg-gradient-to-r from-violet-500 to-violet-600 text-white shadow-md',
      normal: 'bg-violet-100 text-violet-700 hover:bg-violet-200'
    },
    'Releve ou solde de compte': {
      selected: 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-md',
      normal: 'bg-amber-100 text-amber-700 hover:bg-amber-200'
    },
    'Arrangement de paiement': {
      selected: 'bg-gradient-to-r from-rose-500 to-rose-600 text-white shadow-md',
      normal: 'bg-rose-100 text-rose-700 hover:bg-rose-200'
    },
    'Ou en est ma demande de credit?': {
      selected: 'bg-gradient-to-r from-sky-500 to-sky-600 text-white shadow-md',
      normal: 'bg-sky-100 text-sky-700 hover:bg-sky-200'
    },
    'Je veux annuler ma demande': {
      selected: 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-md',
      normal: 'bg-red-100 text-red-700 hover:bg-red-200'
    },
    'Question sur mon remboursement': {
      selected: 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-md',
      normal: 'bg-orange-100 text-orange-700 hover:bg-orange-200'
    },
    'Autre question': {
      selected: 'bg-gradient-to-r from-gray-500 to-gray-600 text-white shadow-md',
      normal: 'bg-gray-100 text-gray-700 hover:bg-gray-200'
    }
  }

  const colorSet = colors[option] || {
    selected: 'bg-gradient-to-r from-gray-500 to-gray-600 text-white shadow-md',
    normal: 'bg-gray-100 text-gray-700 hover:bg-gray-200'
  }

  return isSelected ? colorSet.selected : colorSet.normal
}

export default function AdminDashboard() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [stats, setStats] = useState({ total: 0, nonLus: 0 })
  const [messageStats, setMessageStats] = useState({
    totalDuMois: 0,
    reponsesEnvoyees: 0,
    reponsesNonEnvoyees: 0,
    acheminesSandra: 0,
    acheminesMichel: 0,
    nonAchemines: 0,
    byColleague: {} as Record<string, number>
  })
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

  // Vue pour transactions récentes
  const [txView, setTxView] = useState<'all' | 'deposits' | 'withdrawals'>('all')

  // Filtre pour messages stats
  type MessageFilterType = 'all' | 'reponses' | 'sandra' | 'michel' | 'none' | 'no_response'
  const [messageFilter, setMessageFilter] = useState<MessageFilterType>('all')
  const [messageSubFilter, setMessageSubFilter] = useState<string | null>(null)

  // Helper pour changer le filtre et réinitialiser le sous-filtre
  const changeMessageFilter = (newFilter: MessageFilterType) => {
    setMessageFilter(newFilter)
    setMessageSubFilter(null) // Reset sub-filter when main filter changes
  }

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

  const fetchMessageStats = async () => {
    try {
      console.log('🔄 Chargement des stats messages...')
      const res = await fetch('/api/admin/messages/assign', { credentials: 'include' })
      console.log('📡 Réponse API stats:', res.status)

      if (res.ok) {
        const data = await res.json()
        console.log('📊 Données stats reçues:', data)

        if (data.success && data.stats) {
          console.log('✅ Mise à jour des stats:', data.stats)
          setMessageStats(data.stats)
        } else {
          console.warn('⚠️ Format de réponse inattendu:', data)
        }
      } else {
        console.error('❌ Erreur API stats:', res.status, await res.text())
      }
    } catch (error) {
      console.error('❌ Erreur stats:', error)
    }
  }

  const assignMessage = async (messageId: string, assignTo: string) => {
    try {
      const res = await fetch('/api/admin/messages/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ messageId, assignTo })
      })

      if (res.ok) {
        // Rafraîchir les données
        await Promise.all([fetchMessages(), fetchMessageStats()])

        // Mettre à jour le message sélectionné si c'est le même
        if (selectedMessage && selectedMessage.id === messageId) {
          const updatedMessage = messages.find(m => m.id === messageId)
          if (updatedMessage) {
            setSelectedMessage({
              ...updatedMessage,
              assigned_to: assignTo === 'Unassigned' ? undefined : assignTo,
              assigned_at: new Date().toISOString()
            })
          }
        }
      }
    } catch (error) {
      console.error('Erreur assignation:', error)
    }
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
    fetchMessageStats()
    fetchVopayData()
    fetchWebhookStats()
    const interval = setInterval(() => {
      fetchMessages()
      fetchMessageStats()
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

                {/* View Buttons */}
                {webhookStats?.recentTransactions && webhookStats.recentTransactions.length > 0 && (
                  <div className="px-6 py-3 bg-gray-50 border-b border-gray-100">
                    <div className="flex gap-2">
                      <button
                        onClick={() => setTxView('all')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                          txView === 'all'
                            ? 'bg-[#00874e] text-white shadow-md'
                            : 'bg-white text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        Tous
                      </button>
                      <button
                        onClick={() => setTxView('deposits')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                          txView === 'deposits'
                            ? 'bg-emerald-600 text-white shadow-md'
                            : 'bg-white text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        Entrées
                      </button>
                      <button
                        onClick={() => setTxView('withdrawals')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                          txView === 'withdrawals'
                            ? 'bg-red-600 text-white shadow-md'
                            : 'bg-white text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        Sorties
                      </button>
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
                      // Filtrer selon la vue active
                      let filteredTx = webhookStats.recentTransactions

                      if (txView !== 'all') {
                        filteredTx = webhookStats.recentTransactions.filter((tx: any) => {
                          const txType = (tx.transaction_type || '').toLowerCase()
                          const isDeposit = txType.includes('deposit') || txType.includes('credit') || txType.includes('payment')
                          const isWithdrawal = txType.includes('withdrawal') || txType.includes('reversal') || txType.includes('fee') || txType.includes('debit')

                          if (txView === 'deposits') return isDeposit
                          if (txView === 'withdrawals') return isWithdrawal
                          return true
                        })
                      }

                      // Limiter à 10 transactions
                      return filteredTx.slice(0, 10).map((tx: any, i: number) => {
                        const status = tx.status.toLowerCase()
                        const isSuccessful = status === 'successful'
                        const isFailed = status === 'failed'
                        const isPending = status === 'pending' || status === 'in progress'

                        // Déterminer si c'est une entrée ou sortie
                        const txType = (tx.transaction_type || '').toLowerCase()
                        const isDeposit = txType.includes('deposit') || txType.includes('credit') || txType.includes('payment')
                        const isWithdrawal = txType.includes('withdrawal') || txType.includes('reversal') || txType.includes('fee') || txType.includes('debit')

                        return (
                          <div key={tx.id || i} className={`px-6 py-4 flex items-center justify-between hover:bg-gradient-to-r hover:from-gray-50 hover:to-transparent transition-all duration-200 cursor-pointer group border-l-4 ${
                            isDeposit ? 'border-l-emerald-500 bg-emerald-50/30' :
                            isWithdrawal ? 'border-l-red-500 bg-red-50/30' :
                            'border-l-gray-300'
                          }`}>
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
                  onClick={() => { fetchMessages(); fetchMessageStats(); }}
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-all shadow-sm hover:shadow hover:scale-105"
                >
                  <RefreshCw size={16} />
                  Actualiser
                </button>
              </div>

              {/* Statistiques Messages - Ligne fluide avec 5 cartes */}
              <div className="flex gap-3 mb-6 overflow-x-auto pb-2">
                {/* Tous */}
                <button
                  onClick={() => changeMessageFilter('all')}
                  className={`min-w-[180px] rounded-2xl p-5 transition-all hover:shadow-xl hover:scale-105 ${
                    messageFilter === 'all'
                      ? 'bg-gradient-to-br from-blue-400 via-blue-500 to-blue-600 shadow-lg'
                      : 'bg-gradient-to-br from-blue-50 via-blue-100 to-blue-200'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      messageFilter === 'all' ? 'bg-white/30' : 'bg-blue-300'
                    }`}>
                      <MessageSquare size={20} className={messageFilter === 'all' ? 'text-white' : 'text-blue-700'} />
                    </div>
                    <p className={`text-3xl font-bold ${messageFilter === 'all' ? 'text-white' : 'text-blue-900'}`}>
                      {messageStats.totalDuMois}
                    </p>
                  </div>
                  <p className={`text-sm font-semibold ${messageFilter === 'all' ? 'text-white' : 'text-blue-700'}`}>
                    Tous
                  </p>
                </button>

                {/* Réponses Envoyées */}
                <button
                  onClick={() => changeMessageFilter(messageFilter === 'reponses' ? 'all' : 'reponses')}
                  className={`min-w-[200px] rounded-2xl p-5 transition-all hover:shadow-xl hover:scale-105 ${
                    messageFilter === 'reponses'
                      ? 'bg-gradient-to-br from-green-400 via-green-500 to-green-600 shadow-lg'
                      : 'bg-gradient-to-br from-green-50 via-green-100 to-green-200'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      messageFilter === 'reponses' ? 'bg-white/30' : 'bg-green-300'
                    }`}>
                      <CheckCircle size={20} className={messageFilter === 'reponses' ? 'text-white' : 'text-green-700'} />
                    </div>
                    <p className={`text-3xl font-bold ${messageFilter === 'reponses' ? 'text-white' : 'text-green-900'}`}>
                      {messageStats.reponsesEnvoyees}
                    </p>
                  </div>
                  <p className={`text-sm font-semibold ${messageFilter === 'reponses' ? 'text-white' : 'text-green-700'}`}>
                    Réponses envoyées
                  </p>
                </button>

                {/* Sandra */}
                <button
                  onClick={() => changeMessageFilter(messageFilter === 'sandra' ? 'all' : 'sandra')}
                  className={`min-w-[180px] rounded-2xl p-5 transition-all hover:shadow-xl hover:scale-105 ${
                    messageFilter === 'sandra'
                      ? 'bg-gradient-to-br from-pink-400 via-pink-500 to-pink-600 shadow-lg'
                      : 'bg-gradient-to-br from-pink-50 via-pink-100 to-pink-200'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      messageFilter === 'sandra' ? 'bg-white/30' : 'bg-pink-300'
                    }`}>
                      <User size={20} className={messageFilter === 'sandra' ? 'text-white' : 'text-pink-700'} />
                    </div>
                    <p className={`text-3xl font-bold ${messageFilter === 'sandra' ? 'text-white' : 'text-pink-900'}`}>
                      {messageStats.acheminesSandra}
                    </p>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className={`text-sm font-semibold ${messageFilter === 'sandra' ? 'text-white' : 'text-pink-700'}`}>
                      Sandra
                    </p>
                    {messageStats.acheminesSandra === 0 && (
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                        messageFilter === 'sandra' ? 'bg-white/30 text-white' : 'bg-pink-300 text-pink-800'
                      }`}>
                        À configurer!
                      </span>
                    )}
                  </div>
                </button>

                {/* Michel */}
                <button
                  onClick={() => changeMessageFilter(messageFilter === 'michel' ? 'all' : 'michel')}
                  className={`min-w-[180px] rounded-2xl p-5 transition-all hover:shadow-xl hover:scale-105 ${
                    messageFilter === 'michel'
                      ? 'bg-gradient-to-br from-indigo-400 via-indigo-500 to-indigo-600 shadow-lg'
                      : 'bg-gradient-to-br from-indigo-50 via-indigo-100 to-indigo-200'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      messageFilter === 'michel' ? 'bg-white/30' : 'bg-indigo-300'
                    }`}>
                      <User size={20} className={messageFilter === 'michel' ? 'text-white' : 'text-indigo-700'} />
                    </div>
                    <p className={`text-3xl font-bold ${messageFilter === 'michel' ? 'text-white' : 'text-indigo-900'}`}>
                      {messageStats.acheminesMichel}
                    </p>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className={`text-sm font-semibold ${messageFilter === 'michel' ? 'text-white' : 'text-indigo-700'}`}>
                      Michel
                    </p>
                    {messageStats.acheminesMichel === 0 && (
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                        messageFilter === 'michel' ? 'bg-white/30 text-white' : 'bg-indigo-300 text-indigo-800'
                      }`}>
                        À configurer!
                      </span>
                    )}
                  </div>
                </button>

                {/* Non Acheminés */}
                <button
                  onClick={() => changeMessageFilter(messageFilter === 'none' ? 'all' : 'none')}
                  className={`min-w-[200px] rounded-2xl p-5 transition-all hover:shadow-xl hover:scale-105 ${
                    messageFilter === 'none'
                      ? 'bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 shadow-lg'
                      : 'bg-gradient-to-br from-amber-50 via-amber-100 to-amber-200'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      messageFilter === 'none' ? 'bg-white/30' : 'bg-amber-300'
                    }`}>
                      <AlertTriangle size={20} className={messageFilter === 'none' ? 'text-white' : 'text-amber-700'} />
                    </div>
                    <p className={`text-3xl font-bold ${messageFilter === 'none' ? 'text-white' : 'text-amber-900'}`}>
                      {messageStats.nonAchemines}
                    </p>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className={`text-sm font-semibold ${messageFilter === 'none' ? 'text-white' : 'text-amber-700'}`}>
                      Non acheminés
                    </p>
                    {messageStats.nonAchemines === 0 && (
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                        messageFilter === 'none' ? 'bg-white/30 text-white' : 'bg-green-300 text-green-800'
                      }`}>
                        Tout assigné!
                      </span>
                    )}
                  </div>
                </button>
              </div>

              {/* Filtres par Type de Demande */}
              {(() => {
                const uniqueOptions = Array.from(
                  new Set(
                    messages
                      .map(msg => extractOptionFromMessage(msg.question).option)
                      .filter(opt => opt !== null)
                  )
                ).sort()

                if (uniqueOptions.length === 0) return null

                // Compter les messages "Autres demandes" (ceux sans option)
                const autresCount = messages.filter(msg => !extractOptionFromMessage(msg.question).option).length

                return (
                  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
                    <p className="text-sm font-semibold text-gray-700 mb-3">Filtrer par type de demande:</p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => setMessageSubFilter(null)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                          messageSubFilter === null
                            ? 'bg-gradient-to-r from-[#00874e] to-emerald-600 text-white shadow-md'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        Tous les types
                      </button>
                      {uniqueOptions.map((option) => (
                        <button
                          key={option}
                          onClick={() => setMessageSubFilter(option)}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${getOptionButtonColor(option, messageSubFilter === option)}`}
                        >
                          {option}
                        </button>
                      ))}
                      {autresCount > 0 && (
                        <button
                          onClick={() => setMessageSubFilter('__autres__')}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                            messageSubFilter === '__autres__'
                              ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-md'
                              : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                          }`}
                        >
                          Autres demandes ({autresCount})
                        </button>
                      )}
                    </div>
                  </div>
                )
              })()}

              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="divide-y divide-gray-100">
                  {messages
                    .filter((msg) => {
                      // Filtrer selon le filtre actif
                      if (messageFilter === 'all') return true
                      if (messageFilter === 'reponses') return msg.system_responded === true
                      if (messageFilter === 'sandra') return msg.assigned_to === 'Sandra'
                      if (messageFilter === 'michel') return msg.assigned_to === 'Michel'
                      if (messageFilter === 'none') return !msg.assigned_to || msg.assigned_to === null
                      if (messageFilter === 'no_response') return !msg.system_responded
                      return true
                    })
                    .filter((msg) => {
                      // Sous-filtre par option/sujet
                      if (!messageSubFilter) return true
                      const { option } = extractOptionFromMessage(msg.question)
                      // Cas spécial: "Autres demandes" = messages sans option
                      if (messageSubFilter === '__autres__') return !option
                      return option === messageSubFilter
                    })
                    .map((msg) => {
                    const { option, message: cleanMsg } = extractOptionFromMessage(msg.question)

                    // Définir les couleurs selon le filtre actif
                    const filterColors = {
                      hover: messageFilter === 'reponses' ? 'hover:from-green-50' :
                             messageFilter === 'sandra' ? 'hover:from-pink-50' :
                             messageFilter === 'michel' ? 'hover:from-indigo-50' :
                             messageFilter === 'none' ? 'hover:from-amber-50' :
                             messageFilter === 'no_response' ? 'hover:from-red-50' :
                             'hover:from-gray-50',
                      selected: messageFilter === 'reponses' ? 'ring-green-500 bg-green-50/30' :
                                messageFilter === 'sandra' ? 'ring-pink-500 bg-pink-50/30' :
                                messageFilter === 'michel' ? 'ring-indigo-500 bg-indigo-50/30' :
                                messageFilter === 'none' ? 'ring-amber-500 bg-amber-50/30' :
                                messageFilter === 'no_response' ? 'ring-red-500 bg-red-50/30' :
                                'ring-[#00874e] bg-emerald-50/30',
                      avatarBg: messageFilter === 'reponses' ? 'from-green-100 to-green-200' :
                                messageFilter === 'sandra' ? 'from-pink-100 to-pink-200' :
                                messageFilter === 'michel' ? 'from-indigo-100 to-indigo-200' :
                                messageFilter === 'none' ? 'from-amber-100 to-amber-200' :
                                messageFilter === 'no_response' ? 'from-red-100 to-red-200' :
                                'from-[#e8f5e9] to-emerald-100',
                      avatarText: messageFilter === 'reponses' ? 'text-green-700' :
                                  messageFilter === 'sandra' ? 'text-pink-700' :
                                  messageFilter === 'michel' ? 'text-indigo-700' :
                                  messageFilter === 'none' ? 'text-amber-700' :
                                  messageFilter === 'no_response' ? 'text-red-700' :
                                  'text-[#00874e]'
                    }

                    return (
                      <div
                        key={msg.id}
                        onClick={() => {
                          // Toggle: si déjà sélectionné, fermer, sinon ouvrir
                          if (selectedMessage?.id === msg.id) {
                            closeDetail()
                          } else {
                            fetchMessageDetails(msg)
                          }
                        }}
                        className={`px-6 py-5 hover:bg-gradient-to-r ${filterColors.hover} hover:to-transparent transition-all cursor-pointer group ${!msg.lu ? 'bg-gradient-to-r from-blue-50/30 to-transparent' : ''} ${selectedMessage?.id === msg.id ? `ring-2 ${filterColors.selected} ring-inset` : ''}`}
                      >
                        <div className="flex items-start gap-4">
                          <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${filterColors.avatarBg} flex items-center justify-center text-sm font-bold ${filterColors.avatarText} group-hover:scale-110 transition-transform shadow-sm`}>
                            {msg.nom.split(' ').map(n => n[0]).join('').slice(0, 2)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                              <p className="font-semibold text-gray-900">{msg.nom}</p>
                              <span className="text-xs px-2 py-1 rounded-lg bg-gray-100 text-gray-500 font-mono font-semibold">#{msg.reference}</span>
                              {!msg.lu && (
                                <span className="text-xs px-2 py-1 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 text-white font-bold shadow-sm">Nouveau</span>
                              )}
                              {msg.system_responded ? (
                                <span className="text-xs px-2 py-1 rounded-full bg-gradient-to-r from-green-100 to-green-200 text-green-700 font-semibold flex items-center gap-1">
                                  <CheckCircle size={12} />
                                  Répondu
                                </span>
                              ) : (
                                <span className="text-xs px-2 py-1 rounded-full bg-gradient-to-r from-amber-100 to-amber-200 text-amber-700 font-semibold flex items-center gap-1">
                                  <Clock size={12} />
                                  En attente
                                </span>
                              )}
                              {msg.assigned_to && (
                                <span className={`text-xs px-2 py-1 rounded-full font-semibold flex items-center gap-1 ${
                                  msg.assigned_to === 'Sandra'
                                    ? 'bg-gradient-to-r from-pink-100 to-pink-200 text-pink-700'
                                    : 'bg-gradient-to-r from-indigo-100 to-indigo-200 text-indigo-700'
                                }`}>
                                  <User size={12} />
                                  {msg.assigned_to}
                                </span>
                              )}
                              {selectedMessage?.id === msg.id && (
                                <span className="text-xs px-2 py-1 rounded-full bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold shadow-md animate-pulse flex items-center gap-1">
                                  <ChevronRight size={12} />
                                  Ouvert
                                </span>
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
              <div
                onClick={closeDetail}
                className="w-1/2 bg-white rounded-xl shadow-lg border border-gray-100 sticky top-24 h-fit max-h-[calc(100vh-120px)] overflow-auto cursor-pointer"
              >
                {/* Header */}
                <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-white border-b border-gray-100 flex items-center justify-between sticky top-0 z-10 rounded-t-xl">
                  <h2 className="font-bold text-gray-900 flex items-center gap-2">
                    <MessageSquare size={18} className="text-[#00874e]" />
                    Details du message
                  </h2>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      closeDetail()
                    }}
                    className="flex items-center gap-2 px-3 py-2 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg transition-all hover:scale-105 border border-red-200 hover:border-red-300"
                  >
                    <X size={20} />
                    <span className="text-sm font-medium">Fermer</span>
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
                              <a
                                href={`mailto:${selectedMessage.email}`}
                                onClick={(e) => e.stopPropagation()}
                                className="text-gray-900 font-medium hover:text-[#00874e]"
                              >
                                {selectedMessage.email || 'Non fourni'}
                              </a>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 p-3 bg-white rounded-lg">
                            <Phone size={18} className="text-[#00874e]" />
                            <div>
                              <p className="text-xs text-gray-500">Telephone</p>
                              <a
                                href={`tel:${selectedMessage.telephone}`}
                                onClick={(e) => e.stopPropagation()}
                                className="text-gray-900 font-medium hover:text-[#00874e]"
                              >
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

                    {/* Assignation et Réponse Système */}
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-5 border border-blue-100">
                      <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <Users size={14} />
                        Gestion du Message
                      </h3>

                      {/* Statut Réponse Système */}
                      <div className="mb-4 p-3 bg-white rounded-lg">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600 font-medium">Réponse Système</span>
                          {selectedMessage.system_responded ? (
                            <span className="text-sm px-3 py-1 rounded-full bg-gradient-to-r from-green-100 to-green-200 text-green-700 font-semibold flex items-center gap-1">
                              <CheckCircle size={14} />
                              Envoyée
                            </span>
                          ) : (
                            <span className="text-sm px-3 py-1 rounded-full bg-gradient-to-r from-amber-100 to-amber-200 text-amber-700 font-semibold flex items-center gap-1">
                              <Clock size={14} />
                              En attente
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Assignation Actuelle */}
                      {selectedMessage.assigned_to && (
                        <div className="mb-4 p-3 bg-white rounded-lg">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600 font-medium">Assigné à</span>
                            <span className={`text-sm px-3 py-1 rounded-full font-semibold flex items-center gap-1 ${
                              selectedMessage.assigned_to === 'Sandra'
                                ? 'bg-gradient-to-r from-pink-100 to-pink-200 text-pink-700'
                                : 'bg-gradient-to-r from-indigo-100 to-indigo-200 text-indigo-700'
                            }`}>
                              <User size={14} />
                              {selectedMessage.assigned_to}
                            </span>
                          </div>
                          {selectedMessage.assigned_at && (
                            <p className="text-xs text-gray-500 mt-2">
                              Assigné le {new Date(selectedMessage.assigned_at).toLocaleString('fr-CA')}
                            </p>
                          )}
                        </div>
                      )}

                      {/* Boutons d'Assignation */}
                      <div className="space-y-2">
                        <p className="text-xs text-gray-600 font-medium mb-3">Assigner à un collègue:</p>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              assignMessage(selectedMessage.id, 'Sandra')
                            }}
                            disabled={selectedMessage.assigned_to === 'Sandra'}
                            className={`px-4 py-3 rounded-lg text-sm font-semibold transition-all ${
                              selectedMessage.assigned_to === 'Sandra'
                                ? 'bg-pink-200 text-pink-800 cursor-not-allowed'
                                : 'bg-gradient-to-r from-pink-500 to-pink-600 text-white hover:from-pink-600 hover:to-pink-700 shadow-md hover:shadow-lg transform hover:scale-105'
                            }`}
                          >
                            <div className="flex items-center justify-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-white/30 flex items-center justify-center text-xs font-bold">
                                S
                              </div>
                              Sandra
                            </div>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              assignMessage(selectedMessage.id, 'Michel')
                            }}
                            disabled={selectedMessage.assigned_to === 'Michel'}
                            className={`px-4 py-3 rounded-lg text-sm font-semibold transition-all ${
                              selectedMessage.assigned_to === 'Michel'
                                ? 'bg-indigo-200 text-indigo-800 cursor-not-allowed'
                                : 'bg-gradient-to-r from-indigo-500 to-indigo-600 text-white hover:from-indigo-600 hover:to-indigo-700 shadow-md hover:shadow-lg transform hover:scale-105'
                            }`}
                          >
                            <div className="flex items-center justify-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-white/30 flex items-center justify-center text-xs font-bold">
                                M
                              </div>
                              Michel
                            </div>
                          </button>
                        </div>
                        {selectedMessage.assigned_to && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              assignMessage(selectedMessage.id, 'Unassigned')
                            }}
                            className="w-full px-4 py-2 rounded-lg text-sm font-medium bg-white text-gray-700 hover:bg-gray-50 border border-gray-200 transition-all"
                          >
                            Retirer l'assignation
                          </button>
                        )}
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

                    {/* Analyse Intelligente et Suggestions */}
                    <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl p-5 border border-purple-200">
                      <h3 className="text-sm font-semibold text-purple-700 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                        Analyse Intelligente
                      </h3>

                      <div className="space-y-3">
                        {/* Statut Assignation */}
                        {!selectedMessage.assigned_to && (
                          <div className="bg-amber-100 border-l-4 border-amber-500 rounded-lg p-3">
                            <div className="flex items-start gap-2">
                              <AlertTriangle size={16} className="text-amber-700 mt-0.5 flex-shrink-0" />
                              <div>
                                <p className="text-sm font-semibold text-amber-900">Message non acheminé</p>
                                <p className="text-xs text-amber-800 mt-1">Ce message n'a pas encore été assigné à un collègue. Utilisez les boutons ci-dessus pour l'acheminer à Sandra ou Michel.</p>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Analyse des données techniques */}
                        {!selectedMessage.client_ip && !selectedMessage.client_device && !selectedMessage.client_browser && (
                          <div className="bg-blue-100 border-l-4 border-blue-500 rounded-lg p-3">
                            <div className="flex items-start gap-2">
                              <svg className="w-4 h-4 text-blue-700 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <div>
                                <p className="text-sm font-semibold text-blue-900">Données techniques manquantes</p>
                                <p className="text-xs text-blue-800 mt-1">Ce message a été reçu avant l'implémentation du système de tracking technique. Les nouveaux messages capturent automatiquement l'IP, le browser, l'OS et l'appareil utilisé.</p>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Suggestions basées sur l'appareil */}
                        {selectedMessage.client_device === 'Mobile' && (
                          <div className="bg-green-100 border-l-4 border-green-500 rounded-lg p-3">
                            <div className="flex items-start gap-2">
                              <CheckCircle size={16} className="text-green-700 mt-0.5 flex-shrink-0" />
                              <div>
                                <p className="text-sm font-semibold text-green-900">Utilisateur mobile détecté</p>
                                <p className="text-xs text-green-800 mt-1">Client utilise un appareil mobile. Assurez-vous que toute réponse avec liens soit optimisée pour mobile.</p>
                              </div>
                            </div>
                          </div>
                        )}

                        {selectedMessage.client_device === 'Desktop' && selectedMessage.client_os === 'Windows' && (
                          <div className="bg-indigo-100 border-l-4 border-indigo-500 rounded-lg p-3">
                            <div className="flex items-start gap-2">
                              <svg className="w-4 h-4 text-indigo-700 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                              </svg>
                              <div>
                                <p className="text-sm font-semibold text-indigo-900">Desktop Windows</p>
                                <p className="text-xs text-indigo-800 mt-1">Client utilise un ordinateur Windows. Idéal pour partager des documents PDF ou des formulaires détaillés.</p>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Analyse Browser */}
                        {selectedMessage.client_browser === 'Safari' && selectedMessage.client_os === 'iOS' && (
                          <div className="bg-pink-100 border-l-4 border-pink-500 rounded-lg p-3">
                            <div className="flex items-start gap-2">
                              <Phone size={16} className="text-pink-700 mt-0.5 flex-shrink-0" />
                              <div>
                                <p className="text-sm font-semibold text-pink-900">Utilisateur iPhone/iPad</p>
                                <p className="text-xs text-pink-800 mt-1">Safari sur iOS détecté. Privilégiez les appels téléphoniques directs via liens tel: dans vos réponses.</p>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Analyse Langue */}
                        {selectedMessage.client_language && !selectedMessage.client_language.toLowerCase().startsWith('fr') && (
                          <div className="bg-yellow-100 border-l-4 border-yellow-500 rounded-lg p-3">
                            <div className="flex items-start gap-2">
                              <svg className="w-4 h-4 text-yellow-700 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                              </svg>
                              <div>
                                <p className="text-sm font-semibold text-yellow-900">Langue non-française détectée</p>
                                <p className="text-xs text-yellow-800 mt-1">Le navigateur du client est configuré en <strong>{selectedMessage.client_language}</strong>. Considérez une réponse bilingue ou vérifiez la préférence linguistique.</p>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Tracking UTM Campaign */}
                        {(selectedMessage.utm_source || selectedMessage.utm_campaign) && (
                          <div className="bg-teal-100 border-l-4 border-teal-500 rounded-lg p-3">
                            <div className="flex items-start gap-2">
                              <svg className="w-4 h-4 text-teal-700 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                              </svg>
                              <div>
                                <p className="text-sm font-semibold text-teal-900">Source trackée : Campagne Marketing</p>
                                <p className="text-xs text-teal-800 mt-1">
                                  Ce client provient d'une campagne marketing trackée
                                  {selectedMessage.utm_source && <> (<strong>{selectedMessage.utm_source}</strong>)</>}.
                                  Assurez un suivi prioritaire pour maximiser le ROI de la campagne.
                                </p>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Réponse système envoyée */}
                        {selectedMessage.system_responded && (
                          <div className="bg-emerald-100 border-l-4 border-emerald-500 rounded-lg p-3">
                            <div className="flex items-start gap-2">
                              <CheckCircle size={16} className="text-emerald-700 mt-0.5 flex-shrink-0" />
                              <div>
                                <p className="text-sm font-semibold text-emerald-900">Email de confirmation envoyé</p>
                                <p className="text-xs text-emerald-800 mt-1">Le client a reçu un email automatique de confirmation. Veillez à répondre dans les 24-48h ouvrables tel qu'indiqué dans la confirmation.</p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

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
          <p className="text-gray-500 text-sm" suppressHydrationWarning>
            © {new Date().getFullYear()} Solution Argent Rapide. Tous droits reserves.
          </p>
        </div>
      </footer>
    </div>
  )
}
