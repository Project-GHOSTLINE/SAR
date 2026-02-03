# 02 - Environment Variables Map

**Projet**: SAR - Solution Argent Rapide
**Date**: 2026-02-03
**⚠️ AUCUNE VALEUR SECRÈTE DANS CE DOCUMENT**

---

## 📋 Inventaire Complet (Noms Uniquement)

### Variables Identifiées (.env.example)

#### Supabase (Database)
```bash
SUPABASE_PROJECT_ID              # ID du projet Supabase
SUPABASE_URL                     # URL du projet (https://xxx.supabase.co)
NEXT_PUBLIC_SUPABASE_URL         # URL publique (client-side)
NEXT_PUBLIC_SUPABASE_ANON_KEY    # Anon key (client-side, RLS enabled)
SUPABASE_SERVICE_KEY             # Service role key (server-side, bypass RLS)
SUPABASE_SERVICE_ROLE_KEY        # Alias de SUPABASE_SERVICE_KEY
```

#### Vercel (Hébergement)
```bash
VERCEL_TOKEN                     # CLI token
VERCEL_ORG_ID                    # Organization ID
VERCEL_OIDC_TOKEN                # OIDC token (auto-généré)
VERCEL_DRAIN_SECRET              # Drain secret (telemetry)
```

#### Email (Resend)
```bash
RESEND_API_KEY                   # API key Resend
FROM_EMAIL                       # Email expéditeur (format: Name <email>)
ADMIN_SIGNATURE_EMAIL            # Email signature admin
```

#### Sécurité Admin
```bash
ADMIN_PASSWORD                   # Mot de passe admin (clair)
ADMIN_PASSWORD_HASH              # Hash bcrypt du password
JWT_SECRET                       # Secret pour JWT signing (jose)
```

#### VoPay (Paiements)
```bash
VOPAY_ACCOUNT_ID                 # Account ID VoPay
VOPAY_API_KEY                    # API key VoPay
VOPAY_SHARED_SECRET              # Shared secret (webhooks)
VOPAY_API_URL                    # API URL (earthnode.vopay.com/api/v2/)
```

#### Cloudflare (Optionnel)
```bash
CLOUDFLARE_API_TOKEN             # API token
CLOUDFLARE_ACCOUNT_ID            # Account ID
```

#### GitHub (CI/CD)
```bash
GITHUB_PAT                       # Personal Access Token
```

#### Google Analytics 4
```bash
NEXT_PUBLIC_GA_MEASUREMENT_ID    # Measurement ID (public)
GA_PROPERTY_ID                   # Property ID (server)
GA_SERVICE_ACCOUNT_JSON          # Service account JSON (string)
```

#### Autres (identifiées dans .env.local)
```bash
MARGILL_ENDPOINT                 # Endpoint Margill API
MARGILL_ORIGIN                   # Origin Margill
MIRO_CLIENT_ID                   # Miro client ID
MIRO_CLIENT_SECRET               # Miro client secret
MIRO_ACCESS_TOKEN                # Miro access token
NEXT_PUBLIC_APP_URL              # App URL publique
INTUIT_CLIENT_ID                 # QuickBooks client ID
INTUIT_CLIENT_SECRET             # QuickBooks client secret
INTUIT_ENVIRONMENT               # QuickBooks env (sandbox/production)
INTUIT_WEBHOOK_TOKEN             # QuickBooks webhook token
SEMRUSH_API_KEY                  # SEMrush API key
SEMRUSH_API_URL                  # SEMrush API URL
TELEMETRY_WRITE_KEY              # Telemetry write key
TELEMETRY_HASH_SALT              # Telemetry hash salt
GOOGLE_DRIVE_FOLDER_ID           # Google Drive folder
GOOGLE_DRIVE_CREDENTIALS_PATH    # Path to credentials JSON
BLOB_READ_WRITE_TOKEN            # Vercel Blob token
NEXT_PUBLIC_BASE_URL             # Base URL (dev/prod)
```

