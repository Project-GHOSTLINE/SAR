# 📊 ANALYSE COMPLÈTE DU SYSTÈME SAR

**Date:** 2026-01-15
**Branche:** feat/db-restructure-dossier-client
**Phases complétées:** P0-P3 (clients, communications, loans)
**Phase en cours:** P4 (VoPay normalisé)

---

## 🎯 OBJECTIF GLOBAL

Créer un système "dossier médical client" où:
1. **Un client = Une seule ligne** dans `clients` (table canonique)
2. **Toutes les tables pointent vers `clients.id`** via `client_id`
3. **Historique complet centralisé** (communications, prêts, paiements, VoPay)
4. **Matching intelligent** (email prioritaire, téléphone fallback)

---

## 📋 ARCHITECTURE COMPLÈTE (État Actuel)

### PHASE 0: Préparation ✅
**Statut:** Complétée (2026-01-14)

**Baseline avant restructuration:**
- `client_transactions`: 222,101 rows (LEDGER - INTOUCHABLE 🔒)
- `emails_envoyes`: 719 rows (READ-ONLY 🔒)
- `vopay_webhook_logs`: 998 rows (RAW - intact 🔒)
- `client_accounts`: 218 rows
- `loan_applications`: 0 rows
- `contact_messages`: 357 rows
- Total: **224,441 records** snapshot validé

---

### PHASE 1: Clients + client_id ✅
**Statut:** Complétée (2026-01-15 00:50)

**Fichiers exécutés:**
1. `010_011_VERIFIED.sql` - Structures + colonnes
2. `012_backfill_clients.sql` - Migration données
3. `013_add_performance_indexes.sql` - Optimisation

#### Table `clients` (Canonique)
```sql
CREATE TABLE public.clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identification
  primary_email text,
  primary_phone text,

  -- Identité
  first_name text,
  last_name text,
  dob date,

  -- Statut
  status text DEFAULT 'active',  -- active|merged|suspended|closed
  merged_into_client_id uuid REFERENCES clients(id),

  -- Qualité matching
  confidence_score integer DEFAULT 100 CHECK (confidence_score >= 0 AND confidence_score <= 100),

  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Index UNIQUE sur email (case-insensitive)
CREATE UNIQUE INDEX clients_primary_email_uniq
  ON clients (lower(primary_email))
  WHERE primary_email IS NOT NULL;

-- Index sur téléphone
CREATE INDEX clients_primary_phone_idx
  ON clients (primary_phone)
  WHERE primary_phone IS NOT NULL;

-- Index sur statut actif
CREATE INDEX clients_status_idx
  ON clients (status)
  WHERE status = 'active';

-- Index sur confidence_score faible (<80)
CREATE INDEX clients_confidence_idx
  ON clients (confidence_score)
  WHERE confidence_score < 80;
```

**Points clés:**
- Email = identifiant primaire (UNIQUE, case-insensitive)
- Phone = identifiant secondaire (fallback)
- `confidence_score` = qualité du matching (0-100)
  - <80 nécessite validation manuelle
- `merged_into_client_id` = gestion des doublons

#### Table `client_identity_aliases`
```sql
CREATE TABLE public.client_identity_aliases (
  id uuid PRIMARY KEY,
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE,

  identity_type text CHECK (identity_type IN ('email', 'phone')),
  value text NOT NULL,

  verified_at timestamptz,
  verified_by text,
  active boolean DEFAULT true,

  created_at timestamptz DEFAULT now(),
  deactivated_at timestamptz,
  notes text
);

CREATE INDEX client_identity_aliases_value_idx
  ON client_identity_aliases(lower(value))
  WHERE active = true;
```

**Utilité:**
- Historique des changements d'email/phone
- Traçabilité légale complète
- Détection d'emails partagés

#### Colonnes `client_id` ajoutées sur:
1. ✅ `loan_applications.client_id`
2. ✅ `client_accounts.client_id`
3. ✅ `client_analyses.client_id`
4. ✅ `contact_messages.client_id`
5. ✅ `support_tickets.client_id`

