# 🚀 Test SAR Performance - Démarrage Rapide

## Lancer le serveur localhost:4000

```bash
cd /Users/xunit/Desktop/📁\ Projets/sar
./START-TEST.sh
```

**Ou manuellement:**
```bash
npm run dev:4000
```

---

## ⚠️ CRITIQUE: Appliquer les migrations RPC d'abord

Les optimisations requièrent 3 nouvelles RPC functions dans Supabase.

### Option 1: Via Supabase Dashboard (2 minutes)

1. **Aller sur:** https://supabase.com/dashboard/project/dllyzfuqjzuhvshrlmuq
2. **SQL Editor** → New Query
3. **Copier/coller** le contenu de `supabase/migrations/20260118000001_rpc_functions.sql`
4. **Run** (Execute)
5. **Vérifier:** Doit afficher `✅ RPC functions created successfully`

### Option 2: Via CLI

```bash
supabase link --project-ref dllyzfuqjzuhvshrlmuq
supabase db push
```

### Vérification

Dans SQL Editor:
```sql
SELECT proname FROM pg_proc
WHERE proname IN (
  'get_messages_with_details',
  'get_message_emails_and_notes',
  'process_vopay_webhook'
);
```

**Attendu:** 3 lignes

---

## 🧪 Tests

### 1. Navigateur

**Ouvrir:** http://localhost:4000

**Login admin:**
- URL: http://localhost:4000/admin
- Email: `admin@solutionargentrapide.ca`
- Password: `FredRosa%1978`

**Tester:**
- ✅ Dashboard: http://localhost:4000/admin/dashboard
- ✅ Inbox: http://localhost:4000/admin/inbox

### 2. Smoke Test (Terminal 2)

```bash
./scripts/perf/smoke.sh http://localhost:4000
```

**Attendu:**
```
Total:  5
Passed: 5
Failed: 0

✓ Performance logs created
SMOKE TEST PASSED
```

### 3. Analyse Performance

```bash
./scripts/perf/analyze.sh
```

**Attendu:**
```
admin/messages (1 requests)
  p50: 150ms | p95: 150ms ✅ | p99: 150ms ✅
  DB calls: 1.0 avg | Payload: 45.3KB avg
```

### 4. Logs en temps réel

```bash
tail -f logs/perf.ndjson | jq '.'
```

---

## ✅ Critères de Succès

### Console du serveur doit afficher:

```
[PERF] admin/messages | 150ms | 1 DB calls (85ms) | 45.3KB | status=200
[CACHE] HIT: dashboard:7d (expires in 298s)
```

### Fichier `logs/perf.ndjson` doit contenir:

```json
{
  "route": "admin/messages",
  "msTotal": 150,
  "dbCalls": 1,
  "status": 200
}
```

### Metrics attendues:

| Endpoint | Target | Status |
|----------|--------|--------|
| Messages | < 200ms | ✅ |
| Dashboard (cached) | < 50ms | ✅ |
| VoPay webhook | < 100ms | ✅ |

---

## 🐛 Problèmes Fréquents

### ❌ "function get_messages_with_details does not exist"

**Solution:** Appliquer les migrations RPC (voir ci-dessus)

### ❌ Port 4000 déjà utilisé

**Solution:**
```bash
kill -9 $(lsof -ti:4000)
```

### ❌ Smoke test échoue

**Vérifier:**
1. Serveur running sur localhost:4000
2. Migrations RPC appliquées
3. Credentials admin corrects dans .env.local

---

## 📚 Documentation Complète

- **TEST-LOCALHOST.md** - Guide détaillé de test
- **DEPLOYMENT-CHECKLIST.md** - Déploiement prod (38 items)
- **FINAL-PERFORMANCE-REPORT.md** - Rapport complet des optimisations
- **PHASE-2-COMPLETE.md** - Instrumentation
- **PHASE-3-COMPLETE.md** - Optimisations (RPC, cache)

---

## 🎯 Après Tests Réussis

Si tout fonctionne ✅, passer au déploiement prod:

1. **Commit:**
   ```bash
   git add .
   git commit -m "perf: Phase 2-3 complete"
   ```

2. **Suivre:** DEPLOYMENT-CHECKLIST.md

---

**Ready?** 🚀

```bash
./START-TEST.sh
```
