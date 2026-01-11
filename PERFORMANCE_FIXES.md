# 🚀 Optimisations de Performance - SAR Admin

## Problèmes Identifiés

### 1. API Webhooks Stats - Délai de 400-450ms
- Récupère TOUS les webhooks sans limite (peut être 10,000+ records)
- 3 requêtes séquentielles au lieu de parallèles
- Filtrage en JavaScript au lieu de SQL
- Pas de cache

### 2. API Client Analysis - Délai de 250-265ms
- Récupère TOUTES les analyses pour calculer les stats
- Filtre en JavaScript au lieu d'agrégations SQL
- Pas de limite sur les requêtes

### 3. Dashboard - Requêtes séquentielles
- Les données sont chargées une par une (waterfall)
- Re-renders inutiles

---

## Solutions

### 🔧 Solution #1: Optimiser Webhooks Stats API

**Fichier**: `src/app/api/admin/webhooks/stats/route.ts`

**Changements:**

1. **Utiliser des filtres SQL au lieu de JavaScript**
```typescript
// ❌ AVANT: Récupère tout puis filtre en JS
const { data: allWebhooks } = await supabase
  .from('vopay_webhook_logs')
  .select('status, transaction_amount, received_at, environment')

const webhooks = (allWebhooks || []).filter(w =>
  !w.environment || w.environment.toLowerCase() === 'production'
)

// ✅ APRÈS: Filtre directement en SQL
const { data: allWebhooks } = await supabase
  .from('vopay_webhook_logs')
  .select('status, transaction_amount, received_at')
  .or('environment.is.null,environment.eq.production')
  .order('received_at', { ascending: false })
  .limit(1000) // Limite raisonnable
```

2. **Faire les requêtes en parallèle**
```typescript
// ✅ Utiliser Promise.all pour requêtes parallèles
const [allWebhooks, recentTransactions, failedTransactions] = await Promise.all([
  supabase.from('vopay_webhook_logs')
    .select('status, transaction_amount, received_at')
    .or('environment.is.null,environment.eq.production')
    .order('received_at', { ascending: false })
    .limit(1000),

  supabase.from('vopay_webhook_logs')
    .select('*')
    .or('environment.is.null,environment.eq.production')
    .order('received_at', { ascending: false })
    .limit(100),

  supabase.from('vopay_webhook_logs')
    .select('*')
    .eq('status', 'failed')
    .or('environment.is.null,environment.eq.production')
    .order('received_at', { ascending: false })
    .limit(10)
])
```

3. **Utiliser des agrégations SQL pour les stats par jour**
```typescript
// ✅ Créer une fonction PostgreSQL pour calculer les stats journalières
// Dans Supabase SQL Editor:
CREATE OR REPLACE FUNCTION get_daily_webhook_stats(days_back INT DEFAULT 7)
RETURNS TABLE (
  date DATE,
  total BIGINT,
  successful BIGINT,
  failed BIGINT,
  pending BIGINT,
  volume NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    DATE(received_at) as date,
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE status = 'successful') as successful,
    COUNT(*) FILTER (WHERE status = 'failed') as failed,
    COUNT(*) FILTER (WHERE status IN ('pending', 'in progress')) as pending,
    SUM(CAST(transaction_amount AS NUMERIC)) as volume
  FROM vopay_webhook_logs
  WHERE received_at >= CURRENT_DATE - days_back
    AND (environment IS NULL OR environment = 'production')
  GROUP BY DATE(received_at)
  ORDER BY date DESC;
END;
$$ LANGUAGE plpgsql;

// Puis dans l'API:
const { data: dailyStats } = await supabase.rpc('get_daily_webhook_stats', { days_back: 7 })
```

4. **Ajouter du cache (optionnel)**
```typescript
// Option 1: Cache Next.js
export const revalidate = 60 // Cache 60 secondes

// Option 2: Cache en mémoire
const cache = new Map()
const CACHE_TTL = 60000 // 60 secondes

function getCachedStats() {
  const cached = cache.get('webhook-stats')
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data
  }
  return null
}
```

### 🔧 Solution #2: Optimiser Client Analysis API

**Fichier**: `src/app/api/admin/client-analysis/route.ts`

**Changements:**

1. **Utiliser des agrégations SQL pour les stats**
```typescript
// ❌ AVANT: Récupère tout puis filtre en JS
const { data: stats } = await supabase
  .from('client_analyses')
  .select('status, assigned_to')
  .is('deleted_at', null)

const statsCalculated = {
  pending: stats?.filter(s => s.status === 'pending').length || 0,
  reviewed: stats?.filter(s => s.status === 'reviewed').length || 0,
  // ...
}

// ✅ APRÈS: Créer une fonction PostgreSQL
CREATE OR REPLACE FUNCTION get_client_analysis_stats()
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total', COUNT(*),
    'pending', COUNT(*) FILTER (WHERE status = 'pending'),
    'reviewed', COUNT(*) FILTER (WHERE status = 'reviewed'),
    'approved', COUNT(*) FILTER (WHERE status = 'approved'),
    'rejected', COUNT(*) FILTER (WHERE status = 'rejected'),
    'by_assignee', json_build_object(
      'sandra', COUNT(*) FILTER (WHERE assigned_to = 'Sandra'),
      'michel', COUNT(*) FILTER (WHERE assigned_to = 'Michel'),
      'unassigned', COUNT(*) FILTER (WHERE assigned_to IS NULL)
    )
  ) INTO result
  FROM client_analyses
  WHERE deleted_at IS NULL;

  RETURN result;
END;
$$ LANGUAGE plpgsql;

// Dans l'API:
const { data: stats } = await supabase.rpc('get_client_analysis_stats')
```

