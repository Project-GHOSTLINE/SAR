# 🚀 CONNECTE QUICKBOOKS - GUIDE RAPIDE

## Statut actuel
❌ QuickBooks n'est PAS connecté (aucun token)

## ÉTAPE 1: Configure les scopes dans Intuit Developer Dashboard (2 min)

**IMPORTANT:** Cette étape est OBLIGATOIRE sinon tu vas avoir Error 3100.

1. Va sur: https://developer.intuit.com/app/developer/dashboard

2. Clique sur ton app (Client ID: ABHy8sBTOup0uRmPIIjnFTYHOA6XAoKbSn5hNn7aldAzISLC1u)

3. Va dans l'onglet **"Keys & OAuth"**

4. Descends à la section **"Scopes"**

5. Assure-toi que ces scopes sont **COCHÉS**:
   - ✅ **Accounting** (com.intuit.quickbooks.accounting)
   - ✅ **OpenID**
   - ✅ **Profile**
   - ✅ **Email**

6. Si ce n'est pas le cas:
   - Clique sur "Edit" ou "Add Scopes"
   - Coche les 4 scopes ci-dessus
   - Clique "Save"

## ÉTAPE 2: Connecte QuickBooks (1 min)

1. Va sur: https://admin.solutionargentrapide.ca/admin/quickbooks

2. Clique sur le bouton **"Connecter QuickBooks"**

3. Tu vas être redirigé vers Intuit

4. **Choisis ta sandbox company** dans la liste

5. Clique **"Connect"** ou **"Authorize"**

6. Tu vas être redirigé vers `/admin/quickbooks?success=connected`

7. Tu devrais voir: "QuickBooks connecté avec succès!"

## ÉTAPE 3: Vérifie que ça marche (30 secondes)

Exécute ce script dans le terminal:

```bash
cd /Users/xunit/Desktop/📁\ Projets/sar
export $(cat .env.local | grep -v '^#' | xargs)
node check-qb-status.mjs
```

Tu devrais voir:
```
✅ Token found in database
✅ Token is VALID
✅ API ACCESS WORKING!
QuickBooks integration is fully operational.
```

## ÉTAPE 4: Test les endpoints (1 min)

Dans la console du navigateur sur https://admin.solutionargentrapide.ca/admin/quickbooks:

```javascript
// Test 1: Status
fetch('/api/quickbooks/status').then(r => r.json()).then(console.log)

// Test 2: Sync customers
fetch('/api/quickbooks/sync/customers', { method: 'POST' }).then(r => r.json()).then(console.log)

// Test 3: Profit & Loss report
fetch('/api/quickbooks/reports/profit-loss').then(r => r.json()).then(console.log)
```

Si tu vois des données JSON (pas d'erreurs 401 ou 403), **C'EST BON!** ✅

## TROUBLESHOOTING

### Si tu vois Error 3100 (ApplicationAuthorizationFailed)
→ Les scopes ne sont PAS configurés dans Intuit Dashboard
→ Retourne à l'ÉTAPE 1 et vérifie que les 4 scopes sont cochés

### Si tu vois 401 Unauthorized
→ QuickBooks n'est pas connecté
→ Retourne à l'ÉTAPE 2 et reconnecte

### Si tu vois "Invalid state" ou "State mismatch"
→ Le cookie OAuth a expiré
→ Recharge la page et recommence l'ÉTAPE 2

### Si tu vois "redirect_uri invalid"
→ L'app Intuit n'a pas la bonne redirect URI
→ Va dans Intuit Dashboard → Keys & OAuth → Redirect URIs
→ Ajoute: https://admin.solutionargentrapide.ca/api/quickbooks/auth/callback

## RÉSULTAT ATTENDU

Une fois tout configuré:
- ✅ Status API: 200
- ✅ Sync endpoints: 200 (retournent des données)
- ✅ Report endpoints: 200 (retournent des rapports)
- ✅ Aucune erreur 401, 403, ou 3100

**Total: 5 minutes max pour tout configurer**
