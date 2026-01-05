import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { verifyAdminAuth } from '@/lib/auth'
import { generateToken, hashToken, generateExpiration } from '@/lib/crypto'
import { sendSms } from '@/lib/sms'
import { MAGIC_LINK_TTL_HOURS, MAGIC_LINK_MAX_USES } from '@/lib/constants'

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
    const { application_id, phone } = body

    if (!application_id || !phone) {
      return NextResponse.json(
        { success: false, error: 'application_id et phone requis' },
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

    // Generate magic link
    const token = generateToken(32)
    const tokenHash = hashToken(token)
    const expiresAt = generateExpiration(MAGIC_LINK_TTL_HOURS)

    // Store magic link
    const { data: magicLink, error: insertError } = await supabase
      .from('magic_links')
      .insert({
        application_id,
        token_hash: tokenHash,
        expires_at: expiresAt,
        max_uses: MAGIC_LINK_MAX_USES,
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error creating magic link:', insertError)
      return NextResponse.json(
        { success: false, error: 'Erreur lors de la création du lien' },
        { status: 500 }
      )
    }

    // Build magic link URL
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'
    const magicLinkUrl = `${appUrl}/suivi?t=${token}`

    // Send SMS
    try {
      await sendSms({
        to: phone,
        message: `Suivi de votre demande: ${magicLinkUrl} (valide 48h)`,
      })
    } catch (smsError) {
      console.error('Error sending SMS:', smsError)
      // Don't fail the request if SMS fails - return the link anyway
    }

    return NextResponse.json({
      success: true,
      data: {
        magic_link_id: magicLink.id,
        url: magicLinkUrl,
        expires_at: expiresAt,
        max_uses: MAGIC_LINK_MAX_USES,
      },
    })
  } catch (error) {
    console.error('Error in /api/admin/magic-link:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}