---

## 🏷️ Catégorisation

### 1. Variables Publiques (NEXT_PUBLIC_*)
**Exposition**: Client-side (JavaScript bundle)
**Sécurité**: Valeurs publiques uniquement

| Variable | Usage | Sensible? |
|----------|-------|-----------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL Supabase (client) | Non |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon key (RLS) | Non |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | GA4 tracking ID | Non |
| `NEXT_PUBLIC_APP_URL` | App URL publique | Non |
| `NEXT_PUBLIC_BASE_URL` | Base URL (dev) | Non |

**Total**: 5 variables

### 2. Variables Server-Only (Secrets)
**Exposition**: Server-side uniquement
**Sécurité**: ⚠️ CRITIQUE - Ne jamais exposer

| Variable | Usage | Criticité |
|----------|-------|-----------|
| `SUPABASE_SERVICE_KEY` | DB access (bypass RLS) | 🔴 CRITIQUE |
| `SUPABASE_SERVICE_ROLE_KEY` | Alias service key | 🔴 CRITIQUE |
| `JWT_SECRET` | JWT signing | 🔴 CRITIQUE |
| `ADMIN_PASSWORD` | Admin login | 🔴 CRITIQUE |
| `ADMIN_PASSWORD_HASH` | Bcrypt hash | 🟡 Sensible |
| `RESEND_API_KEY` | Email sending | 🟡 Sensible |
| `VOPAY_API_KEY` | Paiements | 🔴 CRITIQUE |
| `VOPAY_SHARED_SECRET` | Webhook validation | 🔴 CRITIQUE |
| `CLOUDFLARE_API_TOKEN` | Cloudflare API | 🟡 Sensible |
| `GITHUB_PAT` | GitHub API | 🟡 Sensible |
| `GA_SERVICE_ACCOUNT_JSON` | GA4 API | 🟡 Sensible |
| `INTUIT_CLIENT_SECRET` | QuickBooks OAuth | 🔴 CRITIQUE |
| `MIRO_CLIENT_SECRET` | Miro OAuth | 🟡 Sensible |
| `MIRO_ACCESS_TOKEN` | Miro API | 🟡 Sensible |
| `SEMRUSH_API_KEY` | SEO data | 🟡 Sensible |
| `TELEMETRY_WRITE_KEY` | Telemetry security | 🟡 Sensible |
| `TELEMETRY_HASH_SALT` | Hash anonymization | 🟡 Sensible |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob | 🟡 Sensible |
| `VERCEL_TOKEN` | CLI deploy | 🔴 CRITIQUE |

**Total**: 19 variables
**Critiques**: 7
**Sensibles**: 12

### 3. Variables Configuration (Non-sensibles)
**Exposition**: Server-side
**Sécurité**: Valeurs publiques/configurables

| Variable | Usage | Exemple |
|----------|-------|---------|
| `SUPABASE_PROJECT_ID` | Project ID | `dllyzfuq...` |
| `SUPABASE_URL` | Database URL | `https://xxx.supabase.co` |
| `VOPAY_ACCOUNT_ID` | Account name | `solutionargentrapideinc` |
| `VOPAY_API_URL` | API endpoint | `https://earthnode...` |
| `CLOUDFLARE_ACCOUNT_ID` | Account ID | (hash) |
| `VERCEL_ORG_ID` | Org ID | `team_xxx` |
| `GA_PROPERTY_ID` | Property ID | `340237010` |
| `INTUIT_ENVIRONMENT` | Environment | `sandbox` ou `production` |
| `INTUIT_WEBHOOK_TOKEN` | Webhook UUID | (UUID) |
| `SEMRUSH_API_URL` | API URL | `https://api.semrush.com` |
| `MARGILL_ENDPOINT` | API endpoint | `https://argentrapide...` |
| `MARGILL_ORIGIN` | Origin | `argentrapide` |
| `MIRO_CLIENT_ID` | Client ID | (numeric) |
| `FROM_EMAIL` | Sender email | `SAR <noreply@...>` |
| `ADMIN_SIGNATURE_EMAIL` | Signature email | `anthony@...` |
| `NEXT_PUBLIC_APP_URL` | App URL | `https://admin...` |
| `GOOGLE_DRIVE_FOLDER_ID` | Folder ID | (alphanumeric) |
| `GOOGLE_DRIVE_CREDENTIALS_PATH` | File path | `/path/to/json` |

