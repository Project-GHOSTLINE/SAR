import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { verifyAdminAuth } from '@/lib/auth'

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
    const { application_id, message, visible_to_client = true } = body

    if (!application_id || !message) {
      return NextResponse.json(
        { success: false, error: 'application_id et message requis' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseAdmin()

    // Verify application exists
    const { data: application, error: appError } = await supabase
      .from('applications')
      .select('id')
      .eq('id', application_id)
      .single()

    if (appError || !application) {
      return NextResponse.json(
        { success: false, error: 'Application non trouvée' },
        { status: 404 }
      )
    }

    // Insert note
    const { data: note, error: noteError } = await supabase
      .from('client_notes')
      .insert({
        application_id,
        message,
        visible_to_client,
      })
      .select()
      .single()

    if (noteError) {
      console.error('Error creating note:', noteError)
      return NextResponse.json(
        { success: false, error: 'Erreur lors de la création de la note' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        note_id: note.id,
        application_id,
        message: note.message,
        visible_to_client: note.visible_to_client,
      },
    })
  } catch (error) {
    console.error('Error in /api/admin/note:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}
