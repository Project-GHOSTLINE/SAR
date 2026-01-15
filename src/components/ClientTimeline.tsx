'use client'

/**
 * Composant Timeline Client - Vue 360° de tous les événements
 *
 * Affiche l'historique complet d'un client en agrégeant:
 * - Communications (emails, SMS)
 * - Loans (création, changements)
 * - Payment Events (NSF, reports)
 * - VoPay (paiements, échecs)
 */

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'

// Types
interface TimelineEvent {
  ts: string
  kind: 'COMMUNICATION' | 'LOAN' | 'PAYMENT_EVENT' | 'VOPAY'
  subtype: string
  direction?: string
  title: string
  summary: string
  ref: Record<string, any>
}

interface ClientTimelineProps {
  clientId: string
  limit?: number
}

// Icônes par type d'événement
const ICONS = {
  COMMUNICATION: '📧',
  LOAN: '💰',
  PAYMENT_EVENT: '💳',
  VOPAY: '🏦'
}

// Couleurs par type
const COLORS = {
  COMMUNICATION: 'bg-blue-100 text-blue-800',
  LOAN: 'bg-green-100 text-green-800',
  PAYMENT_EVENT: 'bg-yellow-100 text-yellow-800',
  VOPAY: 'bg-purple-100 text-purple-800'
}

export function ClientTimeline({ clientId, limit = 50 }: ClientTimelineProps) {
  const [events, setEvents] = useState<TimelineEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<string>('all')

  useEffect(() => {
    loadTimeline()
  }, [clientId, limit])

  async function loadTimeline() {
    try {
      setLoading(true)
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )

      const { data, error: queryError } = await supabase
        .from('vw_client_timeline')
        .select('*')
        .eq('client_id', clientId)
        .order('ts', { ascending: false })
        .limit(limit)

      if (queryError) throw queryError

      setEvents(data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur chargement timeline')
      console.error('Erreur timeline:', err)
    } finally {
      setLoading(false)
    }
  }

  const filteredEvents = filter === 'all'
    ? events
    : events.filter(e => e.kind === filter)

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">❌ {error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Filtres */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setFilter('all')}
          className={`px-3 py-1 rounded-full text-sm font-medium transition ${
            filter === 'all'
              ? 'bg-gray-900 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Tout ({events.length})
        </button>

        {Object.keys(ICONS).map(kind => {
          const count = events.filter(e => e.kind === kind).length
          return (
            <button
              key={kind}
              onClick={() => setFilter(kind)}
              className={`px-3 py-1 rounded-full text-sm font-medium transition ${
                filter === kind
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {ICONS[kind as keyof typeof ICONS]} {kind} ({count})
            </button>
          )
        })}
      </div>

      {/* Timeline */}
      <div className="space-y-3">
        {filteredEvents.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            Aucun événement trouvé
          </div>
        ) : (
          filteredEvents.map((event, idx) => (
            <TimelineCard key={idx} event={event} />
          ))
        )}
      </div>
    </div>
  )
}

function TimelineCard({ event }: { event: TimelineEvent }) {
  const icon = ICONS[event.kind]
  const colorClass = COLORS[event.kind]

  return (
    <div className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition">
      <div className="flex items-start gap-3">
        {/* Icône */}
        <div className={`flex-shrink-0 w-10 h-10 rounded-full ${colorClass} flex items-center justify-center text-xl`}>
          {icon}
        </div>

        {/* Contenu */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-medium text-gray-900">{event.title}</h3>
              <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                <span className={`px-2 py-0.5 rounded ${colorClass} text-xs font-medium`}>
                  {event.subtype}
                </span>
                {event.direction && (
                  <span className="text-xs">
                    {event.direction === 'inbound' ? '📥' : '📤'}
                  </span>
                )}
              </div>
            </div>

            {/* Timestamp */}
            <time className="text-sm text-gray-500 whitespace-nowrap">
              {formatDistanceToNow(new Date(event.ts), {
                addSuffix: true,
                locale: fr
              })}
            </time>
          </div>

          {/* Résumé */}
          {event.summary && (
            <p className="mt-2 text-sm text-gray-600 line-clamp-2">
              {event.summary}
            </p>
          )}

          {/* Détails additionnels */}
          {event.ref && Object.keys(event.ref).length > 0 && (
            <details className="mt-2">
              <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
                Voir détails →
              </summary>
              <pre className="mt-2 text-xs bg-gray-50 p-2 rounded overflow-x-auto">
                {JSON.stringify(event.ref, null, 2)}
              </pre>
            </details>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * Composant Stats Timeline (résumé)
 */
export function ClientTimelineStats({ clientId }: { clientId: string }) {
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStats()
  }, [clientId])

  async function loadStats() {
    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )

      const { data } = await supabase
        .from('vw_client_timeline_by_type')
        .select('*')
        .eq('client_id', clientId)

      setStats(data || [])
    } catch (err) {
      console.error('Erreur stats:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading || !stats) return null

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {stats.map((stat: any) => (
        <div key={stat.kind} className="bg-white border rounded-lg p-4">
          <div className="text-2xl mb-1">{ICONS[stat.kind as keyof typeof ICONS]}</div>
          <div className="text-2xl font-bold">{stat.event_count}</div>
          <div className="text-sm text-gray-600">{stat.kind}</div>
        </div>
      ))}
    </div>
  )
}
