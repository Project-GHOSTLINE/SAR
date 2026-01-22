# 🎁 Toutes les Données Disponibles à Extraire d'Inverite

## 📊 Ce que tu extrais DÉJÀ

### ✅ Endpoint: `/api/v2/fetch/{guid}`

**Ce que tu obtiens actuellement:**

```json
{
  "name": "Client Name",
  "complete_datetime": "2025-12-22 18:09:15",
  "status": "Verified",
  "request": "GUID",
  "address": "123 Rue Example",
  "contacts": [
    { "type": "email", "contact": "email@example.com" },
    { "type": "phone", "contact": "+15145551234" }
  ],
  "accounts": [
    {
      "type": "chequing",
      "bank": "Desjardins",
      "institution": "815",
      "transit": "10103",
      "account": "1234567",

      "statistics": {
        "mean_closing_balance": "176.94",
        "debits_30_count": "41",
        "credits_30_count": "14",
        "debits_30_total": "7422.00",
        "credits_30_total": "7404.49",
        "returns_30_count": "1",        // ← RED FLAG
        "overdraft_30_count": "0",
        "payday_30_count": "0"
      },

      "transactions": [
        {
          "date": "2025-12-22",
          "details": "Payroll ACME CO",
          "category": "monthly_income/paycheck",
          "credit": "2500.00",
          "debit": "",
          "balance": "5420.50",
          "flags": ["is_payroll"]      // ← Détection auto
        }
      ],

      "payschedules": [
        {
          "monthly_income": "5000.00",  // ← Calculé auto
          "frequency": "bi_weekly",
          "future_payments": ["2025-12-30", "2026-01-13"]
        }
      ]
    }
  ]
}
```

**Données déjà extraites:**
- ✅ Nom, email, téléphone, adresse
- ✅ Comptes bancaires (institution, transit, numéro)
- ✅ Transactions (90 jours max)
- ✅ Statistiques (soldes, débits/crédits totaux, retours)
- ✅ Paies détectées (revenus, fréquence)
- ✅ Flags (NSF, retours, faillite, prêts)

---

## 🎯 Ce que tu PEUX EXTRAIRE EN PLUS

### 1. 📊 **RISK SCORE** (Score de Risque) 🔥

**Endpoint:** `/api/v2/risk` (POST) puis `/api/v2/risk_status/{task_id}` (GET)

**Ce que ça donne:**
```json
{
  "risk_score": 750,              // ← Score 300-850 (comme crédit)
  "risk_level": "low",            // low, medium, high
  "factors": {
    "income_stability": "high",
    "spending_patterns": "good",
    "nsf_history": "none",
    "bankruptcy_indicators": false
  },
  "recommendation": "approve",
  "max_loan_amount": 5000
}
```

**Utilité:**
- 🎯 Score de risque automatique
- 🎯 Recommandation approve/decline
- 🎯 Montant de prêt suggéré
- 🎯 Facteurs de risque détaillés

**Comment l'obtenir:**
```javascript
// 1. Créer une demande de risk score
const riskRequest = await fetch('https://www.inverite.com/api/v2/risk', {
  method: 'POST',
  headers: {
    'Auth': 'API_KEY',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    request: guid  // Le GUID de la vérification bancaire
  })
});

const { task_id } = await riskRequest.json();

// 2. Poller le status (aux 5 secondes)
const riskStatus = await fetch(`https://www.inverite.com/api/v2/risk_status/${task_id}`, {
  headers: { 'Auth': 'API_KEY' }
});

const riskData = await riskStatus.json();
// → Contient le risk_score et les détails
```

**Limitations:**
- ⚠️ 1 seul Risk Score par vérification
- ⚠️ Nécessite assez de données (min 30 jours de transactions)
- ⚠️ Peut coûter extra (vérifier avec Inverite)

---

### 2. 📄 **PDF REPORTS** (Rapports PDF Professionnels)

**Endpoint:** `/api/v2/pdf_report/{guid}?type=income` ou `?type=transaction`

**Ce que ça donne:**
- 📊 **Income Report PDF:** Rapport revenus + dépenses avec graphiques
- 📋 **Transaction Report PDF:** Rapport de toutes les transactions

**Exemple de contenu:**
- Graphiques de revenus mensuels
- Catégorisation des dépenses (loyer, nourriture, transport)
- Historique de soldes
- Red flags visuels
- Format professionnel prêt à imprimer

**Comment l'obtenir:**
```javascript
// Télécharger le Income Report
const pdfResponse = await fetch(
  `https://www.inverite.com/api/v2/pdf_report/${guid}?type=income`,
  {
    headers: { 'Auth': 'API_KEY' }
  }
);

const pdfBlob = await pdfResponse.blob();