**Total**: 18 variables

### 4. Variables CI-Only
**Usage**: GitHub Actions uniquement
**Source**: À configurer dans GitHub Secrets

| Variable | Usage | Nécessaire? |
|----------|-------|-------------|
| `VERCEL_TOKEN` | Deploy previews | ✅ Oui |
| `VERCEL_ORG_ID` | Org identification | ✅ Oui |
| `VERCEL_PROJECT_ID` | Project identification | ✅ Oui |
| `SUPABASE_ACCESS_TOKEN` | DB migrations (staging) | ✅ Oui |
| `PLAYWRIGHT_BASE_URL` | E2E target URL | ⚠️ Dynamique |

**Notes**:
- `PLAYWRIGHT_BASE_URL` = Preview URL (récupéré via Vercel CLI)
- Variables Supabase staging différentes de production

---

## 📊 Usage de Service Role Key

### Fichiers Utilisant SUPABASE_SERVICE_ROLE_KEY

**Critiques (accès direct)**:
```
src/lib/supabase-server.ts:42
  → Singleton client (utilisé partout)

src/app/api/telemetry/track-event/route.ts:18
  → createClient() direct (à migrer vers getSupabaseServer())

src/app/api/admin/messages/route.ts:39
  → Via getSupabaseServer()
```

**Autres (via getSupabaseServer())**:
- ~80 API routes dans `src/app/api/`
- Toutes les routes admin
- Toutes les routes webhooks
- Toutes les routes cron

### Bypass RLS
⚠️ **ATTENTION**: Service role bypasse Row Level Security

**Impact**:
- ✅ Avantage: Accès simplifié server-side
- ❌ Risque: Pas de testing RLS policies
- ❌ Risque: Exposition accidentelle si leak

**Recommandation**:
- Garder service role pour admin/internal APIs
- Utiliser anon key + RLS pour user-facing APIs (future)

---

## 🎯 Stratégie par Environnement

### Development (Local)
**Source**: `.env.local`
```bash
# Database
NEXT_PUBLIC_SUPABASE_URL=[PROD_URL]         # ⚠️ Pointe vers PROD
SUPABASE_SERVICE_ROLE_KEY=[PROD_KEY]        # ⚠️ Service role PROD

# Auth
JWT_SECRET=[DEV_SECRET]                     # Secret dev

# Autres
BASE_URL=http://localhost:3000
```

**Problème**: Dev utilise production DB

### Preview (Vercel)
**Source**: Vercel Environment Variables (Preview scope)
```bash
# Database (À CRÉER - STAGING)
NEXT_PUBLIC_SUPABASE_URL=[STAGING_URL]      # 🎯 URL staging
SUPABASE_SERVICE_ROLE_KEY=[STAGING_KEY]     # 🎯 Key staging

# Auth (DIFFÉRENT de prod)
JWT_SECRET=[PREVIEW_SECRET]                 # Secret preview unique

# Autres (copier depuis prod)
VOPAY_API_URL=[SANDBOX_URL]                 # Sandbox VoPay
INTUIT_ENVIRONMENT=sandbox                  # QuickBooks sandbox
```

### Production (Vercel)
**Source**: Vercel Environment Variables (Production scope)
```bash
# Database
NEXT_PUBLIC_SUPABASE_URL=[PROD_URL]         # Production
SUPABASE_SERVICE_ROLE_KEY=[PROD_KEY]        # Production

# Auth
JWT_SECRET=[PROD_SECRET]                    # Secret production

# Toutes les autres variables configurées
```

---

