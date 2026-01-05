import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'
import { verifyAdminAuth } from '@/lib/auth'
import { ApplicationStatus } from '@/types'

export async function POST(request: NextRequest) {
  try {
    // Verify admin authentication
    if (!verifyAdminAuth(request)) {
      return NextResponse.json(
        { success: false, error: 'Non autorisé' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { application_id, event_type, status, payload = {} } = body

    if (!application_id || !event_type) {
      return NextResponse.json(
        { success: false, error: 'application_id et event_type requis' },
        { status: 400 }
      )
    }

    const supabase = getSupabase()

    // Upsert application if needed (create or update)
    if (status) {
      const appData: any = {
        id: application_id,
        status: status as ApplicationStatus,
        status_updated_at: new Date().toISOString(),
      }

      // Add optional fields from payload
      if (payload.name) appData.name = payload.name
      if (payload.email) appData.email = payload.email
      if (payload.phone) appData.phone = payload.phone
      if (payload.origin) appData.origin = payload.origin
      if (payload.amount_cents) appData.amount_cents = payload.amount_cents
      if (payload.first_payment_date) appData.first_payment_date = payload.first_payment_date

      const { error: upsertError } = await supabase
        .from('applications')
        .upsert(appData, { onConflict: 'id' })

      if (upsertError) {
        console.error('Error upserting application:', upsertError)
        return NextResponse.json(
          { success: false, error: 'Erreur lors de la mise à jour de l\'application' },
          { status: 500 }
        )
      }
    }

    // Insert event
    const { data: event, error: eventError } = await supabase
      .from('application_events')
      .insert({
        application_id,
        type: event_type,
        payload,
      })
      .select()
      .single()

    if (eventError) {
      console.error('Error creating event:', eventError)
      return NextResponse.json(
        { success: false, error: 'Erreur lors de la création de l\'événement' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        event_id: event.id,
        application_id,
        status,
      },
    })
  } catch (error) {
    console.error('Error in /api/admin/event:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}
