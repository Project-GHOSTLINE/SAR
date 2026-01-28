import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * GET /api/admin/signature-templates/[id]
 * Obtenir un template spécifique
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: template, error } = await supabase
      .from('signature_templates')
      .select('*')
      .eq('id', params.id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { success: false, error: 'Template non trouvé' },
          { status: 404 }
        )
      }

      console.error('Erreur Supabase:', error)
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      template
    })

  } catch (error: any) {
    console.error('Erreur serveur:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/admin/signature-templates/[id]
 * Mettre à jour un template
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const body = await req.json()
    const updates: any = {}

    // Champs modifiables
    if (body.name !== undefined) updates.name = body.name.trim()
    if (body.description !== undefined) updates.description = body.description.trim()
    if (body.category !== undefined) updates.category = body.category
    if (body.signature_fields !== undefined) updates.signature_fields = body.signature_fields
    if (body.is_active !== undefined) updates.is_active = body.is_active

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { success: false, error: 'Aucun champ à mettre à jour' },
        { status: 400 }
      )
    }

    const { data: template, error } = await supabase
      .from('signature_templates')
      .update(updates)
      .eq('id', params.id)
      .select()
      .single()

    if (error) {
      console.error('Erreur mise à jour template:', error)
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    console.log('✅ Template mis à jour:', template.name)

    return NextResponse.json({
      success: true,
      template,
      message: `Template "${template.name}" mis à jour`
    })

  } catch (error: any) {
    console.error('Erreur serveur:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/admin/signature-templates/[id]
 * Supprimer un template
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Récupérer le nom avant suppression
    const { data: template } = await supabase
      .from('signature_templates')
      .select('name')
      .eq('id', params.id)
      .single()

    const { error } = await supabase
      .from('signature_templates')
      .delete()
      .eq('id', params.id)

    if (error) {
      console.error('Erreur suppression template:', error)
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    console.log('🗑️  Template supprimé:', template?.name || params.id)

    return NextResponse.json({
      success: true,
      message: `Template "${template?.name || params.id}" supprimé`
    })

  } catch (error: any) {
    console.error('Erreur serveur:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
