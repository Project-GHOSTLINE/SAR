import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { PDFDocument } from 'pdf-lib'
import { Resend } from 'resend'
import { checkRateLimit, getClientIP, rateLimitResponse } from '@/lib/rate-limit'

/**
 * POST /api/sign/[id]/submit
 * Soumettre les signatures et finaliser le document
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Rate limiting: 5 soumissions par heure par IP
    const clientIP = getClientIP(req.headers)
    const rateLimitResult = checkRateLimit(clientIP, {
      maxRequests: 5,
      windowMs: 60 * 60 * 1000 // 1 heure
    })

    if (!rateLimitResult.success) {
      return rateLimitResponse(rateLimitResult)
    }

    // Créer les clients au runtime
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    const resend = new Resend(process.env.RESEND_API_KEY!)

    const { id } = params
    const body = await req.json()
    const { token, signatures } = body

    if (!token || !signatures) {
      return NextResponse.json(
        { success: false, error: 'Token et signatures requis' },
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

    // Validation des signatures
    console.log('✅ Validation des signatures...')

    // Vérifier que signatures est un tableau
    if (!Array.isArray(signatures) || signatures.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Aucune signature fournie' },
        { status: 400 }
      )
    }

    // Vérifier que tous les champs requis sont signés
    const signatureFieldIds = doc.signature_fields.map((f: any) => f.id)
    const providedFieldIds = signatures.map((s: any) => s.fieldId)
    const missingFields = signatureFieldIds.filter((id: string) => !providedFieldIds.includes(id))

    if (missingFields.length > 0) {
      return NextResponse.json(
        { success: false, error: `Champs manquants: ${missingFields.length} signature(s) requise(s)` },
        { status: 400 }
      )
    }

    // Valider chaque signature
    for (const sig of signatures) {
      // Vérifier que fieldId et data sont présents
      if (!sig.fieldId || !sig.data) {
        return NextResponse.json(
          { success: false, error: 'Données de signature invalides' },
          { status: 400 }
        )
      }

      // Vérifier le format Base64
      const base64Regex = /^data:image\/(png|jpeg|jpg);base64,[A-Za-z0-9+/]+=*$/
      if (!base64Regex.test(sig.data)) {
        return NextResponse.json(
          { success: false, error: 'Format de signature invalide (PNG Base64 requis)' },
          { status: 400 }
        )
      }

      // Extraire et vérifier la taille de l'image
      const imgData = sig.data.replace(/^data:image\/(png|jpeg|jpg);base64,/, '')
      const imgBytes = Buffer.from(imgData, 'base64')

      // Vérifier taille min/max (100 bytes min, 5MB max)
      if (imgBytes.length < 100) {
        return NextResponse.json(
          { success: false, error: 'Signature trop petite ou vide' },
          { status: 400 }
        )
      }

      if (imgBytes.length > 5 * 1024 * 1024) {
        return NextResponse.json(
          { success: false, error: 'Signature trop volumineuse (max 5MB)' },
          { status: 400 }
        )
      }

      // Vérifier que le champ existe dans le document
      const field = doc.signature_fields.find((f: any) => f.id === sig.fieldId)
      if (!field) {
        return NextResponse.json(
          { success: false, error: `Champ de signature inconnu: ${sig.fieldId}` },
          { status: 400 }
        )
      }
    }

    console.log('📄 Téléchargement du PDF original...')
    // Télécharger le PDF original
    const pdfResponse = await fetch(doc.original_pdf_url)
    if (!pdfResponse.ok) {
      throw new Error('Erreur téléchargement PDF')
    }
    const pdfBuffer = await pdfResponse.arrayBuffer()

    console.log('✍️ Application des signatures...')
    // Charger le PDF avec pdf-lib
    const pdfDoc = await PDFDocument.load(pdfBuffer)

    // Appliquer chaque signature
    for (const sig of signatures) {
      const field = doc.signature_fields.find((f: any) => f.id === sig.fieldId)
      if (!field) continue

      const page = pdfDoc.getPage(field.page - 1)

      // Extraire les données Base64 de l'image
      const imgData = sig.data.replace(/^data:image\/png;base64,/, '')
      const imgBytes = Buffer.from(imgData, 'base64')

      // Embed l'image dans le PDF
      const img = await pdfDoc.embedPng(imgBytes)

      // Calculer la position Y inversée (PDF coordinate system)
      const pageHeight = page.getHeight()
      const yPosition = pageHeight - field.y - field.height

      // Dessiner l'image
      page.drawImage(img, {
        x: field.x,
        y: yPosition,
        width: field.width,
        height: field.height
      })
    }

    console.log('💾 Sauvegarde du PDF signé...')
    // Sauvegarder le PDF signé
    const signedPdfBytes = await pdfDoc.save()

    // Uploader le PDF signé dans Supabase Storage
    const signedPdfPath = `${id}/signed.pdf`
    const { error: uploadError } = await supabase.storage
      .from('contrats')
      .upload(signedPdfPath, signedPdfBytes, {
        contentType: 'application/pdf',
        upsert: true
      })

    if (uploadError) {
      console.error('Erreur upload PDF signé:', uploadError)
      throw new Error('Erreur upload PDF: ' + uploadError.message)
    }

    // Obtenir l'URL publique du PDF signé
    const { data: signedUrlData } = supabase.storage
      .from('contrats')
      .getPublicUrl(signedPdfPath)

    const clientIp = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
    const userAgent = req.headers.get('user-agent') || 'unknown'

    console.log('📝 Mise à jour du document...')
    // Mettre à jour le document
    await supabase
      .from('signature_documents')
      .update({
        signed_pdf_url: signedUrlData.publicUrl,
        status: 'signed',
        signed_at: new Date().toISOString(),
        signed_ip: clientIp,
        signed_user_agent: userAgent
      })
      .eq('document_id', id)

    // Audit log
    await supabase.from('signature_audit_logs').insert({
      document_id: id,
      action: 'signed',
      details: { signature_count: signatures.length },
      ip_address: clientIp,
      user_agent: userAgent
    })

    console.log('📧 Envoi des emails...')
    // Convertir PDF signé en Base64 pour l'email
    const signedPdfBase64 = Buffer.from(signedPdfBytes).toString('base64')

    // Email au client
    try {
      await resend.emails.send({
        from: process.env.FROM_EMAIL || 'SAR <noreply@solutionargentrapide.ca>',
        to: doc.client_email,
        subject: `✅ Contrat signé - ${doc.title}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #16a34a; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; font-size: 24px;">✅ Contrat Signé</h1>
            </div>
            <div style="padding: 30px; background: #f9fafb;">
              <h2 style="color: #1e293b; margin-bottom: 15px;">Merci ${doc.client_name}!</h2>
              <p style="color: #475569; line-height: 1.6;">
                Votre contrat a été signé avec succès. Une copie est jointe à cet email.
              </p>
              <div style="background: white; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 5px 0;"><strong>Document:</strong> ${doc.title}</p>
                <p style="margin: 5px 0;"><strong>Signé le:</strong> ${new Date().toLocaleString('fr-CA')}</p>
              </div>
              <p style="color: #64748b; font-size: 14px; margin-top: 30px;">
                Si vous avez des questions, n'hésitez pas à nous contacter.
              </p>
            </div>
            <div style="padding: 20px; text-align: center; color: #94a3b8; font-size: 12px; background: #f1f5f9; border-radius: 0 0 8px 8px;">
              SAR - Solution Argent Rapide<br>
              ${new Date().getFullYear()} © Tous droits réservés
            </div>
          </div>
        `,
        attachments: [{
          filename: `${doc.title.replace(/[^a-z0-9]/gi, '_')}_signe.pdf`,
          content: signedPdfBase64
        }]
      })
      console.log('✅ Email client envoyé')
    } catch (emailError: any) {
      console.error('❌ Erreur envoi email client:', emailError.message)
    }

    // Email admin
    const ADMIN_EMAIL = process.env.ADMIN_SIGNATURE_EMAIL || 'anthony@solutionargentrapide.ca'
    try {
      await resend.emails.send({
        from: process.env.FROM_EMAIL || 'SAR <noreply@solutionargentrapide.ca>',
        to: ADMIN_EMAIL,
        subject: `🎉 Contrat signé par ${doc.client_name}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; font-size: 24px;">🎉 Nouveau Contrat Signé</h1>
            </div>
            <div style="padding: 30px; background: #f9fafb;">
              <h2 style="color: #1e293b; margin-bottom: 15px;">Détails de la signature</h2>
              <div style="background: white; padding: 20px; border-radius: 8px;">
                <p style="margin: 8px 0;"><strong>Client:</strong> ${doc.client_name}</p>
                <p style="margin: 8px 0;"><strong>Email:</strong> ${doc.client_email}</p>
                <p style="margin: 8px 0;"><strong>Document:</strong> ${doc.title}</p>
                <p style="margin: 8px 0;"><strong>Signé le:</strong> ${new Date().toLocaleString('fr-CA')}</p>
                <p style="margin: 8px 0;"><strong>IP:</strong> ${clientIp}</p>
                <p style="margin: 8px 0;"><strong>Document ID:</strong> ${id}</p>
              </div>
              <div style="margin-top: 20px; text-align: center;">
                <a href="https://solutionargentrapide.ca/admin/contrats-clients"
                   style="display: inline-block; padding: 12px 30px; background: #2563eb; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">
                  Voir dans le Dashboard
                </a>
              </div>
            </div>
            <div style="padding: 20px; text-align: center; color: #94a3b8; font-size: 12px; background: #f1f5f9; border-radius: 0 0 8px 8px;">
              SAR - Solution Argent Rapide
            </div>
          </div>
        `,
        attachments: [{
          filename: `${doc.title.replace(/[^a-z0-9]/gi, '_')}_signe.pdf`,
          content: signedPdfBase64
        }]
      })
      console.log('✅ Email admin envoyé')
    } catch (emailError: any) {
      console.error('❌ Erreur envoi email admin:', emailError.message)
    }

    return NextResponse.json({
      success: true,
      message: 'Document signé avec succès',
      signedAt: new Date().toISOString(),
      signedPdfUrl: signedUrlData.publicUrl
    })

  } catch (error: any) {
    console.error('Erreur signature:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
