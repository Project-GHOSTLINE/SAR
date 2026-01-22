# Système de Monitoring des Webhooks - Documentation Complète

## Vue d'ensemble

Système professionnel de monitoring des webhooks avec support multi-providers (VoPay, Flinks, QuickBooks, Stripe) incluant:
- Table unifiée `webhook_logs` pour tous les providers
- Page de visualisation complète avec data flow diagram
- Filtres avancés et recherche
- Export CSV
- Retry des webhooks échoués
- Analytics et graphiques en temps réel
- Tab VoPay dédié dans le dashboard admin

## 1. Architecture

### Base de données

**Table principale: `webhook_logs`**
```sql
- id (UUID)
- provider (vopay, flinks, quickbooks, stripe)
- event_type (transaction.completed, account.updated, etc.)
- status (received, processing, completed, failed, retrying)
- payload (JSONB) - Payload complet du webhook
- response (JSONB) - Réponse envoyée
- headers (JSONB) - HTTP headers
- error_message (TEXT)
- error_stack (TEXT)
- retry_count (INTEGER)
- processing_time_ms (INTEGER)
- external_id (TEXT) - ID de la transaction chez le provider
- client_id (UUID) - Lien vers table clients
- loan_id (UUID) - Lien vers table loans
- signature (TEXT) - Signature webhook pour validation
- is_validated (BOOLEAN)
- validation_method (TEXT)
- environment (production, sandbox, test)
- received_at (TIMESTAMPTZ)
- processed_at (TIMESTAMPTZ)
- created_at (TIMESTAMPTZ)
- updated_at (TIMESTAMPTZ)
```

**Migration automatique**
- Migre automatiquement les données de `vopay_webhook_logs` vers `webhook_logs`
- Crée une view `vopay_webhooks_view` pour compatibilité backward
- Indexes optimisés pour performance

### APIs

#### 1. GET /api/admin/webhooks/list
Liste tous les webhooks avec filtres avancés.

**Query Parameters:**
```typescript
{
  provider?: 'vopay' | 'flinks' | 'quickbooks' | 'stripe'
  event_type?: string
  status?: 'received' | 'processing' | 'completed' | 'failed' | 'retrying'
  environment?: 'production' | 'sandbox' | 'test'
  date_from?: string (ISO date)
  date_to?: string (ISO date)
  limit?: number (default: 100)
  offset?: number (default: 0)
}
```

**Response:**
```typescript
{
  success: boolean
  webhooks: Webhook[]
  pagination: {
    total: number
    limit: number
    offset: number
    has_more: boolean
  }
  stats: {
    total: number
    by_status: {
      received: number
      processing: number
      completed: number
      failed: number
      retrying: number
    }
    by_provider: Record<string, number>
    avg_processing_time_ms: number
    success_rate: number
  }
  filters: {
    available_event_types: string[]
    available_providers: string[]
    available_statuses: string[]
    available_environments: string[]
  }
}
```

#### 2. POST /api/admin/webhooks/retry
Retry un webhook échoué.

**Body:**
```typescript
{
  webhookId: string
}
```

**Response:**
```typescript
{
  success: boolean
  message: string
  webhookId: string
  retryCount: number
}
```

#### 3. GET /api/admin/webhooks/export
Exporte les webhooks en CSV.

**Query Parameters:** Mêmes que `/list`

**Response:** Fichier CSV téléchargé

#### 4. GET /api/admin/webhooks/stats
Stats agrégées pour VoPay (utilisée par le dashboard).

**Response:**
```typescript
{
  success: boolean
  stats: {
    total: number
    totalSuccessful: number
    totalFailed: number
    totalPending: number
    todayVolume: number
    yesterdayVolume: number
    weekVolume: number
    monthVolume: number
    volumeChange: number
    weekSuccessRate: number
    monthSuccessRate: number
    weekTotal: number
    monthTotal: number
    weekFailed: number
    dailyStats: Array<{
      date: string
      total: number
      successful: number
      failed: number
      pending: number
      volume: number
    }>
    recentTransactions: Array<{...}>
    failedTransactions: Array<{...}>
  }
}
```

