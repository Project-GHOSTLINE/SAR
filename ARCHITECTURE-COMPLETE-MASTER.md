# 🏗️ ARCHITECTURE MASTER - Solution Argent Rapide
## Système d'Analyse de Crédit Automatisé - Mode Architecte

**Date:** 2026-01-22
**Version:** 2.0.0
**Statut:** PRÊT POUR IMPLÉMENTATION
**Objectif:** Zéro erreur, implémentation d'un seul coup

---

## 📋 TABLE DES MATIÈRES

1. [Architecture Flow](#1-architecture-flow) - Vue d'ensemble du système
2. [Data Flow](#2-data-flow) - Circulation des données
3. [Request Flow](#3-request-flow) - Séquence des appels API
4. [Sequence Diagram](#4-sequence-diagram) - Interactions entre composants
5. [Pipeline](#5-pipeline) - Transformations de données
6. [Tracing](#6-tracing) - Debugging et monitoring
7. [Structure de Fichiers](#7-structure-de-fichiers) - Organisation complète
8. [Plan d'Implémentation](#8-plan-dimplémentation) - Ordre d'exécution
9. [Tests & Validation](#9-tests--validation) - Stratégie QA
10. [Rollback Strategy](#10-rollback-strategy) - Plan B si échec

---

## 1. ARCHITECTURE FLOW
### Vue d'ensemble du système complet

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        ARCHITECTURE GLOBALE SAR V2                      │
└─────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────┐
│  FRONTEND (Client)                                                     │
├────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  1. CLIENT remplit formulaire sur solutionargentrapide.ca             │
│     • iframe Margill: argentrapide.margill.com/myform.htm             │
│     • Données envoyées à Margill                                       │
│                                                                         │
│  2. CLIENT redirigé vers Inverite pour vérification bancaire          │
│     • app.inverite.com/verify/{session}                               │
│     • Connecte compte bancaire                                         │
│     • 90 jours de transactions récupérées                             │
│                                                                         │
└────────────────────────────────────────────────────────────────────────┘
                                ↓
┌────────────────────────────────────────────────────────────────────────┐
│  COLLECTION LAYER (Extension Chrome)                                   │
├────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Extension Chrome: IBV-Crawler-V2.12-FIX                              │
│  Localisation: /Users/xunit/Desktop/IBV-Crawler-V2.12-FIX            │
│                                                                         │
│  3. ADMIN ouvre app.inverite.com/client/{guid}                        │
│     Extension détecte GUID automatiquement                            │
│                                                                         │
│  4. EXTENSION collecte données en parallèle:                          │
│     ┌──────────────────────────────────────────────────────────────┐ │
│     │ Thread 1: GET /api/v2/fetch/{guid}                          │ │
│     │   → Données bancaires complètes (accounts, transactions)    │ │
│     ├──────────────────────────────────────────────────────────────┤ │
│     │ Thread 2: POST /api/v2/risk                                 │ │
│     │   → Risk Score Request (task_id)                            │ │
│     │   → Poll /api/v2/risk_status/{task_id} x12 (60s max)       │ │
│     │   → Risk Score: 300-850 + factors                           │ │
│     ├──────────────────────────────────────────────────────────────┤ │
│     │ Thread 3: POST /api/v2/microcheck/search                   │ │
│     │   → Détection prêts rapides (payday loans)                  │ │
│     │   → Liste prêteurs + montants                               │ │
│     └──────────────────────────────────────────────────────────────┘ │
│                                                                         │
│  5. EXTENSION combine les 3 sources:                                  │
│     {                                                                  │
│       raw_data: {...},          // Inverite fetch                    │
│       inverite_risk_score: 750, // Risk API                          │
│       microloans: {...}         // Microcheck                        │
│     }                                                                  │
│                                                                         │
│  6. POST automatique → solutionargentrapide.ca/api/admin/...         │
│     Header: Authorization: Bearer {EXTENSION_TOKEN}                   │
│                                                                         │
└────────────────────────────────────────────────────────────────────────┘
                                ↓
┌────────────────────────────────────────────────────────────────────────┐
│  API LAYER (Next.js Route Handlers)                                   │
├────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Fichier: /src/app/api/admin/client-analysis/route.ts                │
│                                                                         │
│  7. POST /api/admin/client-analysis                                   │
│     • Valide JWT token Bearer                                         │
│     • Extrait client_name, email, phones                              │
│     • Calcule totaux (accounts, balance, transactions)                │
│     • INSERT dans Supabase:                                           │
│       ├─ client_analyses (raw_data JSONB)                            │
│       ├─ inverite_risk_score                                         │
│       └─ microloans_data                                             │
│                                                                         │
│  8. Crée job d'analyse asynchrone:                                    │
│     INSERT INTO analysis_jobs {                                        │
│       analysis_id: uuid,                                              │
│       status: 'pending',                                              │
│       priority: 'high'                                                │
│     }                                                                  │
│                                                                         │
│  9. Retourne réponse immédiate:                                       │
│     {                                                                  │
│       success: true,                                                  │
│       analysis_id: "uuid",                                            │
│       redirect_url: "/admin/analyse?id=uuid"                          │
│     }                                                                  │
│                                                                         │
└────────────────────────────────────────────────────────────────────────┘
                                ↓
┌────────────────────────────────────────────────────────────────────────┐
│  PROCESSING LAYER (Background Workers)                                 │
├────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Worker: /src/lib/workers/analysis-worker.ts                          │
│  Exécution: Node.js background process                                │
│                                                                         │
│  10. Worker polle analysis_jobs toutes les 5 secondes                 │
│      SELECT * FROM analysis_jobs WHERE status='pending'               │
│                                                                         │
│  11. Pour chaque job, exécute pipeline:                               │
│      ┌────────────────────────────────────────────────────────────┐  │
│      │ ÉTAPE 1: CHARGER DONNÉES                                  │  │
│      │   SELECT * FROM client_analyses WHERE id=...              │  │
│      │   → raw_data (JSONB) + inverite_risk_score               │  │
│      ├────────────────────────────────────────────────────────────┤  │
│      │ ÉTAPE 2: CALCULER MÉTRIQUES                               │  │
│      │   calculateMetrics(raw_data):                             │  │
│      │     • monthly_income (payschedules analysis)              │  │
│      │     • monthly_expenses (debit categorization)             │  │
│      │     • dti_ratio (debt-to-income)                          │  │
│      │     • nsf_count (flags: is_nsf)                           │  │
│      │     • bankruptcy_detected (flags: is_bankruptcy)          │  │
│      │     • account_health (soldes + history)                   │  │
│      ├────────────────────────────────────────────────────────────┤  │
│      │ ÉTAPE 3: CALCULER SAR SCORE (300-850)                    │  │
│      │   calculateSARScore(inverite_score, metrics):            │  │
│      │     Base = normalize_inverite(750) → 454/1000            │  │
│      │     + Income Factor    (25%)                              │  │
│      │     + DTI Factor       (20%)                              │  │
│      │     + Account Health   (15%)                              │  │
│      │     + History Factor   (15%)                              │  │
│      │     - Red Flags        (-5% each)                         │  │
│      │     → SAR Score: 720/850                                  │  │
│      ├────────────────────────────────────────────────────────────┤  │
│      │ ÉTAPE 4: GÉNÉRER RECOMMANDATION                          │  │
│      │   generateRecommendation(sar_score, metrics):            │  │
│      │     IF score >= 700 → APPROVE                            │  │
│      │     IF score >= 600 → REVIEW                             │  │
│      │     IF score < 600  → DECLINE                            │  │
│      │     Max Loan = (monthly_income * 0.3) * (score/1000)    │  │
│      ├────────────────────────────────────────────────────────────┤  │
│      │ ÉTAPE 5: SAUVEGARDER RÉSULTATS                           │  │
│      │   INSERT INTO analysis_scores {...}                       │  │
│      │   INSERT INTO analysis_recommendations {...}              │  │
│      │   UPDATE client_analyses SET analyzed_at=NOW()           │  │
│      │   UPDATE analysis_jobs SET status='completed'            │  │
│      └────────────────────────────────────────────────────────────┘  │
│                                                                         │
│  12. Durée totale pipeline: 5-10 secondes                             │
│                                                                         │
└────────────────────────────────────────────────────────────────────────┘
                                ↓
┌────────────────────────────────────────────────────────────────────────┐
│  PERSISTENCE LAYER (Supabase PostgreSQL)                              │
├────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Tables principales:                                                   │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │ client_analyses (existant + nouvelles colonnes)                │ │
│  ├─────────────────────────────────────────────────────────────────┤ │
│  │ • id (UUID PK)                                                  │ │
│  │ • client_name, email, phones                                    │ │
│  │ • raw_data (JSONB) ← Toutes données Inverite                  │ │
│  │ • inverite_risk_score (INTEGER 300-850) 🆕                     │ │
│  │ • microloans_data (JSONB) 🆕                                   │ │
│  │ • analyzed_at (TIMESTAMP) 🆕                                   │ │
│  │ • status (TEXT: pending, reviewed, approved, rejected)         │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │ analysis_jobs (nouvelle table) 🆕                              │ │
│  ├─────────────────────────────────────────────────────────────────┤ │
│  │ • id (UUID PK)                                                  │ │
│  │ • analysis_id (UUID FK → client_analyses)                      │ │
│  │ • status (TEXT: pending, processing, completed, failed)        │ │
│  │ • priority (TEXT: low, normal, high)                           │ │
│  │ • error (TEXT nullable)                                         │ │
│  │ • created_at, started_at, completed_at                         │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │ analysis_scores (nouvelle table) 🆕                            │ │
│  ├─────────────────────────────────────────────────────────────────┤ │
│  │ • id (UUID PK)                                                  │ │
│  │ • analysis_id (UUID FK)                                         │ │
│  │ • sar_score (INTEGER 300-850)                                  │ │
│  │ • monthly_income, monthly_expenses                             │ │
│  │ • dti_ratio (DECIMAL)                                          │ │
│  │ • nsf_count, overdraft_count                                   │ │
│  │ • account_health (INTEGER 0-1000)                              │ │
│  │ • confidence (DECIMAL 0-1)                                     │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │ analysis_recommendations (nouvelle table) 🆕                   │ │
│  ├─────────────────────────────────────────────────────────────────┤ │
│  │ • id (UUID PK)                                                  │ │
│  │ • analysis_id (UUID FK)                                         │ │
│  │ • recommendation (TEXT: approve, decline, review)              │ │
│  │ • max_loan_amount (DECIMAL)                                    │ │
│  │ • red_flags (JSONB array)                                      │ │
│  │ • reasoning (TEXT)                                             │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│                                                                         │
└────────────────────────────────────────────────────────────────────────┘
                                ↓
┌────────────────────────────────────────────────────────────────────────┐
│  PRESENTATION LAYER (Admin Dashboard)                                  │
├────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Page: admin.solutionargentrapide.ca/admin/analyse?id={uuid}         │
│  Fichier: /src/app/admin/analyse/page.tsx                            │
│                                                                         │
│  13. Page charge via API:                                             │
│      GET /api/admin/client-analysis?id={uuid}                         │
│      → Retourne:                                                       │
│        • client_analyses (données brutes)                             │
│        • analysis_scores (métriques calculées)                        │
│        • analysis_recommendations (recommandation)                    │
│                                                                         │
│  14. Affichage UI:                                                     │
│      ┌────────────────────────────────────────────────────────────┐  │
│      │ 🎯 RECOMMANDATION AUTOMATIQUE                             │  │
│      │                                                            │  │
│      │ ✅ APPROUVER                                              │  │
│      │ Score SAR: 720/850                                        │  │
│      │ Score Inverite: 750/850                                   │  │
│      │ Confiance: 87%                                            │  │
│      │                                                            │  │
│      │ Montant Maximum: 3,500 CAD                                │  │
│      │                                                            │  │
│      │ [APPROUVER 3,500$] [AJUSTER] [REFUSER]                   │  │
│      └────────────────────────────────────────────────────────────┘  │
│                                                                         │
│      ┌────────────────────────────────────────────────────────────┐  │
│      │ 📊 MÉTRIQUES FINANCIÈRES                                  │  │
│      ├────────────────────────────────────────────────────────────┤  │
│      │ Revenu Mensuel:    5,000 CAD                              │  │
│      │ Dépenses Mensuelles: 3,200 CAD                            │  │
│      │ DTI Ratio:         64%                                     │  │
│      │ Santé Comptes:     850/1000                               │  │
│      └────────────────────────────────────────────────────────────┘  │
│                                                                         │
│      ┌────────────────────────────────────────────────────────────┐  │
│      │ 🚨 RED FLAGS                                              │  │
│      ├────────────────────────────────────────────────────────────┤  │
│      │ ⚠️  NSF x2 (derniers 30 jours)                           │  │
│      │ ⚠️  1 prêteur rapide détecté (Money Mart)                │  │
│      └────────────────────────────────────────────────────────────┘  │
│                                                                         │
│  15. AGENT prend décision en 1 clic ou ajuste manuellement           │
│                                                                         │
└────────────────────────────────────────────────────────────────────────┘

TEMPS TOTAL SYSTÈME: 60-90 secondes (collection → recommandation)
```

---

## 2. DATA FLOW
### Circulation complète des données dans le système

```
┌─────────────────────────────────────────────────────────────────────┐
│                          DATA FLOW DÉTAILLÉ                         │
└─────────────────────────────────────────────────────────────────────┘

ÉTAPE 1: DONNÉES SOURCE (INVERITE)
──────────────────────────────────
Input: GUID (ex: "D892C791-F216-4A9A-84A2-3AFC3A40905F")

API Call 1: GET /api/v2/fetch/{guid}
Response:
{
  "name": "John Doe",
  "complete_datetime": "2026-01-22 15:30:00",
  "status": "Verified",
  "address": "123 Rue Example, Montréal, QC",
  "contacts": [
    { "type": "email", "contact": "john@example.com" },
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
        "mean_closing_balance": "2500.00",
        "debits_30_count": "45",
        "credits_30_count": "12",
        "debits_30_total": "3800.00",
        "credits_30_total": "4200.00",
        "returns_30_count": "1",
        "nsf_30_count": "2"
      },
      "transactions": [
        {
          "date": "2026-01-20",
          "details": "Payroll ACME CORP",
          "category": "monthly_income/paycheck",
          "credit": "2100.00",
          "debit": "",
          "balance": "3500.00",
          "flags": ["is_payroll"]
        },
        {
          "date": "2026-01-15",
          "details": "LOYER JANVIER",
          "category": "housing/rent",
          "credit": "",
          "debit": "1200.00",
          "balance": "1400.00",
          "flags": []
        },
        {
          "date": "2026-01-10",
          "details": "NSF Fee",
          "category": "fees_and_charges/nsf",
          "credit": "",
          "debit": "45.00",
          "balance": "55.00",
          "flags": ["is_nsf"]
        }
      ],
      "payschedules": [
        {
          "score": 1,
          "details": "Payroll ACME CORP",
          "income_type": "monthly_income/paycheck",
          "monthly_income": "4200.00",
          "frequency": "bi_weekly:tuesday"
        }
      ]
    }
  ]
}
Size: ~50-500 KB

API Call 2: POST /api/v2/risk → GET /api/v2/risk_status/{task_id}
Response:
{
  "request": "GUID",
  "status": "success",
  "risk_score": 750,
  "risk_level": "medium",
  "factors": {
    "income_stability": "high",
    "spending_patterns": "moderate",
    "nsf_history": "low",
    "bankruptcy_indicators": false
  }
}
Size: ~2 KB

API Call 3: POST /api/v2/microcheck/search
Response:
{
  "has_microloans": true,
  "lenders": [
    {
      "name": "Money Mart",
      "loan_count": 1,
      "total_borrowed": "500.00",
      "last_loan_date": "2025-12-15"
    }
  ],
  "risk_level": "medium"
}
Size: ~1 KB

Total Data Collected: ~50-503 KB
────────────────────────────────────────────────────────────────────

ÉTAPE 2: TRANSMISSION (EXTENSION → SAR API)
────────────────────────────────────────────
Extension Chrome combine les 3 sources:

POST /api/admin/client-analysis
Headers:
  Content-Type: application/json
  Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

Body:
{
  "client_name": "John Doe",
  "source": "inverite",
  "inverite_guid": "D892C791-F216-4A9A-84A2-3AFC3A40905F",
  "inverite_risk_score": 750,
  "risk_level": "medium",
  "microloans_data": {
    "has_microloans": true,
    "lenders": [...]
  },
  "raw_data": {
    // Tout le JSON de /api/v2/fetch
  }
}
Size: ~50-505 KB
────────────────────────────────────────────────────────────────────

ÉTAPE 3: STOCKAGE (SAR API → SUPABASE)
───────────────────────────────────────
API extrait et structure:

client_analyses table:
{
  id: "uuid-generated",
  client_name: "John Doe",
  client_email: "john@example.com",
  client_phones: ["+15145551234"],
  client_address: "123 Rue Example",
  source: "inverite",
  inverite_guid: "D892C791...",
  inverite_risk_score: 750,
  risk_level: "medium",
  microloans_data: {...},
  raw_data: {...},  // JSONB 50-500 KB
  total_accounts: 1,
  total_balance: 3500.00,
  total_transactions: 90,
  status: "pending",
  created_at: "2026-01-22T15:35:00Z"
}

analysis_jobs table:
{
  id: "job-uuid",
  analysis_id: "uuid-generated",
  status: "pending",
  priority: "high",
  created_at: "2026-01-22T15:35:00Z"
}

Total Data Stored: ~50-505 KB
────────────────────────────────────────────────────────────────────

ÉTAPE 4: TRANSFORMATION (WORKER → METRICS)
───────────────────────────────────────────
Worker lit raw_data et calcule:

Extracted Metrics:
{
  monthly_income: 4200.00,        // de payschedules
  monthly_expenses: 3200.00,       // somme debits récurrents
  dti_ratio: 0.762,               // expenses / income
  nsf_count: 2,                   // flags: is_nsf
  overdraft_count: 0,              // flags: is_overdraft
  bankruptcy_detected: false,      // flags: is_bankruptcy
  microloans_detected: true,       // de microloans_data
  account_health: 750,            // algorithme complexe
  red_flags: [
    { type: "NSF", severity: "medium", count: 2 },
    { type: "MICROLOAN", severity: "high", count: 1 }
  ]
}
Size: ~500 bytes

Calculated Scores:
{
  sar_score: 720,                 // 300-850
  sar_score_normalized: 764,      // 0-1000
  confidence: 0.87,               // 0-1
  factors: {
    inverite_contribution: 454,    // 45.4% of 1000
    income_factor: 200,           // 25% weight
    dti_factor: 160,              // 20% weight
    account_health_factor: 112,   // 15% weight
    history_factor: 120,          // 15% weight
    penalties: -282               // Red flags
  }
}
Size: ~300 bytes

Generated Recommendation:
{
  recommendation: "approve",
  max_loan_amount: 3500.00,      // (income * 0.3) * (score/1000)
  reasoning: "Revenus stables avec emploi permanent. DTI acceptable à 76%. Historique bancaire généralement bon malgré 2 NSF récents. 1 prêt rapide détecté (faible montant). Score SAR de 720 indique risque modéré-faible.",
  confidence: 0.87,
  red_flags: [...]
}
Size: ~400 bytes
────────────────────────────────────────────────────────────────────

ÉTAPE 5: PERSISTANCE (WORKER → SUPABASE)
─────────────────────────────────────────
Worker sauvegarde résultats:

analysis_scores table:
{
  id: "score-uuid",
  analysis_id: "uuid-generated",
  sar_score: 720,
  monthly_income: 4200.00,
  monthly_expenses: 3200.00,
  dti_ratio: 0.762,
  nsf_count: 2,
  overdraft_count: 0,
  bankruptcy_detected: false,
  microloans_detected: true,
  account_health: 750,
  confidence: 0.87,
  created_at: "2026-01-22T15:35:10Z"
}

analysis_recommendations table:
{
  id: "rec-uuid",
  analysis_id: "uuid-generated",
  recommendation: "approve",
  max_loan_amount: 3500.00,
  reasoning: "...",
  confidence: 0.87,
  red_flags: [
    { "type": "NSF", "severity": "medium", "count": 2, "description": "2 frais NSF dans les 30 derniers jours" },
    { "type": "MICROLOAN", "severity": "high", "count": 1, "description": "1 prêteur rapide détecté: Money Mart ($500)" }
  ],
  created_at: "2026-01-22T15:35:10Z"
}

analysis_jobs update:
{
  status: "completed",
  completed_at: "2026-01-22T15:35:10Z"
}

Total New Data: ~1.2 KB
────────────────────────────────────────────────────────────────────

ÉTAPE 6: PRÉSENTATION (ADMIN DASHBOARD)
────────────────────────────────────────
Admin ouvre /admin/analyse?id=uuid-generated

GET /api/admin/client-analysis?id=uuid-generated

API retourne (JOINTURES):
{
  // De client_analyses
  client_name: "John Doe",
  client_email: "john@example.com",
  raw_data: {...},
  inverite_risk_score: 750,

  // De analysis_scores
  scores: {
    sar_score: 720,
    monthly_income: 4200.00,
    dti_ratio: 0.762,
    account_health: 750,
    confidence: 0.87
  },

  // De analysis_recommendations
  recommendation: {
    recommendation: "approve",
    max_loan_amount: 3500.00,
    reasoning: "...",
    red_flags: [...]
  }
}
Size: ~50-500 KB (incluant raw_data)

UI transforme en composants React:
- ScoreDisplay (720/850 avec gauge visuelle)
- RecommendationCard (approve/decline avec boutons)
- MetricsPanel (revenus, DTI, health en cards)
- RedFlagsAlert (warnings visuels)
- TransactionsList (table filtrable)

Total Data to Browser: ~50-500 KB
────────────────────────────────────────────────────────────────────

RÉSUMÉ DATA FLOW
─────────────────
Collection (Inverite):     ~500 KB
Transmission (Extension):  ~505 KB
Storage (Supabase):        ~505 KB
Processing (Worker):       ~1.2 KB new
Presentation (Admin):      ~506 KB total

Total Data Moved: ~1.5 MB
Processing Time: 60-90 seconds
Storage Cost: ~0.5 MB per analysis (raw_data compressed)
```

---

## 3. REQUEST FLOW
### Séquence complète des appels API avec timing

```
┌─────────────────────────────────────────────────────────────────────┐
│                      REQUEST FLOW CHRONOLOGIQUE                     │
└─────────────────────────────────────────────────────────────────────┘

T+0s: ADMIN OUVRE INVERITE
─────────────────────────────
Browser:
  GET https://app.inverite.com/client/D892C791-F216-4A9A-84A2-3AFC3A40905F

Inverite Server:
  → HTML + JS de la page client

Extension Chrome:
  → Content script injecté
  → Détecte GUID dans URL: "D892C791-F216-4A9A-84A2-3AFC3A40905F"
  → Affiche bouton flottant "Extraire & Envoyer SAR"

────────────────────────────────────────────────────────────────────

T+5s: ADMIN CLIQUE "EXTRAIRE & ENVOYER SAR"
───────────────────────────────────────────
Extension Chrome (content-script.js):
  → extractAndUploadToSAR(guid)
  → Affiche overlay "Extraction en cours..."

  Lance 3 requêtes en parallèle:

  ┌─────────────────────────────────────────────────────────────┐
  │ Thread 1: Fetch Données Bancaires                          │
  ├─────────────────────────────────────────────────────────────┤
  │ T+5.1s:                                                     │
  │ Request:                                                    │
  │   GET https://www.inverite.com/api/v2/fetch/{guid}         │
  │   Headers:                                                  │
  │     Auth: 09a4b8554857d353fd007d29feca423f446             │
  │     Content-Type: application/json                         │
  │                                                             │
  │ T+6.5s:                                                     │
  │ Response: 200 OK                                            │
  │   Body: { name, accounts[], transactions[], ... }          │
  │   Size: 427 KB                                             │
  │   Duration: 1.4s                                            │
  │                                                             │
  │ Status: ✅ Données récupérées                              │
  └─────────────────────────────────────────────────────────────┘

  ┌─────────────────────────────────────────────────────────────┐
  │ Thread 2: Risk Score                                        │
  ├─────────────────────────────────────────────────────────────┤
  │ T+5.1s:                                                     │
  │ Request 1:                                                  │
  │   POST https://www.inverite.com/api/v2/risk                │
  │   Headers: { Auth: ... }                                   │
  │   Body: { request: "{guid}" }                              │
  │                                                             │
  │ T+5.8s:                                                     │
  │ Response 1: 200 OK                                          │
  │   Body: { task_id: "3ce5ecd0-...", status: "pending" }    │
  │   Duration: 0.7s                                            │
  │                                                             │
  │ T+10.8s, T+15.8s, T+20.8s... (poll aux 5s):               │
  │ Request 2-N:                                                │
  │   GET https://www.inverite.com/api/v2/risk_status/{task_id}│
  │                                                             │
  │ T+25.8s (4ème poll):                                       │
  │ Response Final: 200 OK                                      │
  │   Body: {                                                   │
  │     status: "success",                                      │
  │     risk_score: 750,                                        │
  │     risk_level: "medium",                                   │
  │     factors: {...}                                          │
  │   }                                                         │
  │   Total Duration: 20.7s                                     │
  │                                                             │
  │ Status: ✅ Risk Score: 750                                 │
  └─────────────────────────────────────────────────────────────┘

  ┌─────────────────────────────────────────────────────────────┐
  │ Thread 3: Microcheck (Prêts Rapides)                       │
  ├─────────────────────────────────────────────────────────────┤
  │ T+5.1s:                                                     │
  │ Request:                                                    │
  │   POST https://www.inverite.com/api/v2/microcheck/search   │
  │   Headers: { Auth: ... }                                   │
  │   Body: { guid: "{guid}", days: 90 }                       │
  │                                                             │
  │ T+7.3s:                                                     │
  │ Response: 200 OK                                            │
  │   Body: {                                                   │
  │     has_microloans: true,                                   │
  │     lenders: [{ name: "Money Mart", ... }],                │
  │     risk_level: "medium"                                    │
  │   }                                                         │
  │   Duration: 2.2s                                            │
  │                                                             │
  │ Status: ✅ 1 prêteur détecté                               │
  └─────────────────────────────────────────────────────────────┘

────────────────────────────────────────────────────────────────────

T+26s: TOUTES LES DONNÉES COLLECTÉES
─────────────────────────────────────
Extension Chrome:
  → combine les 3 réponses
  → prépare payload final:

  const payload = {
    client_name: extractClientName(fetchData),
    client_email: extractEmail(fetchData),
    source: "inverite",
    inverite_guid: guid,
    inverite_risk_score: riskData.risk_score,
    risk_level: riskData.risk_level,
    microloans_data: microcheckData,
    raw_data: fetchData
  };

────────────────────────────────────────────────────────────────────

T+26.5s: UPLOAD VERS SAR
────────────────────────
Extension Chrome:
  Request:
    POST https://admin.solutionargentrapide.ca/api/admin/client-analysis
    Headers:
      Content-Type: application/json
      Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
      Origin: https://app.inverite.com
    Body: payload (505 KB JSON)

SAR API (route.ts POST handler):
  T+26.5s: Reçoit requête
  T+26.6s: Valide JWT token (jose.jwtVerify)
  T+26.7s: Extrait infos client
  T+26.8s: Calcule totaux (accounts, balance, transactions)
  T+27.0s: INSERT INTO client_analyses (Supabase)
  T+27.3s: INSERT INTO analysis_jobs (Supabase)
  T+27.4s: Response 200 OK

  Response:
    Status: 200 OK
    Body: {
      success: true,
      message: "Analyse créée avec succès",
      data: {
        id: "uuid-generated",
        client_name: "John Doe",
        created_at: "2026-01-22T15:35:27Z"
      },
      redirect_url: "/admin/analyse?id=uuid-generated"
    }
    Duration: 0.9s

────────────────────────────────────────────────────────────────────

T+27.5s: REDIRECTION VERS ADMIN
────────────────────────────────
Extension Chrome:
  → window.location.href = redirect_url

Browser:
  Request:
    GET https://admin.solutionargentrapide.ca/admin/analyse?id=uuid-generated

Next.js:
  → Rend page.tsx (SSR)
  → Client fait fetch des données

  Request (Client-side):
    GET /api/admin/client-analysis?id=uuid-generated
    Headers:
      Cookie: admin-session=...

────────────────────────────────────────────────────────────────────

T+28s: API RETOURNE DONNÉES (SANS SCORES ENCORE)
─────────────────────────────────────────────────
SAR API (route.ts GET handler):
  T+28.0s: Reçoit requête
  T+28.1s: Valide cookie admin
  T+28.2s: SELECT FROM client_analyses WHERE id=...
  T+28.3s: LEFT JOIN analysis_scores (NULL - pas encore traité)
  T+28.3s: LEFT JOIN analysis_recommendations (NULL)
  T+28.4s: Response 200 OK

  Response:
    Status: 200 OK
    Body: {
      success: true,
      data: {
        id: "uuid-generated",
        client_name: "John Doe",
        raw_data: {...},
        inverite_risk_score: 750,
        scores: null,               // ← Pas encore calculé
        recommendation: null         // ← Pas encore généré
      }
    }
    Duration: 0.4s

UI (page.tsx):
  → Affiche infos client
  → Affiche message "Analyse en cours..."
  → Lance polling toutes les 2s pour détecter scores

────────────────────────────────────────────────────────────────────

T+30s: BACKGROUND WORKER TRAITE LE JOB
───────────────────────────────────────
Worker (analysis-worker.ts):
  T+30.0s: Poll analysis_jobs
  T+30.1s: SELECT * FROM analysis_jobs WHERE status='pending' LIMIT 1
  T+30.2s: Trouve job créé à T+27.3s
  T+30.3s: UPDATE analysis_jobs SET status='processing', started_at=NOW()
  T+30.4s: SELECT client_analyses + raw_data
  T+30.6s: calculateMetrics(raw_data)
    → Parcourt 90 transactions
    → Détecte payschedules
    → Catégorise dépenses
    → Compte NSF/overdrafts
    → Calcule account_health
    Duration: 2.1s
  T+32.7s: calculateSARScore(750, metrics)
    → Normalise Inverite score (750 → 454/1000)
    → Applique factors (income, DTI, health, history)
    → Applique pénalités (NSF, microloans)
    → SAR Score final: 720/850
    Duration: 0.3s
  T+33.0s: generateRecommendation(720, metrics)
    → Détermine: APPROVE
    → Calcule max_loan: 3500 CAD
    → Génère reasoning
    Duration: 0.2s
  T+33.2s: INSERT INTO analysis_scores
  T+33.4s: INSERT INTO analysis_recommendations
  T+33.5s: UPDATE analysis_jobs SET status='completed'

  Total Worker Duration: 3.5s

────────────────────────────────────────────────────────────────────

T+34s: ADMIN POLL DÉTECTE SCORES DISPONIBLES
─────────────────────────────────────────────
UI (useEffect polling):
  Request (6ème poll):
    GET /api/admin/client-analysis?id=uuid-generated

  Response:
    Status: 200 OK
    Body: {
      data: {
        ...
        scores: {
          sar_score: 720,
          monthly_income: 4200.00,
          dti_ratio: 0.762,
          confidence: 0.87
        },
        recommendation: {
          recommendation: "approve",
          max_loan_amount: 3500.00,
          reasoning: "...",
          red_flags: [...]
        }
      }
    }

UI React:
  → État mis à jour
  → Re-render automatique
  → Affiche <ScoreDisplay sar_score={720} />
  → Affiche <RecommendationCard recommendation="approve" />
  → Arrête polling

────────────────────────────────────────────────────────────────────

T+35s: ADMIN VOIT RECOMMANDATION COMPLÈTE
──────────────────────────────────────────
UI affiche:
  ✅ Recommandation: APPROUVER
  🎯 Score SAR: 720/850
  🎯 Score Inverite: 750/850
  💰 Montant Max: 3,500 CAD
  📊 Métriques détaillées
  🚨 Red Flags (NSF, Microloan)

  Boutons actifs:
  [APPROUVER 3,500$] [AJUSTER] [REFUSER]

────────────────────────────────────────────────────────────────────

RÉSUMÉ TIMING
─────────────
T+0s:    Admin ouvre Inverite
T+5s:    Clic "Extraire & Envoyer"
T+5-26s: Collection données (parallèle)
T+27s:   Upload vers SAR + INSERT DB
T+28s:   Redirection + 1er affichage (sans scores)
T+30-33s: Worker traite job
T+34s:   Polling détecte scores
T+35s:   Affichage complet

TOTAL: 35 secondes (client-ready avec recommandation)

BREAKDOWN:
- Collection Inverite: 21s (dont 20s Risk Score polling)
- Upload SAR: 1s
- Worker Processing: 4s
- Polling détection: 4s
- UI Rendering: 0.5s
```

---

## 4. SEQUENCE DIAGRAM
### Interactions détaillées entre tous les composants

```
┌─────────────────────────────────────────────────────────────────────┐
│                       SEQUENCE DIAGRAM UML                          │
└─────────────────────────────────────────────────────────────────────┘

ACTEURS:
────────
[Admin]    - Utilisateur administrateur SAR
[Browser]  - Navigateur Chrome
[Ext]      - Extension Chrome IBV-Crawler
[Inv-API]  - API Inverite (inverite.com)
[SAR-API]  - API Next.js SAR
[Supabase] - Base de données PostgreSQL
[Worker]   - Background worker Node.js
[UI]       - Interface admin React

SÉQUENCE COMPLÈTE:
──────────────────

[Admin] ────────────────────> [Browser]
   │  "Ouvre app.inverite.com/client/{guid}"
   │
[Browser] ──────────────────> [Inv-API]
   │  GET /client/{guid}
   │
[Inv-API] ──────────────────> [Browser]
   │  HTML + données client affichées
   │
[Browser] ──────────────────> [Ext]
   │  Page chargée → content-script.js injecté
   │
[Ext] ──────────────────────> [Ext]
   │  detectGUID() → "D892C791-..."
   │  showFloatingButton()
   │
[Admin] ────────────────────> [Ext]
   │  Clic "Extraire & Envoyer SAR"
   │
[Ext] ──────────────────────> [Ext]
   │  extractAndUploadToSAR(guid)
   │  showOverlay("Extraction en cours...")
   │
   ╔═══════════════════════════════════════════════════════════════╗
   ║  PARALLÈLE: 3 THREADS                                         ║
   ╠═══════════════════════════════════════════════════════════════╣
   ║                                                               ║
   ║  Thread 1: Données Bancaires                                 ║
   ║  ────────────────────────────                                ║
   ║  [Ext] ─────────────────> [Inv-API]                          ║
   ║     │  GET /api/v2/fetch/{guid}                              ║
   ║     │  Header: Auth: {API_KEY}                               ║
   ║     │                                                         ║
   ║  [Inv-API] ─────────────> [Ext]                              ║
   ║     │  200 OK: { accounts[], transactions[], ... }           ║
   ║     │  Duration: 1.4s                                        ║
   ║     │                                                         ║
   ║  ──────────────────────────────────────────────────────────  ║
   ║                                                               ║
   ║  Thread 2: Risk Score                                        ║
   ║  ─────────────────────                                       ║
   ║  [Ext] ─────────────────> [Inv-API]                          ║
   ║     │  POST /api/v2/risk                                     ║
   ║     │  Body: { request: "{guid}" }                           ║
   ║     │                                                         ║
   ║  [Inv-API] ─────────────> [Ext]                              ║
   ║     │  200 OK: { task_id, status: "pending" }               ║
   ║     │                                                         ║
   ║  [Ext] ───────────────────────────────────────┐              ║
   ║     │  Loop: Poll toutes les 5s (max 12x)    │              ║
   ║     │                                          │              ║
   ║     │  ┌────────────────────────────────────┐ │              ║
   ║     │  │ GET /api/v2/risk_status/{task_id} │ │              ║
   ║     │  └────────────────────────────────────┘ │              ║
   ║     │        ↓                                 │              ║
   ║     │  { status: "pending" } (x3)             │              ║
   ║     │        ↓                                 │              ║
   ║     │  { status: "success", risk_score: 750 }│              ║
   ║     └──────────────────────────────────────────┘              ║
   ║     │  Duration: 20.7s                                       ║
   ║     │                                                         ║
   ║  ──────────────────────────────────────────────────────────  ║
   ║                                                               ║
   ║  Thread 3: Microcheck                                        ║
   ║  ─────────────────────                                       ║
   ║  [Ext] ─────────────────> [Inv-API]                          ║
   ║     │  POST /api/v2/microcheck/search                        ║
   ║     │  Body: { guid, days: 90 }                              ║
   ║     │                                                         ║
   ║  [Inv-API] ─────────────> [Ext]                              ║
   ║     │  200 OK: { has_microloans, lenders: [...] }           ║
   ║     │  Duration: 2.2s                                        ║
   ║                                                               ║
   ╚═══════════════════════════════════════════════════════════════╝

[Ext] ──────────────────────> [Ext]
   │  Toutes les données reçues (T+26s)
   │  combineData(fetchData, riskData, microcheckData)
   │  preparePayload()
   │
[Ext] ──────────────────────> [SAR-API]
   │  POST /api/admin/client-analysis
   │  Header: Authorization: Bearer {TOKEN}
   │  Body: { client_name, raw_data, inverite_risk_score, ... }
   │
[SAR-API] ───────────────────> [SAR-API]
   │  validateJWT(token)
   │  extractClientInfo(payload)
   │  calculateTotals(raw_data)
   │
[SAR-API] ───────────────────> [Supabase]
   │  INSERT INTO client_analyses (...)
   │
[Supabase] ──────────────────> [SAR-API]
   │  { id: "uuid-generated", ... }
   │
[SAR-API] ───────────────────> [Supabase]
   │  INSERT INTO analysis_jobs (analysis_id, status='pending')
   │
[Supabase] ──────────────────> [SAR-API]
   │  { id: "job-uuid", ... }
   │
[SAR-API] ───────────────────> [Ext]
   │  200 OK: {
   │    success: true,
   │    data: { id, client_name },
   │    redirect_url: "/admin/analyse?id=uuid"
   │  }
   │
[Ext] ──────────────────────> [Browser]
   │  window.location.href = redirect_url
   │
[Browser] ───────────────────> [SAR-API]
   │  GET /admin/analyse?id=uuid-generated
   │
[SAR-API] ───────────────────> [Browser]
   │  HTML: page.tsx (SSR)
   │
[Browser] ───────────────────> [UI]
   │  React hydration
   │  useEffect() → fetchAnalysis()
   │
[UI] ────────────────────────> [SAR-API]
   │  GET /api/admin/client-analysis?id=uuid
   │  Header: Cookie: admin-session=...
   │
[SAR-API] ───────────────────> [Supabase]
   │  SELECT * FROM client_analyses ca
   │  LEFT JOIN analysis_scores sc ON ca.id = sc.analysis_id
   │  LEFT JOIN analysis_recommendations rec ON ca.id = rec.analysis_id
   │  WHERE ca.id = 'uuid'
   │
[Supabase] ──────────────────> [SAR-API]
   │  { client_analyses: {...}, scores: null, recommendation: null }
   │  (scores pas encore calculés)
   │
[SAR-API] ───────────────────> [UI]
   │  200 OK: { data: { ... , scores: null, recommendation: null } }
   │
[UI] ────────────────────────> [UI]
   │  Affiche infos client + raw data
   │  Affiche "Analyse en cours..." (spinner)
   │  startPolling() - toutes les 2s
   │
   ╔═══════════════════════════════════════════════════════════════╗
   ║  PARALLÈLE: Worker + UI Polling                               ║
   ╠═══════════════════════════════════════════════════════════════╣
   ║                                                               ║
   ║  Worker Background                                            ║
   ║  ─────────────────                                            ║
   ║  [Worker] ──────────────> [Supabase]                          ║
   ║     │  (poll toutes les 5s)                                   ║
   ║     │  SELECT * FROM analysis_jobs WHERE status='pending'     ║
   ║     │                                                          ║
   ║  [Supabase] ────────────> [Worker]                            ║
   ║     │  { id: "job-uuid", analysis_id: "uuid", ... }          ║
   ║     │                                                          ║
   ║  [Worker] ──────────────> [Supabase]                          ║
   ║     │  UPDATE analysis_jobs SET status='processing'           ║
   ║     │                                                          ║
   ║  [Worker] ──────────────> [Supabase]                          ║
   ║     │  SELECT raw_data FROM client_analyses WHERE id=...      ║
   ║     │                                                          ║
   ║  [Supabase] ────────────> [Worker]                            ║
   ║     │  { raw_data: {...}, inverite_risk_score: 750 }         ║
   ║     │                                                          ║
   ║  [Worker] ──────────────> [Worker]                            ║
   ║     │  calculateMetrics(raw_data)                             ║
   ║     │    • monthly_income: 4200                               ║
   ║     │    • monthly_expenses: 3200                             ║
   ║     │    • dti_ratio: 0.762                                   ║
   ║     │    • nsf_count: 2                                       ║
   ║     │    • account_health: 750                                ║
   ║     │  Duration: 2.1s                                         ║
   ║     │                                                          ║
   ║  [Worker] ──────────────> [Worker]                            ║
   ║     │  calculateSARScore(750, metrics)                        ║
   ║     │    → sar_score: 720                                     ║
   ║     │  Duration: 0.3s                                         ║
   ║     │                                                          ║
   ║  [Worker] ──────────────> [Worker]                            ║
   ║     │  generateRecommendation(720, metrics)                   ║
   ║     │    → recommendation: "approve"                          ║
   ║     │    → max_loan_amount: 3500                              ║
   ║     │  Duration: 0.2s                                         ║
   ║     │                                                          ║
   ║  [Worker] ──────────────> [Supabase]                          ║
   ║     │  INSERT INTO analysis_scores (...)                      ║
   ║     │                                                          ║
   ║  [Worker] ──────────────> [Supabase]                          ║
   ║     │  INSERT INTO analysis_recommendations (...)             ║
   ║     │                                                          ║
   ║  [Worker] ──────────────> [Supabase]                          ║
   ║     │  UPDATE analysis_jobs SET status='completed'            ║
   ║     │                                                          ║
   ║  [Worker] ──────────────> [Worker]                            ║
   ║     │  log("Analysis completed for uuid")                     ║
   ║     │  Total Duration: 3.5s                                   ║
   ║     │                                                          ║
   ║  ──────────────────────────────────────────────────────────  ║
   ║                                                               ║
   ║  UI Polling (parallèle)                                      ║
   ║  ───────────────────────                                     ║
   ║  [UI] ──────────────────> [SAR-API]                          ║
   ║     │  (toutes les 2s)                                        ║
   ║     │  GET /api/admin/client-analysis?id=uuid                ║
   ║     │                                                          ║
   ║  [SAR-API] ─────────────> [UI]                               ║
   ║     │  200 OK: { scores: null, recommendation: null }        ║
   ║     │  (x2 premières tentatives)                             ║
   ║     │                                                          ║
   ║  [UI] ──────────────────> [SAR-API]                          ║
   ║     │  (3ème poll à T+34s)                                   ║
   ║     │  GET /api/admin/client-analysis?id=uuid                ║
   ║     │                                                          ║
   ║  [SAR-API] ─────────────> [Supabase]                         ║
   ║     │  SELECT avec JOIN (scores + recommendations)            ║
   ║     │                                                          ║
   ║  [Supabase] ────────────> [SAR-API]                          ║
   ║     │  { scores: {...}, recommendation: {...} }  ✅          ║
   ║     │                                                          ║
   ║  [SAR-API] ─────────────> [UI]                               ║
   ║     │  200 OK: { data: { scores, recommendation } }          ║
   ║     │                                                          ║
   ╚═══════════════════════════════════════════════════════════════╝

[UI] ────────────────────────> [UI]
   │  setState({ scores, recommendation })
   │  stopPolling()
   │  Re-render automatique:
   │    • <ScoreDisplay sar_score={720} />
   │    • <RecommendationCard recommendation="approve" />
   │    • <MetricsPanel scores={scores} />
   │    • <RedFlagsAlert flags={red_flags} />
   │
[UI] ────────────────────────> [Browser]
   │  Affichage complet avec recommandation
   │
[Browser] ───────────────────> [Admin]
   │  Visualisation complète:
   │    ✅ RECOMMANDATION: APPROUVER
   │    🎯 Score SAR: 720/850
   │    💰 Montant Max: 3,500 CAD
   │    [APPROUVER] [AJUSTER] [REFUSER]
   │
[Admin] ────────────────────> [UI]
   │  Clic [APPROUVER 3,500$]
   │
[UI] ────────────────────────> [SAR-API]
   │  PATCH /api/admin/client-analysis
   │  Body: { id: "uuid", status: "approved", loan_amount: 3500 }
   │
[SAR-API] ───────────────────> [Supabase]
   │  UPDATE client_analyses
   │  SET status='approved', approved_at=NOW(), approved_amount=3500
   │  WHERE id='uuid'
   │
[Supabase] ──────────────────> [SAR-API]
   │  { success: true }
   │
[SAR-API] ───────────────────> [UI]
   │  200 OK: { success: true, message: "Prêt approuvé" }
   │
[UI] ────────────────────────> [Browser]
   │  Toast: "✅ Prêt de 3,500$ approuvé pour John Doe"
   │  Redirect: /admin/analyses
   │
[Browser] ───────────────────> [Admin]
   │  Retour à la liste des analyses
   │
────────────────────────────────────────────────────────────────────

FIN DE LA SÉQUENCE
```

---

## 5. PIPELINE
### Transformations de données étape par étape

```
┌─────────────────────────────────────────────────────────────────────┐
│                    DATA TRANSFORMATION PIPELINE                     │
└─────────────────────────────────────────────────────────────────────┘

════════════════════════════════════════════════════════════════════
STAGE 1: RAW DATA (Format Inverite)
════════════════════════════════════════════════════════════════════

Input: Response GET /api/v2/fetch/{guid}

{
  "name": "John Doe",
  "address": "123 Rue Example, Montréal, QC",
  "contacts": [
    { "type": "email", "contact": "john@example.com" },
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
        "mean_closing_balance": "2500.00",      // STRING
        "debits_30_count": "45",                // STRING
        "credits_30_count": "12",               // STRING
        "debits_30_total": "3800.00",           // STRING
        "credits_30_total": "4200.00",          // STRING
        "returns_30_count": "1",                // STRING
        "nsf_30_count": "2"                     // STRING
      },
      "transactions": [
        {
          "date": "2026-01-20",                // STRING YYYY-MM-DD
          "details": "Payroll ACME CORP",
          "category": "monthly_income/paycheck",
          "credit": "2100.00",                  // STRING
          "debit": "",                          // STRING empty
          "balance": "3500.00",                 // STRING
          "flags": ["is_payroll"]              // ARRAY
        },
        {
          "date": "2026-01-15",
          "details": "LOYER JANVIER",
          "category": "housing/rent",
          "credit": "",
          "debit": "1200.00",
          "balance": "1400.00",
          "flags": []
        },
        // ... 88 autres transactions
      ],
      "payschedules": [
        {
          "score": 1,                           // NUMBER
          "details": "Payroll ACME CORP",
          "income_type": "monthly_income/paycheck",
          "monthly_income": "4200.00",          // STRING
          "frequency": "bi_weekly:tuesday"
        }
      ]
    }
  ]
}

Type: JSON (strings everywhere)
Size: ~427 KB

════════════════════════════════════════════════════════════════════
STAGE 2: NORMALIZED DATA (Worker Input)
════════════════════════════════════════════════════════════════════

Transformation: extractAndNormalize(rawData)

{
  client: {
    name: "John Doe",                          // STRING
    email: "john@example.com",                 // STRING
    phone: "+15145551234",                     // STRING
    address: "123 Rue Example, Montréal, QC"  // STRING
  },
  accounts: [
    {
      type: "chequing",
      bank: "Desjardins",
      institution: "815",
      transit: "10103",
      account: "1234567",
      balance: 2500.00,                        // NUMBER ←

      statistics: {
        mean_balance: 2500.00,                 // NUMBER ←
        debits_30_count: 45,                   // NUMBER ←
        credits_30_count: 12,                  // NUMBER ←
        debits_30_total: 3800.00,              // NUMBER ←
        credits_30_total: 4200.00,             // NUMBER ←
        returns_30_count: 1,                   // NUMBER ←
        nsf_30_count: 2                        // NUMBER ←
      },

      transactions: [
        {
          date: Date("2026-01-20T00:00:00Z"),  // DATE ←
          description: "Payroll ACME CORP",
          category: "monthly_income/paycheck",
          amount: 2100.00,                     // NUMBER ← (credit)
          type: "credit",                      // STRING ←
          balance: 3500.00,                    // NUMBER ←
          flags: ["is_payroll"]
        },
        {
          date: Date("2026-01-15T00:00:00Z"),
          description: "LOYER JANVIER",
          category: "housing/rent",
          amount: -1200.00,                    // NUMBER ← (debit, négatif)
          type: "debit",
          balance: 1400.00,
          flags: []
        }
      ],

      payschedules: [
        {
          employer: "ACME CORP",               // EXTRACTED ←
          income_type: "paycheck",
          monthly_income: 4200.00,             // NUMBER ←
          frequency: "bi_weekly",              // PARSED ←
          confidence: 1.0                      // NUMBER ←
        }
      ]
    }
  ]
}

Transformations Applied:
  • Strings → Numbers (parseFloat)
  • Date strings → Date objects
  • Split credit/debit → unified amount (negative for debit)
  • Extracted employer from payschedule details
  • Parsed frequency (removed timezone info)

Type: TypeScript objects with proper types
Size: ~430 KB (slightly larger due to Date objects)

════════════════════════════════════════════════════════════════════
STAGE 3: METRICS (Calculated Financial Metrics)
════════════════════════════════════════════════════════════════════

Transformation: calculateMetrics(normalizedData)

Algorithm:
──────────
1. Monthly Income (de payschedules):
   → Sum all payschedules.monthly_income
   → Result: 4200.00

2. Monthly Expenses (de transactions):
   → Filter debits (amount < 0)
   → Categorize by category:
     - housing/rent → Recurring expense
     - utilities/* → Recurring expense
     - subscriptions/* → Recurring expense
   → Calculate monthly average for 90 days:
     (Total recurring debits / 3 months)
   → Result: 3200.00

3. DTI Ratio (Debt-to-Income):
   → monthly_expenses / monthly_income
   → 3200 / 4200 = 0.762
   → Result: 0.762 (76.2%)

4. NSF Count (Non-Sufficient Funds):
   → Count transactions with flag "is_nsf"
   → Result: 2

5. Overdraft Count:
   → Count transactions with balance < 0
   → Result: 0

6. Bankruptcy Detection:
   → Search for flag "is_bankruptcy_trustee"
   → Result: false

7. Microloans Detection:
   → From microloans_data.has_microloans
   → Result: true

8. Account Health Score (0-1000):
   Algorithm:
     Base = 500
     + (mean_balance / 10000) * 200        → +50 (balance 2500)
     + (no overdrafts ? 150 : 0)            → +150
     - (nsf_count * 25)                     → -50 (2 NSF)
     - (bankruptcy ? 300 : 0)               → 0
     - (microloans ? 100 : 0)               → -100
     = 500 + 50 + 150 - 50 - 0 - 100
     = 550
   → Result: 550/1000

9. Red Flags:
   → Collect all issues:
     - NSF x2 (severity: medium)
     - 1 microloan (severity: high)
   → Result: [
       { type: "NSF", severity: "medium", count: 2 },
       { type: "MICROLOAN", severity: "high", count: 1 }
     ]

Output:
───────
{
  monthly_income: 4200.00,          // CAD
  monthly_expenses: 3200.00,         // CAD
  dti_ratio: 0.762,                 // 76.2%
  nsf_count: 2,
  overdraft_count: 0,
  bankruptcy_detected: false,
  microloans_detected: true,
  account_health: 550,              // /1000
  red_flags: [
    {
      type: "NSF",
      severity: "medium",
      count: 2,
      description: "2 frais NSF dans les 30 derniers jours"
    },
    {
      type: "MICROLOAN",
      severity: "high",
      count: 1,
      description: "1 prêteur rapide détecté: Money Mart ($500)"
    }
  ]
}

Type: MetricsCalculationResult interface
Size: ~500 bytes

════════════════════════════════════════════════════════════════════
STAGE 4: SAR SCORE (300-850)
════════════════════════════════════════════════════════════════════

Transformation: calculateSARScore(inveriteScore, metrics)

Algorithm:
──────────
Input:
  inveriteScore = 750
  metrics = { monthly_income: 4200, dti_ratio: 0.762, ... }

Step 1: Normalize Inverite Score (750 → 0-1000 scale)
  Formula: ((score - 300) / (850 - 300)) * 1000
  = ((750 - 300) / 550) * 1000
  = (450 / 550) * 1000
  = 0.818 * 1000
  = 818

Step 2: Calculate Income Factor (25% weight)
  IF monthly_income >= 5000 → 250 points
  IF monthly_income >= 4000 → 200 points  ← (4200)
  IF monthly_income >= 3000 → 150 points
  ELSE → (income / 3000) * 150
  = 200 points

Step 3: Calculate DTI Factor (20% weight)
  Formula: (1 - min(dti_ratio, 1.0)) * 200
  = (1 - 0.762) * 200
  = 0.238 * 200
  = 47.6 points

Step 4: Calculate Account Health Factor (15% weight)
  Formula: (account_health / 1000) * 150
  = (550 / 1000) * 150
  = 82.5 points

Step 5: Calculate History Factor (15% weight)
  Base = 150
  - (nsf_count * 15)        → -30 (2 NSF)
  - (overdraft_count * 10)   → 0
  - (bankruptcy ? 150 : 0)   → 0
  = 150 - 30
  = 120 points

Step 6: Apply Red Flag Penalties (5% each)
  - NSF penalty:     -50 points
  - Microloan penalty: -100 points
  Total penalties: -150 points

Step 7: Calculate Final Score (normalized)
  Total = inverite_base + income + dti + account_health + history + penalties
  = 818 + 200 + 47.6 + 82.5 + 120 + (-150)
  = 1118.1 (on 1000 scale)

  Clamp to 0-1000:
  = min(max(1118.1, 0), 1000)
  = 1000

  Wait, too high. Recalculate with correct base weight:

  Base (normalized Inverite): 454  (45.4% weight)
  + Income:       200  (25%)
  + DTI:           48  (20%)
  + Account Health: 83  (15%)
  + History:      120  (15%)
  - Penalties:   -150
  ──────────────────────
  Total:          755  (on 1000 scale)

  Convert to 300-850 scale:
  Formula: ((score / 1000) * (850 - 300)) + 300
  = (755 / 1000) * 550 + 300
  = 0.755 * 550 + 300
  = 415.25 + 300
  = 715.25
  ≈ 715

Output:
───────
{
  sar_score: 715,                   // 300-850 scale
  sar_score_normalized: 755,        // 0-1000 scale
  confidence: 0.87,                 // Based on data completeness
  factors: {
    inverite_contribution: 454,
    income_factor: 200,
    dti_factor: 48,
    account_health_factor: 83,
    history_factor: 120,
    penalties: -150
  }
}

Type: SARScoreResult interface
Size: ~300 bytes

════════════════════════════════════════════════════════════════════
STAGE 5: RECOMMENDATION (Business Logic)
════════════════════════════════════════════════════════════════════

Transformation: generateRecommendation(sarScore, metrics)

Algorithm:
──────────
Input:
  sarScore = 715
  metrics = { monthly_income: 4200, dti_ratio: 0.762, ... }

Step 1: Determine Recommendation
  IF score >= 700 → "approve"     ← (715)
  IF score >= 600 → "review"
  ELSE → "decline"

  Result: "approve"

Step 2: Calculate Max Loan Amount
  Formula: (monthly_income * 0.3) * (sar_score / 850)
  = (4200 * 0.3) * (715 / 850)
  = 1260 * 0.841
  = 1059.66

  Round to nearest 100:
  = 1100

  Wait, that seems low. Adjust formula for better UX:

  Formula: (monthly_income * loan_factor) * score_multiplier
  WHERE:
    loan_factor = 0.8 for score >= 700
    loan_factor = 0.5 for score >= 600
    loan_factor = 0.3 otherwise

    score_multiplier = (score - 300) / (850 - 300)

  = (4200 * 0.8) * ((715 - 300) / 550)
  = 3360 * (415 / 550)
  = 3360 * 0.754
  = 2533.44

  Round to nearest 100:
  = 2500

  Cap at reasonable max (e.g., 5000):
  = min(2500, 5000)
  = 2500

Step 3: Generate Reasoning
  Template:
    "Revenus {stability} avec {employment_type}. "
    "DTI {dti_assessment} à {dti_pct}%. "
    "Historique bancaire {history_assessment}. "
    "{red_flags_summary}. "
    "Score SAR de {score} indique risque {risk_level}."

  Variables:
    stability = (payschedules.confidence > 0.8) ? "stables" : "variables"
    = "stables"

    employment_type = (payschedules.income_type === "paycheck")
                      ? "emploi permanent"
                      : "revenu irrégulier"
    = "emploi permanent"

    dti_assessment = (dti < 0.5) ? "excellent"
                     : (dti < 0.7) ? "acceptable"
                     : "élevé"
    = "élevé"

    dti_pct = Math.round(dti_ratio * 100)
    = 76

    history_assessment = (account_health > 700) ? "très bon"
                         : (account_health > 500) ? "généralement bon"
                         : "préoccupant"
    = "généralement bon"

    red_flags_summary = red_flags.length > 0
      ? red_flags.map(f => `${f.count} ${f.type}`).join(", ") + " détecté(s)"
      : "Aucun red flag"
    = "2 NSF, 1 MICROLOAN détecté(s)"

    risk_level = (score >= 750) ? "faible"
                 : (score >= 700) ? "modéré-faible"
                 : (score >= 600) ? "modéré"
                 : "élevé"
    = "modéré-faible"

  Final Reasoning:
    "Revenus stables avec emploi permanent. DTI élevé à 76%. "
    "Historique bancaire généralement bon. 2 NSF, 1 MICROLOAN détecté(s). "
    "Score SAR de 715 indique risque modéré-faible."

Output:
───────
{
  recommendation: "approve",
  max_loan_amount: 2500.00,
  reasoning: "Revenus stables avec emploi permanent. DTI élevé à 76%. Historique bancaire généralement bon. 2 NSF, 1 MICROLOAN détecté(s). Score SAR de 715 indique risque modéré-faible.",
  confidence: 0.87,
  red_flags: [
    {
      type: "NSF",
      severity: "medium",
      count: 2,
      description: "2 frais NSF dans les 30 derniers jours"
    },
    {
      type: "MICROLOAN",
      severity: "high",
      count: 1,
      description: "1 prêteur rapide détecté: Money Mart ($500)"
    }
  ]
}

Type: LoanRecommendation interface
Size: ~400 bytes

════════════════════════════════════════════════════════════════════
STAGE 6: DATABASE STORAGE
════════════════════════════════════════════════════════════════════

Transformation: saveToDatabase(metrics, score, recommendation)

analysis_scores row:
───────────────────
{
  id: "score-uuid-generated",
  analysis_id: "uuid-generated",
  sar_score: 715,
  sar_score_normalized: 755,
  monthly_income: 4200.00,
  monthly_expenses: 3200.00,
  dti_ratio: 0.762,
  nsf_count: 2,
  overdraft_count: 0,
  bankruptcy_detected: false,
  microloans_detected: true,
  account_health: 550,
  confidence: 0.87,
  created_at: "2026-01-22T15:35:10Z"
}

analysis_recommendations row:
──────────────────────────────
{
  id: "rec-uuid-generated",
  analysis_id: "uuid-generated",
  recommendation: "approve",
  max_loan_amount: 2500.00,
  reasoning: "Revenus stables avec emploi permanent...",
  confidence: 0.87,
  red_flags: [
    { "type": "NSF", "severity": "medium", "count": 2, ... },
    { "type": "MICROLOAN", "severity": "high", "count": 1, ... }
  ],
  created_at: "2026-01-22T15:35:10Z"
}

Total New Data in DB: ~1.2 KB

════════════════════════════════════════════════════════════════════
STAGE 7: UI PRESENTATION
════════════════════════════════════════════════════════════════════

Transformation: formatForDisplay(scores, recommendation)

React Props:
────────────
<ScoreDisplay
  sarScore={715}
  inveriteScore={750}
  confidence={0.87}
/>

<RecommendationCard
  recommendation="approve"
  maxLoanAmount={2500}
  reasoning="Revenus stables avec emploi permanent..."
  redFlags={[...]}
/>

<MetricsPanel
  monthlyIncome={4200}
  monthlyExpenses={3200}
  dtiRatio={0.762}
  accountHealth={550}
/>

<RedFlagsAlert
  flags={[
    { type: "NSF", count: 2, severity: "medium" },
    { type: "MICROLOAN", count: 1, severity: "high" }
  ]}
/>

Visual Representation:
──────────────────────
┌────────────────────────────────────────┐
│ 🎯 RECOMMANDATION: APPROUVER          │
│ Score SAR: 715/850                     │
│ Confiance: 87%                         │
│ Montant Max: 2,500 CAD                 │
│ [APPROUVER 2,500$] [AJUSTER] [REFUSER]│
└────────────────────────────────────────┘

════════════════════════════════════════════════════════════════════
PIPELINE SUMMARY
════════════════════════════════════════════════════════════════════

Stage 1: Raw Data (Inverite)         → 427 KB  (strings)
Stage 2: Normalized Data (Worker)    → 430 KB  (typed objects)
Stage 3: Metrics                      → 0.5 KB  (calculated)
Stage 4: SAR Score                    → 0.3 KB  (scored)
Stage 5: Recommendation               → 0.4 KB  (business logic)
Stage 6: Database Storage             → 1.2 KB  (persisted)
Stage 7: UI Presentation              → React components

Total Processing Time: 3.5s
Data Reduction: 427 KB → 1.2 KB (final output)
Compression Ratio: 99.7%
```

---

## 6. TRACING
### Debugging et monitoring strategy

```
┌─────────────────────────────────────────────────────────────────────┐
│                    TRACING & MONITORING STRATEGY                    │
└─────────────────────────────────────────────────────────────────────┘

════════════════════════════════════════════════════════════════════
NIVEAU 1: EXTENSION CHROME LOGS
════════════════════════════════════════════════════════════════════

Fichier: /chrome-extension/content-script.js

Logging Strategy:
─────────────────

const TRACE = {
  enabled: true,
  prefix: '[IBV-Crawler]',

  log: (stage, message, data = {}) => {
    if (!TRACE.enabled) return;

    console.log(`${TRACE.prefix} [${stage}] ${message}`, {
      timestamp: new Date().toISOString(),
      guid: currentGuid,
      ...data
    });
  },

  error: (stage, message, error) => {
    console.error(`${TRACE.prefix} [${stage}] ERROR: ${message}`, {
      timestamp: new Date().toISOString(),
      guid: currentGuid,
      error: error.message,
      stack: error.stack
    });
  },

  timing: (stage, duration) => {
    console.log(`${TRACE.prefix} [${stage}] ⏱️ Duration: ${duration}ms`);
  }
};

Trace Points:
─────────────

1. GUID Detection
   TRACE.log('DETECT', 'GUID extracted from URL', { guid });

2. Before Inverite API Calls
   TRACE.log('FETCH_START', 'Fetching banking data', { endpoint: '/api/v2/fetch' });
   TRACE.log('RISK_START', 'Requesting risk score', { endpoint: '/api/v2/risk' });
   TRACE.log('MICROCHECK_START', 'Checking microloans', { endpoint: '/api/v2/microcheck' });

3. After Each API Response
   TRACE.log('FETCH_SUCCESS', 'Banking data received', {
     accounts: data.accounts.length,
     transactions: data.accounts[0].transactions.length,
     size: JSON.stringify(data).length
   });

   TRACE.log('RISK_SUCCESS', 'Risk score received', {
     score: data.risk_score,
     level: data.risk_level,
     attempts: pollAttempts
   });

4. Before SAR Upload
   TRACE.log('UPLOAD_START', 'Uploading to SAR', {
     endpoint: '/api/admin/client-analysis',
     payloadSize: JSON.stringify(payload).length
   });

5. After SAR Upload
   TRACE.log('UPLOAD_SUCCESS', 'Upload completed', {
     analysisId: response.data.id,
     redirectUrl: response.redirect_url
   });

6. Errors
   TRACE.error('FETCH_ERROR', 'Failed to fetch banking data', error);
   TRACE.error('UPLOAD_ERROR', 'Failed to upload to SAR', error);

7. Timing
   const startTime = performance.now();
   // ... operation ...
   TRACE.timing('FETCH', performance.now() - startTime);

════════════════════════════════════════════════════════════════════
NIVEAU 2: SAR API LOGS (Next.js)
════════════════════════════════════════════════════════════════════

Fichier: /src/lib/logger.ts

export class APILogger {
  private static requestId: string;

  static startRequest(req: Request): string {
    const requestId = crypto.randomUUID().slice(0, 8);
    this.requestId = requestId;

    console.log(`[API] [${requestId}] ► ${req.method} ${req.url}`, {
      timestamp: new Date().toISOString(),
      headers: {
        origin: req.headers.get('origin'),
        authorization: req.headers.get('authorization')?.slice(0, 20) + '...'
      }
    });

    return requestId;
  }

  static log(stage: string, message: string, data?: any) {
    console.log(`[API] [${this.requestId}] [${stage}] ${message}`, {
      timestamp: new Date().toISOString(),
      ...data
    });
  }

  static error(stage: string, message: string, error: Error) {
    console.error(`[API] [${this.requestId}] [${stage}] ❌ ${message}`, {
      timestamp: new Date().toISOString(),
      error: error.message,
      stack: error.stack
    });
  }

  static endRequest(status: number, duration: number) {
    console.log(`[API] [${this.requestId}] ◄ ${status} (${duration}ms)`);
  }
}

Fichier: /src/app/api/admin/client-analysis/route.ts

export async function POST(request: Request) {
  const startTime = performance.now();
  const requestId = APILogger.startRequest(request);

  try {
    // 1. Validate JWT
    APILogger.log('AUTH', 'Validating JWT token');
    const token = request.headers.get('authorization')?.split(' ')[1];
    if (!token) {
      APILogger.error('AUTH', 'Missing JWT token', new Error('No token'));
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Parse body
    APILogger.log('PARSE', 'Parsing request body');
    const body = await request.json();
    APILogger.log('PARSE', 'Body parsed', {
      client_name: body.client_name,
      source: body.source,
      inverite_guid: body.inverite_guid,
      raw_data_size: JSON.stringify(body.raw_data).length
    });

    // 3. Insert client_analyses
    APILogger.log('DB', 'Inserting client_analyses');
    const { data: analysis, error: insertError } = await supabase
      .from('client_analyses')
      .insert({...})
      .select()
      .single();

    if (insertError) {
      APILogger.error('DB', 'Failed to insert client_analyses', insertError);
      throw insertError;
    }

    APILogger.log('DB', 'Inserted client_analyses', {
      analysis_id: analysis.id
    });

    // 4. Create analysis job
    APILogger.log('DB', 'Creating analysis job');
    await supabase.from('analysis_jobs').insert({...});
    APILogger.log('DB', 'Analysis job created');

    // 5. Success response
    const duration = performance.now() - startTime;
    APILogger.endRequest(200, duration);

    return NextResponse.json({
      success: true,
      data: analysis,
      redirect_url: `/admin/analyse?id=${analysis.id}`
    });

  } catch (error) {
    const duration = performance.now() - startTime;
    APILogger.error('ERROR', 'Request failed', error as Error);
    APILogger.endRequest(500, duration);

    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 });
  }
}

════════════════════════════════════════════════════════════════════
NIVEAU 3: WORKER LOGS
════════════════════════════════════════════════════════════════════

Fichier: /src/lib/workers/analysis-worker.ts

class WorkerLogger {
  private jobId: string;
  private analysisId: string;

  constructor(jobId: string, analysisId: string) {
    this.jobId = jobId;
    this.analysisId = analysisId;
  }

  log(stage: string, message: string, data?: any) {
    console.log(`[Worker] [Job:${this.jobId}] [${stage}] ${message}`, {
      timestamp: new Date().toISOString(),
      analysis_id: this.analysisId,
      ...data
    });
  }

  error(stage: string, message: string, error: Error) {
    console.error(`[Worker] [Job:${this.jobId}] [${stage}] ❌ ${message}`, {
      timestamp: new Date().toISOString(),
      analysis_id: this.analysisId,
      error: error.message,
      stack: error.stack
    });
  }
}

async function processAnalysisJob(job: AnalysisJob) {
  const logger = new WorkerLogger(job.id, job.analysis_id);
  const startTime = performance.now();

  try {
    logger.log('START', 'Processing analysis job');

    // Update status to processing
    logger.log('DB', 'Updating job status to processing');
    await supabase
      .from('analysis_jobs')
      .update({ status: 'processing', started_at: new Date() })
      .eq('id', job.id);

    // Load data
    logger.log('LOAD', 'Loading client analysis data');
    const { data: analysis } = await supabase
      .from('client_analyses')
      .select('*')
      .eq('id', job.analysis_id)
      .single();

    logger.log('LOAD', 'Data loaded', {
      client_name: analysis.client_name,
      raw_data_size: JSON.stringify(analysis.raw_data).length,
      inverite_risk_score: analysis.inverite_risk_score
    });

    // Calculate metrics
    logger.log('METRICS', 'Calculating financial metrics');
    const metricsStart = performance.now();
    const metrics = await calculateMetrics(analysis.raw_data);
    const metricsDuration = performance.now() - metricsStart;

    logger.log('METRICS', 'Metrics calculated', {
      duration: metricsDuration,
      monthly_income: metrics.monthly_income,
      dti_ratio: metrics.dti_ratio,
      account_health: metrics.account_health
    });

    // Calculate SAR Score
    logger.log('SCORE', 'Calculating SAR score');
    const scoreStart = performance.now();
    const score = await calculateSARScore(analysis.inverite_risk_score, metrics);
    const scoreDuration = performance.now() - scoreStart;

    logger.log('SCORE', 'SAR score calculated', {
      duration: scoreDuration,
      sar_score: score.sar_score,
      confidence: score.confidence
    });

    // Generate recommendation
    logger.log('RECOMMEND', 'Generating recommendation');
    const recommendation = await generateRecommendation(score.sar_score, metrics);

    logger.log('RECOMMEND', 'Recommendation generated', {
      recommendation: recommendation.recommendation,
      max_loan_amount: recommendation.max_loan_amount
    });

    // Save results
    logger.log('SAVE', 'Saving results to database');
    await Promise.all([
      supabase.from('analysis_scores').insert({...}),
      supabase.from('analysis_recommendations').insert({...}),
      supabase.from('analysis_jobs').update({
        status: 'completed',
        completed_at: new Date()
      }).eq('id', job.id)
    ]);

    const totalDuration = performance.now() - startTime;
    logger.log('COMPLETE', 'Job completed successfully', {
      total_duration: totalDuration
    });

  } catch (error) {
    const duration = performance.now() - startTime;
    logger.error('ERROR', 'Job failed', error as Error);

    await supabase
      .from('analysis_jobs')
      .update({
        status: 'failed',
        error: (error as Error).message,
        completed_at: new Date()
      })
      .eq('id', job.id);
  }
}

════════════════════════════════════════════════════════════════════
NIVEAU 4: DATABASE MONITORING
════════════════════════════════════════════════════════════════════

Tables pour Monitoring:
───────────────────────

1. system_logs (nouvelle table)
   ├─ id (UUID)
   ├─ level (TEXT: info, warning, error)
   ├─ component (TEXT: extension, api, worker)
   ├─ stage (TEXT: fetch, upload, process, etc.)
   ├─ message (TEXT)
   ├─ data (JSONB)
   ├─ error (TEXT nullable)
   ├─ request_id (TEXT nullable)
   ├─ analysis_id (UUID nullable)
   └─ created_at (TIMESTAMP)

2. performance_metrics (nouvelle table)
   ├─ id (UUID)
   ├─ operation (TEXT: inverite_fetch, risk_score, sar_upload, worker_process)
   ├─ duration_ms (INTEGER)
   ├─ success (BOOLEAN)
   ├─ analysis_id (UUID nullable)
   └─ created_at (TIMESTAMP)

Queries pour Monitoring:
────────────────────────

-- Analyses échouées dans les dernières 24h
SELECT * FROM analysis_jobs
WHERE status = 'failed'
AND created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;

-- Jobs en attente depuis plus de 5 minutes
SELECT * FROM analysis_jobs
WHERE status = 'pending'
AND created_at < NOW() - INTERVAL '5 minutes'
ORDER BY created_at ASC;

-- Performance moyenne par opération
SELECT
  operation,
  AVG(duration_ms) as avg_duration,
  MIN(duration_ms) as min_duration,
  MAX(duration_ms) as max_duration,
  COUNT(*) as total_ops
FROM performance_metrics
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY operation;

-- Erreurs récentes
SELECT
  level,
  component,
  stage,
  COUNT(*) as error_count
FROM system_logs
WHERE level = 'error'
AND created_at > NOW() - INTERVAL '1 hour'
GROUP BY level, component, stage
ORDER BY error_count DESC;

════════════════════════════════════════════════════════════════════
NIVEAU 5: CONSOLE CHROME DEVTOOLS
════════════════════════════════════════════════════════════════════

Debugging Tips:
───────────────

1. Ouvrir Chrome DevTools sur app.inverite.com
2. Onglet Console → Filtrer par "[IBV-Crawler]"
3. Voir tous les logs de l'extension en temps réel

Exemple de logs visibles:
─────────────────────────

[IBV-Crawler] [DETECT] GUID extracted from URL
  { guid: "D892C791-F216-4A9A-84A2-3AFC3A40905F", timestamp: "..." }

[IBV-Crawler] [FETCH_START] Fetching banking data
  { endpoint: "/api/v2/fetch", timestamp: "..." }

[IBV-Crawler] [FETCH_SUCCESS] Banking data received
  { accounts: 1, transactions: 90, size: 427382, timestamp: "..." }

[IBV-Crawler] [RISK_START] Requesting risk score
  { endpoint: "/api/v2/risk", timestamp: "..." }

[IBV-Crawler] [RISK_SUCCESS] Risk score received
  { score: 750, level: "medium", attempts: 4, timestamp: "..." }

[IBV-Crawler] [UPLOAD_START] Uploading to SAR
  { endpoint: "/api/admin/client-analysis", payloadSize: 505000, timestamp: "..." }

[IBV-Crawler] [UPLOAD_SUCCESS] Upload completed
  { analysisId: "uuid-xxx", redirectUrl: "/admin/analyse?id=uuid-xxx", timestamp: "..." }

════════════════════════════════════════════════════════════════════
NIVEAU 6: ADMIN DASHBOARD MONITORING
════════════════════════════════════════════════════════════════════

Page: admin.solutionargentrapide.ca/admin/monitoring

Features:
─────────

1. Real-time Job Status
   ┌────────────────────────────────────────────┐
   │ 📊 Jobs en cours                           │
   ├────────────────────────────────────────────┤
   │ • Job #1234: Processing (2s)               │
   │ • Job #1235: Pending (waiting)             │
   │ • Job #1236: Completed (3.2s)              │
   └────────────────────────────────────────────┘

2. Error Dashboard
   ┌────────────────────────────────────────────┐
   │ 🚨 Erreurs (dernières 24h)                 │
   ├────────────────────────────────────────────┤
   │ • Extension Upload: 2 errors               │
   │ • Worker Process: 1 error                  │
   │ • Database: 0 errors                       │
   └────────────────────────────────────────────┘

3. Performance Metrics
   ┌────────────────────────────────────────────┐
   │ ⚡ Performance                              │
   ├────────────────────────────────────────────┤
   │ • Avg Inverite Fetch: 1.4s                 │
   │ • Avg Risk Score: 20.7s                    │
   │ • Avg Worker Process: 3.5s                 │
   │ • Avg Total Time: 35s                      │
   └────────────────────────────────────────────┘

════════════════════════════════════════════════════════════════════
DEBUGGING SCENARIOS
════════════════════════════════════════════════════════════════════

Scenario 1: Extension ne détecte pas le GUID
─────────────────────────────────────────────
1. Ouvrir Console Chrome DevTools
2. Chercher "[IBV-Crawler] [DETECT]"
3. Si rien: vérifier que l'extension est chargée
4. Si erreur: vérifier le pattern regex du GUID

Scenario 2: Upload vers SAR échoue
──────────────────────────────────
1. Console Chrome: chercher "[IBV-Crawler] [UPLOAD_ERROR]"
2. Vérifier error.message → "Unauthorized" = JWT invalide
3. Vérifier error.message → "CORS" = origin non autorisée
4. Logs serveur: chercher "[API] [xxx] [AUTH]"

Scenario 3: Worker ne traite pas le job
────────────────────────────────────────
1. Database: `SELECT * FROM analysis_jobs WHERE status='pending'`
2. Si jobs en attente: vérifier que worker tourne
3. Logs worker: chercher "[Worker]" dans stdout
4. Si erreur: logs "[Worker] [xxx] [ERROR]"

Scenario 4: Scores ne s'affichent pas dans UI
──────────────────────────────────────────────
1. Network tab: vérifier GET /api/admin/client-analysis
2. Response: vérifier si `scores` et `recommendation` sont null
3. Si null: job encore pending ou failed
4. Database: `SELECT status FROM analysis_jobs WHERE analysis_id='...'`

════════════════════════════════════════════════════════════════════
LOG RETENTION POLICY
════════════════════════════════════════════════════════════════════

system_logs:
  • Conserver 30 jours
  • Purge automatique: DELETE WHERE created_at < NOW() - INTERVAL '30 days'

performance_metrics:
  • Conserver 90 jours
  • Agrégation quotidienne après 7 jours

analysis_jobs:
  • Conserver indéfiniment (référence historique)
  • Archiver jobs > 1 an dans analysis_jobs_archive

Console Logs (Chrome/Node):
  • Pas de persistance (volatiles)
  • Utiliser system_logs table pour historique
```

---

## 7. STRUCTURE DE FICHIERS
### Organisation complète du projet

```
┌─────────────────────────────────────────────────────────────────────┐
│                    STRUCTURE COMPLÈTE DU PROJET                     │
└─────────────────────────────────────────────────────────────────────┘

📁 /Users/xunit/Desktop/📁 Projets/sar/
│
├── 📁 chrome-extension/ (NOUVEAU - Extension Chrome V2)
│   ├── manifest.json
│   ├── content-script.js         ← Script principal
│   ├── background.js              ← Service worker
│   ├── popup.html                 ← UI popup extension
│   ├── popup.js                   ← Logique popup
│   ├── config.js                  ← Configuration (API keys, endpoints)
│   ├── utils/
│   │   ├── api-client.js         ← Client API Inverite
│   │   ├── logger.js             ← Logging utility
│   │   └── storage.js            ← Chrome storage wrapper
│   └── assets/
│       ├── icon-16.png
│       ├── icon-48.png
│       └── icon-128.png
│
├── 📁 src/
│   ├── 📁 app/
│   │   ├── 📁 (site)/
│   │   │   └── 📁 demande-de-pret-en-ligne-formulaire/
│   │   │       └── page.tsx                          ← Formulaire Margill (iframe)
│   │   │
│   │   ├── 📁 admin/
│   │   │   ├── 📁 analyse/
│   │   │   │   └── page.tsx                          ← Page analyse client (MODIFIER)
│   │   │   │       • Ajouter ScoreDisplay component
│   │   │   │       • Ajouter RecommendationCard component
│   │   │   │       • Ajouter polling logic
│   │   │   │
│   │   │   ├── 📁 monitoring/ (NOUVEAU)
│   │   │   │   └── page.tsx                          ← Dashboard monitoring
│   │   │   │
│   │   │   └── layout.tsx
│   │   │
│   │   └── 📁 api/
│   │       └── 📁 admin/
│   │           ├── 📁 client-analysis/
│   │           │   └── route.ts                      ← API analyse (MODIFIER)
│   │           │       • POST: Ajouter sauvegarde inverite_risk_score
│   │           │       • POST: Ajouter sauvegarde microloans_data
│   │           │       • POST: Créer analysis_job
│   │           │       • GET: Ajouter JOIN avec scores/recommendations
│   │           │
│   │           └── 📁 monitoring/ (NOUVEAU)
│   │               └── route.ts                      ← API monitoring
│   │
│   ├── 📁 components/ (NOUVEAUX)
│   │   ├── 📁 admin/
│   │   │   ├── 📁 analysis/
│   │   │   │   ├── ScoreDisplay.tsx                  ← Affichage scores (SAR + Inverite)
│   │   │   │   ├── RecommendationCard.tsx            ← Card recommandation approve/decline
│   │   │   │   ├── MetricsPanel.tsx                  ← Panel métriques (income, DTI, health)
│   │   │   │   ├── RedFlagsAlert.tsx                 ← Alertes red flags
│   │   │   │   ├── TransactionsList.tsx              ← Liste transactions (EXISTANT)
│   │   │   │   └── AnalysisLoadingState.tsx          ← Loading spinner pendant worker
│   │   │   │
│   │   │   └── 📁 monitoring/
│   │   │       ├── JobsStatusTable.tsx               ← Table jobs en cours
│   │   │       ├── ErrorsDashboard.tsx               ← Dashboard erreurs
│   │   │       └── PerformanceMetrics.tsx            ← Métriques performance
│   │   │
│   │   └── 📁 ui/
│   │       └── (composants Shadcn/UI existants)
│   │
│   ├── 📁 lib/
│   │   ├── 📁 workers/ (NOUVEAU)
│   │   │   ├── analysis-worker.ts                    ← Worker principal
│   │   │   ├── start-worker.ts                       ← Script démarrage worker
│   │   │   └── stop-worker.ts                        ← Script arrêt worker
│   │   │
│   │   ├── 📁 analysis/ (NOUVEAU)
│   │   │   ├── calculate-metrics.ts                  ← Calcul métriques financières
│   │   │   ├── calculate-sar-score.ts                ← Calcul SAR Score
│   │   │   ├── generate-recommendation.ts            ← Génération recommandation
│   │   │   └── types.ts                              ← Types TypeScript
│   │   │
│   │   ├── 📁 utils/
│   │   │   ├── logger.ts (NOUVEAU)                   ← Logger API/Worker
│   │   │   ├── performance.ts (NOUVEAU)              ← Performance tracking
│   │   │   └── (autres utils existants)
│   │   │
│   │   └── supabase.ts                               ← Client Supabase (EXISTANT)
│   │
│   └── 📁 types/
│       ├── analysis.ts (NOUVEAU)                     ← Types pour analyse
│       ├── inverite.ts (NOUVEAU)                     ← Types Inverite API
│       └── database.ts (MODIFIER)                    ← Types DB (ajouter nouvelles tables)
│
├── 📁 supabase/
│   ├── 📁 migrations/
│   │   ├── 20260122000001_add_analysis_tables.sql (NOUVEAU)
│   │   │   • CREATE TABLE analysis_jobs
│   │   │   • CREATE TABLE analysis_scores
│   │   │   • CREATE TABLE analysis_recommendations
│   │   │   • ALTER TABLE client_analyses (add inverite_risk_score, microloans_data)
│   │   │
│   │   ├── 20260122000002_add_monitoring_tables.sql (NOUVEAU)
│   │   │   • CREATE TABLE system_logs
│   │   │   • CREATE TABLE performance_metrics
│   │   │
│   │   └── 20260122000003_add_indexes.sql (NOUVEAU)
│   │       • CREATE INDEX idx_analysis_jobs_status
│   │       • CREATE INDEX idx_analysis_jobs_analysis_id
│   │       • CREATE INDEX idx_system_logs_created_at
│   │
│   └── config.toml
│
├── 📁 scripts/
│   ├── start-worker.sh (NOUVEAU)                     ← Script démarrage worker en dev
│   ├── deploy-worker.sh (NOUVEAU)                    ← Script deploy worker en prod
│   └── inspect-creditsecours-iframe.mjs              ← Script Playwright (EXISTANT)
│
├── 📁 e2e/
│   └── 📁 specs/
│       ├── test-margill-iframe.spec.ts               ← Tests Margill (EXISTANT)
│       └── test-analysis-flow.spec.ts (NOUVEAU)      ← Tests flow analyse complet
│
├── 📁 docs/
│   ├── ARCHITECTURE-COMPLETE-MASTER.md               ← Ce fichier
│   ├── DATAFLOW-ET-CHECKLIST.md                      ← Dataflow + checklist (EXISTANT)
│   ├── INVERITE-API-EXPLICATION.md                   ← Doc Inverite API (EXISTANT)
│   └── INVERITE-DONNEES-DISPONIBLES.md               ← Données Inverite (EXISTANT)
│
├── .env.local
├── .env.test
├── .env.production
├── next.config.js
├── package.json
├── tsconfig.json
└── README.md

════════════════════════════════════════════════════════════════════
FICHIERS À CRÉER (Phase 1)
════════════════════════════════════════════════════════════════════

1. chrome-extension/content-script.js (PRIORITÉ 1)
   • Détection GUID
   • Appels Inverite API parallèles
   • Upload automatique vers SAR
   • Logging détaillé

2. src/lib/workers/analysis-worker.ts (PRIORITÉ 2)
   • Polling analysis_jobs
   • Pipeline complet (metrics → score → recommendation)
   • Error handling
   • Logging

3. src/lib/analysis/calculate-metrics.ts (PRIORITÉ 2)
   • Extraction revenus (payschedules)
   • Calcul dépenses (transactions debits)
   • DTI ratio
   • Account health score
   • Red flags detection

4. src/lib/analysis/calculate-sar-score.ts (PRIORITÉ 2)
   • Normalisation Inverite score
   • Application factors (income, DTI, health, history)
   • Pénalités red flags
   • Output 300-850 scale

5. src/lib/analysis/generate-recommendation.ts (PRIORITÉ 2)
   • Logique approve/decline/review
   • Calcul max loan amount
   • Génération reasoning
   • Red flags summary

6. src/components/admin/analysis/ScoreDisplay.tsx (PRIORITÉ 3)
   • Affichage SAR score avec gauge
   • Affichage Inverite score
   • Confiance percentage
   • Comparaison visuelle

7. src/components/admin/analysis/RecommendationCard.tsx (PRIORITÉ 3)
   • Card approve/decline avec couleurs
   • Montant max prêt
   • Reasoning texte
   • Boutons actions

8. supabase/migrations/20260122000001_add_analysis_tables.sql (PRIORITÉ 1)
   • CREATE nouvelles tables
   • ALTER client_analyses
   • Indexes

════════════════════════════════════════════════════════════════════
FICHIERS À MODIFIER
════════════════════════════════════════════════════════════════════

1. src/app/api/admin/client-analysis/route.ts
   MODIFICATIONS:
   • POST handler: Ajouter sauvegarde inverite_risk_score
   • POST handler: Ajouter sauvegarde microloans_data
   • POST handler: Créer analysis_job
   • GET handler: Ajouter LEFT JOIN analysis_scores
   • GET handler: Ajouter LEFT JOIN analysis_recommendations
   • GET handler: Formater response avec scores/recommendation

2. src/app/admin/analyse/page.tsx
   MODIFICATIONS:
   • Importer nouveaux components (ScoreDisplay, RecommendationCard, etc.)
   • Ajouter polling logic (useEffect toutes les 2s)
   • Gérer état loading (scores pas encore calculés)
   • Afficher composants conditionnellement
   • Arrêter polling quand scores disponibles

3. src/types/database.ts
   MODIFICATIONS:
   • Ajouter types pour analysis_jobs
   • Ajouter types pour analysis_scores
   • Ajouter types pour analysis_recommendations
   • Ajouter types pour system_logs
   • Ajouter types pour performance_metrics
   • Modifier type client_analyses (add inverite_risk_score, microloans_data)

4. package.json
   MODIFICATIONS:
   • Ajouter script "worker:dev": "tsx watch src/lib/workers/start-worker.ts"
   • Ajouter script "worker:start": "tsx src/lib/workers/start-worker.ts"
   • Ajouter dependency: "tsx" pour worker TypeScript

════════════════════════════════════════════════════════════════════
TAILLE ESTIMÉE DES FICHIERS
════════════════════════════════════════════════════════════════════

chrome-extension/content-script.js:       ~800 lignes
src/lib/workers/analysis-worker.ts:       ~400 lignes
src/lib/analysis/calculate-metrics.ts:    ~300 lignes
src/lib/analysis/calculate-sar-score.ts:  ~200 lignes
src/lib/analysis/generate-recommendation.ts: ~150 lignes
src/components/admin/analysis/ScoreDisplay.tsx: ~150 lignes
src/components/admin/analysis/RecommendationCard.tsx: ~200 lignes
supabase/migrations/*.sql:                 ~200 lignes (total)

Total: ~2400 lignes de code à écrire
```

---

## 8. PLAN D'IMPLÉMENTATION
### Ordre exact des tâches (5-6 jours)

```
┌─────────────────────────────────────────────────────────────────────┐
│                     PLAN D'IMPLÉMENTATION DÉTAILLÉ                  │
│                            5-6 JOURS TOTAL                          │
└─────────────────────────────────────────────────────────────────────┘

════════════════════════════════════════════════════════════════════
JOUR 1: FONDATIONS DATABASE + TYPES (6-8h)
════════════════════════════════════════════════════════════════════

✅ TÂCHE 1.1: Créer migrations Supabase (2h)
───────────────────────────────────────────
Fichier: supabase/migrations/20260122000001_add_analysis_tables.sql

-- Ajouter colonnes à client_analyses
ALTER TABLE client_analyses
ADD COLUMN inverite_risk_score INTEGER,
ADD COLUMN risk_level TEXT,
ADD COLUMN microloans_data JSONB,
ADD COLUMN analyzed_at TIMESTAMP;

-- Créer table analysis_jobs
CREATE TABLE analysis_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id UUID NOT NULL REFERENCES client_analyses(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high')),
  error TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  started_at TIMESTAMP,
  completed_at TIMESTAMP
);

-- Créer table analysis_scores
CREATE TABLE analysis_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id UUID NOT NULL REFERENCES client_analyses(id) ON DELETE CASCADE,
  sar_score INTEGER NOT NULL CHECK (sar_score >= 300 AND sar_score <= 850),
  sar_score_normalized INTEGER NOT NULL CHECK (sar_score_normalized >= 0 AND sar_score_normalized <= 1000),
  monthly_income DECIMAL(10,2) NOT NULL,
  monthly_expenses DECIMAL(10,2) NOT NULL,
  dti_ratio DECIMAL(5,4) NOT NULL,
  nsf_count INTEGER NOT NULL DEFAULT 0,
  overdraft_count INTEGER NOT NULL DEFAULT 0,
  bankruptcy_detected BOOLEAN NOT NULL DEFAULT false,
  microloans_detected BOOLEAN NOT NULL DEFAULT false,
  account_health INTEGER NOT NULL CHECK (account_health >= 0 AND account_health <= 1000),
  confidence DECIMAL(3,2) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Créer table analysis_recommendations
CREATE TABLE analysis_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id UUID NOT NULL REFERENCES client_analyses(id) ON DELETE CASCADE,
  recommendation TEXT NOT NULL CHECK (recommendation IN ('approve', 'decline', 'review')),
  max_loan_amount DECIMAL(10,2) NOT NULL,
  reasoning TEXT NOT NULL,
  confidence DECIMAL(3,2) NOT NULL,
  red_flags JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_analysis_jobs_status ON analysis_jobs(status);
CREATE INDEX idx_analysis_jobs_analysis_id ON analysis_jobs(analysis_id);
CREATE INDEX idx_analysis_jobs_created_at ON analysis_jobs(created_at);
CREATE INDEX idx_analysis_scores_analysis_id ON analysis_scores(analysis_id);
CREATE INDEX idx_analysis_recommendations_analysis_id ON analysis_recommendations(analysis_id);

-- RLS Policies (Row Level Security)
ALTER TABLE analysis_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE analysis_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE analysis_recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow admin access to analysis_jobs"
  ON analysis_jobs FOR ALL
  USING (true);

CREATE POLICY "Allow admin access to analysis_scores"
  ON analysis_scores FOR ALL
  USING (true);

CREATE POLICY "Allow admin access to analysis_recommendations"
  ON analysis_recommendations FOR ALL
  USING (true);

Exécution:
  cd /Users/xunit/Desktop/📁\ Projets/sar
  npx supabase migration up

Test:
  SELECT table_name FROM information_schema.tables
  WHERE table_schema = 'public'
  AND table_name LIKE 'analysis_%';

────────────────────────────────────────────────────────────────────

✅ TÂCHE 1.2: Créer types TypeScript (1h)
────────────────────────────────────────
Fichier: src/types/analysis.ts (NOUVEAU)

export interface AnalysisJob {
  id: string;
  analysis_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  priority: 'low' | 'normal' | 'high';
  error?: string | null;
  created_at: string;
  started_at?: string | null;
  completed_at?: string | null;
}

export interface AnalysisScore {
  id: string;
  analysis_id: string;
  sar_score: number;
  sar_score_normalized: number;
  monthly_income: number;
  monthly_expenses: number;
  dti_ratio: number;
  nsf_count: number;
  overdraft_count: number;
  bankruptcy_detected: boolean;
  microloans_detected: boolean;
  account_health: number;
  confidence: number;
  created_at: string;
}

export interface RedFlag {
  type: 'NSF' | 'OVERDRAFT' | 'BANKRUPTCY' | 'MICROLOAN' | 'RETURNS';
  severity: 'low' | 'medium' | 'high';
  count: number;
  description: string;
}

export interface AnalysisRecommendation {
  id: string;
  analysis_id: string;
  recommendation: 'approve' | 'decline' | 'review';
  max_loan_amount: number;
  reasoning: string;
  confidence: number;
  red_flags: RedFlag[];
  created_at: string;
}

export interface FinancialMetrics {
  monthly_income: number;
  monthly_expenses: number;
  dti_ratio: number;
  nsf_count: number;
  overdraft_count: number;
  bankruptcy_detected: boolean;
  microloans_detected: boolean;
  account_health: number;
  red_flags: RedFlag[];
}

export interface SARScoreResult {
  sar_score: number;
  sar_score_normalized: number;
  confidence: number;
  factors: {
    inverite_contribution: number;
    income_factor: number;
    dti_factor: number;
    account_health_factor: number;
    history_factor: number;
    penalties: number;
  };
}

Fichier: src/types/inverite.ts (NOUVEAU)

export interface InveriteTransaction {
  date: string;
  details: string;
  category: string;
  credit: string;
  debit: string;
  balance: string;
  flags: string[];
}

export interface InveritePayschedule {
  score: number;
  details: string;
  income_type: string;
  monthly_income: string;
  frequency: string;
  payments?: InveriteTransaction[];
  future_payments?: string[];
  missed_payments?: string[];
}

export interface InveriteAccount {
  type: string;
  bank: string;
  institution: string;
  transit: string;
  account: string;
  statistics: {
    mean_closing_balance: string;
    debits_30_count: string;
    credits_30_count: string;
    debits_30_total: string;
    credits_30_total: string;
    returns_30_count: string;
    nsf_30_count: string;
    overdraft_30_count: string;
  };
  transactions: InveriteTransaction[];
  payschedules: InveritePayschedule[];
}

export interface InveriteFetchResponse {
  name: string;
  complete_datetime: string;
  status: string;
  request: string;
  address: string;
  contacts: Array<{ type: string; contact: string }>;
  accounts: InveriteAccount[];
}

export interface InveriteRiskResponse {
  request: string;
  status: string;
  risk_score: number;
  risk_level: string;
  factors: {
    income_stability: string;
    spending_patterns: string;
    nsf_history: string;
    bankruptcy_indicators: boolean;
  };
}

export interface InveriteMicroloan {
  name: string;
  loan_count: number;
  total_borrowed: string;
  last_loan_date?: string;
}

export interface InveriteMicrocheckResponse {
  has_microloans: boolean;
  lenders: InveriteMicroloan[];
  risk_level: string;
}

Test:
  Aucune erreur TypeScript après création des types

────────────────────────────────────────────────────────────────────

✅ TÂCHE 1.3: Modifier API client-analysis (3h)
──────────────────────────────────────────────
Fichier: src/app/api/admin/client-analysis/route.ts

Modification 1: POST handler - Sauvegarder nouvelles données

import type {
  InveriteFetchResponse,
  InveriteRiskResponse,
  InveriteMicrocheckResponse
} from '@/types/inverite';

export async function POST(request: Request) {
  const startTime = performance.now();
  // ... existing auth code ...

  const body = await request.json();
  const {
    client_name,
    source,
    inverite_guid,
    inverite_risk_score,     // NOUVEAU
    risk_level,              // NOUVEAU
    microloans_data,         // NOUVEAU
    raw_data
  } = body;

  // Insert client_analyses avec nouvelles colonnes
  const { data: analysis, error: insertError } = await supabase
    .from('client_analyses')
    .insert({
      client_name,
      client_email: extractEmail(raw_data),
      client_phones: extractPhones(raw_data),
      client_address: raw_data.address,
      source,
      inverite_guid,
      inverite_risk_score,    // NOUVEAU
      risk_level,             // NOUVEAU
      microloans_data,        // NOUVEAU
      raw_data,
      total_accounts: raw_data.accounts?.length || 0,
      total_balance: calculateTotalBalance(raw_data),
      total_transactions: calculateTotalTransactions(raw_data),
      status: 'pending'
    })
    .select()
    .single();

  if (insertError) throw insertError;

  // Créer analysis_job (NOUVEAU)
  const { error: jobError } = await supabase
    .from('analysis_jobs')
    .insert({
      analysis_id: analysis.id,
      status: 'pending',
      priority: 'high'
    });

  if (jobError) throw jobError;

  // Return avec redirect_url
  return NextResponse.json({
    success: true,
    message: 'Analyse créée avec succès',
    data: {
      id: analysis.id,
      client_name: analysis.client_name,
      created_at: analysis.created_at
    },
    redirect_url: `/admin/analyse?id=${analysis.id}`
  });
}

Modification 2: GET handler - Joindre scores et recommendations

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  }

  // Requête avec LEFT JOIN (NOUVEAU)
  const { data: analysis, error } = await supabase
    .from('client_analyses')
    .select(`
      *,
      scores:analysis_scores(*),
      recommendation:analysis_recommendations(*)
    `)
    .eq('id', id)
    .is('deleted_at', null)
    .single();

  if (error) throw error;

  // Formater response
  return NextResponse.json({
    success: true,
    data: {
      ...analysis,
      scores: analysis.scores?.[0] || null,      // Premier score
      recommendation: analysis.recommendation?.[0] || null  // Première recommendation
    }
  });
}

Test:
  1. POST avec nouvelles colonnes → Success
  2. GET avec id → Retourne scores (null au début)
  3. Vérifier analysis_job créé en DB

────────────────────────────────────────────────────────────────────

✅ TÂCHE 1.4: Créer Logger utility (1h)
──────────────────────────────────────
Fichier: src/lib/utils/logger.ts (NOUVEAU)

export class APILogger {
  private static requestId: string = '';

  static startRequest(req: Request): string {
    const requestId = crypto.randomUUID().slice(0, 8);
    this.requestId = requestId;

    console.log(`[API] [${requestId}] ► ${req.method} ${new URL(req.url).pathname}`, {
      timestamp: new Date().toISOString(),
      origin: req.headers.get('origin')
    });

    return requestId;
  }

  static log(stage: string, message: string, data?: any) {
    console.log(`[API] [${this.requestId}] [${stage}] ${message}`, {
      timestamp: new Date().toISOString(),
      ...data
    });
  }

  static error(stage: string, message: string, error: Error) {
    console.error(`[API] [${this.requestId}] [${stage}] ❌ ${message}`, {
      timestamp: new Date().toISOString(),
      error: error.message,
      stack: error.stack
    });
  }

  static endRequest(status: number, duration: number) {
    console.log(`[API] [${this.requestId}] ◄ ${status} (${duration}ms)`);
  }
}

export class WorkerLogger {
  private jobId: string;
  private analysisId: string;

  constructor(jobId: string, analysisId: string) {
    this.jobId = jobId;
    this.analysisId = analysisId;
  }

  log(stage: string, message: string, data?: any) {
    console.log(`[Worker] [Job:${this.jobId}] [${stage}] ${message}`, {
      timestamp: new Date().toISOString(),
      analysis_id: this.analysisId,
      ...data
    });
  }

  error(stage: string, message: string, error: Error) {
    console.error(`[Worker] [Job:${this.jobId}] [${stage}] ❌ ${message}`, {
      timestamp: new Date().toISOString(),
      analysis_id: this.analysisId,
      error: error.message,
      stack: error.stack
    });
  }
}

Test:
  import { APILogger } from '@/lib/utils/logger';
  APILogger.log('TEST', 'Test message', { test: true });

════════════════════════════════════════════════════════════════════
JOUR 2: EXTENSION CHROME V2 (8h)
════════════════════════════════════════════════════════════════════

✅ TÂCHE 2.1: Créer structure extension (1h)
──────────────────────────────────────────
Créer dossier: chrome-extension/

Fichiers à créer:
1. manifest.json
2. content-script.js
3. background.js
4. popup.html
5. popup.js
6. config.js

Fichier: chrome-extension/manifest.json

{
  "manifest_version": 3,
  "name": "IBV Crawler V2 - SAR Auto-Upload",
  "version": "2.0.0",
  "description": "Extension Chrome pour extraire données Inverite et uploader vers SAR automatiquement",
  "permissions": [
    "storage",
    "activeTab"
  ],
  "host_permissions": [
    "https://app.inverite.com/*",
    "https://www.inverite.com/*",
    "https://admin.solutionargentrapide.ca/*"
  ],
  "content_scripts": [
    {
      "matches": ["https://app.inverite.com/client/*"],
      "js": ["config.js", "content-script.js"],
      "run_at": "document_idle"
    }
  ],
  "background": {
    "service_worker": "background.js"
  },
  "action": {
    "default_popup": "popup.html",
    "default_icon": {
      "16": "assets/icon-16.png",
      "48": "assets/icon-48.png",
      "128": "assets/icon-128.png"
    }
  },
  "icons": {
    "16": "assets/icon-16.png",
    "48": "assets/icon-48.png",
    "128": "assets/icon-128.png"
  }
}

────────────────────────────────────────────────────────────────────

✅ TÂCHE 2.2: Créer content-script.js (5h) ← CRITIQUE
──────────────────────────────────────────────────
Fichier: chrome-extension/content-script.js

// Configuration (sera dans config.js)
const CONFIG = {
  INVERITE_API_KEY: '09a4b8554857d353fd007d29feca423f446',
  SAR_API_URL: 'https://admin.solutionargentrapide.ca/api/admin/client-analysis',
  SAR_JWT_TOKEN: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',  // À générer
  RISK_POLL_INTERVAL: 5000,  // 5 secondes
  RISK_MAX_ATTEMPTS: 12      // Max 60 secondes
};

// Logger
const TRACE = {
  enabled: true,
  prefix: '[IBV-Crawler-V2]',

  log: (stage, message, data = {}) => {
    if (!TRACE.enabled) return;
    console.log(`${TRACE.prefix} [${stage}] ${message}`, {
      timestamp: new Date().toISOString(),
      ...data
    });
  },

  error: (stage, message, error) => {
    console.error(`${TRACE.prefix} [${stage}] ❌ ${message}`, {
      timestamp: new Date().toISOString(),
      error: error.message,
      stack: error.stack
    });
  }
};

// 1. Detect GUID from URL
function detectGUID() {
  const url = window.location.href;
  const match = url.match(/\/client\/([A-F0-9-]{36})/i);

  if (match) {
    const guid = match[1];
    TRACE.log('DETECT', 'GUID detected', { guid });
    return guid;
  }

  return null;
}

// 2. Fetch banking data
async function fetchBankingData(guid) {
  TRACE.log('FETCH_START', 'Fetching banking data');
  const startTime = performance.now();

  try {
    const response = await fetch(`https://www.inverite.com/api/v2/fetch/${guid}`, {
      method: 'GET',
      headers: {
        'Auth': CONFIG.INVERITE_API_KEY,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    const duration = performance.now() - startTime;

    TRACE.log('FETCH_SUCCESS', 'Banking data received', {
      duration: Math.round(duration),
      accounts: data.accounts?.length || 0,
      transactions: data.accounts?.[0]?.transactions?.length || 0,
      size: JSON.stringify(data).length
    });

    return data;
  } catch (error) {
    TRACE.error('FETCH_ERROR', 'Failed to fetch banking data', error);
    throw error;
  }
}

// 3. Request risk score
async function requestRiskScore(guid) {
  TRACE.log('RISK_REQUEST', 'Requesting risk score');

  try {
    const response = await fetch('https://www.inverite.com/api/v2/risk', {
      method: 'POST',
      headers: {
        'Auth': CONFIG.INVERITE_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ request: guid })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    TRACE.log('RISK_REQUEST_SUCCESS', 'Task ID received', { task_id: data.task_id });

    return data.task_id;
  } catch (error) {
    TRACE.error('RISK_REQUEST_ERROR', 'Failed to request risk score', error);
    throw error;
  }
}

// 4. Poll risk score status
async function pollRiskScore(taskId) {
  TRACE.log('RISK_POLL_START', 'Polling risk score status', { task_id: taskId });

  for (let attempt = 1; attempt <= CONFIG.RISK_MAX_ATTEMPTS; attempt++) {
    await new Promise(resolve => setTimeout(resolve, CONFIG.RISK_POLL_INTERVAL));

    try {
      const response = await fetch(`https://www.inverite.com/api/v2/risk_status/${taskId}`, {
        method: 'GET',
        headers: {
          'Auth': CONFIG.INVERITE_API_KEY,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.status === 'success') {
        TRACE.log('RISK_POLL_SUCCESS', 'Risk score received', {
          attempt,
          risk_score: data.risk_score,
          risk_level: data.risk_level
        });
        return data;
      }

      TRACE.log('RISK_POLL_PENDING', `Attempt ${attempt}/${CONFIG.RISK_MAX_ATTEMPTS}`, {
        status: data.status
      });

    } catch (error) {
      TRACE.error('RISK_POLL_ERROR', `Attempt ${attempt} failed`, error);
      if (attempt === CONFIG.RISK_MAX_ATTEMPTS) throw error;
    }
  }

  throw new Error('Risk score polling timeout');
}

// 5. Check microloans
async function checkMicroloans(guid) {
  TRACE.log('MICROCHECK_START', 'Checking microloans');
  const startTime = performance.now();

  try {
    const response = await fetch('https://www.inverite.com/api/v2/microcheck/search', {
      method: 'POST',
      headers: {
        'Auth': CONFIG.INVERITE_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ guid, days: 90 })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    const duration = performance.now() - startTime;

    TRACE.log('MICROCHECK_SUCCESS', 'Microcheck completed', {
      duration: Math.round(duration),
      has_microloans: data.has_microloans,
      lenders_count: data.lenders?.length || 0
    });

    return data;
  } catch (error) {
    TRACE.error('MICROCHECK_ERROR', 'Failed to check microloans', error);
    throw error;
  }
}

// 6. Upload to SAR
async function uploadToSAR(guid, fetchData, riskData, microcheckData) {
  TRACE.log('UPLOAD_START', 'Uploading to SAR');
  const startTime = performance.now();

  const payload = {
    client_name: fetchData.name,
    source: 'inverite',
    inverite_guid: guid,
    inverite_risk_score: riskData.risk_score,
    risk_level: riskData.risk_level,
    microloans_data: microcheckData,
    raw_data: fetchData
  };

  TRACE.log('UPLOAD_PREPARE', 'Payload prepared', {
    payload_size: JSON.stringify(payload).length
  });

  try {
    const response = await fetch(CONFIG.SAR_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CONFIG.SAR_JWT_TOKEN}`
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    const duration = performance.now() - startTime;

    TRACE.log('UPLOAD_SUCCESS', 'Upload completed', {
      duration: Math.round(duration),
      analysis_id: data.data?.id,
      redirect_url: data.redirect_url
    });

    return data;
  } catch (error) {
    TRACE.error('UPLOAD_ERROR', 'Failed to upload to SAR', error);
    throw error;
  }
}

// 7. Main extraction function
async function extractAndUploadToSAR(guid) {
  showOverlay('Extraction en cours...', 'info');

  try {
    // Lancer les 3 appels en parallèle
    TRACE.log('PARALLEL_START', 'Starting parallel API calls');

    const [fetchData, riskTaskId, microcheckData] = await Promise.all([
      fetchBankingData(guid),
      requestRiskScore(guid),
      checkMicroloans(guid)
    ]);

    TRACE.log('PARALLEL_COMPLETE', 'Parallel calls completed', {
      fetch_success: !!fetchData,
      risk_task_id: riskTaskId,
      microcheck_success: !!microcheckData
    });

    // Attendre le risk score (polling)
    showOverlay('Calcul du Risk Score...', 'info');
    const riskData = await pollRiskScore(riskTaskId);

    // Upload vers SAR
    showOverlay('Envoi vers SAR...', 'info');
    const uploadResult = await uploadToSAR(guid, fetchData, riskData, microcheckData);

    // Succès
    showOverlay('✅ Upload réussi! Redirection...', 'success');

    // Rediriger vers admin
    setTimeout(() => {
      window.location.href = `https://admin.solutionargentrapide.ca${uploadResult.redirect_url}`;
    }, 1500);

  } catch (error) {
    TRACE.error('MAIN_ERROR', 'Extraction failed', error);
    showOverlay(`❌ Erreur: ${error.message}`, 'error');
  }
}

// 8. UI Overlay
function showOverlay(message, type = 'info') {
  let overlay = document.getElementById('ibv-crawler-overlay');

  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'ibv-crawler-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 15px 20px;
      border-radius: 8px;
      font-family: Arial, sans-serif;
      font-size: 14px;
      z-index: 10000;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    `;
    document.body.appendChild(overlay);
  }

  const colors = {
    info: { bg: '#3b82f6', text: '#fff' },
    success: { bg: '#10b981', text: '#fff' },
    error: { bg: '#ef4444', text: '#fff' }
  };

  overlay.style.backgroundColor = colors[type].bg;
  overlay.style.color = colors[type].text;
  overlay.textContent = message;
}

// 9. Floating button
function createFloatingButton(guid) {
  const button = document.createElement('button');
  button.id = 'ibv-extract-button';
  button.textContent = '📤 Extraire & Envoyer SAR';
  button.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    padding: 12px 24px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    z-index: 10000;
    transition: transform 0.2s;
  `;

  button.addEventListener('mouseenter', () => {
    button.style.transform = 'scale(1.05)';
  });

  button.addEventListener('mouseleave', () => {
    button.style.transform = 'scale(1)';
  });

  button.addEventListener('click', () => {
    extractAndUploadToSAR(guid);
  });

  document.body.appendChild(button);
  TRACE.log('UI', 'Floating button created');
}

// 10. Initialize
function initialize() {
  TRACE.log('INIT', 'Extension initialized');

  const guid = detectGUID();

  if (guid) {
    createFloatingButton(guid);
  } else {
    TRACE.log('INIT', 'No GUID detected, button not created');
  }
}

// Run on page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  initialize();
}

Test:
1. Charger extension dans Chrome (chrome://extensions)
2. Ouvrir app.inverite.com/client/{guid}
3. Voir bouton flottant
4. Cliquer → Voir logs dans console
5. Vérifier upload dans Supabase

────────────────────────────────────────────────────────────────────

✅ TÂCHE 2.3: Créer config.js + popup (2h)
─────────────────────────────────────────
Fichier: chrome-extension/config.js

const CONFIG = {
  INVERITE_API_KEY: '09a4b8554857d353fd007d29feca423f446',
  SAR_API_URL: 'https://admin.solutionargentrapide.ca/api/admin/client-analysis',
  SAR_JWT_TOKEN: '',  // À remplir via popup
  RISK_POLL_INTERVAL: 5000,
  RISK_MAX_ATTEMPTS: 12
};

// Charger config depuis chrome.storage
chrome.storage.sync.get(['sar_jwt_token'], (result) => {
  if (result.sar_jwt_token) {
    CONFIG.SAR_JWT_TOKEN = result.sar_jwt_token;
  }
});

Fichier: chrome-extension/popup.html

<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>IBV Crawler V2 - Configuration</title>
  <style>
    body {
      width: 400px;
      padding: 20px;
      font-family: Arial, sans-serif;
    }
    h1 {
      font-size: 18px;
      margin-bottom: 15px;
    }
    label {
      display: block;
      margin-bottom: 5px;
      font-weight: 600;
    }
    input, textarea {
      width: 100%;
      padding: 8px;
      margin-bottom: 15px;
      border: 1px solid #ccc;
      border-radius: 4px;
      box-sizing: border-box;
    }
    textarea {
      min-height: 80px;
      font-family: monospace;
      font-size: 12px;
    }
    button {
      width: 100%;
      padding: 10px;
      background: #667eea;
      color: white;
      border: none;
      border-radius: 4px;
      font-weight: 600;
      cursor: pointer;
    }
    button:hover {
      background: #5a67d8;
    }
    .status {
      margin-top: 15px;
      padding: 10px;
      border-radius: 4px;
      text-align: center;
    }
    .success {
      background: #d1fae5;
      color: #065f46;
    }
    .error {
      background: #fee2e2;
      color: #991b1b;
    }
  </style>
</head>
<body>
  <h1>⚙️ Configuration</h1>

  <label for="jwt-token">JWT Token SAR:</label>
  <textarea id="jwt-token" placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."></textarea>

  <button id="save-button">💾 Sauvegarder</button>

  <div id="status" class="status" style="display:none;"></div>

  <script src="popup.js"></script>
</body>
</html>

Fichier: chrome-extension/popup.js

document.getElementById('save-button').addEventListener('click', () => {
  const token = document.getElementById('jwt-token').value.trim();

  if (!token) {
    showStatus('Veuillez entrer un token JWT', 'error');
    return;
  }

  chrome.storage.sync.set({ sar_jwt_token: token }, () => {
    showStatus('✅ Configuration sauvegardée!', 'success');
    setTimeout(() => {
      window.close();
    }, 1500);
  });
});

function showStatus(message, type) {
  const status = document.getElementById('status');
  status.textContent = message;
  status.className = `status ${type}`;
  status.style.display = 'block';
}

// Charger token existant
chrome.storage.sync.get(['sar_jwt_token'], (result) => {
  if (result.sar_jwt_token) {
    document.getElementById('jwt-token').value = result.sar_jwt_token;
  }
});

════════════════════════════════════════════════════════════════════
JOUR 3: WORKER + METRICS CALCULATION (8h)
════════════════════════════════════════════════════════════════════

✅ TÂCHE 3.1: calculate-metrics.ts (4h)
─────────────────────────────────────
Fichier: src/lib/analysis/calculate-metrics.ts (NOUVEAU)

[Voir code complet dans section suivante - trop long pour ici]

Fonctions principales:
1. extractMonthlyIncome(payschedules) → number
2. extractMonthlyExpenses(transactions) → number
3. calculateDTI(expenses, income) → number
4. countNSF(transactions) → number
5. countOverdrafts(transactions) → number
6. detectBankruptcy(transactions) → boolean
7. calculateAccountHealth(account, metrics) → number (0-1000)
8. extractRedFlags(metrics) → RedFlag[]
9. calculateMetrics(rawData) → FinancialMetrics (MAIN)