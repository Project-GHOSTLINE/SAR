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
      ? `Autre question: ${questionAutre}`
      : question

    // Email content
    const emailContent = `
NOUVELLE DEMANDE - ANALYSE ET SUIVI

De: ${nom}
Email: ${email}
Telephone: ${telephone}

Question: ${questionComplete}

---
Envoye depuis le site solutionargentrapide.ca
    `.trim()

    // Option 1: Utiliser Resend (recommande)
    if (process.env.RESEND_API_KEY) {
      const resendResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: 'Solution Argent Rapide <noreply@solutionargentrapide.ca>',
          to: 'mrosa@solutionargentrapide.ca',
          reply_to: email,
          subject: `[Analyse] ${question} - ${nom}`,
          text: emailContent
        })
      })

      if (!resendResponse.ok) {
        const error = await resendResponse.text()
        console.error('Resend error:', error)
        throw new Error('Erreur envoi email')
      }

      return NextResponse.json({ success: true, method: 'resend' })
    }

    // Option 2: Utiliser SMTP avec Nodemailer
    if (process.env.SMTP_HOST) {
      const nodemailer = require('nodemailer')

      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      })

      await transporter.sendMail({
        from: process.env.SMTP_FROM || 'noreply@solutionargentrapide.ca',
        to: 'mrosa@solutionargentrapide.ca',
        replyTo: email,
        subject: `[Analyse] ${question} - ${nom}`,
        text: emailContent
      })

      return NextResponse.json({ success: true, method: 'smtp' })
    }

    // Option 3: Stocker dans Supabase si pas de config email
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
          destinataire: 'mrosa@solutionargentrapide.ca',
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
    console.log('To: mrosa@solutionargentrapide.ca')
    console.log(emailContent)
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