## 2. Pages Frontend

### Page /admin/webhooks

**URL:** `/admin/webhooks`

**Features:**
- Data Flow Visualization (Provider → API → Database → Processing)
- Stats Cards en temps réel:
  - Total webhooks
  - Success rate
  - Completed
  - Failed
  - Avg processing time
- Filtres avancés:
  - Provider (VoPay, Flinks, QuickBooks, Stripe)
  - Status (received, processing, completed, failed, retrying)
  - Environment (production, sandbox, test)
  - Search (ID, event type, provider)
- Tableau détaillé avec:
  - Provider (avec indicateur couleur)
  - Event Type
  - External ID
  - Status (avec badge coloré)
  - Processing Time
  - Received Date/Time
  - Actions (View, Retry pour failed)
- Modal de détails JSON du payload
- Export CSV
- Refresh automatique
- Design premium avec:
  - Gradient backgrounds
  - Glassmorphism effects
  - Smooth animations
  - Hover effects

**Accès:** Menu admin → "Webhooks"

### Tab VoPay Dashboard

**URL:** `/admin/dashboard?tab=vopay`

**Composant:** `VoPayMetricsTab.tsx`

**Features:**
- Key Metrics Cards:
  - Today's Volume (avec % change)
  - Week Volume (7 days)
  - Month Volume (30 days)
  - Success Rate
- Charts:
  - Transaction Volume Chart (7 days bar chart)
  - Success vs Failed Pie Chart
  - Transactions by Type breakdown
- Failed Transactions Alert
- Quick Actions:
  - View All Webhooks
  - View Failed Transactions
  - Refresh Data

**Intégration existante:**
Le tab VoPay existant avec balance, transactions et relevés bancaires reste intact.

## 3. Utilisation

### Migrer la base de données

```bash
# Appliquer la migration
psql $DATABASE_URL -f supabase/migrations/20260122000000_unified_webhook_logs.sql
```

### Accéder au monitoring

1. **Page complète:**
   - Aller à `/admin/webhooks`
   - Utiliser les filtres pour trouver des webhooks spécifiques
   - Cliquer sur l'icône œil pour voir les détails JSON
   - Cliquer sur retry pour les webhooks échoués
   - Exporter en CSV si besoin

2. **Dashboard VoPay:**
   - Aller à `/admin/dashboard?tab=vopay`
   - Voir les métriques en temps réel
   - Analyser les graphiques
   - Cliquer sur les quick actions pour plus de détails

### Intégrer un nouveau provider

1. **Créer le webhook receiver:**
```typescript
// src/app/api/webhooks/[provider]/route.ts
export async function POST(request: NextRequest) {
  const payload = await request.json()

  // Insert dans webhook_logs
  await supabase.from('webhook_logs').insert({
    provider: 'newprovider',
    event_type: payload.event_type,
    status: 'received',
    payload: payload,
    external_id: payload.transaction_id,
    environment: 'production',
    // ... autres champs
  })

  // Traiter le webhook
  // ...

  // Mettre à jour le status
  await supabase.from('webhook_logs').update({
    status: 'completed',
    processed_at: new Date().toISOString(),
    processing_time_ms: processingTime
  }).eq('id', webhookId)
}
```

2. **Ajouter le provider aux filtres:**
```typescript
// Dans /api/admin/webhooks/list/route.ts
available_providers: ['vopay', 'flinks', 'quickbooks', 'newprovider']

// Dans /admin/webhooks/page.tsx
const PROVIDER_COLORS = {
  // ...
  newprovider: 'bg-pink-500'
}

const PROVIDER_NAMES = {
  // ...
  newprovider: 'New Provider'
}
```

## 4. Avantages du système

### Centralisation
- Une seule table pour tous les providers
- Recherche unifiée
- Stats agrégées cross-provider

