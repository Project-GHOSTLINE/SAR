# 📊 DataFlow Complet + Checklist des Tâches

**Date:** 2026-01-22
**Projet:** Solution Argent Rapide (SAR)
**Objectif:** Comprendre le flux complet et ce qui reste à faire

---

## 🎯 DATAFLOW ACTUEL (CE QUI EXISTE)

```
┌─────────────────────────────────────────────────────────────────┐
│  ÉTAPE 1: CLIENT FAIT UNE DEMANDE                              │
└─────────────────────────────────────────────────────────────────┘
                           │
                           │ Client remplit formulaire
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│  ÉTAPE 2: VÉRIFICATION BANCAIRE INVERITE                       │
│  • Client va sur Inverite.com                                   │
│  • Connecte son compte bancaire                                 │
│  • Inverite récupère 90 jours de transactions                  │
└─────────────────────────────────────────────────────────────────┘
                           │
                           │ Client termine vérification
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│  ÉTAPE 3: ADMIN OUVRE INVERITE DANS CHROME                     │
│  • Admin va sur app.inverite.com/view/{guid}                   │
│  • Voit les données du client                                   │
└─────────────────────────────────────────────────────────────────┘
                           │
                           │ Admin clique "Télécharger JSON"
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│  ÉTAPE 4: EXTENSION CHROME CAPTURE                             │
│  📁 Extension: inverite-json-downloader-v9.2.2                 │
│                                                                  │
│  Actions:                                                        │
│  1. Détecte GUID dans URL                                       │
│  2. Appelle GET /api/v2/fetch/{guid}                           │
│  3. Reçoit JSON avec comptes + transactions                     │
│  4. Télécharge: Fred-Rosa-2025-12-22.json                      │
│                                                                  │
│  Localisation: ~/Downloads/                                     │
└─────────────────────────────────────────────────────────────────┘
                           │
                           │ ⚠️ ÉTAPE MANQUANTE!
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│  ❌ ÉTAPE 5: ??? UPLOAD VERS SAR ???                           │
│                                                                  │
│  Actuellement: MANUEL ou MANQUANT                              │
│  Options possibles:                                             │
│  • Upload manuel dans un formulaire?                            │
│  • Script qui surveille ~/Downloads/?                           │
│  • Autre extension Chrome?                                      │
└─────────────────────────────────────────────────────────────────┘
                           │
                           │ Si les données arrivent...
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│  ÉTAPE 6: SAR API REÇOIT ET STOCKE                             │
│  📁 Fichier: src/app/api/admin/client-analysis/route.ts       │
│                                                                  │
│  POST /api/admin/client-analysis                               │
│  • Valide l'authentification                                    │
│  • Extrait infos client (nom, email, téléphone)                │
│  • Calcule totaux (accounts, balance, transactions)            │
│  • INSERT dans Supabase table: client_analyses                 │
│    - Colonne raw_data (JSONB) ← TOUTES les données            │
└─────────────────────────────────────────────────────────────────┘
                           │
                           │ Données stockées
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│  ÉTAPE 7: SUPABASE - BASE DE DONNÉES                           │
│  Table: client_analyses                                         │
│                                                                  │
│  Colonnes:                                                       │
│  • id (UUID)                                                    │
│  • client_name                                                  │
│  • client_email                                                 │
│  • raw_data (JSONB) ← Comptes + Transactions                   │
│  • source ('inverite' ou 'flinks')                             │
│  • total_accounts                                               │
│  • total_balance                                                │
│  • status (pending/reviewed/approved/rejected)                 │
│  • created_at                                                   │
└─────────────────────────────────────────────────────────────────┘
                           │
                           │ Admin ouvre analyse
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│  ÉTAPE 8: ADMIN VISUALISE                                      │
│  📁 Page: admin.solutionargentrapide.ca/admin/analyse?id=xxx   │
│  📁 Fichier: src/app/admin/analyse/page.tsx                    │
│                                                                  │
│  Actions:                                                        │
│  1. GET /api/admin/client-analysis?id={uuid}                   │
│  2. API lit depuis Supabase                                     │
│  3. Retourne raw_data + métadonnées                            │
│  4. Page affiche:                                               │
│     • Infos client (nom, email, téléphone, adresse)            │
│     • Liste des comptes bancaires                               │
│     • Transactions détaillées avec filtres                      │
│     • Statistiques (soldes, totaux)                             │
│     • Red flags (NSF, retours)                                  │
└─────────────────────────────────────────────────────────────────┘
                           │
                           │ Admin prend décision
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│  ÉTAPE 9: DÉCISION MANUELLE                                    │
│  • Admin examine les données                                    │
│  • Calcule ratios manuellement                                  │
│  • Prend décision: Approuver / Refuser                         │
│  • Change status dans l'interface                               │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🚀 DATAFLOW IDÉAL (CE QUI DEVRAIT EXISTER)

```
┌─────────────────────────────────────────────────────────────────┐
│  ÉTAPE 1: CLIENT → INVERITE                                    │
│  (Même chose qu'actuellement)                                   │
└─────────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│  ÉTAPE 2: EXTENSION CHROME V2 (AMÉLIORÉE) 🆕                   │
│  📁 Extension: sar-inverite-auto-upload-v2                     │
│                                                                  │
│  Actions automatiques:                                          │
│  1. Détecte GUID dans URL                                       │
│  2. Appelle GET /api/v2/fetch/{guid}                           │
│  3. Appelle POST /api/v2/risk → Risk Score 🔥                  │
│  4. Appelle POST /api/v2/microcheck/search → Prêts rapides 🚨 │
│  5. Combine tout dans un JSON enrichi                           │
│  6. POST automatique vers SAR API ✅                            │
│                                                                  │
│  Résultat: Données arrivent dans SAR en 30 secondes!          │
└─────────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│  ÉTAPE 3: SAR API REÇOIT DONNÉES ENRICHIES                     │
│  POST /api/admin/client-analysis                               │
│                                                                  │
│  Données reçues:                                                │
│  • Comptes + Transactions (comme avant)                         │
│  • Risk Score: 750/850 🔥                                       │
│  • Microloans: Détecté (3 prêteurs) 🚨                         │
│  • Recommandation: APPROVE ou DECLINE                           │
│                                                                  │
│  Action: Stocke TOUT dans Supabase                             │
└─────────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│  ÉTAPE 4: MOTEUR D'ANALYSE AUTOMATIQUE 🆕                      │
│  📁 Nouveau: src/lib/loan-analyzer.ts                          │
│                                                                  │
│  Calculs automatiques:                                          │
│  • Ratio d'endettement (DTI)                                    │
│  • Revenu net moyen                                             │
│  • Dépenses fixes (loyer, factures)                            │
│  • Historique NSF/retours                                       │
│  • Score composite SAR (300-850)                                │
│  • Montant max recommandé                                       │
│                                                                  │
│  Résultat: Recommandation automatique                          │
└─────────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│  ÉTAPE 5: ADMIN VOIT RECOMMANDATION                            │
│  📁 Page améliorée: /admin/analyse?id=xxx                      │
│                                                                  │
│  Affichage:                                                      │
│  ┌────────────────────────────────────────┐                    │
│  │  🎯 RECOMMANDATION: APPROUVER          │                    │
│  │  Score SAR: 720/850                     │                    │
│  │  Montant max: $3,500                    │                    │
│  │  Confiance: 85%                         │                    │
│  │                                          │                    │
│  │  [APPROUVER $3,500] [AJUSTER] [REFUSER] │                    │
│  └────────────────────────────────────────┘                    │
│                                                                  │
│  • Admin peut accepter en 1 clic                                │
│  • Ou ajuster le montant manuellement                           │
│  • Voir tous les détails si nécessaire                          │
└─────────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│  ÉTAPE 6: DÉCISION RAPIDE                                      │
│  • Temps moyen: 2 minutes (vs 20 minutes avant)                │
│  • Réduction erreurs humaines                                   │
│  • Traçabilité complète                                         │
└─────────────────────────────────────────────────────────────────┘
```

---

## ✅ CHECKLIST COMPLÈTE DES TÂCHES

### 🔴 PHASE 1: COMBLER LE TROU (Priorité URGENTE)

**Objectif:** Faire arriver les données dans SAR automatiquement

#### ☐ Tâche 1.1: Créer Extension Chrome V2
**Durée:** 4-6 heures
**Fichiers:**
- [ ] Créer `/extension-sar-v2/manifest.json`
- [ ] Créer `/extension-sar-v2/config.js` (avec API keys)
- [ ] Créer `/extension-sar-v2/content-script.js`

**Code à écrire:**
```javascript
// content-script.js
async function captureAndUpload(guid) {
  // 1. Fetch données Inverite
  const inveriteData = await fetch(
    `https://www.inverite.com/api/v2/fetch/${guid}`,
    { headers: { 'Auth': CONFIG.INVERITE_API_KEY } }
  ).then(r => r.json());

  // 2. POST vers SAR
  const response = await fetch(
    'https://solutionargentrapide.ca/api/admin/client-analysis',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CONFIG.SAR_TOKEN}`
      },
      body: JSON.stringify({
        client_name: inveriteData.name,
        raw_data: inveriteData,
        source: 'inverite',
        inverite_guid: guid
      })
    }
  );

  return response.json();
}
```

**Acceptance Criteria:**
- [ ] Bouton "Envoyer vers SAR" apparaît sur Inverite
- [ ] Clic sur bouton envoie automatiquement les données
- [ ] Confirmation de succès affichée
- [ ] Données arrivent dans Supabase `client_analyses`

---

#### ☐ Tâche 1.2: Générer Token Bearer pour Extension
**Durée:** 30 minutes
**Fichiers:**
- [ ] Créer `/scripts/generate-extension-token.mjs`

**Code:**
```javascript
import { SignJWT } from 'jose'

const secret = new TextEncoder().encode(process.env.JWT_SECRET)

const token = await new SignJWT({ extension: 'sar-inverite-v2' })
  .setProtectedHeader({ alg: 'HS256' })
  .setExpirationTime('1y')
  .sign(secret)

console.log('Token pour extension:', token)
// Copier dans extension-sar-v2/config.js
```

**Acceptance Criteria:**
- [ ] Token généré avec expiration 1 an
- [ ] Token testé avec `/api/admin/client-analysis`
- [ ] Token ajouté dans `config.js` de l'extension

---

#### ☐ Tâche 1.3: Tester le Flow Complet
**Durée:** 1 heure
**Tests:**
- [ ] Extension détecte GUID sur Inverite
- [ ] Clic bouton capture les données
- [ ] POST arrive sur SAR API
- [ ] Données stockées dans Supabase
- [ ] Admin peut voir l'analyse dans `/admin/analyse`

---

### 🟡 PHASE 2: ENRICHIR LES DONNÉES (Priorité HAUTE)

**Objectif:** Ajouter Risk Score et Microcheck

#### ☐ Tâche 2.1: Implémenter Risk Score API
**Durée:** 3-4 heures
**Fichiers:**
- [ ] Modifier `/extension-sar-v2/content-script.js`
- [ ] Ajouter fonction `getRiskScore(guid)`

**Code:**
```javascript
async function getRiskScore(guid) {
  // 1. Créer demande risk
  const riskReq = await fetch(
    'https://www.inverite.com/api/v2/risk',
    {
      method: 'POST',
      headers: {
        'Auth': CONFIG.INVERITE_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ request: guid })
    }
  );

  const { task_id } = await riskReq.json();

  // 2. Poller status (max 1 minute)
  for (let i = 0; i < 12; i++) {
    await sleep(5000);

    const statusReq = await fetch(
      `https://www.inverite.com/api/v2/risk_status/${task_id}`,
      { headers: { 'Auth': CONFIG.INVERITE_API_KEY } }
    );

    const riskData = await statusReq.json();

    if (riskData.status === 'success') {
      return riskData;
    }
  }

  return { error: 'Timeout' };
}
```

**Acceptance Criteria:**
- [ ] Risk Score récupéré avec succès
- [ ] Score inclus dans le JSON envoyé à SAR
- [ ] SAR stocke le risk_score dans Supabase
- [ ] Admin voit le risk_score dans l'interface

---

#### ☐ Tâche 2.2: Ajouter Microcheck Detection
**Durée:** 2 heures
**Fichiers:**
- [ ] Modifier `/extension-sar-v2/content-script.js`
- [ ] Ajouter fonction `checkMicroloans(guid)`

**Code:**
```javascript
async function checkMicroloans(guid) {
  const response = await fetch(
    'https://www.inverite.com/api/v2/microcheck/search',
    {
      method: 'POST',
      headers: {
        'Auth': CONFIG.INVERITE_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        guid: guid,
        days: 90
      })
    }
  );

  return response.json();
}
```

**Acceptance Criteria:**
- [ ] Microloans détectés avec succès
- [ ] Données incluses dans le JSON vers SAR
- [ ] Admin voit les prêteurs détectés
- [ ] RED FLAG affiché si microloans > 0

---

#### ☐ Tâche 2.3: Modifier Schéma Supabase
**Durée:** 30 minutes
**Fichiers:**
- [ ] Créer `/database/migrations/add_risk_and_microcheck.sql`

**SQL:**
```sql
-- Ajouter colonnes pour risk score et microcheck
ALTER TABLE client_analyses
ADD COLUMN risk_score INTEGER,
ADD COLUMN risk_level TEXT,
ADD COLUMN has_microloans BOOLEAN DEFAULT FALSE,
ADD COLUMN microloans_data JSONB;

