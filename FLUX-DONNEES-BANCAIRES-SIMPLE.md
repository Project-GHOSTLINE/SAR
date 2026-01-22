# 🔍 D'où viennent les données bancaires? (SIMPLE)

## 📍 Tu es ici: `/admin/analyse?id=xxx`

Tu vois les données bancaires d'un client. Voici **EXACTEMENT** d'où elles viennent:

---

## 🎬 ÉTAPE 1: La page fait un fetch

**Fichier:** `src/app/admin/analyse/page.tsx:163`

```typescript
// LIGNE 163 - C'EST ICI QUE ÇA COMMENCE
const res = await fetch(`/api/admin/client-analysis?id=${analysisId}`, {
  credentials: 'include'
})

// LIGNE 168-172 - Récupération des données
const data = await res.json()
const analysisData = data.data

// LIGNE 172 - EXTRACTION DES COMPTES BANCAIRES
const accountsData = analysisData.raw_data?.accounts || []
setAccounts(accountsData)
//          ^^^^^^^^^^^^^^
//          LES DONNÉES BANCAIRES SONT LÀ!
```

---

## 🎬 ÉTAPE 2: L'API lit Supabase

**Fichier:** `src/app/api/admin/client-analysis/route.ts:308`

```typescript
// LIGNE 308 - Requête à Supabase
const { data: singleData, error: singleError } = await supabase
  .from('client_analyses')  // ← TABLE SUPABASE
  .select('*')
  .eq('id', id)
  .is('deleted_at', null)
  .single()

// LIGNE 323 - Retour des données
return NextResponse.json({
  success: true,
  data: singleData  // ← Contient raw_data avec TOUT
})
```

---

## 🎬 ÉTAPE 3: Supabase - Table `client_analyses`

**Base de données:** Supabase

**Table:** `client_analyses`

**Colonnes importantes:**
```
id               → UUID unique
client_name      → "Jean Tremblay"
client_email     → "jean@example.com"
raw_data         → { accounts: [...], transactions: [...] }  ← ICI!
                    ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
                    TOUTES LES DONNÉES BANCAIRES SONT ICI
source           → "inverite" ou "flinks"
total_accounts   → 3
total_balance    → 12500.50
created_at       → 2026-01-20T15:30:00
```

**Le champ `raw_data` contient:**
```json
{
  "contacts": [
    { "type": "email", "contact": "jean@example.com" },
    { "type": "phone", "contact": "+15145551234" }
  ],
  "address": "123 Rue Example, Montréal, QC",
  "accounts": [
    {
      "account_id": "acc_123",
      "account_type": "chequing",
      "institution": "Desjardins",
      "current_balance": 5420.50,
      "transactions": [
        {
          "date": "2026-01-15",
          "description": "SALAIRE - EMPLOI ABC",
          "amount": 2500.00,
          "type": "credit"
        },
        {
          "date": "2026-01-10",
          "description": "LOYER JANVIER",
          "amount": -1200.00,
          "type": "debit"
        }
      ]
    }
  ]
}
```

---

## 🎬 ÉTAPE 4: Comment les données arrivent dans Supabase?

**Méthode:** Extension Chrome

**Fichier API:** `src/app/api/admin/client-analysis/route.ts:49` (POST)

```typescript
// LIGNE 49 - POST reçoit les données
export async function POST(request: NextRequest) {
  // Extension Chrome envoie:
  const body = await request.json()
  /*
  {
    client_name: "Jean Tremblay",
    raw_data: {
      accounts: [...],  ← DONNÉES BANCAIRES
      transactions: [...]
    },
    source: "inverite",
    inverite_guid: "xxx-xxx-xxx"
  }
  */

  // LIGNE 210 - INSERT dans Supabase
  await supabase
    .from('client_analyses')
    .insert([{
      client_name: body.client_name,
      raw_data: body.raw_data,  // ← DONNÉES STOCKÉES ICI
      source: body.source,
      total_accounts: totalAccounts,
      total_balance: totalBalance
    }])
}
```

