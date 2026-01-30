import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { validateEmail, validateLength, sanitizeString } from '@/lib/validation'

/**
 * GET /api/admin/contrats-clients
 * Liste tous les contrats de signature avec statistiques et pagination
 * Query params: page (default 1), limit (default 20)
 */
export async function GET(req: NextRequest) {
  try {
    // Créer le client Supabase au runtime
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Paramètres de pagination
    const searchParams = req.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = (page - 1) * limit

    // Récupérer le total pour les stats (sans pagination)
    const { data: allContracts, error: allError } = await supabase
      .from('signature_documents')
      .select('status')

    if (allError) {
      console.error('Erreur Supabase (stats):', allError)
      return NextResponse.json(
        { success: false, error: allError.message },
        { status: 500 }
      )
    }

    // Calculer les statistiques sur tous les contrats
    const stats = {
      total: allContracts?.length || 0,
      pending: allContracts?.filter(c => c.status === 'pending').length || 0,
      viewed: allContracts?.filter(c => c.status === 'viewed').length || 0,
      signed: allContracts?.filter(c => c.status === 'signed').length || 0,
      expired: allContracts?.filter(c => c.status === 'expired').length || 0,
      revoked: allContracts?.filter(c => c.status === 'revoked').length || 0,
      signatureRate: 0
    }

    // Calculer le taux de signature
    if (stats.total > 0) {
      stats.signatureRate = (stats.signed / stats.total) * 100
    }

    // Récupérer les contrats avec pagination
    const { data: contracts, error } = await supabase
      .from('signature_documents')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Erreur Supabase:', error)
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      contracts: contracts || [],
      stats,
      pagination: {
        page,
        limit,
        total: stats.total,
        totalPages: Math.ceil(stats.total / limit)
      }
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
 * POST /api/admin/contrats-clients
 * Créer un nouveau contrat de signature
 */
export async function POST(req: NextRequest) {
  try {
    // Créer les clients au runtime
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    const resend = new Resend(process.env.RESEND_API_KEY!)

    const body = await req.json()
    const {
      clientName,
      clientEmail,
      title,
      pdfBase64,
      signatureFields
    } = body

    if (!clientName || !clientEmail || !pdfBase64) {
      return NextResponse.json(
        { success: false, error: 'clientName, clientEmail et pdfBase64 requis' },
        { status: 400 }
      )
    }

    // Valider et sanitizer les entrées
    const emailValidation = validateEmail(clientEmail)
    if (!emailValidation.valid) {
      return NextResponse.json(
        { success: false, error: emailValidation.error },
        { status: 400 }
      )
    }

    const nameValidation = validateLength(clientName, 'Nom du client', 2, 100)
    if (!nameValidation.valid) {
      return NextResponse.json(
        { success: false, error: nameValidation.error },
        { status: 400 }
      )
    }

    const titleValidation = validateLength(title || 'Contrat', 'Titre', 3, 200)
    if (!titleValidation.valid) {
      return NextResponse.json(
        { success: false, error: titleValidation.error },
        { status: 400 }
      )
    }

    // Sanitizer les entrées texte
    const sanitizedClientName = sanitizeString(clientName)
    const sanitizedTitle = sanitizeString(title || `Contrat - ${clientName}`)

    // Générer IDs
    const crypto = require('crypto')
    const documentId = crypto.randomUUID()
    const signToken = crypto.randomBytes(32).toString('hex')
    const tokenExpiresAt = new Date()
    tokenExpiresAt.setDate(tokenExpiresAt.getDate() + 7) // 7 jours

    // Décoder le PDF
    const pdfBuffer = Buffer.from(pdfBase64, 'base64')

    // Upload PDF dans Supabase Storage
    const pdfPath = `${documentId}/original.pdf`
    const { error: uploadError } = await supabase.storage
      .from('contrats')
      .upload(pdfPath, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: false
      })

    if (uploadError) {
      console.error('Erreur upload PDF:', uploadError)
      return NextResponse.json(
        { success: false, error: 'Erreur upload PDF: ' + uploadError.message },
        { status: 500 }
      )
    }

    // Obtenir l'URL publique
    const { data: urlData } = supabase.storage
      .from('contrats')
      .getPublicUrl(pdfPath)

    // Créer l'entrée en base de données
    const { data: doc, error: dbError } = await supabase
      .from('signature_documents')
      .insert({
        document_id: documentId,
        client_name: sanitizedClientName,
        client_email: clientEmail,
        title: sanitizedTitle,
        original_pdf_url: urlData.publicUrl,
        signature_fields: signatureFields || [],
        sign_token: signToken,
        token_expires_at: tokenExpiresAt.toISOString(),
        status: 'pending',
        email_status: 'pending'
      })
      .select()
      .single()

    if (dbError) {
      console.error('Erreur création document:', dbError)
      return NextResponse.json(
        { success: false, error: dbError.message },
        { status: 500 }
      )
    }

    // Générer le lien de signature
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
    const signUrl = `${baseUrl}/sign/${documentId}?token=${signToken}`

    // Envoyer l'email au client
    console.log('📧 Envoi email à:', clientEmail)
    try {
      await resend.emails.send({
        from: process.env.FROM_EMAIL || 'SAR <noreply@solutionargentrapide.ca>',
        to: clientEmail,
        subject: `Votre contrat est prêt à signer - ${title || 'Contrat'}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #00874e 0%, #006341 100%); color: white; padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0;">
              <div style="width: 60px; height: 60px; background: white; border-radius: 12px; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 15px;">
                <span style="font-size: 28px; font-weight: bold; color: #00874e;">$</span>
              </div>
              <h1 style="margin: 0; font-size: 24px;">SAR - Solution Argent Rapide</h1>
            </div>
            <div style="padding: 40px 30px; background: #f9fafb;">
              <h2 style="color: #1e293b; margin-bottom: 15px; font-size: 20px;">Bonjour ${clientName},</h2>
              <p style="color: #475569; line-height: 1.6; margin-bottom: 25px;">
                Votre contrat est prêt à être signé électroniquement.
              </p>
              <div style="background: white; padding: 20px; border-radius: 12px; margin: 25px 0; border-left: 4px solid #00874e;">
                <p style="margin: 5px 0; color: #475569;"><strong style="color: #1e293b;">Document:</strong> ${title || 'Contrat'}</p>
                <p style="margin: 5px 0; color: #475569;"><strong style="color: #1e293b;">Expire dans:</strong> 7 jours</p>
              </div>
              <div style="text-align: center; margin: 35px 0;">
                <a href="${signUrl}"
                   style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #00874e 0%, #006341 100%); color: white; text-decoration: none; border-radius: 12px; font-size: 18px; font-weight: bold; box-shadow: 0 4px 20px rgba(0, 135, 78, 0.35);">
                  ✍️ Signer mon contrat
                </a>
              </div>
              <p style="color: #64748b; font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
                <strong>Note:</strong> Ce lien est personnel et sécurisé. Il expire automatiquement après 7 jours.
              </p>
            </div>
            <div style="padding: 20px; text-align: center; color: #94a3b8; font-size: 12px; background: #f1f5f9; border-radius: 0 0 8px 8px;">
              SAR - Solution Argent Rapide<br>
              ${new Date().getFullYear()} © Tous droits réservés<br>
              <a href="https://solutionargentrapide.ca" style="color: #00874e; text-decoration: none;">solutionargentrapide.ca</a>
            </div>
          </div>
        `
      })
      console.log('✅ Email envoyé avec succès')

      // Mettre à jour le statut d'envoi d'email
      await supabase
        .from('signature_documents')
        .update({
          email_status: 'sent',
          email_sent_at: new Date().toISOString()
        })
        .eq('document_id', documentId)

      // Audit log
      await supabase.from('signature_audit_logs').insert({
        document_id: documentId,
        action: 'email_sent',
        details: { recipient: clientEmail },
        ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip'),
        user_agent: req.headers.get('user-agent')
      })
    } catch (emailError: any) {
      console.error('❌ Erreur envoi email:', emailError)

      // Mettre à jour le statut d'échec d'email
      await supabase
        .from('signature_documents')
        .update({
          email_status: 'failed',
          email_error: emailError.message || 'Unknown error'
        })
        .eq('document_id', documentId)

      // Ne pas bloquer la création du contrat si l'email échoue
    }

    return NextResponse.json({
      success: true,
      documentId,
      signUrl,
      expiresAt: tokenExpiresAt.toISOString()
    })

  } catch (error: any) {
    console.error('Erreur serveur:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
