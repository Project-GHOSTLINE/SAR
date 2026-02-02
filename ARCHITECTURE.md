# Architecture - Solution Argent Rapide

## Vue d'Ensemble

```
┌─────────────────────────────────────────────────────────────┐
│                     UTILISATEURS                             │
├──────────────┬──────────────┬──────────────┬────────────────┤
│   Clients    │    Admin     │  Partners    │   Analytics    │
└──────┬───────┴──────┬───────┴──────┬───────┴────────┬───────┘
       │              │              │                 │
       ▼              ▼              ▼                 ▼
┌─────────────────────────────────────────────────────────────┐
│                  NEXT.JS APP ROUTER                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │   Main   │  │  Admin   │  │ Partners │  │   API    │   │
│  │  Site    │  │Dashboard │  │  Portal  │  │  Routes  │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└───────────────────────┬─────────────────────────────────────┘
                        │
         ┌──────────────┼──────────────┐
         ▼              ▼              ▼
    ┌────────┐    ┌────────┐    ┌────────┐
    │Supabase│    │ Vercel │    │  GA4   │
    │   DB   │    │  Blob  │    │ API    │
    └────────┘    └────────┘    └────────┘
```

## Couches d'Infrastructure

### Layer 1: Frontend (Next.js)
```
/src/app/
  ├── (main)/              # Site principal (solutionargentrapide.ca)
  ├── admin/               # Dashboard admin
  ├── partners/            # Portail partenaires
  └── api/                 # API Routes
```

**Technologies:**
- Next.js 14.2.35 (App Router)
- React 18 (Server + Client Components)
- TypeScript 5.x
- Tailwind CSS + Framer Motion

### Layer 2: Middleware & Routing
```typescript
// src/middleware.ts
export function middleware(request: NextRequest) {
  const hostname = request.headers.get('host')

  // Routing par sous-domaine
  if (hostname === 'admin.solutionargentrapide.ca') {
    // Admin routes
  } else if (hostname === 'partners.solutionargentrapide.ca') {
    // Partners routes
  } else {
    // Main site
  }
}
```

**Responsabilités:**
- Routing par sous-domaine
- Session tracking (cookies)
- Telemetry injection
- Redirects automatiques

### Layer 3: API Layer
```
/src/app/api/
  ├── admin/              # API admin (auth requise)
  │   ├── devops/        # DevOps management
  │   ├── clients-sar/   # CRM clients
  │   └── api-explorer/  # API explorer
  ├── partners/          # API partners
  ├── telemetry/         # Tracking events
  └── analytics/         # Analytics data
```

**Patterns:**
- Server-side auth vérification
- Error handling standardisé
- Performance tracking (`withPerf` wrapper)

### Layer 4: Data Layer (Supabase)
```
PostgreSQL Database
  ├── Tables
  │   ├── clients            # Profils clients
  │   ├── client_sessions    # Sessions tracking
  │   ├── devops_tasks       # Tâches DevOps
  │   └── audit_log          # Historique modifications
  ├── Views
  │   └── vw_audit_stats_by_table
  ├── Functions (RPC)
  │   └── get_devops_stats()
  └── Triggers
      ├── audit_trigger       # Auto-log modifications
      └── task_number_gen     # Auto-génération numéros
```

### Layer 5: External Services
```
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│   Vercel    │  │ Cloudflare  │  │   VoPay     │
│   Hosting   │  │     DNS     │  │  Payments   │
└─────────────┘  └─────────────┘  └─────────────┘

┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│  Margill    │  │   Resend    │  │  Google     │
│    Loans    │  │    Email    │  │ Analytics   │
└─────────────┘  └─────────────┘  └─────────────┘
```

## Flux de Données

### 1. Création de Tâche DevOps

```
User Action (Frontend)
  └─> POST /api/admin/devops/tasks
       └─> verifyAdminAuth() ✓
            └─> Supabase Insert
                 └─> TRIGGER generate_task_number
                      └─> Return: { task_number: "TASK-0042" }
                           └─> Frontend Update
```

### 2. Tracking Session

```
Page Load
  └─> Middleware
       └─> Check/Create sar_session_id cookie
            └─> Inject telemetry context
                 └─> Frontend: trackEvent()
                      └─> POST /api/telemetry/track-event
                           └─> Supabase: client_sessions INSERT/UPDATE
```

