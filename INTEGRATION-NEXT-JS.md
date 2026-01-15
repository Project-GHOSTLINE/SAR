# 🚀 INTÉGRATION NEXT.JS - PHASES 4, 5, 6

**Guide d'intégration des nouvelles fonctionnalités DB dans Next.js**

---

## 📂 FICHIERS CRÉÉS

### 1. Audit Trail
**Fichier:** `lib/supabase-with-audit.ts`

Wrapper Supabase qui trace automatiquement qui fait quoi.

**Usage:**
```typescript
import { createSupabaseWithAudit } from '@/lib/supabase-with-audit'

// Dans une route API
export async function POST(req: Request) {
  const session = await getServerSession()

  const { client, withAudit } = createSupabaseWithAudit({
    userEmail: session.user.email,
    userId: session.user.id
  })

  // Toutes les modifications seront tracées!
  await withAudit(async (supabase) => {
    await supabase
      .from('clients')
      .update({ first_name: 'John' })
      .eq('id', clientId)
  })

  return Response.json({ success: true })
}
```

**Historique audit d'un client:**
```typescript
import { getClientAuditHistory } from '@/lib/supabase-with-audit'

const history = await getClientAuditHistory(clientId)
// Returns: Array<AuditLogEntry>
```

---

### 2. Timeline Client
**Fichier:** `components/ClientTimeline.tsx`

Composant React pour afficher timeline 360° d'un client.

**Usage dans une page:**
```typescript
import { ClientTimeline, ClientTimelineStats } from '@/components/ClientTimeline'

export default function ClientProfilePage({ params }: { params: { id: string } }) {
  return (
    <div>
      <h1>Profil Client</h1>

      {/* Stats résumées */}
      <ClientTimelineStats clientId={params.id} />

      {/* Timeline complète */}
      <ClientTimeline clientId={params.id} limit={100} />
    </div>
  )
}
```

**Fonctionnalités:**
- ✅ Agrège 4 sources (Communications, Loans, Payment Events, VoPay)
- ✅ Filtrage par type d'événement
- ✅ Tri chronologique
- ✅ Détails expandables
- ✅ Icônes et couleurs par type
- ✅ Timestamps relatifs (français)

---

### 3. Dashboard Monitoring
**Fichier:** `app/admin/monitoring/page.tsx`

Page admin pour surveiller la santé de la base de données.

**URL:** `/admin/monitoring`

**Fonctionnalités:**
- 📊 Cache hit ratio (temps réel)
- 🏦 VoPay orphelins (alertes)
- 📦 Tailles des tables
- 📝 Audit récent (live)
- 📈 Rapport performance complet

**Pour ajouter à votre navigation:**
```typescript
// app/admin/layout.tsx
export default function AdminLayout({ children }) {
  return (
    <div>
      <nav>
        <Link href="/admin/monitoring">🔍 Monitoring</Link>
        {/* ... autres liens */}
      </nav>
      {children}
    </div>
  )
}
```

---

## 🔧 CONFIGURATION REQUISE

### 1. Variables d'environnement
**Fichier:** `.env.local`

```bash
# Déjà configuré normalement
NEXT_PUBLIC_SUPABASE_URL=https://dllyzfuqjzuhvshrlmuq.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...

# IMPORTANT: Service role key pour audit + monitoring
SUPABASE_SERVICE_ROLE_KEY=eyJ...  # À récupérer dans Supabase dashboard
```

### 2. Dépendances npm
```bash
npm install date-fns  # Pour formatage dates en français
```

### 3. Types TypeScript (optionnel mais recommandé)
**Créer:** `types/database.ts`

```typescript
// Générer les types depuis Supabase:
// npx supabase gen types typescript --project-id dllyzfuqjzuhvshrlmuq

export interface TimelineEvent {
  ts: string
  kind: 'COMMUNICATION' | 'LOAN' | 'PAYMENT_EVENT' | 'VOPAY'
  subtype: string
  direction?: string
  title: string
  summary: string
  ref: Record<string, any>
}

export interface ClientSummary {
  client_id: string
  primary_email: string
  first_name: string
  last_name: string
  applications_count: number
  loans_count: number
  communications_count: number
  vopay_transactions_count: number
  nsf_count: number
  last_activity_at: string
}
```

---

## 🎯 QUERIES UTILES

### 1. Timeline d'un client
```typescript
const { data: timeline } = await supabase
  .from('vw_client_timeline')
  .select('*')
  .eq('client_id', clientId)
  .order('ts', { ascending: false })
  .limit(50)
```

### 2. Résumé client complet
```typescript
const { data: summary } = await supabase
  .from('vw_client_summary')
  .select('*')
  .eq('client_id', clientId)
  .single()
```