// Sauvegarder
const url = URL.createObjectURL(pdfBlob);
const a = document.createElement('a');
a.href = url;
a.download = `${clientName}-income-report.pdf`;
a.click();
```

**Utilité:**
- 📄 Rapport visuel pour les agents
- 📄 Document à joindre au dossier client
- 📄 Preuve pour audit/conformité

---

### 3. 📥 **RELEVÉS BANCAIRES PDF** (Bank Statements)

**Endpoint:** `/api/v2/bank_pdf_statement/{guid}`

**Ce que ça donne:**
- PDF des relevés bancaires originaux de la banque
- Plusieurs mois disponibles (selon ce que le client a partagé)

**Comment l'obtenir:**
```javascript
const statementResponse = await fetch(
  `https://www.inverite.com/api/v2/bank_pdf_statement/${guid}`,
  {
    headers: { 'Auth': 'API_KEY' }
  }
);

const pdfBlob = await statementResponse.blob();
// → PDF officiel de la banque
```

**Utilité:**
- 📄 Document officiel pour vérification
- 📄 Backup si besoin de prouver les revenus
- 📄 Conformité légale

**Note:** Déjà disponible dans `all_bank_pdf_statements` du JSON fetch

---

### 4. 📋 **LISTE DE TOUTES LES DEMANDES** (List Requests)

**Endpoint:** `/api/v2/list`

**Ce que ça donne:**
```json
{
  "requests": [
    {
      "request": "GUID-1",
      "name": "John Doe",
      "email": "john@example.com",
      "status": "Verified",
      "complete_datetime": "2025-12-22 18:09:15",
      "type": "bankverify"
    },
    {
      "request": "GUID-2",
      "name": "Jane Smith",
      "status": "Pending",
      "type": "bankverify"
    }
  ]
}
```

**Utilité:**
- 📊 Voir toutes les demandes en attente
- 📊 Statistiques globales
- 📊 Monitoring des demandes non traitées

**Paramètres disponibles:**
```
?status=Verified    // Filtrer par status
?email=john@x.com   // Rechercher par email
?limit=50           // Limiter les résultats
?offset=0           // Pagination
```

---

### 5. 🔍 **MICROCHECK SEARCH** (Recherche de Prêts Rapides)

**Endpoint:** `/api/v2/microcheck/search`

**Ce que ça fait:**
- Recherche si le client a des prêts sur salaire (payday loans)
- Détecte les compagnies de microcrédit dans les transactions

**Ce que ça donne:**
```json
{
  "has_microloans": true,
  "lenders": [
    {
      "name": "Money Mart",
      "loan_count": 3,
      "total_borrowed": "1500.00",
      "last_loan_date": "2025-11-15"
    },
    {
      "name": "Cash Store",
      "loan_count": 1,
      "total_borrowed": "500.00"
    }
  ],
  "risk_level": "high"  // RED FLAG!
}
```

**Utilité:**
- 🚨 Détecter les clients avec prêts rapides (HIGH RISK)
- 🚨 Voir le nombre de prêteurs différents
- 🚨 Calculer le total des prêts en cours

**Comment l'utiliser:**
```javascript
const microcheckResponse = await fetch(
  'https://www.inverite.com/api/v2/microcheck/search',
  {
    method: 'POST',
    headers: {
      'Auth': 'API_KEY',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      guid: guid,  // Le GUID de la vérification
      days: 90     // Chercher sur les 90 derniers jours
    })
  }
);

