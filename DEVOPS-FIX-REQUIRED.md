# ⚠️ Action Requise: Correction SQL DevOps

## Problème

Le endpoint `/api/admin/devops/stats` retourne une erreur 500:
```
"aggregate function calls cannot be nested"
```

## Solution (1 minute)

### Étape 1: Ouvrir l'éditeur SQL Supabase

Cliquez ici: [Supabase SQL Editor](https://supabase.com/dashboard/project/dllyzfuqjzuhvshrlmuq/sql)

### Étape 2: Copier le SQL

Le fichier SQL de correction est dans:
```
/tmp/DEVOPS-FIX.sql
```

Ou copiez directement depuis:
```
supabase/migrations/20260202000001_fix_devops_stats_function.sql
```

### Étape 3: Coller et Exécuter

1. Coller le SQL dans l'éditeur
2. Cliquer sur "Run" (ou Ctrl+Enter)
3. Vous devriez voir: "Success. No rows returned"

### Étape 4: Vérifier

Rafraîchir le dashboard DevOps:
```
https://admin.solutionargentrapide.ca/admin/dashboard?tab=devops
```

## Ce qui a été corrigé

La fonction `get_devops_stats()` utilisait des agrégats imbriqués (COUNT dans jsonb_object_agg), ce qui n'est pas permis en PostgreSQL.

La nouvelle version sépare l'agrégation en plusieurs étapes avec des CTEs (Common Table Expressions):

1. `stats` - Calcule les totaux
2. `dept_stats` - Agrège par département
3. `dept_json` - Convertit en JSON (sans agrégation imbriquée)
4. Idem pour layers et assignees

## État Actuel

✅ Site principal fonctionne (solutionargentrapide.ca)
✅ Sous-domaine partners fonctionne (partners.solutionargentrapide.ca)
✅ Redirects fonctionnent correctement
✅ Telemetry fonctionne
✅ Dashboard admin accessible
✅ Navigation sidebar WordPress-style installée
✅ Toutes les autres fonctionnalités DevOps (liste, création, modification)

❌ Stats DevOps - Nécessite la correction SQL ci-dessus

## Après l'application

Tous les tests passeront et le dashboard DevOps sera 100% fonctionnel.
