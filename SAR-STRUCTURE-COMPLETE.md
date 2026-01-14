# 📋 SAR - STRUCTURE COMPLÈTE POUR BLUEPRINT

Document généré le: 2026-01-14
Système: Solution Argent Rapide INC

---

## 🗄️ 1. BLUEPRINT SQL COMPLET

### A. Configuration Supabase

**Projet Supabase:** `dllyzfuqjzuhvshrlmuq`
**URL:** `https://dllyzfuqjzuhvshrlmuq.supabase.co`
**Extensions requises:**
```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
```

---

### B. TABLES PRINCIPALES

#### 1. **loan_applications** (Demandes de prêt - Système TITAN)

```sql
CREATE TABLE loan_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference TEXT UNIQUE NOT NULL,
  origin TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',

  -- Informations personnelles
  prenom TEXT NOT NULL,
  nom TEXT NOT NULL,
  courriel TEXT NOT NULL,
  telephone TEXT NOT NULL,
  date_naissance DATE,

  -- Adresse
  adresse_rue TEXT,
  adresse_ville TEXT,
  adresse_province TEXT,
  adresse_code_postal TEXT,
  duree_residence_mois INTEGER,
  type_logement TEXT,

  -- Détails du prêt
  montant_demande INTEGER NOT NULL,
  raison_pret TEXT,
  duree_pret_mois INTEGER,

  -- Emploi
  statut_emploi TEXT,
  employeur TEXT,
  poste TEXT,
  revenu_annuel INTEGER,
  anciennete_emploi_mois INTEGER,
  frequence_paie TEXT,
  prochaine_paie DATE,

  -- Informations bancaires
  institution_financiere TEXT,
  transit TEXT,
  numero_compte TEXT,
  type_compte TEXT,

  -- Finances
  autres_revenus INTEGER,
  source_autres_revenus TEXT,
  paiement_loyer_hypotheque INTEGER,
  autres_prets INTEGER,
  cartes_credit INTEGER,
  autres_dettes INTEGER,

  -- Co-emprunteur
  coemprunteur_prenom TEXT,
  coemprunteur_nom TEXT,
  coemprunteur_telephone TEXT,
  coemprunteur_revenu INTEGER,

  -- Références
  reference_1_nom TEXT,
  reference_1_telephone TEXT,
  reference_1_relation TEXT,
  reference_2_nom TEXT,
  reference_2_telephone TEXT,
  reference_2_relation TEXT,

  -- Cortex (IA/Scoring)
  cortex_score INTEGER DEFAULT 0,
  cortex_rules_applied JSONB DEFAULT '[]',
  risk_level TEXT,

  -- Intégration Margill
  margill_response JSONB,
  margill_submitted_at TIMESTAMPTZ,
  margill_error TEXT,

  -- Métadonnées formulaire
  form_started_at TIMESTAMPTZ DEFAULT now(),
  form_completed_at TIMESTAMPTZ,
  submitted_at TIMESTAMPTZ,
  last_step_completed INTEGER DEFAULT 0,

  -- A/B Testing & Analytics
  ab_test_variant TEXT,
  ip_address INET,
  user_agent TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_loan_applications_status ON loan_applications(status);
CREATE INDEX idx_loan_applications_reference ON loan_applications(reference);
CREATE INDEX idx_loan_applications_created_at ON loan_applications(created_at DESC);
CREATE INDEX idx_loan_applications_courriel ON loan_applications(courriel);
CREATE INDEX idx_loan_applications_cortex_score ON loan_applications(cortex_score);
```

#### 2. **loan_objectives** (Objectifs business)

```sql
CREATE TABLE loan_objectives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  metric_type TEXT NOT NULL,
  target_value NUMERIC NOT NULL,
  current_value NUMERIC DEFAULT 0,
  period TEXT NOT NULL,
  active BOOLEAN DEFAULT true,
  alert_threshold NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_loan_objectives_active ON loan_objectives(active);
CREATE INDEX idx_loan_objectives_metric_type ON loan_objectives(metric_type);
```

#### 3. **cortex_rules** (Règles IA/Scoring)

```sql
CREATE TABLE cortex_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  rule_type TEXT NOT NULL,
  condition JSONB NOT NULL,
  action JSONB NOT NULL,
  priority INTEGER NOT NULL DEFAULT 100,
  times_triggered INTEGER DEFAULT 0,
  last_triggered_at TIMESTAMPTZ,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_cortex_rules_active ON cortex_rules(active);
CREATE INDEX idx_cortex_rules_rule_type ON cortex_rules(rule_type);
CREATE INDEX idx_cortex_rules_priority ON cortex_rules(priority DESC);
```