**Indexes créés:**
```sql
CREATE INDEX loan_applications_client_id_idx ON loan_applications(client_id);
CREATE INDEX client_accounts_client_id_idx ON client_accounts(client_id);
CREATE INDEX client_analyses_client_id_idx ON client_analyses(client_id);
CREATE INDEX contact_messages_client_id_idx ON contact_messages(client_id);
CREATE INDEX support_tickets_client_id_idx ON support_tickets(client_id);
```

**Logique de matching (backfill):**
```sql
-- 1. Email (prioritaire)
SELECT id FROM clients WHERE lower(primary_email) = lower(source_email)

-- 2. Phone (fallback si email absent/non trouvé)
SELECT id FROM clients WHERE primary_phone = source_phone
```

---

### PHASE 2: Communications Unifiées ✅
**Statut:** Complétée (2026-01-15 01:15)

**Fichiers exécutés:**
1. `020_create_communications.sql` - Tables
2. `021_migrate_emails_envoyes_to_communications_FIXED.sql` - Migration
3. `022_view_support_as_communications_FIXED.sql` - Vue support

#### Table `communications`
```sql
CREATE TABLE public.communications (
  id uuid PRIMARY KEY,
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,

  channel text NOT NULL,          -- email|sms|support|internal
  direction text NOT NULL,        -- inbound|outbound
  thread_key text NULL,

  from_addr text NULL,
  to_addrs jsonb NULL,
  cc_addrs jsonb NULL,

  subject text NULL,
  body_text text NULL,

  provider text NULL,
  provider_message_id text NULL,
  status text DEFAULT 'stored',

  occurred_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  metadata jsonb DEFAULT '{}'
);

-- Index UNIQUE sur provider + message_id
CREATE UNIQUE INDEX communications_provider_msg_uniq
  ON communications (provider, provider_message_id)
  WHERE provider IS NOT NULL AND provider_message_id IS NOT NULL;

-- Indexes performance
CREATE INDEX communications_client_id_idx ON communications(client_id);
CREATE INDEX communications_thread_key_idx ON communications(thread_key);
CREATE INDEX communications_occurred_at_idx ON communications(occurred_at);
```

#### Table `communication_attachments`
```sql
CREATE TABLE public.communication_attachments (
  id uuid PRIMARY KEY,
  communication_id uuid NOT NULL REFERENCES communications(id) ON DELETE CASCADE,

  storage_path text NOT NULL,
  file_name text NULL,
  file_size bigint NULL,
  mime_type text NULL,

  uploaded_at timestamptz DEFAULT now(),
  metadata jsonb DEFAULT '{}'
);

CREATE INDEX comm_attach_comm_id_idx ON communication_attachments(communication_id);
```

**Migration depuis `emails_envoyes`:**
```sql
INSERT INTO communications (client_id, channel, direction, from_addr, to_addrs, subject, body_text, provider, provider_message_id, status, occurred_at, metadata)
SELECT
  c.id as client_id,
  'email' as channel,
  'outbound' as direction,
  'noreply@solutionargentrapide.ca' as from_addr,
  jsonb_build_array(e.destinataire_email) as to_addrs,
  e.sujet as subject,
  e.corps_html as body_text,
  'resend' as provider,
  e.resend_email_id as provider_message_id,
  CASE
    WHEN e.statut_envoi = 'sent' THEN 'sent'
    WHEN e.statut_envoi = 'failed' THEN 'failed'
    ELSE 'stored'
  END as status,
  e.date_envoi as occurred_at,
  jsonb_build_object(
    'source_table', 'emails_envoyes',
    'original_id', e.id::text
  ) as metadata
FROM emails_envoyes e
JOIN clients c ON lower(c.primary_email) = lower(e.destinataire_email)
ON CONFLICT DO NOTHING;
```

**Vue support comme communications:**
```sql
CREATE OR REPLACE VIEW vw_support_as_communications AS
SELECT
  concat('support_', st.id::text) as id,
  st.client_id,
  'support' as channel,
  'inbound' as direction,
  st.id::text as thread_key,
  st.email as from_addr,
  NULL::jsonb as to_addrs,
  st.subject,
  st.message as body_text,
  'zendesk' as provider,
  NULL as provider_message_id,
  CASE
    WHEN st.status = 'resolved' THEN 'sent'
    ELSE 'stored'
  END as status,
  st.created_at as occurred_at,
  jsonb_build_object(
    'source_table', 'support_tickets',
    'original_id', st.id::text,
    'status', st.status,
    'priority', st.priority
  ) as metadata
FROM support_tickets st;
```

