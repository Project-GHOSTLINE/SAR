# 01 - Repository Inventory

**Projet**: SAR - Solution Argent Rapide
**Date**: 2026-02-03

---

## 📁 Arborescence Pertinente

```
/Users/xunit/Desktop/Projets/sar/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── (site)/                   # Pages publiques (route group)
│   │   │   ├── page.tsx              # Homepage
│   │   │   ├── demande-de-pret-en-ligne-formulaire/
│   │   │   ├── politique-de-confidentialite/
│   │   │   ├── faq/
│   │   │   ├── ibv/
│   │   │   ├── nous-joindre/
│   │   │   └── ...
│   │   ├── admin/                    # Dashboard admin (protégé)
│   │   │   ├── layout.tsx            # Layout simple (passthrough)
│   │   │   ├── page.tsx              # Login page
│   │   │   ├── dashboard/            # Main dashboard
│   │   │   │   └── page.tsx          # [CRITIQUE] 1000+ lignes
│   │   │   ├── messages/             # Gestion messages
│   │   │   ├── vopay/                # VoPay dashboard
│   │   │   ├── quickbooks/           # QuickBooks integration
│   │   │   ├── analytics/            # Analytics dashboard
│   │   │   ├── seo-hub/              # SEO tools
│   │   │   ├── dataflow/             # Telemetry dashboard
│   │   │   ├── webhooks/             # Webhooks monitoring
│   │   │   ├── performance/          # Performance monitoring
│   │   │   ├── blacklist/            # Email blacklist
│   │   │   ├── data-explorer/        # Database explorer
│   │   │   ├── contrats-clients/     # Client contracts
│   │   │   ├── contrats-signature/   # Contract templates
│   │   │   ├── downloads/            # File downloads
│   │   │   └── ...                   # ~30 pages total
│   │   ├── partners/                 # Partners subdomain
│   │   │   ├── page.tsx              # Partners login
│   │   │   ├── dashboard/
│   │   │   ├── credits/
│   │   │   ├── feedback/
│   │   │   └── ...
│   │   ├── api/                      # API Routes (120+ endpoints)
│   │   │   ├── admin/                # Admin APIs
│   │   │   │   ├── login/route.ts
│   │   │   │   ├── logout/route.ts
│   │   │   │   ├── messages/route.ts
│   │   │   │   ├── vopay/
│   │   │   │   ├── webhooks/
│   │   │   │   └── ...
│   │   │   ├── telemetry/            # Telemetry APIs
│   │   │   │   ├── track-event/route.ts
│   │   │   │   ├── write/route.ts
│   │   │   │   └── ...
│   │   │   ├── webhooks/             # Webhook handlers
│   │   │   │   ├── vopay/route.ts
│   │   │   │   ├── quickbooks/route.ts
│   │   │   │   └── ...
│   │   │   ├── cron/                 # Cron jobs
│   │   │   ├── quickbooks/           # QuickBooks APIs
│   │   │   ├── seo/                  # SEO APIs
│   │   │   ├── download/             # File downloads
│   │   │   └── ...
│   │   └── middleware.ts             # [CRITIQUE] Auth + Routing + Telemetry
│   ├── components/                   # React components
│   │   ├── admin/
│   │   │   ├── AdminSidebar.tsx      # [CRITIQUE] Navigation
│   │   │   ├── SupportView.tsx
│   │   │   ├── AnalysesView.tsx
│   │   │   ├── VoPayMetricsTab.tsx
│   │   │   └── ...
│   │   ├── ui/                       # UI primitives
│   │   └── ...
│   └── lib/                          # Utilities
│       ├── supabase.ts               # Client-side Supabase
│       ├── supabase-server.ts        # [CRITIQUE] Server-side singleton
│       ├── supabase-memory.ts        # Memory storage
│       ├── supabase-with-audit.ts    # Audited client
│       ├── quickbooks/
│       ├── utils/
│       └── ...
├── e2e/                              # Playwright E2E tests
│   ├── playwright.config.ts          # [CRITIQUE] Config
│   ├── specs/                        # Test specs (23 fichiers)
│   │   ├── smoke.spec.ts
│   │   ├── auth.setup.ts             # Auth setup
│   │   ├── quickbooks.spec.ts
│   │   ├── ga4-*.spec.ts
│   │   ├── seo-*.spec.ts
│   │   ├── clients-sar.spec.ts
│   │   └── ...
│   └── storage/
│       └── state.json                # Auth storage state
├── public/                           # Static assets
│   ├── downloads/                    # Downloadable files
│   └── ...
├── scripts/                          # Utility scripts
│   ├── scan-api-routes.ts
│   ├── verify-all-routes.js
│   ├── test-activity-logging.mjs
│   └── ...
├── postman/                          # API tests (Newman)
│   ├── collections/
│   ├── environments/
│   └── run.sh
├── supabase/                         # Supabase config (vide?)
│   └── migrations/
├── test-artifacts/                   # Test outputs
│   ├── playwright-report/
│   ├── traces/
│   └── junit.xml
├── package.json                      # [CRITIQUE] Dependencies + scripts
├── next.config.js                    # [CRITIQUE] Next.js config
├── tsconfig.json                     # TypeScript config
├── jest.config.js                    # Jest config
├── .env.local                        # Local env vars (gitignored)
├── .env.example                      # Template env vars
├── .env.test                         # Test env vars
├── .env.production                   # Production env vars
└── .gitignore
```

