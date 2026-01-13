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

export async function GET(request: NextRequest) {
  try {
    // Vérifier l'authentification admin
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('admin-session')

    if (!sessionCookie) {
      return NextResponse.json(
        { success: false, error: 'Non autorisé' },
        { status: 401 }
      )
    }

    const supabase = getSupabaseClient()

    const { searchParams } = new URL(request.url)
    const fileName = searchParams.get('fileName')

    if (fileName) {
      // Stats pour un fichier spécifique
      const { data, error } = await supabase.rpc('get_download_stats', {
        p_file_name: fileName
      })

      if (error) {
        throw error
      }

      return NextResponse.json({
        success: true,
        stats: data[0] || {
          total_downloads: 0,
          unique_users: 0,
          unique_ips: 0,
          downloads_today: 0,
          downloads_this_week: 0,
          downloads_this_month: 0,
          last_download: null,
          first_download: null,
          avg_downloads_per_day: 0
        }
      })
    } else {
      // Stats globales de tous les fichiers
      const { data, error } = await supabase
        .from('download_stats')
        .select('*')
        .order('total_downloads', { ascending: false })

      if (error) {
        throw error
      }

      return NextResponse.json({
        success: true,
        stats: data || []
      })
    }

  } catch (error: any) {
    console.error('Erreur stats downloads:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message
      },
      { status: 500 }
    )
  }
}
