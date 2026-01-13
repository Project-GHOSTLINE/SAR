# 📊 Guide d'Installation Google Analytics 4 - SAR

**Date**: 13 janvier 2026
**Status**: API Backend prête ✅ - Configuration GA4 requise

---

## ✅ Ce qui est déjà fait

1. **Package installé**: `@google-analytics/data` ✅
2. **Composant GoogleAnalytics** créé: `/src/components/GoogleAnalytics.tsx` ✅
3. **Helpers de tracking** créés: `/src/lib/analytics.ts` ✅
4. **Types TypeScript** créés: `/src/types/analytics.ts` ✅
5. **API Backend** créée:
   - `/api/admin/analytics` - Données brutes ✅
   - `/api/admin/analytics/dashboard` - Données agrégées ✅
6. **Variables d'environnement** ajoutées à `.env.example` ✅

---

## 🚀 Étapes d'Installation (30 min)

### Étape 1: Créer une Propriété Google Analytics 4 (10 min)

#### A. Aller sur Google Analytics
1. Ouvre https://analytics.google.com
2. Connecte-toi avec ton compte Google
3. Clique sur "Admin" (roue dentée en bas à gauche)

#### B. Créer une Propriété
1. Dans la colonne "Compte", sélectionne ou crée "Solution Argent Rapide INC"
2. Dans la colonne "Propriété", clique sur "+ Créer une propriété"
3. Configure:
   - **Nom de la propriété**: "SAR - Production"
   - **Fuseau horaire**: Canada (Eastern Time)
   - **Devise**: Dollar canadien (CAD)
4. Clique "Suivant"

#### C. Détails de l'Entreprise
1. **Secteur d'activité**: Finance et assurance
2. **Taille de l'entreprise**: Petite (1-10 employés)
3. **Objectifs**: Sélectionne tous les objectifs pertinents
4. Clique "Créer"

#### D. Configuration du Flux de Données Web
1. Sélectionne "Web"
2. Configure:
   - **URL du site web**: `https://solutionargentrapide.ca`
   - **Nom du flux**: "Site Web SAR"
3. Clique "Créer un flux"

#### E. Récupérer le Measurement ID
1. Tu verras un ID au format: **`G-XXXXXXXXXX`**
2. **COPIE CE ID** - tu en auras besoin!

---

### Étape 2: Configurer les Variables d'Environnement (2 min)

Ouvre `/Users/xunit/Desktop/📁 Projets/sar/.env.local` et ajoute:

```bash
# Google Analytics 4 - Frontend
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX  # Remplace par ton ID

# Google Analytics 4 - Backend API
GA_PROPERTY_ID=123456789  # ID numérique de ta propriété
```

**Comment trouver le GA_PROPERTY_ID?**
1. Dans GA4, va dans "Admin" > "Paramètres de la propriété"
2. En haut, tu verras "ID DE LA PROPRIÉTÉ" (format numérique: 123456789)
3. Copie ce numéro

---

### Étape 3: Activer Google Analytics Data API (10 min)

#### A. Aller sur Google Cloud Console
1. Ouvre https://console.cloud.google.com
2. Sélectionne ou crée un projet "SAR Analytics"

#### B. Activer l'API
1. Dans le menu, va dans "APIs & Services" > "Library"
2. Recherche "Google Analytics Data API"
3. Clique dessus et clique "ACTIVER"

#### C. Créer un Service Account
1. Va dans "APIs & Services" > "Credentials"
2. Clique "+ CREATE CREDENTIALS" > "Service account"
3. Configure:
   - **Nom**: "sar-analytics-reader"
   - **Description**: "Service account pour lire les données Analytics"
4. Clique "CREATE AND CONTINUE"
5. **Rôle**: Sélectionne "Viewer" (lecture seule)
6. Clique "DONE"