-- Créer index pour recherche rapide
CREATE INDEX idx_risk_score ON client_analyses(risk_score);
CREATE INDEX idx_has_microloans ON client_analyses(has_microloans);
```

**Acceptance Criteria:**
- [ ] Migration exécutée sur Supabase
- [ ] Nouvelles colonnes disponibles
- [ ] API SAR modifiée pour stocker ces données

---

#### ☐ Tâche 2.4: Modifier API SAR pour Recevoir Risk Score
**Durée:** 1 heure
**Fichiers:**
- [ ] Modifier `/src/app/api/admin/client-analysis/route.ts`

**Code:**
```typescript
// Ligne ~183 - Ajouter dans analysisData
const analysisData: any = {
  client_name: body.client_name,
  // ... autres champs
  risk_score: body.risk_score || null,
  risk_level: body.risk_level || null,
  has_microloans: body.has_microloans || false,
  microloans_data: body.microloans_data || null
}
```

**Acceptance Criteria:**
- [ ] API accepte les nouveaux champs
- [ ] Données stockées correctement
- [ ] Tests passent

---

#### ☐ Tâche 2.5: Afficher Risk Score dans Admin
**Durée:** 2 heures
**Fichiers:**
- [ ] Modifier `/src/app/admin/analyse/page.tsx`

**UI à ajouter:**
```tsx
{/* Risk Score Card */}
{analysis.risk_score && (
  <div className="card bg-gradient-to-r from-blue-500 to-purple-500 text-white">
    <h3 className="text-2xl font-bold">Risk Score Inverite</h3>
    <div className="text-6xl font-bold my-4">
      {analysis.risk_score}
      <span className="text-2xl">/850</span>
    </div>
    <div className="flex items-center gap-2">
      <Badge>{analysis.risk_level?.toUpperCase()}</Badge>
      {analysis.risk_score >= 700 && <Check className="text-green-400" />}
      {analysis.risk_score < 700 && <AlertTriangle className="text-yellow-400" />}
    </div>
  </div>
)}

