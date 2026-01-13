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

export async function GET(
  request: NextRequest,
  { params }: { params: { filename: string } }
) {
  try {
    const { filename } = params
    const supabase = getSupabaseClient()

    // Récupérer les infos utilisateur
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('admin-session')
    let userEmail = null

    if (sessionCookie) {
      try {
        const session = JSON.parse(sessionCookie.value)
        userEmail = session.email
      } catch (e) {
        // Session invalide
      }
    }

    // Récupérer l'IP et user agent
    const ip = request.headers.get('x-forwarded-for') ||
               request.headers.get('x-real-ip') ||
               'unknown'

    const userAgent = request.headers.get('user-agent') || 'Unknown'
    const { deviceType, browser, os } = parseUserAgent(userAgent)
    const referrer = request.headers.get('referer') || null

    // Déterminer le type et version du fichier
    let fileType = 'unknown'
    let fileVersion = null

    if (filename.includes('ibv-crawler')) {
      fileType = 'extension'
      const match = filename.match(/v?(\d+\.\d+\.\d+)/)
      fileVersion = match ? match[1] : null
    }

    // Logger le téléchargement (attendre pour être sûr que c'est tracké)
    await supabase
      .from('download_logs')
      .insert({
        file_name: filename,
        file_type: fileType,
        file_version: fileVersion,
        user_email: userEmail,
        ip_address: ip,
        user_agent: userAgent,
        device_type: deviceType,
        browser: browser,
        os: os,
        download_success: true,
        referrer: referrer
      })

    console.log('✅ Download tracked:', filename)

    // Redirect vers le fichier statique (marche sur Vercel)
    const fileUrl = `/downloads/${filename}`
    return NextResponse.redirect(new URL(fileUrl, request.url), 302)

  } catch (error: any) {
    console.error('Download error:', error)

    // En cas d'erreur de tracking, rediriger quand même vers le fichier
    const fileUrl = `/downloads/${params.filename}`
    return NextResponse.redirect(new URL(fileUrl, request.url), 302)
  }
}
