# Fix QuickBooks Error 3100 - ApplicationAuthorizationFailed

## Problème identifié
Erreur 3100 lors des appels à l'API QuickBooks: "ApplicationAuthorizationFailed"

## Cause
Les scopes OAuth 2.0 incomplets. QuickBooks nécessite plusieurs scopes pour l'autorisation complète.

## Solution appliquée

### 1. Scopes corrigés dans le code
✅ Modifié `/src/app/api/quickbooks/auth/connect/route.ts`

**AVANT:**
```typescript
scope: 'com.intuit.quickbooks.accounting'
```

**APRÈS:**
```typescript
scope: 'com.intuit.quickbooks.accounting openid profile email'
```

### 2. Configuration requise dans Intuit Developer Dashboard

⚠️ **IMPORTANT:** Vous DEVEZ vérifier que votre app Intuit est configurée avec les bons scopes.

#### Étapes:

1. **Aller dans Intuit Developer Dashboard:**
   https://developer.intuit.com/app/developer/dashboard

2. **Sélectionner votre app** (celle avec Client ID: ABHy8sBTOup0uRmPIIjnFTYHOA6XAoKbSn5hNn7aldAzISLC1u)

3. **Vérifier "Keys & OAuth" → "Scopes":**

   Assurez-vous que ces scopes sont **activés**:
   - ✅ Accounting (com.intuit.quickbooks.accounting)
   - ✅ OpenID
   - ✅ Profile
   - ✅ Email

4. **Si les scopes ne sont pas activés:**
   - Cliquez sur "Add/Edit Scopes"
   - Cochez "Accounting"
   - Cochez "OpenID", "Profile", "Email"
   - Sauvegardez

### 3. Reconnexion requise

Après avoir corrigé les scopes:

1. **Déconnectez QuickBooks** (si déjà connecté):
   - Allez dans Supabase Dashboard
   - Table `quickbooks_tokens`
   - Supprimez toutes les lignes

   OU via curl:
   ```bash
   curl -X DELETE "https://dllyzfuqjzuhvshrlmuq.supabase.co/rest/v1/quickbooks_tokens?realm_id=eq.9341454351188646" \
     -H "apikey: YOUR_SUPABASE_SERVICE_ROLE_KEY" \
     -H "Authorization: Bearer YOUR_SUPABASE_SERVICE_ROLE_KEY"
   ```

2. **Reconnectez-vous à QuickBooks:**
   - Allez sur https://admin.solutionargentrapide.ca/admin/quickbooks
   - Cliquez "Connecter QuickBooks"
   - Autorisez TOUTES les permissions demandées

### 4. Vérification

Une fois reconnecté, testez:

```bash
# Test API Customers
curl "https://admin.solutionargentrapide.ca/api/quickbooks/sync/customers" \
  -X POST \
  -H "Cookie: admin-session=YOUR_SESSION"

# Test API Rapports
curl "https://admin.solutionargentrapide.ca/api/quickbooks/reports/profit-loss"
```

Si ça fonctionne, vous verrez des données JSON au lieu de l'erreur 3100.

## Références
- [QuickBooks Scopes Documentation](https://developer.intuit.com/app/developer/qbo/docs/learn/scopes)
- [OAuth 2.0 Setup](https://developer.intuit.com/app/developer/qbpayments/docs/develop/authentication-and-authorization/oauth-2.0)
- [Error 3100 Troubleshooting](https://help.developer.intuit.com/s/article/Access-Token-does-not-have-sufficient-scope)
