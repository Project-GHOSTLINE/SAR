#!/usr/bin/env node

/**
 * PHASE 2: Créer Clients et Lier Orphelins
 * Date: 2026-01-22
 * Risk: MEDIUM
 */

const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = 'https://dllyzfuqjzuhvshrlmuq.supabase.co'
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRsbHl6ZnVxanp1aHZzaHJsbXVxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTk5NTk4MSwiZXhwIjoyMDgxNTcxOTgxfQ.Qg5eQwDxeAtTDXplNkQZa4hOp_dSMBIu_DKbuquryFo'

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

function normalizeEmail(email) {
  if (!email) return null
  return email.toLowerCase().trim()
}

function normalizePhone(phone) {
  if (!phone) return null
  return phone.replace(/[^0-9]/g, '')
}

async function extractUniqueIdentities() {
  console.log('🔍 Extraction des identités uniques...')

  const identities = new Map() // key: email ou phone, value: { email, phone, first_name, last_name, sources }

  // 1. Depuis loan_applications
  const { data: applications } = await supabase
    .from('loan_applications')
    .select('courriel, telephone, prenom, nom, client_id')
    .is('client_id', null)

  console.log(`  📋 loan_applications: ${applications?.length || 0} orphelins`)

  applications?.forEach(app => {
    const email = normalizeEmail(app.courriel)
    const phone = normalizePhone(app.telephone)
    const key = email || phone

    if (key && !identities.has(key)) {
      identities.set(key, {
        primary_email: email,
        primary_phone: phone,
        first_name: app.prenom,
        last_name: app.nom,
        sources: ['loan_application']
      })
    } else if (key && identities.has(key)) {
      identities.get(key).sources.push('loan_application')
    }
  })

  // 2. Depuis contact_messages
  const { data: messages } = await supabase
    .from('contact_messages')
    .select('email, telephone, nom, client_id')
    .is('client_id', null)

  console.log(`  📧 contact_messages: ${messages?.length || 0} orphelins`)

  messages?.forEach(msg => {
    const email = normalizeEmail(msg.email)
    const phone = normalizePhone(msg.telephone)
    const key = email || phone

    if (key && !identities.has(key)) {
      // Essayer de split le nom en first_name / last_name
      const nameParts = msg.nom?.split(' ') || []
      identities.set(key, {
        primary_email: email,
        primary_phone: phone,
        first_name: nameParts[0] || null,
        last_name: nameParts.slice(1).join(' ') || null,
        sources: ['contact_message']
      })
    } else if (key && identities.has(key)) {
      identities.get(key).sources.push('contact_message')
    }
  })

  // 3. Depuis vopay_objects payload
  const { data: vopay } = await supabase
    .from('vopay_objects')
    .select('payload, client_id')
    .is('client_id', null)

  console.log(`  💰 vopay_objects: ${vopay?.length || 0} orphelins`)

  vopay?.forEach(vo => {
    const payload = vo.payload || {}
    const email = normalizeEmail(payload.Email || payload.email)
    const phone = normalizePhone(payload.Phone || payload.phone)
    const key = email || phone

    if (key && !identities.has(key)) {
      identities.set(key, {
        primary_email: email,
        primary_phone: phone,
        first_name: payload.FirstName || payload.first_name || null,
        last_name: payload.LastName || payload.last_name || null,
        sources: ['vopay']
      })
    } else if (key && identities.has(key)) {
      identities.get(key).sources.push('vopay')
    }
  })

  console.log(`✅ ${identities.size} identités uniques trouvées\n`)

  return Array.from(identities.values())
}