---

## 🗂️ Convention de Routing

### App Router (Next.js 14)
SAR utilise **100% App Router** (pas de Pages Router).

**Structure**:
```
app/
├── (site)/          → Route group (pas de segment URL)
│   └── page.tsx     → URL: /
├── admin/
│   └── page.tsx     → URL: /admin
│   └── dashboard/
│       └── page.tsx → URL: /admin/dashboard
└── api/
    └── admin/
        └── login/
            └── route.ts → URL: /api/admin/login
```

**Particularités**:
- **Route groups**: `(site)` = pages publiques sans prefix
- **Layouts**: Layout simple dans `admin/layout.tsx` (passthrough)
- **Middleware**: Gère auth + subdomain routing + telemetry
- **API Routes**: Convention `route.ts` (GET/POST/PATCH/DELETE exports)

---

## 📝 Scripts package.json

### Development
```bash
npm run dev              # Next.js dev server (port 3000)
npm run dev:4000         # Next.js dev server (port 4000)
npm run build            # Production build
npm run start            # Production server
npm run lint             # ESLint
```

### Testing
```bash
npm run test                    # Jest (unit/integration)
npm run test:watch              # Jest watch mode
npm run test:coverage           # Jest with coverage
npm run test:telemetry          # Test telemetry lib
npm run validate:telemetry      # Validate telemetry endpoints
npm run load:telemetry          # Load test telemetry
npm run test:routes             # Verify all routes
npm run test:view               # Open route test report

# API Testing (Newman)
npm run api:test                # Run API tests (dev)
npm run api:test:dev            # Dev environment
npm run api:test:staging        # Staging environment
npm run api:test:prod           # Production environment
npm run api:test:quick          # Quick API smoke tests
npm run api:report              # Open API test report

# E2E Testing (Playwright)
npm run analyze:site            # Analyze site structure
npm run analyze:report          # Open analysis report
npm run analyze:quickbooks      # Analyze QuickBooks integration
```

### Utilities
```bash
npm run api:scan                # Scan API routes
npm run api:explore             # Open API explorer
npm run memory:load             # Load memory data
npm run memory:init             # Initialize memory
npm run recon                   # Deep reconnaissance
npm run recon:view              # View recon report

# Webhooks
npm run webhook:configure       # Configure VoPay webhooks
npm run webhook:test            # Test webhooks (local)
npm run webhook:test:prod       # Test webhooks (prod)
npm run webhook:verify          # Verify webhook data
npm run webhook:migrate         # Migrate old webhooks
```

---

## 🛠️ Outils Présents

### Testing & QA
| Outil | Version | Usage |
|-------|---------|-------|
| Playwright | 1.58.0 | E2E tests |
| Jest | 30.2.0 | Unit/integration tests |
| @testing-library/react | 16.3.2 | React component tests |
| @testing-library/jest-dom | 6.9.1 | Custom matchers |
| Newman | 6.2.2 | API tests (Postman) |

### Build & Dev
| Outil | Version | Usage |
|-------|---------|-------|
| Next.js | 14.2.35 | Framework |
| TypeScript | 5.9.3 | Language |
| Tailwind CSS | 3.4.0 | Styling |
| PostCSS | 8.5.6 | CSS processing |
| ESLint | (next/core-web-vitals) | Linting |

### Database & Backend
| Outil | Version | Usage |
|-------|---------|-------|
| @supabase/supabase-js | 2.88.0 | Supabase client |
| pg | 8.16.3 | PostgreSQL client |
| bcryptjs | 3.0.3 | Password hashing |
| jose | 6.1.3 | JWT handling |
| zod | 4.3.5 | Schema validation |

