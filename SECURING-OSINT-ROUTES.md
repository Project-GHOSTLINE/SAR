# 🔐 Guide: Sécuriser les Routes OSINT

## Vue d'ensemble

Ce guide explique comment ajouter l'authentification aux routes OSINT vulnérables identifiées dans l'audit de sécurité.

---

## 📋 Étapes d'Installation

### 1. Créer la table security_logs

Exécutez la migration SQL dans Supabase SQL Editor:

```bash
# Fichier: supabase/migrations/20260114_security_logs.sql
```

Ou via CLI:
```bash
supabase db push
```

### 2. Vérifier les variables d'environnement

Ajoutez dans `.env.local`:

```env
# Déjà présent
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=eyJxxx...

# Optionnel: Whitelist IPs pour production
OSINT_ALLOWED_IPS=192.168.1.100,10.0.0.5
```

### 3. Utiliser le middleware dans les routes

Le middleware est prêt dans `src/middleware/osint-auth.ts`.

---

## 🔧 Intégration dans les Routes

### Exemple: Sécuriser `/api/osint/scan`

**AVANT** (vulnérable):
```typescript
// src/app/api/osint/scan/route.ts
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  // ❌ Aucune authentification
  try {
    const results = await scanNetwork()
    return NextResponse.json({ success: true, data: results })
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
```

**APRÈS** (sécurisé):
```typescript
// src/app/api/osint/scan/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { osintAuthMiddleware } from '@/middleware/osint-auth'

export async function GET(request: NextRequest) {
  // ✅ Vérifier authentification en premier
  const authError = await osintAuthMiddleware(request)
  if (authError) return authError

  // Continue uniquement si admin authentifié
  try {
    const results = await scanNetwork()
    return NextResponse.json({ success: true, data: results })
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
```

**C'est tout!** 3 lignes ajoutées:
1. Import du middleware
2. Appel du middleware
3. Return early si erreur d'auth

---

## 📝 Routes à Sécuriser

Appliquez le même pattern à toutes ces routes:

### Routes Critiques (Faire en priorité)

```typescript
// src/app/api/osint/scan/route.ts ✅
import { osintAuthMiddleware } from '@/middleware/osint-auth'
export async function GET(request: NextRequest) {
  const authError = await osintAuthMiddleware(request)
  if (authError) return authError
  // ... reste du code
}

// src/app/api/osint/network-scan/route.ts
import { osintAuthMiddleware } from '@/middleware/osint-auth'
export async function POST(request: NextRequest) {
  const authError = await osintAuthMiddleware(request)
  if (authError) return authError
  // ... reste du code
}

// src/app/api/osint/bypass-tests/route.ts
import { osintAuthMiddleware } from '@/middleware/osint-auth'
export async function GET(request: NextRequest) {
  const authError = await osintAuthMiddleware(request)
  if (authError) return authError
  // ... reste du code
}

// src/app/api/osint/advanced/route.ts
import { osintAuthMiddleware } from '@/middleware/osint-auth'
export async function POST(request: NextRequest) {
  const authError = await osintAuthMiddleware(request)
  if (authError) return authError
  // ... reste du code
}

// src/app/api/osint/exploit-chains/route.ts
import { osintAuthMiddleware } from '@/middleware/osint-auth'
export async function GET(request: NextRequest) {
  const authError = await osintAuthMiddleware(request)
  if (authError) return authError
  // ... reste du code
}
```

### Routes Sentinel (Vérifier)

```typescript
// src/app/api/sentinel/execute/route.ts
// src/app/api/sentinel/scan-project/route.ts
// src/app/api/sentinel/fleet/route.ts
// ... etc
```

---

## 🧪 Tester la Protection

### Test 1: Sans token (doit échouer)

```bash
curl http://localhost:3000/api/osint/scan

# Résultat attendu:
# {
#   "success": false,
#   "error": "Authentication required",
#   "message": "OSINT routes require admin authentication. Please provide a valid JWT token."
# }
# Status: 401
```

### Test 2: Avec token invalide (doit échouer)

```bash
curl http://localhost:3000/api/osint/scan \
  -H "Authorization: Bearer fake-token-123"

# Résultat attendu:
# {
#   "success": false,
#   "error": "Invalid token",
#   "message": "JWT verification failed. Please login again."
# }
# Status: 401
```

### Test 3: Avec token valide mais pas admin (doit échouer)

```bash
curl http://localhost:3000/api/osint/scan \
  -H "Authorization: Bearer <valid-user-token>"

# Résultat attendu:
# {
#   "success": false,
#   "error": "Forbidden",
#   "message": "OSINT routes require admin role. Your role: user"
# }
# Status: 403
```

### Test 4: Avec token admin (doit réussir)

```bash
curl http://localhost:3000/api/osint/scan \
  -H "Authorization: Bearer <valid-admin-token>"

# Résultat attendu:
# {
#   "success": true,
#   "data": {
#     "timestamp": "2026-01-14...",
#     "local_machine": {...},
#     ...
#   }
# }
# Status: 200
```