#### 4. **cortex_execution_logs** (Logs exécution Cortex)

```sql
CREATE TABLE cortex_execution_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID REFERENCES loan_applications(id) ON DELETE CASCADE,
  rule_id UUID REFERENCES cortex_rules(id) ON DELETE SET NULL,
  rule_name TEXT NOT NULL,
  condition_met BOOLEAN NOT NULL,
  action_taken JSONB,
  execution_time_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_cortex_execution_logs_application_id ON cortex_execution_logs(application_id);
CREATE INDEX idx_cortex_execution_logs_rule_id ON cortex_execution_logs(rule_id);
CREATE INDEX idx_cortex_execution_logs_created_at ON cortex_execution_logs(created_at DESC);
```

#### 5. **security_logs** (Logs de sécurité)

```sql
CREATE TABLE security_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  event_type TEXT NOT NULL,
  -- Exemples: 'osint_access_granted', 'osint_access_denied', 'osint_rate_limited', 'osint_error'

  ip_address INET NOT NULL,
  request_path TEXT NOT NULL,
  user_agent TEXT,

  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  metadata JSONB DEFAULT '{}',

  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_security_logs_event_type ON security_logs(event_type);
CREATE INDEX idx_security_logs_ip ON security_logs(ip_address);
CREATE INDEX idx_security_logs_user ON security_logs(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_security_logs_timestamp ON security_logs(timestamp DESC);
CREATE INDEX idx_security_logs_path ON security_logs(request_path);
CREATE INDEX idx_security_logs_type_time ON security_logs(event_type, timestamp DESC);
```

#### 6. **contact_messages** (Messages de contact)

```sql
CREATE TABLE contact_messages (
  id BIGSERIAL PRIMARY KEY,
  nom TEXT NOT NULL,
  email TEXT NOT NULL,
  telephone TEXT,
  question TEXT NOT NULL,
  lu BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'nouveau',

  -- Assignation
  assigned_to TEXT,
  assigned_at TIMESTAMPTZ,
  assigned_by TEXT,
  system_responded BOOLEAN DEFAULT false,

  -- Métriques client
  client_ip INET,
  client_user_agent TEXT,
  client_device TEXT,
  client_browser TEXT,
  client_os TEXT,
  client_timezone TEXT,
  client_language TEXT,
  client_screen_resolution TEXT,

  -- Marketing
  referrer TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,

  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_contact_messages_status ON contact_messages(status);
CREATE INDEX idx_contact_messages_lu ON contact_messages(lu);
CREATE INDEX idx_contact_messages_created_at ON contact_messages(created_at DESC);
CREATE INDEX idx_contact_messages_email ON contact_messages(email);
```

#### 7. **emails_envoyes** (Emails envoyés)

```sql
CREATE TABLE emails_envoyes (
  id BIGSERIAL PRIMARY KEY,
  message_id INTEGER REFERENCES contact_messages(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'system', 'agent', 'admin'
  destinataire TEXT NOT NULL,
  sujet TEXT NOT NULL,
  contenu TEXT NOT NULL,
  envoye_par TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_emails_envoyes_message_id ON emails_envoyes(message_id);
CREATE INDEX idx_emails_envoyes_type ON emails_envoyes(type);
CREATE INDEX idx_emails_envoyes_created_at ON emails_envoyes(created_at DESC);
```

#### 8. **notes_internes** (Notes internes)

```sql
CREATE TABLE notes_internes (
  id BIGSERIAL PRIMARY KEY,
  message_id INTEGER REFERENCES contact_messages(id) ON DELETE CASCADE,
  de TEXT NOT NULL,
  a TEXT,
  contenu TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_notes_internes_message_id ON notes_internes(message_id);
CREATE INDEX idx_notes_internes_created_at ON notes_internes(created_at DESC);
```

#### 9. **support_tickets** (Tickets de support)

```sql
CREATE TABLE support_tickets (
  id BIGSERIAL PRIMARY KEY,
  ticket_number TEXT UNIQUE NOT NULL,
  client_name TEXT NOT NULL,
  client_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  priority TEXT DEFAULT 'normal', -- 'low', 'normal', 'high', 'urgent'
  status TEXT DEFAULT 'open', -- 'open', 'in_progress', 'resolved', 'closed'
  assigned_to TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

CREATE INDEX idx_support_tickets_status ON support_tickets(status);
CREATE INDEX idx_support_tickets_assigned_to ON support_tickets(assigned_to);
CREATE INDEX idx_support_tickets_created_at ON support_tickets(created_at DESC);
```

