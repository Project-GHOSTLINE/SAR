# 🔄 QuickBooks - Connexion Continue Automatique

**Guide Complet** pour maintenir une connexion permanente avec QuickBooks

---

## 🎯 Ce Qui a Été Créé

### 1. **Connection Manager** (Lib)
`src/lib/quickbooks/connection-manager.ts`

**Fonctionnalités**:
- ✅ Rafraîchissement automatique des tokens
- ✅ Monitoring continu de la connexion (toutes les 5 min)
- ✅ Rafraîchit 1h avant expiration
- ✅ Test de connexion en temps réel
- ✅ Récupération d'infos compagnie
- ✅ Déconnexion propre

### 2. **API Routes** (5 endpoints)

| Endpoint | Méthode | Description |
|----------|---------|-------------|
| `/api/quickbooks/connection/status` | GET | Statut détaillé de la connexion |
| `/api/quickbooks/connection/refresh` | POST | Force le rafraîchissement des tokens |
| `/api/quickbooks/connection/auto-refresh` | POST | Start/Stop auto-refresh |
| `/api/quickbooks/connection/test` | GET | Teste la connexion avec un appel API réel |
| `/api/quickbooks/connection/disconnect` | POST | Déconnecte QuickBooks |

### 3. **Page Admin UI**
`/admin/quickbooks`

**Interface complète** avec:
- 📊 Statut de connexion en temps réel
- 🏢 Informations de la compagnie
- ⏱️ Temps d'expiration des tokens
- 🔄 Contrôles auto-refresh
- 🧪 Test de connexion
- 🔌 Boutons d'action

---

## 🚀 Comment l'Utiliser

### Étape 1: Connecter QuickBooks

#### Option A: Via l'Interface Admin

1. **Aller sur la page**:
   ```
   https://admin.solutionargentrapide.ca/admin/quickbooks
   ```

2. **Cliquer** sur "🔗 Connect to QuickBooks"

3. **S'authentifier** avec QuickBooks (OAuth)

4. **Retour** → Connection établie ✅

#### Option B: Via API

```bash
# 1. Obtenir l'URL OAuth
curl http://localhost:4000/api/quickbooks/auth/connect

# 2. Ouvrir l'URL dans le navigateur et s'authentifier

# 3. Callback automatique sauvegarde les tokens
```

---

### Étape 2: Activer l'Auto-Refresh

#### Via l'Interface

1. Sur `/admin/quickbooks`
2. Cliquer "▶️ Start Auto-Refresh"
3. ✅ Auto-refresh activé!

#### Via API

```bash
curl -X POST http://localhost:4000/api/quickbooks/connection/auto-refresh \
  -H "Content-Type: application/json" \
  -d '{"action": "start"}'
```

**Résultat**:
```json
{
  "success": true,
  "message": "Auto-refresh started",
  "autoRefreshEnabled": true
}
```

---

### Étape 3: Vérifier le Statut

#### Via l'Interface

La page se rafraîchit automatiquement toutes les 30 secondes.

#### Via API

```bash
curl http://localhost:4000/api/quickbooks/connection/status
```

**Réponse**:
```json
{
  "success": true,
  "connection": {
    "connected": true,
    "realmId": "4620816365155594289",
    "companyName": "SAR Inc.",
    "expiresAt": "2026-01-22T12:00:00.000Z",
    "needsRefresh": false,
    "autoRefreshEnabled": true,
    "lastRefresh": "2026-01-21T11:00:00.000Z",
    "error": null
  },
  "company": {
    "name": "SAR Inc.",
    "legalName": "Solution Argent Rapide Inc.",
    "email": "contact@sar.com",
    "phone": "514-123-4567",
    "address": {...}
  }
}
```

---

## 🔄 Comment Fonctionne l'Auto-Refresh

### Cycle de Rafraîchissement

```
1. Check toutes les 5 minutes
   ↓
2. Vérifie si expiration dans < 1h
   ↓
3. Si OUI → Rafraîchit automatiquement
   ↓
4. Sauvegarde les nouveaux tokens
   ↓
5. Log le succès
   ↓
6. Retourne au cycle
```

