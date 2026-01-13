# Installation du Metric Engine

## 📋 Prérequis

- Accès au dashboard Supabase: https://supabase.com/dashboard
- Projet SAR: `dllyzfuqjzuhvshrlmuq`
- Permissions SQL Editor activées

## 🚀 Installation (5 minutes)

### Étape 1: Ouvrir Supabase SQL Editor

1. Aller sur https://supabase.com/dashboard
2. Sélectionner le projet **SAR** (dllyzfuqjzuhvshrlmuq)
3. Cliquer sur **SQL Editor** dans la sidebar gauche
4. Cliquer sur **New query**

### Étape 2: Copier le Schema SQL

1. Ouvrir le fichier `database/metric_engine_schema.sql`
2. **Copier TOUT le contenu** (Cmd+A → Cmd+C)
3. **Coller** dans l'éditeur SQL de Supabase

### Étape 3: Exécuter le Script

1. Cliquer sur **Run** (ou Cmd+Enter)
2. Attendre ~5-10 secondes
3. Vérifier qu'il n'y a **aucune erreur rouge**

### Étape 4: Vérifier l'Installation

À la fin du script, vous devriez voir ce résultat:

```
table_name         | row_count
-------------------|-----------
admin_sections     | 8
metric_registry    | 20
metric_values      | 0
fraud_cases        | 0
```

✅ **8 sections** créées
✅ **20 métriques** créées
✅ **0 valeurs** (normal - elles seront calculées plus tard)
✅ **0 cas de fraude** (normal - table vide au départ)

### Étape 5: Tester le Metric Inspector

1. Aller sur https://admin.solutionargentrapide.ca/metric-inspector
2. Rafraîchir la page (F5)
3. Vous devriez maintenant voir:
   - **Stats globales** en haut (8 sections, 20 métriques définies, etc.)
   - **8 sections** listées (Dashboard Global, Analyses Client, Fraude, etc.)
   - **Métriques** expandables pour chaque section
   - **Shortcodes** cliquables (boutons bleus avec icône Copy)

## ✅ Checklist de Vérification

Après installation, vérifier:

- [ ] Aucune erreur SQL dans Supabase
- [ ] 8 sections visibles dans `admin_sections` table (Table Editor)
- [ ] 20 métriques visibles dans `metric_registry` table
- [ ] Page `/admin/metric-inspector` charge sans erreur 500
- [ ] Stats globales affichent "8 Sections" et "20 Métriques Définies"
- [ ] Sections sont expandables
- [ ] Shortcodes sont copiables

## 📊 Ce qui a été créé

### Tables

1. **admin_sections** (8 lignes)
   - Dashboard Global
   - Analyses Client
   - Fraude & Risque
   - Métriques Financières
   - VoPay
   - Support
   - Performance
   - Conformité

2. **metric_registry** (20 lignes)
   - 4 métriques globales (total_clients, total_revenue_mtd, active_loans, fraud_cases_open)
   - 6 métriques analyses (nsf_count_30d/60d/90d, avg_balance, total_income_90d, risk_score)
   - 4 métriques fraude (fraud_amount, fraud_recovered, investigation_days, fraud_severity)
   - 3 métriques financières (total_deposits, total_withdrawals, transaction_volume)
   - 3 métriques VoPay (vopay_success_rate, vopay_pending, vopay_failed)

3. **metric_values** (vide)
   - Sera remplie quand les métriques seront calculées

4. **fraud_cases** (vide)
   - Sera remplie quand des cas de fraude seront créés

### Fonctions RPC

1. **upsert_metric_value()** - Insérer/mettre à jour une valeur de métrique
2. **get_metrics_by_section()** - Récupérer métriques d'une section avec valeurs
3. **get_dashboard_pack()** - Récupérer section + métriques + valeurs en un appel

### Index

- 15 index créés pour performance optimale
- Queries sur `metric_values` < 50ms garanties

