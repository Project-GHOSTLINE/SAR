# Système de Monitoring des Webhooks - Guide Rapide

## Accès Rapide

### 1. Page Principale de Monitoring
**URL:** `/admin/webhooks`

Interface complète avec:
- Visualisation du data flow (Provider → API → Database → Processing)
- Stats en temps réel (Total, Success Rate, Failed, Avg Time)
- Filtres avancés (Provider, Status, Environment, Search)
- Tableau détaillé avec tous les webhooks
- Export CSV
- Retry des webhooks échoués
- Détails JSON complets

### 2. Dashboard VoPay avec Métriques
**URL:** `/admin/dashboard?tab=vopay`

Tab dédié VoPay avec:
- Key Metrics Cards (Today/Week/Month Volume, Success Rate)
- Transaction Volume Chart (7 jours)
- Success vs Failed Pie Chart
- Transactions by Type
- Failed Transactions Alert
- Quick Actions

## Nouveaux Fichiers Créés

### Database
```
/supabase/migrations/20260122000000_unified_webhook_logs.sql
```
- Table unifiée `webhook_logs` pour tous les providers
- Migration automatique depuis `vopay_webhook_logs`
- Indexes optimisés
- View de compatibilité

### APIs
```
/src/app/api/admin/webhooks/list/route.ts (modifié)
/src/app/api/admin/webhooks/retry/route.ts (nouveau)
/src/app/api/admin/webhooks/export/route.ts (nouveau)
```

### Frontend
```
/src/app/admin/webhooks/page.tsx (modifié)
/src/components/admin/VoPayMetricsTab.tsx (nouveau)
```

## Installation

### 1. Migrer la Database
```bash
psql $DATABASE_URL -f supabase/migrations/20260122000000_unified_webhook_logs.sql
```

### 2. Redémarrer le Serveur
```bash
npm run dev
```

### 3. Accéder aux Pages
- Monitoring complet: `http://localhost:3000/admin/webhooks`
- Dashboard VoPay: `http://localhost:3000/admin/dashboard?tab=vopay`

## Utilisation

### Filtrer les Webhooks
1. Sélectionner un provider (VoPay, Flinks, QuickBooks, Stripe)
2. Sélectionner un status (Received, Processing, Completed, Failed, Retrying)
3. Sélectionner un environment (Production, Sandbox, Test)
4. Utiliser la recherche pour trouver un webhook spécifique

### Voir les Détails d'un Webhook
1. Cliquer sur l'icône œil dans la colonne Actions
2. Le modal affiche le payload JSON complet
3. Voir les détails: Provider, Event Type, Status, Error Message, etc.

### Retry un Webhook Échoué
1. Trouver le webhook avec status "Failed"
2. Cliquer sur l'icône retry dans la colonne Actions
3. Confirmer l'action
4. Le webhook sera marqué comme "Retrying" et retraité

### Exporter en CSV
1. Appliquer les filtres souhaités
2. Cliquer sur "Export CSV"
3. Le fichier CSV sera téléchargé avec tous les webhooks filtrés

## Architecture

### Table webhook_logs
```sql
webhook_logs (
  id UUID,
  provider TEXT,               -- vopay, flinks, quickbooks, stripe
  event_type TEXT,             -- transaction.completed, etc.
  status TEXT,                 -- received, processing, completed, failed, retrying
  payload JSONB,               -- Full webhook payload
  response JSONB,              -- Response sent
  headers JSONB,               -- HTTP headers
  error_message TEXT,
  error_stack TEXT,
  retry_count INTEGER,
  processing_time_ms INTEGER,
  external_id TEXT,            -- Provider's transaction ID
  client_id UUID,
  loan_id UUID,
  signature TEXT,
  is_validated BOOLEAN,
  validation_method TEXT,
  environment TEXT,            -- production, sandbox, test
  received_at TIMESTAMPTZ,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
```

### APIs Disponibles

#### GET /api/admin/webhooks/list
Liste et filtre les webhooks.

**Query params:**
- `provider`: vopay | flinks | quickbooks | stripe
- `status`: received | processing | completed | failed | retrying
- `event_type`: string
- `environment`: production | sandbox | test
- `date_from`: ISO date
- `date_to`: ISO date
- `limit`: number (default: 100)
- `offset`: number (default: 0)

#### POST /api/admin/webhooks/retry
Retry un webhook échoué.

**Body:**
```json
{
  "webhookId": "uuid"
}
```

#### GET /api/admin/webhooks/export
Exporte les webhooks en CSV.

