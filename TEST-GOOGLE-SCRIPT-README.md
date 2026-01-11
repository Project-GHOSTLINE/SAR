# 🧪 Script de Test Google Apps Script - Analyse Client

Ce script permet de tester l'envoi de données d'analyse client vers votre API SAR depuis Google Apps Script.

## 📋 Installation

### Option 1: Script standalone
1. Ouvrir https://script.google.com/
2. Cliquer sur **"Nouveau projet"**
3. Copier le contenu de `test-google-script.js`
4. Coller dans l'éditeur
5. Renommer le projet: **"Test Analyse Client SAR"**
6. Sauvegarder (Ctrl+S ou Cmd+S)

### Option 2: Script dans Google Sheets
1. Ouvrir n'importe quelle Google Sheet
2. Aller dans **Extensions > Apps Script**
3. Copier le contenu de `test-google-script.js`
4. Coller dans l'éditeur
5. Sauvegarder
6. Rafraîchir la Sheet → Un menu **"🧪 Tests Analyse Client"** apparaîtra

## 🚀 Utilisation

### Lancer tous les tests
```javascript
// Dans l'éditeur Apps Script, sélectionner la fonction et cliquer sur "Exécuter"
testSendAnalysis()
```

Cette fonction va:
1. ✅ Envoyer une analyse **Flinks** (Solution Argent Rapide)
2. ✅ Envoyer une analyse **Inverite** (Crédit Secours)
3. ✅ Afficher les résultats dans les logs

### Tests individuels

#### Test Flinks uniquement
```javascript
testFlinksOnly()
```

#### Test Inverite uniquement
```javascript
testInveriteOnly()
```

#### Test de mise à jour (même GUID)
```javascript
testUpdateAnalysis()
```
Envoie 2 fois la même analyse avec le même `inverite_guid` pour tester la mise à jour.

#### Voir les données générées
```javascript
showSampleData()
```
Affiche les données JSON sans les envoyer à l'API.

## 📊 Données générées automatiquement

### Pour chaque test, le script génère:

#### 👤 Client
- Nom complet
- Email
- Téléphone
- Adresse complète

#### 🏦 Comptes bancaires (1-2 comptes)
- Nom de la banque (Nationale, Desjardins, RBC, TD, etc.)
- Numéro de compte
- Numéro d'institution
- Numéro de transit
- Type de compte
- Solde actuel

#### 💰 Transactions (50-90 transactions sur 3 mois)
- Date
- Description réaliste (IGA, Metro, Hydro-Québec, Netflix, etc.)
- Montant crédit/débit
- Solde
- Catégorie (groceries, transport, bills, etc.)
- Flags (duplicate, suspicious, recurring, etc.)

#### 💼 Paychecks (4 dernières paies)
- Date de paie
- Montant net
- Employeur
- Fréquence: bi-hebdomadaire

## 🔧 Configuration

### Modifier l'URL de l'API

Par défaut, le script envoie à:
```javascript
const API_URL = 'https://admin.solutionargentrapide.ca/api/admin/client-analysis';
```

Pour tester en local:
```javascript
const API_URL = 'http://localhost:3000/api/admin/client-analysis';
```

### Modifier l'origine (CORS)

Le script utilise une origine de confiance pour bypass l'auth:
```javascript
'headers': {
  'Origin': 'https://dashboard.flinks.com'
}
```

Origines acceptées (voir route.ts):
- `https://inverite.com`
- `https://app.inverite.com`
- `https://dashboard.flinks.com`
- `https://flinks.com`
- `https://fin.ag`

## 📝 Voir les logs

### Dans l'éditeur Apps Script:
1. Exécuter une fonction
2. Cliquer sur **"Exécution"** en bas
3. Ou: **Vue > Journaux** (Ctrl+Enter ou Cmd+Enter)