### Triggers

- Triggers `updated_at` automatiques sur toutes les tables

## 🔍 Usage des Shortcodes

### Dans le Metric Inspector

1. Cliquer sur une section (ex: "Analyses Client")
2. Voir la liste des métriques
3. Cliquer sur le bouton bleu avec le code (ex: `nsf_count_90d`)
4. Le shortcode est copié dans votre clipboard
5. Vous pouvez maintenant l'utiliser dans votre code

### Dans React (Frontend)

```tsx
import { DynamicSection } from '@/components/metrics/DynamicSection'

// Afficher toutes les métriques d'une section
<DynamicSection
  sectionKey="analyses"
  entityType="analysis"
  entityId={analysisId}
/>
```

### Via Supabase RPC (API)

```typescript
// Récupérer métriques d'une section
const { data } = await supabase
  .rpc('get_metrics_by_section', {
    p_section_key: 'analyses',
    p_entity_type: 'analysis',
    p_entity_id: analysisId
  })

// Récupérer pack complet (section + métriques + valeurs)
const { data } = await supabase
  .rpc('get_dashboard_pack', {
    p_section_key: 'fraud',
    p_entity_type: 'fraud_case',
    p_entity_id: caseId
  })
```

### Upsert Manuel d'une Valeur

```typescript
const { data } = await supabase
  .rpc('upsert_metric_value', {
    p_metric_key: 'nsf_count_90d',
    p_entity_type: 'analysis',
    p_entity_id: analysisId,
    p_value_numeric: 5,
    p_period_label: '90d'
  })
```

## 🐛 Dépannage

### Erreur: "relation admin_sections does not exist"

**Cause**: Le script n'a pas été exécuté ou a échoué

**Solution**:
1. Retourner dans SQL Editor
2. Réexécuter le script complet
3. Vérifier qu'il n'y a pas d'erreur rouge

### Page Metric Inspector affiche "Erreur de chargement"

**Cause**: Tables créées mais vides, ou API ne peut pas se connecter

**Solution**:
1. Vérifier dans Supabase Table Editor que `admin_sections` a 8 lignes
2. Vérifier dans Supabase Table Editor que `metric_registry` a 20 lignes
3. Vérifier les variables d'environnement:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`

### Les métriques affichent "NON CALCULÉ"

**Cause**: Normal - les valeurs n'ont pas encore été calculées

**Solution**: C'est le comportement attendu. Les métriques afficheront des valeurs une fois que:
1. Les données sources existent (ex: `client_transactions` pour `nsf_count_90d`)
2. Les fonctions de calcul sont créées (ex: `compute_analysis_metrics()`)
3. Les fonctions de calcul sont exécutées

Voir `METRIC-INSPECTOR-GUIDE.md` pour plus de détails sur le calcul des métriques.

## 📝 Prochaines Étapes

Après installation réussie:

1. ✅ **Confirmer que le Metric Inspector fonctionne**
2. ⏳ **Créer les fonctions de calcul** pour chaque métrique
3. ⏳ **Calculer les métriques existantes** pour les analyses actuelles
4. ⏳ **Configurer CRON jobs** pour calcul automatique quotidien
5. ⏳ **Créer composants UI** pour afficher les métriques dans les dashboards

## 💡 Besoin d'aide?

- Consulter `METRIC-INSPECTOR-GUIDE.md` pour l'utilisation
- Consulter `metric_engine_schema.sql` pour la documentation SQL complète
- Vérifier les tables dans Supabase Table Editor
- Tester les fonctions RPC dans Supabase SQL Editor:

```sql
-- Tester get_metrics_by_section
SELECT * FROM get_metrics_by_section('global', 'global', NULL);

-- Tester get_dashboard_pack
SELECT get_dashboard_pack('analyses', 'analysis', NULL);
```

---

**Installation créée par**: Claude Code
**Version**: 1.0.0
**Date**: 2026-01-13
