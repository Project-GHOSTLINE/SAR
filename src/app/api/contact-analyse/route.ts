import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { nom, email, telephone, question, questionAutre } = body

    // Validation
    if (!nom || !email || !telephone || !question) {
      return NextResponse.json(
        { error: 'Tous les champs sont requis' },
        { status: 400 }
      )
    }

    const questionComplete = question === "Autre question"
      ? questionAutre
      : question

    // Email HTML template
    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #00874e 0%, #006341 100%); color: white; padding: 30px; text-align: center; }
    .header h1 { margin: 0; font-size: 24px; }
    .header p { margin: 10px 0 0; opacity: 0.9; }
    .content { padding: 30px; }
    .greeting { font-size: 18px; color: #333; margin-bottom: 20px; }
    .intro { background: #f0fdf4; border-left: 4px solid #00874e; padding: 15px; margin-bottom: 25px; border-radius: 0 8px 8px 0; }
    .client-info { background: #f9fafb; border-radius: 12px; padding: 20px; margin-bottom: 25px; }
    .client-info h3 { margin: 0 0 15px; color: #00874e; font-size: 16px; text-transform: uppercase; letter-spacing: 1px; }
    .info-row { display: flex; padding: 12px 0; border-bottom: 1px solid #e5e7eb; }
    .info-row:last-child { border-bottom: none; }
    .info-label { font-weight: 600; color: #666; width: 120px; }
    .info-value { color: #111; flex: 1; }
    .info-value a { color: #00874e; text-decoration: none; }
    .message-box { background: #fffbeb; border: 2px solid #fbbf24; border-radius: 12px; padding: 20px; margin-bottom: 25px; }
    .message-box h3 { margin: 0 0 10px; color: #92400e; font-size: 14px; text-transform: uppercase; }
    .message-box p { margin: 0; color: #333; font-size: 16px; line-height: 1.6; }
    .quick-responses { margin-top: 25px; }
    .quick-responses h3 { color: #666; font-size: 14px; margin-bottom: 15px; }
    .response-btn { display: inline-block; background: #00874e; color: white; padding: 12px 20px; border-radius: 8px; text-decoration: none; margin: 5px 5px 5px 0; font-size: 14px; }
    .response-btn:hover { background: #006341; }
    .response-btn.secondary { background: white; color: #00874e; border: 2px solid #00874e; }
    .footer { background: #f9fafb; padding: 20px; text-align: center; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>💬 Un client attend votre reponse</h1>
      <p>Solution Argent Rapide</p>
    </div>

    <div class="content">
      <p class="greeting">Bonjour Michel,</p>

      <div class="intro">
        <strong>Je suis SAR, votre assistant personnel.</strong><br>
        Un nouveau message vient d'etre envoye par un client depuis votre site Solution Argent Rapide.
      </div>

      <div class="client-info">
        <h3>📋 Informations du client</h3>
        <div class="info-row">
          <span class="info-label">👤 Nom</span>
          <span class="info-value"><strong>${nom}</strong></span>
        </div>
        <div class="info-row">
          <span class="info-label">📞 Telephone</span>
          <span class="info-value"><a href="tel:${telephone.replace(/\D/g, '')}">${telephone}</a></span>
        </div>
        <div class="info-row">
          <span class="info-label">✉️ Courriel</span>
          <span class="info-value"><a href="mailto:${email}">${email}</a></span>
        </div>
      </div>

      <div class="message-box">
        <h3>💬 Question du client</h3>
        <p>${questionComplete}</p>
      </div>

      <div class="quick-responses">
        <h3>⚡ Reponses rapides</h3>
        <a href="tel:${telephone.replace(/\D/g, '')}" class="response-btn">📞 Appeler le client</a>
        <a href="mailto:${email}?subject=Re: Votre demande - Solution Argent Rapide&body=Bonjour ${nom.split(' ')[0]},%0D%0A%0D%0AMerci de nous avoir contacte.%0D%0A%0D%0A" class="response-btn secondary">✉️ Repondre par courriel</a>
      </div>
    </div>

    <div class="footer">
      <p>Ce message a ete envoye automatiquement par SAR - Solution Argent Rapide<br>
      <a href="https://solutionargentrapide.ca">solutionargentrapide.ca</a></p>
    </div>
  </div>
</body>
</html>
    `.trim()

    // Email texte (fallback)
    const emailText = `
Bonjour Michel,

Je suis SAR, votre assistant personnel.
Un nouveau message vient d'etre envoye par un client depuis votre site Solution Argent Rapide.

═══════════════════════════════════════
📋 INFORMATIONS DU CLIENT
═══════════════════════════════════════

👤 Nom:        ${nom}
📞 Telephone:  ${telephone}
✉️ Courriel:   ${email}

═══════════════════════════════════════
💬 QUESTION DU CLIENT
═══════════════════════════════════════

${questionComplete}

═══════════════════════════════════════

Pour repondre rapidement:
• Appeler: ${telephone}
• Courriel: ${email}

---
SAR - Solution Argent Rapide
https://solutionargentrapide.ca
    `.trim()

    // Destinataire - Michel Rosa (Analyste)
    // Pour tester: changer temporairement a info@
    const destinataire = 'info@solutionargentrapide.ca' // TEST - remettre mrosa@ apres

    // Option 1: Utiliser Resend (recommande)
    if (process.env.RESEND_API_KEY) {
      const resendResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: 'SAR Assistant <noreply@solutionargentrapide.ca>',
          to: destinataire,
          reply_to: email,
          subject: `💬 Un client attend votre reponse - ${nom}`,
          html: emailHtml,
          text: emailText
        })
      })

      if (!resendResponse.ok) {
        const error = await resendResponse.text()
        console.error('Resend error:', error)
        throw new Error('Erreur envoi email')
      }

      return NextResponse.json({ success: true, method: 'resend' })
    }

    // Option 2: Stocker dans Supabase si pas de config email
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY) {
      const { createClient } = require('@supabase/supabase-js')
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_KEY
      )

      const { error } = await supabase
        .from('contact_messages')
        .insert({
          nom,
          email,
          telephone,
          question: questionComplete,
          destinataire: destinataire,
          created_at: new Date().toISOString()
        })

      if (error) {
        console.error('Supabase error:', error)
        throw new Error('Erreur sauvegarde message')
      }

      return NextResponse.json({ success: true, method: 'supabase' })
    }

    // Mode dev: log seulement
    console.log('=== CONTACT ANALYSE (DEV MODE) ===')
    console.log('To:', destinataire)
    console.log(emailText)
    console.log('==================================')

    return NextResponse.json({
      success: true,
      method: 'dev',
      message: 'Mode dev - email non envoye, voir console serveur'
    })

  } catch (error) {
    console.error('Contact API error:', error)
    return NextResponse.json(
      { error: 'Erreur lors de l\'envoi du message' },
      { status: 500 }
    )
  }
}
