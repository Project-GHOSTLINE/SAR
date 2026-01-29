import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { validateEmail, validateCanadianPhone } from '@/lib/validators'

// Rate limiting pour le formulaire de contact
const contactAttempts = new Map<string, { count: number; lastAttempt: number }>()
const MAX_CONTACT_ATTEMPTS = 5
const CONTACT_WINDOW = 60 * 60 * 1000 // 1 heure

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

function isContactRateLimited(ip: string): boolean {
  const now = Date.now()
  const attempt = contactAttempts.get(ip)
  if (!attempt) return false
  if (now - attempt.lastAttempt > CONTACT_WINDOW) {
    contactAttempts.delete(ip)
    return false
  }
  return attempt.count >= MAX_CONTACT_ATTEMPTS
}

function recordContactAttempt(ip: string): void {
  const now = Date.now()
  const attempt = contactAttempts.get(ip)
  if (!attempt || now - attempt.lastAttempt > CONTACT_WINDOW) {
    contactAttempts.set(ip, { count: 1, lastAttempt: now })
  } else {
    contactAttempts.set(ip, { count: attempt.count + 1, lastAttempt: now })
  }
}

// Sanitization pour prevenir XSS
function sanitizeInput(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .trim()
}

// Validation email (utilise lib/validators)
function isValidEmail(email: string): boolean {
  return validateEmail(email).valid
}

// Validation telephone canadien (utilise lib/validators)
function isValidPhone(phone: string): boolean {
  return validateCanadianPhone(phone).valid
}