{/* Microloans Warning */}
{analysis.has_microloans && (
  <div className="alert alert-danger">
    <AlertCircle className="text-red-500" />
    <div>
      <h4 className="font-bold">⚠️ Prêts Rapides Détectés</h4>
      <p>Ce client a {analysis.microloans_data?.lenders?.length} prêteurs actifs</p>
    </div>
  </div>
)}
```

**Acceptance Criteria:**
- [ ] Risk Score affiché de façon visuelle
- [ ] Couleurs selon le niveau (vert/jaune/rouge)
- [ ] Warning affiché si microloans
- [ ] Liste des prêteurs affichée

---

### 🟢 PHASE 3: MOTEUR D'ANALYSE AUTOMATIQUE (Priorité MOYENNE)

**Objectif:** Calculer automatiquement recommandation de prêt

#### ☐ Tâche 3.1: Créer Moteur d'Analyse
**Durée:** 8 heures
**Fichiers:**
- [ ] Créer `/src/lib/loan-analyzer.ts`

**Code:**
```typescript
export interface LoanAnalysis {
  recommendation: 'approve' | 'decline' | 'review';
  max_loan_amount: number;
  confidence: number;
  sar_score: number;
  factors: {
    income_stability: number;
    dti_ratio: number;
    nsf_history: number;
    account_age: number;
  };
  red_flags: string[];
}

