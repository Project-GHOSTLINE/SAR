# 🔧 FIX: 500 Error on /api/telemetry/track-event

**Date**: 2026-01-25
**Status**: 🔴 PRODUCTION ERROR

---

## ❌ PROBLÈME IDENTIFIÉ

L'API `/api/telemetry/track-event` retourne **500 Internal Server Error** en production.

**Erreur console**:
```
POST https://solutionargentrapide.ca/api/telemetry/track-event 500 (Internal Server Error)
[Telemetry] Failed to track event
```

**Cause root**: Variable d'environnement `TELEMETRY_HASH_SALT` manquante dans Vercel production.

---

## ✅ SOLUTION (5 MINUTES)

### Étape 1: Aller dans Vercel Settings

1. Va sur: **https://vercel.com/project-ghostline/sar/settings/environment-variables**

2. Clique sur **"Add New"**

### Étape 2: Ajouter TELEMETRY_HASH_SALT

**Name**:
```
TELEMETRY_HASH_SALT
```

**Value** (copie-colle EXACTEMENT):
```
95c2bec3908f3fe99257d2d2237e56e0cd144776c2f001e6df359d455a23bff2
```

**Environments** (sélectionne TOUS):
- ✅ Production
- ✅ Preview
- ✅ Development

### Étape 3: Sauvegarder

Clique sur **"Save"**

### Étape 4: Redéployer

Vercel va te proposer de redéployer. Clique **"Redeploy"** pour appliquer la nouvelle variable.

**OU** trigger manuellement:
```bash
cd "/Users/xunit/Desktop/📁 Projets/sar"
git commit --allow-empty -m "chore: Trigger redeploy for env var"
git push
```

---

## 🧪 VÉRIFICATION (Après redéploiement)

### Test 1: Visite le site

Ouvre ton site en navigation privée:
```
https://solutionargentrapide.ca/
```

Ouvre la console DevTools (F12) → onglet Console

**Attendu**: Aucune erreur 500, tracking fonctionne

### Test 2: Vérifie DB

```sql
-- Check nouvelle session créée après le fix
SELECT
  session_id,
  ip_hash,
  ua_hash,
  created_at
FROM client_sessions
WHERE created_at > NOW() - INTERVAL '10 minutes'
ORDER BY created_at DESC
LIMIT 3;
```

**Attendu**:
- `ip_hash` NOT NULL (16 chars hex)
- `ua_hash` NOT NULL (16 chars hex)

### Test 3: Check Vercel Logs

Va sur: **https://vercel.com/project-ghostline/sar/observability**

Filtre: `path:/api/telemetry/track-event`

**Attendu**:
- ✅ Status 200 (success)
- ✅ No "[SECURITY] TELEMETRY_HASH_SALT not set" errors

---

## 📋 POURQUOI ÇA A CASSÉ ?

1. **Commit 5459da3** a ajouté l'instrumentation Vercel Observability
2. Le code utilise `hashWithSalt()` qui require `TELEMETRY_HASH_SALT`
3. La variable existait en `.env.local` (dev) mais PAS dans Vercel (prod)
4. L'API ne peut pas hasher les IP/UA → erreur 500

**Privacy note**: Sans le hash salt, on ne peut pas hasher les IPs de manière sécurisée, donc le système refuse de continuer.

---

## 🔐 C'EST QUOI TELEMETRY_HASH_SALT ?

**Rôle**: Salt cryptographique pour anonymiser les IPs et User-Agents.

**Format**: 64 caractères hex (256 bits d'entropie)

**Utilisation**:
```typescript
// IP hashing (privacy-first)
const ipHash = hashWithSalt(clientIP) // → "8c37a4bed7b43cbd"

// UA hashing (fraud detection)
const uaHash = hashWithSalt(userAgent) // → "1f3e9a2c5b7d4f8e"
```

**Sécurité**:
- SHA-256 (non-réversible)
- Salt unique (même IP = hash différent entre projets)
- 16 premiers chars seulement (64 bits entropy, suffisant)

**GDPR**: Conforme car:
- IP jamais stockée en clair
- Hash non-réversible
- TTL 30j automatique

---

## ✅ APRÈS LE FIX

Une fois la variable ajoutée et redéployée:

1. ✅ Tracking reprend automatiquement
2. ✅ Sessions créées avec `ip_hash` et `ua_hash` valides
3. ✅ Métriques Vercel Observability fonctionnent
4. ✅ Plus d'erreurs 500 en console

**Aucun changement de code nécessaire** - juste la variable d'environnement.

---

## 📊 MONITORING POST-FIX

### Immédiat (5 min après redéploiement)
```bash
# Check logs en temps réel
# Vercel → Observability → Logs → Filter: track-event
```

**Cherche**:
- ✅ "First event for session" (sessions créées)
- ✅ No "[SECURITY] TELEMETRY_HASH_SALT not set"
- ✅ Status 200 responses

### Première heure
- Check métriques: `telemetry.sessions_created` (devrait incrémenter)
- Check métriques: `telemetry.api.duration_ms` (P50 < 300ms)
- Check métriques: `telemetry.api.errors` (devrait être 0)

### Premier jour
- Analyser Web Analytics → Visiteurs uniques
- Vérifier Speed Insights → Core Web Vitals
- Confirmer aucune régression

---

## 🚨 SI ÇA NE FIXE PAS

Si après redéploiement tu as encore des 500:

### Vérification 1: Variable bien définie
```bash
# Check variable existe dans Vercel
vercel env ls
# Devrait lister: TELEMETRY_HASH_SALT (Production, Preview, Development)
```

### Vérification 2: Build réussi
Vercel → Deployments → Latest → Check build logs

**Cherche**: Pas d'erreur de build/compilation

### Vérification 3: Autre cause ?
```bash
# Check Vercel function logs (erreur exacte)
# Observability → Logs → Level: Error
```

**Si autre erreur**, contacte-moi avec les logs exacts.

---

## 📝 ACTIONS PRÉVENTIVES (Future)

Pour éviter ce genre de problème:

### Checklist pré-déploiement
- [ ] Vérifier toutes les `.env.local` variables
- [ ] Confirmer variables définies dans Vercel
- [ ] Tester en preview deployment avant production
- [ ] Vérifier build logs pour warnings

### Variables critiques SAR
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=***
NEXT_PUBLIC_SUPABASE_ANON_KEY=***
SUPABASE_SERVICE_ROLE_KEY=***

# Telemetry
TELEMETRY_HASH_SALT=*** (⚠️ CELLE-CI MANQUAIT)

# Rate Limiting
UPSTASH_REDIS_REST_URL=***
UPSTASH_REDIS_REST_TOKEN=***

# Geolocation (optionnel en dev)
# ipapi.co utilise API publique (no key needed)
```

---

**FIN DU GUIDE DE FIX**
