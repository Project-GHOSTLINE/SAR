# 🚀 Semrush - Guide de Démarrage Rapide

## ⚡ Démarrage en 5 minutes

### 1️⃣ Vérifier la Configuration

L'API key Semrush est déjà configurée dans `.env.local`:
```bash
SEMRUSH_API_KEY=0c83e99dd9e328d1c53035bd66c59e54
```

### 2️⃣ Démarrer le Serveur

```bash
cd /Users/xunit/Desktop/📁\ Projets/sar
npm run dev
```

### 3️⃣ Accéder à la Page SEO

Ouvrez votre navigateur:
```
http://localhost:3000/admin/seo
```

Connectez-vous avec:
- **Password**: `FredRosa%1978`

### 4️⃣ Collecter les Premières Données

Ouvrez un nouveau terminal et exécutez:

```bash
curl -X POST http://localhost:3000/api/seo/collect/semrush \
  -H "x-api-key: FredRosa%1978"
```

Vous devriez voir:
```json
{
  "success": true,
  "message": "Métriques Semrush collectées avec succès depuis l'API",
  "date": "2026-01-22",
  "data": { ... },
  "mock": false
}
```

### 5️⃣ Actualiser la Page SEO

Retournez sur `http://localhost:3000/admin/seo` et cliquez sur le bouton "Actualiser" pour voir les données Semrush s'afficher.

---

## 🎯 Exemples d'Utilisation

### Recherche de Mots-clés

Trouvez de nouveaux mots-clés liés à "prêt rapide":

```bash
curl "http://localhost:3000/api/seo/semrush/keyword-research?keyword=pr%C3%AAt%20rapide&limit=10"
```

### Analyse des Backlinks

Obtenez une vue d'ensemble de vos backlinks:

```bash
curl "http://localhost:3000/api/seo/semrush/backlinks?type=overview"
```

### Analyse des Concurrents

Identifiez vos principaux concurrents SEO:

```bash
curl "http://localhost:3000/api/seo/semrush/competitors?type=organic&limit=5"
```

### Keyword Gap Analysis

Trouvez les mots-clés que vos concurrents ont et pas vous:

```bash
curl "http://localhost:3000/api/seo/semrush/competitors?type=keyword_gap&limit=20"
```

---

## 📊 Comprendre les Scores

### Opportunity Score (0-100)
Calcule l'attractivité d'un mot-clé basé sur:
- **40%** Volume de recherche (plus = mieux)
- **30%** Compétition (moins = mieux)
- **30%** Difficulté SEO (moins = mieux)

**Interprétation**:
- 80-100: Excellente opportunité (priorité haute)
- 60-79: Bonne opportunité (priorité moyenne)
- 40-59: Opportunité modérée (à considérer)
- 0-39: Opportunité faible (basse priorité)

### Threat Score (0-100)
Mesure le niveau de menace d'un concurrent basé sur:
- **40%** Niveau de compétition
- **30%** Mots-clés communs
- **30%** Trafic organique

**Interprétation**:
- 80-100: Concurrent majeur (surveillance active)
- 60-79: Concurrent sérieux (à surveiller)
- 40-59: Concurrent modéré (veille passive)
- 0-39: Concurrent mineur (faible impact)

---

## 🔄 Collecte Automatique

Les données Semrush sont collectées automatiquement tous les jours à:
- **6h UTC** (2h EST)

Pour voir les prochaines collectes programmées:
```bash
curl http://localhost:3000/api/seo/jobs
```

---

## 🛠️ Troubleshooting

### Problème: "SEMRUSH_API_KEY non configurée"

**Solution**: Vérifiez que `.env.local` contient bien:
```bash
SEMRUSH_API_KEY=0c83e99dd9e328d1c53035bd66c59e54
```

Redémarrez le serveur après modification.

### Problème: Données MOCK au lieu de vraies données

**Cause**: L'API Semrush n'a pas pu être contactée.

**Solution**:
1. Vérifiez votre connexion internet
2. Vérifiez que l'API key est valide
3. Consultez les logs dans la console

### Problème: "Non autorisé" (401)

**Solution**: Ajoutez le header d'authentification:
```bash
-H "x-api-key: FredRosa%1978"
```

---

## 📚 Documentation Complète

Pour plus de détails, consultez:
- **[SEMRUSH-ENRICHISSEMENT.md](./SEMRUSH-ENRICHISSEMENT.md)** - Documentation complète

---

## ✅ Prochaines Étapes

1. ✅ Collecter les premières données
2. ⏳ Explorer les différentes routes API
3. ⏳ Créer des composants UI pour visualiser les données
4. ⏳ Configurer des alertes automatiques
5. ⏳ Générer des rapports hebdomadaires

---

**Bon SEO !** 🚀