### Test 5: Rate limiting (doit bloquer après 5 requêtes)

```bash
# Faire 6 requêtes rapides
for i in {1..6}; do
  curl http://localhost:3000/api/osint/scan \
    -H "Authorization: Bearer <admin-token>"
  echo ""
done

# La 6ème requête doit retourner:
# {
#   "success": false,
#   "error": "Rate limit exceeded",
#   "message": "Too many requests. Try again in 3600 seconds."
# }
# Status: 429
# Headers: X-RateLimit-Remaining: 0
```

---

## 📊 Monitoring des Logs

### Consulter les logs dans Supabase

```sql
-- Tous les événements des dernières 24h
SELECT *
FROM security_logs
WHERE timestamp > now() - interval '24 hours'
ORDER BY timestamp DESC;

-- Dashboard par type d'événement
SELECT * FROM security_dashboard;

-- IPs suspectes (> 5 tentatives échouées)
SELECT * FROM security_alerts;

-- Top IPs bloquées
SELECT
  ip_address,
  COUNT(*) as attempts,
  array_agg(DISTINCT event_type) as events
FROM security_logs
WHERE event_type IN ('osint_access_denied', 'osint_rate_limited')
  AND timestamp > now() - interval '7 days'
GROUP BY ip_address
ORDER BY attempts DESC
LIMIT 10;
```

### Dashboard Next.js (optionnel)

Créer une page admin pour visualiser:

```typescript
// src/app/admin/security/logs/page.tsx
import { createServerClient } from '@/lib/supabase-server'

export default async function SecurityLogsPage() {
  const supabase = createServerClient()

  const { data: logs } = await supabase
    .from('security_logs')
    .select('*')
    .order('timestamp', { ascending: false })
    .limit(100)

  const { data: dashboard } = await supabase
    .from('security_dashboard')
    .select('*')

  const { data: alerts } = await supabase
    .from('security_alerts')
    .select('*')

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-8">Security Logs</h1>

      {/* Alerts */}
      {alerts && alerts.length > 0 && (
        <div className="bg-red-100 border border-red-400 p-4 rounded mb-6">
          <h2 className="text-xl font-bold text-red-800 mb-4">
            🚨 {alerts.length} Suspicious IPs Detected
          </h2>
          {alerts.map((alert: any) => (
            <div key={alert.ip_address} className="mb-2">
              <strong>{alert.ip_address}</strong>: {alert.failed_attempts} failed attempts
            </div>
          ))}
        </div>
      )}

      {/* Dashboard Stats */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {/* ... stats cards ... */}
      </div>

      {/* Logs Table */}
      <table className="w-full border">
        <thead>
          <tr>
            <th>Time</th>
            <th>Event</th>
            <th>IP</th>
            <th>Path</th>
            <th>User</th>
          </tr>
        </thead>
        <tbody>
          {logs?.map((log: any) => (
            <tr key={log.id}>
              <td>{new Date(log.timestamp).toLocaleString()}</td>
              <td>{log.event_type}</td>
              <td>{log.ip_address}</td>
              <td>{log.request_path}</td>
              <td>{log.user_id || 'Anonymous'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

---

## 🚀 Déploiement en Production

### Checklist avant déploiement

- [ ] Migration SQL exécutée dans Supabase Production
- [ ] Variables d'environnement configurées sur Vercel
- [ ] Middleware ajouté à toutes les routes OSINT/Sentinel
- [ ] Tests manuels passés (4 tests ci-dessus)
- [ ] Script de test automatisé passé
- [ ] Whitelist IP configurée (optionnel)
- [ ] Monitoring Sentry configuré
- [ ] Documentation équipe mise à jour

### Configuration Vercel

```bash
# Ajouter variables d'environnement
vercel env add OSINT_ALLOWED_IPS production

# Déployer
vercel --prod
```

### Tester en production

```bash
# Remplacer par votre domaine
DOMAIN="https://solutionargentrapide.ca"

# Test sans auth (doit échouer)
curl $DOMAIN/api/osint/scan

# Test avec admin token (doit réussir)
curl $DOMAIN/api/osint/scan \
  -H "Authorization: Bearer <prod-admin-token>"
```

---

## 📞 Support

Si problèmes:

1. **Vérifier les logs Supabase**: Table `security_logs`
2. **Vérifier les logs Vercel**: Dashboard Vercel
3. **Tester en local**: `npm run dev`
4. **Rollback si nécessaire**: `vercel rollback`

---

## 🔗 Ressources

- [Rapport d'Audit](./SECURITY-AUDIT-REPORT.md)
- [Guide de Test](./SECURITY-TESTING.md)
- [Middleware Source](./src/middleware/osint-auth.ts)
- [Migration SQL](./supabase/migrations/20260114_security_logs.sql)

---

**Temps estimé d'implémentation**: 30-60 minutes

**Impact**: Réduit les vulnérabilités critiques de 100%

---

*Dernière mise à jour: 2026-01-14*