#### 10. **support_messages** (Messages du support)

```sql
CREATE TABLE support_messages (
  id BIGSERIAL PRIMARY KEY,
  ticket_id INTEGER REFERENCES support_tickets(id) ON DELETE CASCADE,
  message_from TEXT NOT NULL, -- 'client' ou 'agent'
  sender_name TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_support_messages_ticket_id ON support_messages(ticket_id);
CREATE INDEX idx_support_messages_created_at ON support_messages(created_at DESC);
```

#### 11. **support_attachments** (Pièces jointes support)

```sql
CREATE TABLE support_attachments (
  id BIGSERIAL PRIMARY KEY,
  ticket_id INTEGER REFERENCES support_tickets(id) ON DELETE CASCADE,
  message_id INTEGER REFERENCES support_messages(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  uploaded_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_support_attachments_ticket_id ON support_attachments(ticket_id);
CREATE INDEX idx_support_attachments_message_id ON support_attachments(message_id);
```

#### 12. **client_accounts** (Comptes clients)

```sql
CREATE TABLE client_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID REFERENCES loan_applications(id) ON DELETE CASCADE,
  account_number TEXT UNIQUE NOT NULL,
  client_email TEXT NOT NULL,
  client_name TEXT NOT NULL,
  status TEXT DEFAULT 'active', -- 'active', 'suspended', 'closed'
  balance NUMERIC DEFAULT 0,
  credit_limit NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_client_accounts_application_id ON client_accounts(application_id);
CREATE INDEX idx_client_accounts_account_number ON client_accounts(account_number);
CREATE INDEX idx_client_accounts_status ON client_accounts(status);
```

#### 13. **client_transactions** (Transactions clients)

```sql
CREATE TABLE client_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES client_accounts(id) ON DELETE CASCADE,
  transaction_type TEXT NOT NULL, -- 'payment', 'fee', 'interest', 'refund'
  amount NUMERIC NOT NULL,
  balance_after NUMERIC NOT NULL,
  description TEXT,
  reference TEXT,
  vopay_transaction_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_client_transactions_account_id ON client_transactions(account_id);
CREATE INDEX idx_client_transactions_type ON client_transactions(transaction_type);
CREATE INDEX idx_client_transactions_created_at ON client_transactions(created_at DESC);
```

#### 14. **client_analyses** (Analyses client)

```sql
CREATE TABLE client_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID REFERENCES loan_applications(id) ON DELETE CASCADE,
  analysis_type TEXT NOT NULL, -- 'credit_check', 'fraud_detection', 'risk_assessment'
  score NUMERIC,
  result JSONB,
  performed_by TEXT,
  performed_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_client_analyses_application_id ON client_analyses(application_id);
CREATE INDEX idx_client_analyses_type ON client_analyses(analysis_type);
CREATE INDEX idx_client_analyses_performed_at ON client_analyses(performed_at DESC);
```

#### 15. **fraud_cases** (Cas de fraude)

```sql
CREATE TABLE fraud_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID REFERENCES loan_applications(id) ON DELETE CASCADE,
  fraud_type TEXT NOT NULL,
  severity TEXT NOT NULL, -- 'low', 'medium', 'high', 'critical'
  status TEXT DEFAULT 'investigating', -- 'investigating', 'confirmed', 'dismissed'
  description TEXT,
  evidence JSONB,
  reported_by TEXT,
  reported_at TIMESTAMPTZ DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

CREATE INDEX idx_fraud_cases_application_id ON fraud_cases(application_id);
CREATE INDEX idx_fraud_cases_severity ON fraud_cases(severity);
CREATE INDEX idx_fraud_cases_status ON fraud_cases(status);
```

#### 16. **vopay_webhook_logs** (Logs webhooks VoPay)

```sql
CREATE TABLE vopay_webhook_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  transaction_id TEXT,
  payload JSONB NOT NULL,
  processed BOOLEAN DEFAULT false,
  error TEXT,
  received_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_vopay_webhook_logs_event_type ON vopay_webhook_logs(event_type);
CREATE INDEX idx_vopay_webhook_logs_processed ON vopay_webhook_logs(processed);
CREATE INDEX idx_vopay_webhook_logs_received_at ON vopay_webhook_logs(received_at DESC);
```

#### 17. **download_logs** (Logs téléchargements)

```sql
CREATE TABLE download_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name TEXT NOT NULL,
  client_ip INET,
  user_agent TEXT,
  downloaded_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_download_logs_file_name ON download_logs(file_name);
CREATE INDEX idx_download_logs_downloaded_at ON download_logs(downloaded_at DESC);
```

