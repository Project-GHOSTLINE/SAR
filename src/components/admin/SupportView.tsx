'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Plus, RefreshCw, Search, Filter, Loader2,
  AlertCircle, User, Mail, Calendar, Tag,
  MessageSquare, Paperclip
} from 'lucide-react'
import CreateTicketModal from './CreateTicketModal'
import {
  SUPPORT_CATEGORIES,
  PRIORITY_LEVELS,
  TICKET_STATUSES,
  SUPPORT_ASSIGNEES,
  getStatusColor,
  getStatusLabel,
  getStatusIcon,
  getPriorityColor,
  getPriorityLabel,
  getCategoryLabel,
  formatRelativeTime,
  formatFullDate,
  truncate,
  getInitials
} from '@/lib/support-utils'
import { formatDiagnosticsForDisplay } from '@/lib/support-diagnostics'

interface Ticket {
  id: string
  ticket_number: string
  created_by: string
  created_by_email: string
  title: string
  description: string
  category: string
  priority: string
  status: string
  assigned_to: string | null
  assigned_at: string | null
  resolved_at: string | null
  resolved_by: string | null
  resolution_notes: string | null
  browser_info: any
  system_info: any
  console_logs: any
  connection_tests: any
  page_url: string | null
  created_at: string
  updated_at: string
  last_activity_at: string
}

interface Message {
  id: string
  ticket_id: string
  sender_name: string
  sender_email: string
  sender_role: 'employee' | 'support'
  message: string
  is_internal_note: boolean
  created_at: string
}

interface Attachment {
  id: string
  ticket_id: string
  file_name: string
  file_type: string
  file_url: string
  uploaded_by: string
  created_at: string
}

interface Stats {
  nouveau: number
  en_cours: number
  resolu: number
  ferme: number
  total: number
}

