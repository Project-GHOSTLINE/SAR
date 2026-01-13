'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  LogOut, TrendingUp, TrendingDown, Mail, DollarSign,
  AlertTriangle, Activity, ChevronRight, CheckCircle,
  XCircle, MessageSquare, Users, FileText, Loader2
} from 'lucide-react'
import AdminNav from '@/components/admin/AdminNav'

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
}

interface WebhookStats {
  monthTotal: number
  monthSuccessful: number
  monthFailed: number
  todayVolume: number
  yesterdayVolume: number
  volumeChange: number
  recentTransactions: RecentTransaction[]
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

interface MessageStats {
  totalMessages: number
  totalReplies: number
  unreadMessages: number
  responseRate: number
  avgResponseTime: string
  todayMessages: number
  yesterdayMessages: number
  weekMessages: number
  monthMessages: number
  messageChange: number
}

// Extraire l'option sélectionnée et la source du message
function extractOptionFromMessage(question: string): { source: string | null; option: string | null; message: string } {
  let source: string | null = null
  let option: string | null = null
  let cleanMessage = question

  // Détecter source Analyse Demande ou Formulaire Accueil
  const analyseMatch = question.match(/\[(Analyse Demande|Formulaire Accueil)\]/)
  if (analyseMatch) {
    source = analyseMatch[1]
    cleanMessage = cleanMessage.replace(/\[(Analyse Demande|Formulaire Accueil)\]\s*/g, '')
  }

  // Détecter option Analyse (entre crochets après la source)
  const analyseOptionMatch = cleanMessage.match(/\[([^\]]+)\]/)
  if (analyseOptionMatch && source) {
    option = analyseOptionMatch[1]
    cleanMessage = cleanMessage.replace(/\[[^\]]+\]\s*/g, '').trim()
  }

  // Détecter format Espace Client
  const espaceClientMatch = question.match(/\[Espace Client - ([^\]]+)\]/)
  if (espaceClientMatch) {
    source = 'Espace Client'
    option = espaceClientMatch[1]
    cleanMessage = question.replace(/\[Formulaire Contact\]\s*/g, '').replace(/\[Espace Client - [^\]]+\]\s*/g, '').trim()
  }

  // Détecter Formulaire Contact simple
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
    'Reporter un paiement': 'bg-blue-100 text-blue-700',
    'Reduire mes paiements': 'bg-emerald-100 text-emerald-700',
    'Signaler un changement': 'bg-violet-100 text-violet-700',
    'Releve ou solde de compte': 'bg-amber-100 text-amber-700',
    'Arrangement de paiement': 'bg-rose-100 text-rose-700',
    'Ou en est ma demande de credit?': 'bg-sky-100 text-sky-700',
    'Je veux annuler ma demande': 'bg-red-100 text-red-700',
    'Question sur mon remboursement': 'bg-orange-100 text-orange-700',
    'Autre question': 'bg-gray-100 text-gray-700'
  }
  return colors[option] || 'bg-gray-100 text-gray-600'
}

// Formatter la date
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

  const options: Intl.DateTimeFormatOptions = {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }
  return date.toLocaleDateString('fr-CA', options).replace(',', ' à')
}

