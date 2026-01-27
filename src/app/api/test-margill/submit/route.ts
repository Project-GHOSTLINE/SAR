import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * POST /api/test-margill/submit
 *
 * Endpoint de test pour transformer les données du formulaire
 * en payload JSON Margill et valider les formats
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // ========================================================================
    // TRANSFORMATION EN FORMAT MARGILL
    // ========================================================================

    // Construire le nom complet
    const fullName = `${body.first_name} ${body.last_name}`.trim()

    // Formater les téléphones
    const phone = `${body.phone_1}-${body.phone_2}-${body.phone_3}`
    const phoneWork = body.phone_work_1 && body.phone_work_2 && body.phone_work_3
      ? `${body.phone_work_1}-${body.phone_work_2}-${body.phone_work_3}`
      : ''

    // Formater les dates (YYYY-MM-DD)
    const birthday = body.birth_year && body.birth_month && body.birth_day
      ? `${body.birth_year}-${body.birth_month}-${body.birth_day}`
      : ''

    const dateOfHire = body.hire_year && body.hire_month && body.hire_day
      ? `${body.hire_year}-${body.hire_month}-${body.hire_day}`
      : ''

    // Déterminer la langue (basé sur l'interface ou un champ)
    // Pour l'instant hardcodé à "Francais" (sans accent comme requis!)
    const langue = 'Francais' // IMPORTANT: Sans accent!

    // Construire le payload Margill EXACT selon le document
    const margillPayload = {
      // Origin (OBLIGATOIRE)
      origin: 'argentrapide',

      // Langue (OBLIGATOIRE)
      q_langue: langue,
      langue: langue,

      // Montant (OBLIGATOIRE - sans décimale)
      q_loan_amount_requested: Math.floor(parseFloat(body.loan_amount) || 500).toString(),
      loan_amount_requested: Math.floor(parseFloat(body.loan_amount) || 500).toString(),

      // Identité (OBLIGATOIRE)
      q_first_name: body.first_name,
      first_name: body.first_name,

      q_last_name: body.last_name,
      last_name: body.last_name,

      q_full_name: fullName,
      full_name: fullName,

      q_email: body.email,
      email: body.email,

      q_phone: phone,
      phone: phone,

      // Téléphone travail (optionnel)
      q_second_phone: phoneWork,
      second_phone: phoneWork,

      // Date de naissance (optionnel)
      q_birthday: birthday,
      birthday: birthday,

      // Citoyen/Résident (OBLIGATOIRE)
      q_canadian_or_permanent_resident: body.canadian_resident,
      canadian_or_permanent_resident: body.canadian_resident,

      // Adresse (optionnel mais recommandé - 5 champs)
      q_current_address1: body.address_line1 || '',
      current_address_field1: body.address_line1 || '',

      q_current_address2: body.address_line2 || '',
      current_address_field2: body.address_line2 || '',

      q_current_address3: body.address_city || '',
      current_address_field3: body.address_city || '',

      q_current_address4: body.address_province || '',
      current_address_field4: body.address_province || '',

      q_current_address5: body.address_postal || '',
      current_address_field5: body.address_postal || '',

      // Informations financières (optionnel)
      q_income_source: body.income_source || '',
      income_source: body.income_source || '',

      q_monthly_income: body.monthly_income || '',
      monthly_income: body.monthly_income || '',

      q_time_at_current_job: body.time_at_job || '',
      time_at_current_job: body.time_at_job || '',

      q_number_of_loans: body.number_of_loans || '',
      number_of_loans: body.number_of_loans || '',

      q_stop_payments_nsf: body.stop_payments_nsf || '',
      stop_payments_nsf: body.stop_payments_nsf || '',

      q_consumer_proposal_or_bankrupt: body.consumer_proposal || '',
      consumer_proposal_or_bankrupt: body.consumer_proposal || '',

      q_education_level: body.education_level || '',
      education_level: body.education_level || '',

      q_credit_score: body.credit_score || '',
      credit_score: body.credit_score || '',

      // Raison du prêt (optionnel)
      q_reason_for_loan: body.reason_for_loan || '',
      reason_for_loan: body.reason_for_loan || '',

      // Emploi (optionnel)
      q_employer_name: body.employer_name || '',
      employer_name: body.employer_name || '',

      q_date_of_hire: dateOfHire,
      date_of_hire: dateOfHire,

      // Marketing (optionnel)
      q_how_did_you_hear_about_us: body.how_did_you_hear || '',
      how_did_you_hear_about_us: body.how_did_you_hear || '',

      // NAS (optionnel - très sensible!)
      q_sin: body.sin || '',
      sin: body.sin || ''
    }

    // ========================================================================
    // VALIDATION DES DONNÉES
    // ========================================================================

    const validation = []

    // 1. Champs obligatoires
    if (!body.first_name) {
      validation.push({ field: 'first_name', valid: false, message: '❌ Prénom obligatoire' })
    } else {
      validation.push({ field: 'first_name', valid: true, message: '✅ Prénom valide' })
    }

    if (!body.last_name) {
      validation.push({ field: 'last_name', valid: false, message: '❌ Nom obligatoire' })
    } else {
      validation.push({ field: 'last_name', valid: true, message: '✅ Nom valide' })
    }

    if (!body.email || !body.email.includes('@')) {
      validation.push({ field: 'email', valid: false, message: '❌ Email invalide' })
    } else if (body.email !== body.email_confirm) {
      validation.push({ field: 'email', valid: false, message: '❌ Les emails ne correspondent pas' })
    } else {
      validation.push({ field: 'email', valid: true, message: '✅ Email valide et confirmé' })
    }

    if (!body.canadian_resident) {
      validation.push({ field: 'canadian_resident', valid: false, message: '❌ Statut citoyen obligatoire' })
    } else {
      validation.push({ field: 'canadian_resident', valid: true, message: '✅ Statut citoyen: ' + body.canadian_resident })
    }

    // 2. Validation du téléphone
    if (!body.phone_1 || !body.phone_2 || !body.phone_3) {
      validation.push({ field: 'phone', valid: false, message: '❌ Téléphone incomplet' })
    } else if (body.phone_1.length !== 3 || body.phone_2.length !== 3 || body.phone_3.length !== 4) {
      validation.push({ field: 'phone', valid: false, message: '⚠️ Format téléphone incorrect (XXX-XXX-XXXX)' })
    } else {
      validation.push({ field: 'phone', valid: true, message: `✅ Téléphone: ${phone}` })
    }

    // 3. Validation du montant
    const amount = parseFloat(body.loan_amount)
    if (!amount || amount < 300 || amount > 6000) {
      validation.push({ field: 'loan_amount', valid: false, message: '❌ Montant invalide (300-6000$)' })
    } else if (amount % 1 !== 0) {
      validation.push({ field: 'loan_amount', valid: false, message: '⚠️ Le montant ne doit pas avoir de décimales' })
    } else {
      validation.push({ field: 'loan_amount', valid: true, message: `✅ Montant: ${amount}$ (sans décimale)` })
    }

    // 4. Validation de la langue
    if (langue !== 'Francais' && langue !== 'Anglais') {
      validation.push({ field: 'langue', valid: false, message: '❌ Langue invalide (doit être "Francais" ou "Anglais")' })
    } else {
      validation.push({ field: 'langue', valid: true, message: `✅ Langue: ${langue} (sans accent ✓)` })
    }

    // 5. Validation date de naissance
    if (birthday) {
      const birthDate = new Date(birthday)
      const today = new Date()
      const age = today.getFullYear() - birthDate.getFullYear()

      if (age < 18) {
        validation.push({ field: 'birthday', valid: false, message: '❌ Âge minimum 18 ans' })
      } else if (age > 100) {
        validation.push({ field: 'birthday', valid: false, message: '⚠️ Date de naissance suspecte' })
      } else {
        validation.push({ field: 'birthday', valid: true, message: `✅ Date de naissance: ${birthday} (${age} ans)` })
      }
    } else {
      validation.push({ field: 'birthday', valid: true, message: '⚠️ Date de naissance non fournie (optionnel)' })
    }

    // 6. Validation adresse
    if (body.address_line1 && body.address_city && body.address_province && body.address_postal) {
      validation.push({ field: 'address', valid: true, message: `✅ Adresse complète (5 champs)` })
    } else if (body.address_line1 || body.address_city || body.address_province) {
      validation.push({ field: 'address', valid: false, message: '⚠️ Adresse incomplète (fournir tous les champs ou aucun)' })
    } else {
      validation.push({ field: 'address', valid: true, message: '⚠️ Adresse non fournie (optionnel)' })
    }

    // 7. Vérification champs manquants du document
    const missingOptionalFields = []
    if (!body.monthly_income) missingOptionalFields.push('monthly_income')
    if (!body.education_level) missingOptionalFields.push('education_level')
    if (!body.credit_score) missingOptionalFields.push('credit_score')
    if (!body.sin) missingOptionalFields.push('sin')

    if (missingOptionalFields.length > 0) {
      validation.push({
        field: 'optional_fields',
        valid: true,
        message: `⚠️ Champs optionnels absents: ${missingOptionalFields.join(', ')} (vérifier avec Marc si requis)`
      })
    }

    // ========================================================================
    // STATISTIQUES DU PAYLOAD
    // ========================================================================

    const stats = {
      totalFields: Object.keys(margillPayload).length,
      filledFields: Object.values(margillPayload).filter(v => v !== '').length,
      emptyFields: Object.values(margillPayload).filter(v => v === '').length,
      payloadSize: JSON.stringify(margillPayload).length
    }

    // ========================================================================
    // RETOUR DE TEST
    // ========================================================================

    return NextResponse.json({
      success: true,
      message: 'Payload Margill généré avec succès',
      margillPayload,
      validation,
      stats,
      notes: [
        '⚠️ Ceci est un TEST - aucune donnée envoyée à Margill',
        '✅ Vérifiez le payload JSON ci-dessus',
        '📋 Validez les formats avec le document Margill',
        '🔒 IMPORTANT: "langue" doit être "Francais" sans accent',
        '💰 IMPORTANT: "loan_amount_requested" doit être un entier (pas de décimales)',
        '📞 IMPORTANT: Téléphone format XXX-XXX-XXXX',
        '📅 IMPORTANT: Dates format YYYY-MM-DD',
        '🏠 IMPORTANT: Adresse en 5 champs séparés'
      ]
    })

  } catch (error) {
    console.error('[Test Margill] Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Erreur lors du traitement',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