export default function SupportView() {
  // State
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [stats, setStats] = useState<Stats>({ nouveau: 0, en_cours: 0, resolu: 0, ferme: 0, total: 0 })

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [assignedFilter, setAssignedFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')

  // UI State
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [newMessage, setNewMessage] = useState('')
  const [sendingMessage, setSendingMessage] = useState(false)

  // Fetch tickets
  const fetchTickets = useCallback(async () => {
    try {
      setRefreshing(true)

      const params = new URLSearchParams()
      if (statusFilter !== 'all') {
        params.append('status', statusFilter)
      }
      if (assignedFilter !== 'all') {
        params.append('assigned_to', assignedFilter)
      }

      const res = await fetch(`/api/admin/support/tickets?${params.toString()}`, {
        credentials: 'include'
      })

      if (res.ok) {
        const data = await res.json()
        setTickets(data.tickets || [])
        setStats(data.stats || { nouveau: 0, en_cours: 0, resolu: 0, ferme: 0, total: 0 })
      }
    } catch (error) {
      console.error('Erreur fetch tickets:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [statusFilter, assignedFilter])

  // Fetch ticket details
  const fetchTicketDetails = useCallback(async (ticketId: string) => {
    try {
      const res = await fetch(`/api/admin/support/tickets/${ticketId}`, {
        credentials: 'include'
      })

      if (res.ok) {
        const data = await res.json()
        setSelectedTicket(data.ticket)
        setMessages(data.messages || [])
        setAttachments(data.attachments || [])
      }
    } catch (error) {
      console.error('Erreur fetch ticket details:', error)
    }
  }, [])

  // Update ticket
  const updateTicket = useCallback(async (ticketId: string, updates: any) => {
    try {
      const res = await fetch(`/api/admin/support/tickets/${ticketId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(updates)
      })

      if (res.ok) {
        const data = await res.json()
        setSelectedTicket(data.ticket)
        fetchTickets() // Refresh list
        return true
      }
    } catch (error) {
      console.error('Erreur update ticket:', error)
    }
    return false
  }, [fetchTickets])

  // Send message
  const handleSendMessage = useCallback(async () => {
    if (!newMessage.trim() || !selectedTicket) return

    try {
      setSendingMessage(true)

      const res = await fetch('/api/admin/support/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ticket_id: selectedTicket.id,
          sender_name: 'Support Technique', // TODO: Get from session
          sender_email: 'support@solutionargentrapide.ca',
          sender_role: 'support',
          message: newMessage,
          is_internal_note: false
        })
      })

      if (res.ok) {
        setNewMessage('')
        fetchTicketDetails(selectedTicket.id) // Refresh messages
      }
    } catch (error) {
      console.error('Erreur envoi message:', error)
    } finally {
      setSendingMessage(false)
    }
  }, [newMessage, selectedTicket, fetchTicketDetails])

  // Initial load
  useEffect(() => {
    fetchTickets()
  }, [fetchTickets])

  // Filter tickets by search
  const filteredTickets = tickets.filter(ticket => {
    if (!searchQuery) return true

    const query = searchQuery.toLowerCase()
    return (
      ticket.title.toLowerCase().includes(query) ||
      ticket.ticket_number.toLowerCase().includes(query) ||
      ticket.created_by.toLowerCase().includes(query) ||
      ticket.description.toLowerCase().includes(query)
    )
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 size={48} className="animate-spin text-[#00874e] mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Chargement des tickets...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              🛠️ Support Technique
            </h2>
            <p className="text-gray-600 mt-1">
              Gestion des tickets de support pour l'équipe
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => fetchTickets()}
              className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-all shadow-sm hover:shadow flex items-center gap-2"
              disabled={refreshing}
            >
              <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
              Actualiser
            </button>

            <button
              onClick={() => setIsModalOpen(true)}
              className="px-6 py-2 bg-gradient-to-r from-[#00874e] to-emerald-600 text-white rounded-xl hover:from-[#006d3f] hover:to-emerald-700 transition-all font-medium shadow-lg hover:shadow-xl flex items-center gap-2"
            >
              <Plus size={20} />
              Nouveau Ticket
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-5 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-sm text-gray-600 mb-1">Total</p>
            <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
          </div>

          <div className="bg-red-50 rounded-xl border border-red-200 p-4">
            <p className="text-sm text-red-600 mb-1 flex items-center gap-2">
              🔴 Nouveau
            </p>
            <p className="text-3xl font-bold text-red-700">{stats.nouveau}</p>
          </div>

          <div className="bg-yellow-50 rounded-xl border border-yellow-200 p-4">
            <p className="text-sm text-yellow-600 mb-1 flex items-center gap-2">
              🟡 En cours
            </p>
            <p className="text-3xl font-bold text-yellow-700">{stats.en_cours}</p>
          </div>

          <div className="bg-green-50 rounded-xl border border-green-200 p-4">
            <p className="text-sm text-green-600 mb-1 flex items-center gap-2">
              🟢 Résolu
            </p>
            <p className="text-3xl font-bold text-green-700">{stats.resolu}</p>
          </div>

          <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
            <p className="text-sm text-gray-600 mb-1 flex items-center gap-2">
              ⚫ Fermé
            </p>
            <p className="text-3xl font-bold text-gray-700">{stats.ferme}</p>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="mb-6 flex gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher par titre, numéro, employé..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00874e] focus:border-[#00874e]"
            />
          </div>
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00874e] focus:border-[#00874e]"
        >
          <option value="all">Tous les statuts</option>
          {TICKET_STATUSES.map((status) => (
            <option key={status.id} value={status.id}>
              {status.icon} {status.label}
            </option>
          ))}
        </select>

        <select
          value={assignedFilter}
          onChange={(e) => setAssignedFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00874e] focus:border-[#00874e]"
        >
          <option value="all">Tous les assignés</option>
          <option value="unassigned">Non assigné</option>
          {SUPPORT_ASSIGNEES.map((assignee) => (
            <option key={assignee.email} value={assignee.name}>
              {assignee.name}
            </option>
          ))}
        </select>
      </div>

      {/* Content: List + Details */}
      <div className="flex-1 grid grid-cols-12 gap-6">
        {/* Left: Ticket List */}
        <div className="col-span-5 space-y-3 overflow-y-auto max-h-[calc(100vh-400px)]">
          {filteredTickets.length === 0 ? (
            <div className="text-center py-12">
              <AlertCircle size={48} className="text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Aucun ticket trouvé</p>
            </div>
          ) : (
            filteredTickets.map((ticket) => (
              <div
                key={ticket.id}
                onClick={() => fetchTicketDetails(ticket.id)}
                className={`bg-white rounded-xl border-2 p-4 cursor-pointer transition-all hover:shadow-md ${
                  selectedTicket?.id === ticket.id
                    ? 'border-[#00874e] shadow-md'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(ticket.status)}`}>
                      {getStatusIcon(ticket.status)} {getStatusLabel(ticket.status)}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${getPriorityColor(ticket.priority)}`}>
                      {getPriorityLabel(ticket.priority)}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500 font-mono">{ticket.ticket_number}</span>
                </div>

                <h3 className="font-bold text-gray-900 mb-2 line-clamp-2">{ticket.title}</h3>

                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <div className="flex items-center gap-1">
                    <User size={14} />
                    <span>{ticket.created_by.split(' ')[0]}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar size={14} />
                    <span>{formatRelativeTime(ticket.created_at)}</span>
                  </div>
                </div>

                {ticket.assigned_to && (
                  <div className="mt-2 flex items-center gap-2">
                    <div className="w-6 h-6 bg-[#00874e] rounded-full flex items-center justify-center text-white text-xs font-bold">
                      {getInitials(ticket.assigned_to)}
                    </div>
                    <span className="text-xs text-gray-600">{ticket.assigned_to}</span>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Right: Ticket Details */}
        <div className="col-span-7">
          {selectedTicket ? (
            <div className="bg-white rounded-xl border border-gray-200 p-6 h-full overflow-y-auto max-h-[calc(100vh-400px)]">
              {/* Ticket Header */}
              <div className="border-b border-gray-200 pb-6 mb-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">{selectedTicket.title}</h2>
                    <span className="text-sm text-gray-500 font-mono">{selectedTicket.ticket_number}</span>
                  </div>
                  <div className="flex flex-col gap-2 items-end">
                    <span className={`px-4 py-2 rounded-full text-sm font-bold ${getStatusColor(selectedTicket.status)}`}>
                      {getStatusIcon(selectedTicket.status)} {getStatusLabel(selectedTicket.status)}
                    </span>
                    <span className={`px-4 py-2 rounded-full text-sm font-bold ${getPriorityColor(selectedTicket.priority)}`}>
                      {getPriorityLabel(selectedTicket.priority)}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => updateTicket(selectedTicket.id, { status: 'en_cours' })}
                    className="px-4 py-2 bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200 transition-colors text-sm font-medium"
                    disabled={selectedTicket.status === 'en_cours'}
                  >
                    🟡 En cours
                  </button>
                  <button
                    onClick={() => updateTicket(selectedTicket.id, { status: 'resolu', resolved_by: 'Support' })}
                    className="px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors text-sm font-medium"
                    disabled={selectedTicket.status === 'resolu'}
                  >
                    🟢 Résolu
                  </button>
                  <button
                    onClick={() => updateTicket(selectedTicket.id, { status: 'ferme' })}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
                    disabled={selectedTicket.status === 'ferme'}
                  >
                    ⚫ Fermer
                  </button>

                  <div className="flex-1"></div>

                  <select
                    value={selectedTicket.assigned_to || ''}
                    onChange={(e) => updateTicket(selectedTicket.id, { assigned_to: e.target.value || null })}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00874e] text-sm"
                  >
                    <option value="">Non assigné</option>
                    {SUPPORT_ASSIGNEES.map((assignee) => (
                      <option key={assignee.email} value={assignee.name}>
                        👤 {assignee.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Ticket Info */}
              <div className="space-y-6">
                {/* Creator Info */}
                <div>
                  <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                    <User size={18} />
                    Créé par
                  </h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="font-medium text-gray-900">{selectedTicket.created_by}</p>
                    <p className="text-sm text-gray-600">{selectedTicket.created_by_email}</p>
                    <p className="text-xs text-gray-500 mt-2">{formatFullDate(selectedTicket.created_at)}</p>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <h3 className="font-bold text-gray-900 mb-3">📝 Description</h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-gray-700 whitespace-pre-wrap">{selectedTicket.description}</p>
                  </div>
                </div>

                {/* Category */}
                <div>
                  <h3 className="font-bold text-gray-900 mb-3">🏷️ Catégorie</h3>
                  <span className="inline-block px-4 py-2 bg-blue-100 text-blue-700 rounded-lg font-medium">
                    {getCategoryLabel(selectedTicket.category)}
                  </span>
                </div>

                {/* Diagnostics */}
                {(selectedTicket.browser_info || selectedTicket.system_info || selectedTicket.console_logs || selectedTicket.connection_tests) && (
                  <div>
                    <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                      🔍 Diagnostics automatiques
                    </h3>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <pre className="text-xs text-gray-700 font-mono whitespace-pre-wrap">
                        {formatDiagnosticsForDisplay({
                          browser_info: selectedTicket.browser_info,
                          system_info: selectedTicket.system_info,
                          page_url: selectedTicket.page_url,
                          console_logs: selectedTicket.console_logs,
                          connection_tests: selectedTicket.connection_tests
                        })}
                      </pre>
                    </div>
                  </div>
                )}

                {/* Messages */}
                <div>
                  <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                    <MessageSquare size={18} />
                    Conversation ({messages.length})
                  </h3>

                  {messages.length === 0 ? (
                    <p className="text-gray-500 text-sm">Aucun message pour l'instant</p>
                  ) : (
                    <div className="space-y-3">
                      {messages.map((msg) => (
                        <div
                          key={msg.id}
                          className={`p-4 rounded-lg ${
                            msg.sender_role === 'support'
                              ? 'bg-blue-50 border-l-4 border-blue-500'
                              : 'bg-gray-50 border-l-4 border-gray-400'
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold ${
                              msg.sender_role === 'support' ? 'bg-blue-600' : 'bg-gray-600'
                            }`}>
                              {getInitials(msg.sender_name)}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{msg.sender_name}</p>
                              <p className="text-xs text-gray-500">{formatRelativeTime(msg.created_at)}</p>
                            </div>
                          </div>
                          <p className="text-gray-700 whitespace-pre-wrap">{msg.message}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Send Message */}
                  {selectedTicket.status !== 'ferme' && (
                    <div className="mt-4">
                      <textarea
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Écris une réponse..."
                        rows={3}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00874e] resize-none"
                      />
                      <button
                        onClick={handleSendMessage}
                        disabled={!newMessage.trim() || sendingMessage}
                        className="mt-2 px-6 py-2 bg-[#00874e] text-white rounded-lg hover:bg-[#006d3f] transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        {sendingMessage ? (
                          <>
                            <Loader2 size={18} className="animate-spin" />
                            Envoi...
                          </>
                        ) : (
                          <>
                            Envoyer →
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center h-full flex items-center justify-center">
              <div>
                <AlertCircle size={64} className="text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">Sélectionne un ticket pour voir les détails</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      <CreateTicketModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onTicketCreated={(ticket) => {
          fetchTickets()
          setIsModalOpen(false)
        }}
      />
    </div>
  )
}
