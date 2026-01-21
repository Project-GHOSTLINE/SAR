# 🔄 Guide de Reconnexion QuickBooks

**Date**: 2026-01-21
**Status**: QuickBooks DÉCONNECTÉ - Prêt pour reconnexion

---

## ✅ CE QUI A ÉTÉ FAIT

### 1. Correction des OAuth Scopes
Les nouveaux scopes ont été déployés en production:
```
com.intuit.quickbooks.accounting
openid
profile
email
```

### 2. Déconnexion Automatique
QuickBooks a été déconnecté automatiquement pour forcer une nouvelle autorisation avec les nouveaux scopes.

### 3. API Balance Sheet Créée
Endpoint créé pour récupérer les soldes bancaires:
```
GET /api/quickbooks/reports/balance-sheet-detailed
```

Cet endpoint retournera:
- **1015 Compte VOPAY** avec son solde
- **1010 Compte Épargne** avec son solde
- **1000 Compte RBC** avec son solde
- Tous les autres comptes du bilan

### 4. Auto-Refresh Activé
Le système de rafraîchissement automatique des tokens est maintenant activé.

---

## 🎯 ÉTAPES DE RECONNEXION

### Étape 1: Ouvrir la Page QuickBooks
```bash
# URL à ouvrir dans ton navigateur:
https://admin.solutionargentrapide.ca/admin/quickbooks
```

### Étape 2: Se Connecter
- Entre le mot de passe: `FredRosa%1978`
- Clique "Se connecter"

### Étape 3: Connecter QuickBooks
- Tu verras un bouton **"Connect to QuickBooks"**
- Clique dessus
- Tu seras redirigé vers la page d'autorisation Intuit

