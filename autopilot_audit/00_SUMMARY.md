# SAR Autopilot Audit - Résumé Exécutif

**Projet**: Solution Argent Rapide (SAR)
**Date**: 2026-02-03
**Version**: 1.0.0
**Objectif**: Préparation CI/CD + Playwright + Vercel Preview + Supabase Staging

---

## 🎯 Vue d'Ensemble

### Stack Technique
- **Framework**: Next.js 14.2.35 (App Router)
- **Runtime**: Node.js (pages/API), Edge (middleware)
- **Language**: TypeScript 5.9.3
- **Base de Données**: Supabase (PostgreSQL + Storage + Real-time)
- **Hébergement**: Vercel (Production + Preview)
- **Auth**: JWT (jose) + cookies httpOnly
- **Tests**: Playwright (E2E) + Jest (Unit/Integration)

### Architecture

```
SAR (Monorepo Next.js)
├── App Router (/src/app)
│   ├── (site)         → Pages publiques
│   ├── admin/         → Dashboard admin (protégé)
│   ├── partners/      → Programme partenaires (subdomain)
│   ├── api/           → 100+ API routes
│   └── middleware.ts  → Auth + Telemetry + Routing
├── Tests
│   ├── e2e/           → Playwright (23 specs)
│   └── __tests__/     → Jest (unit/integration)
└── DB: Supabase
    ├── Production     → dllyzfuqjzuhvshrlmuq.supabase.co
    └── Staging        → À CRÉER
```

---

## 🔐 Authentification

### Mécanisme
- **Type**: JWT custom (jose library)
- **Storage**: Cookie httpOnly `admin-session`
- **Protection**: Middleware Next.js (src/middleware.ts)
- **Scope**: Routes `/admin/*` (sauf `/admin` login page)

### Flow
1. Login → `/api/admin/login` → Set cookie `admin-session`
2. Middleware vérifie JWT sur chaque requête `/admin/*`
3. Échec → Redirect vers `/admin`
4. Succès → Continue + inject `userRole='admin'` dans headers

### Points de Friction
- ❌ **Pas de refresh automatique**: JWT expire → user doit re-login
- ❌ **Session persistance faible**: Cookie expire arbitrairement
- ⚠️ **Multi-onglet**: Chaque onglet = session indépendante (pas de shared state)

---

## 🗄️ Base de Données

### Configuration Actuelle
- **Provider**: Supabase
- **Projet**: `dllyzfuqjzuhvshrlmuq` (PRODUCTION)
- **Accès**:
  - Client-side: `NEXT_PUBLIC_SUPABASE_ANON_KEY` (RLS enabled)
  - Server-side: `SUPABASE_SERVICE_ROLE_KEY` (bypass RLS)

### Usage de Service Role
**Fichiers critiques** (utilisent service_role):
- `src/lib/supabase-server.ts` (singleton client)
- `src/app/api/telemetry/track-event/route.ts`
- `src/app/api/admin/messages/route.ts`
- ~80 autres API routes

### Risques
- ⚠️ **Pas de DB staging** → Tests sur production
- ⚠️ **Service role partout** → Bypass RLS systématique
- ⚠️ **Migrations non versionnées** → Drift possible

---

## 🚀 Déploiement Actuel

### Vercel
- **Org**: project-ghostline
- **Domaines**:
  - Production: `solutionargentrapide.ca`
  - Admin: `admin.solutionargentrapide.ca`
  - Partners: `partners.solutionargentrapide.ca`
- **Branches**:
  - `main` → Production auto-deploy
  - Autres → Preview deployments (URLs générées)

### Environnements
| Env | DB | Vercel | Auth Cookie |
|-----|-------|--------|-------------|
| Production | dllyzfuq... | Production | admin-session |
| Preview | ⚠️ **PROD DB** | Preview | admin-session |
| Development | Local → PROD DB | Local | admin-session |

**PROBLÈME MAJEUR**: Aucun environnement staging isolé.

---

## 🧪 Tests Existants

### Playwright (E2E)
- **Config**: `e2e/playwright.config.ts`
- **Specs**: 23 fichiers dans `e2e/specs/`
- **Setup**: Auth via `auth.setup.ts` → storage state
- **Browsers**: Chromium (Chrome Desktop)
- **Base URL**: `process.env.BASE_URL` (défaut: localhost:4000)
- **Reporters**: HTML + JUnit + JSON

### Jest (Unit/Integration)
- **Config**: `jest.config.js`
- **Target**: `src/**/*.{test,spec}.{ts,tsx}`
- **Coverage**: 50% threshold (branches/functions/lines)
- **Setup**: `jest.setup.js` (custom matchers)

### Tests Actuels
**Playwright specs identifiés**:
- `smoke.spec.ts` → Tests de fumée génériques
- `quickbooks.spec.ts` → Tests QuickBooks
- `ga4-*.spec.ts` → Validation Google Analytics
- `seo-*.spec.ts` → Tests SEO
- `clients-sar.spec.ts` → Tests clients SAR
- `mobile-site-verification.spec.ts` → Tests mobile

