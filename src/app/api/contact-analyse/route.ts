import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Generer reference unique
function generateReference(id: number) {
  return `SAR-${id.toString().padStart(6, '0')}`
}

function getClientIP(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0] ||
         request.headers.get('x-real-ip') ||
         'unknown'
}

// Parser le User-Agent pour extraire device, browser, OS
function parseUserAgent(ua: string): { device: string; browser: string; os: string } {
  const device = /mobile|android|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(ua)
    ? (/tablet|ipad/i.test(ua) ? 'Tablet' : 'Mobile')
    : 'Desktop'

  let browser = 'Unknown'
  if (/edg/i.test(ua)) browser = 'Edge'
  else if (/chrome/i.test(ua) && !/edg/i.test(ua)) browser = 'Chrome'
  else if (/firefox/i.test(ua)) browser = 'Firefox'
  else if (/safari/i.test(ua) && !/chrome/i.test(ua)) browser = 'Safari'
  else if (/opera|opr/i.test(ua)) browser = 'Opera'

  let os = 'Unknown'
  if (/windows/i.test(ua)) os = 'Windows'
  else if (/mac os x/i.test(ua)) os = 'macOS'
  else if (/android/i.test(ua)) os = 'Android'
  else if (/iphone|ipad|ipod/i.test(ua)) os = 'iOS'
  else if (/linux/i.test(ua)) os = 'Linux'

  return { device, browser, os }
}

function getSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY

  if (!supabaseUrl || !supabaseKey) {
    return null
  }

  return createClient(supabaseUrl, supabaseKey)
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { nom, email, telephone, question, questionAutre, source = 'analyse', clientMetadata } = body

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

    // Determiner le tag source et le destinataire
    let sourceLabel = 'Analyse Demande'
    let departement = 'Analyse et suivi'
    if (source === 'accueil') {
      sourceLabel = 'Formulaire Accueil'
      departement = 'Analyse et suivi'
    } else if (source === 'espace-client') {
      sourceLabel = 'Espace Client'
      departement = 'Comptabilite et administration'
    } else if (source === 'analyse-suivi') {
      sourceLabel = 'Analyse et Suivi'
      departement = 'Analyse et suivi'
    }

    const isEspaceClient = source === 'espace-client'
    const questionWithTag = isEspaceClient
      ? `[${sourceLabel}] [${question}] ${questionAutre || ''}`
      : `[${sourceLabel}] [${question}] ${question === "Autre question" ? questionAutre : ''}`

    // Destinataire selon le type de question et source
    const isAutreQuestion = question === "Autre question" || question.includes("Autre question")
    const isEspaceClientSource = source === 'espace-client'

    // Espace Client va a Sandra (perception), autres questions vont selon le type
    let destinataire: string
    let destinataireNom: string

    if (isEspaceClientSource) {
      destinataire = 'perception@solutionargentrapide.ca'
      destinataireNom = 'Sandra'
      departement = 'Comptabilite et administration'
    } else if (isAutreQuestion) {
      destinataire = 'perception@solutionargentrapide.ca'
      destinataireNom = 'Sandra'
      departement = 'Comptabilite et administration'
    } else {
      destinataire = 'mrosa@solutionargentrapide.ca'
      destinataireNom = 'Michel'
      departement = 'Analyse et suivi'
    }

    // Capturer métriques client
    const clientIP = getClientIP(request)
    const userAgent = request.headers.get('user-agent') || ''
    const { device, browser, os } = parseUserAgent(userAgent)
    const referrer = request.headers.get('referer') || request.headers.get('referrer') || ''
    const acceptLanguage = request.headers.get('accept-language')?.split(',')[0] || 'unknown'

    // Extraire UTM params du referrer si présent
    const referrerUrl = referrer ? new URL(referrer, 'https://solutionargentrapide.ca') : null
    const utmSource = referrerUrl?.searchParams.get('utm_source') || clientMetadata?.utmSource || null
    const utmMedium = referrerUrl?.searchParams.get('utm_medium') || clientMetadata?.utmMedium || null
    const utmCampaign = referrerUrl?.searchParams.get('utm_campaign') || clientMetadata?.utmCampaign || null

    const supabase = getSupabase()
    let messageId: number | null = null
    let reference = ''

    // Sauvegarder dans Supabase
    if (supabase) {
      const { data, error } = await supabase
        .from('contact_messages')
        .insert({
          nom,
          email,
          telephone,
          question: questionWithTag.trim(),
          lu: false,
          status: 'nouveau',
          assigned_to: destinataireNom, // Auto-assigner selon le destinataire
          assigned_at: new Date().toISOString(),
          assigned_by: 'auto-system',
          system_responded: true, // Email de confirmation envoyé
          client_ip: clientIP,
          client_user_agent: userAgent,
          client_device: device,
          client_browser: browser,
          client_os: os,
          client_timezone: clientMetadata?.timezone || null,
          client_language: acceptLanguage,
          client_screen_resolution: clientMetadata?.screenResolution || null,
          referrer: referrer || null,
          utm_source: utmSource,
          utm_medium: utmMedium,
          utm_campaign: utmCampaign
        })
        .select()
        .single()

      if (error) {
        console.error('Erreur Supabase:', error)
      } else {
        messageId = data.id
        reference = generateReference(data.id)

        // Enregistrer l'email envoye a l'equipe
        await supabase.from('emails_envoyes').insert({
          message_id: messageId,
          type: 'system',
          destinataire: destinataire,
          sujet: `[NOUVELLE DEMANDE] ${nom} - #${reference}`,
          contenu: `Nouvelle demande depuis ${sourceLabel}

Reference: #${reference}
Date: ${new Date().toLocaleString('fr-CA')}

CLIENT:
Nom: ${nom}
Email: ${email}
Telephone: ${telephone}

QUESTION: ${question}
${question === "Autre question" ? `\nDETAILS:\n${questionAutre}` : ''}

---
Connectez-vous a l'admin pour repondre: /admin/dashboard`,
          envoye_par: 'system'
        })

        // Enregistrer l'email de confirmation au client
        if (email) {
          await supabase.from('emails_envoyes').insert({
            message_id: messageId,
            type: 'system',
            destinataire: email,
            sujet: `Confirmation de votre demande #${reference}`,
            contenu: `Bonjour ${nom.split(' ')[0]},

Nous avons bien recu votre demande.

Votre numero de reference: #${reference}
Question: ${questionComplete}

Notre equipe vous contactera dans les 24-48h ouvrables.

Heures d'ouverture:
Lundi au vendredi: 8h00 a 16h00

Contact: 514-589-1946 (Analyse et suivi) ou 450-999-1107 (Administration)

Cordialement,
L'equipe Solution Argent Rapide`,
            envoye_par: 'system'
          })
        }
      }
    }

    // Email HTML template pour l'equipe
    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
    .header { background-color: #00874e; background: linear-gradient(135deg, #00874e 0%, #006341 100%); color: white; padding: 30px; text-align: center; }
    .header h1 { margin: 0; font-size: 24px; }
    .header p { margin: 10px 0 0; opacity: 0.9; }
    .content { padding: 30px; }
    .reference { background: #00874e; color: white; display: inline-block; padding: 8px 16px; border-radius: 8px; font-weight: bold; margin-bottom: 20px; }
    .source-tag { background: #3b82f6; color: white; display: inline-block; padding: 6px 12px; border-radius: 6px; font-size: 12px; margin-left: 10px; }
    .greeting { font-size: 18px; color: #333; margin-bottom: 20px; }
    .intro { background: #f0fdf4; border-left: 4px solid #00874e; padding: 15px; margin-bottom: 25px; border-radius: 0 8px 8px 0; }
    .client-info { background: #f9fafb; border-radius: 12px; padding: 20px; margin-bottom: 25px; }
    .client-info h3 { margin: 0 0 15px; color: #00874e; font-size: 16px; text-transform: uppercase; letter-spacing: 1px; }
    .info-row { display: flex; padding: 12px 0; border-bottom: 1px solid #e5e7eb; }
    .info-row:last-child { border-bottom: none; }
    .info-label { font-weight: 600; color: #666; width: 120px; }
    .info-value { color: #111; flex: 1; }
    .info-value a { color: #00874e; text-decoration: none; }
    .question-tag { background: #dbeafe; color: #1e40af; padding: 8px 16px; border-radius: 8px; font-weight: 600; display: inline-block; margin-bottom: 15px; }
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
      <!-- RAISON/OPTION EN GROS -->
      <div style="background-color: #7c3aed; background: linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%); color: white; padding: 25px; border-radius: 12px; text-align: center; margin-bottom: 25px;">
        <p style="margin: 0 0 8px; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; opacity: 0.9; color: #ffffff;">Le client a choisi:</p>
        <h2 style="margin: 0; font-size: 24px; font-weight: 800; color: #ffffff;">❓ ${question}</h2>
        <p style="margin: 10px 0 0; font-size: 13px; opacity: 0.9;">Source: ${sourceLabel}</p>
      </div>

      <div style="margin-bottom: 20px;">
        ${reference ? `<span class="reference">#${reference}</span>` : ''}
        <span class="source-tag">${sourceLabel}</span>
      </div>

      <p class="greeting">Bonjour ${destinataireNom},</p>

      <div class="intro">
        <strong>Nouvelle demande recue!</strong><br>
        Un client vous a contacte depuis "${sourceLabel}" avec la question: <strong>${question}</strong>
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

      ${question === "Autre question" && questionAutre ? `
      <div class="message-box">
        <h3>💬 Details de la question</h3>
        <p style="white-space: pre-wrap;">${questionAutre}</p>
      </div>
      ` : ''}

      <div class="quick-responses">
        <h3>⚡ Reponses rapides</h3>
        <a href="tel:${telephone.replace(/\D/g, '')}" class="response-btn">📞 Appeler le client</a>
        <a href="mailto:${email}?subject=Re: Votre demande ${reference ? '#' + reference : ''} - Solution Argent Rapide&body=Bonjour ${nom.split(' ')[0]},%0D%0A%0D%0AMerci de nous avoir contacte.%0D%0A%0D%0A" class="response-btn secondary">✉️ Repondre par courriel</a>
      </div>
    </div>

    <div class="footer">
      <p>Ce message a ete envoye automatiquement<br>
      <a href="https://solutionargentrapide.ca/admin/dashboard">Voir dans l'admin</a></p>
    </div>
  </div>
</body>
</html>
    `.trim()

    // Email de confirmation au client
    const clientConfirmationHtml = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Confirmation de votre demande</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="width: 100%; max-width: 600px; border-collapse: collapse;">

          <!-- Logo Header -->
          <tr>
            <td align="center" style="padding-bottom: 30px;">
              <table role="presentation" style="border-collapse: collapse;">
                <tr>
                  <td style="background-color: #00874e; background: linear-gradient(135deg, #00874e 0%, #005a34 100%); padding: 20px 40px; border-radius: 12px;">
                    <span style="font-size: 24px; font-weight: 700; color: #ffffff; letter-spacing: -0.5px;">Solution</span>
                    <span style="font-size: 24px; font-weight: 700; color: #c9a227; letter-spacing: -0.5px; margin-left: 8px;">Argent Rapide</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Card -->
          <tr>
            <td style="background: #ffffff; border-radius: 16px; box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);">

              <!-- Success Banner -->
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="background-color: #00874e; background: linear-gradient(135deg, #00874e 0%, #005a34 100%); padding: 35px 40px; border-radius: 16px 16px 0 0; text-align: center;">
                    <div style="width: 70px; height: 70px; background-color: rgba(255,255,255,0.2); border-radius: 50%; margin: 0 auto 15px; line-height: 70px;">
                      <span style="font-size: 36px; color: #ffffff;">✓</span>
                    </div>
                    <h1 style="margin: 0; color: #ffffff; font-size: 26px; font-weight: 700;">Demande bien recue!</h1>
                    <p style="margin: 10px 0 0; color: #ffffff; font-size: 15px; opacity: 0.9;">Nous traitons votre demande avec attention</p>
                  </td>
                </tr>
              </table>

              <!-- Content -->
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 40px;">

                    <!-- Reference Box -->
                    ${reference ? `
                    <table role="presentation" style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
                      <tr>
                        <td style="background: #f0fdf4; border: 2px solid #00874e; border-radius: 12px; padding: 20px; text-align: center;">
                          <p style="margin: 0 0 5px; color: #166534; font-size: 13px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">Votre numero de reference</p>
                          <p style="margin: 0; color: #00874e; font-size: 28px; font-weight: 700; letter-spacing: 1px;">#${reference}</p>
                          <p style="margin: 10px 0 0; color: #166534; font-size: 12px;">Conservez ce numero pour tout suivi</p>
                        </td>
                      </tr>
                    </table>
                    ` : ''}

                    <!-- Your question -->
                    <table role="presentation" style="width: 100%; border-collapse: collapse; margin-bottom: 25px;">
                      <tr>
                        <td style="background: #f0f9ff; border-radius: 12px; padding: 20px;">
                          <p style="margin: 0 0 8px; color: #0369a1; font-size: 13px; font-weight: 600;">VOTRE QUESTION:</p>
                          <p style="margin: 0; color: #0c4a6e; font-size: 15px; font-weight: 500;">${questionComplete}</p>
                        </td>
                      </tr>
                    </table>

                    <!-- Message -->
                    <p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 1.7;">
                      Bonjour ${nom.split(' ')[0]},
                    </p>
                    <p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 1.7;">
                      Nous avons bien recu votre message et nous vous remercions de votre confiance.
                    </p>

                    <!-- Departement Box -->
                    <table role="presentation" style="width: 100%; border-collapse: collapse; margin-bottom: 25px;">
                      <tr>
                        <td style="background: #f0f9ff; border: 2px solid #3b82f6; border-radius: 12px; padding: 20px;">
                          <p style="margin: 0 0 8px; color: #1e40af; font-size: 13px; font-weight: 600; text-transform: uppercase;">Votre message a ete transmis a:</p>
                          <p style="margin: 0; color: #1d4ed8; font-size: 20px; font-weight: 700;">📋 Departement ${departement}</p>
                          <p style="margin: 10px 0 0; color: #3b82f6; font-size: 14px;">${destinataireNom} traitera votre demande</p>
                        </td>
                      </tr>
                    </table>

                    <!-- Delai 24h -->
                    <table role="presentation" style="width: 100%; border-collapse: collapse; margin-bottom: 25px;">
                      <tr>
                        <td style="background: #fef3c7; border: 2px solid #f59e0b; border-radius: 12px; padding: 20px; text-align: center;">
                          <p style="margin: 0; color: #92400e; font-size: 18px; font-weight: 700;">⏱️ Delai de reponse: 24 heures ouvrables</p>
                          <p style="margin: 8px 0 0; color: #a16207; font-size: 14px;">${destinataireNom} vous contactera bientot</p>
                        </td>
                      </tr>
                    </table>

                    <!-- Hours Box -->
                    <table role="presentation" style="width: 100%; border-collapse: collapse; margin: 25px 0;">
                      <tr>
                        <td style="background: #fffbeb; border-left: 4px solid #f59e0b; border-radius: 0 8px 8px 0; padding: 20px;">
                          <p style="margin: 0 0 8px; color: #92400e; font-size: 14px; font-weight: 700;">🕐 Heures d'ouverture</p>
                          <p style="margin: 0; color: #78350f; font-size: 14px; line-height: 1.6;">
                            <strong>Lundi au vendredi:</strong> 8h00 a 16h00<br>
                            <span style="color: #a16207; font-size: 13px;">Ferme les samedis, dimanches et jours feries</span>
                          </p>
                        </td>
                      </tr>
                    </table>

                    <!-- Contact Info Urgent -->
                    <table role="presentation" style="width: 100%; border-collapse: collapse; margin-top: 30px;">
                      <tr>
                        <td style="background: #fef2f2; border: 2px solid #ef4444; border-radius: 12px; padding: 20px;">
                          <p style="margin: 0 0 12px; color: #b91c1c; font-size: 15px; font-weight: 700;">
                            🚨 Demande URGENTE? Appelez directement:
                          </p>
                          <table role="presentation" style="border-collapse: collapse; width: 100%;">
                            <tr>
                              <td style="padding: 10px; background: white; border-radius: 8px;">
                                <a href="tel:4509991107" style="color: #dc2626; text-decoration: none; font-size: 18px; font-weight: 700;">
                                  📞 450 999-1107
                                </a>
                                <p style="margin: 5px 0 0; color: #666; font-size: 12px;">Administration / Comptabilite</p>
                              </td>
                            </tr>
                          </table>
                          <p style="margin: 12px 0 0; color: #b91c1c; font-size: 12px;">Lundi-Vendredi 8h-16h</p>
                        </td>
                      </tr>
                    </table>

                    <!-- Contact Info Normal -->
                    <table role="presentation" style="width: 100%; border-collapse: collapse; margin-top: 20px;">
                      <tr>
                        <td style="border-top: 1px solid #e5e7eb; padding-top: 20px;">
                          <p style="margin: 0 0 12px; color: #6b7280; font-size: 14px;">
                            <strong style="color: #374151;">Autres contacts:</strong>
                          </p>
                          <table role="presentation" style="border-collapse: collapse;">
                            <tr>
                              <td style="padding: 8px 0;">
                                <a href="tel:5145891946" style="color: #00874e; text-decoration: none; font-size: 15px; font-weight: 600;">
                                  📞 514-589-1946
                                </a>
                                <span style="color: #9ca3af; font-size: 12px; margin-left: 8px;">(Analyse et suivi)</span>
                              </td>
                            </tr>
                            <tr>
                              <td style="padding: 8px 0;">
                                <a href="mailto:info@solutionargentrapide.ca" style="color: #00874e; text-decoration: none; font-size: 14px;">
                                  ✉️ info@solutionargentrapide.ca
                                </a>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>

                    <!-- Signature -->
                    <table role="presentation" style="width: 100%; border-collapse: collapse; margin-top: 30px;">
                      <tr>
                        <td>
                          <p style="margin: 0; color: #374151; font-size: 15px; line-height: 1.7;">
                            Cordialement,<br>
                            <strong style="color: #00874e;">L'equipe Solution Argent Rapide</strong>
                          </p>
                        </td>
                      </tr>
                    </table>

                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 30px 20px; text-align: center;">
              <p style="margin: 0 0 10px; color: #6b7280; font-size: 13px;">
                <a href="https://solutionargentrapide.ca" style="color: #00874e; text-decoration: none; font-weight: 600;">solutionargentrapide.ca</a>
              </p>
              <p style="margin: 0; color: #9ca3af; font-size: 11px; line-height: 1.6;">
                Cet email a ete envoye automatiquement suite a votre demande.<br>
                © ${new Date().getFullYear()} Solution Argent Rapide Inc. Tous droits reserves.
              </p>
              <p style="margin: 15px 0 0; color: #9ca3af; font-size: 11px;">
                Quebec, Canada
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim()

    // Envoyer emails via Resend si configure
    if (process.env.RESEND_API_KEY) {
      // Email a l'equipe
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: 'SAR Assistant <noreply@solutionargentrapide.ca>',
          to: destinataire,
          reply_to: email,
          subject: `💬 ${question} - ${nom} ${reference ? '#' + reference : ''}`,
          html: emailHtml
        })
      })

      // Email de confirmation au client
      if (email) {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: 'Solution Argent Rapide <noreply@solutionargentrapide.ca>',
            to: email,
            subject: `✅ Demande recue ${reference ? '#' + reference : ''} - Solution Argent Rapide`,
            html: clientConfirmationHtml
          })
        })
      }

      return NextResponse.json({
        success: true,
        method: 'resend+supabase',
        reference,
        destinataire
      })
    }

    // Mode dev: log seulement

    return NextResponse.json({
      success: true,
      method: 'supabase',
      reference,
      message: 'Message sauvegarde'
    })

  } catch (error) {
    console.error('Contact API error:', error)
    return NextResponse.json(
      { error: 'Erreur lors de l\'envoi du message' },
      { status: 500 }
    )
  }
}
