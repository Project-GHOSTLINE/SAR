# Metric Inspector - Guide d'Utilisation

## Accès

🔗 **URL**: `https://admin.solutionargentrapide.ca/metric-inspector`

📍 **Navigation**: Cliquez sur "Metric Inspector" dans le menu admin (icône Database)

## Qu'est-ce que c'est?

Le Metric Inspector est un outil de visualisation et de debugging de l'architecture modulaire du Metric Engine. Il permet de:

1. ✅ Voir toutes les sections définies dans `admin_sections`
2. ✅ Voir toutes les métriques définies dans `metric_registry`
3. ✅ Confirmer quelles métriques ont des valeurs calculées dans `metric_values`
4. ✅ Copier les shortcodes (metric_key) pour utilisation
5. ✅ Voir les statistiques globales

## Interface

### 1. Stats Globales (En Haut)

4 cartes affichent:
- **Sections**: Nombre total de sections définies
- **Métriques Définies**: Nombre total de métriques dans le registry
- **Valeurs Calculées**: Nombre total de valeurs stockées
- **Taux Completion**: Pourcentage de métriques ayant au moins une valeur

### 2. Valeurs par Entity Type

Distribution des valeurs calculées:
- **Global**: Métriques dashboard global
- **Analyses**: Métriques par analyse client
- **Fraude**: Métriques par cas de fraude
- **Total**: Somme totale

### 3. Sections et Métriques (Liste Expandable)

Chaque section affiche:

#### Header Section (Cliquable)
- Nom et description de la section
- `section_key` (shortcode de la section)
- Route path (chemin admin)
- Status (ACTIF/INACTIF)
- **Compteur**: `X/Y` métriques avec valeurs
- **Pourcentage**: Taux de completion visuel (vert/jaune/rouge)

#### Métriques (Quand Expandé)

Chaque métrique affiche:

**Indicateur de Status**:
- ✅ **Vert** = Métrique calculée (a des valeurs)
- ❌ **Rouge** = Métrique NON calculée (0 valeur)

