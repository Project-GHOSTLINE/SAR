# 🚨 GUIDE DE CORRECTION URGENTE - Erreur 500

**Durée estimée**: 5 minutes
**Difficulté**: ⭐⭐ (Facile - copier/coller du SQL)

---

## 🎯 OBJECTIF

Corriger les erreurs 500 sur `/api/admin/messages?messageId=X` en créant les tables manquantes dans Supabase.

---

## 📋 ÉTAPES À SUIVRE

### Étape 1: Ouvrir Supabase Dashboard

1. Aller sur https://supabase.com
2. Se connecter
3. Sélectionner votre projet SAR
4. Cliquer sur **"SQL Editor"** dans le menu de gauche

### Étape 2: Diagnostic (Optionnel mais recommandé)

1. Dans SQL Editor, créer un **nouveau query**
2. Copier/coller le contenu de **`DIAGNOSTIC_SUPABASE.sql`**
3. Cliquer **"Run"** (ou Ctrl+Enter)
4. Observer les résultats:
   - ✅ Si "Table emails_envoyes existe? = ✅ OUI" → Passer à l'étape 4
   - ❌ Si "Table emails_envoyes existe? = ❌ NON" → Continuer à l'étape 3

### Étape 3: Créer la table `emails_envoyes`

1. Dans SQL Editor, créer un **nouveau query**
2. Copier/coller le contenu de **`CREATE_TABLE_EMAILS_ENVOYES.sql`**
3. Cliquer **"Run"**
4. Attendre le message: **"✅ Table emails_envoyes créée avec succès!"**

### Étape 4: Créer la table `notes`

1. Dans SQL Editor, créer un **nouveau query**
2. Copier/coller le contenu de **`CREATE_TABLE_NOTES.sql`**
3. Cliquer **"Run"**
4. Attendre le message: **"✅ Table notes créée avec succès!"**

### Étape 5: Vérification

1. Relancer **`DIAGNOSTIC_SUPABASE.sql`**
2. Vérifier que:
   - ✅ Table emails_envoyes existe? = **✅ OUI**
   - ✅ Table notes existe? = **✅ OUI**
3. Les deux tables devraient maintenant apparaître

### Étape 6: Test dans l'admin

1. Aller sur https://admin.solutionargentrapide.ca
2. Rafraîchir la page (F5 ou Cmd+R)
3. Cliquer sur l'onglet **Messages**
4. Cliquer sur n'importe quel message
5. ✅ Le panneau de détails devrait s'ouvrir sans erreur 500
6. ✅ La section "Emails Envoyés" devrait être visible
7. ✅ Plus d'erreurs dans la console du navigateur (F12)

---

## 🆘 EN CAS DE PROBLÈME

### Problème: "permission denied for table emails_envoyes"

**Solution**: Exécuter ce SQL:
```sql
ALTER TABLE emails_envoyes DISABLE ROW LEVEL SECURITY;
ALTER TABLE notes DISABLE ROW LEVEL SECURITY;
```

### Problème: "relation emails_envoyes does not exist"

**Solution**: La table n'a pas été créée. Réexécuter `CREATE_TABLE_EMAILS_ENVOYES.sql`

### Problème: Erreur 500 persiste

**Solution**:
1. Vérifier les logs Vercel: https://vercel.com/your-project/logs
2. Chercher "Messages API"
3. Partager l'erreur exacte

---

## 📊 RÉSULTAT ATTENDU

Après avoir suivi ces étapes:

✅ Les tables `emails_envoyes` et `notes` existent dans Supabase
✅ L'admin peut afficher les détails des messages
✅ La section "Emails Envoyés" montre les copies des emails
✅ Plus d'erreurs 500 dans la console
✅ Le système fonctionne normalement

---

## 🎬 PROCHAINES ÉTAPES

Une fois que tout fonctionne:

1. **Tester un nouveau message**
   - Aller sur https://client.solutionargentrapide.ca
   - Soumettre un nouveau message
   - Vérifier dans l'admin que les emails apparaissent

2. **Vérifier les emails enregistrés**
   - Ouvrir un message dans l'admin
   - Cliquer sur "Aperçu" pour chaque email
   - Vérifier que le HTML s'affiche correctement

3. **Migration deleted_at (optionnel)**
   - Si vous voulez la fonctionnalité de suppression
   - Exécuter `supabase/migrations/20260129120000_add_deleted_tracking.sql`

---

**Créé par**: Claude Sonnet 4.5
**Pour**: Solution Argent Rapide INC
**Date**: 2026-01-29
