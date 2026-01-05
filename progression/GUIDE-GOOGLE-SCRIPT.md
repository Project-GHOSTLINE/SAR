# 📊 Guide - Script Google Apps pour tester l'API

## 🎯 Installation (5 minutes)

### 1. Créer un nouveau Google Sheets

1. Va sur https://sheets.google.com
2. Clique sur **"+ Nouveau"** ou **"Blank"**
3. Nomme-le: **"Test API Progression"**

### 2. Ouvrir l'éditeur Apps Script

1. Dans le menu: **Extensions → Apps Script**
2. Supprime le code par défaut
3. Copie-colle **TOUT** le contenu du fichier `google-apps-script-test.js`
4. Clique sur **💾 Enregistrer** (Ctrl+S)
5. Nomme le projet: **"API Progression Test"**

### 3. Autoriser le script

1. Clique sur ▶️ **Exécuter** (n'importe quelle fonction)
2. Clique **"Examiner les autorisations"**
3. Choisis ton compte Google
4. Clique **"Autoriser"**
5. Ferme l'onglet Apps Script
6. Retourne dans Google Sheets

### 4. Rafraîchir pour voir le menu

1. Dans Google Sheets, **rafraîchis la page** (F5 ou Cmd+R)
2. Un nouveau menu **"📊 API Progression"** apparaît en haut!

---

## 🎮 Utilisation

### Menu disponible: **📊 API Progression**

#### 1. 🆕 **Créer un nouveau dossier**
- Simule la création d'un nouveau dossier Margill
- Demande: ID dossier, Nom, Email, Téléphone, Montant
- Envoie à l'API et affiche le résultat
- ✅ Statut: "Demande reçue"

#### 2. 📝 **Mettre à jour le statut**
- Change le statut d'un dossier existant
- Liste des 15 statuts disponibles
- ✅ Exemple: "nouveau_dossier" → "offre_envoyee"

#### 3. 🔗 **Générer Magic Link**
- Crée un lien sécurisé pour un client
- Affiche l'URL complète
- ✅ Valide 48h, 20 utilisations max

#### 4. 🧪 **Test Cycle Complet** (RECOMMANDÉ!)
- Crée un dossier test automatique
- Passe par les 8 étapes de progression
- Génère le magic link
- ✅ Affiche tous les résultats dans la feuille

#### 5. 📊 **Voir Dashboard**
- Affiche l'URL du dashboard
- Mot de passe: `FredRosa%1978`

---

## 🧪 Scénarios de test

### Scénario 1: Cycle complet automatique (LE PLUS SIMPLE!)

1. Dans le menu: **📊 API Progression → 🧪 Test Cycle Complet**
2. Clique **Oui** pour confirmer
3. ⏳ Attend 10 secondes (le script passe par toutes les étapes)
4. ✅ Résultats affichés dans la feuille Google Sheets
5. 🔗 Un magic link est généré automatiquement

**Tu verras dans la feuille:**
```
=== TEST CYCLE COMPLET: TEST-CYCLE-1736108xxx ===
Création              ✅    RECEIVED
1. Demande reçue      ✅    RECEIVED
2. IBV reçu           ✅    IBV_COMPLETED
3. Analyse en cours   ✅    ANALYSIS_IN_PROGRESS
4. Offre envoyée      ✅    OFFER_SENT
5. Offre acceptée     ✅    APPROVED_BY_CLIENT
6. En attente signature ✅  AWAITING_SIGNATURE
7. Contrat signé      ✅    SIGNED
8. Prêt actif         ✅    ACTIVE
Magic Link            ✅    https://progression.solutionargentrapide.ca/suivi?t=...
```

### Scénario 2: Créer un dossier manuel

1. Menu: **📊 API Progression → 🆕 Créer un nouveau dossier**
2. Entre les infos:
   - ID dossier: `TEST-001`
   - Nom: `Jean Test`
   - Email: `jean@test.com`
   - Téléphone: `+15141234567`
   - Montant: `5000.00`
3. ✅ Message de succès avec l'ID: `MARGILL-TEST-001`

### Scénario 3: Mettre à jour un statut

1. Menu: **📊 API Progression → 📝 Mettre à jour le statut**
2. ID dossier: `TEST-001`
3. Nouveau statut: `offre_envoyee`
4. ✅ Statut mis à jour!

### Scénario 4: Générer un magic link

1. Menu: **📊 API Progression → 🔗 Générer Magic Link**
2. ID dossier: `TEST-001`
3. Téléphone: `+15141234567`
4. ✅ URL du magic link affichée

---

## 📊 Vérifier les résultats

### Option 1: Dans Google Sheets
- Tous les résultats sont automatiquement loggés dans la feuille
- Colonnes: Date, Action, Dossier ID, Statut, Détails

### Option 2: Dans le Dashboard
1. Va sur https://progression.solutionargentrapide.ca/debug
2. Mot de passe: `FredRosa%1978`
3. Rafraîchis pour voir les nouveaux dossiers

### Option 3: Tester le magic link
1. Copie l'URL du magic link généré
2. Ouvre-le dans un navigateur
3. ✅ Tu verras la page de progression client

---

## 🎯 Liste complète des statuts disponibles

Pour le menu "Mettre à jour le statut":

```
nouveau_dossier         → Étape 1: Demande reçue
en_attente_ibv         → (interne)
ibv_completee          → Étape 2: IBV reçu
analyse_en_cours       → Étape 3: Analyse du dossier
offre_en_preparation   → (interne)
offre_envoyee          → Étape 4: Offre envoyée
offre_acceptee         → Étape 5: Offre approuvée
contrat_en_preparation → (interne)
contrat_envoye         → (interne)
en_attente_signature   → Étape 6: Signature requise
contrat_signe          → Étape 7: Contrat signé
transfert_de_fonds     → (interne)
pret_actif             → Étape 8: Prêt actif
refuse                 → (masqué)
sans_reponse           → (masqué)
```

---

## 🐛 Résolution de problèmes

### Erreur: "Non autorisé"
➡️ Vérifie que la clé API dans le script est: `FredRosa%1978`

### Le menu n'apparaît pas
➡️ Rafraîchis la page Google Sheets (F5)
➡️ Vérifie que tu as autorisé le script

### Erreur: "Exception: Request failed..."
➡️ Vérifie ta connexion Internet
➡️ L'URL de l'API est correcte dans le script

### Le script ne s'exécute pas
➡️ Dans Apps Script, clique sur ▶️ Exécuter
➡️ Autorise les permissions Google

---

## 🔧 Personnalisation

### Changer la clé API
Ligne 12 du script:
```javascript
const API_KEY = 'FredRosa%1978';
```

### Changer l'URL de l'API
Ligne 11 du script:
```javascript
const API_URL = 'https://progression.solutionargentrapide.ca/api/webhook/margill';
```

---

## 📞 Exemple de résultat

Après avoir exécuté "Test Cycle Complet", ta feuille Google ressemble à ça:

| Date | Action | Dossier ID | Statut | Détails |
|------|--------|------------|--------|---------|
| 2026-01-05 15:30 | Création | TEST-CYCLE-1736108xxx | ✅ Succès | RECEIVED |
| 2026-01-05 15:30 | MAJ STATUT | TEST-CYCLE-1736108xxx | ✅ Succès | IBV_COMPLETED |
| 2026-01-05 15:30 | MAJ STATUT | TEST-CYCLE-1736108xxx | ✅ Succès | OFFER_SENT |
| ... | ... | ... | ... | ... |
| 2026-01-05 15:31 | MAGIC LINK | TEST-CYCLE-1736108xxx | ✅ Succès | https://progression... |

---

## ✅ Checklist de test

- [ ] Installer le script dans Google Sheets
- [ ] Voir le menu "📊 API Progression"
- [ ] Exécuter "Test Cycle Complet"
- [ ] Vérifier les résultats dans la feuille
- [ ] Ouvrir le Dashboard et voir les nouveaux dossiers
- [ ] Copier un magic link et l'ouvrir dans un navigateur
- [ ] Voir la page de progression client

---

**C'est fait! Tu peux maintenant tester l'API directement depuis Google Sheets comme si c'était Margill qui envoie les données!** 🚀