### Exemples de logs:
```
🚀 Début du test d'envoi d'analyse client...

📊 Test 1: Envoi analyse Flinks...
📤 Envoi à: https://admin.solutionargentrapide.ca/api/admin/client-analysis
📦 Données: Melissa Emmanuelle Brillant - flinks
📥 Code de réponse: 200
✅ Résultat Flinks:
{
  "success": true,
  "message": "Analyse créée avec succès",
  "isUpdate": false,
  "data": {
    "id": "abc123...",
    "client_name": "Melissa Emmanuelle Brillant",
    ...
  }
}

---

📊 Test 2: Envoi analyse Inverite...
📤 Envoi à: https://admin.solutionargentrapide.ca/api/admin/client-analysis
📦 Données: Jean-François Tremblay - inverite
📥 Code de réponse: 200
✅ Résultat Inverite:
{
  "success": true,
  "message": "Analyse créée avec succès",
  ...
}

✨ Tests terminés avec succès!
```

## ⚠️ Autorisations requises

La première fois que vous exécutez le script, Google demandera des autorisations:
1. ✅ **Accès à des services externes** → Pour envoyer les requêtes HTTP à votre API
2. Cliquer sur **"Paramètres avancés"**
3. Cliquer sur **"Accéder à [Nom du projet] (non sécurisé)"**
4. Cliquer sur **"Autoriser"**

C'est normal - le script n'est pas vérifié par Google car c'est votre propre script.

## 🐛 Dépannage

### Erreur: "Exception: Request failed for https://..."
- ✅ Vérifier que l'URL de l'API est correcte
- ✅ Vérifier que le serveur est démarré (si test local)
- ✅ Vérifier les logs du serveur

### Erreur 401: Non autorisé
- ✅ Vérifier que l'origine est dans la liste des origines de confiance
- ✅ Vérifier le code dans `/api/admin/client-analysis/route.ts`

### Erreur 400: Données manquantes
- ✅ Vérifier la structure des données dans `generateFlinksTestData()` ou `generateInveriteTestData()`
- ✅ Comparer avec les logs pour voir quelles données sont rejetées

### Pas de réponse / Timeout
- ✅ Le serveur met peut-être du temps à répondre
- ✅ Augmenter le timeout si nécessaire

## 📦 Données de test typiques

### Banques testées:
- 🟢 Desjardins
- 🔴 Banque Nationale
- 🔵 RBC (Royal Bank)
- 🟢 TD Bank
- 🔴 Scotiabank
- 🔵 BMO
- 🔴 CIBC
- 🟠 Tangerine

### Transactions types:
**Crédits:**
- Paie employeur
- Virement Interac
- Remboursements
- Crédits gouvernement

**Débits:**
- Épiceries (Metro, IGA, Super C)
- Restaurants (Tim Hortons, etc.)
- Essence (Shell, Petro-Canada)
- Factures (Hydro-Québec, Videotron)
- Shopping (Walmart, Dollarama, Amazon)
- Abonnements (Netflix, Spotify)

## 🎯 Cas d'usage

### 1. Test de développement local
```javascript
// Modifier l'URL
const API_URL = 'http://localhost:3000/api/admin/client-analysis';

// Exécuter
testSendAnalysis();
```

### 2. Test de production
```javascript
// Garder l'URL par défaut
testSendAnalysis();
```

### 3. Test de mise à jour (éviter les doublons)
```javascript
// Tester que le même GUID met à jour au lieu de créer
testUpdateAnalysis();
```

### 4. Vérifier la structure des données
```javascript
// Voir les données sans envoyer
showSampleData();
```

## ✅ Checklist après les tests

Après avoir exécuté les tests avec succès:

1. ✅ Vérifier dans le dashboard admin que les analyses apparaissent
2. ✅ Ouvrir une analyse et vérifier:
   - Les comptes bancaires avec logos et couleurs
   - Les transactions par mois
   - Les 4 dernières paies
   - L'institution financière
   - Les badges (Flinks/Inverite, Solution Argent Rapide/Crédit Secours)
3. ✅ Vérifier la recherche et les filtres
4. ✅ Vérifier la pagination
5. ✅ Tester l'export

## 📚 Ressources

- [Documentation Google Apps Script](https://developers.google.com/apps-script)
- [UrlFetchApp Documentation](https://developers.google.com/apps-script/reference/url-fetch/url-fetch-app)
- [Logger Documentation](https://developers.google.com/apps-script/reference/base/logger)

## 🤝 Support

Si vous rencontrez des problèmes:
1. Vérifier les logs Apps Script
2. Vérifier les logs du serveur Next.js
3. Vérifier la base de données Supabase
4. Vérifier le code de l'API dans `/api/admin/client-analysis/route.ts`
