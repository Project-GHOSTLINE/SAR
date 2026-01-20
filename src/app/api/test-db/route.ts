import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET() {
  try {
    const supabaseUrl = process.env.SUPABASE_URL!
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY!

    const supabase = createClient(supabaseUrl, supabaseKey)

    // Test 1: Lister les tables via une requête SQL
    const { data: tables, error: tablesError } = await supabase
      .rpc('pg_catalog.pg_tables')
      .select('tablename')
      .eq('schemaname', 'public')

    // Test 2: Compter les loan_applications
    const { data: loans, count: loanCount, error: loanError } = await supabase
      .from('loan_applications')
      .select('id, reference, prenom, nom', { count: 'exact' })

    // Test 3: Compter les client_events
    const { data: events, count: eventsCount, error: eventsError } = await supabase
      .from('client_events')
      .select('id, event_type, client_email', { count: 'exact' })

    // Test 4: Compter les email_messages
    const { data: messages, count: messagesCount, error: messagesError } = await supabase
      .from('email_messages')
      .select('id, subject', { count: 'exact' })

    return NextResponse.json({
      success: true,
      connection: {
        url: supabaseUrl,
        status: 'connected'
      },
      tests: {
        loan_applications: {
          count: loanCount ?? 0,
          data: loans,
          error: loanError?.message
        },
        client_events: {
          count: eventsCount ?? 0,
          data: events,
          error: eventsError?.message
        },
        email_messages: {
          count: messagesCount ?? 0,
          data: messages,
          error: messagesError?.message
        }
      }
    })

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 })
  }
}