### 3. Admin Login

```
Login Form
  └─> POST /api/admin/login
       └─> Verify password (bcrypt)
            └─> Generate JWT token
                 └─> Set cookie: admin-session
                      └─> Redirect: /admin/dashboard
```

## Patterns de Sécurité

### Authentication
```typescript
// Toutes les routes /api/admin/* DOIVENT vérifier auth
export async function GET(request: NextRequest) {
  const isAuth = await verifyAdminAuth(request)
  if (!isAuth) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }
  // ... rest of handler
}
```

### Database Access
```typescript
// Utiliser service role key côté serveur uniquement
const supabase = getSupabaseServer() // Service role key

// JAMAIS exposer service role key au client
// Utiliser anon key pour client-side
```

### Input Validation
```typescript
// Valider toutes les entrées utilisateur
const schema = z.object({
  title: z.string().min(1),
  task_type: z.enum(['todo', 'fix', 'modify', 'debug', 'create'])
})

const validated = schema.parse(body)
```

## Performance

### Optimisations Appliquées

**1. Supabase Connection Pooling**
```typescript
// Singleton pattern pour réutiliser connexions
const serverClient = getSupabaseServer() // Réutilisé
```

**2. Index Database**
```sql
-- Indexes critiques pour performance
CREATE INDEX idx_client_sessions_client_id ON client_sessions(client_id);
CREATE INDEX audit_log_changed_at_idx ON audit_log(changed_at DESC);
CREATE INDEX devops_tasks_status_idx ON devops_tasks(status);
```

**3. RPC Functions**
```sql
-- Utiliser RPC pour agrégations complexes
-- Éviter N+1 queries
SELECT * FROM get_devops_stats(); -- 1 query au lieu de 10+
```

**4. React Optimizations**
```typescript
// useCallback pour mémoïsation
const fetchTasks = useCallback(async () => {
  // ...
}, [filters])

// Lazy loading avec Suspense
<Suspense fallback={<Loading />}>
  <AsyncComponent />
</Suspense>
```

## Monitoring

### Logs
```typescript
// Structured logging
console.log(JSON.stringify({
  type: 'slow_query',
  duration_ms: 1234,
  url: '/api/admin/devops/stats',
  timestamp: new Date().toISOString()
}))
```

### Telemetry
```typescript
// Custom telemetry tracking
trackEvent({
  event_name: 'task_created',
  properties: {
    task_type: 'fix',
    department: 'web_sar'
  }
})
```

### Analytics
- Google Analytics 4 (frontend events)
- Custom telemetry (backend events)
- Performance tracking (API routes)

## Déploiement

### CI/CD Pipeline
```
1. Push to main
   └─> GitHub Actions (optional)
        └─> Vercel Build
             ├─> npm run build
             ├─> Type checking
             ├─> Linting
             └─> Deploy to Production
                  └─> DNS: solutionargentrapide.ca
```

### Migrations Database
```bash
# Local → Production
1. Create migration: supabase/migrations/YYYYMMDD_description.sql
2. Test locally: npm run dev
3. Apply to prod: Paste SQL in Supabase Dashboard
4. Commit migration file
```

### Environment Variables
```
Vercel Dashboard
  └─> Settings
       └─> Environment Variables
            └─> Production / Preview / Development
```

## Scalabilité

### Actuel
- Vercel: Auto-scaling serverless
- Supabase: Dedicated instance
- CDN: Cloudflare
- Capable: ~1000 req/s

### Futures Améliorations
1. Redis cache pour stats
2. CDN pour assets statiques
3. Connection pooling avancé
4. Read replicas Supabase

## Points d'Extension

### Ajouter un Nouveau Module
1. Créer routes: `/src/app/api/module/`
2. Créer composants: `/src/components/module/`
3. Ajouter types: `/src/lib/module-types.ts`
4. Migrations DB: `/supabase/migrations/`
5. Tests: `/scripts/test-module.js`

### Ajouter une Feature DevOps
1. Modifier: `/src/lib/devops-types.ts`
2. Update UI: `/src/components/admin/DevOpsView.tsx`
3. API si besoin: `/src/app/api/admin/devops/`
4. Migration SQL si besoin

---

**Dernière mise à jour:** 2 février 2026
**Mainteneur:** Claude Code + Équipe SAR