**Bénéfices:**
- ✅ Toutes les communications (email, SMS, support) dans UNE table
- ✅ Thread tracking avec `thread_key`
- ✅ Pièces jointes gérées proprement
- ✅ Historique complet par client
- ✅ `emails_envoyes` reste READ-ONLY (pas supprimée)

---

### PHASE 3: Loans + Payment Schedules ✅
**Statut:** Complétée (2026-01-15 01:30)

**Fichiers exécutés:**
1. `030_create_loans_and_payments.sql` - Tables
2. `031_backfill_loans_FIXED.sql` - Migration

#### Table `loans`
```sql
CREATE TABLE public.loans (
  id uuid PRIMARY KEY,
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  application_id uuid NULL REFERENCES loan_applications(id) ON DELETE SET NULL,
  account_id uuid NULL REFERENCES client_accounts(id) ON DELETE SET NULL,

  status text DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  metadata jsonb DEFAULT '{}'
);

CREATE INDEX loans_client_id_idx ON loans(client_id);
CREATE INDEX loans_account_id_idx ON loans(account_id);
```

**Points clés:**
- Lien vers `loan_applications` (demande initiale)
- Lien vers `client_accounts` (compte legacy Margill)
- `metadata` contient infos Margill/VoPay

#### Table `payment_schedule_versions`
```sql
CREATE TABLE public.payment_schedule_versions (
  id uuid PRIMARY KEY,
  loan_id uuid NOT NULL REFERENCES loans(id) ON DELETE CASCADE,

  version int NOT NULL,
  reason text NULL,
  source text DEFAULT 'system', -- margill|manual|system

  created_by text NULL,
  created_at timestamptz DEFAULT now(),
  metadata jsonb DEFAULT '{}',

  UNIQUE (loan_id, version)
);
```

**Versioning:**
- Chaque modification d'échéancier = nouvelle version
- Historique complet (légal + audit)
- `source` indique origine de la modification

#### Table `payment_installments`
```sql
CREATE TABLE public.payment_installments (
  id uuid PRIMARY KEY,
  schedule_version_id uuid NOT NULL REFERENCES payment_schedule_versions(id) ON DELETE CASCADE,

  due_date date NOT NULL,
  amount_due numeric(12,2) NOT NULL,
  status text DEFAULT 'scheduled', -- scheduled|paid|failed|skipped|adjusted

  paid_at timestamptz NULL,
  attempt_count int DEFAULT 0,
  metadata jsonb DEFAULT '{}'
);

CREATE INDEX installments_due_date_idx ON payment_installments(due_date);
```

**Statuts:**
- `scheduled` = à venir
- `paid` = payé avec succès
- `failed` = tentative échouée (NSF, etc.)
- `skipped` = sauté (arrangement)
- `adjusted` = montant modifié

#### Table `payment_events`
```sql
CREATE TABLE public.payment_events (
  id uuid PRIMARY KEY,
  loan_id uuid NOT NULL REFERENCES loans(id) ON DELETE CASCADE,

  event_type text NOT NULL, -- NSF|REPORT|ADJUSTMENT|FEE|OVERRIDE|NOTE|SCHEDULE_CHANGED
  amount numeric(12,2) NULL,
  effective_date date NULL,

  created_by text NULL,
  created_at timestamptz DEFAULT now(),
  payload jsonb DEFAULT '{}'
);

CREATE INDEX payment_events_loan_id_idx ON payment_events(loan_id);
CREATE INDEX payment_events_created_at_idx ON payment_events(created_at);
```

**Types d'événements:**
- `NSF` = Non-sufficient funds
- `REPORT` = Rapport crédit bureau
- `ADJUSTMENT` = Ajustement montant
- `FEE` = Frais ajoutés
- `OVERRIDE` = Modification manuelle
- `NOTE` = Note interne
- `SCHEDULE_CHANGED` = Échéancier modifié

