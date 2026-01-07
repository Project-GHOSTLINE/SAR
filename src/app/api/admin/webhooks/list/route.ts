import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'
import { jwtVerify } from 'jose'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

const JWT_SECRET = process.env.JWT_SECRET || 'sar-admin-secret-key-2024'

export async function GET(request: NextRequest) {
  try {
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
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database unavailable' },
        { status: 500 }
      )
    }

    // Récupérer tous les webhooks, triés par date (plus récents en premier)
    const { data: webhooks, error } = await supabase
      .from('vopay_webhook_logs')
      .select('*')
      .order('received_at', { ascending: false })
      .limit(100)

    if (error) {
      console.error('Error fetching webhooks:', error)
      return NextResponse.json(
        { error: 'Failed to fetch webhooks' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        success: true,
        webhooks: webhooks || []
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, private, max-age=0',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      }
    )
  } catch (error) {
    console.error('Error in /api/admin/webhooks/list:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
