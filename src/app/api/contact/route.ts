import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Rate limiting pour le formulaire de contact
const contactAttempts = new Map<string, { count: number; lastAttempt: number }>()
const MAX_CONTACT_ATTEMPTS = 5
const CONTACT_WINDOW = 60 * 60 * 1000 // 1 heure

function getClientIP(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0] ||
         request.headers.get('x-real-ip') ||
         'unknown'
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

// Validation email
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email) && email.length <= 254
}

// Validation telephone
function isValidPhone(phone: string): boolean {
  const phoneRegex = /^[\d\s\-\+\(\)]{10,20}$/
  return phoneRegex.test(phone)
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
    let { message, contactMethod, contact } = body

    // Validation des inputs
    if (!message || !contact) {
      return NextResponse.json(
        { error: 'Message et contact sont requis' },
        { status: 400 }
      )
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

    const supabase = getSupabase()
    const contactLabel = contactMethod === 'email' ? 'Courriel' : 'Telephone'
    const clientEmail = contactMethod === 'email' ? contact : ''
    const clientPhone = contactMethod === 'phone' ? contact : ''
    const clientName = contact // On utilise le contact comme nom par defaut

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
          question: `[Formulaire Contact] ${message}`,
          lu: false,
          status: 'nouveau'
        })
        .select()
        .single()

      if (error) {
        console.error('Erreur Supabase:', error)
      } else {
        messageId = data.id
        reference = generateReference(data.id)
        console.log('Message sauvegarde dans Supabase, ID:', messageId)

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

        // 2. Notification a Sandra (perception)
        await supabase.from('emails_envoyes').insert({
          message_id: messageId,
          type: 'system',
          destinataire: 'perception@solutionargentrapide.ca',
          sujet: `[NOUVELLE DEMANDE] #${reference}`,
          contenu: `Bonjour Sandra,

Nouvelle demande recue depuis le formulaire de contact.

Reference: #${reference}
Date: ${new Date().toLocaleString('fr-CA')}

CONTACT:
${contactLabel}: ${contact}

MESSAGE:
${message}

---
Connectez-vous a l'admin pour repondre: /admin/dashboard`,
          envoye_par: 'system'
        })

        // 3. Notification a Michel (mrosa)
        await supabase.from('emails_envoyes').insert({
          message_id: messageId,
          type: 'system',
          destinataire: 'mrosa@solutionargentrapide.ca',
          sujet: `[NOUVELLE DEMANDE] #${reference}`,
          contenu: `Bonjour Michel,

Nouvelle demande recue depuis le formulaire de contact.

Reference: #${reference}
Date: ${new Date().toLocaleString('fr-CA')}

CONTACT:
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
    .header { background: linear-gradient(135deg, #00874e 0%, #006341 100%); color: white; padding: 30px; text-align: center; }
    .header h1 { margin: 0; font-size: 24px; }
    .content { padding: 30px; }
    .reference { background: #00874e; color: white; display: inline-block; padding: 8px 16px; border-radius: 8px; font-weight: bold; margin-bottom: 20px; }
    .client-info { background: #f9fafb; border-radius: 12px; padding: 20px; margin-bottom: 25px; }
    .client-info h3 { margin: 0 0 15px; color: #00874e; font-size: 16px; text-transform: uppercase; letter-spacing: 1px; }
    .info-row { display: flex; padding: 12px 0; border-bottom: 1px solid #e5e7eb; }
    .info-row:last-child { border-bottom: none; }
    .info-label { font-weight: 600; color: #666; width: 150px; }
    .info-value { color: #111; flex: 1; }
    .info-value a { color: #00874e; text-decoration: none; }
    .message-box { background: #fffbeb; border: 2px solid #fbbf24; border-radius: 12px; padding: 20px; margin-bottom: 25px; }
    .message-box h3 { margin: 0 0 10px; color: #92400e; font-size: 14px; text-transform: uppercase; }
    .message-box p { margin: 0; color: #333; font-size: 16px; line-height: 1.6; white-space: pre-wrap; }
    .footer { background: #f9fafb; padding: 20px; text-align: center; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📬 Nouveau message du site web</h1>
      <p>Solution Argent Rapide</p>
    </div>

    <div class="content">
      ${reference ? `<div class="reference">Reference: #${reference}</div>` : ''}

      <div class="client-info">
        <h3>📋 Contact</h3>
        <div class="info-row">
          <span class="info-label">Methode preferee</span>
          <span class="info-value">${contactLabel}</span>
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
        <h3>💬 Message</h3>
        <p>${message}</p>
      </div>
    </div>

    <div class="footer">
      <p>Ce message a ete envoye depuis le formulaire de contact<br>
      <a href="https://solutionargentrapide.ca">solutionargentrapide.ca</a></p>
    </div>
  </div>
</body>
</html>
      `.trim()

      // Envoyer a Sandra ET Michel
      const recipients = [
        'perception@solutionargentrapide.ca',
        'mrosa@solutionargentrapide.ca'
      ]

      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: 'SAR Contact <noreply@solutionargentrapide.ca>',
          to: recipients,
          reply_to: contactMethod === 'email' ? contact : undefined,
          subject: `📬 Nouveau message - ${reference ? '#' + reference : 'Site web'}`,
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
                  <td style="background: linear-gradient(135deg, #00874e 0%, #005a34 100%); padding: 20px 40px; border-radius: 12px;">
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
                  <td style="background: linear-gradient(135deg, #00874e 0%, #005a34 100%); padding: 35px 40px; border-radius: 16px 16px 0 0; text-align: center;">
                    <div style="width: 70px; height: 70px; background: rgba(255,255,255,0.2); border-radius: 50%; margin: 0 auto 15px; display: flex; align-items: center; justify-content: center;">
                      <span style="font-size: 36px;">✓</span>
                    </div>
                    <h1 style="margin: 0; color: #ffffff; font-size: 26px; font-weight: 700;">Demande bien recue!</h1>
                    <p style="margin: 10px 0 0; color: rgba(255,255,255,0.9); font-size: 15px;">Nous traitons votre demande avec attention</p>
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
                      Nous avons bien recu votre demande et nous vous remercions de votre confiance.
                      <strong>Un membre de notre equipe vous contactera dans les plus brefs delais</strong>,
                      generalement dans les <strong>24 a 48 heures ouvrables</strong>.
                    </p>

                    <!-- What happens next -->
                    <table role="presentation" style="width: 100%; border-collapse: collapse; margin: 30px 0; background: #fafafa; border-radius: 12px;">
                      <tr>
                        <td style="padding: 25px;">
                          <p style="margin: 0 0 15px; color: #111827; font-size: 15px; font-weight: 700;">📋 Prochaines etapes:</p>
                          <table role="presentation" style="width: 100%; border-collapse: collapse;">
                            <tr>
                              <td style="padding: 8px 0; color: #4b5563; font-size: 14px; line-height: 1.6;">
                                <span style="color: #00874e; font-weight: 700; margin-right: 10px;">1.</span>
                                Notre equipe analyse votre demande
                              </td>
                            </tr>
                            <tr>
                              <td style="padding: 8px 0; color: #4b5563; font-size: 14px; line-height: 1.6;">
                                <span style="color: #00874e; font-weight: 700; margin-right: 10px;">2.</span>
                                Nous vous contactons par telephone ou courriel
                              </td>
                            </tr>
                            <tr>
                              <td style="padding: 8px 0; color: #4b5563; font-size: 14px; line-height: 1.6;">
                                <span style="color: #00874e; font-weight: 700; margin-right: 10px;">3.</span>
                                Nous trouvons ensemble la meilleure solution
                              </td>
                            </tr>
                          </table>
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

                    <!-- Contact Info -->
                    <table role="presentation" style="width: 100%; border-collapse: collapse; margin-top: 30px;">
                      <tr>
                        <td style="border-top: 1px solid #e5e7eb; padding-top: 25px;">
                          <p style="margin: 0 0 15px; color: #6b7280; font-size: 14px;">
                            <strong style="color: #374151;">Une question urgente?</strong> Contactez-nous directement:
                          </p>
                          <table role="presentation" style="border-collapse: collapse;">
                            <tr>
                              <td style="padding: 8px 0;">
                                <a href="tel:+18889001516" style="color: #00874e; text-decoration: none; font-size: 15px; font-weight: 600;">
                                  📞 1-888-900-1516
                                </a>
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
    console.log('=== CONTACT (DEV MODE) ===')
    console.log('To: perception@solutionargentrapide.ca, mrosa@solutionargentrapide.ca')
    console.log('Reference:', reference)
    console.log('Message:', message)
    console.log('Contact:', contact)
    console.log('==========================')

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