#### 18. **download_stats** (Statistiques téléchargements)

```sql
CREATE TABLE download_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name TEXT NOT NULL,
  total_downloads INTEGER DEFAULT 0,
  last_download_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_download_stats_file_name ON download_stats(file_name);
```

#### 19. **claude_memory** (Mémoire Claude/IA)

```sql
CREATE TABLE claude_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  memory_type TEXT NOT NULL, -- 'context', 'fact', 'preference', 'instruction'
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_claude_memory_session_id ON claude_memory(session_id);
CREATE INDEX idx_claude_memory_type ON claude_memory(memory_type);
CREATE INDEX idx_claude_memory_key ON claude_memory(key);
```

#### 20. **claude_sessions** (Sessions Claude)

```sql
CREATE TABLE claude_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT UNIQUE NOT NULL,
  user_context JSONB DEFAULT '{}',
  started_at TIMESTAMPTZ DEFAULT now(),
  last_activity_at TIMESTAMPTZ DEFAULT now(),
  ended_at TIMESTAMPTZ
);

CREATE INDEX idx_claude_sessions_session_id ON claude_sessions(session_id);
CREATE INDEX idx_claude_sessions_last_activity ON claude_sessions(last_activity_at DESC);
```

#### 21. **claude_actions** (Actions Claude)

```sql
CREATE TABLE claude_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  action_type TEXT NOT NULL,
  action_data JSONB,
  result JSONB,
  executed_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_claude_actions_session_id ON claude_actions(session_id);
CREATE INDEX idx_claude_actions_type ON claude_actions(action_type);
CREATE INDEX idx_claude_actions_executed_at ON claude_actions(executed_at DESC);
```

#### 22. **claude_docs_read** (Documents lus par Claude)

```sql
CREATE TABLE claude_docs_read (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  document_path TEXT NOT NULL,
  document_type TEXT,
  content_summary TEXT,
  read_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_claude_docs_read_session_id ON claude_docs_read(session_id);
CREATE INDEX idx_claude_docs_read_path ON claude_docs_read(document_path);
```

#### 23. **sentinel_scans** (Scans de sécurité)

```sql
CREATE TABLE sentinel_scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_type TEXT NOT NULL,
  target TEXT NOT NULL,
  status TEXT DEFAULT 'running', -- 'running', 'completed', 'failed'
  findings JSONB,
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_sentinel_scans_scan_type ON sentinel_scans(scan_type);
CREATE INDEX idx_sentinel_scans_status ON sentinel_scans(status);
CREATE INDEX idx_sentinel_scans_started_at ON sentinel_scans(started_at DESC);
```

#### 24. **metric_registry** (Registre des métriques)

```sql
CREATE TABLE metric_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_name TEXT UNIQUE NOT NULL,
  description TEXT,
  unit TEXT,
  category TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_metric_registry_category ON metric_registry(category);
CREATE INDEX idx_metric_registry_active ON metric_registry(active);
```

#### 25. **metric_values** (Valeurs des métriques)

```sql
CREATE TABLE metric_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_id UUID REFERENCES metric_registry(id) ON DELETE CASCADE,
  value NUMERIC NOT NULL,
  dimensions JSONB DEFAULT '{}',
  recorded_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_metric_values_metric_id ON metric_values(metric_id);
CREATE INDEX idx_metric_values_recorded_at ON metric_values(recorded_at DESC);
```

#### 26. **admin_sections** (Sections admin personnalisées)

```sql
CREATE TABLE admin_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_name TEXT NOT NULL,
  section_slug TEXT UNIQUE NOT NULL,
  icon TEXT,
  order_position INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_admin_sections_slug ON admin_sections(section_slug);
CREATE INDEX idx_admin_sections_order ON admin_sections(order_position);
```

---

### C. FONCTIONS

#### 1. generate_loan_reference()

```sql
CREATE OR REPLACE FUNCTION generate_loan_reference()
RETURNS TEXT AS $$
DECLARE
  next_id INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(reference FROM 'SAR-LP-(\d+)') AS INTEGER)), 0) + 1
  INTO next_id
  FROM loan_applications
  WHERE reference LIKE 'SAR-LP-%';
  RETURN 'SAR-LP-' || LPAD(next_id::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### 2. update_updated_at_column()

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

#### 3. cleanup_old_security_logs()

```sql
CREATE OR REPLACE FUNCTION cleanup_old_security_logs()
RETURNS void AS $$
BEGIN
  DELETE FROM security_logs
  WHERE timestamp < now() - interval '90 days';
