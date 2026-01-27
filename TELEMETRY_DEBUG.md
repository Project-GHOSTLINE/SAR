# 🔍 DIAGNOSTIC TÉLÉMÉTRIE - GUIDE DE DÉPANNAGE

**Date**: 2026-01-27
**Commit**: `939fc8c` - Endpoint de diagnostic déployé

---

## 🚨 PROBLÈME ACTUEL

L'API télémétrie retourne 500 Internal Server Error:
```
POST https://admin.solutionargentrapide.ca/api/telemetry/track-event 500
```

---

## 🩺 ÉTAPE 1: DIAGNOSTIC AUTOMATIQUE

### Appelle l'endpoint de santé (Health Check)

**Production**:
```
https://admin.solutionargentrapide.ca/api/telemetry/health
```

**OU en local**:
```
http://localhost:3000/api/telemetry/health
```

### Ce qu'il va vérifier:

1. ✅ **TELEMETRY_HASH_SALT** - Variable d'environnement configurée?
2. ✅ **Supabase Connection** - Connexion à la base de données?
3. ✅ **Tables** - `client_sessions` et `client_telemetry_events` existent?
4. ✅ **Crypto Module** - Module Node.js crypto disponible?

### Réponse attendue (SI TOUT EST OK):

```json
{
  "timestamp": "2026-01-27T...",
  "status": "ok",
  "checks": {
    "hash_salt": {
      "status": "OK",
      "details": "Length: 64 chars"
    },
    "supabase_connection": {
      "status": "OK",
      "details": "Successfully queried client_sessions table"
    },
    "table_client_sessions": {
      "status": "OK"
    },
    "table_client_telemetry_events": {
      "status": "OK"
    },
    "crypto": {
      "status": "OK",
      "details": "crypto module available"
    }
  }
}
```

### Réponse SI TELEMETRY_HASH_SALT MANQUANT:

```json
{
  "timestamp": "2026-01-27T...",
  "status": "error",
  "checks": {
    "hash_salt": {
      "status": "MISSING",
      "details": "TELEMETRY_HASH_SALT environment variable not set"
    }
  }
}
```

---

## 🔧 ÉTAPE 2: SOLUTIONS SELON LE DIAGNOSTIC

### Cas 1: `hash_salt.status = "MISSING"`

**Problème**: Variable d'environnement manquante

**Solution**:
1. Va sur Vercel: https://vercel.com/project-ghostline/sar/settings/environment-variables
2. Ajoute:
   - **Key**: `TELEMETRY_HASH_SALT`
   - **Value**: `95c2bec3908f3fe99257d2d2237e56e0cd144776c2f001e6df359d455a23bff2`
   - **Environments**: Production, Preview, Development (les 3!)
3. **CRITIQUE**: Redeploy après avoir ajouté la variable
   - Va sur: https://vercel.com/project-ghostline/sar/deployments
   - Clique "..." sur le dernier deployment
   - Clique "Redeploy"

### Cas 2: `supabase_connection.status = "ERROR"`

**Problème**: Connexion Supabase échoue

**Solutions possibles**:
1. Vérifie que `NEXT_PUBLIC_SUPABASE_URL` est configuré
2. Vérifie que `SUPABASE_SERVICE_ROLE_KEY` est configuré
3. Vérifie que les credentials sont valides (test dans Supabase SQL Editor)

### Cas 3: `table_*.status = "ERROR"`

**Problème**: Tables n'existent pas

**Solution**: Exécute les migrations SQL:
```sql
-- Dans Supabase SQL Editor
-- Migration 1: client_sessions table
\i supabase/migrations/20260125000200_client_sessions_telemetry.sql

-- Migration 2: analytics views
\i supabase/migrations/20260125000300_analytics_views.sql
```

### Cas 4: `crypto.status = "ERROR"`

**Problème**: Module crypto non disponible (Edge runtime)

**Solution**: Vérifier que `/api/telemetry/track-event` utilise bien Node.js runtime:
```typescript
// En haut du fichier route.ts
export const runtime = 'nodejs' // Pas 'edge'
```

---

