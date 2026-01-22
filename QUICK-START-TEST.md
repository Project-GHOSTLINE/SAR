# Guide de Test Rapide - Système d'Analyse Automatisé SAR

Ce guide vous permet de tester rapidement le système d'analyse automatisé.

---

## ✅ Étape 1: Vérifier que le Build Réussit

```bash
cd /Users/xunit/Desktop/📁\ Projets/sar
npm run build
```

**Résultat attendu:** Build réussit sans erreurs TypeScript.

✅ **FAIT** - Le build réussit maintenant!

---

## ✅ Étape 2: Démarrer le Serveur de Développement

```bash
npm run dev
```

Ouvrir: http://localhost:3000

---

## 🧪 Étape 3: Test Manuel du Worker

### Option A: Via l'API Route (Recommandé)

1. **Créer un job de test dans la base de données:**

```sql
-- Se connecter à Supabase Dashboard: https://supabase.com/dashboard
-- Aller dans SQL Editor

-- Trouver une analyse existante
SELECT id, client_name, inverite_guid
FROM client_analyses
ORDER BY created_at DESC
LIMIT 5;

-- Créer un job de test (remplacer {analysis_id} par un ID réel)
INSERT INTO analysis_jobs (analysis_id, status, priority)
VALUES ('{analysis_id}', 'pending', 'high')
RETURNING *;
```

2. **Traiter le job via l'API:**

Méthode 1 - Dans le navigateur:
```
http://localhost:3000/api/worker/process-jobs
```

Méthode 2 - Via curl:
```bash
curl http://localhost:3000/api/worker/process-jobs
```

3. **Vérifier les résultats:**

```sql
-- Vérifier le job
SELECT * FROM analysis_jobs
WHERE analysis_id = '{analysis_id}'
ORDER BY created_at DESC;

-- Vérifier les scores
SELECT * FROM analysis_scores
WHERE analysis_id = '{analysis_id}';

-- Vérifier la recommandation
SELECT * FROM analysis_recommendations
WHERE analysis_id = '{analysis_id}';
```

### Option B: Test d'un Job Spécifique

```bash
curl -X POST http://localhost:3000/api/worker/process-jobs \
  -H "Content-Type: application/json" \
  -d '{"jobId": "{job_id}"}'
```

---

## 🌐 Étape 4: Test de l'Extension Chrome

### Installation

1. Ouvrir Chrome: `chrome://extensions/`
2. Activer "Mode développeur" (en haut à droite)
3. Cliquer "Charger l'extension non empaquetée"
4. Sélectionner: `/Users/xunit/Desktop/📁 Projets/sar/extensions/ibv-crawler-v2`

### Test

1. **Aller sur Inverite:** https://app.inverite.com
2. **Se connecter** avec vos identifiants
3. **Compléter une vérification** client
4. **Ouvrir la console Chrome** (F12 → Console)
5. **Chercher les logs:**
   ```
   [IBV-Crawler-V2] [INIT] Content script chargé
   [IBV-Crawler-V2] [DETECT] GUID détecté: xxx
   [IBV-Crawler-V2] [FETCH] Récupération des données
   [IBV-Crawler-V2] [UPLOAD] Upload vers SAR
   [IBV-Crawler-V2] [SUCCESS] Extraction et upload complétés
   ```

6. **Vérifier dans la base de données:**
   ```sql
   SELECT id, client_name, inverite_guid, created_at
   FROM client_analyses
   ORDER BY created_at DESC
   LIMIT 1;
   ```

---

## 📊 Étape 5: Test de l'Interface Utilisateur

1. **Trouver une analyse avec scores:**
   ```sql
   SELECT ca.id, ca.client_name,
          CASE WHEN asc.id IS NOT NULL THEN 'Y' ELSE 'N' END as has_scores
   FROM client_analyses ca
   LEFT JOIN analysis_scores asc ON asc.analysis_id = ca.id
   WHERE ca.deleted_at IS NULL
   ORDER BY ca.created_at DESC
   LIMIT 10;
   ```

2. **Ouvrir la page d'analyse:**
   ```
   http://localhost:3000/admin/analyse?id={analysis_id}
   ```