### Debugging
- Payload JSON complet accessible
- Headers disponibles
- Error stack traces
- Retry capability

### Performance Monitoring
- Processing time tracking
- Success rate calculation
- Volume analytics
- Daily trends

### Alerting
- Failed transactions prominently displayed
- Quick access to retry
- Email alerts possibles (via /api/admin/webhooks/send-alert)

### Scalabilité
- Indexes optimisés
- Pagination native
- Auto-refresh configurable
- Export CSV pour analyse externe

## 5. Sécurité

- Authentification admin JWT requise pour toutes les APIs
- Validation des signatures webhook
- Environment isolation (production/sandbox/test)
- Rate limiting recommandé pour les endpoints publics

## 6. Maintenance

### Cleanup des anciens webhooks
```sql
-- Supprimer les webhooks > 90 jours
DELETE FROM webhook_logs
WHERE created_at < NOW() - INTERVAL '90 days'
AND status IN ('completed', 'failed');
```

### Monitoring des performances
```sql
-- Webhooks lents (> 5 secondes)
SELECT provider, event_type, AVG(processing_time_ms) as avg_time
FROM webhook_logs
WHERE processing_time_ms > 5000
GROUP BY provider, event_type
ORDER BY avg_time DESC;
```

### Alerting sur failures
```sql
-- Taux de failure > 5%
SELECT
  provider,
  COUNT(*) FILTER (WHERE status = 'completed') as completed,
  COUNT(*) FILTER (WHERE status = 'failed') as failed,
  ROUND(COUNT(*) FILTER (WHERE status = 'failed')::numeric / COUNT(*)::numeric * 100, 2) as failure_rate
FROM webhook_logs
WHERE received_at > NOW() - INTERVAL '24 hours'
GROUP BY provider
HAVING COUNT(*) FILTER (WHERE status = 'failed')::numeric / COUNT(*)::numeric > 0.05;
```

## 7. Design Premium

Le système utilise des patterns de design premium:
- **Glassmorphism:** Effets de verre sur les cards
- **Gradient backgrounds:** Dégradés subtils
- **Smooth animations:** Transitions fluides
- **Hover effects:** Scale et shadow sur hover
- **Color coding:** Couleurs distinctes par provider
- **Data visualization:** Charts SVG custom
- **Responsive design:** Mobile-first approach

## 8. Prochaines améliorations possibles

- [ ] WebSocket pour updates en temps réel
- [ ] Graphiques historiques (30/90 jours)
- [ ] Alertes email configurables
- [ ] Webhook replay depuis l'UI
- [ ] Comparaison période vs période
- [ ] Export PDF des rapports
- [ ] API rate limiting dashboard
- [ ] Webhook signature validation UI
- [ ] Custom event type mapping
- [ ] Provider health monitoring

## 9. Fichiers créés/modifiés

### Nouveaux fichiers:
1. `/supabase/migrations/20260122000000_unified_webhook_logs.sql` - Schema database
2. `/src/app/api/admin/webhooks/retry/route.ts` - API retry
3. `/src/app/api/admin/webhooks/export/route.ts` - API export CSV
4. `/src/components/admin/VoPayMetricsTab.tsx` - Tab VoPay avec métriques

### Fichiers modifiés:
1. `/src/app/api/admin/webhooks/list/route.ts` - API list avec filtres avancés
2. `/src/app/admin/webhooks/page.tsx` - Page complète de monitoring

### Fichiers existants (non modifiés):
- `/src/app/api/admin/webhooks/stats/route.ts` - Utilisé par VoPayMetricsTab
- `/src/components/admin/VoPayDashboard.tsx` - Dashboard VoPay original

## Support

Pour toute question ou problème:
1. Vérifier les logs dans Supabase
2. Consulter les error messages dans la table webhook_logs
3. Utiliser le retry pour tester les webhooks échoués
4. Exporter en CSV pour analyse externe

---

**Créé le:** 2026-01-22
**Version:** 1.0.0
**Status:** Production Ready ✅
