import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  // Vérification de l'authentification admin
  const authHeader = request.headers.get('cookie')
  if (!authHeader?.includes('admin-session=')) {
    return NextResponse.json(
      { error: 'Non autorisé' },
      { status: 401 }
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

  if (!supabase) {
    return NextResponse.json({ ...debug, error: 'Supabase not initialized' })
  }

  try {
    const { data, error, count } = await supabase
      .from('vopay_webhook_logs')
      .select('*', { count: 'exact' })
      .limit(1)

    return NextResponse.json({
      ...debug,
      query: {
        success: !error,
        error: error?.message,
        count,
        hasData: !!data && data.length > 0
      }
    })
  } catch (e: any) {
    return NextResponse.json({
      ...debug,
      exception: e.message
    })
  }
}