export default function AdminDashboard() {
  const router = useRouter()
  const [messages, setMessages] = useState<Message[]>([])
  const [messageStats, setMessageStats] = useState<MessageStats | null>(null)
  const [webhookStats, setWebhookStats] = useState<WebhookStats | null>(null)
  const [loading, setLoading] = useState(true)

  // Fetch messages
  useEffect(() => {
    fetchMessages()
    fetchMessageStats()
    fetchWebhookStats()
  }, [])

  const fetchMessages = async () => {
    try {
      const res = await fetch('/api/admin/messages')
      if (res.ok) {
        const data = await res.json()
        setMessages(data.messages || [])
      }
    } catch (error) {
      console.error('Erreur lors du chargement des messages:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchMessageStats = async () => {
    try {
      const res = await fetch('/api/admin/messages/assign')
      if (res.ok) {
        const data = await res.json()
        setMessageStats(data)
      }
    } catch (error) {
      console.error('Erreur lors du chargement des stats:', error)
    }
  }

  const fetchWebhookStats = async () => {
    try {
      const res = await fetch('/api/admin/webhooks/stats')
      if (res.ok) {
        const data = await res.json()
        setWebhookStats(data)
      }
    } catch (error) {
      console.error('Erreur lors du chargement des stats webhooks:', error)
    }
  }

  // Support tickets (mock data - remplacer par vrai fetch)
  const supportTicketsCount = 0
  const analysesCount = 0

  // Derniers messages (5 plus récents)
  const recentMessages = messages.slice(0, 5)

  // Transactions récentes VoPay (5 plus récentes)
  const recentTransactions = webhookStats?.recentTransactions?.slice(0, 5) || []

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <AdminNav currentPage="/admin/dashboard" />
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-gray-600">Chargement du dashboard...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <AdminNav currentPage="/admin/dashboard" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Vue d'ensemble</h1>
          <p className="text-gray-600 mt-1">Statistiques et activité récente</p>
        </div>

        {/* Stats Rapides Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {/* Total Messages du mois */}
          <div
            onClick={() => router.push('/admin/messages')}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm text-gray-600 mb-1">Messages du mois</p>
                <p className="text-3xl font-bold text-gray-900">
                  {messageStats?.monthMessages || 0}
                </p>
                {messageStats && (
                  <div className="flex items-center mt-2">
                    {messageStats.messageChange >= 0 ? (
                      <TrendingUp className="w-4 h-4 text-green-600 mr-1" />
                    ) : (
                      <TrendingDown className="w-4 h-4 text-red-600 mr-1" />
                    )}
                    <span className={`text-sm ${messageStats.messageChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {messageStats.messageChange >= 0 ? '+' : ''}{messageStats.messageChange}%
                    </span>
                    <span className="text-sm text-gray-500 ml-2">vs hier</span>
                  </div>
                )}
              </div>
              <div className="ml-4 p-3 bg-blue-100 rounded-lg">
                <Mail className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          {/* Réponses Envoyées */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm text-gray-600 mb-1">Réponses Envoyées</p>
                <p className="text-3xl font-bold text-gray-900">
                  {messageStats?.totalReplies || 0}
                </p>
                <div className="flex items-center mt-2">
                  <span className="text-sm text-gray-500">
                    Taux: {messageStats?.responseRate || 0}%
                  </span>
                </div>
              </div>
              <div className="ml-4 p-3 bg-green-100 rounded-lg">
                <MessageSquare className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          {/* Transactions VoPay */}
          <div
            onClick={() => router.push('/admin/vopay')}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm text-gray-600 mb-1">Transactions VoPay</p>
                <p className="text-3xl font-bold text-gray-900">
                  {webhookStats?.monthTotal || 0}
                </p>
                {webhookStats && (
                  <div className="flex items-center mt-2">
                    {webhookStats.volumeChange >= 0 ? (
                      <TrendingUp className="w-4 h-4 text-green-600 mr-1" />
                    ) : (
                      <TrendingDown className="w-4 h-4 text-red-600 mr-1" />
                    )}
                    <span className={`text-sm ${webhookStats.volumeChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {webhookStats.volumeChange >= 0 ? '+' : ''}{webhookStats.volumeChange}%
                    </span>
                    <span className="text-sm text-gray-500 ml-2">vs hier</span>
                  </div>
                )}
              </div>
              <div className="ml-4 p-3 bg-purple-100 rounded-lg">
                <DollarSign className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>

          {/* Support Tickets */}
          <div
            onClick={() => router.push('/admin/support')}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm text-gray-600 mb-1">Support Tickets</p>
                <p className="text-3xl font-bold text-gray-900">
                  {supportTicketsCount}
                </p>
                <div className="flex items-center mt-2">
                  <span className="text-sm text-gray-500">Tickets ouverts</span>
                </div>
              </div>
              <div className="ml-4 p-3 bg-orange-100 rounded-lg">
                <AlertTriangle className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </div>

          {/* Analyses Client */}
          <div
            onClick={() => router.push('/admin/analyses')}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm text-gray-600 mb-1">Analyses Client</p>
                <p className="text-3xl font-bold text-gray-900">
                  {analysesCount}
                </p>
                <div className="flex items-center mt-2">
                  <span className="text-sm text-gray-500">En attente</span>
                </div>
              </div>
              <div className="ml-4 p-3 bg-indigo-100 rounded-lg">
                <FileText className="w-6 h-6 text-indigo-600" />
              </div>
            </div>
          </div>

          {/* Webhooks Status */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm text-gray-600 mb-1">Webhooks Status</p>
                <div className="flex items-center gap-4 mt-2">
                  <div className="flex items-center">
                    <CheckCircle className="w-4 h-4 text-green-600 mr-1" />
                    <span className="text-sm font-medium text-gray-900">
                      {webhookStats?.monthSuccessful || 0}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <XCircle className="w-4 h-4 text-red-600 mr-1" />
                    <span className="text-sm font-medium text-gray-900">
                      {webhookStats?.monthFailed || 0}
                    </span>
                  </div>
                </div>
                <div className="flex items-center mt-2">
                  <span className="text-sm text-gray-500">Ce mois-ci</span>
                </div>
              </div>
              <div className="ml-4 p-3 bg-teal-100 rounded-lg">
                <Activity className="w-6 h-6 text-teal-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Derniers Messages Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-8">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Derniers Messages</h2>
                <p className="text-sm text-gray-600 mt-1">5 messages les plus récents</p>
              </div>
              <button
                onClick={() => router.push('/admin/messages')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                Voir tous
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="divide-y divide-gray-200">
            {recentMessages.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                Aucun message récent
              </div>
            ) : (
              recentMessages.map((message) => {
                const { source, option, message: cleanMessage } = extractOptionFromMessage(message.question)
                return (
                  <div
                    key={message.id}
                    onClick={() => router.push('/admin/messages')}
                    className="p-6 hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-semibold text-gray-900">{message.nom}</span>
                          {source && (
                            <span className={`text-xs px-2 py-1 rounded-full ${getSourceColor(source)}`}>
                              {source}
                            </span>
                          )}
                          {option && (
                            <span className={`text-xs px-2 py-1 rounded-full ${getOptionColor(option)}`}>
                              {option}
                            </span>
                          )}
                          {!message.lu && (
                            <span className="w-2 h-2 bg-blue-600 rounded-full" />
                          )}
                        </div>
                        <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                          {cleanMessage}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span>{message.email}</span>
                          <span>{message.telephone}</span>
                          <span>{formatLastMessageDate(message.date)}</span>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-400 ml-4" />
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Activité Récente VoPay Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Activité Récente VoPay</h2>
                <p className="text-sm text-gray-600 mt-1">Transactions récentes</p>
              </div>
              <button
                onClick={() => router.push('/admin/vopay')}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
              >
                Voir tous
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="divide-y divide-gray-200">
            {recentTransactions.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                Aucune transaction récente
              </div>
            ) : (
              recentTransactions.map((transaction) => (
                <div
                  key={transaction.id}
                  onClick={() => router.push('/admin/vopay')}
                  className="p-6 hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="font-mono text-sm font-semibold text-gray-900">
                          {transaction.transaction_id}
                        </span>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          transaction.status === 'completed' ? 'bg-green-100 text-green-700' :
                          transaction.status === 'failed' ? 'bg-red-100 text-red-700' :
                          transaction.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {transaction.status}
                        </span>
                        <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700">
                          {transaction.transaction_type}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        <span className="font-semibold text-gray-900">
                          ${(transaction.transaction_amount / 100).toFixed(2)}
                        </span>
                        <span className="text-gray-500">
                          {formatLastMessageDate(transaction.received_at)}
                        </span>
                        {transaction.failure_reason && (
                          <span className="text-red-600 text-xs">
                            {transaction.failure_reason}
                          </span>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400 ml-4" />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