3. **Vérifications visuelles:**
   - ✅ La page charge sans erreur
   - ✅ Le SAR Score s'affiche avec un gauge
   - ✅ La recommandation s'affiche (approve/decline/review)
   - ✅ Les métriques financières sont visibles
   - ✅ Les red flags sont listés

4. **Si le job est en cours:**
   - ✅ Un spinner "Analyse en cours..." s'affiche
   - ✅ La page poll l'API toutes les 3 secondes
   - ✅ Les composants s'affichent automatiquement à la complétion

---

## 🎯 Étape 6: Test du Flow Complet End-to-End

### Scénario Complet

1. **Extension capture les données Inverite** ✅
   - Upload vers `/api/admin/client-analysis`
   - Création de l'entrée dans `client_analyses`
   - Création automatique d'un `analysis_job`

2. **Worker traite le job** ✅
   - Appeler: `http://localhost:3000/api/worker/process-jobs`
   - Calcul des métriques financières
   - Calcul du SAR Score (300-850)
   - Génération de la recommandation
   - Sauvegarde dans `analysis_scores` et `analysis_recommendations`

3. **UI affiche les résultats** ✅
   - Ouvrir: `/admin/analyse?id={analysis_id}`
   - Polling détecte la complétion
   - Composants s'affichent automatiquement

### Temps Attendu

- **Extension → Upload:** < 5 secondes
- **Worker → Calcul:** 2-5 secondes
- **UI → Affichage:** Immédiat après complétion

---

## 🐛 Troubleshooting

### Build échoue
```bash
# Nettoyer et rebuilder
rm -rf .next
npm run build
```

### Extension ne fonctionne pas
```
1. Vérifier que l'extension est chargée dans chrome://extensions/
2. Vérifier les logs dans la console (F12)
3. Recharger l'extension
4. Vérifier que vous êtes sur inverite.com
```

### Worker ne traite pas les jobs
```
1. Vérifier les logs: console.log('[Worker API]...')
2. Vérifier la connexion Supabase dans .env.local
3. Vérifier que le job existe et a status='pending'
4. Tester avec curl pour voir l'erreur exacte
```

### UI ne montre pas les scores
```
1. Vérifier que le job est complété: SELECT * FROM analysis_jobs WHERE analysis_id = 'xxx'
2. Vérifier que les scores existent: SELECT * FROM analysis_scores WHERE analysis_id = 'xxx'
3. Ouvrir la console browser pour voir les erreurs
4. Vérifier la requête GET /api/admin/client-analysis?id=xxx
```

---

## 📈 Métriques de Succès

Pour chaque test, vérifier:

✅ **Extension Chrome:**
- Logs dans la console
- Données uploadées vers l'API
- Analysis créée dans la DB

✅ **Worker:**
- Job traité avec status='completed'
- Scores sauvegardés dans analysis_scores
- Recommandation sauvegardée dans analysis_recommendations

✅ **UI:**
- Page charge sans erreur
- SAR Score affiché correctement
- Recommandation affichée
- Métriques visibles

---

## 🚀 Prochaines Étapes Après Tests

1. **Déployer en production**
   - Build: `npm run build`
   - Deploy sur Vercel
   - Installer l'extension Chrome

2. **Automatiser le worker**
   - Setup cron job pour appeler `/api/worker/process-jobs` toutes les minutes
   - Ou utiliser Vercel Cron Jobs

3. **Monitorer**
   - Vérifier les logs du worker
   - Suivre les métriques de performance
   - Ajuster les seuils si nécessaire

---

## ✅ Checklist Complète

- [ ] Build réussit
- [ ] Serveur dev démarre
- [ ] Extension Chrome installée
- [ ] Extension détecte et upload les données Inverite
- [ ] API route `/api/worker/process-jobs` fonctionne
- [ ] Worker traite un job avec succès
- [ ] Scores sauvegardés dans la DB
- [ ] Recommandation générée
- [ ] UI affiche le SAR Score
- [ ] UI affiche la recommandation
- [ ] UI affiche les métriques
- [ ] Polling fonctionne pour les jobs en cours
- [ ] Flow complet end-to-end testé

---

**Une fois tous les tests passés, le système est prêt pour la production!** 🎉