## 🧪 ÉTAPE 3: TEST MANUEL DE L'API

### Une fois le diagnostic passé (status = "ok")

Test l'endpoint télémétrie avec curl:

```bash
curl -X POST https://admin.solutionargentrapide.ca/api/telemetry/track-event \
  -H "Content-Type: application/json" \
  -H "Cookie: sar_session_id=test123456789012345678901234567890123456789012345678901234567890" \
  -d '{
    "event_type": "page_view",
    "event_name": "/test",
    "payload": {},
    "duration_ms": 100
  }'
```

**Réponse attendue** (200 OK):
```json
{
  "success": true,
  "event_id": "uuid-ici"
}
```

**Si toujours 500**, check les logs Vercel:
1. Va sur: https://vercel.com/project-ghostline/sar/logs
2. Filtre: `POST /api/telemetry/track-event`
3. Regarde l'erreur exacte dans les logs

---

## 📊 ÉTAPE 4: VÉRIFICATION BASE DE DONNÉES

### Si l'API retourne 200 OK, vérifie que les données sont insérées

```sql
-- Dans Supabase SQL Editor

-- 1. Check sessions créées (dernière heure)
SELECT session_id, client_id, created_at
FROM client_sessions
WHERE created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC
LIMIT 10;

-- 2. Check events trackés (dernière heure)
SELECT event_type, event_name, created_at
FROM client_telemetry_events
WHERE created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC
LIMIT 10;

-- 3. Check IP/UA hashes (privacy check)
SELECT ip_hash, ua_hash, created_at
FROM client_sessions
WHERE created_at > NOW() - INTERVAL '1 hour'
  AND ip_hash IS NOT NULL
LIMIT 5;
```

**Attendu**:
- Au moins 1 session créée
- Au moins 1 event tracké
- `ip_hash` = chaîne hexadécimale (16 chars)
- `ua_hash` = chaîne hexadécimale (16 chars)

---

## 🎯 CHECKLIST COMPLÈTE

### Avant le fix:
- [ ] Appelle `/api/telemetry/health`
- [ ] Note le status et les checks qui échouent
- [ ] Applique la solution correspondante

### Pendant le fix:
- [ ] Ajoute `TELEMETRY_HASH_SALT` dans Vercel
- [ ] **REDEPLOY** (crucial!)
- [ ] Attend 1-2 minutes (build time)

### Après le fix:
- [ ] Réappelle `/api/telemetry/health` → status = "ok"
- [ ] Test curl de `/api/telemetry/track-event` → 200 OK
- [ ] Check browser console → plus de 500 errors
- [ ] Check Supabase → sessions et events créés
- [ ] Ouvre dashboard analytics → données s'affichent

---

## 🚀 RACCOURCI RAPIDE

**Si tu es 100% sûr que le problème est TELEMETRY_HASH_SALT manquant**:

1. Vercel → Settings → Environment Variables
2. Add New:
   - `TELEMETRY_HASH_SALT` = `95c2bec3908f3fe99257d2d2237e56e0cd144776c2f001e6df359d455a23bff2`
   - Coche les 3 environnements
3. Deployments → Redeploy latest
4. Attends 2 minutes
5. Rafraîchis https://admin.solutionargentrapide.ca/admin/analytics
6. ✅ Données s'affichent!

---

## 📞 SI TOUJOURS BLOQUÉ

**Check ces 3 choses dans l'ordre**:

1. **Vercel Logs**: https://vercel.com/project-ghostline/sar/logs
   - Filtre: `telemetry`
   - Regarde la stack trace exacte

2. **Supabase Logs**: https://supabase.com/dashboard/project/.../logs
   - Regarde les erreurs Postgres

3. **Browser Network Tab**: F12 → Network → track-event
   - Clique sur la requête 500
   - Onglet "Response" → Copie le message d'erreur complet

Envoie-moi le message d'erreur exact si toujours bloqué.

---

**Deployment actuel**: Commit `939fc8c` avec endpoint de diagnostic
**Prochaine étape**: Appelle `/api/telemetry/health` et envoie-moi la réponse JSON
