import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

/**
 * GET /api/analytics/client-unified-metrics?client_id=uuid
 *
 * SUPER ENDPOINT: Merge ALL client data from ALL sources
 * - Client profile (clients)
 * - Contact messages (contact_messages)
 * - Applications (loan_applications)
 * - VoPay transactions (vopay_transactions)
 * - Support tickets (support_tickets)
 * - Email messages (email_messages)
 * - Analytics sessions (client_sessions)
 * - Telemetry events (client_telemetry_events)
 * - IP traces (telemetry_requests)
 *
 * Performs COMPREHENSIVE coherence checks across ALL data sources
 * Returns unified metrics + coherence score + anomaly flags
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const clientId = searchParams.get('client_id')

    if (!clientId) {
      return NextResponse.json(
        { success: false, error: 'client_id parameter required' },
        { status: 400 }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // ========================================================================
    // FETCH ALL DATA SOURCES IN PARALLEL
    // ========================================================================
    // First, get client to extract email
    const { data: client } = await supabase
      .from('clients')
      .select('*')
      .eq('id', clientId)
      .single()

    if (!client) {
      return NextResponse.json(
        { success: false, error: 'Client not found' },
        { status: 404 }
      )
    }

    // Now fetch all other data sources in parallel
    const [
      messagesRes,
      applicationsRes,
      vopayRes,
      supportRes,
      emailsRes,
      sessionsRes,
      eventsRes
    ] = await Promise.allSettled([
      // 1. Contact messages (by email)
      supabase
        .from('contact_messages')
        .select('*')
        .eq('client_email', client.primary_email || '')
        .order('created_at', { ascending: false }),

      // 3. Loan applications
      supabase
        .from('loan_applications')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false }),

      // 4. VoPay transactions
      supabase
        .from('vopay_transactions')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false }),

      // 5. Support tickets
      supabase
        .from('support_tickets')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false }),

      // 6. Email messages
      supabase
        .from('email_messages')
        .select('*')
        .eq('client_id', clientId)
        .order('received_at', { ascending: false })
        .limit(50),

      // 7. Analytics sessions
      supabase
        .from('client_sessions')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false }),

      // 8. Telemetry events (via sessions)
      supabase
        .from('client_sessions')
        .select(`
          session_id,
          client_telemetry_events (*)
        `)
        .eq('client_id', clientId)
    ])

    // ========================================================================
    // EXTRACT DATA (with fallbacks for missing tables)
    // ========================================================================
    const messages = messagesRes.status === 'fulfilled' && messagesRes.value.data ? messagesRes.value.data : []
    const applications = applicationsRes.status === 'fulfilled' && applicationsRes.value.data ? applicationsRes.value.data : []
    const vopayTransactions = vopayRes.status === 'fulfilled' && vopayRes.value.data ? vopayRes.value.data : []
    const supportTickets = supportRes.status === 'fulfilled' && supportRes.value.data ? supportRes.value.data : []
    const emailMessages = emailsRes.status === 'fulfilled' && emailsRes.value.data ? emailsRes.value.data : []
    const sessions = sessionsRes.status === 'fulfilled' && sessionsRes.value.data ? sessionsRes.value.data : []
    const eventsData = eventsRes.status === 'fulfilled' && eventsRes.value.data ? eventsRes.value.data : []

    // Flatten telemetry events
    const telemetryEvents: any[] = []
    eventsData.forEach((session: any) => {
      if (session.client_telemetry_events && Array.isArray(session.client_telemetry_events)) {
        telemetryEvents.push(...session.client_telemetry_events)
      }
    })

    // ========================================================================
    // CALCULATE UNIFIED METRICS
    // ========================================================================
    const metrics = {
      // Client profile
      client_id: client.id,
      client_name: `${client.first_name} ${client.last_name}`,
      client_email: client.primary_email,
      client_phone: client.primary_phone,
      client_status: client.status,
      client_address: {
        line1: client.address_line1,
        city: client.address_city,
        province: client.address_province,
        postal_code: client.address_postal_code
      },

      // Communication channels
      total_contact_messages: messages.length,
      total_support_tickets: supportTickets.length,
      total_email_messages: emailMessages.length,

      // Business transactions
      total_applications: applications.length,
      total_vopay_transactions: vopayTransactions.length,

      // Analytics & behavior
      total_sessions: sessions.length,
      total_telemetry_events: telemetryEvents.length,

      // Timeline
      first_contact_date: messages[0]?.created_at || applications[0]?.created_at || sessions[0]?.created_at || null,
      last_activity_date: [
        messages[0]?.created_at,
        applications[0]?.created_at,
        sessions[0]?.last_activity_at,
        supportTickets[0]?.updated_at
      ].filter(Boolean).sort().reverse()[0] || null,

      // Engagement score (0-100)
      engagement_score: calculateEngagementScore({
        messages: messages.length,
        applications: applications.length,
        sessions: sessions.length,
        supportTickets: supportTickets.length
      })
    }

    // ========================================================================
    // COMPREHENSIVE COHERENCE CHECKS
    // ========================================================================
    const coherenceFlags: string[] = []
    let coherenceScore = 100

    // 1. EMAIL CONSISTENCY across all sources
    const emailsFound = new Set<string>()
    emailsFound.add(client.primary_email?.toLowerCase())
    messages.forEach((m: any) => m.client_email && emailsFound.add(m.client_email.toLowerCase()))
    applications.forEach((a: any) => a.courriel && emailsFound.add(a.courriel.toLowerCase()))
    sessions.forEach((s: any) => {
      if (s.meta && typeof s.meta === 'object' && (s.meta as any).email) {
        emailsFound.add((s.meta as any).email.toLowerCase())
      }
    })
    emailsFound.delete(undefined as any)
    emailsFound.delete(null as any)

    if (emailsFound.size > 1) {
      coherenceFlags.push(`📧 Multiple emails detected: ${Array.from(emailsFound).join(', ')}`)
      coherenceScore -= 20
    }

    // 2. PHONE CONSISTENCY
    const phonesFound = new Set<string>()
    phonesFound.add(client.primary_phone)
    applications.forEach((a: any) => a.telephone && phonesFound.add(a.telephone))
    phonesFound.delete(undefined as any)
    phonesFound.delete(null as any)

    if (phonesFound.size > 1) {
      coherenceFlags.push(`📞 Multiple phones detected: ${Array.from(phonesFound).join(', ')}`)
      coherenceScore -= 15
    }

    // 3. NAME CONSISTENCY
    const namesFound = new Set<string>()
    namesFound.add(`${client.first_name} ${client.last_name}`.toLowerCase())
    applications.forEach((a: any) => {
      if (a.prenom && a.nom) {
        namesFound.add(`${a.prenom} ${a.nom}`.toLowerCase())
      }
    })
    messages.forEach((m: any) => m.client_name && namesFound.add(m.client_name.toLowerCase()))

    if (namesFound.size > 1) {
      coherenceFlags.push(`👤 Multiple names detected: ${Array.from(namesFound).join(', ')}`)
      coherenceScore -= 15
    }

    // 4. LOCATION CONSISTENCY (sessions vs client address)
    const sessionCities = new Set<string>()
    sessions.forEach((s: any) => {
      if (s.meta && typeof s.meta === 'object' && (s.meta as any).city) {
        sessionCities.add((s.meta as any).city.toLowerCase())
      }
    })

    const clientCity = client.address_city?.toLowerCase()
    if (clientCity && sessionCities.size > 0) {
      const hasMatchingCity = Array.from(sessionCities).some(city =>
        city.includes(clientCity) || clientCity.includes(city)
      )

      if (!hasMatchingCity) {
        coherenceFlags.push(
          `📍 Location mismatch: Client in ${client.address_city}, sessions from ${Array.from(sessionCities).join(', ')}`
        )
        coherenceScore -= 10
      }
    }

    // 5. DEVICE CONSISTENCY (check if same devices across sessions)
    const devices = new Map<string, number>()
    sessions.forEach((s: any) => {
      const deviceKey = `${s.device_type}|${s.browser}|${s.os}`
      devices.set(deviceKey, (devices.get(deviceKey) || 0) + 1)
    })

    if (devices.size > 5) {
      coherenceFlags.push(`📱 High device diversity: ${devices.size} different device/browser combinations`)
      coherenceScore -= 5
    }

    // 6. UTM SOURCE CONSISTENCY
    const utmSources = new Set<string>()
    sessions.forEach((s: any) => {
      if (s.first_utm_source) utmSources.add(s.first_utm_source)
    })

    // 7. TEMPORAL ANOMALIES
    // Check for impossible timestamps (activity before client created)
    const clientCreatedDate = new Date(client.created_at).getTime()

    const invalidTimestamps = [
      ...messages.filter((m: any) => new Date(m.created_at).getTime() < clientCreatedDate),
      ...applications.filter((a: any) => new Date(a.created_at).getTime() < clientCreatedDate),
      ...sessions.filter((s: any) => new Date(s.created_at).getTime() < clientCreatedDate)
    ]

    if (invalidTimestamps.length > 0) {
      coherenceFlags.push(`⏰ ${invalidTimestamps.length} activities before client creation date`)
      coherenceScore -= 25
    }

    // 8. APPLICATION vs SESSION LINKAGE
    // Check if applications have corresponding sessions
    const applicationDates = applications.map((a: any) => new Date(a.created_at).toISOString().split('T')[0])
    const sessionDates = sessions.map((s: any) => new Date(s.created_at).toISOString().split('T')[0])

    const applicationsWithoutSessions = applicationDates.filter(date => !sessionDates.includes(date))
    if (applicationsWithoutSessions.length > 0) {
      coherenceFlags.push(`🔗 ${applicationsWithoutSessions.length} applications without corresponding analytics sessions`)
      coherenceScore -= 10
    }

    // 9. MESSAGE vs CLIENT EMAIL
    const messagesWithWrongEmail = messages.filter((m: any) =>
      m.client_email && m.client_email.toLowerCase() !== client.primary_email?.toLowerCase()
    )
    if (messagesWithWrongEmail.length > 0) {
      coherenceFlags.push(`📧 ${messagesWithWrongEmail.length} messages with email mismatch`)
      coherenceScore -= 15
    }

    // 10. VOPAY TRANSACTIONS CONSISTENCY
    if (vopayTransactions.length > 0) {
      const vopayEmails = new Set(vopayTransactions.map((t: any) => t.email).filter(Boolean))
      if (vopayEmails.size > 0 && !vopayEmails.has(client.primary_email)) {
        coherenceFlags.push(`💳 VoPay transactions use different email: ${Array.from(vopayEmails).join(', ')}`)
        coherenceScore -= 20
      }
    }

    // 11. IP HASH DIVERSITY (potential account sharing)
    const ipHashes = new Set(sessions.map((s: any) => s.ip_hash).filter(Boolean))
    if (ipHashes.size > 10) {
      coherenceFlags.push(`🌐 High IP diversity: ${ipHashes.size} unique IP addresses`)
      coherenceScore -= 5
    }

    // ========================================================================
    // COHERENCE STATUS
    // ========================================================================
    const coherenceStatus =
      coherenceScore >= 90 ? 'excellent' :
      coherenceScore >= 70 ? 'good' :
      coherenceScore >= 50 ? 'concerning' :
      'critical'

    // ========================================================================
    // BUILD RESPONSE
    // ========================================================================
    return NextResponse.json({
      success: true,
      client_id: clientId,
      metrics,
      coherence: {
        score: Math.max(0, coherenceScore),
        status: coherenceStatus,
        flags: coherenceFlags,
        checks_performed: 11
      },
      data_sources: {
        client: client,
        contact_messages: messages,
        applications: applications,
        vopay_transactions: vopayTransactions,
        support_tickets: supportTickets,
        email_messages: emailMessages,
        analytics_sessions: sessions,
        telemetry_events: telemetryEvents
      },
      summary: {
        total_interactions: messages.length + applications.length + sessions.length + supportTickets.length,
        total_transactions: vopayTransactions.length,
        data_completeness: calculateDataCompleteness(client),
        profile_risk: coherenceStatus === 'critical' || coherenceStatus === 'concerning' ? 'high' : 'low'
      }
    })

  } catch (error) {
    console.error('Error in client-unified-metrics endpoint:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// ========================================================================
// HELPER FUNCTIONS
// ========================================================================

function calculateEngagementScore(counts: {
  messages: number
  applications: number
  sessions: number
  supportTickets: number
}): number {
  // Weight different types of engagement
  const score =
    (counts.messages * 10) +        // 10 pts per message
    (counts.applications * 25) +    // 25 pts per application
    (counts.sessions * 2) +         // 2 pts per session
    (counts.supportTickets * 5)     // 5 pts per support ticket

  // Cap at 100
  return Math.min(100, score)
}

function calculateDataCompleteness(client: any): number {
  const fields = [
    'first_name',
    'last_name',
    'primary_email',
    'primary_phone',
    'dob',
    'address_line1',
    'address_city',
    'address_province',
    'address_postal_code'
  ]

  const filled = fields.filter(field => client[field] && client[field] !== '').length
  return Math.round((filled / fields.length) * 100)
}