### Timeline Exemple

```
10h00: Token expire à 11h30
       → needsRefresh = false (encore 1.5h)

10h30: Token expire dans 1h
       → needsRefresh = true
       → Auto-refresh déclenché
       → Nouveaux tokens obtenus
       → Expiration: 12h30

10h35: Token expire à 12h30
       → needsRefresh = false (encore 2h)
```

---

## 📊 Toutes les API Routes

### 1. GET /api/quickbooks/connection/status

**Retourne le statut complet de la connexion**

```bash
curl http://localhost:4000/api/quickbooks/connection/status
```

**Réponse**:
```json
{
  "success": true,
  "connection": {
    "connected": true,
    "realmId": "123456789",
    "expiresAt": "2026-01-22T12:00:00.000Z",
    "needsRefresh": false,
    "autoRefreshEnabled": true,
    "lastRefresh": "2026-01-21T11:00:00.000Z"
  },
  "company": {
    "name": "Company Name",
    "legalName": "Legal Name",
    "email": "email@example.com"
  }
}
```

---

### 2. POST /api/quickbooks/connection/refresh

**Force le rafraîchissement immédiat des tokens**

```bash
curl -X POST http://localhost:4000/api/quickbooks/connection/refresh
```

**Réponse**:
```json
{
  "success": true,
  "message": "Tokens refreshed successfully",
  "connection": {
    "connected": true,
    "expiresAt": "2026-01-22T14:00:00.000Z",
    "lastRefresh": "2026-01-21T13:00:00.000Z"
  }
}
```

**Quand l'utiliser**:
- Pour tester le mécanisme de refresh
- Si les tokens vont expirer bientôt
- Après avoir résolu un problème de connexion

---

### 3. POST /api/quickbooks/connection/auto-refresh

**Démarre ou arrête l'auto-refresh**

```bash
# Démarrer
curl -X POST http://localhost:4000/api/quickbooks/connection/auto-refresh \
  -H "Content-Type: application/json" \
  -d '{"action": "start"}'

# Arrêter
curl -X POST http://localhost:4000/api/quickbooks/connection/auto-refresh \
  -H "Content-Type: application/json" \
  -d '{"action": "stop"}'
```

**Réponse**:
```json
{
  "success": true,
  "message": "Auto-refresh started",
  "autoRefreshEnabled": true
}
```

---

### 4. GET /api/quickbooks/connection/test

**Teste la connexion avec un appel API réel à QuickBooks**

```bash
curl http://localhost:4000/api/quickbooks/connection/test
```

**Réponse (succès)**:
```json
{
  "success": true,
  "message": "Connection is active",
  "company": {
    "companyName": "SAR Inc.",
    "legalName": "Solution Argent Rapide Inc.",
    "country": "CA"
  }
}
```

**Réponse (échec)**:
```json
{
  "success": false,
  "error": "API call failed: 401",
  "details": {...}
}
```

---

### 5. POST /api/quickbooks/connection/disconnect

**Déconnecte QuickBooks et supprime les tokens**

```bash
curl -X POST http://localhost:4000/api/quickbooks/connection/disconnect
```

**Réponse**:
```json
{
  "success": true,
  "message": "QuickBooks disconnected successfully"
}
```

**Actions effectuées**:
1. ✅ Arrête l'auto-refresh
2. ✅ Supprime les tokens de la DB
3. ✅ Nettoie la session

---

## 🛠️ Configuration

### Variables d'Environnement Requises

```bash
# .env.local
INTUIT_CLIENT_ID=votre_client_id
INTUIT_CLIENT_SECRET=votre_client_secret
INTUIT_ENVIRONMENT=sandbox  # ou 'production'
INTUIT_REDIRECT_URI=http://localhost:4000/api/quickbooks/auth/callback

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=votre_service_role_key
```

### Table Supabase