**Migration depuis `client_accounts`:**
```sql
-- Créer loans depuis client_accounts existants
INSERT INTO loans (client_id, account_id, status, metadata)
SELECT
  ca.client_id,
  ca.id as account_id,
  CASE
    WHEN ca.status = 'active' THEN 'active'
    WHEN ca.status = 'closed' THEN 'closed'
    WHEN ca.status = 'defaulted' THEN 'defaulted'
    ELSE 'active'
  END as status,
  jsonb_build_object(
    'source', 'client_accounts',
    'original_account_id', ca.id::text,
    'migrated_at', now()
  ) as metadata
FROM client_accounts ca
WHERE ca.client_id IS NOT NULL;
```

**Indexes performance (Phase 3):**
```sql
-- Index pour timeline communications
CREATE INDEX comm_client_ts_idx ON communications(client_id, occurred_at DESC);

-- Index pour timeline transactions
CREATE INDEX ct_account_ts_idx ON client_transactions(account_id, transaction_date DESC);

-- Index pour timeline fraud
CREATE INDEX fraud_app_ts_idx ON fraud_cases(application_id, created_at DESC);
```

**Bénéfices:**
- ✅ Historique complet des échéanciers (versions)
- ✅ Événements tracés (NSF, reports, etc.)
- ✅ Liens `loans` ↔ `client_accounts` (legacy)
- ✅ Liens `loans` ↔ `loan_applications` (TITAN)
- ✅ `client_transactions` reste INTOUCHABLE (ledger)

---

## 🔄 PHASE 4: VoPay Normalisé (EN COURS)

**Fichiers à exécuter:**
1. `040_create_vopay_objects.sql` - Table normalisée
2. `041_backfill_vopay_objects.sql` - Migration

### Table `vopay_objects` (À créer)
```sql
CREATE TABLE public.vopay_objects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NULL REFERENCES clients(id) ON DELETE SET NULL,
  loan_id uuid NULL REFERENCES loans(id) ON DELETE SET NULL,

  object_type text NOT NULL, -- event_type depuis webhook
  vopay_id text NOT NULL,    -- transaction_id
  status text NULL,
  amount numeric(12,2) NULL,

  payload jsonb NOT NULL DEFAULT '{}',
  occurred_at timestamptz NULL,
  raw_log_id uuid NULL,      -- Référence vers vopay_webhook_logs

  created_at timestamptz DEFAULT now(),

  UNIQUE (object_type, vopay_id)
);

CREATE INDEX vopay_objects_client_id_idx ON vopay_objects(client_id);
CREATE INDEX vopay_objects_occurred_at_idx ON vopay_objects(occurred_at);
```

**Migration depuis `vopay_webhook_logs`:**
```sql
INSERT INTO vopay_objects (object_type, vopay_id, status, amount, payload, occurred_at, raw_log_id)
SELECT
  COALESCE(NULLIF(trim(event_type),''),'unknown') AS object_type,
  COALESCE(NULLIF(trim(transaction_id),''), id::text) AS vopay_id,
  NULLIF(payload->>'status','') AS status,
  CASE
    WHEN (payload ? 'amount') AND (payload->>'amount') ~ '^[0-9]+(\.[0-9]+)?$'
    THEN (payload->>'amount')::numeric
    ELSE NULL
  END AS amount,
  payload,
  received_at AS occurred_at,
  id AS raw_log_id
FROM vopay_webhook_logs
ON CONFLICT (object_type, vopay_id) DO NOTHING;
```

**Bénéfices attendus:**
- ✅ Données VoPay structurées (vs JSON brut)
- ✅ Liens vers `loans` et `clients`
- ✅ Queries performantes sur montants/statuts
- ✅ `vopay_webhook_logs` reste intact (RAW)
- ✅ Déduplication automatique (UNIQUE constraint)

---

## 🎨 BACKEND/API (État Actuel)

### Architecture Next.js App Router
```
src/
  app/
    api/
      admin/              # Routes admin
      webhooks/           # Webhooks externes
      memory/             # Système mémoire Claude
      contact/            # Formulaire contact
      applications/       # Soumission demandes prêt
  lib/
    supabase.ts          # Client Supabase
    vopay.ts             # Client VoPay API
    margill-client.ts    # Client Margill
    types/
      titan.ts           # Types TypeScript complets
```