---

## 🔄 FLUX COMPLET VISUEL

```
┌─────────────────────────────────────────────────────────────┐
│  1. CLIENT remplit demande sur INVERITE ou FLINKS          │
│     • Connecte son compte bancaire                          │
│     • Inverite/Flinks récupère les transactions             │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  2. EXTENSION CHROME (sur navigateur admin)                 │
│     • Détecte qu'on est sur Inverite/Flinks                 │
│     • Capture les données affichées                         │
│     • Structure au format JSON                              │
└─────────────────────────────────────────────────────────────┘
                           ↓
                    POST REQUEST
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  3. API: /api/admin/client-analysis (POST)                  │
│     📁 route.ts:49                                          │
│     • Reçoit les données JSON                               │
│     • Valide l'authentification                             │
│     • Calcule les totaux                                    │
└─────────────────────────────────────────────────────────────┘
                           ↓
                     INSERT INTO
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  4. SUPABASE - Table: client_analyses                       │
│     • id: uuid                                              │
│     • client_name: "Jean Tremblay"                          │
│     • raw_data: { accounts: [...] } ← DONNÉES ICI           │
│     • source: "inverite"                                    │
│     • created_at: 2026-01-20                                │
└─────────────────────────────────────────────────────────────┘
                           ↓
                      (temps passe)
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  5. ADMIN ouvre: /admin/analyse?id=xxx                      │
│     📁 page.tsx:163                                         │
│     • Fait GET /api/admin/client-analysis?id=xxx            │
└─────────────────────────────────────────────────────────────┘
                           ↓
                    GET REQUEST
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  6. API: /api/admin/client-analysis (GET)                   │
│     📁 route.ts:308                                         │
│     • SELECT * FROM client_analyses WHERE id=xxx            │
│     • Retourne les données                                  │
└─────────────────────────────────────────────────────────────┘
                           ↓
                      RESPONSE
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  7. PAGE affiche les données                                │
│     📁 page.tsx:172                                         │
│     • Extrait: analysisData.raw_data.accounts               │
│     • Affiche: Comptes, Transactions, Soldes               │
│     • L'admin peut voir TOUT                                │
└─────────────────────────────────────────────────────────────┘
```

---

## ✅ RÉPONSE COURTE

**Question:** D'où viennent les données bancaires?

**Réponse:**

1. **Extension Chrome** capture depuis Inverite/Flinks
2. **POST** `/api/admin/client-analysis` → sauvegarde dans Supabase
3. **GET** `/api/admin/client-analysis?id=xxx` → lit depuis Supabase
4. **Page affiche** `raw_data.accounts[]` avec toutes les transactions

---

## 🔍 Pour vérifier dans Supabase

Ouvre Supabase SQL Editor et exécute:

```sql
-- Voir toutes les analyses
SELECT
  id,
  client_name,
  source,
  total_accounts,
  total_balance,
  created_at
FROM client_analyses
WHERE deleted_at IS NULL
ORDER BY created_at DESC
LIMIT 10;

-- Voir les données d'une analyse spécifique
SELECT
  id,
  client_name,
  raw_data
FROM client_analyses
WHERE id = 'ton-id-ici';

-- Voir combien de comptes bancaires
SELECT
  client_name,
  jsonb_array_length(raw_data->'accounts') as nb_comptes
FROM client_analyses
WHERE deleted_at IS NULL;
```

---

## 📍 Résumé des Fichiers

| Fichier | Ligne | Rôle |
|---------|-------|------|
| `src/app/admin/analyse/page.tsx` | 163 | **AFFICHE** les données (GET) |
| `src/app/api/admin/client-analysis/route.ts` | 49 | **REÇOIT** les données (POST) |
| `src/app/api/admin/client-analysis/route.ts` | 308 | **LIT** les données (GET) |
| **Supabase** | `client_analyses.raw_data` | **STOCKE** tout |

---

**C'est clair maintenant?** 🎯