### 3. Clients actifs
```typescript
const { data: activeClients } = await supabase
  .from('vw_active_clients')
  .select('*')
  .eq('activity_level', 'very_active')
  .order('last_activity_at', { ascending: false })
```

### 4. VoPay par client
```typescript
const { data: vopayStats } = await supabase
  .from('vw_vopay_by_client')
  .select('*')
  .eq('client_id', clientId)
  .single()
```

### 5. Audit trail
```typescript
// Via fonction RPC
const { data: auditHistory } = await supabase
  .rpc('get_client_audit_history', { p_client_id: clientId })

// Ou via vue
const { data: recentAudits } = await supabase
  .from('vw_audit_recent')
  .select('*')
  .limit(50)
```

### 6. Performance report
```typescript
const { data: perfReport } = await supabase
  .rpc('generate_performance_report')
```

---

## 📋 ÉTAPES D'INTÉGRATION

### Étape 1: Installer dépendances
```bash
cd /Users/xunit/Desktop/📁 Projets/sar
npm install date-fns
```

### Étape 2: Configurer Service Role Key
1. Aller sur Supabase Dashboard
2. Settings → API
3. Copier "service_role" key
4. Ajouter dans `.env.local`:
   ```
   SUPABASE_SERVICE_ROLE_KEY=eyJ...
   ```

### Étape 3: Tester Timeline
```bash
# Créer une page de test
# app/test/timeline/page.tsx

'use client'
import { ClientTimeline } from '@/components/ClientTimeline'

export default function TestPage() {
  // Remplacer par un vrai UUID de votre DB
  const testClientId = '00000000-0000-0000-0000-000000000000'

  return (
    <div className="p-8">
      <h1>Test Timeline</h1>
      <ClientTimeline clientId={testClientId} />
    </div>
  )
}
```

Aller sur: `http://localhost:3000/test/timeline`

### Étape 4: Tester Monitoring
Aller sur: `http://localhost:3000/admin/monitoring`

### Étape 5: Tester Audit
```typescript
// Dans une route API quelconque
import { createSupabaseWithAudit } from '@/lib/supabase-with-audit'

export async function POST(req: Request) {
  const { client, withAudit } = createSupabaseWithAudit({
    userEmail: 'test@example.com'
  })

  await withAudit(async (supabase) => {
    await supabase
      .from('clients')
      .update({ first_name: 'TEST' })
      .eq('id', 'some-uuid')
  })

  return Response.json({ success: true })
}
```

Vérifier dans `audit_log` table:
```sql
SELECT * FROM audit_log ORDER BY changed_at DESC LIMIT 10;
```

---

## 🎨 EXEMPLES D'UTILISATION

### Exemple 1: Page Profil Client Complète
```typescript
// app/clients/[id]/page.tsx
import { ClientTimeline, ClientTimelineStats } from '@/components/ClientTimeline'
import { createClient } from '@supabase/supabase-js'

export default async function ClientProfilePage({ params }: { params: { id: string } }) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  // Récupérer résumé client
  const { data: summary } = await supabase
    .from('vw_client_summary')
    .select('*')
    .eq('client_id', params.id)
    .single()

  return (
    <div className="max-w-7xl mx-auto p-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">
          {summary.first_name} {summary.last_name}
        </h1>
        <p className="text-gray-600">{summary.primary_email}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Applications" value={summary.applications_count} />
        <StatCard label="Loans" value={summary.loans_count} />
        <StatCard label="Communications" value={summary.communications_count} />
        <StatCard label="VoPay" value={summary.vopay_transactions_count} />
      </div>

      {/* Timeline Stats */}
      <ClientTimelineStats clientId={params.id} />

      {/* Timeline Complète */}
      <div>
        <h2 className="text-2xl font-bold mb-4">Historique</h2>
        <ClientTimeline clientId={params.id} limit={100} />
      </div>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white border rounded-lg p-4">
      <div className="text-3xl font-bold">{value}</div>
      <div className="text-sm text-gray-600">{label}</div>
    </div>
  )
}
```