### Routes API Principales

#### 1. Webhooks VoPay
**Route:** `/api/webhooks/vopay`
**Méthode:** POST
**Fonction:** Recevoir notifications VoPay

```typescript
// Enregistre dans vopay_webhook_logs (table RAW)
await supabase
  .from('vopay_webhook_logs')
  .insert({
    transaction_id: payload.TransactionID,
    transaction_type: payload.TransactionType,
    status: payload.Status,
    raw_payload: payload,
    // ...
  });

// TODO Phase 4: Aussi insérer dans vopay_objects (normalisé)
```

#### 2. Admin VoPay Stats
**Route:** `/api/admin/vopay`
**Méthode:** GET
**Fonction:** Récupérer stats VoPay

```typescript
const vopay = createVoPayClient();
const stats = await vopay.getStats();

return {
  balance: stats.balance,
  available: stats.available,
  todayInterac: stats.todayInterac,
  weeklyVolume: stats.weeklyVolume,
  recentTransactions: stats.recentTransactions
};
```

#### 3. Applications Submit (TITAN)
**Route:** `/api/applications/submit`
**Méthode:** POST
**Fonction:** Soumettre demande de prêt

```typescript
// 1. Validation données
// 2. Cortex scoring
// 3. Insertion dans loan_applications
// 4. Envoi à Margill
// 5. Retour référence SAR-LP-XXXXXX
```

#### 4. Support Tickets
**Route:** `/api/admin/support/tickets`
**Méthode:** GET/POST
**Fonction:** Gérer tickets support

### Client VoPay (`lib/vopay.ts`)

**Fonctions disponibles:**
```typescript
class VoPayClient {
  async getBalance(): Promise<VoPayBalance>
  async getTransactions(params): Promise<VoPayTransaction[]>
  async getStats(): Promise<VoPayStats>
}
```

**Authentification:**
- Signature SHA1: `SHA1(APIKey + SharedSecret + Date)`
- Validation webhook: `HMAC SHA1(SharedSecret + TransactionID)`

### Types TypeScript (`lib/types/titan.ts`)

**Interfaces principales:**
- `LoanApplication` - 38 champs Margill
- `CortexRule` - Règles intelligence
- `MargillPayload` - Format Margill API
- `VoPayTransaction` - Transaction VoPay
- `NotificationLog` - Historique notifications
- `MLPrediction` - Prédictions ML/AI

---

## 📊 MODÈLE DE DONNÉES COMPLET

### Relations Clés

```
clients (canonique)
  ├─→ client_identity_aliases (historique identifiants)
  ├─→ loan_applications (demandes TITAN)
  ├─→ client_accounts (comptes legacy Margill)
  ├─→ client_analyses (analyses risque)
  ├─→ contact_messages (formulaire contact)
  ├─→ support_tickets (tickets support)
  ├─→ communications (tous types: email, SMS, support)
  ├─→ loans
  │    ├─→ payment_schedule_versions
  │    │    └─→ payment_installments
  │    └─→ payment_events
  └─→ vopay_objects (À CRÉER Phase 4)

client_accounts (legacy)
  └─→ client_transactions (ledger - INTOUCHABLE)

vopay_webhook_logs (RAW)
  └─→ vopay_objects (normalisé - Phase 4)

emails_envoyes (legacy - READ-ONLY)
  └─→ communications (migration complétée Phase 2)
```

### Tables par Catégorie

#### CORE (Clients)
- ✅ `clients` - Table canonique
- ✅ `client_identity_aliases` - Historique identifiants

#### LEGACY (Pré-restructuration)
- 🔒 `client_accounts` - Comptes Margill (gardé)
- 🔒 `client_transactions` - Ledger comptable (INTOUCHABLE)
- 🔒 `emails_envoyes` - Historique emails (READ-ONLY)
- 🔒 `vopay_webhook_logs` - Webhooks bruts (RAW)