export function analyzeLoanApplication(
  rawData: any,
  riskScore?: number
): LoanAnalysis {
  // 1. Calculer revenus mensuels
  const monthlyIncome = calculateMonthlyIncome(rawData);

  // 2. Calculer dépenses fixes
  const monthlyExpenses = calculateMonthlyExpenses(rawData);

  // 3. Calculer DTI (Debt-to-Income ratio)
  const dti = monthlyExpenses / monthlyIncome;

  // 4. Analyser historique NSF
  const nsfCount = countNSF(rawData);

  // 5. Calculer score SAR (300-850)
  const sarScore = calculateSARScore({
    monthlyIncome,
    dti,
    nsfCount,
    riskScore
  });

  // 6. Déterminer recommandation
  const recommendation = determineRecommendation(sarScore);

  // 7. Calculer montant max
  const maxLoanAmount = calculateMaxLoan(monthlyIncome, dti, sarScore);

  return {
    recommendation,
    max_loan_amount: maxLoanAmount,
    confidence: calculateConfidence(rawData),
    sar_score: sarScore,
    factors: {
      income_stability: calculateIncomeStability(rawData),
      dti_ratio: dti,
      nsf_history: nsfCount,
      account_age: calculateAccountAge(rawData)
    },
    red_flags: detectRedFlags(rawData)
  };
}
```

**Acceptance Criteria:**
- [ ] Fonction analyse complète implémentée
- [ ] Tests unitaires pour chaque calcul
- [ ] Score SAR entre 300-850
- [ ] Recommandation cohérente

---

#### ☐ Tâche 3.2: Intégrer Moteur dans API
**Durée:** 2 heures
**Fichiers:**
- [ ] Modifier `/src/app/api/admin/client-analysis/route.ts`

**Code:**
```typescript
// Après insertion dans Supabase
if (data && data.raw_data) {
  // Analyser automatiquement
  const analysis = analyzeLoanApplication(
    data.raw_data,
    body.risk_score
  );

  // Mettre à jour avec l'analyse
  await supabase
    .from('client_analyses')
    .update({
      sar_score: analysis.sar_score,
      recommendation: analysis.recommendation,
      max_loan_amount: analysis.max_loan_amount,
      analysis_data: analysis
    })
    .eq('id', data.id);
}
```

**Acceptance Criteria:**
- [ ] Analyse automatique à la réception
- [ ] Résultats stockés dans Supabase
- [ ] Pas d'erreur si analyse échoue

---

#### ☐ Tâche 3.3: Afficher Recommandation dans Admin
**Durée:** 3 heures
**Fichiers:**
- [ ] Modifier `/src/app/admin/analyse/page.tsx`

**UI:**
```tsx
{/* Recommandation Card */}
<div className="card-recommendation">
  <h2 className="text-3xl font-bold">
    {analysis.recommendation === 'approve' && '✅ APPROUVER'}
    {analysis.recommendation === 'decline' && '❌ REFUSER'}
    {analysis.recommendation === 'review' && '⚠️ RÉVISION MANUELLE'}
  </h2>

  <div className="grid grid-cols-2 gap-4 mt-6">
    <div>
      <p className="text-sm text-gray-500">Score SAR</p>
      <p className="text-4xl font-bold">{analysis.sar_score}/850</p>
    </div>
    <div>
      <p className="text-sm text-gray-500">Montant Max</p>
      <p className="text-4xl font-bold">{formatCurrency(analysis.max_loan_amount)}</p>
    </div>
  </div>

  <div className="mt-6 flex gap-4">
    <button className="btn-primary">
      Approuver {formatCurrency(analysis.max_loan_amount)}
    </button>
    <button className="btn-secondary">
      Ajuster Montant
    </button>
    <button className="btn-danger">
      Refuser
    </button>
  </div>
