# 05 - Database Strategy

**Projet**: SAR - Solution Argent Rapide
**Date**: 2026-02-03

---

## 🗄️ Configuration Actuelle

### Production Database
**Provider**: Supabase
**Projet**: `dllyzfuqjzuhvshrlmuq`
**URL**: `https://dllyzfuqjzuhvshrlmuq.supabase.co`

**Specs**:
- **Database**: PostgreSQL 15+
- **Storage**: Supabase Storage (files/blobs)
- **Realtime**: WebSocket subscriptions
- **Auth**: Supabase Auth (non utilisé - custom JWT)

---

## 🔌 Code Access Patterns

### 1. Client-Side Access (Browser)
**Fichier**: `src/lib/supabase.ts`

```typescript
// Client Supabase (anon key + RLS)
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
```

**Usage**:
- ❌ **Actuellement**: Presque jamais utilisé (custom auth)
- ✅ **Devrait être utilisé**: Public queries avec RLS

**RLS Policies**:
- ⚠️ Status inconnu (migrations non versionnées)
- Probablement désactivé sur la plupart des tables

### 2. Server-Side Access (API Routes)
**Fichier**: `src/lib/supabase-server.ts` (⚠️ CRITIQUE)

```typescript
// Singleton pattern pour performance
let serverClient: SupabaseClient | null = null

export function getSupabaseServer(): SupabaseClient {
  if (serverClient) return serverClient

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  serverClient = createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    global: {
      fetch: (url, options) => {
        const start = Date.now()
        return fetch(url, options).then(res => {
          const duration = Date.now() - start

          // Log slow queries
          if (duration > 100) {
            console.warn({
              type: 'slow_query',
              url,
              duration_ms: duration
            })
          }

          return res
        })
      }
    }
  })

  return serverClient
}
```

**Usage**:
- ✅ **Performance**: Singleton évite recreate client
- ⚠️ **Service Role**: Bypass RLS (accès total)
- ✅ **Monitoring**: Slow query logging (>100ms)

**Fichiers utilisant getSupabaseServer()**:
- ~80 API routes
- Toutes les routes admin
- Telemetry routes
- QuickBooks sync routes

### 3. Audited Access
**Fichier**: `src/lib/supabase-with-audit.ts`

```typescript
// Wrapper avec audit trail
export function getSupabaseWithAudit(userId: string) {
  const supabase = getSupabaseServer()

  // Intercept toutes les queries
  // Log dans table audit_logs
}
```

**Usage**: ⚠️ Peu utilisé actuellement

---

## 📊 Tables Identifiées (estimé)

### Core Business
```sql
-- Messages & Support
contact_messages            -- Demandes de contact
emails_envoyes              -- Emails envoyés (tracking)
notes                       -- Notes internes
support_tickets             -- Tickets support

-- Clients & Applications
clients_sar                 -- Clients SAR
applications                -- Demandes de prêt

-- Payments
vopay_transactions          -- Transactions VoPay
vopay_webhooks              -- Logs webhooks VoPay

-- Contracts
contrats_clients            -- Contrats clients
contrats_templates          -- Templates de contrats
```

### Analytics & Telemetry
```sql
telemetry_requests          -- Logs requests HTTP
telemetry_events            -- Events custom (GA-like)
admin_login_logs            -- Logs login admin (à créer)
```

### Integrations
```sql
quickbooks_customers        -- Sync QuickBooks
quickbooks_invoices         -- Invoices QB
quickbooks_tokens           -- OAuth tokens QB

seo_keywords                -- Keywords tracking
seo_analytics               -- Analytics data
```

### Admin & Config
```sql
admin_users                 -- Users admin (à créer?)
blacklist                   -- Email/IP blacklist
downloads                   -- Files downloads tracking
```

**Total estimé**: 25-30 tables

---

## 📝 Migrations Strategy

### Actuel: ❌ **Pas de Migrations Versionnées**

**Problème**:
- Folder `supabase/migrations/` vide
- Changements DB = SQL direct via Supabase UI
- Pas de version control des schémas
- Impossible de recréer DB from scratch

**Risques**:
- ⚠️ **Drift**: Prod DB != Dev DB
- ⚠️ **Pas de rollback**: Si migration casse, restore backup manuel
- ⚠️ **Staging impossible**: Can't recreate schema

### Recommandé: ✅ **Supabase CLI Migrations**

**Setup**:
```bash
# 1. Install Supabase CLI
npm install -g supabase

# 2. Login
supabase login

# 3. Init project (link to prod)
supabase init
supabase link --project-ref dllyzfuqjzuhvshrlmuq

# 4. Pull current schema
supabase db pull --schema public

# Result: Creates migration file in supabase/migrations/
```

**Workflow**:
```bash
# Development
1. Make schema change in Supabase UI (prod)
2. Pull migration: supabase db pull
3. Commit migration file to git
4. Apply to staging: supabase db push --db-url [STAGING_URL]

# Or: Create migration locally first
1. supabase migration new add_table_xyz
2. Edit migration file (SQL)
3. Apply locally: supabase db reset
4. Test
5. Push to prod: supabase db push
```

**Bénéfices**:
- ✅ Version control schemas
- ✅ Reproducible DB setup
- ✅ Staging DB can be seeded from migrations
- ✅ Rollback possible (revert migration)

---

## 🎯 Staging Database Strategy

### Problème Actuel
**Tous les environnements pointent vers PROD**:
- Local dev → PROD DB
- Vercel Preview → PROD DB
- CI/CD tests → PROD DB

**Risques**:
- 🔴 **Tests E2E modifient production**
- 🔴 **Data corruption possible**
- 🔴 **Impossible de tester migrations**

### Solution: Projet Supabase Staging

#### Option A: Projet Staging Séparé (✅ Recommandé)

