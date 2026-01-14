import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { webhookId } = await request.json()

    if (!webhookId) {
      return NextResponse.json(
        { error: 'webhookId required' },
        { status: 400 }
      )
    }

    // Récupérer le webhook
    const supabase = getSupabase()
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database unavailable' },
        { status: 500 }
      )
    }

    const { data: webhook, error: fetchError } = await supabase
      .from('vopay_webhook_logs')
      .select('*')
      .eq('id', webhookId)
      .single()

    if (fetchError || !webhook) {
      return NextResponse.json(
        { error: 'Webhook not found' },
        { status: 404 }
      )
    }

    // Vérifier que c'est bien un failed
    if (webhook.status !== 'failed') {
      return NextResponse.json(
        { error: 'Only failed transactions can be sent as alerts' },
        { status: 400 }
      )
    }

    // Envoyer l'email via Resend
    const resendApiKey = process.env.RESEND_API_KEY

    if (!resendApiKey) {
      console.error('RESEND_API_KEY not configured')
      return NextResponse.json(
        { error: 'Email service not configured' },
        { status: 500 }
      )
    }

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #dc2626; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
            .footer { background: #f3f4f6; padding: 15px; text-align: center; font-size: 12px; color: #6b7280; border-radius: 0 0 8px 8px; }
            .alert-box { background: #fee2e2; border-left: 4px solid #dc2626; padding: 15px; margin: 15px 0; }
            .info-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
            .label { font-weight: bold; color: #374151; }
            .value { color: #6b7280; }
            .btn { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0;">⚠️ Transaction VoPay Échouée</h1>
            </div>

            <div class="content">
              <div class="alert-box">
                <strong>ALERTE:</strong> Une transaction VoPay a échoué et nécessite votre attention.
              </div>

              <h2>Détails de la Transaction</h2>

              <div class="info-row">
                <span class="label">Transaction ID:</span>
                <span class="value">${webhook.transaction_id}</span>
              </div>

              <div class="info-row">
                <span class="label">Type:</span>
                <span class="value">${webhook.transaction_type}</span>
              </div>

              <div class="info-row">
                <span class="label">Montant:</span>
                <span class="value">${webhook.transaction_amount.toFixed(2)} ${webhook.currency}</span>
              </div>

              <div class="info-row">
                <span class="label">Statut:</span>
                <span class="value" style="color: #dc2626; font-weight: bold;">ÉCHOUÉE</span>
              </div>

              <div class="info-row">
                <span class="label">Raison:</span>
                <span class="value" style="color: #dc2626;">${webhook.failure_reason || 'Non spécifiée'}</span>
              </div>

              <div class="info-row">
                <span class="label">Environnement:</span>
                <span class="value">${webhook.environment}</span>
              </div>

              <div class="info-row">
                <span class="label">Date de réception:</span>
                <span class="value">${new Date(webhook.received_at).toLocaleString('fr-CA')}</span>
              </div>

              <h3>Actions Recommandées</h3>
              <ul>
                <li>Vérifier le solde du compte VoPay</li>
                <li>Contacter le client si nécessaire</li>
                <li>Vérifier les informations bancaires</li>
                <li>Planifier une nouvelle tentative si approprié</li>
              </ul>

              <a href="https://admin.solutionargentrapide.ca/webhooks" class="btn">Voir dans le Dashboard</a>
            </div>

            <div class="footer">
              <p>Solution Argent Rapide INC - Système de Notifications Automatiques</p>
              <p>Cet email a été envoyé automatiquement. Ne pas répondre.</p>
            </div>
          </div>
        </body>
      </html>
    `

    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'VoPay Alerts <alerts@solutionargentrapide.ca>',
        to: ['info@solutionargentrapide.ca', 'service@solutionargentrapide.ca'],
        subject: `🚨 Transaction VoPay Échouée - ${webhook.transaction_id}`,
        html: emailHtml
      })
    })

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text()
      console.error('Resend API error:', errorText)
      return NextResponse.json(
        { error: 'Failed to send email', details: errorText },
        { status: 500 }
      )
    }

    const emailResult = await emailResponse.json()

    // Enregistrer l'envoi dans les logs (optionnel)
    // TODO: Implémenter le logging si nécessaire

    return NextResponse.json({
      success: true,
      message: 'Alert email sent successfully',
      emailId: emailResult.id
    })
  } catch (error) {
    console.error('Error in /api/admin/webhooks/send-alert:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