### External Integrations
| Outil | Version | Usage |
|-------|---------|-------|
| @google-analytics/data | 5.2.1 | GA4 reporting |
| googleapis | 170.1.0 | Google APIs |
| resend | 6.9.1 | Email sending |
| @vercel/analytics | 1.6.1 | Vercel Analytics |
| @vercel/speed-insights | 1.3.1 | Speed Insights |
| @vercel/blob | 2.0.1 | Blob storage |

### UI Libraries
| Outil | Version | Usage |
|-------|---------|-------|
| @headlessui/react | 2.2.9 | Accessible UI components |
| @heroicons/react | 2.2.0 | Icons |
| lucide-react | 0.294.0 | Icons |
| framer-motion | 12.26.2 | Animations |
| recharts | 3.7.0 | Charts |
| d3 | 7.9.0 | Data visualization |

---

## 📊 Fichiers Critiques

### Configuration
| Fichier | Rôle | Criticité |
|---------|------|-----------|
| `src/middleware.ts` | Auth + Routing + Telemetry | ⚠️ CRITIQUE |
| `next.config.js` | Next.js config + CSP | ⚠️ CRITIQUE |
| `package.json` | Dependencies + Scripts | ⚠️ CRITIQUE |
| `tsconfig.json` | TypeScript config | Importante |
| `jest.config.js` | Jest config | Importante |
| `e2e/playwright.config.ts` | Playwright config | ⚠️ CRITIQUE |

### Application Core
| Fichier | Rôle | Criticité |
|---------|------|-----------|
| `src/lib/supabase-server.ts` | DB client singleton | ⚠️ CRITIQUE |
| `src/components/admin/AdminSidebar.tsx` | Navigation admin | Importante |
| `src/app/admin/dashboard/page.tsx` | Dashboard principal (1000+ lignes) | ⚠️ CRITIQUE |
| `src/app/api/admin/login/route.ts` | Authentication | ⚠️ CRITIQUE |
| `src/app/api/telemetry/track-event/route.ts` | Event tracking | Importante |

### Tests
| Fichier | Rôle | Criticité |
|---------|------|-----------|
| `e2e/specs/auth.setup.ts` | Playwright auth setup | ⚠️ CRITIQUE |
| `e2e/specs/smoke.spec.ts` | Smoke tests | Importante |
| `jest.setup.js` | Jest configuration | Importante |

---

## 🔍 Observations

### Points Positifs ✅
- ✅ Structure App Router claire et organisée
- ✅ TypeScript strict mode enabled
- ✅ Tests E2E et unitaires configurés
- ✅ Scripts npm bien organisés
- ✅ Middleware centralisé pour auth/routing

### Points d'Attention ⚠️
- ⚠️ `admin/dashboard/page.tsx` trop large (1000+ lignes) → Refactoring
- ⚠️ Pas de dossier `__tests__/` structuré → Tests unitaires éparpillés
- ⚠️ `supabase/migrations/` vide → Migrations non versionnées
- ⚠️ Multiples fichiers `.env*` → Risque confusion
- ⚠️ `progression/` folder présent mais non documenté

### Gaps ❌
- ❌ Pas de `cypress/` (Playwright seulement)
- ❌ Pas de `.github/workflows/` (CI/CD à créer)
- ❌ Pas de `docker-compose.yml` (local DB?)
- ❌ Pas de `docs/` centralisé
- ❌ Pas de `CONTRIBUTING.md`

---

## 📦 Size Metrics

| Métrique | Valeur |
|----------|--------|
| Total files | ~2000+ (avec node_modules) |
| Source files (.ts/.tsx) | ~200+ (estimé) |
| API routes | ~120 |
| Pages | ~50+ |
| Components | ~50+ (estimé) |
| Tests E2E | 23 specs |
| Tests unitaires | ~5-10 (estimé) |
| node_modules size | ~500 MB |
| Build output (.next) | ~150 MB |
| Bundle size | 3.7 MB (prod) |

---

## 🎯 Recommandations

### Structure
1. **Créer** `src/app/admin/__tests__/` pour tests unitaires admin
2. **Refactor** `dashboard/page.tsx` en composants plus petits
3. **Documenter** folder `progression/` (projet parallèle?)
4. **Ajouter** `docs/` pour documentation technique

### Testing
5. **Créer** `e2e/fixtures/` pour test data
6. **Ajouter** `e2e/utils/` pour helpers Playwright
7. **Organiser** tests Jest dans `__tests__/` mirrors

### CI/CD
8. **Créer** `.github/workflows/ci.yml`
9. **Ajouter** `.github/workflows/preview.yml`
10. **Configurer** test artifacts upload

---

**Prêt pour CI/CD setup** ✅