### Exemple 2: Dashboard Admin avec Alertes
```typescript
// app/admin/dashboard/page.tsx
'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

export default function AdminDashboard() {
  const [alerts, setAlerts] = useState<string[]>([])

  useEffect(() => {
    checkAlerts()
  }, [])

  async function checkAlerts() {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const newAlerts: string[] = []

    // Check 1: Cache hit ratio
    const { data: cache } = await supabase
      .from('vw_cache_hit_ratio')
      .select('percentage')
      .single()

    if (cache && cache.percentage < 95) {
      newAlerts.push(`⚠️ Cache hit ratio bas: ${cache.percentage}%`)
    }

    // Check 2: VoPay orphans
    const { count } = await supabase
      .from('vw_vopay_orphans')
      .select('*', { count: 'exact', head: true })

    if (count && count > 100) {
      newAlerts.push(`🔴 ${count} transactions VoPay sans lien`)
    }

    setAlerts(newAlerts)
  }

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Dashboard Admin</h1>

      {/* Alertes */}
      {alerts.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <h2 className="font-bold text-red-900 mb-2">🚨 Alertes</h2>
          <ul className="space-y-1">
            {alerts.map((alert, idx) => (
              <li key={idx} className="text-red-800">{alert}</li>
            ))}
          </ul>
        </div>
      )}

      {/* ... reste du dashboard */}
    </div>
  )
}
```

---

## 🔒 SÉCURITÉ

### RLS (Row Level Security)
Toutes les nouvelles tables sont protégées par RLS:
- `vopay_objects`
- `audit_log`
- `clients`
- `communications`
- `loans`
- `payment_events`

**Par défaut:** Seul `service_role` a accès.

**Pour donner accès à authenticated users:**
```sql
-- Exemple: Permettre lecture clients
CREATE POLICY "Authenticated users can read clients"
ON public.clients FOR SELECT
TO authenticated
USING (true);
```

### Service Role Key
⚠️ **IMPORTANT:** La `service_role` key bypasse RLS.

**Utilisez-la UNIQUEMENT:**
- Côté serveur (API routes, server components)
- Pour opérations admin
- JAMAIS côté client

---

## 📊 MONITORING EN PRODUCTION

### Alertes Recommandées
Créer des alertes Supabase ou Edge Functions pour:

1. **Cache < 95%**
   ```sql
   SELECT percentage FROM vw_cache_hit_ratio WHERE percentage < 95;
   ```

2. **VoPay orphans > 100**
   ```sql
   SELECT COUNT(*) FROM vw_vopay_orphans HAVING COUNT(*) > 100;
   ```

3. **Table bloat > 20%**
   ```sql
   SELECT * FROM vw_table_bloat WHERE dead_ratio_pct > 20;
   ```

### Maintenance Hebdomadaire
```sql
-- Exécuter chaque semaine
SELECT auto_optimize_database();
```

### Cleanup Audit Mensuel
```sql
-- Supprimer logs > 1 an
SELECT cleanup_old_audit_logs(365);
```

---

## 🐛 TROUBLESHOOTING

### Erreur: "relation vw_client_timeline does not exist"
**Solution:** Les phases 4-5-6 n'ont pas été exécutées.
```bash
# Exécuter le script master
# /Users/xunit/Desktop/EXECUTE-PHASES-4-5-6-MASTER.sql
```

### Erreur: "service_role key not found"
**Solution:** Ajouter dans `.env.local`:
```bash
SUPABASE_SERVICE_ROLE_KEY=eyJh...
```

### Timeline vide
**Vérification:**
```sql
-- Vérifier si client a des événements
SELECT kind, COUNT(*)
FROM vw_client_timeline
WHERE client_id = 'UUID'
GROUP BY kind;
```

### Audit ne trace pas
**Vérification:**
```sql
-- Vérifier triggers actifs
SELECT tgname FROM pg_trigger WHERE tgname LIKE 'audit_%';

-- Tester manuellement
UPDATE clients SET first_name = 'TEST' WHERE id = 'UUID';
SELECT * FROM audit_log ORDER BY changed_at DESC LIMIT 1;
```

---

## 📚 RESSOURCES

**Documentation créée:**
- `/Users/xunit/Desktop/VALIDATION-PHASES-4-5-6.sql`
- `/Users/xunit/Desktop/PROCHAINES-ETAPES-2026-01-15.md`
- `/Users/xunit/Desktop/MISSION-ACCOMPLIE-2026-01-15.md`

**Fichiers SQL:**
- `database/migrations/restructure/040-042` (VoPay)
- `database/migrations/restructure/050` (Timeline)
- `database/migrations/restructure/060-062` (Sécurité)

---

## ✅ CHECKLIST INTÉGRATION

- [ ] Variables d'environnement configurées
- [ ] `npm install date-fns` exécuté
- [ ] Timeline testée avec vrai client
- [ ] Monitoring accessible `/admin/monitoring`
- [ ] Audit trail fonctionne (test UPDATE)
- [ ] RLS policies configurées (si besoin)
- [ ] Alertes créées (optionnel)
- [ ] Documentation lue

---

**🎉 Votre app Next.js est maintenant connectée aux nouvelles fonctionnalités!**

**Questions?** Retour vers Claude avec détails du problème.
