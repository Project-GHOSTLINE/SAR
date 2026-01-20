import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST() {
  try {
    const supabaseUrl = process.env.SUPABASE_URL!
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Test 1: Insérer un loan_application
    const testRef = `SAR-LP-TEST-${Date.now()}`
    const { data: loanData, error: loanError } = await supabase
      .from('loan_applications')
      .insert({
        reference: testRef,
        origin: 'test',
        status: 'draft',
        prenom: 'Test',
        nom: 'User',
        courriel: 'test@example.com',
        telephone: '5141234567',
        montant_demande: 5000
      })
      .select()
      .single()

    if (loanError) throw new Error(`Loan insert failed: ${loanError.message}`)

    // Test 2: Insérer un client_event
    const { data: eventData, error: eventError } = await supabase
      .from('client_events')
      .insert({
        client_email: 'test@example.com',
        client_name: 'Test User',
        event_type: 'note_added',
        event_source: 'test',
        event_data: {
          loan_id: loanData.id,
          reference: testRef,
          note: 'Test loan application created'
        }
      })
      .select()
      .single()

    if (eventError) throw new Error(`Event insert failed: ${eventError.message}`)

    // Test 3: Insérer un email_account
    const { data: accountData, error: accountError } = await supabase
      .from('email_accounts')
      .insert({
        email: 'test@solutionargentrapide.ca',
        provider: 'gmail',
        display_name: 'Test Account',
        department: 'test'
      })
      .select()
      .single()

    if (accountError) throw new Error(`Account insert failed: ${accountError.message}`)

    return NextResponse.json({
      success: true,
      message: 'Test data inserted successfully',
      data: {
        loan: loanData,
        event: eventData,
        account: accountData
      }
    })

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}