### 🔧 Solution #3: Optimiser le Dashboard

**Fichier**: `src/app/admin/dashboard/page.tsx`

**Changements:**

1. **Charger les données en parallèle**
```typescript
// ✅ Utiliser un seul useEffect avec Promise.all
useEffect(() => {
  const fetchAllData = async () => {
    setLoading(true)
    try {
      const [messagesRes, vopayRes, webhooksRes] = await Promise.all([
        fetch('/api/admin/messages', { credentials: 'include' }),
        fetch('/api/admin/vopay', { credentials: 'include' }),
        fetch('/api/admin/webhooks/stats', { credentials: 'include' })
      ])

      // Traiter les réponses en parallèle aussi
      const [messagesData, vopayData, webhooksData] = await Promise.all([
        messagesRes.json(),
        vopayRes.json(),
        webhooksRes.json()
      ])

      setMessages(messagesData.messages)
      setVopayData(vopayData)
      setWebhookStats(webhooksData.stats)
    } catch (error) {
      console.error('Erreur:', error)
    } finally {
      setLoading(false)
    }
  }

  fetchAllData()
}, [selectedView])
```

2. **Utiliser React.memo pour les composants lourds**
```typescript
const StatsCard = React.memo(({ title, value, icon }) => {
  return (
    <div className="bg-white rounded-xl p-8">
      {/* ... */}
    </div>
  )
})
```

---

## 📊 Résultats Attendus

### Avant Optimisations
- Webhook Stats API: **400-450ms**
- Client Analysis API: **250-265ms**
- Chargement Dashboard: **800-1000ms** (séquentiel)

### Après Optimisations
- Webhook Stats API: **50-100ms** (10x plus rapide)
- Client Analysis API: **20-50ms** (5x plus rapide)
- Chargement Dashboard: **150-200ms** (4x plus rapide grâce au parallèle)

---

## 🛠️ Implémentation

### Étape 1: Créer les fonctions PostgreSQL
```sql
-- Exécuter dans Supabase SQL Editor

-- Fonction pour stats webhooks journalières
CREATE OR REPLACE FUNCTION get_daily_webhook_stats(days_back INT DEFAULT 7)
RETURNS TABLE (
  date DATE,
  total BIGINT,
  successful BIGINT,
  failed BIGINT,
  pending BIGINT,
  volume NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    DATE(received_at) as date,
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE status = 'successful') as successful,
    COUNT(*) FILTER (WHERE status = 'failed') as failed,
    COUNT(*) FILTER (WHERE status IN ('pending', 'in progress')) as pending,
    SUM(CAST(transaction_amount AS NUMERIC)) as volume
  FROM vopay_webhook_logs
  WHERE received_at >= CURRENT_DATE - days_back
    AND (environment IS NULL OR environment = 'production')
  GROUP BY DATE(received_at)
  ORDER BY date DESC;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour stats analyses client
CREATE OR REPLACE FUNCTION get_client_analysis_stats()
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total', COUNT(*),
    'pending', COUNT(*) FILTER (WHERE status = 'pending'),
    'reviewed', COUNT(*) FILTER (WHERE status = 'reviewed'),
    'approved', COUNT(*) FILTER (WHERE status = 'approved'),
    'rejected', COUNT(*) FILTER (WHERE status = 'rejected'),
    'by_assignee', json_build_object(
      'sandra', COUNT(*) FILTER (WHERE assigned_to = 'Sandra'),
      'michel', COUNT(*) FILTER (WHERE assigned_to = 'Michel'),
      'unassigned', COUNT(*) FILTER (WHERE assigned_to IS NULL)
    )
  ) INTO result
  FROM client_analyses
  WHERE deleted_at IS NULL;

  RETURN result;
END;
$$ LANGUAGE plpgsql;
```

### Étape 2: Modifier les API Routes
Voir les fichiers détaillés dans la section Solutions ci-dessus.

### Étape 3: Optimiser le Dashboard
Utiliser Promise.all pour charger les données en parallèle.

---

## ⚠️ Notes Importantes

1. **Base de données**: Les fonctions PostgreSQL doivent être créées dans Supabase SQL Editor
2. **Cache**: Si vous activez le cache, assurez-vous que les données temps réel ne sont pas affectées
3. **Testing**: Tester chaque optimisation individuellement pour mesurer l'impact
4. **Monitoring**: Utiliser les logs Supabase pour vérifier que les requêtes sont optimisées

---

## 📈 Métriques à Surveiller

- Temps de réponse API (Supabase Dashboard > Logs)
- Nombre de requêtes par page load
- Temps de chargement total du dashboard
- Taille des réponses JSON

Voulez-vous que j'implémente ces optimisations maintenant?
