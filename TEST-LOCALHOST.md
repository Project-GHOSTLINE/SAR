# Test SAR Performance sur localhost:4000

**Date:** 2026-01-19
**Objectif:** Tester les optimisations PHASE 2-3 en local avant déploiement prod

---

## 🚀 Démarrage Rapide

### 1. Installer les dépendances (si pas fait)

```bash
cd /Users/xunit/Desktop/📁\ Projets/sar
npm install
```

### 2. Vérifier les credentials Supabase

Le fichier `.env.local` pointe vers la DB Supabase de production:
```
NEXT_PUBLIC_SUPABASE_URL=https://dllyzfuqjzuhvshrlmuq.supabase.co
```

**Note:** Les migrations RPC doivent être appliquées sur cette DB pour que les tests fonctionnent.

### 3. Appliquer les migrations Supabase (CRITIQUE)

**Option A: Via Supabase Dashboard (Recommandé pour test)**

1. Aller sur https://supabase.com/dashboard/project/dllyzfuqjzuhvshrlmuq
2. SQL Editor → New Query
3. Copier/coller le contenu de `supabase/migrations/20260118000000_performance_indexes.sql`
4. Exécuter (Run)
5. Répéter pour `20260118000001_rpc_functions.sql`
6. Répéter pour `20260118000002_materialized_views.sql`

**Option B: Via CLI Supabase**

```bash
# Si Supabase CLI installé
supabase link --project-ref dllyzfuqjzuhvshrlmuq
supabase db push
```

**Vérification:**
```sql
-- Dans SQL Editor, vérifier que les RPC existent
SELECT proname FROM pg_proc WHERE proname IN (
  'get_messages_with_details',
  'get_message_emails_and_notes',
  'process_vopay_webhook'
);
-- Doit retourner 3 lignes
```

### 4. Lancer le serveur sur port 4000

```bash
npm run dev:4000
```

**Attendu:**
```
▲ Next.js 14.2.35
- Local:        http://localhost:4000
- Network:      http://192.168.x.x:4000

✓ Ready in 2.5s
```

### 5. Tester dans le navigateur

**Ouvrir:** http://localhost:4000

**Pages à tester:**
1. ✅ Page d'accueil (public)
2. ✅ Admin login: http://localhost:4000/admin
3. ✅ Admin dashboard: http://localhost:4000/admin/dashboard
4. ✅ Admin inbox: http://localhost:4000/admin/inbox

**Credentials admin:**
```
Email: admin@solutionargentrapide.ca
Password: FredRosa%1978
```

---

## 🧪 Tests Automatiques

### Test 1: Smoke Test (5 endpoints critiques)

```bash
./scripts/perf/smoke.sh http://localhost:4000
```

**Attendu:**
```
========================================
  SAR PERFORMANCE SMOKE TEST - PHASE 2
========================================

Base URL: http://localhost:4000

[1] Testing: GET /api/admin/messages
✓ PASS - 150ms (status=200)

[2] Testing: GET /api/admin/analytics/dashboard
✓ PASS - 300ms (status=200)

...

========================================
  RESULTS
========================================

Total:  5
Passed: 5
Failed: 0

✓ Performance logs created: 5 entries in logs/perf.ndjson

SMOKE TEST PASSED
```

**Si échec:**
- Vérifier que les migrations RPC sont appliquées
- Vérifier les credentials admin (JWT_SECRET, etc.)
- Regarder les logs console du serveur

### Test 2: Analyse Performance

```bash
./scripts/perf/analyze.sh
```

**Attendu:**
```
========================================
  PERFORMANCE ANALYSIS
========================================

Total requests: 5

Per-Route Statistics:
---

admin/messages (1 requests)
  p50: 150ms | p95: 150ms ✅ | p99: 150ms ✅
  DB calls: 1.0 avg | Payload: 45.3KB avg

webhooks/vopay (1 requests)
  p50: 50ms | p95: 50ms ✅ | p99: 50ms ✅
  DB calls: 1.0 avg | Payload: 1.2KB avg
```

---

## 📊 Vérifier les Logs de Performance

### Voir les logs en temps réel

```bash
tail -f logs/perf.ndjson
```

### Voir les logs formatés (jq requis)

```bash
tail -f logs/perf.ndjson | jq '.'
```

