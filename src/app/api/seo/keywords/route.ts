import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

// Vérifier l'authentification admin
function isAuthenticated(request: NextRequest): boolean {
  const token = request.cookies.get('admin-session')?.value
  const apiKey = request.headers.get('x-api-key')
  return !!token || apiKey === process.env.ADMIN_PASSWORD
}

// Initialize Supabase
function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase credentials manquants')
  }

  return createClient(supabaseUrl, supabaseKey)
}

/**
 * GET /api/seo/keywords
 *
 * Récupère la liste des keywords suivis
 */
export async function GET(request: NextRequest) {
  try {
    if (!isAuthenticated(request)) {
      return NextResponse.json(
        { success: false, error: 'Non autorisé' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const priority = searchParams.get('priority')
    const active = searchParams.get('active') !== 'false'

    const supabase = getSupabaseClient()

    let query = supabase
      .from('seo_keywords_tracking')
      .select('*')
      .eq('active', active)

    if (category) {
      query = query.eq('category', category)
    }

    if (priority) {
      query = query.eq('priority', priority)
    }

    query = query.order('priority', { ascending: true })
      .order('current_position', { ascending: true })

    const { data, error } = await query

    if (error) throw error

    return NextResponse.json({
      success: true,
      data,
      count: data.length,
      summary: {
        total: data.length,
        top10: data.filter(k => k.current_position && k.current_position <= 10).length,
        top20: data.filter(k => k.current_position && k.current_position <= 20).length,
        improved: data.filter(k => k.position_change && k.position_change > 0).length,
        declined: data.filter(k => k.position_change && k.position_change < 0).length,
        stable: data.filter(k => k.position_change === 0).length
      }
    })

  } catch (error: any) {
    console.error('❌ Erreur récupération keywords:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Erreur lors de la récupération des keywords',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/seo/keywords
 *
 * Ajoute un nouveau keyword à suivre
 *
 * Body:
 * - keyword: string (requis)
 * - target_url: string
 * - category: string
 * - priority: 'low' | 'medium' | 'high' | 'critical'
 * - search_volume: number
 * - keyword_difficulty: number
 */
export async function POST(request: NextRequest) {
  try {
    if (!isAuthenticated(request)) {
      return NextResponse.json(
        { success: false, error: 'Non autorisé' },
        { status: 401 }
      )
    }

    const body = await request.json()

    if (!body.keyword) {
      return NextResponse.json(
        { success: false, error: 'Le keyword est requis' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseClient()

    const keywordData = {
      keyword: body.keyword,
      target_url: body.target_url || 'https://solutionargentrapide.ca',
      category: body.category || 'général',
      priority: body.priority || 'medium',
      search_volume: body.search_volume || 0,
      keyword_difficulty: body.keyword_difficulty || 0,
      active: true,
      notes: body.notes || null
    }

    const { data, error } = await supabase
      .from('seo_keywords_tracking')
      .insert([keywordData])
      .select()
      .single()

    if (error) {
      if (error.code === '23505') { // Unique constraint violation
        return NextResponse.json(
          { success: false, error: 'Ce keyword existe déjà' },
          { status: 409 }
        )
      }
      throw error
    }

    return NextResponse.json({
      success: true,
      message: 'Keyword ajouté avec succès',
      data
    })

  } catch (error: any) {
    console.error('❌ Erreur ajout keyword:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Erreur lors de l\'ajout du keyword',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/seo/keywords
 *
 * Met à jour un keyword existant
 *
 * Body:
 * - id: string (requis)
 * - ...autres champs à mettre à jour
 */
export async function PATCH(request: NextRequest) {
  try {
    if (!isAuthenticated(request)) {
      return NextResponse.json(
        { success: false, error: 'Non autorisé' },
        { status: 401 }
      )
    }

    const body = await request.json()

    if (!body.id) {
      return NextResponse.json(
        { success: false, error: 'L\'ID est requis' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseClient()

    const { id, ...updateData } = body

    const { data, error } = await supabase
      .from('seo_keywords_tracking')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({
      success: true,
      message: 'Keyword mis à jour avec succès',
      data
    })

  } catch (error: any) {
    console.error('❌ Erreur mise à jour keyword:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Erreur lors de la mise à jour du keyword',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/seo/keywords
 *
 * Désactive un keyword (soft delete)
 *
 * Body:
 * - id: string (requis)
 */
export async function DELETE(request: NextRequest) {
  try {
    if (!isAuthenticated(request)) {
      return NextResponse.json(
        { success: false, error: 'Non autorisé' },
        { status: 401 }
      )
    }

    const body = await request.json()

    if (!body.id) {
      return NextResponse.json(
        { success: false, error: 'L\'ID est requis' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseClient()

    // Soft delete: désactiver au lieu de supprimer
    const { data, error } = await supabase
      .from('seo_keywords_tracking')
      .update({ active: false })
      .eq('id', body.id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({
      success: true,
      message: 'Keyword désactivé avec succès',
      data
    })

  } catch (error: any) {
    console.error('❌ Erreur suppression keyword:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Erreur lors de la suppression du keyword',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}
