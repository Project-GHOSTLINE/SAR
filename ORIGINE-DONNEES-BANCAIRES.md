# 📊 Origine des Données Bancaires - Section Analyse Admin

**Date:** 2026-01-22
**Projet:** Solution Argent Rapide (SAR)
**Section:** `admin.solutionargentrapide.ca/admin/analyse`

---

## 🎯 Résumé Rapide

Les données bancaires affichées dans la section **Analyse** proviennent de:

1. **Extension Chrome** qui capture les données depuis Inverite ou Flinks
2. Envoyées via **API POST** à `/api/admin/client-analysis`
3. Stockées dans **Supabase** table `client_analyses`
4. Affichées dans **admin/analyse** avec tous les détails bancaires

---

## 🔄 Flux de Données Complet

```
┌─────────────────────────────────────────────────────────────────┐
│                         FLUX COMPLET                            │
└─────────────────────────────────────────────────────────────────┘

1. CLIENT remplit demande sur Inverite/Flinks
   ↓
2. EXTENSION CHROME capture les données bancaires
   • Comptes bancaires
   • Transactions
   • Soldes
   • Informations client
   ↓
3. EXTENSION envoie via POST /api/admin/client-analysis
   • Authentification: Cookie OU Token OU Origine de confiance
   • Origines autorisées:
     - dashboard.flinks.com
     - app.inverite.com
     - inverite.com
   ↓
4. API SAUVEGARDE dans Supabase
   • Table: client_analyses
   • Champ principal: raw_data (contient TOUT)
   • Calcule automatiquement: total_accounts, total_balance, total_transactions
   ↓
5. ADMIN ouvre /admin/analyse?id=xxx
   • GET /api/admin/client-analysis?id=xxx
   • Récupère depuis Supabase
   • Affiche tous les détails bancaires
```

---

## 📁 Fichiers Clés

### 1. API d'Entrée des Données
**Fichier:** `src/app/api/admin/client-analysis/route.ts`

**Méthodes:**
- **POST**: Reçoit les données depuis l'extension Chrome
- **GET**: Récupère les analyses pour affichage admin
- **PATCH**: Met à jour status/assignation
- **DELETE**: Suppression soft (deleted_at)

**Code POST (simplifié):**
```typescript
export async function POST(request: NextRequest) {
  // 1. Vérification authentification
  // Accepte: Cookie admin OU Token Bearer OU Origine de confiance

  // 2. Récupération des données
  const body = await request.json()
  // body.client_name
  // body.raw_data (TOUTES les données bancaires)
  // body.inverite_guid
  // body.source ('inverite' ou 'flinks')

  // 3. Calcul des totaux
  const accounts = rawData.accounts || []
  const totalAccounts = accounts.length
  const totalBalance = accounts.reduce(...)
  const totalTransactions = accounts.reduce(...)

  // 4. Sauvegarde dans Supabase
  await supabase
    .from('client_analyses')
    .insert([{
      client_name: body.client_name,
      client_email: extractedEmail,
      raw_data: body.raw_data, // ← DONNÉES BANCAIRES ICI
      source: body.source,
      total_accounts: totalAccounts,
      total_balance: totalBalance,
      total_transactions: totalTransactions
    }])
}
```

---

### 2. Page Admin d'Affichage
**Fichier:** `src/app/admin/analyse/page.tsx`

**Récupération des données:**
```typescript
const fetchAnalysis = useCallback(async () => {
  const res = await fetch(
    `/api/admin/client-analysis?id=${analysisId}`,
    { credentials: 'include' }
  )
  const result = await res.json()

  if (result.success) {
    setAnalysis(result.data)
    // result.data.raw_data contient TOUTES les données bancaires
    // result.data.raw_data.accounts[] = liste des comptes
    // result.data.raw_data.accounts[].transactions[] = transactions
  }
}, [analysisId])
```

---

## 🗄️ Structure des Données

### Table Supabase: `client_analyses`