**Couverture estimée**: ~30% des pages admin

---

## 🎯 Décisions Recommandées

### 1. Staging Database (CRITIQUE)
**Problème**: Tests E2E sur production → risque corruption data
**Solution**: Créer projet Supabase staging séparé

**Options**:
- **A) Projet Supabase staging** (recommandé)
  - Coût: $0 (free tier) ou $25/mois
  - Isolation: 100%
  - Data: Seed minimal via script SQL
  - CI: Use staging DB pour Preview + Tests

- **B) Branche DB staging** (non supporté Supabase)
  - ❌ Supabase ne supporte pas les branches DB

**Décision**: Option A - Créer projet staging

### 2. CI/CD Pipeline
**Recommandé**:
```yaml
Trigger: PR vers main
├── 1. Typecheck (tsc --noEmit)
├── 2. Lint (next lint)
├── 3. Unit Tests (jest)
├── 4. Deploy Preview (Vercel)
├── 5. E2E Tests (Playwright vs Preview URL)
└── 6. Report Results (PR comment)
```

### 3. Environment Variables Strategy
**Production**:
- Déjà configuré dans Vercel

**Preview** (à ajouter):
- `NEXT_PUBLIC_SUPABASE_URL` → **staging** URL
- `SUPABASE_SERVICE_ROLE_KEY` → **staging** key
- `JWT_SECRET` → **staging** secret (différent de prod)
- Autres: Copier depuis production

**CI Secrets** (GitHub Actions):
- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`
- `PLAYWRIGHT_BASE_URL` (dynamique via Vercel CLI)

### 4. Test Data Strategy
**Problème**: Tests E2E nécessitent data stable
**Solution**:
```sql
-- seed-staging.sql
INSERT INTO admin_users (id, email, password_hash) VALUES
  ('test-admin', 'admin@test.sar', '[REDACTED_HASH]');

INSERT INTO contact_messages (id, nom, email, status) VALUES
  (1, 'Test Client', 'test@example.com', 'nouveau');
```

**CI Setup**:
1. Deploy Preview → Vercel
2. Run seed script → Supabase staging
3. Run Playwright → Preview URL
4. Cleanup (optionnel)

### 5. Selectors Stables
**Problème**: Tests Playwright fragiles (CSS selectors changeants)
**Solution**: Ajouter `data-testid` attributes

**Exemple**:
```tsx
// Avant
<button className="bg-blue-500">Login</button>

// Après
<button data-testid="admin-login-button" className="bg-blue-500">
  Login
</button>
```

---

## ⚠️ Risques Identifiés

### Critique (P0)
1. **Pas de DB staging** → Tests sur production
2. **Service role partout** → Pas de RLS testing
3. **Secrets dans logs** → Risque exposition (mitigé par Vercel)

### Élevé (P1)
4. **Auth non testable E2E** → Setup fragile
5. **Migrations non versionnées** → Drift prod/dev
6. **Preview déploie sur PROD DB** → Risque corruption

### Moyen (P2)
7. **Tests E2E incomplets** → Couverture 30%
8. **Selectors CSS fragiles** → Tests cassent souvent
9. **Pas de /api/health** → Monitoring difficile

---

## 📊 Métriques Clés

| Métrique | Valeur |
|----------|--------|
| Pages publiques | ~15 |
| Pages admin | ~30 |
| API routes | ~120 |
| Tests E2E | 23 specs |
| Tests unitaires | ~5 (estimé) |
| Couverture tests | 30% (estimé) |
| Temps build | ~2 min |
| Temps deploy | ~4 min |
| Taille bundle | ~3.7 MB |

---

## 🎬 Next Actions (Top 10)

### Phase 1: Préparation (1-2h)
1. ✅ Lire cet audit complet
2. 📝 Créer projet Supabase staging
3. 🔑 Configurer variables Vercel Preview
4. 📦 Créer script `seed-staging.sql`

### Phase 2: CI/CD Setup (2-3h)
5. ⚙️ Créer `.github/workflows/ci.yml`
6. 🔐 Configurer GitHub Secrets
7. 🧪 Configurer Playwright pour Preview URLs
8. 📊 Ajouter health check `/api/health`

### Phase 3: Tests (3-4h)
9. 🎯 Définir 6-12 tests E2E smoke (voir 06_TEST_PLAN.md)
10. 🏷️ Ajouter data-testid aux composants critiques

**Temps total estimé**: 6-9 heures

---

## 📚 Documentation Complète

Voir les fichiers suivants pour détails:
- `01_REPO_INVENTORY.md` → Arborescence complète
- `02_ENV_VARS_MAP.md` → Variables d'environnement
- `03_AUTH_FLOW.md` → Flux d'authentification détaillé
- `04_API_SURFACE.md` → Inventaire complet des APIs
- `05_DB_STRATEGY.md` → Stratégie base de données
- `06_TEST_PLAN.md` → Plan de tests complet
- `07_CI_REQUIREMENTS.md` → Besoins CI/CD
- `08_GAPS_AND_FIXES.md` → Gaps et solutions

---

**Prêt pour handoff à un autre assistant** ✅
