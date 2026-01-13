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
    // 1. Vérifier l'authentification admin
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('admin-session')

    if (!sessionCookie) {
      return NextResponse.json(
        { success: false, error: 'Non autorisé' },
        { status: 401 }
      )
    }

    const supabase = getSupabaseClient()

    // 2. Récupérer TOUTES les tables via la fonction RPC
    const { data: tablesInfo, error: tablesError } = await supabase.rpc('get_all_tables_with_info')

    if (tablesError) {
      console.error('Erreur RPC get_all_tables_with_info:', tablesError)
      throw new Error(`Fonction RPC manquante: ${tablesError.message}. Exécuter create_database_explorer_function.sql dans Supabase.`)
    }

    // 3. Pour chaque table, récupérer les colonnes
    const tablesWithColumns = []

    for (const tableInfo of tablesInfo || []) {
      const tableName = tableInfo.table_name

      // Récupérer les colonnes via RPC
      const { data: columns, error: columnsError } = await supabase.rpc('get_table_columns', {
        p_table_name: tableName
      })

      tablesWithColumns.push({
        table_name: tableName,
        row_count: tableInfo.row_count || 0,
        column_count: tableInfo.column_count || 0,
        columns: columns || [],
        has_data: (tableInfo.row_count || 0) > 0,
        error: columnsError ? 'Impossible de récupérer les colonnes' : null
      })
    }

    return NextResponse.json({
      success: true,
      tables: tablesWithColumns,
      total_tables: tablesWithColumns.length,
      timestamp: new Date().toISOString()
    })

  } catch (error: any) {
    console.error('❌ Erreur Database Explorer:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Erreur serveur'
      },
      { status: 500 }
    )
  }
}
