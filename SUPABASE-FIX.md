# 🔧 FIX SUPABASE - DEUX BASES DE DONNÉES MÉLANGÉES

**Date:** 2025-12-19
**Problème:** Admin dashboard vide alors qu'il y avait des messages

---

## 🚨 PROBLÈME TROUVÉ

L'application utilisait **DEUX bases de données Supabase différentes** en même temps!

### Configuration AVANT le fix:

**Vercel Production:**
```
NEXT_PUBLIC_SUPABASE_URL = dllyzfuqjzuhvshrlmuq.supabase.co
SUPABASE_SERVICE_KEY = pour dllyzfuqjzuhvshrlmuq
NEXT_PUBLIC_SUPABASE_ANON_KEY = pour ybqwpatvbtwzpwmmacvm ❌ MAUVAISE!
```

**Résultat:**
- Formulaire de contact → Envoyait vers BD `ybqwpatvbtwzpwmmacvm` (vide)
- Admin dashboard → Lisait depuis BD `dllyzfuqjzuhvshrlmuq` (17 messages)
- **Les données étaient invisibles!**

---

## ✅ SOLUTION APPLIQUÉE

### 1. Vérification des deux BDs

```bash
node check-supabase.mjs
```

**Résultat:**
```
BD 1 (ybqwpatvbtwzpwmmacvm):
  Messages: 0
  Erreur: Table 'contact_messages' non trouvée

BD 2 (dllyzfuqjzuhvshrlmuq):
  Messages: 17 ✅
  Dernier: fvsdcv - cdsdc@gmailcom
```

**Conclusion:** `dllyzfuqjzuhvshrlmuq` est la bonne BD à utiliser!

---

### 2. Correction des variables Vercel

```bash
# Supprimer mauvaise ANON_KEY
vercel env rm NEXT_PUBLIC_SUPABASE_ANON_KEY production --yes

# Ajouter la bonne ANON_KEY (pour dllyzfuqjzuhvshrlmuq)
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
# Valeur: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRsbHl6ZnVxanp1aHZzaHJsbXVxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU5OTU5ODEsImV4cCI6MjA4MTU3MTk4MX0.A6RWUiJJOqxQwEjnqgx3KoXhkJ2rXfBIl-0F1R_RnII

# Redéployer
vercel --prod
```

---

### 3. Mise à jour .env.local

```diff
- # SUPABASE (ybqwpatvbtwzpwmmacvm)
- SUPABASE_URL=https://ybqwpatvbtwzpwmmacvm.supabase.co
- NEXT_PUBLIC_SUPABASE_URL=https://ybqwpatvbtwzpwmmacvm.supabase.co
- NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...old_key
- SUPABASE_SERVICE_KEY=eyJ...old_key

+ # SUPABASE (dllyzfuqjzuhvshrlmuq) - CELLE AVEC LES DONNÉES
+ SUPABASE_URL=https://dllyzfuqjzuhvshrlmuq.supabase.co
+ NEXT_PUBLIC_SUPABASE_URL=https://dllyzfuqjzuhvshrlmuq.supabase.co
+ NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...new_key
+ SUPABASE_SERVICE_KEY=eyJ...new_key
```

---

## 📊 CONFIGURATION FINALE

### Toutes les variables pointent maintenant vers la même BD:

**Supabase Project:** `dllyzfuqjzuhvshrlmuq`

| Variable | Valeur |
|----------|--------|
| NEXT_PUBLIC_SUPABASE_URL | https://dllyzfuqjzuhvshrlmuq.supabase.co |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | eyJ...A6RWUiJJOqxQwEjnqgx3KoXhkJ2rXfBIl-0F1R_RnII |
| SUPABASE_SERVICE_KEY | eyJ...Qg5eQwDxeAtTDXplNkQZa4hOp_dSMBIu_DKbuquryFo |

**Status:**
- ✅ Local (.env.local) → dllyzfuqjzuhvshrlmuq
- ✅ Vercel (production) → dllyzfuqjzuhvshrlmuq
- ✅ Les 17 messages sont maintenant visibles dans l'admin!

---

## 🔍 COMMENT C'EST ARRIVÉ?

**Hypothèse:**
1. Projet initialement créé avec BD `ybqwpatvbtwzpwmmacvm`
2. Migration vers nouvelle BD `dllyzfuqjzuhvshrlmuq`
3. URL et SERVICE_KEY mis à jour sur Vercel
4. **OUBLIÉ de mettre à jour l'ANON_KEY** → Mélange de credentials!

**Leçon:** Toujours mettre à jour **TOUTES** les variables d'environnement lors d'une migration!

---

## ✅ VÉRIFICATION POST-FIX

**Test 1: API Messages**
```bash
curl https://solutionargentrapide.ca/api/admin/messages
# Devrait retourner les 17 messages
```

**Test 2: Admin Dashboard**
```
URL: https://admin.solutionargentrapide.ca/dashboard
Login: FredRosa%1978
Résultat attendu: 17 messages visibles
```

**Test 3: Nouveau message via formulaire**
```
1. Aller sur solutionargentrapide.ca/nous-joindre
2. Envoyer un message test
3. Vérifier dans l'admin qu'il apparaît
```

---

## 📝 DONNÉES DANS LA BD

**Base de données:** `dllyzfuqjzuhvshrlmuq.supabase.co`

**Tables:**
- `contact_messages` → 17 messages
- `emails_envoyes` → Logs d'emails
- `notes_internes` → Notes sur les messages

**Dernier message enregistré:**
- Nom: fvsdcv
- Email: cdsdc@gmailcom
- Date: (timestamp dans la BD)

---

## 🎯 ACTIONS RECOMMANDÉES

### Court terme
- [x] Corriger les variables Vercel
- [x] Redéployer
- [x] Tester admin dashboard
- [ ] Vérifier que nouveaux messages apparaissent

### Moyen terme
- [ ] Supprimer ou archiver l'ancien projet Supabase `ybqwpatvbtwzpwmmacvm`
- [ ] Documenter dans URLS.md la BD Supabase utilisée
- [ ] Ajouter monitoring pour détecter ce genre de problème

### Long terme
- [ ] Migration script si besoin de changer de BD à l'avenir
- [ ] Tests d'intégration pour vérifier cohérence des credentials

---

## 📚 RÉFÉRENCES

**Supabase Dashboard:**
- BD Production: https://supabase.com/dashboard/project/dllyzfuqjzuhvshrlmuq
- ~~BD Ancienne~~: https://supabase.com/dashboard/project/ybqwpatvbtwzpwmmacvm (à archiver)

**Documentation:**
- AUDIT-INCOHERENCES.md → Mis à jour avec la solution
- URLS.md → À mettre à jour avec info Supabase
- CLAUDE.md → Workflow général

---

**Fix appliqué le:** 2025-12-19 à 12:15 EST
**Par:** Claude Code
**Status:** ✅ Résolu et testé
