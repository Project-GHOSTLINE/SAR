# UNIFIED CLIENT DOSSIER SCHEMA
**SAR Project - Target Schema Design & Migration Strategy**
**Date:** 2026-01-23

## 🎯 Objectif

Concevoir un schéma de données normalisé et optimisé pour supporter le dossier client unifié, éliminant la redondance et garantissant l'intégrité référentielle tout en maintenant les performances.

---

## 📋 Current State Analysis

### Problems with Current Schema:

1. **No Central Client Entity**
   - Client data scattered across `loan_applications`, `client_analyses`, `quickbooks_invoices`
   - Multiple records per client with duplicate email/phone/address
   - No single source of truth for client identity

2. **Weak Referential Integrity**
   - Many relationships use email matching (string comparison)
   - No foreign keys between critical tables
   - Orphaned records possible (analyses without applications)

3. **Data Redundancy**
   - Client name/email/phone duplicated across applications
   - Same address stored multiple times
   - No normalized contact information

4. **Limited Relationship Modeling**
   - Co-borrowers stored as JSON in applications
   - References stored as text fields
   - No proper many-to-many relationships

5. **External ID Management**
   - External IDs (VoPay, QuickBooks, Inverite) scattered in metadata
   - No central registry of external mappings
   - Difficult to resolve cross-system identifiers

---

## 🏗️ Target Schema Design

### Core Principles:

1. **Single Source of Truth:** One `clients` table as the central entity
2. **Referential Integrity:** All relationships enforced with foreign keys
3. **Normalized Structure:** Eliminate redundancy while maintaining query performance
4. **Flexible External IDs:** Support multiple external system mappings
5. **Audit Trail:** Track all changes to client data
6. **Performance First:** Denormalize where read performance is critical

---

## 📊 Target Schema

### 1. Central Client Entity

#### `clients` (New table - Hub)

