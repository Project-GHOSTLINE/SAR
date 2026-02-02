# Quick Start - Pour un Nouveau Claude

Guide rapide pour commencer à travailler sur SAR.

## 🚀 Setup Initial (5 minutes)

```bash
# 1. Cloner et installer
git clone https://github.com/Project-GHOSTLINE/SAR.git
cd SAR
npm install

# 2. Copier credentials
cp /Users/xunit/Desktop/outils/.env.master .env.local

# 3. Lancer dev server
npm run dev
# Ouvrir: http://localhost:3000
```

## 📋 Checklist Avant de Coder

- [ ] Lire `README.md` (structure projet)
- [ ] Lire `ARCHITECTURE.md` (comprendre système)
- [ ] Inspecter BD: `node scripts/inspect-db-structure.js`
- [ ] Tester: `bash scripts/validate-all.sh`
- [ ] Vérifier derniers commits: `git log --oneline -10`

## 🎯 Tâches Courantes

### Modifier le Dashboard DevOps

**Fichiers clés:**
```
/src/components/admin/DevOpsView.tsx       # UI principale
/src/app/api/admin/devops/tasks/route.ts   # API CRUD
/src/lib/devops-types.ts                   # Types & constantes
```

**Steps:**
1. Modifier UI dans `DevOpsView.tsx`
2. Update API si besoin dans `/api/admin/devops/`
3. Tester: Ouvrir `http://localhost:3000/admin/dashboard?tab=devops`
4. Commit avec message descriptif

### Ajouter une Table BD

**Steps:**
1. Créer migration: `supabase/migrations/YYYYMMDD_table_name.sql`
2. Écrire SQL avec commentaires
3. Tester localement
4. Copier SQL dans presse-papier
5. Appliquer via Supabase Dashboard
6. Commit le fichier migration

**Template migration:**
```sql
-- Description de la table et son utilité
CREATE TABLE IF NOT EXISTS table_name (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  -- autres colonnes...
);

-- Indexes pour performance
CREATE INDEX idx_table_name_field ON table_name(field);

-- Commentaires
COMMENT ON TABLE table_name IS 'Description détaillée';
```

### Créer une Nouvelle API Route

**Template:**
```typescript
// src/app/api/feature/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminAuth } from '@/lib/admin-auth'
import { getSupabaseServer } from '@/lib/supabase-server'

// Si utilise request.url ou searchParams
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  // 1. Vérifier auth (si route admin)
  const isAuth = await verifyAdminAuth(request)
  if (!isAuth) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  try {
    // 2. Query database
    const supabase = getSupabaseServer()
    const { data, error } = await supabase
      .from('table')
      .select('*')

    if (error) throw error

    // 3. Return response
    return NextResponse.json({ data })
  } catch (error: any) {
    console.error('Error:', error)
    return NextResponse.json(
      { error: 'Erreur serveur', details: error.message },
      { status: 500 }
    )
  }
}
```

### Débugger une Erreur

**1. Erreur 500 API:**
```bash
# Voir logs Vercel
npx vercel logs --token=$VERCEL_TOKEN | grep -A5 -B5 "ERROR"

# Ou tester localement
npm run dev
# Reproduire l'erreur et voir console
```

**2. Erreur SQL:**
```bash
# Inspecter structure BD
node scripts/inspect-db-structure.js

# Tester query dans Supabase Dashboard
# https://supabase.com/dashboard/project/dllyzfuqjzuhvshrlmuq/sql
```

**3. Erreur Build:**
```bash
# Build local
npm run build

# Vérifier types
npx tsc --noEmit
```

## 🧪 Tester ses Changements

### Tests Automatiques
```bash
# Validation complète (6 tests)
bash scripts/validate-all.sh

# Test API spécifique
curl http://localhost:3000/api/admin/devops/stats
```

### Tests Manuels
1. Ouvrir dashboard: http://localhost:3000/admin/dashboard
2. Login: Mot de passe dans `.env.local`
3. Tester features modifiées
4. Vérifier console browser (pas d'erreurs)
5. Vérifier console terminal (pas d'erreurs)

## 📝 Committer ses Changes

```bash
# 1. Voir changements
git status
git diff

# 2. Ajouter fichiers
git add src/components/admin/DevOpsView.tsx
git add src/app/api/admin/devops/

# 3. Commit avec message descriptif
git commit -m "feat(devops): Add priority filter to task list

- Add priority dropdown in filters
- Update API to accept priority param
- Add priority colors to task cards

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"

# 4. Push (auto-deploy sur Vercel)
git push origin main
```

## 🆘 Problèmes Courants

### "Module not found"
```bash
npm install
rm -rf .next
npm run dev
```

### "Dynamic server usage" warning
```typescript
// Ajouter en haut du fichier route.ts
export const dynamic = 'force-dynamic'
```

### "Failed to connect to database"
```bash
# Vérifier .env.local existe
ls -la .env.local

# Vérifier SUPABASE_SERVICE_ROLE_KEY est set
grep SUPABASE_SERVICE_ROLE_KEY .env.local
```

### "aggregate function calls cannot be nested"
```sql
-- Utiliser CTEs pour séparer agrégations
WITH aggregated AS (
  SELECT col, COUNT(*) as count
  FROM table
  GROUP BY col
)
SELECT jsonb_object_agg(col, count)
FROM aggregated;
```

## 📚 Ressources Utiles

### Documentation
- `README.md` - Vue d'ensemble projet
- `ARCHITECTURE.md` - Architecture détaillée
- `/supabase/migrations/` - Schéma BD
- `~/.claude/plans/` - Plans d'implémentation

### Outils
```bash
# Inspection BD
node scripts/inspect-db-structure.js

# Backup BD
bash scripts/backup-database.sh

# Validation complète
bash scripts/validate-all.sh
```

### URLs Production
- Site: https://solutionargentrapide.ca
- Admin: https://admin.solutionargentrapide.ca/admin/dashboard
- DevOps: https://admin.solutionargentrapide.ca/admin/dashboard?tab=devops
- Partners: https://partners.solutionargentrapide.ca

### Dashboards
- Vercel: https://vercel.com/project-ghostline/sar
- Supabase: https://supabase.com/dashboard/project/dllyzfuqjzuhvshrlmuq
- GitHub: https://github.com/Project-GHOSTLINE/SAR

## 🎓 Conventions à Suivre

### Code Style
- TypeScript strict mode
- Async/await (pas de .then())
- Functional components React
- Tailwind pour styling
- Commentaires en français pour business logic

### Naming
- Files: `kebab-case.tsx`
- Components: `PascalCase`
- Functions: `camelCase`
- Constants: `UPPER_SNAKE_CASE`
- DB tables: `snake_case`

### Git
- Branch: `main` (pas de feature branches pour l'instant)
- Commits: messages descriptifs en français
- Push = auto-deploy sur Vercel

## ✅ Checklist Avant Push

- [ ] Code build sans erreurs: `npm run build`
- [ ] Pas d'erreurs TypeScript: `npx tsc --noEmit`
- [ ] Tests passent: `bash scripts/validate-all.sh`
- [ ] Pas de console.error dans le code (sauf error handling)
- [ ] Pas de .env.local dans les fichiers committés
- [ ] Message de commit descriptif

---

**Tu es prêt!** 🚀

Pour toute question, consulte `README.md` ou `ARCHITECTURE.md`.

**Dernière mise à jour:** 2 février 2026