## 🔐 Sécurité & Best Practices

### ✅ Bonnes Pratiques Actuelles
1. ✅ `.env.local` dans `.gitignore`
2. ✅ `.env.example` avec placeholders (pas de secrets)
3. ✅ Séparation NEXT_PUBLIC_* vs server-only
4. ✅ JWT secret séparé du code

### ⚠️ Améliorations Nécessaires

#### 1. Rotation des Secrets
**Actuellement**: Secrets jamais rotés
**Recommandation**:
```bash
# Tous les 90 jours
- JWT_SECRET (générer nouveau via openssl rand -base64 32)
- TELEMETRY_WRITE_KEY (régénérer)
- TELEMETRY_HASH_SALT (régénérer)

# Annuellement
- Tous les API keys (Resend, VoPay, etc.)
```

#### 2. Validation au Démarrage
**Créer**: `src/lib/validate-env.ts`
```typescript
// Valider que toutes les vars critiques existent
const required = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'JWT_SECRET',
  // ...
]

required.forEach(key => {
  if (!process.env[key]) {
    throw new Error(`Missing required env var: ${key}`)
  }
})
```

#### 3. Secrets Management
**Option A**: Vercel (actuel)
- ✅ Chiffrement at-rest
- ✅ UI pour management
- ❌ Pas de rotation automatique

**Option B**: GitHub Actions Secrets (CI)
- ✅ Isolé de Vercel
- ✅ Rotation manuelle facile
- ✅ Audit logs

**Recommandation**: Utiliser les deux
- Vercel → Runtime vars (prod/preview)
- GitHub → CI-only vars (deploy, test)

---

## 📝 Checklist Configuration

### Pour CI/CD Setup

#### GitHub Secrets (À créer)
```bash
# Vercel Deploy
- VERCEL_TOKEN                    # Pour deploy previews
- VERCEL_ORG_ID                   # Org ID
- VERCEL_PROJECT_ID               # Project ID (récupérer via CLI)

# Supabase Staging (À créer projet)
- STAGING_SUPABASE_URL            # URL projet staging
- STAGING_SUPABASE_SERVICE_KEY    # Service key staging
- STAGING_SUPABASE_ANON_KEY       # Anon key staging

# Auth Staging
- STAGING_JWT_SECRET              # Secret JWT unique
```

#### Vercel Env Vars Preview (À configurer)
```bash
# Database → Pointer vers STAGING
NEXT_PUBLIC_SUPABASE_URL=[STAGING_URL]
SUPABASE_SERVICE_ROLE_KEY=[STAGING_KEY]
NEXT_PUBLIC_SUPABASE_ANON_KEY=[STAGING_ANON]

# Auth → Secret unique preview
JWT_SECRET=[PREVIEW_SECRET]

# Autres → Copier depuis prod ou sandbox
VOPAY_API_URL=https://earthnode.vopay.com/api/v2/
VOPAY_ACCOUNT_ID=[SANDBOX_ACCOUNT]
VOPAY_API_KEY=[SANDBOX_KEY]
INTUIT_ENVIRONMENT=sandbox
# ... etc
```

---

## 🎯 Actions Recommandées

### Immédiat (avant CI/CD)
1. ✅ Créer projet Supabase staging
2. ✅ Générer JWT_SECRET staging unique
3. ✅ Configurer Vercel env vars (Preview scope)
4. ✅ Créer GitHub secrets

### Court terme (avec CI/CD)
5. 📝 Créer `validate-env.ts`
6. 📝 Documenter vars dans `README.md`
7. 🔄 Tester preview avec staging DB

### Moyen terme (amélioration continue)
8. 🔐 Mettre en place rotation secrets (90j)
9. 📊 Auditer usage service_role_key
10. 🔒 Migrer vers RLS où possible

---

**Total**: ~42 variables d'environnement identifiées
**Critiques**: 7
**Sensibles**: 12
**Config**: 18
**Publiques**: 5

**Prêt pour configuration CI/CD** ✅
