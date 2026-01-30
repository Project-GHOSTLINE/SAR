import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { checkRateLimit, getClientIP, rateLimitResponse } from '@/lib/rate-limit'

/**
 * GET /api/sign/[id]
 * Récupérer un document pour signature avec validation du token
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Rate limiting: 10 requêtes par minute par IP
    const clientIP = getClientIP(req.headers)
    const rateLimitResult = checkRateLimit(clientIP, {
      maxRequests: 10,
      windowMs: 60 * 1000 // 1 minute
    })

    if (!rateLimitResult.success) {
      return rateLimitResponse(rateLimitResult)
    }

    // Créer le client Supabase au runtime
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { id } = params
    const token = req.nextUrl.searchParams.get('token')

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Token requis' },
        { status: 400 }
      )
    }

    // Récupérer le document
    const { data: doc, error } = await supabase
      .from('signature_documents')
      .select('*')
      .eq('document_id', id)
      .single()

    if (error || !doc) {
      return NextResponse.json(
        { success: false, error: 'Document non trouvé' },
        { status: 404 }
      )
    }

    // Vérifier le token
    if (doc.sign_token !== token) {
      return NextResponse.json(
        { success: false, error: 'Token invalide' },
        { status: 403 }
      )
    }

    // Vérifier expiration
    if (new Date(doc.token_expires_at) < new Date()) {
      return NextResponse.json(
        { success: false, error: 'Lien expiré' },
        { status: 410 }
      )
    }

    // Vérifier si déjà signé
    if (doc.status === 'signed') {
      return NextResponse.json(
        { success: false, error: 'Document déjà signé' },
        { status: 400 }
      )
    }

    // Marquer comme vu (première visite)
    if (!doc.viewed_at) {
      await supabase
        .from('signature_documents')
        .update({
          viewed_at: new Date().toISOString(),
          status: 'viewed'
        })
        .eq('document_id', id)

      // Audit log
      await supabase.from('signature_audit_logs').insert({
        document_id: id,
        action: 'viewed',
        ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip'),
        user_agent: req.headers.get('user-agent')
      })
    }

    // Retourner les infos du document
    return NextResponse.json({
      success: true,
      documentId: doc.document_id,
      clientName: doc.client_name,
      title: doc.title,
      pdfUrl: doc.original_pdf_url,
      signatureFields: doc.signature_fields,
      status: doc.status
    })

  } catch (error: any) {
    console.error('Erreur récupération document:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
