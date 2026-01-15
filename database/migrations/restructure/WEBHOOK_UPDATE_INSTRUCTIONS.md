# Instructions: Mise à Jour Webhook VoPay

**Date:** 2026-01-15
**Fichier à modifier:** `src/app/api/webhooks/vopay/route.ts`

---

## Changements Requis

### 1. Ajouter insertion dans `vopay_objects` (après ligne 115)

**Localisation:** Après l'insertion dans `vopay_webhook_logs`

**Code actuel (lignes 100-116):**
```typescript
// 5. Enregistrer dans la base de données
const { data, error } = await supabase
  .from('vopay_webhook_logs')
  .insert({
    transaction_id: payload.TransactionID,
    transaction_type: payload.TransactionType,
    transaction_amount: parseFloat(payload.TransactionAmount),
    status: payload.Status.toLowerCase(),
    failure_reason: payload.FailureReason || null,
    environment: payload.Environment,
    validation_key: payload.ValidationKey,
    is_validated: true,
    raw_payload: payload,
    updated_at: payload.UpdatedAt,
    processed_at: new Date().toISOString(),
  })
  .select()
  .single()
```

**Code à ajouter (APRÈS ligne 116):**
```typescript
// 5.5. Insérer AUSSI dans vopay_objects (table normalisée)
try {
  const { data: voData, error: voError } = await supabase
    .from('vopay_objects')
    .insert({
      object_type: payload.TransactionType || 'unknown',
      vopay_id: payload.TransactionID,
      status: payload.Status?.toLowerCase() || null,
      amount: parseFloat(payload.TransactionAmount) || null,
      payload: payload,
      occurred_at: payload.UpdatedAt || new Date().toISOString(),
      raw_log_id: data.id, // Lien vers vopay_webhook_logs
    })
    .select()
    .single()

  if (voError) {
    // Log l'erreur mais ne bloque pas (vopay_webhook_logs déjà créé)
    console.warn('[VoPay Webhook] vopay_objects insertion warning:', voError.message)
  } else {
    console.log('[VoPay Webhook] vopay_objects created:', voData.id)
  }
} catch (voInsertError) {
  // Erreur non bloquante
  console.warn('[VoPay Webhook] vopay_objects insert failed:', voInsertError)
}
```

---

### 2. Ajouter matching automatique (OPTIONNEL mais recommandé)

**Après l'insertion dans `vopay_objects`, ajouter:**

```typescript
// 5.6. Tenter matching automatique client_id (si email présent)
if (voData?.id && payload.email) {
  try {
    const { data: clientData } = await supabase
      .from('clients')
      .select('id')
      .ilike('primary_email', payload.email.trim())
      .single()

    if (clientData?.id) {
      await supabase
        .from('vopay_objects')
        .update({ client_id: clientData.id })
        .eq('id', voData.id)

      console.log('[VoPay Webhook] Auto-matched client:', clientData.id)
    }
  } catch (matchError) {
    // Matching échoué, pas grave (sera fait en batch)
    console.debug('[VoPay Webhook] Client matching skipped')
  }
}

// 5.7. Tenter matching automatique loan_id (si référence présente)
if (voData?.id && payload.ClientReferenceNumber) {
  try {
    const reference = payload.ClientReferenceNumber.toUpperCase()

    // Chercher SAR-LP-XXXXX dans la référence
    const sarMatch = reference.match(/SAR-LP-\d+/)

    if (sarMatch) {
      const { data: loanData } = await supabase
        .from('loans')
        .select('id')
        .eq('application_id', (
          await supabase
            .from('loan_applications')
            .select('id')
            .eq('reference', sarMatch[0])
            .single()
        ).data?.id)
        .single()

      if (loanData?.id) {
        await supabase
          .from('vopay_objects')
          .update({ loan_id: loanData.id })
          .eq('id', voData.id)

        console.log('[VoPay Webhook] Auto-matched loan:', loanData.id)
      }
    }
  } catch (matchError) {
    // Matching échoué, pas grave (sera fait en batch)
    console.debug('[VoPay Webhook] Loan matching skipped')
  }
}
```

---

### 3. Mettre à jour les actions selon statut (lignes 128-145)

**Code actuel:**
```typescript
// 6. Traitement selon le statut
switch (payload.Status.toLowerCase()) {
  case 'successful':
    // TODO: Mettre à jour le statut dans la table des prêts/remboursements
    break;

  case 'failed':
    // TODO: Notifier l'admin et le client
    break;

  // ...
}
```