const microData = await microcheckResponse.json();
```

---

### 6. 🔐 **PII (Personally Identifiable Information)**

**Endpoint:** `/api/v2/pii/fetch`

**Ce que ça donne:**
- Informations personnelles supplémentaires
- Numéro d'assurance sociale (SIN) si disponible
- Date de naissance
- Autres identifiants

**Note:** Nécessite permissions spéciales et conformité RGPD/PIPEDA

---

### 7. 📊 **BUSINESS SECTOR** (Secteur d'Activité)

**Endpoint:** `/api/v2/business_sector`

**Ce que ça fait:**
- Analyse les paies pour déterminer le secteur d'emploi
- Catégorise l'employeur (retail, tech, construction, etc.)

**Ce que ça donne:**
```json
{
  "sector": "retail",
  "employer_name": "Walmart Canada",
  "employer_type": "large_corporation",
  "job_stability": "high"
}
```

**Utilité:**
- Évaluer la stabilité de l'emploi
- Identifier les secteurs à risque
- Vérifier la cohérence avec les revenus

---

## 📊 COMPARAISON: Ce que tu as VS Ce que tu PEUX avoir

| Donnée | Actuellement | Disponible | Utilité |
|--------|-------------|------------|---------|
| **Transactions** | ✅ Oui | ✅ | Analyse détaillée |
| **Revenus détectés** | ✅ Oui | ✅ | Calcul capacité de remboursement |
| **Statistiques 30/60 jours** | ✅ Oui | ✅ | Tendances |
| **Red Flags (NSF, retours)** | ✅ Oui | ✅ | Détection risques |
| **Risk Score** | ❌ Non | 🔥 **OUI** | Score 300-850 automatique |
| **Rapports PDF** | ❌ Non | 📄 **OUI** | Documents professionnels |
| **Microloans Detection** | ❌ Non | 🚨 **OUI** | Détection prêts rapides |
| **Business Sector** | ❌ Non | 📊 **OUI** | Stabilité emploi |
| **Relevés PDF Banque** | ⚠️ Partiel | 📄 **OUI** | Documents officiels |

---

## 🎯 RECOMMANDATIONS

### 🔥 À IMPLÉMENTER EN PRIORITÉ

#### 1. **RISK SCORE** (Priorité #1)
**Pourquoi:**
- Score automatique de 300 à 850 (comme crédit)
- Recommandation approve/decline
- Gain de temps énorme

**Effort:** Moyen (2-3h)
**Impact:** 🔥🔥🔥 ÉNORME

**Code à ajouter:**
```javascript
// Dans l'extension Chrome, après fetch du JSON
async function getRiskScore(guid) {
  // 1. Créer demande risk
  const riskReq = await fetch('https://www.inverite.com/api/v2/risk', {
    method: 'POST',
    headers: {
      'Auth': CONFIG.INVERITE_API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ request: guid })
  });

  const { task_id } = await riskReq.json();

  // 2. Poller le status
  let riskData;
  for (let i = 0; i < 12; i++) {  // Max 1 minute (12 x 5s)
    await sleep(5000);

    const statusReq = await fetch(
      `https://www.inverite.com/api/v2/risk_status/${task_id}`,
      { headers: { 'Auth': CONFIG.INVERITE_API_KEY } }
    );

    riskData = await statusReq.json();

    if (riskData.status === 'success') {
      break;
    }
  }

  return riskData;
}

// Utilisation
const inveriteData = await fetch(apiUrl).then(r => r.json());
const riskScore = await getRiskScore(guid);

// Combiner les deux
const completeData = {
  ...inveriteData,
  risk_score: riskScore
};

// Envoyer à SAR avec le risk score
await sendToSAR(completeData);
```

---

#### 2. **MICROCHECK SEARCH** (Priorité #2)
**Pourquoi:**
- Détecter les prêts rapides (payday loans)
- RED FLAG automatique
- Protéger contre les mauvais payeurs

**Effort:** Facile (1h)
**Impact:** 🔥🔥 ÉLEVÉ

---

#### 3. **PDF REPORTS** (Priorité #3)
**Pourquoi:**
- Rapport visuel professionnel
- Document pour dossier client
- Facilite la décision des agents

**Effort:** Facile (30 min)
**Impact:** 🔥 MOYEN

---

### ⏸️ À CONSIDÉRER PLUS TARD

- **Business Sector:** Utile mais pas critique
- **PII Fetch:** Nécessite conformité légale
- **List API:** Seulement pour stats/monitoring

---

## 💰 Coûts Potentiels

**À vérifier avec Inverite:**
- `/api/v2/fetch` → Inclus dans le prix de base
- `/api/v2/risk` → Peut coûter extra par requête
- `/api/v2/pdf_report` → Généralement inclus
- `/api/v2/microcheck/search` → Peut coûter extra

**Recommandation:** Demander à ton account manager Inverite les tarifs exacts.

---

## 🚀 Plan d'Action

### Phase 1: Risk Score (1 semaine)
1. Modifier l'extension Chrome pour appeler `/api/v2/risk`
2. Ajouter le polling du risk_status
3. Inclure le risk_score dans le JSON envoyé à SAR
4. Modifier SAR pour afficher le risk_score dans l'analyse

### Phase 2: Microcheck (1 semaine)
1. Ajouter l'appel `/api/v2/microcheck/search`
2. Détecter automatiquement les prêts rapides
3. Afficher un RED FLAG dans l'admin si microloans détectés

### Phase 3: PDF Reports (3 jours)
1. Ajouter bouton "Télécharger Rapport PDF"
2. Appeler `/api/v2/pdf_report`
3. Sauvegarder le PDF avec le dossier client

---

## ✅ Résumé

**Ce que tu extrais déjà:**
- ✅ Transactions (90 jours)
- ✅ Revenus calculés automatiquement
- ✅ Statistiques (débits/crédits)
- ✅ Red flags (NSF, retours)

**Ce que tu DEVRAIS extraire:**
- 🔥 **Risk Score** (Score 300-850 automatique)
- 🚨 **Microcheck** (Détection prêts rapides)
- 📄 **PDF Reports** (Rapports professionnels)

**Gain potentiel:**
- ⚡ Décisions 10x plus rapides
- 🎯 Réduction du risque de défaut
- 📊 Rapports professionnels pour audit

---

**Veux-tu que je t'aide à implémenter le Risk Score en premier?** 🚀
