# 🔍 Audit des Incohérences - SAR

**Date:** 2025-12-19
**Analysé par:** Claude Code

---

## ❌ PROBLÈMES CRITIQUES

### 1. Cookie Name Mismatch (AUTH CASSÉE)
**Fichiers concernés:**
- `src/middleware.ts` (ligne 34) → Cherche `admin_token`
- `src/app/api/admin/login/route.ts` (ligne 28) → Définit `admin-session`

**Impact:** L'authentification admin ne fonctionne pas correctement car le cookie est créé avec un nom mais vérifié avec un autre.

**Fix requis:**
```typescript
// middleware.ts ligne 34
const token = request.cookies.get('admin-session')?.value  // Changer admin_token → admin-session
```

---

### 2. Supabase URL Différente entre Envs → ✅ RÉSOLU
**Conflit trouvé:**
- `.env.local` → `https://ybqwpatvbtwzpwmmacvm.supabase.co` (vide, pas de table)
- Vercel production → `https://dllyzfuqjzuhvshrlmuq.supabase.co` (17 messages)

**Problème:** L'ANON_KEY sur Vercel était pour la mauvaise BD!

**Solution appliquée (2025-12-19):**
- ✅ Vérifié les deux BDs: `dllyzfuqjzuhvshrlmuq` a les données (17 messages)
- ✅ Mis à jour `NEXT_PUBLIC_SUPABASE_ANON_KEY` sur Vercel
- ✅ Mis à jour `.env.local` pour correspondre
- ✅ Redéployé sur Vercel
- ✅ Toutes les variables pointent maintenant vers `dllyzfuqjzuhvshrlmuq`

---

### 3. Debug Endpoint en Production
**Fichier:** `src/app/api/admin/debug-env/route.ts`

**Impact:** Expose des informations sensibles sur les variables d'environnement.

**Action:** À SUPPRIMER immédiatement de production.

---

## ⚠️ PROBLÈMES MINEURS

### 4. Documentation Obsolète

**VOPAY-INTEGRATION.md:**
- Ligne 95: Mentionne `localhost:3000` au lieu de production
- Ligne 100: Password hardcodé dans doc (risque sécurité)

**Fix:** Mettre à jour les URLs vers `https://admin.solutionargentrapide.ca`

---

### 5. .env.production Commité par Erreur
**Fichier:** `.env.production` est présent dans le repo

**Impact:** Contient des credentials Supabase en clair.

**Action:** Ajouter à `.gitignore` et supprimer du repo.

---

### 6. .env.example Incomplet
**Fichier:** `.env.example`

**Manque:**
- Variables VoPay
- Variables admin (JWT_SECRET, ADMIN_PASSWORD)
- Variables Vercel
- Variables Cloudflare

---

### 7. Redirects WordPress Inutiles?
**Fichier:** `next.config.js` (lignes 94-108)

Contient des redirects pour `/wp-admin`, `/wp-content`, etc.

**Question:** Est-ce encore nécessaire si le site n'est plus sur WordPress?

---

## 📋 DOUBLONS / REDONDANCE

### 8. Fichiers de Documentation Multiples
- `CLAUDE.md` - Workflow général
- `URLS.md` - URLs et routes
- `VOPAY-INTEGRATION.md` - Intégration VoPay

**Suggestion:** Créer une structure claire:
```
docs/
├── README.md (overview)
├── DEPLOYMENT.md (Vercel, DNS, etc.)
├── INTEGRATIONS.md (VoPay, Supabase, etc.)
└── ARCHITECTURE.md (structure code)
```

---

### 9. Deux Fichiers .env en Local
- `.env.local` (utilisé par Next.js)
- `.env.production` (téléchargé de Vercel)

**Action:** Garder uniquement `.env.local` pour le dev local.

---

## 🔒 PROBLÈMES DE SÉCURITÉ

### 10. Credentials dans .env.local (OK mais...)
Le fichier `.env.local` contient tous les credentials.

**Vérification nécessaire:**
```bash
# S'assurer que .env.local est bien dans .gitignore
cat .gitignore | grep ".env.local"
```

---

### 11. GitHub PAT dans .env.local
**Ligne 50:** `GITHUB_PAT=ghp_xxxxx...` (credentials exposés)

**Question:** Ce PAT est-il utilisé par l'application ou seulement pour le développement?

**Si dev only:** Devrait être dans `.env` personnel, pas `.env.local` du projet.

---

### 12. Vercel OIDC Token Expiré?
**Ligne 19:** Token OIDC avec expiration dans le passé

**Action:** Ces tokens expirent régulièrement, s'assurer qu'ils sont regénérés automatiquement.

---

## 📊 RÉSUMÉ DES ACTIONS REQUISES

### Urgent (à faire maintenant)
1. ✅ Fix cookie name: `admin_token` → `admin-session` dans middleware
2. ✅ Clarifier quelle Supabase URL utiliser
3. ✅ Supprimer `/api/admin/debug-env` de production
4. ✅ Ajouter `.env.production` à `.gitignore`

### Important (cette semaine)
5. ✅ Mettre à jour VOPAY-INTEGRATION.md avec URLs production
6. ✅ Compléter `.env.example` avec toutes les variables
7. ✅ Supprimer `.env.production` du repo git

### Nice to have (quand possible)
8. 📝 Restructurer la documentation
9. 🧹 Nettoyer redirects WordPress si inutiles
10. 🔐 Audit complet des credentials exposés

---

## 🎯 RECOMMANDATIONS

### Workflow Git
```bash
# Ne jamais commiter les .env
echo "*.env*" >> .gitignore
echo "!.env.example" >> .gitignore
git rm --cached .env.production
```

### Configuration Vercel
- Toutes les env vars critiques sont sur Vercel ✅
- Utiliser `vercel env pull` pour sync local
- Ne jamais hardcoder de secrets dans le code

### Documentation
- Créer un `docs/` folder
- Un seul fichier par sujet
- Garder URLs et credentials à jour

---

**Prochaine étape:** Fix du cookie name pour restaurer l'auth admin.