```sql
-- Table: quickbooks_tokens
CREATE TABLE quickbooks_tokens (
  id SERIAL PRIMARY KEY,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  realm_id TEXT NOT NULL,
  company_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour performance
CREATE INDEX idx_realm_id ON quickbooks_tokens(realm_id);
CREATE INDEX idx_expires_at ON quickbooks_tokens(expires_at);
```

---

## 📱 Interface Admin

### Page: `/admin/quickbooks`

**Sections**:

1. **Connection Status Card**
   - Statut connecté/non connecté
   - Informations de la compagnie
   - Détails de connexion (Realm ID, expiration)
   - État de l'auto-refresh

2. **Boutons d'Action**
   - 🔄 Refresh Tokens - Force le rafraîchissement
   - 🧪 Test Connection - Teste avec API QuickBooks
   - ▶️/⏸️ Auto-Refresh - Start/Stop
   - 🔌 Disconnect - Déconnecte QuickBooks

3. **Features Info**
   - Description des fonctionnalités
   - Avantages de l'auto-refresh

**Screenshot** (conceptuel):
```
┌─────────────────────────────────────────┐
│ 🟢 Connected                           │
│ ┌───────────────────────────────────┐  │
│ │ Company: SAR Inc.                  │  │
│ │ Realm ID: 123456789                │  │
│ │ Expires: 2026-01-22 12:00          │  │
│ │ Auto-Refresh: ✓ Enabled            │  │
│ └───────────────────────────────────┘  │
│                                         │
│ [🔄 Refresh] [🧪 Test] [⏸️ Stop] [🔌] │
└─────────────────────────────────────────┘
```

---

## 🔐 Sécurité

### Bonnes Pratiques Implémentées

1. **Tokens Sécurisés**
   - ✅ Stockés dans Supabase (pas en local storage)
   - ✅ Service Role Key pour accès backend uniquement
   - ✅ Pas exposés au client

2. **Refresh Automatique**
   - ✅ Empêche l'expiration des tokens
   - ✅ Pas de déconnexion intempestive
   - ✅ Connexion continue garantie

3. **Monitoring**
   - ✅ Check toutes les 5 minutes
   - ✅ Logs de toutes les opérations
   - ✅ Erreurs catchées et loggées

---

## 📊 Monitoring & Logs

### Logs à Surveiller

**Console Server** (backend):
```
🔄 Starting QuickBooks auto-refresh...
✅ QuickBooks auto-refresh started
✅ Token is still valid, no refresh needed
🔄 Token needs refresh, refreshing...
✅ Tokens refreshed successfully
   New expiry: 2026-01-22 12:00:00
```

**En cas d'erreur**:
```
❌ Token refresh failed: Token expired
❌ Error checking connection: Network error
```

---

## 🧪 Tests

### Tester le Système

#### 1. Test Initial de Connexion

```bash
# 1. Connecter QuickBooks
curl http://localhost:4000/api/quickbooks/auth/connect
# → Ouvrir authUrl dans le navigateur

# 2. Vérifier le statut
curl http://localhost:4000/api/quickbooks/connection/status
# → Devrait montrer connected: true
```

#### 2. Test Auto-Refresh

```bash
# 1. Démarrer auto-refresh
curl -X POST http://localhost:4000/api/quickbooks/connection/auto-refresh \
  -H "Content-Type: application/json" \
  -d '{"action": "start"}'

# 2. Attendre 5 minutes et vérifier les logs
# → Devrait montrer "Token is still valid" ou "Token refreshed"

# 3. Arrêter
curl -X POST http://localhost:4000/api/quickbooks/connection/auto-refresh \
  -H "Content-Type: application/json" \
  -d '{"action": "stop"}'
```

#### 3. Test de Rafraîchissement Manuel

```bash
# Force refresh
curl -X POST http://localhost:4000/api/quickbooks/connection/refresh

# Vérifier nouveaux tokens
curl http://localhost:4000/api/quickbooks/connection/status
# → lastRefresh devrait être mis à jour
```

#### 4. Test de Connexion Réelle

