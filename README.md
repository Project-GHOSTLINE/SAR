# Solution Argent Rapide (SAR)

Plateforme de gestion de prêts personnels et système CRM pour Solution Argent Rapide et Crédit Secours.

## 🏗️ Architecture

**Stack Technique:**
- **Frontend:** Next.js 14.2.35 (App Router) + React 18 + TypeScript
- **Styling:** Tailwind CSS + Framer Motion
- **Backend:** Next.js API Routes + PostgreSQL
- **Base de données:** Supabase (PostgreSQL + Auth + Storage)
- **Hébergement:** Vercel (Auto-deploy depuis `main`)
- **Analytics:** Google Analytics 4 + Telemetry personnalisé

## 🌐 Domaines & Sous-domaines

### Production
- **Site Principal:** https://solutionargentrapide.ca
- **Admin Dashboard:** https://admin.solutionargentrapide.ca
- **Partners Portal:** https://partners.solutionargentrapide.ca

### Routing
- Middleware géré par `/src/middleware.ts`
- Routing par sous-domaine (pas par chemin)
- Redirects automatiques `/partners/*` → `partners.*`

## 📁 Structure du Projet

```
/src
  /app                 # Next.js App Router
    /admin            # Dashboard admin
    /partners         # Portail partenaires
    /api              # API Routes
  /components         # Composants React
    /admin           # Composants admin
    /partners        # Composants partners
  /lib               # Utilitaires & helpers
  /hooks             # React hooks personnalisés

/supabase
  /migrations        # Migrations SQL (ordre chronologique)

/scripts             # Scripts utilitaires
  backup-database.sh # Backup manuel BD
  validate-all.sh    # Tests de validation
  inspect-db-structure.js # Inspection BD

/backups             # Backups base de données (JSON)

/public              # Assets statiques

/docs                # Documentation
```

## 🗄️ Base de Données (Supabase)

### Tables Principales

**Clients & Sessions:**
- `clients` - Profils clients unifiés
- `client_sessions` - Sessions de navigation (tracking)
- `client_emails` - Emails alternatifs
- `client_phones` - Téléphones alternatifs

**DevOps Management:**
- `devops_tasks` - Tâches DevOps (CRUD complet)
- `devops_task_comments` - Commentaires sur tâches
- `devops_task_attachments` - Fichiers joints (optionnel)

**Audit & Logs:**
- `audit_log` - Historique toutes modifications (trigger automatique)

**Admin:**
- `admin_users` - Utilisateurs administrateurs

### Vues Matérialisées
- `vw_audit_stats_by_table` - Stats modifications par table
- `vw_client_timeline_by_type` - Timeline clients par type

### Fonctions RPC
- `get_devops_stats()` - Stats DevOps agrégées (avec CTEs)
- Plus d'infos: voir `/supabase/migrations/`

## 🔑 Variables d'Environnement

Fichier: `.env.local` (voir `/Users/xunit/Desktop/outils/CREDENTIALS-MASTER.md`)

**Essentielles:**
```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://dllyzfuqjzuhvshrlmuq.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...

# Admin
JWT_SECRET=...
ADMIN_PASSWORD_HASH=...

# Analytics
NEXT_PUBLIC_GA_MEASUREMENT_ID=...

# VoPay (paiements)
VOPAY_API_KEY=...

# Vercel
VERCEL_TOKEN=...
```

**⚠️ IMPORTANT:** Ne jamais committer `.env.local` dans Git!

## 🚀 Démarrage Rapide

### Installation

```bash
# Cloner le repo
git clone https://github.com/Project-GHOSTLINE/SAR.git
cd SAR

# Installer les dépendances
npm install

# Copier les credentials
cp /Users/xunit/Desktop/outils/.env.master .env.local

# Lancer en dev
npm run dev
```

Ouvrir: http://localhost:3000

### Build & Deploy

```bash
# Build local
npm run build

# Deploy (auto via Vercel sur push main)
git push origin main
```

## 🛠️ Commandes Utiles

```bash
# Development
npm run dev              # Serveur dev (port 3000)
npm run build            # Build production
npm run start            # Serveur production

# Database
bash scripts/backup-database.sh           # Backup manuel
bash scripts/validate-all.sh              # Tests validation
node scripts/inspect-db-structure.js      # Inspect structure

# Supabase
npx supabase db pull     # Pull schema depuis prod
npx supabase db push     # Push migrations vers prod
```

## 📊 Systèmes Clés

### 1. DevOps Management (`/admin/dashboard?tab=devops`)

**Features:**
- Dashboard avec stats temps réel
- Gestion tâches CRUD complète
- 7 membres équipe, 7 départements, 5 types de tâches
- Diagramme infrastructure (5 couches, ReactFlow)
- Auto-génération numéros: TASK-0001, FIX-0001, etc.