**Exemple de log:**
```json
{
  "route": "admin/messages",
  "requestId": "req_1737309600_abc123",
  "msTotal": 150,
  "status": 200,
  "bytesOut": 46380,
  "dbCalls": 1,
  "dbMsTotal": 85,
  "timestamp": "2026-01-19T18:00:00.000Z"
}
```

### Voir les logs dans la console du serveur

**Format coloré:**
```
[PERF] admin/messages | 150ms | 1 DB calls (85ms) | 45.3KB | status=200
[CACHE] HIT: dashboard:7d (expires in 298s)
```

**Codes couleur:**
- 🟢 Vert: < 100ms
- 🟡 Jaune: 100-200ms
- 🔴 Rouge: > 200ms

---

## 🔍 Tests Manuels Détaillés

### Test Messages Endpoint

**1. Liste des messages**

```bash
# Obtenir un token admin d'abord (via navigateur ou curl login)
export ADMIN_TOKEN="votre-token-admin"

curl -s http://localhost:4000/api/admin/messages \
  -H "Cookie: admin-session=$ADMIN_TOKEN" \
  -w "\n\nTime: %{time_total}s\n" | jq '.'
```

**Attendu:**
- Status: 200
- Time: < 0.2s
- Payload: messages array avec counts
- Console: `[PERF] admin/messages | 150ms | 1 DB calls ...`

**2. Détail d'un message**

```bash
# Remplacer MESSAGE_ID par un ID réel
curl -s "http://localhost:4000/api/admin/messages?messageId=1" \
  -H "Cookie: admin-session=$ADMIN_TOKEN" \
  -w "\n\nTime: %{time_total}s\n" | jq '.'
```

**Attendu:**
- Status: 200
- Time: < 0.1s
- Payload: emails + notes arrays
- Console: `[PERF] admin/messages | 50ms | 1 DB calls ...`

### Test Dashboard Cache

**1. Premier appel (MISS)**

```bash
curl -s http://localhost:4000/api/admin/analytics/dashboard?period=7d \
  -H "Cookie: admin-session=$ADMIN_TOKEN" \
  -w "\n\nTime: %{time_total}s\n"
```

**Attendu:**
- Console: `[CACHE] MISS: dashboard:7d - computing...`
- Console: `[CACHE] SET: dashboard:7d (TTL: 300s)`
- Time: ~0.5s (appel Google Analytics)

**2. Deuxième appel (HIT)**

```bash
curl -s http://localhost:4000/api/admin/analytics/dashboard?period=7d \
  -H "Cookie: admin-session=$ADMIN_TOKEN" \
  -w "\n\nTime: %{time_total}s\n"
```

**Attendu:**
- Console: `[CACHE] HIT: dashboard:7d (expires in 298s)`
- Time: ~0.02s (-96% latency)
- Même payload que premier appel

### Test VoPay Webhook

**Note:** Le webhook requiert une signature valide. Test de base:

```bash
curl -s http://localhost:4000/api/webhooks/vopay
```

**Attendu:**
- Status: 200
- Response: `{ "status": "online", "endpoint": "VoPay Webhook Receiver" }`

---

## ✅ Checklist Tests Réussis

Avant de considérer le test local comme réussi:

### Fonctionnel
- [ ] App démarre sur localhost:4000 sans erreurs
- [ ] Page d'accueil charge (/)
- [ ] Login admin fonctionne (/admin)
- [ ] Dashboard admin charge (/admin/dashboard)
- [ ] Inbox admin charge (/admin/inbox)

### Performance
- [ ] Smoke test passe (5/5 tests ✓)
- [ ] Messages endpoint: p95 < 200ms
- [ ] Dashboard cache fonctionne (MISS puis HIT)
- [ ] Logs de performance créés dans `logs/perf.ndjson`
- [ ] Console affiche `[PERF]` et `[CACHE]` logs

### Database
- [ ] Migrations RPC appliquées (3 functions existent)
- [ ] Pas d'erreurs "function does not exist" dans console
- [ ] Messages charge avec 1 DB call (pas 2 + 2N)
- [ ] Webhook traite avec 1 DB call (pas 10)

### Instrumentation
- [ ] Fichier `logs/perf.ndjson` existe
- [ ] Logs contiennent: route, msTotal, dbCalls, bytesOut, status
- [ ] Script `analyze.sh` fonctionne
- [ ] Console affiche logs colorés en dev mode

---