END;
$$ LANGUAGE plpgsql;
```

---

### D. TRIGGERS

```sql
CREATE TRIGGER update_loan_applications_updated_at
  BEFORE UPDATE ON loan_applications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_loan_objectives_updated_at
  BEFORE UPDATE ON loan_objectives
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cortex_rules_updated_at
  BEFORE UPDATE ON cortex_rules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

---

### E. ROW LEVEL SECURITY (RLS)

```sql
-- loan_applications
ALTER TABLE loan_applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON loan_applications FOR ALL USING (true) WITH CHECK (true);

-- loan_objectives
ALTER TABLE loan_objectives ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON loan_objectives FOR ALL USING (true) WITH CHECK (true);

-- cortex_rules
ALTER TABLE cortex_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON cortex_rules FOR ALL USING (true) WITH CHECK (true);

-- cortex_execution_logs
ALTER TABLE cortex_execution_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON cortex_execution_logs FOR ALL USING (true) WITH CHECK (true);

-- security_logs (admin seulement)
ALTER TABLE security_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can read all security logs"
  ON security_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );
```

---

### F. VIEWS

#### 1. security_dashboard

```sql
CREATE OR REPLACE VIEW security_dashboard AS
SELECT
  event_type,
  COUNT(*) as count,
  COUNT(DISTINCT ip_address) as unique_ips,
  COUNT(DISTINCT user_id) as unique_users,
  DATE(timestamp) as date
FROM security_logs
WHERE timestamp > now() - interval '30 days'
GROUP BY event_type, DATE(timestamp)
ORDER BY date DESC, count DESC;
```

#### 2. security_alerts

```sql
CREATE OR REPLACE VIEW security_alerts AS
SELECT
  ip_address,
  COUNT(*) as failed_attempts,
  MAX(timestamp) as last_attempt,
  array_agg(DISTINCT request_path) as targeted_paths,
  array_agg(DISTINCT event_type) as event_types
FROM security_logs
WHERE event_type IN ('osint_access_denied', 'osint_rate_limited', 'osint_error')
  AND timestamp > now() - interval '24 hours'
GROUP BY ip_address
HAVING COUNT(*) > 5
ORDER BY failed_attempts DESC;
```

---

### G. STORAGE PATHS

**Actuellement:**
Aucun bucket Supabase Storage configuré dans le code.

**Recommandé pour "dossiers clients":**
```
📁 client-files/
  ├── {client_id}/
  │   ├── identity/
  │   │   ├── photo_id.pdf
  │   │   ├── proof_address.pdf
  │   │   └── ...
  │   ├── financial/
  │   │   ├── pay_stub.pdf
  │   │   ├── bank_statement.pdf
  │   │   └── ...
  │   ├── documents/
  │   │   ├── contract.pdf
  │   │   └── ...
  │   └── correspondence/
  │       ├── email_2026-01-14.pdf
  │       └── ...
```

**Configuration Storage:**
```sql
-- Créer le bucket (via Supabase Dashboard)
INSERT INTO storage.buckets (id, name, public)
VALUES ('client-files', 'client-files', false);

-- RLS Policy pour client-files
CREATE POLICY "Admins can access all client files"
ON storage.objects FOR ALL
TO authenticated
USING (
  bucket_id = 'client-files' AND
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);
```

---

## 🔌 2. QUERIES SUPABASE (Patterns d'utilisation)

### A. Configuration Client

```typescript
// src/lib/supabase.ts
import { createClient, SupabaseClient } from '@supabase/supabase-js'

let supabaseInstance: SupabaseClient | null = null

export function getSupabase(): SupabaseClient | null {
  if (supabaseInstance) return supabaseInstance

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.warn('Supabase credentials not configured')
    return null
  }

  supabaseInstance = createClient(supabaseUrl, supabaseKey)
  return supabaseInstance
}

export const getSupabaseAdmin = getSupabase
```

---

### B. Queries Courantes

#### 1. Récupérer messages de contact

```typescript
const { data: messages, error } = await supabase
  .from('contact_messages')
  .select('*')
  .order('created_at', { ascending: false })
  .limit(100)
```

#### 2. Compter messages non lus

```typescript
const { count: nonLusCount } = await supabase
  .from('contact_messages')
  .select('*', { count: 'exact', head: true })
  .eq('lu', false)
```

#### 3. Insérer un message avec emails

