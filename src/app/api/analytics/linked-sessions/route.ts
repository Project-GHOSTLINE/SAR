import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

/**
 * GET /api/analytics/linked-sessions
 *
 * Récupère toutes les sessions liées aux clients avec vérification de cohérence
 * Retourne les données analytics + client + flags de cohérence
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Fetch linked sessions with client details
    const { data: linkedSessions, error } = await supabase
      .from('client_sessions')
      .select(`
        *,
        client:clients!client_sessions_client_id_fkey (
          id,
          first_name,
          last_name,
          primary_email,
          primary_phone,
          status,
          dob,
          address_line1,
          address_city,
          address_province,
          address_postal_code
        )
      `)
      .not('client_id', 'is', null)
      .order('linked_at', { ascending: false })
      .limit(500)

    if (error) {
      console.error('Error fetching linked sessions:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch linked sessions' },
        { status: 500 }
      )
    }

    // For each linked session, perform coherence checks
    const sessionsWithCoherence = linkedSessions?.map(session => {
      const coherenceFlags: string[] = []
      let coherenceScore = 100 // Start at 100, deduct for inconsistencies

      // 1. Check if client still exists
      if (!session.client) {
        coherenceFlags.push('⚠️ Client record missing')
        coherenceScore -= 50
      }

      // 2. Check device consistency
      // (We'd need to fetch other sessions for this client to compare)
      // For now, just flag if device info is missing
      if (!session.device_type || session.device_type === 'unknown') {
        coherenceFlags.push('📱 Device info incomplete')
        coherenceScore -= 10
      }

      // 3. Check location consistency
      // (Would need to compare with client's address)
      const clientAddress = session.client?.address_city || session.client?.address_province
      if (session.meta?.city && clientAddress) {
        const sessionCity = (session.meta as any).city?.toLowerCase()
        const clientCity = clientAddress.toLowerCase()

        // Simple check - would need fuzzy matching in production
        if (sessionCity && !clientCity.includes(sessionCity) && !sessionCity.includes(clientCity)) {
          coherenceFlags.push(`📍 Location mismatch: Session (${sessionCity}) vs Client (${clientCity})`)
          coherenceScore -= 15
        }
      }

      // 4. Check if linkage method is valid
      if (!session.linked_via || !['form_submit', 'magic_link', 'login', 'contact_form'].includes(session.linked_via)) {
        coherenceFlags.push('🔗 Invalid linkage method')
        coherenceScore -= 20
      }

      // 5. Check temporal consistency
      const linkedDate = new Date(session.linked_at)
      const createdDate = new Date(session.created_at)
      const timeDiff = linkedDate.getTime() - createdDate.getTime()

      // If linkage happened before session creation, that's impossible
      if (timeDiff < 0) {
        coherenceFlags.push('⏰ Temporal inconsistency: linkage before creation')
        coherenceScore -= 30
      }

      // If linkage happened > 30 days after first visit, flag as unusual
      if (timeDiff > 30 * 24 * 60 * 60 * 1000) {
        coherenceFlags.push('⏰ Long delay between visit and linkage (30+ days)')
        coherenceScore -= 5
      }

      // 6. Check email consistency (if email in metadata matches client email)
      const clientEmail = session.client?.primary_email?.toLowerCase()
      if (session.meta && typeof session.meta === 'object') {
        const metaEmail = (session.meta as any).email?.toLowerCase()
        if (metaEmail && clientEmail && metaEmail !== clientEmail) {
          coherenceFlags.push(`📧 Email mismatch: Session (${metaEmail}) vs Client (${clientEmail})`)
          coherenceScore -= 25
        }
      }

      // 7. Check if IP hash exists (fraud prevention)
      if (!session.ip_hash) {
        coherenceFlags.push('🔐 IP hash missing (fraud detection unavailable)')
        coherenceScore -= 5
      }

      // 8. Check UTM consistency (if multiple sessions from same client, should have similar sources)
      // This would require fetching all sessions for this client - skip for now

      return {
        ...session,
        coherence: {
          score: Math.max(0, coherenceScore), // Floor at 0
          flags: coherenceFlags,
          status: coherenceScore >= 90 ? 'excellent' :
                  coherenceScore >= 70 ? 'good' :
                  coherenceScore >= 50 ? 'concerning' :
                  'critical'
        }
      }
    }) || []

    // Aggregate stats
    const stats = {
      total_linked_sessions: sessionsWithCoherence.length,
      unique_clients: new Set(sessionsWithCoherence.map(s => s.client_id)).size,
      linkage_methods: sessionsWithCoherence.reduce((acc, s) => {
        const method = s.linked_via || 'unknown'
        acc[method] = (acc[method] || 0) + 1
        return acc
      }, {} as Record<string, number>),
      coherence_distribution: {
        excellent: sessionsWithCoherence.filter(s => s.coherence.status === 'excellent').length,
        good: sessionsWithCoherence.filter(s => s.coherence.status === 'good').length,
        concerning: sessionsWithCoherence.filter(s => s.coherence.status === 'concerning').length,
        critical: sessionsWithCoherence.filter(s => s.coherence.status === 'critical').length,
      },
      avg_coherence_score: sessionsWithCoherence.reduce((sum, s) => sum + s.coherence.score, 0) / sessionsWithCoherence.length || 0
    }

    return NextResponse.json({
      success: true,
      data: sessionsWithCoherence,
      stats
    })

  } catch (error) {
    console.error('Error in linked-sessions endpoint:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