```bash
curl http://localhost:4000/api/quickbooks/connection/test
# → Devrait retourner les infos de la compagnie
```

---

## 🚨 Troubleshooting

### Problème: Auto-Refresh ne fonctionne pas

**Symptômes**: Tokens expirent malgré auto-refresh activé

**Solutions**:
1. Vérifier que auto-refresh est démarré:
   ```bash
   curl http://localhost:4000/api/quickbooks/connection/status
   # → autoRefreshEnabled devrait être true
   ```

2. Vérifier les logs backend pour les erreurs

3. Redémarrer auto-refresh:
   ```bash
   # Stop
   curl -X POST http://localhost:4000/api/quickbooks/connection/auto-refresh \
     -d '{"action": "stop"}'

   # Start
   curl -X POST http://localhost:4000/api/quickbooks/connection/auto-refresh \
     -d '{"action": "start"}'
   ```

### Problème: Tokens expirent avant rafraîchissement

**Cause**: Buffer time trop court (< 1h)

**Solution**: Modifier dans `connection-manager.ts`:
```typescript
private readonly REFRESH_BUFFER_HOURS = 2; // Au lieu de 1
```

### Problème: Erreur 401 après refresh

**Cause**: Refresh token invalide ou expiré

**Solution**:
1. Déconnecter:
   ```bash
   curl -X POST http://localhost:4000/api/quickbooks/connection/disconnect
   ```

2. Reconnecter via OAuth

---

## 🎯 Workflow Complet

### Connexion Initiale

```
1. Admin va sur /admin/quickbooks
   ↓
2. Clic "Connect to QuickBooks"
   ↓
3. Redirection vers Intuit OAuth
   ↓
4. Authentification QuickBooks
   ↓
5. Callback → Tokens sauvegardés
   ↓
6. Redirection vers /admin/quickbooks
   ↓
7. Statut: 🟢 Connected
```

### Utilisation Continue

```
1. Auto-refresh activé
   ↓
2. Monitoring toutes les 5 min
   ↓
3. Check: Expiration < 1h ?
   ↓
4. Si OUI → Rafraîchit automatiquement
   ↓
5. Connexion maintenue ∞
```

---

## 📚 Fichiers Créés

```
src/
├── lib/
│   └── quickbooks/
│       └── connection-manager.ts       ✅ Logique principale
│
├── app/
│   ├── api/
│   │   └── quickbooks/
│   │       └── connection/
│   │           ├── status/route.ts     ✅ GET statut
│   │           ├── refresh/route.ts    ✅ POST refresh
│   │           ├── auto-refresh/route.ts ✅ POST start/stop
│   │           ├── test/route.ts       ✅ GET test
│   │           └── disconnect/route.ts ✅ POST disconnect
│   │
│   └── admin/
│       └── quickbooks/
│           └── page.tsx                ✅ Interface UI

QUICKBOOKS-CONNECTION-GUIDE.md          ✅ Ce guide
```

---

## ✅ Checklist de Déploiement

### Avant de Déployer

- [ ] Variables d'environnement configurées
- [ ] Table `quickbooks_tokens` créée dans Supabase
- [ ] Client ID/Secret QuickBooks configurés
- [ ] Redirect URI ajouté dans Intuit Dashboard
- [ ] Tests locaux passés

### Après Déploiement

- [ ] Connecter QuickBooks via UI
- [ ] Activer auto-refresh
- [ ] Vérifier logs pendant 1h
- [ ] Tester rafraîchissement manuel
- [ ] Tester test de connexion

---

## 🎉 Résumé

**Tu as maintenant**:
- ✅ Connexion continue automatique avec QuickBooks
- ✅ Rafraîchissement automatique des tokens
- ✅ Interface admin complète
- ✅ 5 API endpoints pour tout gérer
- ✅ Monitoring en temps réel
- ✅ Tests et déconnexion

**Plus jamais de déconnexion QuickBooks!** 🚀

---

**Créé**: 2026-01-21
**Version**: 1.0.0
**Auteur**: SAR Team