**Fichiers:**
- UI: `/src/components/admin/DevOpsView.tsx`
- API: `/src/app/api/admin/devops/`
- Types: `/src/lib/devops-types.ts`
- Migration: `/supabase/migrations/20260202000000_devops_tasks_system.sql`

### 2. CRM Clients (`/admin/dashboard?tab=clients`)

**Features:**
- Unification clients multi-sources
- Détection doublons (fuzzy matching)
- Timeline activités
- Concordance données

### 3. Analytics & Telemetry

**Features:**
- Tracking custom avec session persistante
- Google Analytics 4 intégration
- Dashboard analytics temps réel

**Endpoints:**
- `POST /api/telemetry/track-event`
- `GET /api/analytics/sessions`

## 🔒 Authentification

### Admin
- JWT tokens (cookie `admin-session`)
- Vérification: `verifyAdminAuth()` dans `/src/lib/admin-auth.ts`
- Password hash: bcrypt

### Clients (Partners)
- Magic links email
- Session tokens

## 🧪 Tests & Validation

### Tests Automatiques
```bash
# Validation complète (6 tests)
bash scripts/validate-all.sh

# Test DevOps stats avec auth
node scripts/test-devops-stats.js
```

### Tests Manuels
- Site principal doit retourner 200
- Partners subdomain doit retourner 200
- Telemetry doit accepter POST
- Admin dashboard accessible (307 redirect si pas auth)
- DevOps stats API fonctionne

## 📝 Conventions de Code

### Commits
```
feat(scope): Description courte

- Point détail 1
- Point détail 2

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
```

### Routes API
- Toujours vérifier auth pour `/api/admin/*`
- Marquer comme dynamique si utilise `request.url` ou `searchParams`:
  ```typescript
  export const dynamic = 'force-dynamic'
  ```

### Components
- Server Components par défaut
- Client Components: ajouter `"use client"`
- Wrap `useSearchParams()` dans `<Suspense>`

## 🐛 Debugging

### Logs Vercel
```bash
npx vercel logs --token=$VERCEL_TOKEN
```

### Logs Supabase
Dashboard → Logs → API / Database

### Common Issues

**"Dynamic server usage" warning:**
- Ajouter `export const dynamic = 'force-dynamic'`

**"aggregate function calls cannot be nested":**
- Utiliser CTEs pour séparer les agrégations

**Build fails avec pg module:**
- Ne pas importer `pg` dans routes déployées sur Vercel Edge

## 🔄 Backups

### Code (Git)
```bash
# Voir les tags
git tag -l

# Restaurer un tag
git checkout v2026.02.02-devops-complete
```

### Base de Données
```bash
# Créer backup
bash scripts/backup-database.sh

# Voir backups
ls -lh backups/

# Format: JSON, facile à restaurer via Supabase Dashboard
```

## 📚 Documentation Additionnelle

- **Plan DevOps:** `~/.claude/plans/toasty-squishing-noodle.md`
- **Credentials:** `/Users/xunit/Desktop/outils/CREDENTIALS-MASTER.md`
- **Outils disponibles:** `/Users/xunit/Desktop/outils/CLAUDE.md`
- **Database Schema:** `/supabase/migrations/`

## 🎯 Points d'Entrée pour un Nouveau Claude

### Pour modifier le DevOps Dashboard:
1. Lire: `/src/components/admin/DevOpsView.tsx`
2. API: `/src/app/api/admin/devops/`
3. Types: `/src/lib/devops-types.ts`
4. Migration: `/supabase/migrations/20260202000000_devops_tasks_system.sql`

### Pour ajouter une feature:
1. Créer API route dans `/src/app/api/`
2. Créer composants dans `/src/components/`
3. Ajouter migration SQL si besoin dans `/supabase/migrations/`
4. Tester avec `scripts/validate-all.sh`
5. Commit avec message descriptif

### Pour débugger:
1. Vérifier logs Vercel: `npx vercel logs`
2. Inspecter BD: `node scripts/inspect-db-structure.js`
3. Tester endpoints: voir `/scripts/test-*.js`

## 📞 Support

**Équipe:**
- Fred Rosa (CEO) - fred@solutionargentrapide.ca
- Anthony Rosa (CTO) - anthony@solutionargentrapide.ca
- Équipe complète: voir `ASSIGNEES` dans `/src/lib/devops-types.ts`

**Ressources:**
- GitHub: https://github.com/Project-GHOSTLINE/SAR
- Supabase: https://supabase.com/dashboard/project/dllyzfuqjzuhvshrlmuq
- Vercel: https://vercel.com/project-ghostline/sar

---

**Dernière mise à jour:** 2 février 2026
**Version:** v2026.02.02-devops-complete
**Status:** ✅ Production - Système DevOps 100% fonctionnel