</div>
```

**Acceptance Criteria:**
- [ ] Recommandation affichée en haut de page
- [ ] Score SAR visible
- [ ] Montant max suggéré
- [ ] Boutons d'action rapides
- [ ] Admin peut override la décision

---

### 🔵 PHASE 4: BONUS / NICE-TO-HAVE (Priorité BASSE)

#### ☐ Tâche 4.1: Télécharger PDF Reports
**Durée:** 2 heures
- [ ] Ajouter bouton "Télécharger Rapport PDF" dans admin
- [ ] Appeler `/api/v2/pdf_report/{guid}?type=income`
- [ ] Sauvegarder PDF avec le dossier client

#### ☐ Tâche 4.2: Historique des Décisions
**Durée:** 3 heures
- [ ] Créer table `loan_decisions` dans Supabase
- [ ] Logger chaque décision (approve/decline)
- [ ] Afficher historique dans admin

#### ☐ Tâche 4.3: Notifications Slack/Email
**Durée:** 2 heures
- [ ] Envoyer notification quand nouvelle analyse arrive
- [ ] Alerter si risk_score < 600
- [ ] Résumé quotidien des analyses

---

## 📊 RÉSUMÉ VISUEL DES PHASES

```
PHASE 1: COMBLER LE TROU (URGENT)
┌────────────────────────────────────┐
│ Extension V2 → SAR API → Supabase │  ⏱️ 6-8 heures
└────────────────────────────────────┘
Impact: 🔥🔥🔥 CRITIQUE (système non fonctionnel sans ça)