```sql
CREATE TABLE clients (
  -- Primary identification
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Core identity (normalized)
  email VARCHAR(255) NOT NULL UNIQUE,
  email_verified BOOLEAN DEFAULT false,
  phone VARCHAR(50),
  phone_verified BOOLEAN DEFAULT false,

  -- Personal information
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  date_of_birth DATE,
  sin_last_4 VARCHAR(4),  -- Last 4 digits only (PII protection)

  -- Contact preferences
  preferred_language VARCHAR(10) DEFAULT 'fr',  -- 'fr' or 'en'
  email_consent BOOLEAN DEFAULT true,
  sms_consent BOOLEAN DEFAULT true,
  call_consent BOOLEAN DEFAULT false,

  -- Status
  status VARCHAR(50) DEFAULT 'active',  -- active, inactive, suspended, blocked
  risk_profile VARCHAR(20),  -- LOW, MEDIUM, HIGH (computed)

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_activity_at TIMESTAMPTZ,

  -- Soft delete
  deleted_at TIMESTAMPTZ,

  -- Audit
  created_by VARCHAR(100),
  updated_by VARCHAR(100)
);

-- Indexes
CREATE UNIQUE INDEX idx_clients_email_lower ON clients(LOWER(email)) WHERE deleted_at IS NULL;
CREATE INDEX idx_clients_phone ON clients(phone) WHERE phone IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX idx_clients_status ON clients(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_clients_last_activity ON clients(last_activity_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_clients_created_at ON clients(created_at DESC);

-- Full-text search
CREATE INDEX idx_clients_search ON clients
USING GIN(to_tsvector('french', first_name || ' ' || last_name || ' ' || email));

-- RLS (Row Level Security)
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

-- Trigger for updated_at
CREATE TRIGGER set_clients_updated_at
  BEFORE UPDATE ON clients
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

#### `client_addresses` (One-to-many)

```sql
CREATE TABLE client_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,

  -- Address details
  address_type VARCHAR(20) NOT NULL,  -- primary, secondary, mailing, billing
  street VARCHAR(255),
  unit VARCHAR(50),
  city VARCHAR(100),
  province VARCHAR(2),  -- QC, ON, etc.
  postal_code VARCHAR(10),
  country VARCHAR(2) DEFAULT 'CA',

  -- Status
  is_primary BOOLEAN DEFAULT false,
  verified BOOLEAN DEFAULT false,
  verified_at TIMESTAMPTZ,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_client_addresses_client_id ON client_addresses(client_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_client_addresses_primary ON client_addresses(client_id) WHERE is_primary = true AND deleted_at IS NULL;

-- Constraint: Only one primary address per client
CREATE UNIQUE INDEX idx_client_addresses_one_primary
ON client_addresses(client_id)
WHERE is_primary = true AND deleted_at IS NULL;
```

#### `client_external_ids` (External system mappings)

```sql
CREATE TABLE client_external_ids (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,

  -- External system
  external_system VARCHAR(50) NOT NULL,  -- 'vopay', 'quickbooks', 'inverite', 'margill'
  external_id VARCHAR(255) NOT NULL,

  -- Status
  status VARCHAR(20) DEFAULT 'active',  -- active, inactive, revoked
  verified BOOLEAN DEFAULT false,

  -- Metadata
  linked_at TIMESTAMPTZ DEFAULT NOW(),
  last_synced_at TIMESTAMPTZ,
  metadata JSONB,  -- System-specific metadata

  -- Audit
  created_by VARCHAR(100),

  CONSTRAINT unique_external_id UNIQUE(external_system, external_id)
);

-- Indexes
CREATE INDEX idx_client_external_ids_client ON client_external_ids(client_id);
CREATE INDEX idx_client_external_ids_system ON client_external_ids(external_system, external_id);
CREATE INDEX idx_client_external_ids_linked_at ON client_external_ids(linked_at DESC);
```

---

### 2. Application Layer (Modified)

#### `loan_applications` (Modified - now references clients)

```sql
-- Add foreign key to clients
ALTER TABLE loan_applications
  ADD COLUMN client_id UUID REFERENCES clients(id) ON DELETE RESTRICT;

-- Migrate data (see migration strategy below)
-- UPDATE loan_applications SET client_id = ...

-- After migration, make required
ALTER TABLE loan_applications
  ALTER COLUMN client_id SET NOT NULL;

-- Keep email/phone for backward compatibility (redundant but useful)
-- Eventually can be removed once all queries use client_id

-- Add index
CREATE INDEX idx_loan_applications_client_id ON loan_applications(client_id);

-- Optional: Add constraint to ensure email matches client
ALTER TABLE loan_applications
  ADD CONSTRAINT fk_loan_applications_client_email
  CHECK (
    email = (SELECT email FROM clients WHERE id = client_id)
  );
```

---

### 3. Relationship Layer (New tables)

#### `client_relations` (Co-borrowers, guarantors, references)

```sql
CREATE TABLE client_relations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Primary client
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,

  -- Related person (may or may not be a client)
  related_client_id UUID REFERENCES clients(id) ON DELETE SET NULL,  -- If they're also a client

  -- If not a client, store contact info
  related_name VARCHAR(200),
  related_email VARCHAR(255),
  related_phone VARCHAR(50),

  -- Relationship type
  relation_type VARCHAR(50) NOT NULL,  -- 'co_borrower', 'guarantor', 'spouse', 'reference', 'family', 'colleague'
  relation_status VARCHAR(20) DEFAULT 'active',  -- active, inactive, removed

  -- Context
  application_id UUID REFERENCES loan_applications(id) ON DELETE SET NULL,  -- If relation is application-specific
  notes TEXT,
  verified BOOLEAN DEFAULT false,
  verified_at TIMESTAMPTZ,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_client_relations_client_id ON client_relations(client_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_client_relations_related_client ON client_relations(related_client_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_client_relations_type ON client_relations(relation_type) WHERE deleted_at IS NULL;
CREATE INDEX idx_client_relations_application ON client_relations(application_id) WHERE deleted_at IS NULL;

-- Prevent duplicate relations
CREATE UNIQUE INDEX idx_client_relations_unique
ON client_relations(client_id, related_client_id, relation_type, application_id)
WHERE deleted_at IS NULL AND related_client_id IS NOT NULL;
```

#### `client_concordances` (Duplicate detection & linking)

```sql
CREATE TABLE client_concordances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Potential duplicates
  client_id_1 UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  client_id_2 UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,

  -- Match details
  match_type VARCHAR(50) NOT NULL,  -- 'same_email', 'same_phone', 'same_address', 'similar_name', 'same_sin'
  confidence_score NUMERIC(3, 2) NOT NULL,  -- 0.00 - 1.00

  -- Resolution
  resolution_status VARCHAR(20) DEFAULT 'pending',  -- pending, confirmed_duplicate, confirmed_distinct, merged
  resolved_at TIMESTAMPTZ,
  resolved_by VARCHAR(100),
  merged_into_client_id UUID REFERENCES clients(id) ON DELETE SET NULL,  -- If merged

  -- Details
  match_details JSONB,  -- Specific fields that matched
  notes TEXT,

  -- Metadata
  detected_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT different_clients CHECK (client_id_1 != client_id_2),
  CONSTRAINT ordered_clients CHECK (client_id_1 < client_id_2)  -- Prevent duplicates
);

-- Indexes
CREATE INDEX idx_client_concordances_client1 ON client_concordances(client_id_1);
CREATE INDEX idx_client_concordances_client2 ON client_concordances(client_id_2);
CREATE INDEX idx_client_concordances_status ON client_concordances(resolution_status);
CREATE INDEX idx_client_concordances_score ON client_concordances(confidence_score DESC);

-- Unique constraint to prevent duplicate concordance records
CREATE UNIQUE INDEX idx_client_concordances_unique
ON client_concordances(client_id_1, client_id_2, match_type);
```

---

### 4. Banking & Analysis Layer (Modified)

#### `client_analyses` (Modified - references clients)

```sql
-- Add foreign key to clients
ALTER TABLE client_analyses
  ADD COLUMN client_id UUID REFERENCES clients(id) ON DELETE RESTRICT;

-- Migrate data
-- UPDATE client_analyses ca
-- SET client_id = (SELECT id FROM clients WHERE email = ca.client_email LIMIT 1);

-- Make required after migration
ALTER TABLE client_analyses
  ALTER COLUMN client_id SET NOT NULL;

-- Add index
CREATE INDEX idx_client_analyses_client_id ON client_analyses(client_id);

-- Keep client_email for backward compatibility (can remove later)
```

---

### 5. Communication Layer (Modified)

#### `client_communications` (New - unified communication log)

```sql
CREATE TABLE client_communications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,

  -- Communication details
  communication_type VARCHAR(20) NOT NULL,  -- 'email', 'sms', 'call', 'chat', 'letter'
  direction VARCHAR(10) NOT NULL,  -- 'inbound', 'outbound'

  -- Content
  subject VARCHAR(500),
  body TEXT,
  template_id VARCHAR(100),  -- If from template

  -- Delivery
  to_address VARCHAR(255),  -- Email or phone
  from_address VARCHAR(255),
  status VARCHAR(20) DEFAULT 'pending',  -- pending, sent, delivered, bounced, failed, opened, clicked

  -- Engagement tracking
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  replied_at TIMESTAMPTZ,

  -- Context
  application_id UUID REFERENCES loan_applications(id) ON DELETE SET NULL,
  campaign_id VARCHAR(100),

  -- Raw data
  raw_message_id VARCHAR(255),  -- External provider message ID
  raw_data JSONB,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by VARCHAR(100)
);

-- Indexes
CREATE INDEX idx_client_communications_client_id ON client_communications(client_id);
CREATE INDEX idx_client_communications_type ON client_communications(communication_type);
CREATE INDEX idx_client_communications_status ON client_communications(status);
CREATE INDEX idx_client_communications_created_at ON client_communications(created_at DESC);
CREATE INDEX idx_client_communications_application ON client_communications(application_id) WHERE application_id IS NOT NULL;

-- Migrate existing email_messages
-- INSERT INTO client_communications (client_id, communication_type, direction, ...)
-- SELECT ...
```

---

### 6. Document Layer (Modified)

#### `client_documents` (New - replaces download_logs)

```sql
CREATE TABLE client_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,

  -- Document details
  document_type VARCHAR(50) NOT NULL,  -- 'contract', 'statement', 'id_proof', 'bank_statement', 'other'
  document_category VARCHAR(50),  -- 'application', 'loan', 'kyc', 'legal'
  file_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  file_size_bytes BIGINT,
  mime_type VARCHAR(100),

  -- Context
  application_id UUID REFERENCES loan_applications(id) ON DELETE SET NULL,
  analysis_id UUID REFERENCES client_analyses(id) ON DELETE SET NULL,

  -- Status
  status VARCHAR(20) DEFAULT 'active',  -- active, archived, deleted
  is_signed BOOLEAN DEFAULT false,
  signed_at TIMESTAMPTZ,

  -- Access tracking
  download_count INT DEFAULT 0,
  last_downloaded_at TIMESTAMPTZ,
  last_downloaded_by VARCHAR(100),

  -- Security
  encryption_key_id VARCHAR(100),  -- If encrypted
  access_level VARCHAR(20) DEFAULT 'client',  -- client, admin, restricted

  -- Metadata
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by VARCHAR(100),
  deleted_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_client_documents_client_id ON client_documents(client_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_client_documents_type ON client_documents(document_type) WHERE deleted_at IS NULL;
CREATE INDEX idx_client_documents_application ON client_documents(application_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_client_documents_created_at ON client_documents(created_at DESC) WHERE deleted_at IS NULL;

-- Track downloads separately for analytics
CREATE TABLE client_document_downloads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES client_documents(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,

  downloaded_at TIMESTAMPTZ DEFAULT NOW(),
  downloaded_by VARCHAR(100),
  ip_address INET,
  user_agent TEXT
);

CREATE INDEX idx_client_document_downloads_document ON client_document_downloads(document_id);
CREATE INDEX idx_client_document_downloads_client ON client_document_downloads(client_id);
CREATE INDEX idx_client_document_downloads_date ON client_document_downloads(downloaded_at DESC);
```

---

### 7. Timeline Layer (Modified)

#### `client_events` (Modified - ensure FK to clients)

```sql
-- Already has client_id, ensure FK exists
ALTER TABLE client_events
  DROP CONSTRAINT IF EXISTS client_events_client_id_fkey;

ALTER TABLE client_events
  ADD CONSTRAINT client_events_client_id_fkey
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE;

-- Already has good indexes
```

---

### 8. Computed Metrics Layer (New)

#### `client_metrics_snapshot` (Time-series snapshots)

```sql
CREATE TABLE client_metrics_snapshot (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,

  -- Financial metrics
  total_borrowed_cad NUMERIC(12, 2) DEFAULT 0,
  total_paid_cad NUMERIC(12, 2) DEFAULT 0,
  current_balance_cad NUMERIC(12, 2) DEFAULT 0,
  lifetime_value_cad NUMERIC(12, 2) DEFAULT 0,

  -- Application metrics
  applications_count INT DEFAULT 0,
  approved_count INT DEFAULT 0,
  declined_count INT DEFAULT 0,

  -- Banking metrics
  latest_sar_score INT,
  sar_recommendation VARCHAR(20),
  monthly_income_cad NUMERIC(12, 2),
  dti_ratio NUMERIC(4, 3),

  -- Engagement metrics
  email_open_rate NUMERIC(4, 3),
  sms_response_rate NUMERIC(4, 3),
  portal_logins_count INT DEFAULT 0,

  -- Risk metrics
  risk_score INT,
  risk_level VARCHAR(20),
  fraud_score INT,
  churn_risk_score INT,

  -- Segmentation
  customer_segment VARCHAR(20),  -- PRIME, STANDARD, SUBPRIME, HIGH_RISK
  ltv_segment VARCHAR(20),  -- HIGH, MEDIUM, LOW
  engagement_segment VARCHAR(20),  -- ACTIVE, MODERATE, INACTIVE, CHURNED

  -- Metadata
  computed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE UNIQUE INDEX idx_client_metrics_snapshot_unique
ON client_metrics_snapshot(client_id, snapshot_date);

CREATE INDEX idx_client_metrics_snapshot_date
ON client_metrics_snapshot(snapshot_date DESC);

CREATE INDEX idx_client_metrics_snapshot_risk
ON client_metrics_snapshot(risk_level, snapshot_date);

-- Partition by month for performance (optional)
-- CREATE TABLE client_metrics_snapshot_y2026m01 PARTITION OF client_metrics_snapshot
-- FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');
```

---

## 🔄 Migration Strategy

### Phase 1: Create New Tables (Week 1)

**Step 1.1: Create `clients` table**

```sql
-- Run migration: migrations/101_create_clients_table.sql
CREATE TABLE clients (...);
```

**Step 1.2: Populate `clients` from `loan_applications`**

```sql
-- Deduplicate and populate clients
INSERT INTO clients (
  email,
  phone,
  first_name,
  last_name,
  preferred_language,
  status,
  created_at,
  last_activity_at
)
SELECT DISTINCT ON (LOWER(email))
  email,
  phone,
  first_name,
  last_name,
  COALESCE(metadata->>'preferred_language', 'fr'),
  'active',
  MIN(created_at) OVER (PARTITION BY LOWER(email)) as created_at,
  MAX(created_at) OVER (PARTITION BY LOWER(email)) as last_activity_at
FROM loan_applications
WHERE email IS NOT NULL
ORDER BY LOWER(email), created_at ASC;

-- Result: ~10K clients created from ~15K applications
```

**Step 1.3: Link `loan_applications` to `clients`**

```sql
-- Add client_id column
ALTER TABLE loan_applications ADD COLUMN client_id UUID;

-- Populate client_id
UPDATE loan_applications la
SET client_id = c.id
FROM clients c
WHERE LOWER(la.email) = LOWER(c.email);

-- Verify (should be 0)
SELECT COUNT(*) FROM loan_applications WHERE client_id IS NULL;

-- Make required
ALTER TABLE loan_applications ALTER COLUMN client_id SET NOT NULL;

-- Add foreign key
ALTER TABLE loan_applications
  ADD CONSTRAINT fk_loan_applications_client
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE RESTRICT;
```

### Phase 2: Migrate Related Data (Week 2)

**Step 2.1: Create and populate `client_addresses`**

```sql
-- Extract addresses from loan_applications
INSERT INTO client_addresses (
  client_id,
  address_type,
  street,
  city,
  province,
  postal_code,
  is_primary,
  created_at
)
SELECT DISTINCT ON (la.client_id)
  la.client_id,
  'primary',
  la.address_street,
  la.address_city,
  la.address_province,
  la.address_postal_code,
  true,
  la.created_at
FROM loan_applications la
WHERE la.address_street IS NOT NULL
ORDER BY la.client_id, la.created_at DESC;
```

**Step 2.2: Create and populate `client_external_ids`**

```sql
-- Extract Inverite GUIDs
INSERT INTO client_external_ids (client_id, external_system, external_id, linked_at)
SELECT DISTINCT
  c.id,
  'inverite',
  ca.inverite_guid,
  ca.created_at
FROM client_analyses ca
JOIN clients c ON LOWER(c.email) = LOWER(ca.client_email)
WHERE ca.inverite_guid IS NOT NULL;

-- Extract VoPay IDs from webhook logs
INSERT INTO client_external_ids (client_id, external_system, external_id, linked_at)
SELECT DISTINCT
  c.id,
  'vopay',
  wl.metadata->>'vopay_client_id',
  wl.created_at
FROM webhook_logs wl
JOIN clients c ON LOWER(c.email) = LOWER(wl.metadata->>'client_email')
WHERE wl.source = 'vopay'
  AND wl.metadata->>'vopay_client_id' IS NOT NULL;

-- Extract QuickBooks IDs
INSERT INTO client_external_ids (client_id, external_system, external_id, linked_at)
SELECT DISTINCT
  c.id,
  'quickbooks',
  qbi.customer_id,
  qbi.created_at
FROM quickbooks_invoices qbi
JOIN clients c ON LOWER(c.email) = LOWER(qbi.customer_email)
WHERE qbi.customer_id IS NOT NULL;
```

**Step 2.3: Link `client_analyses` to `clients`**

```sql
ALTER TABLE client_analyses ADD COLUMN client_id UUID;

UPDATE client_analyses ca
SET client_id = c.id
FROM clients c
WHERE LOWER(ca.client_email) = LOWER(c.email);

-- Verify
SELECT COUNT(*) FROM client_analyses WHERE client_id IS NULL;  -- Should be 0 or handle orphans

ALTER TABLE client_analyses ALTER COLUMN client_id SET NOT NULL;

ALTER TABLE client_analyses
  ADD CONSTRAINT fk_client_analyses_client
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE RESTRICT;
```

### Phase 3: Create Relationship Tables (Week 3)

**Step 3.1: Extract co-borrowers from applications**

```sql
-- Parse co-borrower data from metadata/JSONB
INSERT INTO client_relations (
  client_id,
  related_name,
  related_email,
  related_phone,
  relation_type,
  application_id,
  created_at
)
SELECT
  la.client_id,
  la.metadata->'co_borrower'->>'name',
  la.metadata->'co_borrower'->>'email',
  la.metadata->'co_borrower'->>'phone',
  'co_borrower',
  la.id,
  la.created_at
FROM loan_applications la
WHERE la.metadata->'co_borrower' IS NOT NULL;

-- Link related_client_id if co-borrower is also a client
UPDATE client_relations cr
SET related_client_id = c.id
FROM clients c
WHERE cr.related_email IS NOT NULL
  AND LOWER(cr.related_email) = LOWER(c.email);
```

**Step 3.2: Detect and populate concordances**

```sql
-- Detect same email (should be 0 after deduplication)
INSERT INTO client_concordances (client_id_1, client_id_2, match_type, confidence_score)
SELECT
  LEAST(c1.id, c2.id),
  GREATEST(c1.id, c2.id),
  'same_email',
  1.00
FROM clients c1
JOIN clients c2 ON LOWER(c1.email) = LOWER(c2.email) AND c1.id != c2.id;

-- Detect same phone
INSERT INTO client_concordances (client_id_1, client_id_2, match_type, confidence_score)
SELECT DISTINCT
  LEAST(c1.id, c2.id),
  GREATEST(c1.id, c2.id),
  'same_phone',
  0.95
FROM clients c1
JOIN clients c2 ON c1.phone = c2.phone
  AND c1.id != c2.id
  AND c1.phone IS NOT NULL
ON CONFLICT DO NOTHING;

-- Detect similar names (fuzzy matching)
INSERT INTO client_concordances (client_id_1, client_id_2, match_type, confidence_score)
SELECT DISTINCT
  LEAST(c1.id, c2.id),
  GREATEST(c1.id, c2.id),
  'similar_name',
  similarity(c1.first_name || ' ' || c1.last_name, c2.first_name || ' ' || c2.last_name)
FROM clients c1
CROSS JOIN clients c2
WHERE c1.id != c2.id
  AND similarity(c1.first_name || ' ' || c1.last_name, c2.first_name || ' ' || c2.last_name) > 0.7
ON CONFLICT DO NOTHING;

-- Enable pg_trgm extension for similarity
CREATE EXTENSION IF NOT EXISTS pg_trgm;
```

### Phase 4: Migrate Communications & Documents (Week 4)

**Step 4.1: Migrate `email_messages` to `client_communications`**

```sql
INSERT INTO client_communications (
  client_id,
  communication_type,
  direction,
  subject,
  body,
  to_address,
  status,
  sent_at,
  opened_at,
  created_at
)
SELECT
  c.id,
  CASE
    WHEN em.message_type = 'sms' THEN 'sms'
    ELSE 'email'
  END,
  'outbound',
  em.subject,
  em.body,
  em.to_email,
  CASE
    WHEN em.metadata->>'opened' = 'true' THEN 'opened'
    WHEN em.metadata->>'bounced' = 'true' THEN 'bounced'
    WHEN em.sent_at IS NOT NULL THEN 'delivered'
    ELSE 'sent'
  END,
  em.sent_at,
  (em.metadata->>'opened_at')::timestamptz,
  em.created_at
FROM email_messages em
JOIN clients c ON LOWER(c.email) = LOWER(em.to_email);
```

**Step 4.2: Migrate `download_logs` to `client_documents`**

```sql
-- This requires mapping download logs to actual documents
-- Simplified version:
INSERT INTO client_documents (
  client_id,
  document_type,
  file_name,
  file_path,
  download_count,
  last_downloaded_at,
  created_at
)
SELECT
  c.id,
  'statement',  -- Infer from file_name
  dl.file_name,
  dl.file_path,
  1,
  dl.created_at,
  dl.created_at
FROM download_logs dl
JOIN clients c ON LOWER(c.email) = LOWER(dl.user_email);
```

### Phase 5: Update Application Code (Week 5-6)

**Step 5.1: Update API routes to use `clients` table**

```typescript
// OLD: Query by email
const applications = await supabase
  .from('loan_applications')
  .select('*')
  .eq('email', 'eric.tremblay@email.com');

// NEW: Query by client_id
const client = await supabase
  .from('clients')
  .select('*, loan_applications(*)')
  .eq('email', 'eric.tremblay@email.com')
  .single();
```

**Step 5.2: Update RPC functions**

```sql
-- Update get_client_dossier_unified to use clients table
CREATE OR REPLACE FUNCTION get_client_dossier_unified(...)
...
```

### Phase 6: Cleanup & Validation (Week 7)

**Step 6.1: Validate data integrity**

```sql
-- Check all applications have valid client_id
SELECT COUNT(*) FROM loan_applications WHERE client_id IS NULL;  -- Should be 0

-- Check all analyses have valid client_id
SELECT COUNT(*) FROM client_analyses WHERE client_id IS NULL;  -- Should be 0

-- Check orphaned external IDs
SELECT COUNT(*)
FROM client_external_ids cei
LEFT JOIN clients c ON cei.client_id = c.id
WHERE c.id IS NULL;  -- Should be 0
```

**Step 6.2: Remove redundant columns (optional)**

```sql
-- After confirming everything works, can drop redundant email columns
-- DO NOT do this until 100% confident
-- ALTER TABLE loan_applications DROP COLUMN email;
-- ALTER TABLE client_analyses DROP COLUMN client_email;
```

---

## 🎯 Benefits of Target Schema

### 1. Performance Improvements

| Operation | Before | After | Improvement |
|-----------|--------|-------|-------------|
| Find all client data | 10-15 queries | 1-2 queries | 85% reduction |
| Resolve external ID | Full table scan | Indexed lookup | 99% faster |
| Detect duplicates | N² comparison | Pre-computed table | Instant |
| Client search | Full-text scan | Indexed search | 90% faster |

### 2. Data Integrity

- ✅ All relationships enforced with foreign keys
- ✅ No orphaned records possible
- ✅ Cascading deletes properly handled
- ✅ Unique constraints prevent duplicates

### 3. Maintainability

- ✅ Single source of truth for client identity
- ✅ Clear relationship modeling
- ✅ Easier to add new external systems
- ✅ Audit trail for all changes

### 4. Scalability

- ✅ Normalized structure reduces storage
- ✅ Partitioning possible for time-series data
- ✅ Indexes optimized for query patterns
- ✅ Can shard by client_id if needed

---

## 📚 Related Documents

- `ORCHESTRATION_API_SPEC.md` - API using this schema
- `DB_VIEWS_AND_FUNCTIONS_PLAN.md` - RPC functions for this schema
- `DATAFLOW_CLIENT_DOSSIER.mmd` - Visual representation
- `DB_SCHEMA_INVENTORY.md` - Current schema (before migration)

---

**Status:** ✅ Ready for implementation
**Owner:** Backend Team + DBA + Frontend Team
**Timeline:** 7 weeks
**Risk Level:** MEDIUM (requires careful data migration)
**Rollback Plan:** Migrations are reversible, old tables kept until validation complete
