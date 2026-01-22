# 📚 API Inverite - Ce qu'on reçoit EXACTEMENT

## 🎯 Réponse à tes questions

**Question 1:** "Et tu reçois un fichier JSON de l'API Inverite?"
**Réponse:** **OUI** - L'extension Chrome appelle l'API Inverite directement

**Question 2:** "Jaimerai que tu me dise ce que tu vois sur les fichier json"
**Réponse:** Voici EXACTEMENT ce que contient le JSON d'Inverite ⬇️

---

## 🔌 L'Endpoint Utilisé

**URL:** `https://www.inverite.com/api/v2/fetch/{guid}`

**Méthode:** GET

**Headers:**
```
Auth: 09a4b8554857d353fd007d29feca423f446
Content-Type: application/json
```

**Description (doc officielle):**
> "After a request is completed, you will use the Fetch API to return the full dataset."

---

## 📊 Structure du JSON Retourné (Exemple Réel)

### Vue d'ensemble
```json
{
  "name": "John Doe",
  "complete_datetime": "2021-02-09 14:26:55",
  "referenceid": null,
  "request": "06C04AF4-BC85-4BE8-9CFA-E31CF03C3F60",
  "status": "Verified",
  "type": "bankverify",
  "address": "1234 Main Street, Vancouver, V7L1G9",
  "contacts": [...],
  "accounts": [...],
  "all_bank_pdf_statements": [...]
}
```

---

## 🏦 Section: Comptes Bancaires (`accounts`)

**Ce que tu vois:**
```json
"accounts": [
  {
    "type": "chequing",
    "membership_number": "1231231",
    "account_description": "Everyday cheq",
    "institution": "010",
    "account": "1234567",
    "routing_code": "",
    "transit": "12345",
    "bank": "Test Bank",

    "statistics": {
      "key1": "string1",
      "key2": {
        "key3": "string2"
      }
    },

    "bank_pdf_statements": [
      {
        "name": "pdf1",
        "link": "https://www.inverite.com"
      }
    ],

    "transactions": [...],
    "payschedules": [...]
  }
]
```

**Champs importants:**
- `type` → Type de compte (chequing, savings, credit)
- `institution` → Code institution (010 = TD, 002 = BMO, etc.)
- `account` → Numéro de compte
- `transit` → Numéro de transit (succursale)
- `bank` → Nom de la banque (ex: "TD Canada Trust")

---

## 💳 Section: Transactions (`transactions`)

**Ce que tu vois:**
```json
"transactions": [
  {
    "date": "2021-02-09",
    "details": "Branch Transaction EFT DEBIT REVERSAL A. FARBER PARTNERS LTD",
    "category": "fees_and_charges/bankruptcy",
    "credit": "125.00",
    "debit": "",
    "balance": "92.53",
    "flags": [
      "is_bankruptcy_trustee",
      "is_return"
    ]
  },
  {
    "date": "2021-02-08",
    "details": "Payroll ACME JOB CO",
    "category": "monthly_income/paycheck",
    "credit": "863.92",
    "debit": "",
    "balance": "865.82",
    "flags": [
      "is_payroll"
    ]
  }
]
```

**Champs importants:**
- `date` → Date de la transaction (YYYY-MM-DD)
- `details` → Description de la transaction
- `category` → Catégorie automatique (income, fees, bankruptcy, etc.)
- `credit` → Montant entrant (string avec 2 décimales)
- `debit` → Montant sortant (string avec 2 décimales)
- `balance` → Solde après transaction
- `flags` → Indicateurs spéciaux (is_payroll, is_return, is_nsf, etc.)

**⚠️ Note importante:** Les montants sont des **strings** pas des nombres!

---

## 💰 Section: Paie et Revenus (`payschedules`)

**Ce que tu vois:**
```json
"payschedules": [
  {
    "score": 1,
    "account": "010-12345-1234567",
    "details": "Payroll ACME JOB CO",
    "income_type": "monthly_income/paycheck",
    "monthly_income": "1899.72",
    "frequency": "bi_weekly:parity_0:tuesday",

    "payments": [
      {
        "date": "2021-02-09",
        "details": "Payroll ACME JOB CO",
        "credit": "863.92",
        "debit": "",
        "balance": "865.82",
        "flags": ["is_payroll"]
      }
    ],

    "future_payments": [
      "2021-02-23",
      "2021-03-09"
    ],

    "missed_payments": []
  }
]
```

