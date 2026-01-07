# 🧪 Guide de Test des Webhooks - SAR

Documentation complète pour tester les webhooks de Solution Argent Rapide INC.

---

## 📋 Vue d'Ensemble

Ce projet contient **3 méthodes de test différentes** pour valider tous les webhooks de l'application.

### Webhooks Testés

1. **VoPay Webhook** (`/api/webhooks/vopay`)
   - Reçoit les notifications de paiements
   - Validation HMAC SHA1
   - Statuts: successful, failed, pending, in progress, cancelled

2. **Margill Webhook** (`/api/webhook/margill`)
   - Synchronisation CRM Margill
   - Authentification admin requise
   - Mapping des statuts

3. **Debug Webhook** (`/api/admin/webhooks/debug`)
   - Diagnostic Supabase
   - Vérification de configuration

---

## 🚀 Quick Start

### Prérequis

```bash
# 1. Assurez-vous que le serveur Next.js tourne
npm run dev

# 2. Vérifiez que les credentials sont configurés
cat .env.local | grep VOPAY_SHARED_SECRET
```

### Lancer TOUS les Tests

```bash
# Méthode recommandée: Tous les tests d'un coup
node test-all-webhooks.mjs
```

### Lancer les Tests Individuellement

```bash
# Méthode 1: Appels directs (rapide)
node test-webhooks-method1.mjs

# Méthode 2: Payloads réels (génère des données en DB)
node test-webhooks-method2.mjs

# Méthode 3: Tests de sécurité (vérifie les vulnérabilités)
node test-webhooks-method3.mjs
```

---

## 📖 Détail des Méthodes

### 🔵 Méthode 1: Appels Directs avec Fetch

**Objectif:** Vérifier que les endpoints répondent correctement

**Tests:**
- ✅ GET `/api/webhooks/vopay` (webhook online?)
- ✅ POST minimal (validation des champs requis)
- ✅ GET `/api/admin/webhooks/debug` (Supabase connecté?)
- ✅ POST `/api/webhook/margill` sans auth (protection active?)

**Durée:** ~2 secondes

```bash
node test-webhooks-method1.mjs
```

**Résultat attendu:**
```
📊 RÉSULTATS: 4/4 tests réussis
✅ Tous les tests de la Méthode 1 sont passés!
```

---

### 🟢 Méthode 2: Simulation de Payloads Réels

**Objectif:** Tester avec des données réalistes et signatures valides

**Tests:**
- ✅ Transaction VoPay **SUCCESSFUL** (signature valide)
- ✅ Transaction VoPay **FAILED** avec raison
- ✅ Transaction VoPay **PENDING**
- ✅ Webhook Margill avec données complètes
- ✅ Tous les statuts VoPay (successful, failed, pending, in progress, cancelled)

**Durée:** ~5 secondes

⚠️ **ATTENTION:** Ce test **génère des données réelles** dans la base de données!

```bash
node test-webhooks-method2.mjs
```

**Résultat attendu:**
```
📊 RÉSULTATS: 5/5 tests réussis
✅ Tous les tests de la Méthode 2 sont passés!

💡 TIP: Vérifiez les logs dans Supabase (table vopay_webhook_logs)
```

**Vérification dans Supabase:**
```sql
SELECT * FROM vopay_webhook_logs
WHERE transaction_id LIKE 'TEST-%'
ORDER BY created_at DESC
LIMIT 10;
```

---

### 🔴 Méthode 3: Validation Sécurité & Signatures

**Objectif:** Tester la robustesse et la sécurité des webhooks

**Tests:**
- ✅ Signature INVALIDE (doit être rejetée)
- ✅ Champs requis manquants (4 cas de test)
- ✅ Données malformées (JSON invalide, types incorrects)
- ✅ Replay Attack (même webhook envoyé 2x)
- ✅ Tentatives d'injection (SQL, XSS, Path Traversal, Command)
- ✅ Rate Limiting (20 requêtes rapides)

**Durée:** ~10 secondes

```bash
node test-webhooks-method3.mjs
```

**Résultat attendu:**
```
📊 RÉSULTATS: 6/6 tests réussis
✅ Tous les tests de sécurité sont passés!

💡 RECOMMANDATIONS:
   1. Implémenter protection replay (timestamp/nonce)
   2. Ajouter rate limiting (ex: 10 req/min par IP)
   3. Logger toutes les tentatives suspectes
   4. Monitorer les webhooks en temps réel
```

---

## 🔍 Interprétation des Résultats

### ✅ Tous les Tests Passent

Votre webhook est **prêt pour la production**! 🚀

Actions recommandées:
1. Configurer l'URL du webhook dans VoPay dashboard
2. Activer le monitoring en production
3. Configurer les alertes en cas d'échec

### ⚠️ Certains Tests Échouent

**Méthode 1 échoue:**
- Le serveur n'est pas accessible → Vérifier `npm run dev`
- Supabase non configuré → Vérifier `.env.local`

**Méthode 2 échoue:**
- Signature invalide → Vérifier `VOPAY_SHARED_SECRET`
- Erreur DB → Vérifier les permissions Supabase
- Table manquante → Exécuter les migrations

**Méthode 3 échoue:**
- Signature invalide acceptée → **CRITIQUE**: Bug de sécurité!
- Injection réussie → **CRITIQUE**: Vulnérabilité SQL/XSS!
- Rate limiting absent → **ATTENTION**: Ajouter protection DDoS

---

## 🔧 Configuration Requise

### Variables d'Environnement

