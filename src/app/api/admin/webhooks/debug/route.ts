import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'
import { jwtVerify } from 'jose'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

const JWT_SECRET = process.env.JWT_SECRET || 'sar-admin-secret-key-2024'

export async function GET(request: NextRequest) {
  // Vérification stricte de l'authentification admin avec JWT
  const token = request.cookies.get('admin-session')?.value

  if (!token) {
    return NextResponse.json(
      { error: 'Non autorisé' },
      {
        status: 401,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, private, max-age=0',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      }
    )
  }

  // Vérifier la validité du JWT
  try {
    const secret = new TextEncoder().encode(JWT_SECRET)
    await jwtVerify(token, secret)
  } catch {
    return NextResponse.json(
      { error: 'Session invalide' },
      {
        status: 401,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, private, max-age=0',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      }
    )
  }

  const supabase = getSupabase()

  const debug = {
    hasSupabase: !!supabase,
    env: {
      hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasKey: !!process.env.SUPABASE_SERVICE_KEY,
      urlPrefix: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 30),
      keyPrefix: process.env.SUPABASE_SERVICE_KEY?.substring(0, 20)
    }
  }

  const noStoreHeaders = {
    'Cache-Control': 'no-store, no-cache, must-revalidate, private, max-age=0',
    'Pragma': 'no-cache',
    'Expires': '0'
  }

  if (!supabase) {
    return NextResponse.json(
      { ...debug, error: 'Supabase not initialized' },
      { headers: noStoreHeaders }
    )
  }

  try {
    const { data, error, count } = await supabase
      .from('vopay_webhook_logs')
      .select('*', { count: 'exact' })
      .limit(1)

    return NextResponse.json(
      {
        ...debug,
        query: {
          success: !error,
          error: error?.message,
          count,
          hasData: !!data && data.length > 0
        }
      },
      { headers: noStoreHeaders }
    )
  } catch (e: any) {
    return NextResponse.json(
      {
        ...debug,
        exception: e.message
      },
      { headers: noStoreHeaders }
    )
  }
}