```sql
CREATE TABLE client_analyses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Informations client
  client_name TEXT NOT NULL,
  client_email TEXT,
  client_address TEXT,

  -- Source des données
  source TEXT DEFAULT 'inverite', -- 'inverite' ou 'flinks'
  inverite_guid TEXT UNIQUE,      -- ID unique Inverite

  -- DONNÉES BANCAIRES COMPLÈTES
  raw_data JSONB NOT NULL,        -- ← TOUT EST LÀ!

  -- Totaux calculés (pour filtres rapides)
  total_accounts INTEGER DEFAULT 0,
  total_balance DECIMAL(12,2) DEFAULT 0,
  total_transactions INTEGER DEFAULT 0,

  -- Statut et assignation
  status TEXT DEFAULT 'pending',   -- pending, reviewed, approved, rejected
  assigned_to TEXT,                -- Sandra, Michel, etc.
  assigned_at TIMESTAMPTZ,
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,

  -- Notes admin
  notes TEXT,

  -- Dates
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ            -- Soft delete
);
```

---

## 📦 Structure de `raw_data` (JSONB)

Le champ `raw_data` contient TOUTES les données bancaires au format JSON:

### Pour Inverite:
```json
{
  "contacts": [
    { "type": "email", "contact": "client@example.com" },
    { "type": "phone", "contact": "+15145551234" }
  ],
  "address": "123 Rue Example, Montréal, QC",
  "accounts": [
    {
      "account_id": "acc_123",
      "account_type": "chequing",
      "institution": "Desjardins",
      "current_balance": 5420.50,
      "available_balance": 5420.50,
      "currency": "CAD",
      "transactions": [
        {
          "transaction_id": "txn_456",
          "date": "2026-01-15",
          "description": "SALAIRE - EMPLOI ABC",
          "amount": 2500.00,
          "type": "credit",
          "category": "income"
        },
        {
          "transaction_id": "txn_457",
          "date": "2026-01-10",
          "description": "LOYER JANVIER",
          "amount": -1200.00,
          "type": "debit",
          "category": "housing"
        }
        // ... plus de transactions
      ]
    }
    // ... plus de comptes
  ]
}
```

### Pour Flinks:
```json
{
  "clientInfo": {
    "email": "client@example.com",
    "phone": "+15145551234",
    "address": "123 Rue Example"
  },
  "accounts": [
    {
      "id": "flinks_acc_789",
      "type": "Chequing",
      "title": "Compte Chèques",
      "institutionName": "TD",
      "balance": 3250.75,
      "transactions": [
        {
          "id": "flinks_txn_101",
          "date": "2026-01-20",
          "description": "PAIE BI-MENSUELLE",
          "debit": 0,
          "credit": 1850.00
        }
        // ... plus de transactions
      ]
    }
  ]
}
```

---

## 🔐 Sécurité et Authentification

### POST (Réception des données)
L'API accepte **3 types d'authentification**:

1. **Cookie admin-session** (admin connecté)
   ```
   Cookie: admin-session=jwt_token_here
   ```

2. **Token Bearer** (extension avec token)
   ```
   Authorization: Bearer eyJhbGc...
   ```

3. **Origine de confiance** (extensions sur domaines autorisés)
   ```
   Origin: https://app.inverite.com
   Origin: https://dashboard.flinks.com
   ```

### GET (Lecture des données)
- **Liste complète**: Nécessite cookie admin
- **Analyse spécifique**: Public avec `?id=xxx` (pour rapports partagés)

---

## 🛠️ Extension Chrome

L'extension Chrome (non incluse dans ce repo) effectue les actions suivantes:

1. **Détecte** quand l'utilisateur est sur Inverite/Flinks
2. **Capture** les données bancaires affichées à l'écran
3. **Structure** les données au format attendu
4. **Envoie** via POST à `/api/admin/client-analysis`
5. **Affiche** confirmation de succès