```bash
# .env.local
VOPAY_SHARED_SECRET=ToDqaRRl4nmwnAYVc+==
VOPAY_API_KEY=bUXExKVc0sLyNS9zjfGq6AJukdDB1pvCR5ihHF78
VOPAY_ACCOUNT_ID=solutionargentrapideinc

NEXT_PUBLIC_SUPABASE_URL=https://dllyzfuqjzuhvshrlmuq.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Table Supabase Requise

```sql
CREATE TABLE IF NOT EXISTS vopay_webhook_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id TEXT NOT NULL,
  transaction_type TEXT,
  transaction_amount DECIMAL,
  status TEXT NOT NULL,
  failure_reason TEXT,
  environment TEXT,
  validation_key TEXT,
  is_validated BOOLEAN DEFAULT false,
  raw_payload JSONB,
  updated_at TIMESTAMPTZ,
  processed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_vopay_webhook_logs_transaction_id ON vopay_webhook_logs(transaction_id);
CREATE INDEX idx_vopay_webhook_logs_status ON vopay_webhook_logs(status);
```

---

## 🐛 Debugging

### Le serveur ne répond pas

```bash
# Vérifier que le serveur tourne
lsof -i :3000

# Démarrer le serveur
npm run dev

# Vérifier l'accessibilité
curl http://localhost:3000/api/webhooks/vopay
```

### Erreur "Invalid signature"

```bash
# Vérifier que le secret est correct
echo $VOPAY_SHARED_SECRET

# Vérifier dans le code
grep VOPAY_SHARED_SECRET .env.local
```

### Erreur "Database unavailable"

```bash
# Tester la connexion Supabase
curl http://localhost:3000/api/admin/webhooks/debug
```

### Voir les logs en temps réel

```bash
# Terminal 1: Serveur Next.js
npm run dev

# Terminal 2: Tests
node test-all-webhooks.mjs

# Terminal 3: Logs Supabase (optionnel)
# Ouvrir https://supabase.com/dashboard/project/dllyzfuqjzuhvshrlmuq/logs
```

---

## 📊 Dashboard Admin

Pour voir les webhooks reçus en production:

**URL:** https://progression.solutionargentrapide.ca/admin/webhooks

**Features:**
- Liste de tous les webhooks reçus
- Filtre par statut (successful, failed, pending)
- Détails du payload JSON
- Retry manuel en cas d'échec

---

## 🔐 Sécurité

### ✅ Mesures Implémentées

1. **Validation HMAC SHA1** - Signature des webhooks VoPay
2. **Validation des champs** - Champs requis obligatoires
3. **Protection injection** - Paramétrage des requêtes SQL
4. **Auth admin** - Webhook Margill protégé

### ⚠️ À Implémenter (Recommandé)

1. **Protection Replay Attack**
   ```typescript
   // Ajouter un nonce ou timestamp
   if (Date.now() - webhookTimestamp > 300000) {
     return NextResponse.json({ error: 'Webhook expired' }, { status: 401 })
   }
   ```

2. **Rate Limiting**
   ```typescript
   // Utiliser @upstash/ratelimit ou similar
   import { Ratelimit } from '@upstash/ratelimit'
   const ratelimit = new Ratelimit({ ... })
   ```

3. **IP Whitelist** (Production uniquement)
   ```typescript
   const ALLOWED_IPS = ['52.60.123.456', '52.60.789.012'] // IPs VoPay
   if (!ALLOWED_IPS.includes(request.ip)) {
     return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
   }
   ```

---

## 📝 Logs et Monitoring

### Consulter les Logs

**Supabase:**
```sql
-- Derniers webhooks reçus
SELECT * FROM vopay_webhook_logs
ORDER BY created_at DESC
LIMIT 20;

-- Webhooks échoués
SELECT * FROM vopay_webhook_logs
WHERE status = 'failed'
ORDER BY created_at DESC;

-- Statistiques
SELECT
  status,
  COUNT(*) as count,
  AVG(transaction_amount) as avg_amount
FROM vopay_webhook_logs
GROUP BY status;
```

**Vercel:**
- https://vercel.com/project-ghostline/sar/logs
- Filtre: `api/webhooks`

---

## 🧹 Nettoyage

### Supprimer les données de test

```sql
-- Supprimer tous les webhooks de test
DELETE FROM vopay_webhook_logs
WHERE transaction_id LIKE 'TEST-%';

-- Vérifier
SELECT COUNT(*) FROM vopay_webhook_logs
WHERE transaction_id LIKE 'TEST-%';
```

---

## 📞 Support

### Questions Fréquentes

**Q: Les tests échouent tous?**
R: Vérifiez que le serveur Next.js tourne avec `npm run dev`

**Q: Erreur "Invalid signature"?**
R: Vérifiez que `VOPAY_SHARED_SECRET` est correct dans `.env.local`

**Q: Comment tester en production?**
R: Utilisez webhook.site et configurez l'URL dans VoPay dashboard

**Q: Comment configurer VoPay?**
R: Dashboard VoPay → Settings → Webhooks → URL: `https://progression.solutionargentrapide.ca/api/webhooks/vopay`

---

## ✅ Checklist de Déploiement

Avant de déployer en production:

- [ ] Tous les tests passent (3/3 méthodes)
- [ ] Variables d'environnement configurées dans Vercel
- [ ] Table `vopay_webhook_logs` créée dans Supabase
- [ ] URL du webhook configurée dans VoPay dashboard
- [ ] Protection replay implémentée (recommandé)
- [ ] Rate limiting activé (recommandé)
- [ ] Monitoring configuré (Sentry, LogRocket, etc.)
- [ ] Alertes configurées en cas d'échec webhook
- [ ] Documentation à jour pour l'équipe

---

**Dernière mise à jour:** 2026-01-06
**Créé par:** Claude pour Hello Solution Argent Rapide INC
**Version:** 1.0.0