**Setup**:
```bash
# 1. Créer nouveau projet Supabase
# Nom: sar-staging
# Region: même que prod
# Plan: Free tier ($0) ou Pro ($25/mois)

# 2. Récupérer credentials
STAGING_SUPABASE_URL=https://[project-id].supabase.co
STAGING_SUPABASE_ANON_KEY=eyJxxx...
STAGING_SUPABASE_SERVICE_KEY=eyJxxx...

# 3. Appliquer schema depuis migrations
supabase db push --db-url postgresql://postgres:[PASSWORD]@[project-id].supabase.co:5432/postgres

# 4. Seed data
psql postgresql://postgres:[PASSWORD]@[project-id].supabase.co:5432/postgres < seed-staging.sql
```

**Avantages**:
- ✅ Isolation complète (0% risque prod)
- ✅ Can be reset anytime
- ✅ Free tier disponible (500 MB)

**Inconvénients**:
- ⚠️ Coût: $0-25/mois
- ⚠️ Sync manual des schemas (via migrations)
- ⚠️ Data staging != prod (seed fixtures)

#### Option B: Database Branching (❌ Non supporté)

Supabase ne supporte pas de branches DB (comme Planetscale/Neon).

---

## 🌱 Seed Strategy

### Seed Minimal (Staging)

**Objectif**: Data stable pour tests E2E

```sql
-- seed-staging.sql

-- 1. Admin user (test)
INSERT INTO admin_users (id, email, password_hash) VALUES
  ('test-admin', 'admin@test.sar', '[STAGING_HASH]');

-- 2. Messages (fixtures)
INSERT INTO contact_messages (id, nom, email, telephone, question, status) VALUES
  (1, 'Test Client', 'test@example.com', '555-0001', 'Question test', 'nouveau'),
  (2, 'Jane Doe', 'jane@example.com', '555-0002', 'Another test', 'en_cours'),
  (3, 'John Smith', 'john@example.com', '555-0003', 'Completed test', 'termine');

-- 3. VoPay transactions (fixtures)
INSERT INTO vopay_transactions (transaction_id, amount, status) VALUES
  ('TEST-001', 100.00, 'completed'),
  ('TEST-002', 200.00, 'pending'),
  ('TEST-003', 50.00, 'failed');

-- 4. QuickBooks tokens (mock - won't work but tests won't crash)
INSERT INTO quickbooks_tokens (access_token, refresh_token, expires_at) VALUES
  ('mock-access', 'mock-refresh', NOW() + INTERVAL '1 hour');
```

**Usage**:
```bash
# Apply seed après migrations
psql [STAGING_DB_URL] < seed-staging.sql
```

**Maintenance**:
```bash
# Reset staging DB (weekly?)
supabase db reset --db-url [STAGING_URL]
psql [STAGING_DB_URL] < seed-staging.sql
```

---

## 🔒 RLS (Row Level Security)

### Status Actuel: ⚠️ **Probablement Désactivé**

**Hypothèse**:
- Service role utilisé partout = Bypass RLS
- Pas de policies définies (pas de migrations)

**Vérification**:
```sql
-- Check si RLS enabled sur tables
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public';
```

**Recommandation future**:
```sql
-- Exemple: Messages table avec RLS
ALTER TABLE contact_messages ENABLE ROW LEVEL SECURITY;

-- Policy: Admin peut tout voir
CREATE POLICY admin_all ON contact_messages
  FOR ALL
  TO authenticated
  USING (auth.role() = 'admin');

-- Policy: Public peut créer seulement
CREATE POLICY public_insert ON contact_messages
  FOR INSERT
  TO anon
  WITH CHECK (true);
```

**Bénéfices**:
- ✅ Sécurité renforcée
- ✅ Testable (anon key vs service role)
- ✅ Fine-grained access control

---

## 📋 Checklist Staging Setup

### 1. Créer Projet Staging
- [ ] Créer projet Supabase `sar-staging`
- [ ] Récupérer URL, anon key, service key
- [ ] Configurer dans GitHub Secrets

### 2. Migrations
- [ ] Install Supabase CLI
- [ ] Pull schema production: `supabase db pull`
- [ ] Commit migrations dans git
- [ ] Apply to staging: `supabase db push --db-url [STAGING]`

### 3. Seed Data
- [ ] Créer `seed-staging.sql`
- [ ] Appliquer seed: `psql [STAGING_URL] < seed.sql`
- [ ] Vérifier data via Supabase UI

### 4. Configure Environments
- [ ] Vercel Preview env vars → Staging DB
- [ ] GitHub Actions env vars → Staging DB
- [ ] Local `.env.test` → Staging DB

### 5. Test
- [ ] Run migrations locally
- [ ] Run seed locally
- [ ] Test E2E vs staging
- [ ] Verify isolation (prod untouched)

---

## 🎯 Recommandations

### Immédiat (avant CI/CD)
1. ✅ **Créer** projet Supabase staging
2. ✅ **Pull** schema production (migrations)
3. ✅ **Créer** seed-staging.sql
4. ✅ **Appliquer** migrations + seed sur staging

### Court Terme (avec CI/CD)
5. 🔄 **Automatiser** seed refresh (cron weekly)
6. 📊 **Monitor** staging DB usage
7. 🧪 **Tests** migrations avant apply prod
8. 📝 **Documenter** migration workflow

### Moyen Terme (amélioration)
9. 🔒 **Enable** RLS sur tables sensibles
10. 🎯 **Réduire** usage service_role (use anon + RLS)
11. 📈 **Optimize** slow queries (>500ms)
12. 🔐 **Encrypt** sensitive columns (PII)

---

**Database strategy documentée** ✅
**Staging setup planifié** ✅
**Migrations strategy définie** ✅
