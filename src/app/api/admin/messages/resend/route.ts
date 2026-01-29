import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { jwtVerify } from 'jose'
import { createClient } from '@supabase/supabase-js'

const JWT_SECRET = process.env.JWT_SECRET!

// Vérifier le token JWT
async function verifyAuth() {
  const cookieStore = await cookies()
  const token = cookieStore.get('admin-session')

  if (!token) return { isAuth: false, email: null }

  try {
    const secret = new TextEncoder().encode(JWT_SECRET)
    const { payload } = await jwtVerify(token.value, secret)
    return { isAuth: true, email: payload.email as string }
  } catch {
    return { isAuth: false, email: null }
  }
}

// Créer le client Supabase
function getSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase credentials not configured')
  }

  return createClient(supabaseUrl, supabaseKey)
}

// POST - Renvoyer une notification email
export async function POST(request: NextRequest) {
  const { isAuth, email } = await verifyAuth()

  if (!isAuth) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { messageId, recipient } = body

    if (!messageId || !recipient) {
      return NextResponse.json(
        { error: 'messageId et recipient sont requis' },
        { status: 400 }
      )
    }

    const supabase = getSupabase()

    // Récupérer le message complet
    const { data: message, error: messageError } = await supabase
      .from('contact_messages')
      .select('*')
      .eq('id', parseInt(messageId))
      .single()

    if (messageError || !message) {
      return NextResponse.json(
        { error: 'Message non trouvé' },
        { status: 404 }
      )
    }

    // Générer la référence
    const reference = `SAR-${messageId.toString().padStart(6, '0')}`

    // Déterminer l'email du destinataire
    const recipientEmail = recipient === 'Sandra'
      ? 'perception@solutionargentrapide.ca'
      : 'mrosa@solutionargentrapide.ca'

    // Créer l'email HTML
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
    .content { padding: 30px; }
    .alert { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin-bottom: 20px; border-radius: 8px; }
    .client-info { background: #f9fafb; border-radius: 12px; padding: 20px; margin-bottom: 25px; }
    .message-box { background: #fffbeb; border: 2px solid #fbbf24; border-radius: 12px; padding: 20px; margin-bottom: 25px; }
    .footer { background: #f9fafb; padding: 20px; text-align: center; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🔔 RAPPEL - Message client</h1>
      <p>Solution Argent Rapide</p>
    </div>

    <div class="content">
      <div class="alert">
        <strong>⚠️ Notification renvoyée</strong><br>
        Ce message vous est renvoyé par ${email}
      </div>

      <h3>📋 Message #${reference}</h3>

      <div class="client-info">
        <p><strong>Client:</strong> ${message.nom}</p>
        <p><strong>Email:</strong> ${message.email}</p>
        <p><strong>Téléphone:</strong> ${message.telephone}</p>
      </div>

      <div class="message-box">
        <h3>💬 Question / Message</h3>
        <p style="white-space: pre-wrap;">${message.question}</p>
      </div>

      <p>
        <a href="https://admin.solutionargentrapide.ca/admin/dashboard?tab=messages&open=${messageId}"
           style="display: inline-block; background: #00874e; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">
          👁️ Voir dans l'admin
        </a>
      </p>
    </div>

    <div class="footer">
      <p>Notification renvoyée automatiquement depuis l'admin</p>
    </div>
  </div>
</body>
</html>
    `.trim()

    // Enregistrer dans emails_envoyes
    await supabase.from('emails_envoyes').insert({
      message_id: parseInt(messageId),
      type: 'manual',
      destinataire: recipientEmail,
      sujet: `🔔 RAPPEL - Message #${reference} - ${message.nom}`,
      contenu: emailHtml,
      envoye_par: email || 'admin'
    })

    // Envoyer via Resend si configuré
    if (process.env.RESEND_API_KEY) {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: 'SAR Admin <noreply@solutionargentrapide.ca>',
          to: recipientEmail,
          subject: `🔔 RAPPEL - Message #${reference} - ${message.nom}`,
          html: emailHtml
        })
      })
    }

    return NextResponse.json({
      success: true,
      message: `Notification renvoyée à ${recipient}`
    })
  } catch (error) {
    console.error('Error resending notification:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}
