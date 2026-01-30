import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    // Vérifier que le contrat existe
    const { data: contract, error: fetchError } = await supabase
      .from('signature_documents')
      .select('*')
      .eq('document_id', id)
      .single()

    if (fetchError || !contract) {
      return NextResponse.json(
        { success: false, error: 'Contrat non trouvé' },
        { status: 404 }
      )
    }

    // Vérifier que le contrat n'est pas déjà signé
    if (contract.status === 'signed') {
      return NextResponse.json(
        { success: false, error: 'Impossible de révoquer un contrat déjà signé' },
        { status: 400 }
      )
    }

    // Vérifier que le contrat n'est pas déjà révoqué
    if (contract.status === 'revoked') {
      return NextResponse.json(
        { success: false, error: 'Ce contrat est déjà révoqué' },
        { status: 400 }
      )
    }

    // Révoquer le contrat
    const { error: updateError } = await supabase
      .from('signature_documents')
      .update({
        status: 'revoked',
        // Invalider le token en le remplaçant par une valeur unique
        sign_token: `REVOKED_${Date.now()}_${contract.sign_token}`
      })
      .eq('document_id', id)

    if (updateError) {
      console.error('Erreur révocation:', updateError)
      return NextResponse.json(
        { success: false, error: updateError.message },
        { status: 500 }
      )
    }

    // Log audit
    await supabase.from('signature_audit_logs').insert({
      document_id: id,
      action: 'revoked',
      details: {
        revoked_by: 'admin',
        previous_status: contract.status,
        reason: 'Admin revocation'
      },
      ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip'),
      user_agent: req.headers.get('user-agent')
    })

    return NextResponse.json({
      success: true,
      message: 'Contrat révoqué avec succès'
    })

  } catch (error: any) {
    console.error('Erreur serveur:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