**Champs importants:**
- `score` → Confiance de la détection (0-1, où 1 = très confiant)
- `income_type` → Type de revenu (paycheck, government_benefit, etc.)
- `monthly_income` → Revenu mensuel calculé (string)
- `frequency` → Fréquence de paie (bi_weekly, weekly, monthly)
- `future_payments` → Prochaines paies prévues
- `missed_payments` → Paies manquées

**🎯 C'est puissant:** Inverite détecte automatiquement les paies récurrentes!

---

## 📧 Section: Contacts (`contacts`)

**Ce que tu vois:**
```json
"contacts": [
  {
    "type": "email",
    "contact": "johndoe@gmail.com"
  },
  {
    "type": "phone",
    "contact": "(604) 555-1234"
  }
]
```

**Champs:**
- `type` → Type de contact (email, phone)
- `contact` → Valeur du contact

---

## 📄 Section: Relevés PDF (`bank_pdf_statements`)

**Ce que tu vois:**
```json
"all_bank_pdf_statements": [
  {
    "name": "pdf1",
    "link": "https://www.inverite.com/path/to/statement.pdf"
  },
  {
    "name": "pdf2",
    "link": "https://www.inverite.com/path/to/statement2.pdf"
  }
]
```

**Utilisation:** Liens pour télécharger les relevés bancaires originaux en PDF

---

## ✅ Section: Validations (`account_validations`)

**Ce que tu vois:**
```json
"account_validations": [
  {
    "type": "name_match",
    "result": "PASS",
    "confidence": 1.0,
    "details": "Exact match for John Doe."
  }
]
```

**Types de validation:**
- `name_match` → Nom correspond aux documents bancaires
- `address_match` → Adresse correspond
- Etc.

**Résultats possibles:**
- `PASS` → Validation réussie
- `FAIL` → Validation échouée
- `WARN` → Avertissement

---

## 📊 Exemple Complet Annoté

```json
{
  // ===== INFORMATIONS CLIENT =====
  "name": "John Doe",                          // ← Nom complet du client
  "address": "1234 Main Street, Vancouver",    // ← Adresse
  "complete_datetime": "2021-02-09 14:26:55",  // ← Date de complétion
  "status": "Verified",                        // ← Statut (Verified, Pending, Failed)
  "type": "bankverify",                        // ← Type de vérification
  "request": "06C04AF4-BC85-...",              // ← GUID unique

  // ===== CONTACTS =====
  "contacts": [
    { "type": "email", "contact": "john@example.com" },
    { "type": "phone", "contact": "+15145551234" }
  ],

  // ===== COMPTES BANCAIRES =====
  "accounts": [
    {
      // Informations du compte
      "type": "chequing",                      // ← Type de compte
      "bank": "TD Canada Trust",               // ← Nom de la banque
      "institution": "010",                    // ← Code institution
      "transit": "12345",                      // ← Numéro de transit
      "account": "1234567",                    // ← Numéro de compte
      "account_description": "Everyday cheq",  // ← Description

      // Transactions (ARRAY)
      "transactions": [
        {
          "date": "2021-02-09",                           // ← Date
          "details": "Payroll ACME JOB CO",               // ← Description
          "category": "monthly_income/paycheck",          // ← Catégorie auto
          "credit": "2500.00",                            // ← Crédit (STRING!)
          "debit": "",                                    // ← Débit (STRING!)
          "balance": "5420.50",                           // ← Solde après
          "flags": ["is_payroll"]                         // ← Flags spéciaux
        },
        {
          "date": "2021-02-08",
          "details": "LOYER JANVIER",
          "category": "housing/rent",
          "credit": "",
          "debit": "1200.00",                             // ← Débit (sortie)
          "balance": "2920.50",
          "flags": []
        }
        // ... plus de transactions (jusqu'à 90 jours)
      ],

      // Paies détectées automatiquement
      "payschedules": [
        {
          "score": 1,                                     // ← Confiance (0-1)
          "details": "Payroll ACME JOB CO",               // ← Employeur
          "income_type": "monthly_income/paycheck",       // ← Type
          "monthly_income": "5000.00",                    // ← Revenu mensuel calculé
          "frequency": "bi_weekly:parity_0:tuesday",      // ← Fréquence
          "future_payments": ["2021-02-23", "2021-03-09"] // ← Prochaines paies
        }
      ],

      // Relevés PDF
      "bank_pdf_statements": [
        {
          "name": "statement_jan_2021",
          "link": "https://inverite.com/pdf/xxx.pdf"
        }
      ]
    }
    // ... autres comptes (savings, credit, etc.)
  ],

  // ===== VALIDATIONS =====
  "account_validations": [
    {
      "type": "name_match",
      "result": "PASS",
      "confidence": 1.0,
      "details": "Exact match for John Doe."
    }
  ]
}
```

