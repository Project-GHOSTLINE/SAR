'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  LogOut, TrendingUp, TrendingDown, Users, FileText,
  AlertTriangle, RefreshCw, Activity, Bell, Mail,
  Phone, ChevronRight, MoreHorizontal, Search, Loader2,
  DollarSign, Calendar, Clock, CheckCircle, XCircle,
  X, User, Send, MessageSquare, Tag, ExternalLink,
  Monitor, Smartphone, Globe, Chrome, MapPin, Languages,
  Maximize2, Link2, TrendingUp as Campaign, Target, Download, Trash2
} from 'lucide-react'
import AdminSidebar from '@/components/admin/AdminSidebar'
import SupportView from '@/components/admin/SupportView'
import AnalysesView from '@/components/admin/AnalysesView'
import VoPayMetricsTab from '@/components/admin/VoPayMetricsTab'
import DevOpsView from '@/components/admin/DevOpsView'

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

// Formatter le nom: Prénom NOM (premier mot normal, reste en majuscules)
function formatClientName(fullName: string): string {
  if (!fullName || fullName.trim() === '') return fullName

  // Split sur espaces multiples et filtrer les vides
  const parts = fullName.trim().split(/\s+/).filter(p => p.length > 0)

  if (parts.length === 0) return fullName

  // Si un seul mot, le capitaliser normalement
  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase() + parts[0].slice(1).toLowerCase()
  }

  // Premier mot = Prénom (capitalize normalement)
  const firstName = parts[0].charAt(0).toUpperCase() + parts[0].slice(1).toLowerCase()

  // Reste = Nom de famille (tout en majuscules)
  const lastName = parts.slice(1).join(' ').toUpperCase()

  return `${firstName} ${lastName}`
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

  // Detecter Page Nous Joindre
  if (!source && question.includes('[Page Nous Joindre]')) {
    source = 'Page Nous Joindre'
    cleanMessage = question.replace(/\[Page Nous Joindre\]\s*/g, '').trim()

    // Extraire l'option si présente (entre crochets)
    const optionMatch = cleanMessage.match(/\[([^\]]+)\]/)
    if (optionMatch) {
      option = optionMatch[1]
      cleanMessage = cleanMessage.replace(/\[[^\]]+\]\s*/g, '').trim()
    }
  }

  // Nettoyer les infos de contact redondantes du message
  cleanMessage = cleanMessage
    .replace(/^Téléphone:\s*\d+\s*/i, '')
    .replace(/^Email:\s*[\w.-]+@[\w.-]+\.\w+\s*/i, '')
    .trim()

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
    'Formulaire Contact': 'bg-cyan-100 text-cyan-700',
    'Page Nous Joindre': 'bg-emerald-100 text-emerald-700'
  }
  return colors[source] || 'bg-gray-100 text-gray-600'
}