**Code d'envoi (exemple):**
```javascript
// Dans l'extension Chrome
const sendToSAR = async (analysisData) => {
  const response = await fetch(
    'https://solutionargentrapide.ca/api/admin/client-analysis',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${extensionToken}`
      },
      body: JSON.stringify({
        client_name: analysisData.clientName,
        raw_data: analysisData,
        source: 'inverite', // ou 'flinks'
        inverite_guid: analysisData.guid
      })
    }
  )

  return response.json()
}
```

---

## 📊 Traitement des Données

Après sauvegarde dans `client_analyses`, une fonction PostgreSQL est appelée:

```sql
-- Fonction: process_analysis(p_analysis_id UUID)
-- Extrait et normalise les données dans tables séparées:

1. client_phones
   - Extrait téléphones depuis raw_data.contacts

2. client_accounts (si nécessaire)
   - Normalise les comptes bancaires

3. client_transactions (si nécessaire)
   - Normalise les transactions
```

**Mais attention:** Même si la fonction échoue, les données sont **toujours disponibles** dans `raw_data`!

---

## 🎨 Affichage dans Admin

### Page Liste: `/admin/analyses`
**Composant:** `AnalysesView`
- Affiche la liste de toutes les analyses
- Filtres: status, assigned_to, source
- Statistiques: pending, reviewed, approved, rejected

### Page Détails: `/admin/analyse?id=xxx`
**Affiche:**
- ✅ Informations client (nom, email, téléphone, adresse)
- ✅ Résumé financier (total comptes, solde global, nb transactions)
- ✅ Liste des comptes bancaires
- ✅ Transactions détaillées par compte
- ✅ Filtres par mois, type (crédit/débit), recherche
- ✅ Export possible (via boutons Download)

---

## 🔍 Vérification des Données

### Dans Supabase SQL Editor:
```sql
-- Voir toutes les analyses
SELECT
  id,
  client_name,
  client_email,
  source,
  total_accounts,
  total_balance,
  total_transactions,
  status,
  assigned_to,
  created_at
FROM client_analyses
WHERE deleted_at IS NULL
ORDER BY created_at DESC;

-- Voir les données brutes d'une analyse
SELECT
  id,
  client_name,
  raw_data
FROM client_analyses
WHERE id = 'uuid-here';

-- Voir les comptes d'un client
SELECT
  raw_data->'accounts'
FROM client_analyses
WHERE id = 'uuid-here';
```

---

## ✅ Résumé Final

| Question | Réponse |
|----------|---------|
| **D'où viennent les données?** | Extension Chrome sur Inverite/Flinks |
| **Comment arrivent-elles?** | POST /api/admin/client-analysis |
| **Où sont stockées?** | Supabase table `client_analyses` |
| **Champ principal?** | `raw_data` (JSONB avec TOUT) |
| **Qui peut envoyer?** | Extension avec token OU origine de confiance |
| **Qui peut voir?** | Admin avec cookie `admin-session` |
| **Format des données?** | JSON avec accounts[] et transactions[] |
| **Sécurité?** | HTTPS + Auth + CORS + Soft delete |

---

## 📞 Questions Fréquentes

**Q: Les données sont-elles cryptées?**
R: Oui, en transit (HTTPS) et au repos (Supabase utilise encryption at rest)

**Q: Peut-on supprimer les données?**
R: Oui, soft delete (deleted_at) via DELETE /api/admin/client-analysis?id=xxx

**Q: Combien de temps sont conservées les données?**
R: Indéfiniment sauf suppression manuelle (pas de TTL automatique)

**Q: Peut-on exporter les données?**
R: Oui, via boutons Download dans `/admin/analyse` (CSV, JSON, PDF)

**Q: Les données sont-elles partagées?**
R: Non, stockées uniquement sur Supabase SAR. Pas de partage externe.

---

**Créé par:** Claude Code
**Documentation:** Complète et à jour
**Dernière vérification:** 2026-01-22
