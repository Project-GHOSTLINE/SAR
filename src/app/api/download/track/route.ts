import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

function getSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  )
}

function parseUserAgent(ua: string) {
  const deviceType = /mobile|android|iphone|ipad|tablet/i.test(ua) ? 'mobile' :
                     /tablet|ipad/i.test(ua) ? 'tablet' : 'desktop'

  let browser = 'Unknown'
  if (ua.includes('Chrome')) browser = 'Chrome'
  else if (ua.includes('Safari')) browser = 'Safari'
  else if (ua.includes('Firefox')) browser = 'Firefox'
  else if (ua.includes('Edge')) browser = 'Edge'

  let os = 'Unknown'
  if (ua.includes('Windows')) os = 'Windows'
  else if (ua.includes('Mac')) os = 'macOS'
  else if (ua.includes('Linux')) os = 'Linux'
  else if (ua.includes('Android')) os = 'Android'
  else if (ua.includes('iOS')) os = 'iOS'

  return { deviceType, browser, os }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseClient()

    // Récupérer les données du body
    const body = await request.json()
    const { fileName, fileType, fileVersion } = body

    if (!fileName) {
      return NextResponse.json(
        { success: false, error: 'fileName requis' },
        { status: 400 }
      )
    }

    // Récupérer les infos utilisateur
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('admin-session')
    let userEmail = null

    if (sessionCookie) {
      try {
        const session = JSON.parse(sessionCookie.value)
        userEmail = session.email
      } catch (e) {
        // Session invalide, continuer sans email
      }
    }

    // Récupérer l'IP et user agent
    const ip = request.headers.get('x-forwarded-for') ||
               request.headers.get('x-real-ip') ||
               'unknown'

    const userAgent = request.headers.get('user-agent') || 'Unknown'
    const { deviceType, browser, os } = parseUserAgent(userAgent)

    const referrer = request.headers.get('referer') || null

    // Enregistrer le téléchargement
    const { error } = await supabase
      .from('download_logs')
      .insert({
        file_name: fileName,
        file_type: fileType || 'unknown',
        file_version: fileVersion || null,
        user_email: userEmail,
        ip_address: ip,
        user_agent: userAgent,
        device_type: deviceType,
        browser: browser,
        os: os,
        download_success: true,
        referrer: referrer
      })

    if (error) {
      console.error('Erreur enregistrement download:', error)
      // Ne pas bloquer le téléchargement même si le tracking échoue
      return NextResponse.json({
        success: true,
        tracked: false
      })
    }

    return NextResponse.json({
      success: true,
      tracked: true
    })

  } catch (error: any) {
    console.error('Erreur tracking download:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message
      },
      { status: 500 }
    )
  }
}
