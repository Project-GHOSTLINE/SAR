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

    // 2. Récupérer TOUTES les tables de la base de données
    const { data: tables, error: tablesError } = await supabase.rpc('get_all_tables_with_counts')

    if (tablesError) {
      // Si la fonction n'existe pas, utiliser une requête SQL directe
      const { data: allTables, error: sqlError } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public')
        .eq('table_type', 'BASE TABLE')

      if (sqlError) {
        throw new Error('Impossible de récupérer les tables')
      }

      // Récupérer le nombre de lignes pour chaque table
      const tablesWithCounts = []

      for (const table of allTables || []) {
        const tableName = table.table_name as string

        // Ignorer les tables système
        if (tableName.startsWith('_') || tableName.startsWith('pg_')) {
          continue
        }

        try {
          // Compter les lignes
          const { count, error: countError } = await supabase
            .from(tableName)
            .select('*', { count: 'exact', head: true })

          // Récupérer les colonnes
          const { data: columns } = await supabase
            .from('information_schema.columns')
            .select('column_name, data_type, is_nullable, column_default')
            .eq('table_schema', 'public')
            .eq('table_name', tableName)
            .order('ordinal_position')

          tablesWithCounts.push({
            table_name: tableName,
            row_count: count || 0,
            columns: columns || [],
            has_data: (count || 0) > 0,
            error: countError ? 'RLS activé ou permission manquante' : null
          })
        } catch (err) {
          // Table existe mais on ne peut pas y accéder (RLS)
          tablesWithCounts.push({
            table_name: tableName,
            row_count: 0,
            columns: [],
            has_data: false,
            error: 'Accès restreint (RLS)'
          })
        }
      }

      return NextResponse.json({
        success: true,
        tables: tablesWithCounts.sort((a, b) => b.row_count - a.row_count),
        total_tables: tablesWithCounts.length,
        timestamp: new Date().toISOString()
      })
    }

    return NextResponse.json({
      success: true,
      tables: tables || [],
      total_tables: tables?.length || 0,
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