## 🐛 Troubleshooting

### Erreur: "function get_messages_with_details does not exist"

**Cause:** Migrations RPC pas appliquées

**Solution:**
1. Aller sur Supabase Dashboard
2. SQL Editor
3. Exécuter `supabase/migrations/20260118000001_rpc_functions.sql`

### Erreur: "Cannot find module '@/lib/perf'"

**Cause:** TypeScript paths non configurés

**Solution:**
```bash
npm install
```

Vérifier `tsconfig.json` contient:
```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

### Erreur: Port 4000 déjà utilisé

**Solution:**
```bash
# Trouver le process
lsof -ti:4000

# Tuer le process
kill -9 $(lsof -ti:4000)

# Ou changer le port
npm run dev -- -p 4001
```

### Cache ne fonctionne pas (toujours MISS)

**Cause:** Serveur redémarre entre les appels

**Solution:**
- Garder le serveur running
- Faire plusieurs appels sans redémarrer
- Cache in-memory se réinitialise à chaque restart

### Smoke test timeout

**Cause:** Serveur pas démarré ou port incorrect

**Solution:**
```bash
# Vérifier serveur running
curl http://localhost:4000

# Utiliser bon port dans smoke test
./scripts/perf/smoke.sh http://localhost:4000
```

---

## 📈 Métriques Attendues

### Latences (p95)

| Endpoint | Target | Typical |
|----------|--------|---------|
| Messages list | < 200ms | ~150ms |
| Messages detail | < 100ms | ~50ms |
| Dashboard (first) | < 500ms | ~300ms |
| Dashboard (cached) | < 50ms | ~20ms |
| VoPay webhook | < 100ms | ~50ms |

### Database Calls

| Endpoint | Before | After |
|----------|--------|-------|
| Messages list | 2 + 2N | 1 |
| Messages detail | 2 | 1 |
| VoPay webhook | 10+ | 1 |
| Dashboard | N/A | 0 (cached) |

### Payload Sizes

| Endpoint | Typical | Max |
|----------|---------|-----|
| Messages list | 45KB | 150KB |
| Dashboard | 10KB | 50KB |
| VoPay webhook | 1KB | 5KB |

---

## 🎯 Prochaines Étapes

### Si tout fonctionne ✅

1. **Git commit:**
   ```bash
   git add .
   git commit -m "perf: Phase 2-3 complete - RPC + cache + instrumentation"
   ```

2. **Préparer prod:**
   - Revoir `DEPLOYMENT-CHECKLIST.md`
   - Backup DB avant migrations prod
   - Appliquer migrations sur prod Supabase
   - Déployer code sur Vercel

3. **Monitoring:**
   - Suivre les logs de performance
   - Vérifier cache hit rates
   - Ajuster TTL si nécessaire

### Si problèmes ❌

1. **Debug:**
   - Vérifier logs console serveur
   - Vérifier `logs/perf.ndjson`
   - Vérifier migrations Supabase appliquées

2. **Rollback local:**
   ```bash
   git checkout main
   npm install
   npm run dev:4000
   ```

3. **Support:**
   - Relire `PHASE-2-COMPLETE.md`
   - Relire `PHASE-3-COMPLETE.md`
   - Vérifier `FINAL-PERFORMANCE-REPORT.md`

---

## 📞 Questions Fréquentes

**Q: Pourquoi localhost:4000 et pas 3000?**
A: Pour éviter conflit avec d'autres projets Next.js en local.

**Q: Les données sont-elles réelles?**
A: Oui, `.env.local` pointe vers Supabase prod. Faire attention aux tests destructifs.

**Q: Cache persiste entre redémarrages?**
A: Non, cache in-memory se vide à chaque restart. En prod, considérer Redis.

**Q: Dois-je appliquer les migrations sur prod maintenant?**
A: Non, teste d'abord en local. Si OK, suis `DEPLOYMENT-CHECKLIST.md` pour prod.

**Q: Les optimisations sont-elles réversibles?**
A: Oui, les RPC functions sont additives. L'ancien code continue de fonctionner.

---

**Ready to test?** 🚀

```bash
cd /Users/xunit/Desktop/📁\ Projets/sar
npm run dev:4000
```

Puis dans un autre terminal:
```bash
./scripts/perf/smoke.sh http://localhost:4000
```

**Status:** 🟢 Prêt pour tests localhost:4000