**Query params:** Mêmes que `/list`

#### GET /api/admin/webhooks/stats
Stats agrégées (utilisée par VoPayMetricsTab).

## Design Features

- **Data Flow Visualization:** Diagramme animé du flux de données
- **Real-time Stats:** Métriques mises à jour en temps réel
- **Glassmorphism:** Effets de verre sur les cards
- **Gradient Backgrounds:** Dégradés subtils
- **Smooth Animations:** Transitions fluides
- **Color Coding:** Couleurs distinctes par provider et status
- **Responsive:** Mobile-first design
- **Dark Mode Ready:** Compatible avec le dark mode

## Intégrer un Nouveau Provider

### 1. Créer le Webhook Receiver
```typescript
// /src/app/api/webhooks/[provider]/route.ts
export async function POST(request: NextRequest) {
  const startTime = Date.now()
  const payload = await request.json()

  // Insert dans webhook_logs
  const { data: webhook } = await supabase
    .from('webhook_logs')
    .insert({
      provider: 'newprovider',
      event_type: payload.event_type,
      status: 'received',
      payload: payload,
      external_id: payload.transaction_id,
      environment: 'production',
      received_at: new Date().toISOString()
    })
    .select()
    .single()

  // Traiter le webhook
  try {
    await processWebhook(payload)

    // Success
    await supabase
      .from('webhook_logs')
      .update({
        status: 'completed',
        processed_at: new Date().toISOString(),
        processing_time_ms: Date.now() - startTime
      })
      .eq('id', webhook.id)

  } catch (error) {
    // Error
    await supabase
      .from('webhook_logs')
      .update({
        status: 'failed',
        error_message: error.message,
        error_stack: error.stack,
        processed_at: new Date().toISOString(),
        processing_time_ms: Date.now() - startTime
      })
      .eq('id', webhook.id)
  }

  return NextResponse.json({ success: true })
}
```

### 2. Ajouter aux Filtres
```typescript
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

### 3. Mettre à Jour l'API
```typescript
// Dans /api/admin/webhooks/list/route.ts
filters: {
  available_providers: ['vopay', 'flinks', 'quickbooks', 'newprovider']
}
```

## Maintenance

### Nettoyer les Anciens Webhooks
```sql
-- Supprimer les webhooks > 90 jours
DELETE FROM webhook_logs
WHERE created_at < NOW() - INTERVAL '90 days'
AND status IN ('completed', 'failed');
```

### Monitorer les Performances
```sql
-- Webhooks lents
SELECT provider, event_type, AVG(processing_time_ms) as avg_time
FROM webhook_logs
WHERE processing_time_ms > 5000
  AND received_at > NOW() - INTERVAL '24 hours'
GROUP BY provider, event_type
ORDER BY avg_time DESC;
```

### Alerter sur les Failures
```sql
-- Taux de failure > 5%
SELECT
  provider,
  COUNT(*) FILTER (WHERE status = 'completed') as completed,
  COUNT(*) FILTER (WHERE status = 'failed') as failed,
  ROUND(
    COUNT(*) FILTER (WHERE status = 'failed')::numeric /
    COUNT(*)::numeric * 100,
    2
  ) as failure_rate
FROM webhook_logs
WHERE received_at > NOW() - INTERVAL '24 hours'
GROUP BY provider
HAVING COUNT(*) FILTER (WHERE status = 'failed')::numeric / COUNT(*)::numeric > 0.05;
```

## Sécurité

- Authentification JWT requise pour toutes les APIs admin
- Validation des signatures webhook
- Isolation par environment (production/sandbox/test)
- HTTPS uniquement en production
- Rate limiting recommandé

## Support

Pour des questions ou problèmes:
1. Consulter la documentation complète: `WEBHOOK_MONITORING_SYSTEM.md`
2. Vérifier les logs dans Supabase
3. Consulter les error_message dans webhook_logs
4. Utiliser le retry pour tester

## Screenshots

### Page Principale
- Data Flow Diagram animé
- 5 stats cards en temps réel
- Filtres avancés
- Tableau complet avec actions
- Modal de détails JSON

### Dashboard VoPay
- 4 key metrics cards avec gradients
- Line chart du volume (7 jours)
- Pie chart Success vs Failed
- Bar chart par type de transaction
- Alert box pour failed transactions
- 3 quick action cards

---

**Version:** 1.0.0
**Build:** Production Ready ✅
**Dernière mise à jour:** 2026-01-22