**Code amélioré:**
```typescript
// 6. Traitement selon le statut
switch (payload.Status.toLowerCase()) {
  case 'successful':
    // Mettre à jour payment_installments si loan lié
    if (voData?.loan_id) {
      try {
        // Trouver l'installment correspondant (par montant + date proche)
        const { data: installments } = await supabase
          .from('payment_installments')
          .select('id, schedule_version_id')
          .eq('schedule_version_id', (
            await supabase
              .from('payment_schedule_versions')
              .select('id')
              .eq('loan_id', voData.loan_id)
              .order('version', { ascending: false })
              .limit(1)
              .single()
          ).data?.id)
          .eq('status', 'scheduled')
          .gte('due_date', new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0])
          .lte('due_date', new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0])
          .limit(1)

        if (installments?.[0]) {
          await supabase
            .from('payment_installments')
            .update({
              status: 'paid',
              paid_at: payload.UpdatedAt || new Date().toISOString()
            })
            .eq('id', installments[0].id)

          console.log('[VoPay Webhook] Marked installment as paid:', installments[0].id)
        }

        // Créer payment_event
        await supabase
          .from('payment_events')
          .insert({
            loan_id: voData.loan_id,
            event_type: 'PAYMENT_RECEIVED',
            amount: parseFloat(payload.TransactionAmount),
            effective_date: new Date().toISOString().split('T')[0],
            payload: {
              vopay_transaction_id: payload.TransactionID,
              vopay_object_id: voData.id,
              source: 'vopay_webhook'
            }
          })
      } catch (updateError) {
        console.error('[VoPay Webhook] Payment update failed:', updateError)
      }
    }
    break;

  case 'failed':
    // Créer payment_event NSF si loan lié
    if (voData?.loan_id) {
      try {
        await supabase
          .from('payment_events')
          .insert({
            loan_id: voData.loan_id,
            event_type: 'NSF',
            amount: parseFloat(payload.TransactionAmount),
            effective_date: new Date().toISOString().split('T')[0],
            payload: {
              vopay_transaction_id: payload.TransactionID,
              vopay_object_id: voData.id,
              failure_reason: payload.FailureReason,
              source: 'vopay_webhook'
            }
          })

        console.log('[VoPay Webhook] NSF event created for loan:', voData.loan_id)

        // TODO: Envoyer notification au client
        // TODO: Notifier l'admin
      } catch (nsfError) {
        console.error('[VoPay Webhook] NSF event creation failed:', nsfError)
      }
    }
    break;

  case 'pending':
  case 'in progress':
    // Rien à faire
    break;

  case 'cancelled':
    // Marquer comme skipped si applicable
    break;

  default:
    console.warn('[VoPay Webhook] Unknown status:', payload.Status)
}
```

---

## Résumé des Changements

### ✅ Ajouts dans `vopay_webhook_logs` (déjà fait)
- Enregistre le webhook brut (RAW)

### ✅ Ajouts dans `vopay_objects` (nouveau)
- Données normalisées
- Lien vers `raw_log_id`

### ✅ Matching automatique (nouveau)
- Email → `client_id`
- Référence → `loan_id`

### ✅ Actions sur paiement réussi (nouveau)
- Marquer `payment_installments` comme `paid`
- Créer `payment_events` type `PAYMENT_RECEIVED`

### ✅ Actions sur paiement échoué (nouveau)
- Créer `payment_events` type `NSF`
- Logger failure_reason
- (TODO: Notifications)

---

## Ordre d'Exécution

### 1. Exécuter migrations SQL dans Supabase
```bash
# Phase 4 - Créer vopay_objects
040_create_vopay_objects.sql

# Phase 4 - Backfill données existantes
041_backfill_vopay_objects.sql

# Phase 4 - Matching intelligent
042_link_vopay_to_clients_loans.sql
```

### 2. Mettre à jour le code TypeScript
```bash
# Éditer le fichier webhook
src/app/api/webhooks/vopay/route.ts

# Appliquer les changements ci-dessus
```

### 3. Tester
```bash
# 1. Tester avec un webhook test (Sandbox VoPay)
curl -X POST https://yourdomain.com/api/webhooks/vopay \
  -H "Content-Type: application/json" \
  -d '{
    "TransactionID": "TEST123",
    "TransactionType": "EFT",
    "TransactionAmount": "100.00",
    "Status": "successful",
    "UpdatedAt": "2026-01-15T12:00:00Z",
    "ValidationKey": "...",
    "Environment": "Sandbox"
  }'

# 2. Vérifier dans Supabase:
# - vopay_webhook_logs (1 nouvelle ligne)
# - vopay_objects (1 nouvelle ligne)
# - vopay_objects.client_id rempli si email match
# - vopay_objects.loan_id rempli si référence match
```

---

## Notes Importantes

### Gestion des Erreurs
- Insertion dans `vopay_webhook_logs` = **CRITIQUE** (doit réussir)
- Insertion dans `vopay_objects` = **NON-BLOQUANTE** (log warning si échec)
- Matching automatique = **BEST EFFORT** (pas grave si échoue)
- Actions sur payments = **BEST EFFORT** (log error si échoue)

### Performance
- Matching automatique est RAPIDE (1-2 queries simples)
- Si trop lent, désactiver et faire en batch via cron
- Indexes déjà créés par 042_link_vopay_to_clients_loans.sql

### Sécurité
- Validation signature VoPay déjà présente (ligne 73-86)
- Ne JAMAIS skip la validation
- Logger tous les échecs de validation

---

**Dernière mise à jour:** 2026-01-15
**Maintenu par:** Claude Sonnet 4.5
**Statut:** ✅ Instructions complètes - Prêt pour implémentation