#### APPLICATIONS & LOANS
- ✅ `loan_applications` - Demandes TITAN
- ✅ `loans` - Prêts actifs/fermés
- ✅ `payment_schedule_versions` - Échéanciers versionnés
- ✅ `payment_installments` - Versements individuels
- ✅ `payment_events` - Événements (NSF, reports, etc.)

#### COMMUNICATIONS
- ✅ `communications` - Toutes communications
- ✅ `communication_attachments` - Pièces jointes

#### SUPPORT
- ✅ `contact_messages` - Formulaire contact
- ✅ `support_tickets` - Tickets support
- ✅ `vw_support_as_communications` - Vue unifié

#### VOPAY (Phase 4 - EN COURS)
- 🔒 `vopay_webhook_logs` - RAW (existe)
- ⏳ `vopay_objects` - Normalisé (À CRÉER)

#### INTELLIGENCE (TITAN)
- ⏳ `cortex_rules` - Règles scoring
- ⏳ `cortex_execution_logs` - Logs exécution
- ⏳ `loan_objectives` - Objectifs business

#### SYSTEM
- ✅ `claude_conversation_log` - Logs sessions Claude
- ✅ `claude_memory` - Mémoire centrale
- ✅ `claude_rules` - Règles système

---

## ⚠️ GAPS & INCOHÉRENCES IDENTIFIÉS

### 1. Tables TITAN Non Créées
**Statut:** ⚠️ Définies dans types mais pas en DB

Tables manquantes:
- `cortex_rules`
- `cortex_execution_logs`
- `loan_objectives`
- `metric_logs`
- `metrics_daily_summary`
- `ab_tests`
- `ab_test_assignments`
- `workflows`
- `workflow_executions`
- `notification_templates`
- `notification_logs`
- `ml_models`
- `ml_predictions`
- `api_keys`
- `audit_logs`

**Impact:** Système TITAN incomplet

**Action requise:**
- Décider quelles tables sont prioritaires
- Phase 7: Créer tables TITAN Intelligence
- Ou: Garder système simple sans ces tables

### 2. Lien `vopay_objects` → `loans` Manquant
**Statut:** ⏳ Phase 4 en cours

**Problème:**
- Pas de logique pour lier `vopay_objects.loan_id`
- Pas de logique pour lier `vopay_objects.client_id`
- Backfill 041 ne fait que migrer les données brutes

**Action requise:**
- Ajouter dans Phase 4 une étape de matching
- Utiliser `payload` JSON pour extraire infos
- Matcher sur `transaction_id` ou `client_reference_number`

### 3. Webhook VoPay Ne Met Pas à Jour `payment_installments`
**Statut:** ⚠️ TODO dans le code

```typescript
// src/app/api/webhooks/vopay/route.ts ligne 128-145
switch (payload.Status.toLowerCase()) {
  case 'successful':
    // TODO: Mettre à jour le statut dans la table des prêts/remboursements
    break;

  case 'failed':
    // TODO: Notifier l'admin et le client
    break;
}
```

**Action requise:**
- Phase 4 ou 5: Ajouter logique de mise à jour
- Marquer `payment_installments.status = 'paid'` si successful
- Créer `payment_events` type NSF si failed
- Envoyer notifications (email/SMS)

### 4. Timeline Views Non Créées
**Statut:** ⏳ Phase 5 planifiée

**Fichier:** `050_create_timeline_views.sql`

Views attendues:
- `vw_client_timeline` - Historique complet client
- `vw_client_summary` - Résumé par client

**Action requise:**
- Exécuter Phase 5 après Phase 4

### 5. RLS (Row Level Security) Absente
**Statut:** ⏳ Phase 6 planifiée

**Problème:**
- Toutes les tables accessibles sans restriction
- Pas de politique RLS configurée
- Service role key utilisé partout (risque)

**Action requise:**
- Phase 6: Configurer RLS
- Créer rôles (admin, agent, readonly)
- Policies par table

### 6. Audit Logs Manquants
**Statut:** ⚠️ Pas implémenté

**Problème:**
- Pas de traçabilité modifications importantes
- Pas de logs admin actions
- Pas de logs API access

