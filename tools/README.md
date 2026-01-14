# 🛠️ SAR Performance Tools

Ce dossier contient les outils de diagnostic et les rapports de performance pour le projet SAR.

## 📊 Rapports de Performance

Les rapports JSON générés par l'outil de diagnostic sont automatiquement sauvegardés ici.

### Format du fichier

```
sar-performance-report-YYYY-MM-DD-timestamp.json
```

### Contenu du rapport

Chaque rapport JSON contient:

1. **Metadata**: Informations sur l'environnement de test
   - Date et heure du test
   - Navigateur et plateforme
   - Résolution d'écran
   - Type de test (Complet, Rapide, Stress)

2. **Summary**: Résumé des performances
   - Nombre total de tests
   - Tests réussis vs échoués
   - Temps de réponse moyen
   - API la plus rapide
   - API la plus lente

3. **Results**: Résultats détaillés pour chaque endpoint
   - Nom de l'API
   - URL complète
   - Temps de réponse (ms)
   - Status HTTP
   - Taille des données
   - Classification de performance

4. **Performance Breakdown**: Répartition des performances
   - Excellent (< 100ms pour critiques, < 200ms pour autres)
   - Bon (< 300ms pour critiques, < 500ms pour autres)
   - Lent (< 500ms pour critiques, < 1000ms pour autres)
   - Critique (> 500ms pour critiques, > 1000ms pour autres)

5. **Recommendations**: Recommandations d'optimisation
   - API critiques trop lentes
   - API avec données volumineuses
   - API en échec

6. **Raw Data**: Données brutes complètes

## 🔧 Utilisation

### Lancer un diagnostic

1. Ouvrez: `http://localhost:3000/performance-diagnostic.html`
2. Cliquez sur un bouton de test:
   - **Diagnostic Complet**: Teste tous les endpoints
   - **Test Rapide**: Teste uniquement les endpoints critiques
   - **Stress Test**: Teste chaque endpoint critique 5 fois
3. Une fois terminé, cliquez sur **"💾 Télécharger Rapport JSON"**
4. Le fichier sera téléchargé dans vos Téléchargements
5. Déplacez-le dans ce dossier `tools/` pour archivage

### Analyser un rapport

```bash
# Afficher le résumé
cat sar-performance-report-*.json | jq '.summary'

# Voir les API les plus lentes
cat sar-performance-report-*.json | jq '.results | sort_by(.responseTime) | reverse | .[0:5]'

# Voir les recommandations
cat sar-performance-report-*.json | jq '.recommendations'
```

## 📈 Benchmark et Targets

### Endpoints Critiques

Ces API doivent être ultra-rapides car elles affectent l'expérience utilisateur directe:

- **Messages API**: Target < 150ms
- **VoPay Transactions**: Target < 200ms
- **VoPay Dashboard**: Target < 150ms

### Endpoints Non-Critiques

Ces API sont importantes mais moins sensibles:

- **Webhook Stats**: Target < 300ms
- **Download Stats**: Target < 200ms
- **Analytics**: Target < 250ms
- **Support Tickets**: Target < 200ms

## 🎯 Objectifs de Performance

- **Moyenne globale**: < 200ms
- **API critiques**: < 150ms
- **P95**: < 300ms
- **Taux de succès**: > 99%

## 🚨 Alertes

Si un rapport montre:
- API critique > 300ms → **URGENT - Investigation immédiate**
- API critique > 500ms → **CRITIQUE - Optimisation prioritaire**
- Taux d'échec > 1% → **Problème de stabilité**
- Données > 100KB → **Envisager pagination**

## 📝 Notes

- Les rapports sont versionnés par date et timestamp
- Garder au moins 1 rapport par semaine pour tracking
- Comparer les rapports pour identifier les régressions
- Archiver les anciens rapports après 3 mois

---

**Dernière mise à jour**: 2026-01-14
