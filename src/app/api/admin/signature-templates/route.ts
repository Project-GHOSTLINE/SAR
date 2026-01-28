import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// CORS headers pour l'outil de coordonnées PDF
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

/**
 * OPTIONS /api/admin/signature-templates
 * Handle CORS preflight
 */
export async function OPTIONS(req: NextRequest) {
  return NextResponse.json({}, { headers: corsHeaders })
}

/**
 * GET /api/admin/signature-templates
 * Liste tous les templates de signature
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Paramètres de requête
    const { searchParams } = new URL(req.url)
    const category = searchParams.get('category')
    const activeOnly = searchParams.get('active') === 'true'

    let query = supabase
      .from('signature_templates')
      .select('*')
      .order('usage_count', { ascending: false })
      .order('created_at', { ascending: false })

    // Filtrer par catégorie si spécifié
    if (category) {
      query = query.eq('category', category)
    }

    // Filtrer par statut actif
    if (activeOnly) {
      query = query.eq('is_active', true)
    }

    const { data: templates, error } = await query

    if (error) {
      console.error('Erreur Supabase:', error)
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500, headers: corsHeaders }
      )
    }

    return NextResponse.json({
      success: true,
      templates: templates || [],
      total: templates?.length || 0
    }, { headers: corsHeaders })

  } catch (error: any) {
    console.error('Erreur serveur:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500, headers: corsHeaders }
    )
  }
}

/**
 * POST /api/admin/signature-templates
 * Créer un nouveau template de signature
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const body = await req.json()
    const {
      name,
      description,
      category,
      signature_fields
    } = body

    // Validation
    if (!name || !signature_fields) {
      return NextResponse.json(
        { success: false, error: 'name et signature_fields requis' },
        { status: 400, headers: corsHeaders }
      )
    }

    if (!Array.isArray(signature_fields) || signature_fields.length === 0) {
      return NextResponse.json(
        { success: false, error: 'signature_fields doit être un array non vide' },
        { status: 400, headers: corsHeaders }
      )
    }

    // Vérifier le format des champs
    for (const field of signature_fields) {
      if (!field.type || !field.page || field.x === undefined || field.y === undefined) {
        return NextResponse.json(
          { success: false, error: 'Champs invalides: type, page, x, y requis' },
          { status: 400, headers: corsHeaders }
        )
      }
    }

    // Créer le template
    const { data: template, error } = await supabase
      .from('signature_templates')
      .insert({
        name: name.trim(),
        description: description?.trim() || '',
        category: category || 'general',
        signature_fields,
        is_active: true,
        usage_count: 0
      })
      .select()
      .single()

    if (error) {
      console.error('Erreur création template:', error)
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500, headers: corsHeaders }
      )
    }

    console.log('✅ Template créé:', template.name)

    return NextResponse.json({
      success: true,
      template,
      message: `Template "${template.name}" créé avec succès`
    }, { headers: corsHeaders })

  } catch (error: any) {
    console.error('Erreur serveur:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500, headers: corsHeaders }
    )
  }
}