```typescript
// Insérer message
const { data, error } = await supabase
  .from('contact_messages')
  .insert({
    nom,
    email,
    telephone,
    question,
    lu: false,
    status: 'nouveau'
  })
  .select()
  .single()

// Email de confirmation
await supabase
  .from('emails_envoyes')
  .insert({
    message_id: data.id,
    type: 'system',
    destinataire: email,
    sujet: `Confirmation #${reference}`,
    contenu: emailContent,
    envoye_par: 'system'
  })
```

#### 4. Récupérer emails et notes d'un message

```typescript
const [emailsResult, notesResult] = await Promise.all([
  supabase
    .from('emails_envoyes')
    .select('*')
    .eq('message_id', parseInt(messageId))
    .order('created_at', { ascending: true }),
  supabase
    .from('notes_internes')
    .select('*')
    .eq('message_id', parseInt(messageId))
    .order('created_at', { ascending: true })
])
```

#### 5. Mettre à jour un message

```typescript
const { error } = await supabase
  .from('contact_messages')
  .update({ lu: true, status: 'traite' })
  .eq('id', parseInt(id))
```

---

### C. Pattern "Dossier Client" (Recommandé)

#### Table: client_folders

```sql
CREATE TABLE client_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID REFERENCES loan_applications(id) ON DELETE CASCADE,
  folder_type TEXT NOT NULL, -- 'identity', 'financial', 'documents', 'correspondence'
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE client_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  folder_id UUID REFERENCES client_folders(id) ON DELETE CASCADE,
  document_name TEXT NOT NULL,
  document_type TEXT NOT NULL, -- 'photo_id', 'pay_stub', 'bank_statement', etc.
  storage_path TEXT NOT NULL, -- 'client-files/{client_id}/identity/photo_id.pdf'
  file_size INTEGER,
  mime_type TEXT,
  uploaded_by TEXT,
  uploaded_at TIMESTAMPTZ DEFAULT now(),
  metadata JSONB DEFAULT '{}'
);

CREATE INDEX idx_client_documents_folder_id ON client_documents(folder_id);
CREATE INDEX idx_client_documents_document_type ON client_documents(document_type);
```

#### Query: Récupérer dossier complet

```typescript
const { data: folders, error } = await supabase
  .from('client_folders')
  .select(`
    *,
    documents:client_documents(*)
  `)
  .eq('application_id', applicationId)

// Structure retournée:
{
  id: 'uuid',
  application_id: 'uuid',
  folder_type: 'identity',
  documents: [
    {
      id: 'uuid',
      document_name: 'photo_id.pdf',
      storage_path: 'client-files/abc123/identity/photo_id.pdf',
      ...
    }
  ]
}
```

---

## 🚀 3. ENDPOINTS NEXT.JS API

### A. Structure des Routes

```
src/app/api/
├── activity/
│   ├── log/route.ts
│   ├── recent/route.ts
│   └── stats/route.ts
├── admin/
│   ├── analytics/
│   │   ├── dashboard/route.ts
│   │   └── route.ts
│   ├── client-analysis/route.ts
│   ├── database/
│   │   └── explore/route.ts
│   ├── downloads/
│   │   └── stats/route.ts
│   ├── messages/
│   │   ├── assign/route.ts
│   │   └── route.ts
│   ├── support/
│   │   ├── messages/route.ts
│   │   ├── stats/route.ts
│   │   └── tickets/
│   │       ├── [id]/route.ts
│   │       └── route.ts
│   ├── vopay/
│   │   ├── real-transactions/route.ts
│   │   ├── transactions/route.ts
│   │   └── route.ts
│   └── webhooks/
│       ├── debug/route.ts
│       ├── list/route.ts
│       ├── send-alert/route.ts
│       └── stats/route.ts
├── applications/
│   └── submit/route.ts
├── contact/route.ts
├── cortex/
│   └── sync-miro/route.ts
├── memory/
│   ├── context/route.ts
│   ├── doc-read/route.ts
│   ├── recall/route.ts
│   ├── session/route.ts
│   └── store/route.ts
└── ...
```

---

### B. Pattern d'Authentification Admin

```typescript
// Fonction réutilisable
async function verifyAuth() {
  const cookieStore = await cookies()
  const token = cookieStore.get('admin-session')

  if (!token) return false

  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET!)
    await jwtVerify(token.value, secret)
    return true
  } catch {
    return false
  }
}