---

## 🎯 Ce que l'Extension Chrome Fait

### Étape 1: Appel API
```javascript
// content-script.js:164-173
var apiUrl = 'https://www.inverite.com/api/v2/fetch/' + guid;

var response = await fetch(apiUrl, {
  method: 'GET',
  headers: {
    'Auth': '09a4b8554857d353fd007d29feca423f446',
    'Content-Type': 'application/json'
  }
});

var inveriteData = await response.json();  // ← LE JSON CI-DESSUS
```

### Étape 2: Téléchargement
```javascript
// content-script.js:226-243
var fileName = 'Fred-Rosa-2025-12-22.json';  // ← Nom généré

var jsonString = JSON.stringify(inveriteData, null, 2);
var blob = new Blob([jsonString], { type: 'application/json' });

// Télécharger dans ~/Downloads/
var a = document.createElement('a');
a.href = URL.createObjectURL(blob);
a.download = fileName;
a.click();
```

---

## 📁 Fichier JSON Téléchargé

**Nom:** `Fred-Rosa-2025-12-22.json`

**Localisation:** `~/Downloads/Fred-Rosa-2025-12-22.json`

**Contenu:** Exactement le JSON retourné par l'API Inverite

**Taille:** Variable (typiquement 50-500 KB selon nombre de transactions)

---

## 🔄 Ce qui Manque Actuellement

**L'extension actuelle:**
1. ✅ Appelle l'API Inverite
2. ✅ Télécharge le JSON en local
3. ❌ **NE POST PAS** vers SAR automatiquement

**Il faut soit:**
- **Option A:** Extension v2 qui POST automatiquement vers SAR
- **Option B:** Script qui surveille ~/Downloads/ et upload
- **Option C:** Bouton "Upload vers SAR" dans l'extension

---

## 🎯 Données Clés pour Analyse de Crédit

**Ce que SAR peut analyser:**

### 1. Revenus
- `payschedules.monthly_income` → Revenu mensuel
- `payschedules.frequency` → Stabilité de l'emploi
- `payschedules.missed_payments` → Paies manquées (RED FLAG!)

### 2. Dépenses
- Transactions avec `debit` → Loyer, factures, etc.
- `category: "housing/rent"` → Loyer mensuel
- `category: "fees_and_charges"` → Frais bancaires

### 3. Red Flags
- `flags: ["is_bankruptcy_trustee"]` → 🚨 FAILLITE
- `flags: ["is_nsf"]` → 🚨 Fonds insuffisants
- `flags: ["is_return"]` → 🚨 Retour de paiement
- `missed_payments.length > 0` → 🚨 Paies manquées

### 4. Ratio d'endettement
- Revenus vs Dépenses récurrentes
- Soldes négatifs fréquents
- Frais NSF réguliers

---

## ✅ Résumé

| Question | Réponse |
|----------|---------|
| **D'où vient le JSON?** | API Inverite `/api/v2/fetch/{guid}` |
| **Qui l'appelle?** | Extension Chrome dans le navigateur |
| **Que contient-il?** | Comptes, transactions, revenus, contacts |
| **Format des montants?** | Strings (ex: "1200.00") pas numbers! |
| **Période couverte?** | Typiquement 90 jours de transactions |
| **Où est téléchargé?** | ~/Downloads/Fred-Rosa-YYYY-MM-DD.json |
| **Est-ce envoyé à SAR?** | ❌ Pas automatiquement (manque étape) |

---

**Veux-tu que je te montre un exemple de fichier JSON réel téléchargé?** 🎯