#### D. Créer une Clé JSON
1. Dans la liste des Service Accounts, clique sur celui que tu viens de créer
2. Va dans l'onglet "KEYS"
3. Clique "ADD KEY" > "Create new key"
4. Sélectionne "JSON"
5. Clique "CREATE"
6. **Un fichier JSON sera téléchargé** - garde-le en sécurité!

#### E. Donner Accès au Service Account dans GA4
1. Retourne dans Google Analytics (https://analytics.google.com)
2. Va dans "Admin" > "Accès à la propriété"
3. Clique "+ Ajouter des utilisateurs"
4. **Email**: Copie l'email du service account (format: `xxx@xxx.iam.gserviceaccount.com`)
   - Tu le trouves dans le fichier JSON téléchargé (champ "client_email")
5. **Rôles**: Sélectionne "Lecteur"
6. Clique "Ajouter"

#### F. Ajouter le JSON dans .env.local
Ouvre le fichier JSON téléchargé et copie TOUT son contenu, puis ajoute dans `.env.local`:

```bash
GA_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"xxx",...tout le JSON sur une ligne...}
```

**IMPORTANT**: Le JSON doit être sur **UNE SEULE LIGNE** et **sans retours à la ligne**.

Tu peux utiliser cette commande pour le formatter:
```bash
cat ~/Downloads/sar-analytics-*.json | tr -d '\n' | pbcopy
```
Puis colle dans `.env.local`

---

### Étape 4: Ajouter GoogleAnalytics au Layout (2 min)

Ouvre `/src/app/layout.tsx` et ajoute:

```typescript
import GoogleAnalytics from '@/components/GoogleAnalytics'

export default function RootLayout({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr">
      <body>
        <GoogleAnalytics />
        {children}
      </body>
    </html>
  )
}
```

---

### Étape 5: Tester (5 min)

#### A. Redémarrer le serveur
```bash
# Stoppe le serveur actuel (Ctrl+C)
npm run dev
```

#### B. Ouvrir le site
1. Va sur http://localhost:3000
2. Ouvre la Console du navigateur (F12)
3. Tu devrais voir:
   - ✅ `Analytics consent given - Initializing GA4`
   - OU ⚠️ `No Axeptio detected - Initializing GA4 directly`

#### C. Vérifier dans GA4 Real-Time
1. Retourne sur https://analytics.google.com
2. Va dans "Rapports" > "Temps réel"
3. Tu devrais voir **1 utilisateur actif** (toi!) 🎉

#### D. Tester l'API Backend
Ouvre http://localhost:3000/api/admin/analytics?startDate=today&endDate=today

Tu devrais voir un JSON avec:
- En mode développement: Données MOCK
- Avec credentials configurés: Vraies données GA4

---

## 📊 Utilisation de l'API

### Récupérer les données brutes

```typescript
// GET /api/admin/analytics
const response = await fetch('/api/admin/analytics?startDate=7daysAgo&endDate=today')
const data = await response.json()

console.log(data.summary.totalUsers) // Nombre total d'utilisateurs
console.log(data.data) // Array de toutes les rows avec device, location, metrics
```

### Récupérer le dashboard agrégé

```typescript
// GET /api/admin/analytics/dashboard
const response = await fetch('/api/admin/analytics/dashboard?period=7d')
const data = await response.json()

console.log(data.data.overview) // Stats globales
console.log(data.data.devices) // Répartition par device
console.log(data.data.trafficSources) // Sources de trafic
console.log(data.data.geography) // Répartition géographique
```

### Paramètres disponibles

#### `/api/admin/analytics`
- `startDate`: Date de début (format: `YYYY-MM-DD` ou `7daysAgo`, `30daysAgo`, etc.)
- `endDate`: Date de fin (format: `YYYY-MM-DD` ou `today`, `yesterday`)
- `metrics`: Métriques personnalisées (comma-separated)
- `dimensions`: Dimensions personnalisées (comma-separated)

#### `/api/admin/analytics/dashboard`
- `period`: `7d` | `30d` | `90d` (default: `7d`)

---

## 🎯 Tracking d'Événements Personnalisés

Tu peux tracker n'importe quel événement avec les helpers dans `/src/lib/analytics.ts`:

### Exemple: Tracker une soumission de formulaire de prêt

```typescript
import { trackLoanFormSubmit } from '@/lib/analytics'

const handleSubmit = async (formData) => {
  // Soumettre le formulaire
  await submitLoan(formData)

  // Tracker l'événement
  trackLoanFormSubmit(formData.amount, formData.term)
}
```

### Exemple: Tracker un clic de bouton

```typescript
import { trackButtonClick } from '@/lib/analytics'

<button onClick={() => {
  trackButtonClick('demande-pret', 'hero-section')
  router.push('/demande-de-pret')
}}>
  Demander un prêt
</button>
```

### Exemple: Tracker une conversion

```typescript
import { trackConversion } from '@/lib/analytics'

// Quand un prêt est approuvé
if (loanApproved) {
  trackConversion(loanAmount, transactionId)
}
```

---

## 📋 Métriques Disponibles

### Device Info
- Category (mobile/desktop/tablet)
- OS (iOS, Android, Windows, macOS)
- OS Version
- Browser (Chrome, Safari, Firefox, Edge)
- Browser Version
- Screen Resolution
- Mobile Device Brand (Apple, Samsung, etc.)
- Mobile Device Model (iPhone 13, Galaxy S21, etc.)

### User Metrics
- Active Users
- New Users
- Total Users
- Sessions
- Sessions Per User
- Page Views
- Average Session Duration
- Bounce Rate
- Engagement Rate

### Location
- Country
- Region
- City

### Traffic Source
- Source (google, facebook, direct, etc.)
- Medium (organic, cpc, referral, etc.)
- Campaign Name

### Conversions
- Total Conversions
- Total Revenue (CAD)
- Conversion Rate

---

## 🔧 Troubleshooting

### ❌ "GA_PROPERTY_ID non configuré"
- Vérifie que tu as bien ajouté `GA_PROPERTY_ID` dans `.env.local`
- Redémarre le serveur: `npm run dev`

### ❌ "Credentials Google Analytics invalides"
- Vérifie que `GA_SERVICE_ACCOUNT_JSON` est bien formaté (une seule ligne)
- Vérifie qu'il n'y a pas de caractères spéciaux échappés
- Essaie de copier-coller à nouveau le JSON

### ❌ "Failed to fetch analytics data"
- Vérifie que le Service Account a accès à la propriété GA4
- Va dans GA4 > Admin > Accès à la propriété
- L'email du service account doit être présent avec rôle "Lecteur"

### ❌ Pas de données dans GA4
- Les données peuvent prendre jusqu'à 24h pour apparaître dans les rapports
- Utilise "Temps réel" pour voir les données immédiatement
- Vérifie que `NEXT_PUBLIC_GA_MEASUREMENT_ID` est bien configuré

### ✅ Mode Mock (Développement)
Si tu n'as pas encore configuré les credentials, l'API retournera des **données fictives** pour tester:
- 3 utilisateurs types (mobile iOS, desktop Windows, mobile Android)
- Métriques réalistes
- Géolocalisation Canada (Montreal, Toronto, Quebec City)

---

## 🎉 Résultat Final

Une fois configuré, tu auras:

✅ **Tracking automatique** de tous les visiteurs
✅ **Données complètes** sur chaque device
✅ **Géolocalisation** précise
✅ **Sources de trafic** identifiées
✅ **API backend** pour récupérer les données
✅ **Mode mock** pour le développement
✅ **Conformité RGPD** avec Axeptio

---

## 📞 Prochaine Étape

Maintenant que l'API est prête, tu peux:
1. **Configurer GA4** (suivre ce guide)
2. **Créer un dashboard Analytics dans l'admin** pour visualiser les données
3. **Ajouter des événements personnalisés** dans ton formulaire de prêt

Dis-moi quand tu as configuré GA4 et je créerai le dashboard admin! 🚀
