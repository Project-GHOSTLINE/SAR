import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { validateMagicLink } from '@/lib/magic-link'
import { checkRateLimit } from '@/lib/rate-limit'
import { PROGRESS_STEPS } from '@/lib/constants'
import { ClientStatusResponse } from '@/types'

export async function GET(request: NextRequest) {
  try {
    // Get client IP for rate limiting
    const ip = request.headers.get('x-forwarded-for') ||
               request.headers.get('x-real-ip') ||
               'unknown'

    // Rate limit: 20 requests per minute per IP
    const rateLimit = checkRateLimit(ip, { maxRequests: 20, windowMs: 60000 })
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { success: false, error: 'Trop de requêtes. Veuillez réessayer dans quelques instants.' },
        { status: 429 }
      )
    }

    // Get token from query params
    const searchParams = request.nextUrl.searchParams
    const token = searchParams.get('t')

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Token manquant' },
        { status: 400 }
      )
    }

    // Validate magic link
    const validation = await validateMagicLink(token)
    if (!validation.valid || !validation.applicationId) {
      return NextResponse.json(
        { success: false, error: validation.error || 'Token invalide' },
        { status: 401 }
      )
    }

    const supabase = getSupabaseAdmin()

    // Fetch application
    const { data: application, error: appError } = await supabase
      .from('applications')
      .select('*')
      .eq('id', validation.applicationId)
      .single()

    if (appError || !application) {
      return NextResponse.json(
        { success: false, error: 'Demande non trouvée' },
        { status: 404 }
      )
    }

    // Fetch visible notes
    const { data: notes, error: notesError } = await supabase
      .from('client_notes')
      .select('*')
      .eq('application_id', validation.applicationId)
      .eq('visible_to_client', true)
      .order('created_at', { ascending: false })

    if (notesError) {
      console.error('Error fetching notes:', notesError)
    }

    // Calculate progress
    const currentStepIndex = PROGRESS_STEPS.findIndex(
      (step) => step.key === application.status
    )

    const response: ClientStatusResponse = {
      success: true,
      data: {
        application,
        notes: notes || [],
        progress: {
          currentStep: currentStepIndex >= 0 ? currentStepIndex : 0,
          totalSteps: PROGRESS_STEPS.length,
          steps: PROGRESS_STEPS,
        },
      },
    }

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    })
  } catch (error) {
    console.error('Error in /api/status:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}