// Utilisation dans route
export async function GET(request: NextRequest) {
  const isAuth = await verifyAuth()
  if (!isAuth) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  // ... logique de la route
}
```

---

### C. Endpoints "Dossier Client" (À créer)

#### 1. GET /api/admin/clients/[id]/folders
```typescript
// Récupérer tous les dossiers d'un client
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const isAuth = await verifyAuth()
  if (!isAuth) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const supabase = getSupabase()
  const { data: folders, error } = await supabase
    .from('client_folders')
    .select(`
      *,
      documents:client_documents(*)
    `)
    .eq('application_id', params.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ folders })
}
```

#### 2. POST /api/admin/clients/[id]/upload
```typescript
// Upload document dans un dossier
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const isAuth = await verifyAuth()
  if (!isAuth) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const formData = await request.formData()
  const file = formData.get('file') as File
  const folderType = formData.get('folderType') as string
  const documentType = formData.get('documentType') as string

  const supabase = getSupabase()

  // 1. Upload vers Storage
  const filePath = `client-files/${params.id}/${folderType}/${file.name}`
  const { data: uploadData, error: uploadError } = await supabase
    .storage
    .from('client-files')
    .upload(filePath, file)

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })

  // 2. Créer ou récupérer le folder
  let { data: folder } = await supabase
    .from('client_folders')
    .select('*')
    .eq('application_id', params.id)
    .eq('folder_type', folderType)
    .single()

  if (!folder) {
    const { data: newFolder } = await supabase
      .from('client_folders')
      .insert({ application_id: params.id, folder_type: folderType })
      .select()
      .single()
    folder = newFolder
  }

  // 3. Enregistrer le document
  const { data: document, error: docError } = await supabase
    .from('client_documents')
    .insert({
      folder_id: folder.id,
      document_name: file.name,
      document_type: documentType,
      storage_path: filePath,
      file_size: file.size,
      mime_type: file.type,
      uploaded_by: 'admin'
    })
    .select()
    .single()

  if (docError) return NextResponse.json({ error: docError.message }, { status: 500 })

  return NextResponse.json({ success: true, document })
}
```

#### 3. DELETE /api/admin/clients/documents/[documentId]
```typescript
// Supprimer un document
export async function DELETE(
  request: NextRequest,
  { params }: { params: { documentId: string } }
) {
  const isAuth = await verifyAuth()
  if (!isAuth) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const supabase = getSupabase()

  // 1. Récupérer le document pour obtenir le storage_path
  const { data: document } = await supabase
    .from('client_documents')
    .select('storage_path')
    .eq('id', params.documentId)
    .single()

  if (!document) return NextResponse.json({ error: 'Document non trouvé' }, { status: 404 })

  // 2. Supprimer du Storage
  await supabase.storage
    .from('client-files')
    .remove([document.storage_path])

  // 3. Supprimer l'enregistrement
  const { error } = await supabase
    .from('client_documents')
    .delete()
    .eq('id', params.documentId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
```

#### 4. GET /api/admin/clients/documents/[documentId]/download
```typescript
// Télécharger un document
export async function GET(
  request: NextRequest,
  { params }: { params: { documentId: string } }
) {
  const isAuth = await verifyAuth()
  if (!isAuth) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const supabase = getSupabase()

  // 1. Récupérer le document
  const { data: document } = await supabase
    .from('client_documents')
    .select('*')
    .eq('id', params.documentId)
    .single()

  if (!document) return NextResponse.json({ error: 'Document non trouvé' }, { status: 404 })

  // 2. Générer signed URL
  const { data: signedUrl } = await supabase.storage
    .from('client-files')
    .createSignedUrl(document.storage_path, 3600) // 1h

  return NextResponse.json({
    url: signedUrl.signedUrl,
    document: {
      name: document.document_name,
      type: document.mime_type,
      size: document.file_size
    }
  })
}
```

---

## 🔐 4. VARIABLES D'ENVIRONNEMENT

```bash
# Supabase
SUPABASE_PROJECT_ID=dllyzfuqjzuhvshrlmuq
SUPABASE_URL=https://dllyzfuqjzuhvshrlmuq.supabase.co
NEXT_PUBLIC_SUPABASE_URL=https://dllyzfuqjzuhvshrlmuq.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_DB_PASSWORD=Solution%99

# Admin Auth
ADMIN_PASSWORD=FredRosa%1978
JWT_SECRET=56K2TFqsBtHQjzihmTS8palyJeA3KZHI1yYsvGEkxWQ=

# VoPay
VOPAY_ACCOUNT_ID=solutionargentrapideinc
VOPAY_API_KEY=bUXExKVc0sLyNS9zjfGq6AJukdDB1pvCR5ihHF78
VOPAY_SHARED_SECRET=ToDqaRRl4nmwnAYVc+==
VOPAY_API_URL=https://earthnode.vopay.com/api/v2/

# Margill
MARGILL_ENDPOINT=https://argentrapide.margill.com/process_json_form.aspx
MARGILL_ORIGIN=argentrapide

# Email (Resend)
RESEND_API_KEY=re_h3gWhzTZ_EuZJdggdbnr4TZQmH1hFi14B

# Vercel
VERCEL_TOKEN=5Qjkd1qmU2PIwWopMZkBjvW2
VERCEL_ORG_ID=team_Rsbwr6LzT93S2w90kI3Cdz07

# Miro
MIRO_CLIENT_ID=3458764655444217359
MIRO_CLIENT_SECRET=TlYT1QdJGULm2u3B2n2f4ZelBE41cCsU
MIRO_ACCESS_TOKEN=eyJtaXJvLm9yaWdpbiI6ImV1MDEifQ_eznJ0arv-ekrq9HvsBD0W86uroY

# App
NEXT_PUBLIC_APP_URL=https://admin.solutionargentrapide.ca
```

---

## 📝 5. SEED DATA EXEMPLE

```sql
-- Objectifs business
INSERT INTO loan_objectives (name, description, metric_type, target_value, period) VALUES
  ('Conversion Rate', 'Taux de conversion formulaire', 'conversion_rate', 60, 'monthly'),
  ('Approval Rate', 'Taux d''approbation Margill', 'approval_rate', 75, 'monthly'),
  ('Average Loan Amount', 'Montant moyen demandé', 'avg_amount', 400000, 'monthly');

-- Règles Cortex
INSERT INTO cortex_rules (name, description, rule_type, condition, action, priority) VALUES
  ('High Income Bonus', 'Bonus pour revenu élevé', 'scoring',
   '{">=": [{"var": "revenu_annuel"}, 5000000]}'::jsonb,
   '{"score": 20}'::jsonb, 100),
  ('Low Debt Bonus', 'Bonus pour faibles dettes', 'scoring',
   '{"<": [{"var": "autres_dettes"}, 50000]}'::jsonb,
   '{"score": 15}'::jsonb, 90);
```

---

## 🎯 6. RÉSUMÉ POUR LE BLUEPRINT

**Ce que l'autre Claude a besoin de savoir:**

### Tables Existantes (26 tables)

**Système de prêts (TITAN):**
1. loan_applications
2. loan_objectives
3. cortex_rules
4. cortex_execution_logs

**Système de messages:**
5. contact_messages
6. emails_envoyes
7. notes_internes

**Support client:**
8. support_tickets
9. support_messages
10. support_attachments

**Gestion clients:**
11. client_accounts
12. client_transactions
13. client_analyses
14. fraud_cases

**Intégrations:**
15. vopay_webhook_logs

**Téléchargements:**
16. download_logs
17. download_stats

**Mémoire IA (Claude):**
18. claude_memory
19. claude_sessions
20. claude_actions
21. claude_docs_read

**Sécurité:**
22. security_logs
23. sentinel_scans

**Métriques:**
24. metric_registry
25. metric_values

**Administration:**
26. admin_sections

### À créer pour "Dossiers Clients"

**Nouvelles tables recommandées:**
- client_folders (organiser les documents par type)
- client_documents (métadonnées des fichiers)

**Storage Supabase:**
- Bucket: `client-files`
- Structure: `client-files/{client_id}/{folder_type}/{filename}`
- RLS policies pour sécurité admin

### Endpoints API à créer

**Gestion dossiers:**
- `GET /api/admin/clients/[id]/folders` - Liste tous les dossiers
- `POST /api/admin/clients/[id]/upload` - Upload document
- `DELETE /api/admin/clients/documents/[documentId]` - Supprimer document
- `GET /api/admin/clients/documents/[documentId]/download` - Télécharger avec signed URL

**Pattern d'authentification:**
- JWT stocké dans cookie `admin-session`
- Fonction `verifyAuth()` réutilisable
- Middleware pour protéger routes admin

### Technologies

- **Framework:** Next.js 14 (App Router)
- **Base de données:** Supabase (PostgreSQL)
- **Storage:** Supabase Storage
- **Auth:** JWT + cookies (httpOnly, secure)
- **Language:** TypeScript
- **ORM:** Supabase Client JS

### Sécurité

- RLS activé sur toutes les tables
- Policies basées sur rôle admin
- Signed URLs pour téléchargements (expiration 1h)
- Cleanup automatique logs > 90 jours
- Indexes sur tous les champs de recherche

---

**Document généré automatiquement par SAR Cortex**
Version: 1.0
Date: 2026-01-14
Contact: fred@solutionargentrapide.ca