**Action requise:**
- Phase 6: Créer table `audit_logs`
- Triggers sur tables sensibles
- Middleware API pour logger requests

---

## 📋 PHASES RESTANTES

### Phase 4: VoPay Normalisé ⏳ EN COURS
**Fichiers:**
- `040_create_vopay_objects.sql`
- `041_backfill_vopay_objects.sql`

**Actions:**
1. Créer table `vopay_objects`
2. Migrer données depuis `vopay_webhook_logs`
3. Ajouter logique matching `client_id` et `loan_id`
4. Mettre à jour webhook pour insérer dans `vopay_objects`
5. Créer query helper pour stats VoPay

### Phase 5: Timeline + Summary Views ⏳
**Fichiers:**
- `050_create_timeline_views.sql`

**Actions:**
1. Créer `vw_client_timeline` (UNION ALL sources)
2. Créer `vw_client_summary` (agrégations)
3. Tester performance queries

### Phase 6: RLS + Audit + Performance ⏳
**Actions:**
1. Configurer RLS toutes tables
2. Créer policies (admin, agent, readonly)
3. Créer table `audit_logs`
4. Ajouter triggers audit
5. Optimiser indexes supplémentaires
6. Analyser query performance

### Phase 7: TITAN Intelligence (Optionnel) ⏳
**Tables à créer:**
- `cortex_rules` - Règles scoring
- `cortex_execution_logs` - Logs
- `loan_objectives` - Objectifs
- `workflows` - Workflows automation
- `notification_templates` - Templates

**Décision requise:**
- Est-ce prioritaire?
- Ou système actuel suffit?

---

## 🎯 NEXT STEPS IMMÉDIATS

### 1. Compléter Phase 4 (VoPay)
```bash
# Dans Supabase SQL Editor:
# 1. Exécuter 040_create_vopay_objects.sql
# 2. Exécuter 041_backfill_vopay_objects.sql
# 3. Vérifier données migrées
```

### 2. Ajouter Matching Logic
```sql
-- Lier vopay_objects.client_id depuis payload JSON
UPDATE vopay_objects vo
SET client_id = c.id
FROM clients c
WHERE lower(c.primary_email) = lower(vo.payload->>'email')
  AND vo.client_id IS NULL;

-- Lier vopay_objects.loan_id depuis reference
UPDATE vopay_objects vo
SET loan_id = l.id
FROM loans l
WHERE l.metadata->>'vopay_transaction_id' = vo.vopay_id
  AND vo.loan_id IS NULL;
```

### 3. Mettre à Jour Webhook Handler
```typescript
// Ajouter dans /api/webhooks/vopay/route.ts après ligne 115
// Insérer aussi dans vopay_objects (normalisé)
await supabase
  .from('vopay_objects')
  .insert({
    object_type: payload.TransactionType,
    vopay_id: payload.TransactionID,
    status: payload.Status,
    amount: parseFloat(payload.TransactionAmount),
    payload: payload,
    occurred_at: payload.UpdatedAt
  })
  .select()
  .single();
```

### 4. Validation Phase 4
```sql
-- Compter records migrés
SELECT COUNT(*) FROM vopay_objects;

-- Vérifier liens client_id
SELECT COUNT(*), COUNT(client_id), COUNT(loan_id)
FROM vopay_objects;

-- Tester query performance
EXPLAIN ANALYZE
SELECT * FROM vopay_objects
WHERE client_id = 'UUID'
ORDER BY occurred_at DESC
LIMIT 100;
```

---

## 📞 CONTACT & SUPPORT

**Technique:**
- Email: dev@solutionargentrapide.ca
- Git: branche `feat/db-restructure-dossier-client`

**Documentation:**
- LOGBOOK.md - Journal complet
- STATUS-BOARD.md - État phases
- Ce fichier - Analyse complète

**Backups:**
- SAR_CORTEX_V2
- SAR_PHASE1_BACKUP
- SAR_SUPABASE_BACKUP_2026-01-15

---

**Dernière mise à jour:** 2026-01-15 02:00
**Maintenu par:** Claude Sonnet 4.5
**Statut:** ✅ P0-P3 complètes | ⏳ P4 en cours | ⏳ P5-P7 planifiées