// Formatter la date du dernier message
function formatLastMessageDate(dateString: string | null): string {
  if (!dateString) return 'Aucun message'

  const now = new Date()
  const date = new Date(dateString)
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'À l\'instant'
  if (diffMins < 60) return `Il y a ${diffMins} min`
  if (diffHours < 24) return `Il y a ${diffHours}h`
  if (diffDays === 1) return 'Hier'

  // Format: "7 jan, 19h27"
  const options: Intl.DateTimeFormatOptions = {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }
  return date.toLocaleDateString('fr-CA', options).replace(',', ' à')
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

function AdminDashboardContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const selectedView = (searchParams.get('tab') || 'dashboard') as 'dashboard' | 'messages' | 'vopay' | 'margill' | 'support' | 'analyses' | 'devops'

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
    deletedToday: 0,
    lastAll: null as string | null,
    lastReponse: null as string | null,
    lastSandra: null as string | null,
    lastMichel: null as string | null,
    lastNone: null as string | null,
    byColleague: {} as Record<string, number>
  })
  const [currentTime, setCurrentTime] = useState<Date | null>(null)
  const [vopayLoading, setVopayLoading] = useState(false)
  const [vopayError, setVopayError] = useState<string | null>(null)
  const [selectedVoPayTab, setSelectedVoPayTab] = useState<'overview' | 'transactions' | 'releves'>('overview')

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

  // Contrôle des transactions ouvertes (un seul à la fois)
  const [openWebhookTxId, setOpenWebhookTxId] = useState<string | null>(null)
  const [openVopayTxId, setOpenVopayTxId] = useState<string | null>(null)

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

  // Réinitialiser selectedMessage quand on change d'onglet
  useEffect(() => {
    setSelectedMessage(null)
  }, [selectedView])

  // Auto-ouvrir un message depuis l'URL (?open=messageId)
  useEffect(() => {
    const openParam = searchParams.get('open')
    if (openParam && selectedView === 'messages' && messages.length > 0 && !selectedMessage) {
      const messageToOpen = messages.find(m => m.id === openParam)
      if (messageToOpen) {
        fetchMessageDetails(messageToOpen)
      }
    }
  }, [messages, searchParams, selectedView])

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
    router.push('/admin/dashboard?tab=messages')
  }

  const deleteMessage = async (messageId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce message? Cette action est irréversible.')) {
      return
    }

    try {
      const res = await fetch(`/api/admin/messages?id=${messageId}`, {
        method: 'DELETE',
        credentials: 'include'
      })

      if (res.ok) {
        // Fermer le panneau de détails
        closeDetail()
        // Rafraîchir les données
        await Promise.all([fetchMessages(), fetchMessageStats()])
      } else {
        alert('Erreur lors de la suppression du message')
      }
    } catch (error) {
      console.error('Error deleting message:', error)
      alert('Erreur lors de la suppression du message')
    }
  }

  const resendNotification = async (messageId: string, assignedTo?: string) => {
    const recipient = assignedTo || await new Promise<string>((resolve) => {
      const choice = confirm('Envoyer à Sandra? (OK = Sandra, Annuler = Michel)')
      resolve(choice ? 'Sandra' : 'Michel')
    })

    if (!confirm(`Renvoyer la notification à ${recipient}?`)) {
      return
    }

    try {
      const res = await fetch(`/api/admin/messages/resend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ messageId, recipient })
      })

      if (res.ok) {
        alert(`✅ Notification renvoyée à ${recipient}!`)
      } else {
        const data = await res.json()
        alert(`❌ Erreur: ${data.error || 'Impossible de renvoyer'}`)
      }
    } catch (error) {
      console.error('Error resending notification:', error)
      alert('❌ Erreur lors de l\'envoi')
    }
  }

  const fetchMessageStats = async () => {
    try {
      const res = await fetch('/api/admin/messages/assign', { credentials: 'include' })

      if (res.ok) {
        const data = await res.json()

        if (data.success && data.stats) {
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
      fetchVopayData() // ✅ Ajouté pour auto-refresh VoPay
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

  // Déterminer le currentPage pour AdminNav basé sur le tab actif
  const currentPage = selectedView === 'dashboard'
    ? '/admin/dashboard'
    : `/admin/dashboard?tab=${selectedView}`

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-gray-50 to-emerald-50">
      <AdminSidebar currentPage={currentPage} />

      {/* Main Content - Adjusted for sidebar */}
      <main className="lg:pl-64 pt-16 lg:pt-0 min-h-screen">
        <div className="max-w-[1440px] mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
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

              {/* Volume Aujourd'hui - Cliquable avec dropdown */}
              <details className="bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-100 group">
                <summary className="p-6 cursor-pointer list-none hover:bg-gray-50 rounded-xl transition-colors">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-gray-600 text-sm font-medium">Volume Aujourd'hui</span>
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                        <TrendingUp size={20} className="text-blue-600" />
                      </div>
                      <ChevronRight size={18} className="text-gray-400 group-open:rotate-90 transition-transform" />
                    </div>
                  </div>
                  <p className="text-3xl font-bold text-gray-900 mb-2">
                    {vopayLoading ? '...' : formatCurrency(vopayData.todayInterac || 0)}
                  </p>
                  <div className="flex items-center gap-2">
                    {!vopayLoading && vopayData.todayInterac > 0 ? (
                      <>
                        <TrendingUp size={14} className="text-[#00874e]" />
                        <span className="text-xs font-semibold text-[#00874e]">
                          Cliquer pour voir par type
                        </span>
                      </>
                    ) : (
                      <span className="text-xs text-gray-500 font-medium">Aucune transaction aujourd'hui</span>
                    )}
                  </div>
                </summary>

                {/* Dropdown: Volume par type de transaction */}
                <div className="px-6 pb-6 pt-2 border-t border-gray-100 bg-gradient-to-br from-gray-50 to-white">
                  <h4 className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-3">Volume par type</h4>
                  {!vopayLoading && (() => {
                    const today = new Date()
                    today.setHours(0, 0, 0, 0)

                    const todayTransactions = vopayData.recentTransactions.filter((tx: any) => {
                      const txDate = new Date(tx.TransactionDateTime)
                      return txDate >= today
                    })

                    // Grouper par type et calculer les volumes
                    const volumeByType: Record<string, { credit: number; debit: number; count: number }> = {}

                    todayTransactions.forEach((tx: any) => {
                      const type = tx.TransactionType || 'Autre'
                      if (!volumeByType[type]) {
                        volumeByType[type] = { credit: 0, debit: 0, count: 0 }
                      }
                      volumeByType[type].credit += parseFloat(tx.CreditAmount || '0')
                      volumeByType[type].debit += parseFloat(tx.DebitAmount || '0')
                      volumeByType[type].count += 1
                    })

                    const sortedTypes = Object.entries(volumeByType).sort(([, a], [, b]) => {
                      const netA = a.credit - a.debit
                      const netB = b.credit - b.debit
                      return Math.abs(netB) - Math.abs(netA)
                    })

                    if (sortedTypes.length === 0) {
                      return (
                        <p className="text-sm text-gray-500 italic py-2">Aucune transaction aujourd'hui</p>
                      )
                    }

                    return (
                      <div className="space-y-2">
                        {sortedTypes.map(([type, data]) => {
                          const net = data.credit - data.debit
                          const isPositive = net >= 0

                          return (
                            <div key={type} className="bg-white rounded-lg border border-gray-200 p-3 hover:shadow-md transition-shadow">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <div className={`w-2 h-2 rounded-full ${
                                    isPositive ? 'bg-green-500' : 'bg-red-500'
                                  }`}></div>
                                  <span className="text-sm font-semibold text-gray-900">{type}</span>
                                  <span className="text-xs text-gray-500">({data.count} tx)</span>
                                </div>
                                <span className={`text-sm font-bold ${
                                  isPositive ? 'text-green-600' : 'text-red-600'
                                }`}>
                                  {isPositive ? '+' : ''}{formatCurrency(net)}
                                </span>
                              </div>
                              <div className="flex items-center gap-4 text-xs text-gray-600">
                                {data.credit > 0 && (
                                  <span className="flex items-center gap-1">
                                    <span className="text-green-600">▲</span>
                                    Entrée: {formatCurrency(data.credit)}
                                  </span>
                                )}
                                {data.debit > 0 && (
                                  <span className="flex items-center gap-1">
                                    <span className="text-red-600">▼</span>
                                    Sortie: {formatCurrency(data.debit)}
                                  </span>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )
                  })()}
                </div>
              </details>

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

            {/* Messages du Mois Section */}
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-1 h-6 bg-gradient-to-b from-indigo-500 to-purple-600 rounded-full"></div>
                <h2 className="text-xl font-bold text-gray-900">Messages du Mois</h2>
                <span className="text-sm text-gray-500 font-medium">Vue d'ensemble du support client</span>
              </div>

              <div className="grid grid-cols-7 gap-4">
                {/* Total Messages */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 hover:shadow-md transition-all duration-300 group">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-gray-600">Total Messages</span>
                    <div className="w-8 h-8 bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                      <MessageSquare size={16} className="text-indigo-600" />
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-gray-900 mb-1">{messageStats.totalDuMois}</p>
                  <span className="text-xs text-gray-500">
                    {messageStats.lastAll ? formatLastMessageDate(messageStats.lastAll) : 'Aucun'}
                  </span>
                </div>

                {/* Réponses Envoyées */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 hover:shadow-md transition-all duration-300 group">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-gray-600">Réponses Envoyées</span>
                    <div className="w-8 h-8 bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Send size={16} className="text-emerald-600" />
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-gray-900 mb-1">{messageStats.reponsesEnvoyees}</p>
                  <span className="text-xs text-gray-500">
                    {messageStats.totalDuMois > 0
                      ? `${Math.round((messageStats.reponsesEnvoyees / messageStats.totalDuMois) * 100)}% du total`
                      : 'Aucun message'}
                  </span>
                </div>

                {/* Échecs Réponses */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 hover:shadow-md transition-all duration-300 group">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-gray-600">Échecs Réponses</span>
                    <div className="w-8 h-8 bg-gradient-to-br from-red-50 to-red-100 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                      <AlertTriangle size={16} className="text-red-600" />
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-gray-900 mb-1">{messageStats.reponsesNonEnvoyees}</p>
                  <span className="text-xs">
                    {messageStats.reponsesNonEnvoyees > 5 ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-semibold">
                        <AlertTriangle size={10} />
                        À vérifier
                      </span>
                    ) : (
                      <span className="text-gray-500">Normal</span>
                    )}
                  </span>
                </div>

                {/* Assignés Sandra */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 hover:shadow-md transition-all duration-300 group">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-gray-600">Assignés Sandra</span>
                    <div className="w-8 h-8 bg-gradient-to-br from-pink-50 to-pink-100 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                      <User size={16} className="text-pink-600" />
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-gray-900 mb-1">{messageStats.acheminesSandra}</p>
                  <span className="text-xs text-gray-500">
                    {messageStats.lastSandra ? formatLastMessageDate(messageStats.lastSandra) : 'Aucun'}
                  </span>
                </div>

                {/* Assignés Michel */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 hover:shadow-md transition-all duration-300 group">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-gray-600">Assignés Michel</span>
                    <div className="w-8 h-8 bg-gradient-to-br from-cyan-50 to-cyan-100 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                      <User size={16} className="text-cyan-600" />
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-gray-900 mb-1">{messageStats.acheminesMichel}</p>
                  <span className="text-xs text-gray-500">
                    {messageStats.lastMichel ? formatLastMessageDate(messageStats.lastMichel) : 'Aucun'}
                  </span>
                </div>

                {/* Non Assignés */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 hover:shadow-md transition-all duration-300 group">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-gray-600">Non Assignés</span>
                    <div className="w-8 h-8 bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                      <XCircle size={16} className="text-amber-600" />
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-gray-900 mb-1">{messageStats.nonAchemines}</p>
                  <span className="text-xs">
                    {messageStats.nonAchemines > 0 ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-semibold">
                        <AlertTriangle size={10} />
                        URGENT
                      </span>
                    ) : (
                      <span className="text-gray-500">Aucun en attente</span>
                    )}
                  </span>
                </div>

                {/* Supprimés Aujourd'hui */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 hover:shadow-md transition-all duration-300 group">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-gray-600">Supprimés Aujourd'hui</span>
                    <div className="w-8 h-8 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                      <X size={16} className="text-gray-600" />
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-gray-900 mb-1">{messageStats.deletedToday}</p>
                  <span className="text-xs text-gray-500">
                    Depuis 00:01
                  </span>
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
                    Transactions recentes VoPay
                  </h2>
                  <button
                    onClick={fetchVopayData}
                    className="text-gray-400 hover:text-[#00874e] transition-all hover:scale-110"
                  >
                    <RefreshCw size={16} className={vopayLoading ? 'animate-spin' : ''} />
                  </button>
                </div>

                {/* View Buttons */}
                {vopayData?.recentTransactions && vopayData.recentTransactions.length > 0 && (
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
                  {vopayLoading ? (
                    <div className="px-6 py-8 text-center">
                      <Loader2 size={24} className="animate-spin text-[#00874e] mx-auto" />
                    </div>
                  ) : vopayData?.recentTransactions && vopayData.recentTransactions.length > 0 ? (
                    (() => {
                      // Filtrer selon la vue active
                      let filteredTx = vopayData.recentTransactions

                      if (txView !== 'all') {
                        filteredTx = vopayData.recentTransactions.filter((tx: any) => {
                          const txType = (tx.TransactionType || tx.transaction_type || '').toLowerCase()

                          // Vrais types VoPay pour les ENTRÉES (argent qui rentre)
                          const isDeposit = txType.includes('eft funding') ||
                                           txType.includes('inbound') ||
                                           txType.includes('payout') ||
                                           txType.includes('deposit') ||
                                           txType.includes('credit') ||
                                           txType.includes('payment')

                          // Vrais types VoPay pour les SORTIES (argent qui sort)
                          const isWithdrawal = txType.includes('withdrawal') ||
                                              txType.includes('reversal') ||
                                              txType.includes('fee') ||
                                              txType.includes('debit') ||
                                              txType.includes('withdraw')

                          if (txView === 'deposits') return isDeposit
                          if (txView === 'withdrawals') return isWithdrawal
                          return true
                        })
                      }

                      // Limiter à 10 transactions
                      return filteredTx.slice(0, 10).map((tx: any, i: number) => {
                        // Support pour format VoPay API (majuscules) et webhooks (minuscules)
                        const status = (tx.Status || tx.TransactionStatus || tx.status || '').toLowerCase()
                        const isSuccessful = status === 'successful' || status === 'complete' || status === 'completed'
                        const isFailed = status === 'failed'
                        const isPending = status === 'pending' || status === 'in progress'
                        const isCancelled = status === 'cancelled'

                        // Extraire le nom du client (format VoPay API direct)
                        const clientName = tx.FullName || tx.AccountName || tx.full_name || 'Client VoPay'
                        const vopayTransactionId = tx.TransactionID || tx.transaction_id

                        // Calculer le montant (VoPay utilise DebitAmount et CreditAmount)
                        const debitAmount = parseFloat(tx.DebitAmount || '0')
                        const creditAmount = parseFloat(tx.CreditAmount || '0')
                        const transactionAmount = creditAmount > 0 ? creditAmount : debitAmount

                        // Déterminer si c'est une entrée ou sortie (vrais types VoPay)
                        const txType = (tx.TransactionType || tx.transaction_type || '').toLowerCase()
                        const isDeposit = txType.includes('eft funding') ||
                                         txType.includes('inbound') ||
                                         txType.includes('payout') ||
                                         txType.includes('deposit') ||
                                         txType.includes('credit') ||
                                         txType.includes('payment')
                        const isWithdrawal = txType.includes('withdrawal') ||
                                            txType.includes('reversal') ||
                                            txType.includes('fee') ||
                                            txType.includes('debit') ||
                                            txType.includes('withdraw')

                        const txId = tx.id || `tx-${i}`
                        const isOpen = openWebhookTxId === txId

                        return (
                          <details
                            key={txId}
                            className="group"
                            open={isOpen}
                            onClick={(e) => {
                              e.preventDefault()
                              setOpenWebhookTxId(isOpen ? null : txId)
                            }}
                          >
                            <summary className={`px-6 py-4 cursor-pointer hover:bg-gradient-to-r hover:from-gray-50 hover:to-transparent transition-all list-none border-l-4 ${
                              isDeposit ? 'border-l-emerald-500 bg-emerald-50/30' :
                              isWithdrawal ? 'border-l-red-500 bg-red-50/30' :
                              'border-l-gray-300'
                            }`}>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4 flex-1">
                                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-sm ${
                                    isSuccessful ? 'bg-gradient-to-br from-green-100 to-emerald-200' :
                                    isFailed ? 'bg-gradient-to-br from-red-100 to-red-200' :
                                    isPending ? 'bg-gradient-to-br from-blue-100 to-blue-200' :
                                    isCancelled ? 'bg-gradient-to-br from-gray-100 to-gray-200' :
                                    'bg-gray-50'
                                  }`}>
                                    {isSuccessful && <CheckCircle size={20} className="text-green-700" />}
                                    {isFailed && <XCircle size={20} className="text-red-700" />}
                                    {isPending && <Clock size={20} className="text-blue-700" />}
                                    {isCancelled && <XCircle size={20} className="text-gray-500" />}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                      <p className="font-bold text-gray-900">{clientName}</p>
                                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                                        isSuccessful ? 'bg-green-100 text-green-700' :
                                        isFailed ? 'bg-red-100 text-red-700' :
                                        isPending ? 'bg-blue-100 text-blue-700' :
                                        'bg-gray-100 text-gray-700'
                                      }`}>
                                        {tx.status}
                                      </span>
                                      {isDeposit && (
                                        <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-semibold">
                                          Entrée
                                        </span>
                                      )}
                                      {isWithdrawal && (
                                        <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-semibold">
                                          Sortie
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-3 text-xs text-gray-500">
                                      <span className="font-mono">#{vopayTransactionId}</span>
                                      <span>•</span>
                                      <span className="font-medium">{tx.TransactionType || tx.transaction_type}</span>
                                      <span>•</span>
                                      <span suppressHydrationWarning>{new Date(tx.TransactionDateTime || tx.received_at).toLocaleString('fr-CA')}</span>
                                    </div>
                                  </div>
                                </div>
                                <div className="text-right ml-4">
                                  <p className={`text-lg font-bold ${
                                    isDeposit && isSuccessful ? 'text-green-600' :
                                    isWithdrawal && isSuccessful ? 'text-red-600' :
                                    isFailed ? 'text-gray-400' :
                                    'text-gray-900'
                                  }`}>
                                    {isDeposit && '+'}{isWithdrawal && '-'}{formatCurrency(transactionAmount)}
                                  </p>
                                </div>
                                <ChevronRight size={20} className="text-gray-400 ml-2 group-open:rotate-90 transition-transform" />
                              </div>
                            </summary>

                            {/* Détails complets de la transaction webhook */}
                            <div className="px-6 pb-4 pt-2 bg-gradient-to-br from-gray-50 to-white border-t border-gray-100">
                              <div className="grid grid-cols-2 gap-4">
                                {/* Colonne 1: Informations principales */}
                                <div className="space-y-3">
                                  <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
                                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                                      <DollarSign size={14} className="text-green-600" />
                                      Détails de la transaction
                                    </h4>
                                    <div className="space-y-2 text-sm">
                                      <div className="flex justify-between">
                                        <span className="text-gray-600">Montant:</span>
                                        <span className={`font-bold text-lg ${
                                          isDeposit ? 'text-green-600' : isWithdrawal ? 'text-red-600' : 'text-gray-900'
                                        }`}>
                                          {isDeposit && '+'}{isWithdrawal && '-'}{formatCurrency(transactionAmount)}
                                        </span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-gray-600">Crédit:</span>
                                        <span className="font-semibold text-green-600">+{formatCurrency(creditAmount)}</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-gray-600">Débit:</span>
                                        <span className="font-semibold text-red-600">-{formatCurrency(debitAmount)}</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-gray-600">Type:</span>
                                        <span className="font-semibold text-gray-900">{tx.TransactionType || tx.transaction_type}</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-gray-600">Statut:</span>
                                        <span className={`font-semibold ${
                                          isSuccessful ? 'text-green-600' :
                                          isFailed ? 'text-red-600' :
                                          isPending ? 'text-blue-600' :
                                          'text-gray-600'
                                        }`}>{tx.TransactionStatus || tx.Status || tx.status}</span>
                                      </div>
                                      {tx.currency && (
                                        <div className="flex justify-between">
                                          <span className="text-gray-600">Devise:</span>
                                          <span className="font-bold text-gray-900">{tx.currency}</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  {/* Client info */}
                                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200 shadow-sm">
                                    <h4 className="text-xs font-bold text-blue-700 uppercase tracking-wider mb-3 flex items-center gap-2">
                                      <User size={14} className="text-blue-600" />
                                      Client
                                    </h4>
                                    <p className="font-semibold text-blue-900 text-sm">{clientName}</p>
                                    {tx.AccountName && tx.AccountName !== clientName && (
                                      <p className="text-xs text-blue-600 mt-1">Compte: {tx.AccountName}</p>
                                    )}
                                  </div>
                                </div>

                                {/* Colonne 2: Informations techniques */}
                                <div className="space-y-3">
                                  <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
                                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                                      <Activity size={14} className="text-purple-600" />
                                      Informations techniques
                                    </h4>
                                    <div className="space-y-2 text-xs">
                                      <div className="flex justify-between">
                                        <span className="text-gray-600">ID Webhook:</span>
                                        <span className="font-mono font-semibold text-gray-900 text-[10px]">{tx.id ? String(tx.id).slice(0, 8) : 'N/A'}</span>
                                      </div>
                                      {vopayTransactionId && (
                                        <div className="flex justify-between">
                                          <span className="text-gray-600">ID Transaction VoPay:</span>
                                          <span className="font-mono font-medium text-gray-900">{vopayTransactionId}</span>
                                        </div>
                                      )}
                                      <div className="flex justify-between">
                                        <span className="text-gray-600">Webhook reçu:</span>
                                        <span className="font-medium text-gray-900">{new Date(tx.received_at).toLocaleString('fr-CA')}</span>
                                      </div>
                                      {tx.processed_at && (
                                        <div className="flex justify-between">
                                          <span className="text-gray-600">Traité:</span>
                                          <span className="font-medium text-gray-900">{new Date(tx.processed_at).toLocaleString('fr-CA')}</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  {/* Erreur si échec */}
                                  {tx.failure_reason && (
                                    <div className="bg-red-50 rounded-lg p-4 border border-red-200 shadow-sm">
                                      <h4 className="text-xs font-bold text-red-700 uppercase tracking-wider mb-2 flex items-center gap-2">
                                        <AlertTriangle size={14} className="text-red-600" />
                                        Raison d'échec
                                      </h4>
                                      <p className="text-xs text-red-700 font-semibold">{tx.failure_reason}</p>
                                    </div>
                                  )}

                                  {/* Données VoPay complètes */}
                                  <details
                                    className="bg-gray-50 rounded-lg p-3 border border-gray-200"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <summary className="text-xs font-bold text-gray-600 cursor-pointer hover:text-[#00874e] transition-colors">
                                      Voir données VoPay complètes
                                    </summary>
                                    <pre className="mt-2 text-xs text-gray-700 whitespace-pre-wrap break-all font-mono bg-white p-2 rounded border border-gray-200 max-h-40 overflow-auto">
                                      {JSON.stringify(tx, null, 2)}
                                    </pre>
                                  </details>
                                </div>
                              </div>
                            </div>
                          </details>
                        )
                      })
                    })()
                  ) : (
                    <div className="px-6 py-12 text-center">
                      <Activity size={48} className="text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500 font-medium mb-2">Aucune transaction</p>
                      <p className="text-sm text-gray-400">
                        Aucune transaction VoPay récente disponible
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
                      onClick={() => router.push('/admin/dashboard?tab=vopay')}
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
                    onClick={() => router.push('/admin/dashboard?tab=messages')}
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
            <div className="w-full transition-all duration-300">
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
                  <p className={`text-xs mt-1 ${messageFilter === 'all' ? 'text-blue-100' : 'text-blue-600'}`}>
                    {formatLastMessageDate(messageStats.lastAll)}
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
                  <p className={`text-xs mt-1 ${messageFilter === 'reponses' ? 'text-green-100' : 'text-green-600'}`}>
                    {formatLastMessageDate(messageStats.lastReponse)}
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
                  <p className={`text-xs mt-1 ${messageFilter === 'sandra' ? 'text-pink-100' : 'text-pink-600'}`}>
                    {formatLastMessageDate(messageStats.lastSandra)}
                  </p>
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
                  <p className={`text-xs mt-1 ${messageFilter === 'michel' ? 'text-indigo-100' : 'text-indigo-600'}`}>
                    {formatLastMessageDate(messageStats.lastMichel)}
                  </p>
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
                  <p className={`text-xs mt-1 ${messageFilter === 'none' ? 'text-amber-100' : 'text-amber-600'}`}>
                    {formatLastMessageDate(messageStats.lastNone)}
                  </p>
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

                // Compter les messages par option
                const optionCounts: Record<string, number> = {}
                uniqueOptions.forEach(option => {
                  optionCounts[option as string] = messages.filter(msg => extractOptionFromMessage(msg.question).option === option).length
                })

                // Compter les messages "Autres demandes" (ceux sans option)
                const autresCount = messages.filter(msg => !extractOptionFromMessage(msg.question).option).length

                // Total de tous les messages
                const totalCount = messages.length

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
                        Tous les types ({totalCount})
                      </button>
                      {uniqueOptions.map((option) => (
                        <button
                          key={option}
                          onClick={() => setMessageSubFilter(option)}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${getOptionButtonColor(option, messageSubFilter === option)}`}
                        >
                          {option} ({optionCounts[option as string] || 0})
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
                            router.push(`/admin/dashboard?tab=messages&open=${msg.id}`)
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
                              <span className="flex items-center gap-1" suppressHydrationWarning>
                                <Clock size={14} />
                                {new Date(msg.date).toLocaleString('fr-CA')}
                              </span>
                            </div>
                            {/* Métriques Techniques - Aperçu Rapide */}
                            {(msg.client_device || msg.client_browser || msg.client_ip) && (
                              <div className="mt-3 pt-3 border-t border-gray-100">
                                {/* Description en langage simple */}
                                <div className="mb-2 flex items-start gap-2">
                                  <Activity size={14} className="text-gray-400 flex-shrink-0 mt-0.5" />
                                  <p className="text-xs text-gray-600 leading-relaxed">
                                    Ce message provient
                                    {msg.client_device && (
                                      <span className="font-semibold text-blue-700"> d'un {msg.client_device === 'Mobile' ? 'téléphone mobile' : 'ordinateur'}</span>
                                    )}
                                    {msg.client_os && (
                                      <span className="font-semibold text-purple-700"> utilisant {msg.client_os}</span>
                                    )}
                                    {msg.client_browser && (
                                      <span className="font-semibold text-indigo-700"> et le navigateur {msg.client_browser}</span>
                                    )}
                                    {msg.client_ip && (
                                      <span className="font-semibold text-emerald-700"> depuis l'adresse IP {msg.client_ip}</span>
                                    )}
                                    {msg.client_language && (
                                      <span className="font-semibold text-teal-700"> avec la langue {msg.client_language.toUpperCase()}</span>
                                    )}
                                    {(msg.utm_source || msg.utm_medium || msg.utm_campaign) && (
                                      <span className="font-semibold text-pink-700"> via une campagne marketing</span>
                                    )}
                                    .
                                  </p>
                                </div>
                                {/* Badges */}
                                <div className="flex items-center gap-3 flex-wrap">
                                {msg.client_device && (
                                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100">
                                    {msg.client_device === 'Mobile' ? (
                                      <Smartphone size={13} className="text-blue-600" />
                                    ) : (
                                      <Monitor size={13} className="text-blue-600" />
                                    )}
                                    <span className="text-xs font-semibold text-blue-700">{msg.client_device}</span>
                                  </div>
                                )}
                                {msg.client_browser && (
                                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100">
                                    <Chrome size={13} className="text-indigo-600" />
                                    <span className="text-xs font-semibold text-indigo-700">{msg.client_browser}</span>
                                  </div>
                                )}
                                {msg.client_os && (
                                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-100">
                                    <Monitor size={13} className="text-purple-600" />
                                    <span className="text-xs font-semibold text-purple-700">{msg.client_os}</span>
                                  </div>
                                )}
                                {msg.client_ip && (
                                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-100">
                                    <MapPin size={13} className="text-emerald-600" />
                                    <span className="text-xs font-mono font-semibold text-emerald-700">{msg.client_ip}</span>
                                  </div>
                                )}
                                {msg.client_language && (
                                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gradient-to-r from-teal-50 to-cyan-50 border border-teal-100">
                                    <Languages size={13} className="text-teal-600" />
                                    <span className="text-xs font-mono font-semibold text-teal-700 uppercase">{msg.client_language}</span>
                                  </div>
                                )}
                                {(msg.utm_source || msg.utm_medium || msg.utm_campaign) && (
                                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gradient-to-r from-pink-50 to-rose-50 border border-pink-200">
                                    <Target size={13} className="text-pink-600" />
                                    <span className="text-xs font-bold text-pink-700">UTM</span>
                                  </div>
                                )}
                                </div>
                              </div>
                            )}
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
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto"
              >
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl my-8 max-h-[90vh] overflow-y-auto"
                >
                {/* Header */}
                <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-white border-b border-gray-100 flex items-center justify-between sticky top-0 z-10 rounded-t-xl">
                  <h2 className="font-bold text-gray-900 flex items-center gap-2">
                    <MessageSquare size={18} className="text-[#00874e]" />
                    Details du message
                  </h2>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        resendNotification(selectedMessage.id, selectedMessage.assigned_to)
                      }}
                      className="flex items-center gap-2 px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition-all hover:scale-105 border border-blue-200 hover:border-blue-300"
                    >
                      <Send size={18} />
                      <span className="text-sm font-medium">Renvoyer</span>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        deleteMessage(selectedMessage.id)
                      }}
                      className="flex items-center gap-2 px-3 py-2 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg transition-all hover:scale-105 border border-red-200 hover:border-red-300"
                    >
                      <Trash2 size={18} />
                      <span className="text-sm font-medium">Supprimer</span>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        closeDetail()
                      }}
                      className="flex items-center gap-2 px-3 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-lg transition-all hover:scale-105 border border-gray-200 hover:border-gray-300"
                    >
                      <X size={20} />
                      <span className="text-sm font-medium">Fermer</span>
                    </button>
                  </div>
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
                            <p className="font-bold text-gray-900 text-lg">{formatClientName(selectedMessage.nom)}</p>
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

                    {/* Message du Client - Format Professionnel */}
                    {(() => {
                      const { source, option, message } = extractOptionFromMessage(selectedMessage.question)

                      return (
                        <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6 border border-gray-200">
                          <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-4 flex items-center gap-2">
                            <MessageSquare size={16} className="text-[#00874e]" />
                            Message du Client
                          </h3>

                          {/* Métadonnées */}
                          <div className="space-y-3 mb-5">
                            {/* Source */}
                            {source && (
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs text-gray-600 font-semibold">Source:</span>
                                <span className={`text-xs px-3 py-1.5 rounded-full font-semibold ${getSourceColor(source)}`}>
                                  {source}
                                </span>
                              </div>
                            )}

                            {/* Contact */}
                            <div className="flex items-center gap-3 flex-wrap text-sm">
                              {selectedMessage.telephone && (
                                <div className="flex items-center gap-1.5">
                                  <Phone size={14} className="text-gray-500" />
                                  <span className="text-gray-700 font-medium">{selectedMessage.telephone}</span>
                                </div>
                              )}
                              {selectedMessage.email && (
                                <div className="flex items-center gap-1.5">
                                  <Mail size={14} className="text-gray-500" />
                                  <span className="text-gray-700 font-medium">{selectedMessage.email}</span>
                                </div>
                              )}
                            </div>

                            {/* Type de demande */}
                            {option && (
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs text-gray-600 font-semibold">Sujet:</span>
                                <span className={`text-xs px-3 py-1.5 rounded-full font-semibold ${getOptionColor(option)}`}>
                                  {option}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Contenu du message */}
                          <div className="bg-white rounded-lg p-4 border-l-4 border-[#00874e] shadow-sm">
                            <p className="text-xs uppercase tracking-wide text-gray-500 font-bold mb-2">Contenu</p>
                            <p className="text-gray-800 whitespace-pre-wrap leading-relaxed text-sm">
                              {message}
                            </p>
                          </div>
                        </div>
                      )
                    })()}

                    {/* Métriques Techniques & Analytiques - Version Enrichie */}
                    {(selectedMessage.client_ip || selectedMessage.client_device) && (
                      <div className="space-y-4">
                        {/* Section 1: Appareil & Matériel */}
                        <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 rounded-xl p-5 border border-blue-200">
                          <h3 className="text-sm font-bold text-blue-700 uppercase tracking-wider mb-4 flex items-center gap-2">
                            {selectedMessage.client_device === 'Mobile' ? (
                              <Smartphone size={16} className="text-blue-600" />
                            ) : (
                              <Monitor size={16} className="text-blue-600" />
                            )}
                            Appareil & Matériel
                          </h3>
                          <div className="grid grid-cols-2 gap-3">
                            {selectedMessage.client_device && (
                              <div className="bg-white/80 backdrop-blur rounded-lg p-4 border border-blue-100 shadow-sm">
                                <div className="flex items-center gap-2 mb-2">
                                  {selectedMessage.client_device === 'Mobile' ? (
                                    <Smartphone size={18} className="text-blue-600" />
                                  ) : (
                                    <Monitor size={18} className="text-blue-600" />
                                  )}
                                  <p className="text-xs text-gray-600 font-semibold">Type d'appareil</p>
                                </div>
                                <p className="text-gray-900 font-bold text-sm">{selectedMessage.client_device}</p>
                              </div>
                            )}
                            {selectedMessage.client_browser && (
                              <div className="bg-white/80 backdrop-blur rounded-lg p-4 border border-blue-100 shadow-sm">
                                <div className="flex items-center gap-2 mb-2">
                                  <Chrome size={18} className="text-blue-600" />
                                  <p className="text-xs text-gray-600 font-semibold">Navigateur</p>
                                </div>
                                <p className="text-gray-900 font-bold text-sm">{selectedMessage.client_browser}</p>
                              </div>
                            )}
                            {selectedMessage.client_os && (
                              <div className="bg-white/80 backdrop-blur rounded-lg p-4 border border-blue-100 shadow-sm">
                                <div className="flex items-center gap-2 mb-2">
                                  <Monitor size={18} className="text-blue-600" />
                                  <p className="text-xs text-gray-600 font-semibold">Système d'exploitation</p>
                                </div>
                                <p className="text-gray-900 font-bold text-sm">{selectedMessage.client_os}</p>
                              </div>
                            )}
                            {selectedMessage.client_screen_resolution && (
                              <div className="bg-white/80 backdrop-blur rounded-lg p-4 border border-blue-100 shadow-sm">
                                <div className="flex items-center gap-2 mb-2">
                                  <Maximize2 size={18} className="text-blue-600" />
                                  <p className="text-xs text-gray-600 font-semibold">Résolution écran</p>
                                </div>
                                <p className="text-gray-900 font-bold text-sm font-mono">{selectedMessage.client_screen_resolution}</p>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Section 2: Localisation & Réseau */}
                        <div className="bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 rounded-xl p-5 border border-emerald-200">
                          <h3 className="text-sm font-bold text-emerald-700 uppercase tracking-wider mb-4 flex items-center gap-2">
                            <Globe size={16} className="text-emerald-600" />
                            Localisation & Réseau
                          </h3>
                          <div className="grid grid-cols-2 gap-3">
                            {selectedMessage.client_ip && (
                              <div className="bg-white/80 backdrop-blur rounded-lg p-4 border border-emerald-100 shadow-sm col-span-2">
                                <div className="flex items-center gap-2 mb-2">
                                  <MapPin size={18} className="text-emerald-600" />
                                  <p className="text-xs text-gray-600 font-semibold">Adresse IP</p>
                                </div>
                                <p className="text-gray-900 font-bold text-sm font-mono">{selectedMessage.client_ip}</p>
                                <p className="text-xs text-emerald-600 mt-1">🌍 Connexion réseau identifiée</p>
                              </div>
                            )}
                            {selectedMessage.client_timezone && (
                              <div className="bg-white/80 backdrop-blur rounded-lg p-4 border border-emerald-100 shadow-sm">
                                <div className="flex items-center gap-2 mb-2">
                                  <Clock size={18} className="text-emerald-600" />
                                  <p className="text-xs text-gray-600 font-semibold">Fuseau horaire</p>
                                </div>
                                <p className="text-gray-900 font-bold text-sm font-mono">{selectedMessage.client_timezone}</p>
                              </div>
                            )}
                            {selectedMessage.client_language && (
                              <div className="bg-white/80 backdrop-blur rounded-lg p-4 border border-emerald-100 shadow-sm">
                                <div className="flex items-center gap-2 mb-2">
                                  <Languages size={18} className="text-emerald-600" />
                                  <p className="text-xs text-gray-600 font-semibold">Langue préférée</p>
                                </div>
                                <p className="text-gray-900 font-bold text-sm font-mono uppercase">{selectedMessage.client_language}</p>
                              </div>
                            )}
                            {selectedMessage.referrer && (
                              <div className="bg-white/80 backdrop-blur rounded-lg p-4 border border-emerald-100 shadow-sm col-span-2">
                                <div className="flex items-center gap-2 mb-2">
                                  <Link2 size={18} className="text-emerald-600" />
                                  <p className="text-xs text-gray-600 font-semibold">Page de provenance</p>
                                </div>
                                <p className="text-gray-900 font-mono text-xs break-all">{selectedMessage.referrer}</p>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Section 3: Tracking Marketing (UTM) */}
                        {(selectedMessage.utm_source || selectedMessage.utm_medium || selectedMessage.utm_campaign) && (
                          <div className="bg-gradient-to-br from-pink-50 via-rose-50 to-orange-50 rounded-xl p-5 border border-pink-200">
                            <h3 className="text-sm font-bold text-pink-700 uppercase tracking-wider mb-4 flex items-center gap-2">
                              <Target size={16} className="text-pink-600" />
                              Tracking Campagne Marketing
                            </h3>
                            <div className="space-y-3">
                              {selectedMessage.utm_source && (
                                <div className="bg-white/80 backdrop-blur rounded-lg p-4 border border-pink-100 shadow-sm">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <div className="w-8 h-8 rounded-lg bg-pink-100 flex items-center justify-center">
                                        <span className="text-pink-700 font-bold text-xs">SRC</span>
                                      </div>
                                      <div>
                                        <p className="text-xs text-gray-500 font-medium">UTM Source</p>
                                        <p className="text-gray-900 font-bold text-sm">{selectedMessage.utm_source}</p>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )}
                              {selectedMessage.utm_medium && (
                                <div className="bg-white/80 backdrop-blur rounded-lg p-4 border border-pink-100 shadow-sm">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <div className="w-8 h-8 rounded-lg bg-rose-100 flex items-center justify-center">
                                        <span className="text-rose-700 font-bold text-xs">MED</span>
                                      </div>
                                      <div>
                                        <p className="text-xs text-gray-500 font-medium">UTM Medium</p>
                                        <p className="text-gray-900 font-bold text-sm">{selectedMessage.utm_medium}</p>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )}
                              {selectedMessage.utm_campaign && (
                                <div className="bg-white/80 backdrop-blur rounded-lg p-4 border border-pink-100 shadow-sm">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center">
                                        <span className="text-orange-700 font-bold text-xs">CPG</span>
                                      </div>
                                      <div>
                                        <p className="text-xs text-gray-500 font-medium">UTM Campaign</p>
                                        <p className="text-gray-900 font-bold text-sm">{selectedMessage.utm_campaign}</p>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* User-Agent Complet (Collapsible) */}
                        {selectedMessage.client_user_agent && (
                          <details className="bg-gradient-to-br from-gray-50 to-slate-50 rounded-xl p-5 border border-gray-200">
                            <summary className="text-sm font-bold text-gray-700 cursor-pointer hover:text-[#00874e] transition-colors flex items-center gap-2">
                              <Activity size={14} />
                              Afficher User-Agent complet (données techniques avancées)
                            </summary>
                            <div className="mt-4 bg-white rounded-lg p-4 border border-gray-200">
                              <pre className="text-xs text-gray-700 whitespace-pre-wrap break-all font-mono leading-relaxed">{selectedMessage.client_user_agent}</pre>
                            </div>
                          </details>
                        )}
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
              </div>
            )}
          </div>
        )}

        {/* Support View */}
        {selectedView === 'support' && (
          <SupportView />
        )}

        {/* Analyses View */}
        {selectedView === 'analyses' && (
          <AnalysesView />
        )}

        {/* VoPay View */}
        {selectedView === 'vopay' && (
          <div>
            {/* Header avec Diagnostics - Mode Ingénieur */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h1 className="text-2xl font-semibold text-[#003d2c] flex items-center gap-3">
                    <div className="w-1 h-8 bg-gradient-to-b from-[#00874e] to-emerald-600 rounded-full"></div>
                    VoPay - Mode Ingénieur
                  </h1>
                  <p className="text-gray-600 mt-2 ml-7 font-medium">
                    Gestion des paiements Interac & Diagnostics complets
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="px-4 py-2 bg-emerald-50 border border-emerald-200 rounded-lg">
                    <div className="flex items-center gap-2">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                      </span>
                      <span className="text-xs font-semibold text-emerald-700">Opérationnel</span>
                    </div>
                  </div>
                  <button
                    onClick={fetchVopayData}
                    disabled={vopayLoading}
                    className="flex items-center gap-2 px-4 py-2 bg-[#00874e] text-white rounded-lg text-sm font-medium hover:bg-[#006d3f] transition-colors disabled:opacity-50"
                  >
                    <RefreshCw size={16} className={vopayLoading ? 'animate-spin' : ''} />
                    {vopayLoading ? 'Chargement...' : 'Rafraîchir'}
                  </button>
                </div>
              </div>

              {vopayError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <AlertTriangle size={20} className="text-red-500" />
                    <div>
                      <h3 className="font-semibold text-red-800">Erreur de connexion</h3>
                      <p className="text-sm text-red-600">{vopayError}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Tabs */}
            <div className="bg-white rounded-lg border border-gray-200 mb-6">
              <div className="border-b border-gray-200">
                <div className="flex gap-1 p-2">
                  {[
                    { id: 'overview', label: '📊 Analytics & Metrics' },
                    { id: 'transactions', label: '🔧 Architect Mode' },
                    { id: 'releves', label: '📄 Bank Statements' }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setSelectedVoPayTab(tab.id as any)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        selectedVoPayTab === tab.id
                          ? 'bg-[#00874e] text-white'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-6">
                {/* Overview Tab - Professional Metrics */}
                {selectedVoPayTab === 'overview' && (
                  <VoPayMetricsTab />
                )}

                {/* Transactions Tab Content */}
                {selectedVoPayTab === 'transactions' && (
                  <div>
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

            {/* Section Balance Details Complets (Expandable) */}
            {!vopayLoading && (
              <div className="mb-6">
                <details className="group bg-white rounded-xl border border-gray-200 shadow-sm">
                  <summary className="px-6 py-4 cursor-pointer hover:bg-gray-50 transition-colors flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Activity size={18} className="text-[#00874e]" />
                      <h2 className="text-lg font-bold text-gray-900">Balance Details Complets</h2>
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
                        9 Fields Disponibles
                      </span>
                    </div>
                    <ChevronRight size={20} className="text-gray-400 group-open:rotate-90 transition-transform" />
                  </summary>

                  <div className="px-6 pb-6 pt-2">
                    <div className="grid grid-cols-3 gap-4">
                      {/* Account Balance */}
                      <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-100">
                        <div className="flex items-center gap-2 mb-1">
                          <CheckCircle size={14} className="text-emerald-600" />
                          <span className="text-xs text-emerald-700 font-semibold">Operational</span>
                        </div>
                        <span className="text-xs text-gray-600 font-medium">Account Balance</span>
                        <p className="text-xl font-bold text-gray-900 mt-1">
                          {formatCurrency(vopayData.balance)}
                        </p>
                        <span className="text-xs text-gray-500">Solde total du compte</span>
                      </div>

                      {/* Available Funds */}
                      <div className="p-4 bg-green-50 rounded-lg border border-green-100">
                        <div className="flex items-center gap-2 mb-1">
                          <CheckCircle size={14} className="text-green-600" />
                          <span className="text-xs text-green-700 font-semibold">Operational</span>
                        </div>
                        <span className="text-xs text-gray-600 font-medium">Available Funds</span>
                        <p className="text-xl font-bold text-gray-900 mt-1">
                          {formatCurrency(vopayData.available)}
                        </p>
                        <span className="text-xs text-gray-500">
                          {((vopayData.available / vopayData.balance) * 100).toFixed(1)}% du total
                        </span>
                      </div>

                      {/* Pending Funds */}
                      <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                        <div className="flex items-center gap-2 mb-1">
                          <CheckCircle size={14} className="text-blue-600" />
                          <span className="text-xs text-blue-700 font-semibold">Operational</span>
                        </div>
                        <span className="text-xs text-gray-600 font-medium">Pending Funds</span>
                        <p className="text-xl font-bold text-gray-900 mt-1">
                          {formatCurrency(vopayData.balance - vopayData.available)}
                        </p>
                        <span className="text-xs text-gray-500">Fonds en attente de règlement</span>
                      </div>

                      {/* Security Deposit */}
                      <div className="p-4 bg-purple-50 rounded-lg border border-purple-100">
                        <div className="flex items-center gap-2 mb-1">
                          <CheckCircle size={14} className="text-purple-600" />
                          <span className="text-xs text-purple-700 font-semibold">Operational</span>
                        </div>
                        <span className="text-xs text-gray-600 font-medium">Security Deposit</span>
                        <p className="text-xl font-bold text-gray-900 mt-1">3,000.00 $</p>
                        <span className="text-xs text-gray-500">Dépôt de sécurité</span>
                      </div>

                      {/* Reserve */}
                      <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-100">
                        <div className="flex items-center gap-2 mb-1">
                          <CheckCircle size={14} className="text-indigo-600" />
                          <span className="text-xs text-indigo-700 font-semibold">Operational</span>
                        </div>
                        <span className="text-xs text-gray-600 font-medium">Reserve</span>
                        <p className="text-xl font-bold text-gray-900 mt-1">3,000.00 $</p>
                        <span className="text-xs text-gray-500">Réserve obligatoire</span>
                      </div>

                      {/* Available Immediately */}
                      <div className="p-4 bg-cyan-50 rounded-lg border border-cyan-100">
                        <div className="flex items-center gap-2 mb-1">
                          <CheckCircle size={14} className="text-cyan-600" />
                          <span className="text-xs text-cyan-700 font-semibold">Operational</span>
                        </div>
                        <span className="text-xs text-gray-600 font-medium">Available Immediately</span>
                        <p className="text-xl font-bold text-gray-900 mt-1">0.00 $</p>
                        <span className="text-xs text-gray-500">Disponible immédiatement</span>
                      </div>

                      {/* Currency */}
                      <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                        <div className="flex items-center gap-2 mb-1">
                          <CheckCircle size={14} className="text-gray-600" />
                          <span className="text-xs text-gray-700 font-semibold">Operational</span>
                        </div>
                        <span className="text-xs text-gray-600 font-medium">Currency</span>
                        <p className="text-xl font-bold text-gray-900 mt-1">CAD</p>
                        <span className="text-xs text-gray-500">Devise du compte</span>
                      </div>

                      {/* As Of Date */}
                      <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                        <div className="flex items-center gap-2 mb-1">
                          <CheckCircle size={14} className="text-gray-600" />
                          <span className="text-xs text-gray-700 font-semibold">Operational</span>
                        </div>
                        <span className="text-xs text-gray-600 font-medium">As Of Date</span>
                        <p className="text-xl font-bold text-gray-900 mt-1">
                          {new Date().toISOString().split('T')[0]}
                        </p>
                        <span className="text-xs text-gray-500">Date du snapshot</span>
                      </div>

                      {/* Offbook Balance */}
                      <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                        <div className="flex items-center gap-2 mb-1">
                          <CheckCircle size={14} className="text-gray-600" />
                          <span className="text-xs text-gray-700 font-semibold">Operational</span>
                        </div>
                        <span className="text-xs text-gray-600 font-medium">Offbook Balance</span>
                        <p className="text-xl font-bold text-gray-900 mt-1">0.00 $</p>
                        <span className="text-xs text-gray-500">Solde hors-livres</span>
                      </div>
                    </div>

                    {/* Métriques Calculées */}
                    <div className="mt-6 pt-6 border-t border-gray-200">
                      <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                        <Target size={16} className="text-indigo-600" />
                        Métriques Calculées
                      </h3>
                      <div className="grid grid-cols-3 gap-4">
                        {/* Fonds Gelés */}
                        <div className="p-4 bg-gradient-to-br from-amber-50 to-orange-50 rounded-lg border border-amber-200">
                          <span className="text-xs text-amber-700 font-medium">Fonds Gelés</span>
                          <p className="text-2xl font-bold text-amber-900 mt-2">
                            {formatCurrency(vopayData.frozen)}
                          </p>
                          <div className="mt-2 flex items-center gap-2">
                            <div className="flex-1 bg-amber-200 rounded-full h-2 overflow-hidden">
                              <div
                                className="bg-amber-600 h-full rounded-full"
                                style={{ width: `${(vopayData.frozen / vopayData.balance) * 100}%` }}
                              ></div>
                            </div>
                            <span className="text-xs font-semibold text-amber-700">
                              {((vopayData.frozen / vopayData.balance) * 100).toFixed(1)}%
                            </span>
                          </div>
                          <span className="text-xs text-amber-600 mt-2 block">
                            AccountBalance - AvailableFunds
                          </span>
                        </div>

                        {/* Réserve Totale */}
                        <div className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg border border-purple-200">
                          <span className="text-xs text-purple-700 font-medium">Réserve Totale</span>
                          <p className="text-2xl font-bold text-purple-900 mt-2">6,000.00 $</p>
                          <div className="mt-2 flex items-center gap-2">
                            <div className="flex-1 bg-purple-200 rounded-full h-2 overflow-hidden">
                              <div
                                className="bg-purple-600 h-full rounded-full"
                                style={{ width: `${(6000 / vopayData.balance) * 100}%` }}
                              ></div>
                            </div>
                            <span className="text-xs font-semibold text-purple-700">
                              {((6000 / vopayData.balance) * 100).toFixed(1)}%
                            </span>
                          </div>
                          <span className="text-xs text-purple-600 mt-2 block">
                            SecurityDeposit + Reserve
                          </span>
                        </div>

                        {/* Taux d'Utilisation */}
                        <div className="p-4 bg-gradient-to-br from-pink-50 to-red-50 rounded-lg border border-pink-200">
                          <span className="text-xs text-pink-700 font-medium">Taux d'Utilisation</span>
                          <p className="text-2xl font-bold text-pink-900 mt-2">
                            {((vopayData.frozen / vopayData.balance) * 100).toFixed(1)}%
                          </p>
                          <div className="mt-2 flex items-center gap-2">
                            <div className="flex-1 bg-pink-200 rounded-full h-2 overflow-hidden">
                              <div
                                className="bg-pink-600 h-full rounded-full"
                                style={{ width: `${(vopayData.frozen / vopayData.balance) * 100}%` }}
                              ></div>
                            </div>
                            <span className="text-xs font-semibold text-pink-700">
                              {vopayData.frozen > vopayData.available ? 'Élevé' : 'Normal'}
                            </span>
                          </div>
                          <span className="text-xs text-pink-600 mt-2 block">
                            PendingFunds / AccountBalance
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </details>
              </div>
            )}

            {/* Section Métriques Non-Fonctionnelles */}
            <div className="mb-6">
              <details className="group bg-red-50 rounded-xl border border-red-200">
                <summary className="px-6 py-4 cursor-pointer hover:bg-red-100 transition-colors flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <AlertTriangle size={18} className="text-red-600" />
                    <h2 className="text-lg font-bold text-red-900">Métriques Non Disponibles</h2>
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-red-200 text-red-800">
                      ❌ 4 Endpoints Non-Fonctionnels
                    </span>
                  </div>
                  <ChevronRight size={20} className="text-red-400 group-open:rotate-90 transition-transform" />
                </summary>

                <div className="px-6 pb-6 pt-2">
                  <p className="text-sm text-red-700 mb-4">
                    Les endpoints suivants ont été testés et retournent "Invalid Request". Ils ne sont pas disponibles pour ce compte VoPay.
                  </p>
                  <div className="space-y-4">
                    {/* Account Information */}
                    <div className="p-4 bg-white rounded-lg border border-red-200">
                      <div className="flex items-start gap-3">
                        <XCircle size={20} className="text-red-500 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900">Account Information</h3>
                          <p className="text-sm text-gray-600 mt-1">
                            <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">/account/info</span>
                          </p>
                          <div className="mt-3 space-y-2">
                            <div className="flex items-start gap-2">
                              <span className="text-xs font-semibold text-red-600 min-w-[60px]">Erreur:</span>
                              <span className="text-xs text-red-600">Invalid Request</span>
                            </div>
                            <div className="flex items-start gap-2">
                              <span className="text-xs font-semibold text-gray-600 min-w-[60px]">Impact:</span>
                              <span className="text-xs text-gray-600">Impossible de récupérer nom compagnie, type de compte, date de création</span>
                            </div>
                            <div className="flex items-start gap-2">
                              <span className="text-xs font-semibold text-gray-600 min-w-[60px]">Fields:</span>
                              <span className="text-xs text-gray-500 font-mono">CompanyName, AccountStatus, AccountType, CreatedDate</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Daily Limits */}
                    <div className="p-4 bg-white rounded-lg border border-red-200">
                      <div className="flex items-start gap-3">
                        <XCircle size={20} className="text-red-500 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900">Daily Limits</h3>
                          <p className="text-sm text-gray-600 mt-1">
                            <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">/account/limits</span>
                          </p>
                          <div className="mt-3 space-y-2">
                            <div className="flex items-start gap-2">
                              <span className="text-xs font-semibold text-red-600 min-w-[60px]">Erreur:</span>
                              <span className="text-xs text-red-600">Invalid Request</span>
                            </div>
                            <div className="flex items-start gap-2">
                              <span className="text-xs font-semibold text-gray-600 min-w-[60px]">Impact:</span>
                              <span className="text-xs text-gray-600">Limites quotidiennes restantes non visibles, impossible de prévoir si limite atteinte</span>
                            </div>
                            <div className="flex items-start gap-2">
                              <span className="text-xs font-semibold text-gray-600 min-w-[60px]">Fields:</span>
                              <span className="text-xs text-gray-500 font-mono">DailyLimit, RemainingLimit, UsedAmount</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Scheduled Transactions */}
                    <div className="p-4 bg-white rounded-lg border border-red-200">
                      <div className="flex items-start gap-3">
                        <XCircle size={20} className="text-red-500 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900">Scheduled Transactions</h3>
                          <p className="text-sm text-gray-600 mt-1">
                            <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">/account/scheduled-transactions</span>
                          </p>
                          <div className="mt-3 space-y-2">
                            <div className="flex items-start gap-2">
                              <span className="text-xs font-semibold text-red-600 min-w-[60px]">Erreur:</span>
                              <span className="text-xs text-red-600">Invalid Request</span>
                            </div>
                            <div className="flex items-start gap-2">
                              <span className="text-xs font-semibold text-gray-600 min-w-[60px]">Impact:</span>
                              <span className="text-xs text-gray-600">Paiements programmés non visibles, impossible de gérer les paiements récurrents</span>
                            </div>
                            <div className="flex items-start gap-2">
                              <span className="text-xs font-semibold text-gray-600 min-w-[60px]">Fields:</span>
                              <span className="text-xs text-gray-500 font-mono">ScheduledTransactionID, NextRunDate, Frequency</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Webhook Logs (Workaround OK) */}
                    <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                      <div className="flex items-start gap-3">
                        <CheckCircle size={20} className="text-green-500 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                            Webhook Logs
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                              ✅ Workaround OK
                            </span>
                          </h3>
                          <p className="text-sm text-gray-600 mt-1">
                            <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">/webhooks/logs</span>
                          </p>
                          <div className="mt-3 space-y-2">
                            <div className="flex items-start gap-2">
                              <span className="text-xs font-semibold text-red-600 min-w-[60px]">API Status:</span>
                              <span className="text-xs text-red-600">Invalid Request</span>
                            </div>
                            <div className="flex items-start gap-2">
                              <span className="text-xs font-semibold text-green-600 min-w-[60px]">Solution:</span>
                              <span className="text-xs text-green-600 font-medium">✅ Récupéré via Supabase (table: vopay_webhook_logs)</span>
                            </div>
                            <div className="flex items-start gap-2">
                              <span className="text-xs font-semibold text-gray-600 min-w-[60px]">Impact:</span>
                              <span className="text-xs text-gray-600">Aucun - Les logs webhooks sont disponibles dans l'onglet Dashboard (Transactions Récentes)</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </details>
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

            {/* Section: Transaction Fields Documentation - Mode Ingénieur */}
            {!vopayLoading && vopayData.recentTransactions.length > 0 && (
              <details className="group bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl border border-emerald-200 shadow-sm mb-6">
                <summary className="px-6 py-4 cursor-pointer hover:bg-emerald-100 transition-colors list-none">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                        <DollarSign size={18} className="text-emerald-700" />
                      </div>
                      <div>
                        <h2 className="font-bold text-emerald-900 flex items-center gap-2">
                          Transaction Fields Complets
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 border border-emerald-300">
                            ✅ Operational
                          </span>
                        </h2>
                        <p className="text-xs text-emerald-700 mt-0.5">18 Fields Disponibles par Transaction</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-bold text-emerald-700">18</span>
                      <ChevronRight size={20} className="text-emerald-600 group-open:rotate-90 transition-transform" />
                    </div>
                  </div>
                </summary>

                <div className="px-6 pb-6 pt-2">
                  <div className="bg-white rounded-lg border border-emerald-200 p-5">
                    <div className="grid grid-cols-3 gap-4">
                      {/* Colonne 1: Identification & Timing */}
                      <div className="space-y-3">
                        <h4 className="text-xs font-bold text-emerald-700 uppercase tracking-wider mb-3 pb-2 border-b border-emerald-200">
                          Identification & Timing (6)
                        </h4>
                        <div className="space-y-2.5">
                          <div className="flex items-start gap-2">
                            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold flex-shrink-0">✓</span>
                            <div>
                              <p className="text-xs font-semibold text-gray-900">TransactionID</p>
                              <p className="text-xs text-gray-600">Identifiant unique VoPay</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-2">
                            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold flex-shrink-0">✓</span>
                            <div>
                              <p className="text-xs font-semibold text-gray-900">FullName</p>
                              <p className="text-xs text-gray-600">Nom complet du client</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-2">
                            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold flex-shrink-0">✓</span>
                            <div>
                              <p className="text-xs font-semibold text-gray-900">TransactionDateTime</p>
                              <p className="text-xs text-gray-600">Date et heure de la transaction</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-2">
                            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold flex-shrink-0">✓</span>
                            <div>
                              <p className="text-xs font-semibold text-gray-900">SettlementDate</p>
                              <p className="text-xs text-gray-600">Date de règlement bancaire</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-2">
                            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold flex-shrink-0">✓</span>
                            <div>
                              <p className="text-xs font-semibold text-gray-900">TransactionType</p>
                              <p className="text-xs text-gray-600">Type (EFT, Inbound, Reversal...)</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-2">
                            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold flex-shrink-0">✓</span>
                            <div>
                              <p className="text-xs font-semibold text-gray-900">TransactionStatus</p>
                              <p className="text-xs text-gray-600">completed, pending, failed...</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Colonne 2: Financial & Banking */}
                      <div className="space-y-3">
                        <h4 className="text-xs font-bold text-emerald-700 uppercase tracking-wider mb-3 pb-2 border-b border-emerald-200">
                          Financial & Banking (8)
                        </h4>
                        <div className="space-y-2.5">
                          <div className="flex items-start gap-2">
                            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold flex-shrink-0">✓</span>
                            <div>
                              <p className="text-xs font-semibold text-gray-900">DebitAmount</p>
                              <p className="text-xs text-gray-600">Montant débité (sortie)</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-2">
                            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold flex-shrink-0">✓</span>
                            <div>
                              <p className="text-xs font-semibold text-gray-900">CreditAmount</p>
                              <p className="text-xs text-gray-600">Montant crédité (entrée)</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-2">
                            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold flex-shrink-0">✓</span>
                            <div>
                              <p className="text-xs font-semibold text-gray-900">HoldAmount</p>
                              <p className="text-xs text-gray-600">Montant retenu temporairement</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-2">
                            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold flex-shrink-0">✓</span>
                            <div>
                              <p className="text-xs font-semibold text-gray-900">ConvenienceFeeAmount</p>
                              <p className="text-xs text-gray-600">Frais de commodité</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-2">
                            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold flex-shrink-0">✓</span>
                            <div>
                              <p className="text-xs font-semibold text-gray-900">AccountName</p>
                              <p className="text-xs text-gray-600">Nom du compte bancaire</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-2">
                            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold flex-shrink-0">✓</span>
                            <div>
                              <p className="text-xs font-semibold text-gray-900">WalletName1</p>
                              <p className="text-xs text-gray-600">Portefeuille principal</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-2">
                            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold flex-shrink-0">✓</span>
                            <div>
                              <p className="text-xs font-semibold text-gray-900">WalletName2</p>
                              <p className="text-xs text-gray-600">Portefeuille secondaire</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-2">
                            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold flex-shrink-0">✓</span>
                            <div>
                              <p className="text-xs font-semibold text-gray-900">ClientAccountID</p>
                              <p className="text-xs text-gray-600">ID compte client interne</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Colonne 3: Relations & Errors */}
                      <div className="space-y-3">
                        <h4 className="text-xs font-bold text-emerald-700 uppercase tracking-wider mb-3 pb-2 border-b border-emerald-200">
                          Relations & Errors (4)
                        </h4>
                        <div className="space-y-2.5">
                          <div className="flex items-start gap-2">
                            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold flex-shrink-0">✓</span>
                            <div>
                              <p className="text-xs font-semibold text-gray-900">ParentTransactionID</p>
                              <p className="text-xs text-gray-600">ID transaction parente (si liée)</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-2">
                            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold flex-shrink-0">✓</span>
                            <div>
                              <p className="text-xs font-semibold text-gray-900">ChildTransactionIDs</p>
                              <p className="text-xs text-gray-600">IDs transactions enfants</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-2">
                            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold flex-shrink-0">✓</span>
                            <div>
                              <p className="text-xs font-semibold text-gray-900">TransactionErrorCode</p>
                              <p className="text-xs text-gray-600">Code d'erreur (si échec)</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-2">
                            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold flex-shrink-0">✓</span>
                            <div>
                              <p className="text-xs font-semibold text-gray-900">TransactionFailureReason</p>
                              <p className="text-xs text-gray-600">Raison de l'échec détaillée</p>
                            </div>
                          </div>
                        </div>

                        <div className="mt-6 pt-4 border-t border-emerald-200">
                          <div className="bg-gradient-to-br from-emerald-50 to-green-100 rounded-lg p-4 border border-emerald-300">
                            <p className="text-xs font-bold text-emerald-900 mb-2">📊 Résumé</p>
                            <div className="space-y-1 text-xs text-emerald-800">
                              <p>• <span className="font-semibold">6</span> champs d'identification</p>
                              <p>• <span className="font-semibold">8</span> champs financiers</p>
                              <p>• <span className="font-semibold">4</span> champs techniques</p>
                              <p className="font-bold text-emerald-900 pt-2 border-t border-emerald-300 mt-2">= 18 fields opérationnels</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </details>
            )}

            {/* Transactions récentes */}
            {!vopayLoading && vopayData.recentTransactions.length > 0 && (
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
                <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
                  <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                    <DollarSign size={18} className="text-[#00874e]" />
                    Transactions récentes VoPay
                  </h2>
                  <p className="text-xs text-gray-500 mt-1">Détails complets avec tous les 18 fields par transaction</p>
                </div>
                <div className="divide-y divide-gray-100">
                  {vopayData.recentTransactions.map((tx, i) => {
                    const status = (tx.TransactionStatus || '').toLowerCase()
                    const creditAmount = parseFloat(tx.CreditAmount || '0')
                    const debitAmount = parseFloat(tx.DebitAmount || '0')
                    const feeAmount = parseFloat(tx.ConvenienceFeeAmount || '0')
                    const netAmount = creditAmount - debitAmount

                    const txId = tx.TransactionID || `vopay-tx-${i}`
                    const isOpen = openVopayTxId === txId

                    return (
                      <details
                        key={txId}
                        className="group"
                        open={isOpen}
                        onClick={(e) => {
                          e.preventDefault()
                          setOpenVopayTxId(isOpen ? null : txId)
                        }}
                      >
                        <summary className="px-6 py-4 cursor-pointer hover:bg-gradient-to-r from-gray-50 to-transparent transition-all list-none">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4 flex-1">
                              <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-sm ${
                                status.includes('completed') || status.includes('success') ? 'bg-gradient-to-br from-green-100 to-emerald-200' :
                                status.includes('pending') ? 'bg-gradient-to-br from-blue-100 to-blue-200' :
                                status.includes('reversal') ? 'bg-gradient-to-br from-orange-100 to-orange-200' :
                                'bg-gradient-to-br from-red-100 to-red-200'
                              }`}>
                                {(status.includes('completed') || status.includes('success')) && <CheckCircle size={20} className="text-green-700" />}
                                {status.includes('pending') && <Clock size={20} className="text-blue-700" />}
                                {status.includes('reversal') && <RefreshCw size={20} className="text-orange-700" />}
                                {(status.includes('failed') || status.includes('error') || status.includes('cancelled')) && <XCircle size={20} className="text-red-700" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <p className="font-bold text-gray-900">{tx.FullName || 'Sans nom'}</p>
                                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                                    status.includes('completed') || status.includes('success') ? 'bg-green-100 text-green-700' :
                                    status.includes('pending') ? 'bg-blue-100 text-blue-700' :
                                    status.includes('reversal') ? 'bg-orange-100 text-orange-700' :
                                    'bg-red-100 text-red-700'
                                  }`}>
                                    {tx.TransactionStatus}
                                  </span>
                                </div>
                                <div className="flex items-center gap-3 text-xs text-gray-500">
                                  <span className="font-mono">#{tx.TransactionID}</span>
                                  <span>•</span>
                                  <span className="font-medium">{tx.TransactionType}</span>
                                  <span>•</span>
                                  <span suppressHydrationWarning>{new Date(tx.TransactionDateTime).toLocaleString('fr-CA')}</span>
                                </div>
                              </div>
                            </div>
                            <div className="text-right ml-4">
                              <p className={`text-lg font-bold ${netAmount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {netAmount >= 0 ? '+' : ''}{formatCurrency(netAmount)}
                              </p>
                              {feeAmount > 0 && (
                                <p className="text-xs text-amber-600 font-semibold">Frais: {formatCurrency(feeAmount)}</p>
                              )}
                            </div>
                            <ChevronRight size={20} className="text-gray-400 ml-2 group-open:rotate-90 transition-transform" />
                          </div>
                        </summary>

                        {/* Détails complets de la transaction */}
                        <div className="px-6 pb-4 pt-2 bg-gradient-to-br from-gray-50 to-white border-t border-gray-100">
                          <div className="grid grid-cols-2 gap-4">
                            {/* Colonne 1: Informations financières */}
                            <div className="space-y-3">
                              <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
                                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                                  <DollarSign size={14} className="text-green-600" />
                                  Détails financiers
                                </h4>
                                <div className="space-y-2 text-sm">
                                  {creditAmount > 0 && (
                                    <div className="flex justify-between">
                                      <span className="text-gray-600">Crédit:</span>
                                      <span className="font-bold text-green-600">+{formatCurrency(creditAmount)}</span>
                                    </div>
                                  )}
                                  {debitAmount > 0 && (
                                    <div className="flex justify-between">
                                      <span className="text-gray-600">Débit:</span>
                                      <span className="font-bold text-red-600">-{formatCurrency(debitAmount)}</span>
                                    </div>
                                  )}
                                  {feeAmount > 0 && (
                                    <div className="flex justify-between">
                                      <span className="text-gray-600">Frais:</span>
                                      <span className="font-semibold text-amber-600">{formatCurrency(feeAmount)}</span>
                                    </div>
                                  )}
                                  {parseFloat(tx.HoldAmount || '0') > 0 && (
                                    <div className="flex justify-between">
                                      <span className="text-gray-600">Retenu:</span>
                                      <span className="font-medium text-orange-600">{formatCurrency(parseFloat(tx.HoldAmount))}</span>
                                    </div>
                                  )}
                                  <div className="pt-2 border-t border-gray-200">
                                    <div className="flex justify-between">
                                      <span className="text-gray-900 font-semibold">Net:</span>
                                      <span className={`font-bold text-lg ${netAmount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        {netAmount >= 0 ? '+' : ''}{formatCurrency(netAmount)}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Informations bancaires */}
                              {(tx.AccountName || tx.WalletName1 || tx.WalletName2) && (
                                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200 shadow-sm">
                                  <h4 className="text-xs font-bold text-blue-700 uppercase tracking-wider mb-3 flex items-center gap-2">
                                    <Globe size={14} className="text-blue-600" />
                                    Données bancaires
                                  </h4>
                                  <div className="space-y-2 text-sm">
                                    {tx.AccountName && (
                                      <div>
                                        <p className="text-xs text-blue-600 font-medium">Compte:</p>
                                        <p className="font-semibold text-blue-900">{tx.AccountName}</p>
                                      </div>
                                    )}
                                    {tx.WalletName1 && (
                                      <div>
                                        <p className="text-xs text-blue-600 font-medium">Portefeuille 1:</p>
                                        <p className="font-semibold text-blue-900">{tx.WalletName1}</p>
                                      </div>
                                    )}
                                    {tx.WalletName2 && (
                                      <div>
                                        <p className="text-xs text-blue-600 font-medium">Portefeuille 2:</p>
                                        <p className="font-semibold text-blue-900">{tx.WalletName2}</p>
                                      </div>
                                    )}
                                    {tx.ClientAccountID && (
                                      <div>
                                        <p className="text-xs text-blue-600 font-medium">ID Compte Client:</p>
                                        <p className="font-mono text-xs text-blue-900">{tx.ClientAccountID}</p>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Colonne 2: Informations techniques */}
                            <div className="space-y-3">
                              <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
                                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                                  <Activity size={14} className="text-purple-600" />
                                  Informations techniques
                                </h4>
                                <div className="space-y-2 text-xs">
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">ID Transaction:</span>
                                    <span className="font-mono font-semibold text-gray-900">{tx.TransactionID}</span>
                                  </div>
                                  {tx.ClientReferenceNumber && (
                                    <div className="flex justify-between">
                                      <span className="text-gray-600">Réf. client:</span>
                                      <span className="font-mono font-medium text-gray-900">{tx.ClientReferenceNumber}</span>
                                    </div>
                                  )}
                                  {tx.SettlementDate && (
                                    <div className="flex justify-between">
                                      <span className="text-gray-600">Date règlement:</span>
                                      <span className="font-medium text-gray-900">{new Date(tx.SettlementDate).toLocaleDateString('fr-CA')}</span>
                                    </div>
                                  )}
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">Type:</span>
                                    <span className="font-semibold text-gray-900">{tx.TransactionType}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">Statut:</span>
                                    <span className={`font-semibold ${
                                      status.includes('completed') || status.includes('success') ? 'text-green-600' :
                                      status.includes('pending') ? 'text-blue-600' :
                                      'text-red-600'
                                    }`}>{tx.TransactionStatus}</span>
                                  </div>
                                  {tx.Currency && (
                                    <div className="flex justify-between">
                                      <span className="text-gray-600">Devise:</span>
                                      <span className="font-bold text-gray-900">{tx.Currency}</span>
                                    </div>
                                  )}
                                  {tx.LastModified && (
                                    <div className="flex justify-between">
                                      <span className="text-gray-600">Modifié:</span>
                                      <span className="font-medium text-gray-900">{new Date(tx.LastModified).toLocaleString('fr-CA')}</span>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Notes et erreurs */}
                              {(tx.Notes || tx.TransactionFailureReason || tx.TransactionErrorCode) && (
                                <div className={`rounded-lg p-4 border shadow-sm ${
                                  tx.TransactionFailureReason || tx.TransactionErrorCode
                                    ? 'bg-red-50 border-red-200'
                                    : 'bg-gray-50 border-gray-200'
                                }`}>
                                  <h4 className={`text-xs font-bold uppercase tracking-wider mb-2 ${
                                    tx.TransactionFailureReason || tx.TransactionErrorCode
                                      ? 'text-red-700'
                                      : 'text-gray-500'
                                  }`}>
                                    {tx.TransactionFailureReason || tx.TransactionErrorCode ? 'Erreur' : 'Notes'}
                                  </h4>
                                  {tx.TransactionErrorCode && (
                                    <p className="text-xs text-red-700 font-mono mb-1">Code: {tx.TransactionErrorCode}</p>
                                  )}
                                  {tx.TransactionFailureReason && (
                                    <p className="text-xs text-red-700 font-semibold mb-2">{tx.TransactionFailureReason}</p>
                                  )}
                                  {tx.Notes && (
                                    <p className="text-xs text-gray-700">{tx.Notes}</p>
                                  )}
                                </div>
                              )}

                              {/* Relations parent/enfant */}
                              {(tx.ParentTransactionID || tx.ChildTransactionIDs) && (
                                <div className="bg-purple-50 rounded-lg p-4 border border-purple-200 shadow-sm">
                                  <h4 className="text-xs font-bold text-purple-700 uppercase tracking-wider mb-2">Relations</h4>
                                  {tx.ParentTransactionID && (
                                    <div className="text-xs">
                                      <span className="text-purple-600">Parent:</span>
                                      <span className="font-mono ml-2 text-purple-900">{tx.ParentTransactionID}</span>
                                    </div>
                                  )}
                                  {tx.ChildTransactionIDs && (
                                    <div className="text-xs mt-1">
                                      <span className="text-purple-600">Enfants:</span>
                                      <span className="font-mono ml-2 text-purple-900">{tx.ChildTransactionIDs}</span>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </details>
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

                {/* Relevés Bancaires Tab */}
                {selectedVoPayTab === 'releves' && (
                  <div className="space-y-6">
                    {/* Info header */}
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <Download size={20} className="text-blue-600" />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-sm font-bold text-gray-900">Relevés Bancaires 2025</h3>
                          <p className="text-xs text-gray-600">Dernière mise à jour: {new Date().toLocaleDateString('fr-CA', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                        </div>
                        <a
                          href="https://dllyzfuqjzuhvshrlmuq.supabase.co/storage/v1/object/public/documents/Releves_Bancaires_2025.html"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          <Download size={16} />
                          Ouvrir en plein écran
                        </a>
                      </div>
                    </div>

                    {/* iframe container */}
                    <div className="bg-white rounded-lg border-2 border-gray-200 overflow-hidden shadow-sm">
                      <iframe
                        src="https://dllyzfuqjzuhvshrlmuq.supabase.co/storage/v1/object/public/documents/Releves_Bancaires_2025.html"
                        className="w-full border-0"
                        style={{ height: 'calc(100vh - 400px)', minHeight: '600px' }}
                        title="Relevés Bancaires 2025"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
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

        {/* DevOps View */}
        {selectedView === 'devops' && (
          <DevOpsView />
        )}
        </div>
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
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-gray-500 text-sm" suppressHydrationWarning>
            © {new Date().getFullYear()} Solution Argent Rapide. Tous droits reserves.
          </p>
        </div>
      </footer>
    </div>
  )
}

export default function AdminDashboard() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#10B981] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    }>
      <AdminDashboardContent />
    </Suspense>
  )
}