PHASE 2: ENRICHIR DONNÉES (HAUTE)
┌────────────────────────────────────┐
│ + Risk Score + Microcheck         │  ⏱️ 8-10 heures
└────────────────────────────────────┘
Impact: 🔥🔥 ÉLEVÉ (améliore décisions 10x)

PHASE 3: ANALYSE AUTO (MOYENNE)
┌────────────────────────────────────┐
│ Moteur d'analyse + Recommandations│  ⏱️ 12-15 heures
└────────────────────────────────────┘
Impact: 🔥 MOYEN (économise temps agents)

PHASE 4: BONUS (BASSE)
┌────────────────────────────────────┐
│ PDF + Historique + Notifications  │  ⏱️ 6-8 heures
└────────────────────────────────────┘
Impact: 💡 FAIBLE (nice-to-have)
```

---

## 🎯 ESTIMATION TOTALE

| Phase | Tâches | Durée | Impact |
|-------|--------|-------|--------|
| **Phase 1** | Extension V2 + Upload auto | 6-8h | 🔥🔥🔥 CRITIQUE |
| **Phase 2** | Risk Score + Microcheck | 8-10h | 🔥🔥 ÉLEVÉ |
| **Phase 3** | Moteur d'analyse | 12-15h | 🔥 MOYEN |
| **Phase 4** | Bonus features | 6-8h | 💡 FAIBLE |
| **TOTAL** | | **32-41h** | |

**Planning suggéré:**
- **Semaine 1:** Phase 1 (Extension V2) ← URGENT
- **Semaine 2:** Phase 2 (Risk Score + Microcheck)
- **Semaine 3:** Phase 3 (Moteur d'analyse)
- **Semaine 4:** Phase 4 (Bonus) + Tests + Polish

---

## ✅ CHECKLIST RAPIDE (À IMPRIMER)

### Sprint 1: Débloquer le Système (2-3 jours)
- [ ] Extension Chrome V2 créée
- [ ] Token Bearer généré
- [ ] Upload automatique vers SAR fonctionne
- [ ] Données arrivent dans Supabase
- [ ] Admin peut voir les analyses

### Sprint 2: Enrichir les Données (3-4 jours)
- [ ] Risk Score intégré
- [ ] Microcheck intégré
- [ ] Schéma Supabase mis à jour
- [ ] UI affiche Risk Score et warnings

### Sprint 3: Automatiser Décisions (5-7 jours)
- [ ] Moteur d'analyse créé
- [ ] Score SAR calculé (300-850)
- [ ] Recommandations générées
- [ ] UI affiche recommandation avec boutons actions

### Sprint 4: Polish & Bonus (3-4 jours)
- [ ] PDF Reports
- [ ] Historique décisions
- [ ] Notifications
- [ ] Tests end-to-end

---

**Prêt à commencer par la Phase 1?** 🚀

Je peux te guider étape par étape pour créer l'Extension Chrome V2!