async function createClients(identities) {
  console.log('👥 Création des clients...')

  const created = []
  const errors = []

  for (const identity of identities) {
    try {
      const { data, error } = await supabase
        .from('clients')
        .insert({
          primary_email: identity.primary_email,
          primary_phone: identity.primary_phone,
          first_name: identity.first_name,
          last_name: identity.last_name,
          status: 'active',
          confidence_score: 90, // Score initial raisonnable
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) {
        // Si c'est un duplicate key, c'est OK - le client existe déjà
        if (error.code === '23505') {
          console.log(`  ⚠️  Client existe déjà: ${identity.primary_email || identity.primary_phone}`)
        } else {
          errors.push({ identity, error: error.message })
          console.log(`  ❌ Erreur: ${error.message}`)
        }
      } else {
        created.push(data)
        console.log(`  ✅ Créé: ${data.primary_email || data.primary_phone} (${data.id})`)
      }
    } catch (err) {
      errors.push({ identity, error: err.message })
      console.log(`  ❌ Exception: ${err.message}`)
    }
  }

  console.log(`✅ ${created.length} clients créés, ${errors.length} erreurs\n`)

  return { created, errors }
}

async function linkOrphans() {
  console.log('🔗 Liaison des orphelins aux clients...')

  const results = {
    loan_applications: 0,
    contact_messages: 0,
    vopay_objects: 0
  }

  // 1. Lier loan_applications
  console.log('  📋 Liaison loan_applications...')
  const { data: applications } = await supabase
    .from('loan_applications')
    .select('id, courriel, telephone')
    .is('client_id', null)

  for (const app of applications || []) {
    const email = normalizeEmail(app.courriel)
    const phone = normalizePhone(app.telephone)

    // Chercher le client par email ou phone
    let client = null

    if (email) {
      const { data } = await supabase
        .from('clients')
        .select('id')
        .eq('primary_email', email)
        .single()
      client = data
    }

    if (!client && phone) {
      const { data } = await supabase
        .from('clients')
        .select('id')
        .eq('primary_phone', phone)
        .single()
      client = data
    }

    if (client) {
      await supabase
        .from('loan_applications')
        .update({ client_id: client.id })
        .eq('id', app.id)
      results.loan_applications++
    }
  }

  // 2. Lier contact_messages
  console.log('  📧 Liaison contact_messages...')
  const { data: messages } = await supabase
    .from('contact_messages')
    .select('id, email, telephone')
    .is('client_id', null)

  for (const msg of messages || []) {
    const email = normalizeEmail(msg.email)
    const phone = normalizePhone(msg.telephone)

    let client = null

    if (email) {
      const { data } = await supabase
        .from('clients')
        .select('id')
        .eq('primary_email', email)
        .single()
      client = data
    }

    if (!client && phone) {
      const { data } = await supabase
        .from('clients')
        .select('id')
        .eq('primary_phone', phone)
        .single()
      client = data
    }

    if (client) {
      await supabase
        .from('contact_messages')
        .update({ client_id: client.id })
        .eq('id', msg.id)
      results.contact_messages++
    }
  }

  // 3. Lier vopay_objects
  console.log('  💰 Liaison vopay_objects...')
  const { data: vopay } = await supabase
    .from('vopay_objects')
    .select('id, payload')
    .is('client_id', null)

  for (const vo of vopay || []) {
    const payload = vo.payload || {}
    const email = normalizeEmail(payload.Email || payload.email)
    const phone = normalizePhone(payload.Phone || payload.phone)

    let client = null

    if (email) {
      const { data } = await supabase
        .from('clients')
        .select('id')
        .eq('primary_email', email)
        .single()
      client = data
    }

    if (!client && phone) {
      const { data } = await supabase
        .from('clients')
        .select('id')
        .eq('primary_phone', phone)
        .single()
      client = data
    }

    if (client) {
      await supabase
        .from('vopay_objects')
        .update({ client_id: client.id })
        .eq('id', vo.id)
      results.vopay_objects++
    }
  }

  console.log(`✅ Orphelins liés:`)
  console.log(`  - loan_applications: ${results.loan_applications}`)
  console.log(`  - contact_messages: ${results.contact_messages}`)
  console.log(`  - vopay_objects: ${results.vopay_objects}`)
  console.log('')

  return results
}

async function verifyResults() {
  console.log('🔍 Vérification finale...')

  const { count: totalClients } = await supabase
    .from('clients')
    .select('*', { count: 'exact', head: true })

  const { count: orphanApps } = await supabase
    .from('loan_applications')
    .select('*', { count: 'exact', head: true })
    .is('client_id', null)

  const { count: orphanMsgs } = await supabase
    .from('contact_messages')
    .select('*', { count: 'exact', head: true })
    .is('client_id', null)

  const { count: orphanVopay } = await supabase
    .from('vopay_objects')
    .select('*', { count: 'exact', head: true })
    .is('client_id', null)

  console.log('📊 RÉSULTATS FINAUX')
  console.log('=========================================')
  console.log(`Total clients: ${totalClients}`)
  console.log(`Orphelins restants:`)
  console.log(`  - loan_applications: ${orphanApps}`)
  console.log(`  - contact_messages: ${orphanMsgs}`)
  console.log(`  - vopay_objects: ${orphanVopay}`)
  console.log(`  - TOTAL: ${orphanApps + orphanMsgs + orphanVopay}`)
  console.log('')

  if (orphanApps + orphanMsgs + orphanVopay === 0) {
    console.log('🎉 SUCCÈS! Tous les orphelins ont été liés!')
    return true
  } else {
    console.log('⚠️  Il reste des orphelins (normal si pas d\'email/phone)')
    return false
  }
}

async function main() {
  console.log('🟠 PHASE 2: CRÉER CLIENTS ET LIER ORPHELINS')
  console.log('=========================================')
  console.log(`Date: ${new Date().toISOString()}`)
  console.log('')

  try {
    // 1. Extraire identités uniques
    const identities = await extractUniqueIdentities()

    // 2. Créer les clients
    const { created, errors } = await createClients(identities)

    if (errors.length > 0) {
      console.log('⚠️  Erreurs lors de la création:')
      errors.forEach(e => console.log(`  - ${e.error}`))
      console.log('')
    }

    // 3. Lier les orphelins
    const linkResults = await linkOrphans()

    // 4. Vérifier résultats
    const success = await verifyResults()

    console.log('🎉 PHASE 2 TERMINÉE!')
    console.log('')

    process.exit(success ? 0 : 1)
  } catch (err) {
    console.error('❌ ERREUR FATALE:', err.message)
    console.error(err.stack)
    process.exit(1)
  }
}

main()