**Informations Métriques**:
- 📛 **Label**: Nom humain de la métrique
- 📝 **Description**: Explication de la métrique
- 🔑 **Shortcode**: `metric_key` (CLIQUABLE pour copier)
- 📊 **Type**: numeric/text/boolean/json
- 🎨 **Format**: currency_cad/percentage/integer/etc.
- 📏 **Unit**: $/%/count/days/etc.
- 🎯 **Entity Types**: Types d'entités supportés (global/analysis/fraud_case)
- 📅 **Périodes**: Si la métrique supporte des périodes (30d/60d/90d)
- 🎨 **Color Scheme**: Couleur UI (red/green/blue/yellow)
- 🏷️ **Tags**: Tags de classification (#financial, #risk, #nsf, etc.)

**Compteur de Valeurs** (À droite):
- Nombre de valeurs calculées pour cette métrique
- "NON CALCULÉ" si 0 valeur

## Utilisation des Shortcodes

### 1. Copier un Shortcode

Cliquez sur le bouton bleu avec le code:
```
[Code] nsf_count_90d [Copy Icon]
```

Le shortcode est copié dans le clipboard. Vous verrez un ✓ de confirmation.

### 2. Usage en React (Frontend)

```tsx
import { DynamicSection } from '@/components/metrics/DynamicSection'

// Pour une section complète
<DynamicSection
  sectionKey="analyses"
  entityType="analysis"
  entityId={analysisId}
/>

// Affiche TOUTES les métriques de la section "analyses" pour cette analyse
```

### 3. Usage RPC Supabase (API)

```typescript
// Récupérer métriques d'une section
const { data } = await supabase
  .rpc('get_metrics_by_section', {
    p_section_key: 'analyses',
    p_entity_type: 'analysis',
    p_entity_id: analysisId
  })

// Récupérer dashboard pack complet (section + métriques + valeurs)
const { data } = await supabase
  .rpc('get_dashboard_pack', {
    p_section_key: 'fraud',
    p_entity_type: 'fraud_case',
    p_entity_id: caseId
  })
```

### 4. Calcul Manuel de Métriques

```typescript
// Calculer métriques pour une analyse
const { data } = await supabase
  .rpc('compute_analysis_metrics', {
    p_analysis_id: analysisId
  })

// Calculer métriques globales
const { data } = await supabase
  .rpc('compute_global_metrics')
```

### 5. Upsert une Valeur Manuellement

```typescript
const { data } = await supabase
  .rpc('upsert_metric_value', {
    p_entity_type: 'analysis',
    p_entity_id: analysisId,
    p_metric_key: 'nsf_count_90d',
    p_value_numeric: 5,
    p_period_label: '90d'
  })
```

## Exemple Concret: Afficher NSF Count

### Étape 1: Identifier le Shortcode

1. Aller sur `/admin/metric-inspector`
2. Cliquer sur la section "Analyses Client"
3. Trouver la métrique "NSF Count (90 days)"
4. Copier le shortcode: `nsf_count_90d`

### Étape 2: Utiliser dans le Code

```tsx
// Composant d'affichage d'analyse client
export function AnalysisDetail({ analysisId }: { analysisId: string }) {
  const { data, loading } = useMetrics('analyses', 'analysis', analysisId)

  // Trouver la métrique NSF
  const nsfMetric = data?.metrics.find(m => m.metric_key === 'nsf_count_90d')

  return (
    <div>
      <h2>NSF Count (90 days)</h2>
      {nsfMetric ? (
        <p className="text-3xl font-bold text-red-600">
          {nsfMetric.value}
        </p>
      ) : (
        <p className="text-gray-500">Non calculé</p>
      )}
    </div>
  )
}
```

## Interprétation des Couleurs

### Status Section
- 🟢 **Vert (100%)**: Toutes les métriques ont des valeurs
- 🟡 **Jaune (50-99%)**: Certaines métriques manquent
- 🔴 **Rouge (<50%)**: Majorité des métriques manquantes

### Status Métrique
- ✅ **Carte Blanche + Bordure Verte**: Métrique calculée (has_values = true)
- ❌ **Carte Rose + Bordure Rouge**: Métrique NON calculée (has_values = false)

### Color Scheme (Tag)
- 🔴 **Red**: Risque élevé (NSF, fraud, critical)
- 🟢 **Green**: Positif (income, balance, success)
- 🔵 **Blue**: Neutre (volume, count, info)
- 🟡 **Yellow**: Avertissement (risk, suspicious)

## Dépannage

### Métrique Affiche "NON CALCULÉ"

**Causes possibles:**

1. **Pas encore calculée**: Aucune valeur dans `metric_values`
   - Solution: Appeler `compute_analysis_metrics(analysis_id)`

2. **CRON pas exécuté**: Jobs CRON pas configurés
   - Vérifier: Supabase Dashboard → Database → Cron Jobs
   - Solution: Exécuter `SELECT cron.schedule(...)`

3. **Fonction de calcul manquante**: `calculation_function` NULL dans registry
   - Vérifier: `metric_registry.calculation_function`
   - Solution: Mettre à jour le registry avec le nom de fonction

4. **Données source manquantes**: Table source vide (ex: `client_transactions`)
   - Vérifier: `SELECT COUNT(*) FROM client_transactions WHERE analysis_id = '...'`
   - Solution: Importer les données IBV/Flinks

### Section Affiche 0 Métriques

**Causes possibles:**

1. **Section pas liée à des métriques**: Aucune métrique avec ce `section_key`
   - Solution: Insérer des métriques dans `metric_registry` avec le bon `section_key`

2. **Section inactive**: `is_active = false`
   - Solution: `UPDATE admin_sections SET is_active = true WHERE section_key = '...'`

## Maintenance

### Ajouter une Nouvelle Section

```sql
INSERT INTO admin_sections (section_key, label, description, icon_name, route_path, sort_order)
VALUES ('ma_section', 'Ma Section', 'Description...', 'IconName', '/admin/ma-section', 100);
```

Rafraîchir la page Metric Inspector pour voir la nouvelle section.

### Ajouter une Nouvelle Métrique

```sql
INSERT INTO metric_registry (
  metric_key,
  label,
  description,
  section_key,
  value_type,
  unit,
  format,
  entity_types,
  tags
) VALUES (
  'ma_metrique',
  'Ma Métrique',
  'Description de la métrique',
  'analyses', -- section_key existante
  'numeric',
  'count',
  'integer',
  ARRAY['analysis']::TEXT[],
  ARRAY['custom', 'financial']::TEXT[]
);
```

Rafraîchir la page Metric Inspector pour voir la nouvelle métrique (elle sera en rouge jusqu'à ce qu'elle soit calculée).

## Performance

- **Temps de chargement**: < 2 secondes
- **Actualisation**: Bouton "Rafraîchir" en haut à droite
- **Cache**: Aucun cache (données toujours à jour)

## Prochaines Étapes

Une fois que vous avez identifié les métriques manquantes:

1. **Calculer les métriques**: Appeler les fonctions RPC de calcul
2. **Configurer CRON**: Automatiser le calcul quotidien
3. **Vérifier les indexes**: S'assurer que les indexes sont créés sur `client_transactions`
4. **Tester les dashboards**: Utiliser les shortcodes dans vos composants UI

## Support

Pour toute question sur le Metric Inspector:
- Vérifier `METRIC-ENGINE-ARCHITECTURE.md` pour l'architecture complète
- Vérifier `database/metric_engine_schema.sql` pour le SQL complet
- Consulter les exemples dans `/src/components/metrics/`