### Étape 4: Autoriser avec les NOUVEAUX Scopes
Sur la page Intuit, tu verras maintenant ces permissions:
- ✅ QuickBooks Accounting (comme avant)
- ✅ **OpenID** (NOUVEAU - pour identifier l'utilisateur)
- ✅ **Profile** (NOUVEAU - pour le nom de l'utilisateur)
- ✅ **Email** (NOUVEAU - pour l'email de l'utilisateur)

**IMPORTANT**: Clique "Authorize" pour accepter toutes ces permissions.

### Étape 5: Redirection Automatique
Après autorisation:
- Tu seras automatiquement redirigé vers `/admin/quickbooks`
- La page affichera "Connected to [Nom de ta compagnie]"
- Le statut montrera: Auto-Refresh ✅ Enabled

---

## 🧪 VÉRIFICATION

### Test 1: Vérifier la Connexion
Une fois reconnecté, ouvre un terminal et exécute:

```bash
curl "https://admin.solutionargentrapide.ca/api/quickbooks/connection/test" | jq '.'
```

**Résultat attendu**:
```json
{
  "success": true,
  "company": {
    "companyName": "...",
    "legalName": "..."
  }
}
```

### Test 2: Récupérer les Soldes Bancaires
```bash
curl "https://admin.solutionargentrapide.ca/api/quickbooks/reports/balance-sheet-detailed" | jq '.bankAccounts'
```

**Résultat attendu**:
```json
[
  {
    "accountNumber": "1015",
    "name": "1015 Compte VOPAY",
    "balance": 0.00,
    "formattedBalance": "0,00 $"
  },
  {
    "accountNumber": "1010",
    "name": "1010 Compte Épargne",
    "balance": 299.09,
    "formattedBalance": "299,09 $"
  },
  {
    "accountNumber": "1000",
    "name": "1000 Compte RBC",
    "balance": 7132.49,
    "formattedBalance": "7 132,49 $"
  }
]
```

### Test 3: Synchroniser les Comptes
Pour mettre à jour tous les comptes dans la base de données:
```bash
curl -X POST "https://admin.solutionargentrapide.ca/api/quickbooks/sync/accounts" | jq '.'
```

**Résultat attendu**:
```json
{
  "success": true,
  "count": 50,
  "message": "Synced 50 accounts successfully"
}
```

### Test 4: Interroger les Comptes Bancaires Locaux
```bash
curl "https://admin.solutionargentrapide.ca/api/quickbooks/accounts?type=Bank" | jq '.accounts[] | {name, accountNumber, currentBalance}'
```

---

## 🔧 TESTS PLAYWRIGHT DISPONIBLES

### Test 1: Vérification Complète avec Login
```bash
cd "/Users/xunit/Desktop/📁 Projets/sar/e2e"
npx playwright test qb-real-test --no-deps
```

Ce test va:
- Se connecter avec le mot de passe
- Aller sur la page QuickBooks
- Tester la connexion
- Rafraîchir les tokens
- Prendre des screenshots

### Test 2: Sync Automatique des Comptes
```bash
npx playwright test qb-auto-fix-and-sync --grep="@qb-verify-sync" --no-deps
```

Ce test va:
- Vérifier le statut de connexion
- Tester la connexion
- Synchroniser tous les comptes
- Afficher les comptes bancaires

---

## 📊 ENDPOINTS DISPONIBLES

### Connexion
- `GET /api/quickbooks/connection/status` - Statut de la connexion
- `GET /api/quickbooks/connection/test` - Tester la connexion
- `POST /api/quickbooks/connection/refresh` - Rafraîchir les tokens
- `POST /api/quickbooks/connection/disconnect` - Déconnecter

### Auto-Refresh
- `POST /api/quickbooks/connection/auto-refresh` - Start/Stop/Status
  ```json
  {"action": "start"}   // Démarrer
  {"action": "stop"}    // Arrêter
  {"action": "status"}  // Vérifier
  ```

### Synchronisation
- `POST /api/quickbooks/sync/accounts` - Sync tous les comptes
- `POST /api/quickbooks/sync/all` - Sync tout (comptes, clients, factures, etc.)

### Rapports QuickBooks
- `GET /api/quickbooks/reports/balance-sheet` - Bilan standard
- `GET /api/quickbooks/reports/balance-sheet-detailed` - Bilan détaillé avec soldes
- `GET /api/quickbooks/reports/profit-loss` - État des résultats
- `GET /api/quickbooks/reports/cash-flow` - Flux de trésorerie

### Interrogation Locale
- `GET /api/quickbooks/accounts` - Tous les comptes
- `GET /api/quickbooks/accounts?type=Bank` - Seulement comptes bancaires
- `GET /api/quickbooks/accounts?active=false` - Inclure comptes inactifs

---

## 🔐 SÉCURITÉ DES TOKENS

### Refresh Token Rotation
Le système gère automatiquement la rotation des refresh tokens:
- Intuit retourne un NOUVEAU refresh token à chaque rafraîchissement
- Le système sauvegarde atomiquement le nouveau token
- L'ancien token est automatiquement invalidé
- Voir: `/src/lib/quickbooks/connection-manager.ts` ligne 206

### Auto-Refresh
- Vérifie les tokens toutes les 5 minutes
- Rafraîchit automatiquement 1 heure avant expiration
- Met à jour la base de données avec le nouveau refresh token
- Logs toutes les opérations pour debugging

---

## ❓ TROUBLESHOOTING

### Problème: "Error 3100" après reconnexion
**Cause**: Tu as peut-être utilisé un vieux lien OAuth ou la connexion n'a pas été complètement effacée.

**Solution**:
```bash
# Forcer la déconnexion
curl -X POST "https://admin.solutionargentrapide.ca/api/quickbooks/connection/disconnect"

# Vérifier que c'est déconnecté
curl "https://admin.solutionargentrapide.ca/api/quickbooks/connection/status" | jq '.connection.connected'
# Doit retourner: false

# Reconnecter via l'interface web
```

### Problème: Balance Sheet retourne 404
**Cause**: Le endpoint est peut-être en cours de déploiement sur Vercel.

**Solution**:
```bash
# Attendre 2-3 minutes pour le déploiement
# Ou forcer un redéploiement:
cd "/Users/xunit/Desktop/📁 Projets/sar"
git commit --allow-empty -m "chore: Trigger Vercel redeploy"
git push origin main
```

### Problème: "Token expired"
**Cause**: Normal après déconnexion, ou token expiré.

**Solution**:
```bash
# Si connecté, rafraîchir:
curl -X POST "https://admin.solutionargentrapide.ca/api/quickbooks/connection/refresh"

# Si pas connecté, reconnecter via l'interface web
```

---

## ✅ CHECKLIST DE RECONNEXION

- [ ] Ouvrir https://admin.solutionargentrapide.ca/admin/quickbooks
- [ ] Se connecter avec `FredRosa%1978`
- [ ] Cliquer "Connect to QuickBooks"
- [ ] Autoriser sur Intuit (avec les 4 scopes)
- [ ] Vérifier la redirection réussie
- [ ] Tester la connexion (Test 1)
- [ ] Récupérer les soldes bancaires (Test 2)
- [ ] Synchroniser les comptes (Test 3)
- [ ] Vérifier les comptes locaux (Test 4)

---

## 🎉 RÉSULTAT ATTENDU

Après la reconnexion, tu auras:

1. ✅ Connexion QuickBooks stable avec nouveaux scopes
2. ✅ Auto-refresh automatique des tokens
3. ✅ Accès aux soldes bancaires en temps réel
4. ✅ Synchronisation automatique des comptes
5. ✅ Interface admin affichant toutes les métriques

Les 3 comptes bancaires seront accessibles:
- **1015 Compte VOPAY**: Solde actuel
- **1010 Compte Épargne**: Solde actuel
- **1000 Compte RBC**: Solde actuel

---

**Créé**: 2026-01-21
**Status**: PRÊT POUR RECONNEXION
**Action Requise**: Suis les étapes ci-dessus pour reconnecter QuickBooks