// Generer reference unique
function generateReference(id: number) {
  return `SAR-${id.toString().padStart(6, '0')}`
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
  const clientIP = getClientIP(request)

  // Rate limiting
  if (isContactRateLimited(clientIP)) {
    return NextResponse.json(
      { error: 'Trop de messages envoyes. Reessayez plus tard.' },
      { status: 429 }
    )
  }

  try {
    const body = await request.json()
    let { nom, prenom, telephone, sujet, message, contactMethod, contact, source = 'site', clientMetadata } = body

    // Validation des inputs
    if (!message || !contact) {
      return NextResponse.json(
        { error: 'Message et contact sont requis' },
        { status: 400 }
      )
    }

    // Si nom/prenom/telephone fournis, créer le nom complet
    let clientName = contact
    if (nom && prenom) {
      clientName = `${prenom} ${nom}`
    } else if (nom) {
      clientName = nom
    } else if (prenom) {
      clientName = prenom
    }

    // Si un sujet est fourni, l'ajouter au message
    if (sujet) {
      message = `[${sujet}]\n\n${message}`
    }

    // Si un téléphone est fourni, l'ajouter au message
    if (telephone) {
      message = `Téléphone: ${telephone}\n\n${message}`
    }

    // Limites de taille
    if (message.length > 5000 || contact.length > 254) {
      return NextResponse.json(
        { error: 'Message trop long' },
        { status: 400 }
      )
    }

    // Validation du format de contact
    if (contactMethod === 'email' && !isValidEmail(contact)) {
      return NextResponse.json(
        { error: 'Adresse email invalide' },
        { status: 400 }
      )
    }

    if (contactMethod === 'phone' && !isValidPhone(contact)) {
      return NextResponse.json(
        { error: 'Numero de telephone invalide' },
        { status: 400 }
      )
    }

    // Sanitize les inputs
    message = sanitizeInput(message)
    contact = sanitizeInput(contact)

    // Enregistrer la tentative
    recordContactAttempt(clientIP)

    // Capturer métriques client
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
    const contactLabel = contactMethod === 'email' ? 'Courriel' : 'Telephone'
    const clientEmail = contactMethod === 'email' ? contact : ''
    const clientPhone = telephone || (contactMethod === 'phone' ? contact : '')

    // Determiner la source et le departement
    let sourceLabel = 'Formulaire Contact'
    let departement = 'Analyse et suivi'
    let departementEmail = 'mrosa@solutionargentrapide.ca'
    let responsable = 'Michel'

    if (source === 'nous-joindre') {
      sourceLabel = 'Page Nous Joindre'
      departement = 'Administration'
      departementEmail = 'perception@solutionargentrapide.ca'
      responsable = 'Sandra'
    }

    let messageId: number | null = null
    let reference = ''

    // Sauvegarder dans Supabase
    if (supabase) {
      const { data, error } = await supabase
        .from('contact_messages')
        .insert({
          nom: clientName,
          email: clientEmail,
          telephone: clientPhone,
          question: `[${sourceLabel}] ${message}`,
          lu: false,
          status: 'nouveau',
          assigned_to: responsable, // Auto-assigner selon la source
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

        // Creer les enregistrements d'emails dans emails_envoyes

        // 1. Email de confirmation au client (si email fourni)
        if (clientEmail) {
          await supabase.from('emails_envoyes').insert({
            message_id: messageId,
            type: 'system',
            destinataire: clientEmail,
            sujet: `Confirmation de votre demande #${reference}`,
            contenu: `Bonjour,

Nous avons bien recu votre message.

Votre numero de reference: #${reference}

Notre equipe vous contactera dans les 24-48h ouvrables.

Cordialement,
L'equipe Solution Argent Rapide`,
            envoye_par: 'system'
          })
        }

        // 2. Notification au responsable du departement
        await supabase.from('emails_envoyes').insert({
          message_id: messageId,
          type: 'system',
          destinataire: departementEmail,
          sujet: `[${sourceLabel.toUpperCase()}] #${reference} - Nouveau message`,
          contenu: `Bonjour ${responsable},

NOUVELLE DEMANDE - ${sourceLabel}
=====================================

Reference: #${reference}
Date: ${new Date().toLocaleString('fr-CA')}
Source: ${sourceLabel}

CONTACT CLIENT:
${contactLabel}: ${contact}

MESSAGE:
${message}

---
Connectez-vous a l'admin pour repondre: /admin/dashboard`,
          envoye_par: 'system'
        })
      }
    }

    // Envoyer emails via Resend
    if (process.env.RESEND_API_KEY) {
      const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
    .header { background-color: #00874e; background: linear-gradient(135deg, #00874e 0%, #005a34 100%); color: white; padding: 30px; text-align: center; }
    .header h1 { margin: 0; font-size: 24px; }
    .content { padding: 30px; }
    .source-banner { background-color: #3b82f6; background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: white; padding: 20px; border-radius: 12px; text-align: center; margin-bottom: 25px; }
    .source-banner h2 { margin: 0; font-size: 28px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; }
    .source-banner p { margin: 8px 0 0; opacity: 0.9; font-size: 14px; }
    .reference { background: #00874e; color: white; display: inline-block; padding: 8px 16px; border-radius: 8px; font-weight: bold; margin-bottom: 20px; }
    .greeting { font-size: 18px; color: #333; margin-bottom: 15px; }
    .client-info { background: #f9fafb; border-radius: 12px; padding: 20px; margin-bottom: 25px; }
    .client-info h3 { margin: 0 0 15px; color: #00874e; font-size: 16px; text-transform: uppercase; letter-spacing: 1px; }
    .info-row { display: flex; padding: 12px 0; border-bottom: 1px solid #e5e7eb; }
    .info-row:last-child { border-bottom: none; }
    .info-label { font-weight: 600; color: #666; width: 150px; }
    .info-value { color: #111; flex: 1; }
    .info-value a { color: #00874e; text-decoration: none; font-weight: 600; }
    .message-box { background: #fffbeb; border: 2px solid #fbbf24; border-radius: 12px; padding: 20px; margin-bottom: 25px; }
    .message-box h3 { margin: 0 0 10px; color: #92400e; font-size: 14px; text-transform: uppercase; }
    .message-box p { margin: 0; color: #333; font-size: 16px; line-height: 1.6; white-space: pre-wrap; }
    .quick-actions { margin-top: 25px; }
    .quick-actions h3 { color: #666; font-size: 14px; margin-bottom: 15px; }
    .action-btn { display: inline-block; background: #00874e; color: white; padding: 12px 20px; border-radius: 8px; text-decoration: none; margin: 5px 5px 5px 0; font-size: 14px; font-weight: 600; }
    .action-btn.secondary { background: white; color: #00874e; border: 2px solid #00874e; }
    .footer { background: #f9fafb; padding: 20px; text-align: center; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📬 Un client attend votre reponse</h1>
      <p>Solution Argent Rapide</p>
    </div>

    <div class="content">
      <!-- SOURCE EN GROS -->
      <div class="source-banner">
        <h2>📍 ${sourceLabel}</h2>
        <p>Message recu depuis le site web</p>
      </div>

      ${reference ? `<div class="reference">Reference: #${reference}</div>` : ''}

      <p class="greeting">Bonjour ${responsable},</p>
      <p style="color: #666; margin-bottom: 25px;">Un visiteur vous a contacte depuis <strong>${sourceLabel}</strong>.</p>

      <div class="client-info">
        <h3>📋 Contact du client</h3>
        <div class="info-row">
          <span class="info-label">Methode preferee</span>
          <span class="info-value"><strong>${contactLabel}</strong></span>
        </div>
        <div class="info-row">
          <span class="info-label">${contactLabel}</span>
          <span class="info-value">
            ${contactMethod === 'email'
              ? `<a href="mailto:${contact}">${contact}</a>`
              : `<a href="tel:${contact.replace(/\D/g, '')}">${contact}</a>`}
          </span>
        </div>
      </div>

      <div class="message-box">
        <h3>💬 Message du client</h3>
        <p style="white-space: pre-wrap;">${message}</p>
      </div>

      <div class="quick-actions">
        <h3>⚡ Actions rapides</h3>
        ${contactMethod === 'phone'
          ? `<a href="tel:${contact.replace(/\D/g, '')}" class="action-btn">📞 Appeler le client</a>`
          : `<a href="mailto:${contact}?subject=Re: Votre message ${reference ? '%23' + reference : ''} - Solution Argent Rapide" class="action-btn">✉️ Repondre par courriel</a>`}
        <a href="https://solutionargentrapide.ca/admin/dashboard" class="action-btn secondary">🔗 Voir dans l'admin</a>
      </div>
    </div>

    <div class="footer">
      <p>Ce message a ete envoye automatiquement depuis ${sourceLabel}<br>
      <a href="https://solutionargentrapide.ca">solutionargentrapide.ca</a></p>
    </div>
  </div>
</body>
</html>
      `.trim()

      // Envoyer au departement responsable uniquement
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: 'SAR Contact <noreply@solutionargentrapide.ca>',
          to: departementEmail,
          reply_to: contactMethod === 'email' ? contact : undefined,
          subject: `📬 [${sourceLabel.toUpperCase()}] ${reference ? '#' + reference : ''} - Nouveau message`,
          html: emailHtml
        })
      })

      // Envoyer confirmation au client si email fourni
      if (clientEmail) {
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

                    <!-- Message -->
                    <p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 1.7;">
                      Bonjour,
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
                          <p style="margin: 10px 0 0; color: #3b82f6; font-size: 14px;">${responsable} traitera votre demande</p>
                        </td>
                      </tr>
                    </table>

                    <!-- Delai 24h -->
                    <table role="presentation" style="width: 100%; border-collapse: collapse; margin-bottom: 25px;">
                      <tr>
                        <td style="background: #fef3c7; border: 2px solid #f59e0b; border-radius: 12px; padding: 20px; text-align: center;">
                          <p style="margin: 0; color: #92400e; font-size: 18px; font-weight: 700;">⏱️ Delai de reponse: 24 heures ouvrables</p>
                          <p style="margin: 8px 0 0; color: #a16207; font-size: 14px;">Un membre de notre equipe vous contactera bientot</p>
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
                              <td style="padding: 10px; background: white; border-radius: 8px; margin-bottom: 8px;">
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

        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: 'Solution Argent Rapide <noreply@solutionargentrapide.ca>',
            to: clientEmail,
            subject: `✅ Demande recue #${reference} - Solution Argent Rapide`,
            html: clientConfirmationHtml
          })
        })
      }

      return NextResponse.json({ success: true, method: 'resend+supabase', reference })
    }

    // Mode dev

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
