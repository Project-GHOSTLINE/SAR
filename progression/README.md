# SAR Progression - Portail de suivi client

Système de suivi de demandes client par magic link sécurisé pour **progression.solutionargentrapide.ca**.

## 🎯 Caractéristiques

- ✅ **Aucun login/mot de passe** - Accès uniquement par lien magique temporaire
- ✅ **Sécurité maximale** - Tokens hashés, expiration 48h, rate limiting
- ✅ **UI moderne** - Interface client responsive et intuitive
- ✅ **Temps réel** - Mise à jour du statut visible immédiatement
- ✅ **Production-ready** - Edge runtime, Vercel cron, TypeScript strict

## 📦 Stack technique

- **Next.js 14+** (App Router, TypeScript, Edge Runtime)
- **Supabase** (Postgres)
- **Tailwind CSS** (Styling moderne)
- **Vercel** (Déploiement)

## 🗂️ Structure du projet

```
progression/
├── app/
│   ├── api/
│   │   ├── status/route.ts          # GET /api/status (client)
│   │   ├── admin/
│   │   │   ├── magic-link/route.ts  # POST /api/admin/magic-link
│   │   │   ├── event/route.ts       # POST /api/admin/event
│   │   │   └── note/route.ts        # POST /api/admin/note
│   │   └── cron/
│   │       └── cleanup/route.ts     # GET /api/cron/cleanup
│   ├── suivi/page.tsx               # Page client principale
│   ├── page.tsx                     # Page d'accueil (redirection)
│   ├── layout.tsx                   # Layout principal
│   └── globals.css                  # Styles globaux
├── components/
│   └── ProgressBar.tsx              # Composant barre de progression
├── lib/
│   ├── supabase.ts                  # Client Supabase
│   ├── crypto.ts                    # Génération/validation tokens
│   ├── magic-link.ts                # Validation magic links
│   ├── rate-limit.ts                # Rate limiting
│   ├── auth.ts                      # Auth admin
│   ├── sms.ts                       # Envoi SMS (abstraction)
│   └── constants.ts                 # Constantes (statuts, étapes)
├── types/
│   └── index.ts                     # Types TypeScript
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql   # Schéma DB
└── vercel.json                      # Config Vercel (cron)
```

## 🚀 Installation

### 1. Cloner et installer les dépendances

```bash
cd progression
npm install
```

### 2. Configuration Supabase

1. Créer un projet sur [supabase.com](https://supabase.com)
2. Exécuter la migration SQL :
   ```bash
   # Via Supabase Dashboard > SQL Editor
   # Copier le contenu de supabase/migrations/001_initial_schema.sql
   ```

### 3. Variables d'environnement

Copier `.env.example` vers `.env` :

```bash
cp .env.example .env
```

Remplir les variables :

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
SUPABASE_SERVICE_ROLE_KEY=eyJxxx...

# App Config
NEXT_PUBLIC_APP_URL=https://progression.solutionargentrapide.ca

# Admin API Key (générer un UUID)
ADMIN_API_KEY=votre-cle-secrete-admin

# Cron Secret (optionnel, pour sécuriser le cron)
CRON_SECRET=votre-cle-cron

# SMS Provider (optionnel)
SMS_PROVIDER_API_KEY=votre-cle-sms
```

### 4. Lancer en dev

```bash
npm run dev
```

L'app sera accessible sur **http://localhost:3001**

## 📊 Schéma de base de données

### `applications`
Demandes clients principales.

| Colonne | Type | Description |
|---------|------|-------------|
| id | TEXT | ID unique (PK) |
| origin | TEXT | Source de la demande |
| name | TEXT | Nom du client |
| email | TEXT | Email du client |
| phone | TEXT | Téléphone du client |
| amount_cents | INT | Montant en cents |
| status | TEXT | Statut actuel (NOT NULL) |
| status_updated_at | TIMESTAMPTZ | Date MAJ statut |
| first_payment_date | DATE | Date 1er paiement |
| created_at | TIMESTAMPTZ | Date création |

### `magic_links`
Liens magiques temporaires.

| Colonne | Type | Description |
|---------|------|-------------|
| id | UUID | ID unique (PK) |
| application_id | TEXT | FK → applications |
| token_hash | TEXT | Hash du token (UNIQUE) |
| expires_at | TIMESTAMPTZ | Date d'expiration |
| max_uses | INT | Nombre max d'utilisations |
| uses | INT | Nombre d'utilisations |
| revoked_at | TIMESTAMPTZ | Date de révocation |
| created_at | TIMESTAMPTZ | Date création |
| last_used_at | TIMESTAMPTZ | Dernière utilisation |

### `application_events`
Journal d'événements.

| Colonne | Type | Description |
|---------|------|-------------|
| id | UUID | ID unique (PK) |
| application_id | TEXT | FK → applications |
| type | TEXT | Type d'événement |
| payload | JSONB | Données additionnelles |
| created_at | TIMESTAMPTZ | Date création |

### `client_notes`
Messages visibles pour le client.

| Colonne | Type | Description |
|---------|------|-------------|
| id | UUID | ID unique (PK) |
| application_id | TEXT | FK → applications |
| message | TEXT | Contenu du message |
| visible_to_client | BOOLEAN | Visible au client ? |
| created_at | TIMESTAMPTZ | Date création |

## 🔐 Sécurité

### Validation des tokens

1. Token généré en 32 bytes aléatoires
2. Hash SHA-256 stocké en DB
3. Comparaison en constant-time
4. Expiration stricte (48h)
5. Limite d'utilisation (20 max)
6. Révocation possible

### Rate limiting

- **Client routes** : 20 req/min par IP
- **Admin routes** : Protected par API key

### Protection admin

Toutes les routes `/api/admin/*` nécessitent :
```bash
Header: x-api-key: VOTRE_ADMIN_API_KEY
```

## 📡 API Routes

### Routes Client (PUBLIC)

#### `GET /api/status?t=TOKEN`

Récupère le statut de la demande.

**Query params :**
- `t` : Token du magic link

**Response :**
```json
{
  "success": true,
  "data": {
    "application": { ... },
    "notes": [ ... ],
    "progress": {
      "currentStep": 2,
      "totalSteps": 7,
      "steps": [ ... ]
    }
  }
}
```

#### `GET /suivi?t=TOKEN`

Page web de suivi (UI client).

---

### Routes Admin (PROTECTED)

Toutes nécessitent le header `x-api-key`.

#### `POST /api/admin/magic-link`

Crée un magic link et envoie par SMS.

**Body :**
```json
{
  "application_id": "APP-123",
  "phone": "+15141234567"
}
```

**Response :**
```json
{
  "success": true,
  "data": {
    "magic_link_id": "uuid",
    "url": "https://progression.../suivi?t=xxxxx",
    "expires_at": "2026-01-07T...",
    "max_uses": 20
  }
}
```

#### `POST /api/admin/event`

Crée un événement et met à jour le statut.

**Body :**
```json
{
  "application_id": "APP-123",
  "event_type": "status_change",
  "status": "APPROVED",
  "payload": {
    "name": "Jean Tremblay",
    "email": "jean@example.com",
    "amount_cents": 500000
  }
}
```

#### `POST /api/admin/note`

Ajoute une note visible au client.

**Body :**
```json
{
  "application_id": "APP-123",
  "message": "Votre dossier est en cours d'analyse.",
  "visible_to_client": true
}
```

---

### Cron Job

#### `GET /api/cron/cleanup`

Nettoie les magic links expirés/révoqués.

**Auth :** Header `Authorization: Bearer CRON_SECRET`

Configurer dans `vercel.json` :
```json
{
  "crons": [{
    "path": "/api/cron/cleanup",
    "schedule": "0 * * * *"
  }]
}
```

## 🎨 Statuts disponibles

```typescript
'RECEIVED'          // Demande reçue
'IBV_PENDING'       // Vérification en cours
'READY_TO_ANALYZE'  // Prêt pour analyse
'OFFER_SENT'        // Offre envoyée
'APPROVED'          // Approuvé
'REFUSED'           // Refusé
'MARGILL_SYNCED'    // Synchronisé (Margill)
'ACTIVE'            // Actif
'NO_RESPONSE'       // Aucune réponse
```

## 🧪 Tests CURL

### Créer une application et magic link

```bash
# 1. Créer un événement + application
curl -X POST http://localhost:3001/api/admin/event \
  -H "Content-Type: application/json" \
  -H "x-api-key: VOTRE_ADMIN_API_KEY" \
  -d '{
    "application_id": "TEST-001",
    "event_type": "application_created",
    "status": "RECEIVED",
    "payload": {
      "name": "Jean Test",
      "email": "jean@test.com",
      "phone": "+15141234567",
      "amount_cents": 100000
    }
  }'

# 2. Générer un magic link
curl -X POST http://localhost:3001/api/admin/magic-link \
  -H "Content-Type: application/json" \
  -H "x-api-key: VOTRE_ADMIN_API_KEY" \
  -d '{
    "application_id": "TEST-001",
    "phone": "+15141234567"
  }'

# 3. Ajouter une note
curl -X POST http://localhost:3001/api/admin/note \
  -H "Content-Type: application/json" \
  -H "x-api-key: VOTRE_ADMIN_API_KEY" \
  -d '{
    "application_id": "TEST-001",
    "message": "Votre dossier est en cours d'analyse. Nous vous contacterons sous peu."
  }'
```

### Tester le magic link

```bash
# Récupérer le statut (remplacer TOKEN)
curl "http://localhost:3001/api/status?t=TOKEN"
```

Ou ouvrir dans le navigateur :
```
http://localhost:3001/suivi?t=TOKEN
```

## 🚢 Déploiement Vercel

### 1. Connecter le repo

```bash
vercel
```

### 2. Configurer les variables d'environnement

Via Vercel Dashboard > Settings > Environment Variables :
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_APP_URL`
- `ADMIN_API_KEY`
- `CRON_SECRET`

### 3. Configurer le sous-domaine

Vercel Dashboard > Domains > Add :
```
progression.solutionargentrapide.ca
```

Puis configurer le DNS chez votre provider :
```
CNAME progression 76.76.21.21
```

### 4. Deploy

```bash
vercel --prod
```

Le cron se lancera automatiquement toutes les heures.

## 📝 SMS Provider

Le fichier `lib/sms.ts` contient une abstraction. Implémenter selon votre provider :

### Exemple Twilio

```typescript
import twilio from 'twilio'

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
)

export async function sendSms(params: SendSmsParams): Promise<boolean> {
  try {
    const message = await client.messages.create({
      body: params.message,
      to: params.to,
      from: process.env.TWILIO_PHONE_NUMBER,
    })
    return !!message.sid
  } catch (error) {
    console.error('SMS error:', error)
    return false
  }
}
```

## 🛠️ Développement

```bash
# Dev server
npm run dev

# Build
npm run build

# Start production
npm start

# Type check
npm run type-check

# Lint
npm run lint
```

## 📚 Logs et monitoring

- Tous les erreurs sont loggées dans la console
- En production, configurer Vercel Logs ou Sentry
- Le cron cleanup log les résultats

## 🔄 Workflow typique

1. Client fait une demande → API crée application
2. Backend appelle `/api/admin/event` → Crée application + event
3. Backend appelle `/api/admin/magic-link` → Envoie SMS
4. Client clique lien → Accède `/suivi?t=xxx`
5. Client rafraîchit → Appel `/api/status?t=xxx`
6. Backend met à jour statut → Appel `/api/admin/event`
7. Backend ajoute note → Appel `/api/admin/note`
8. Cron nettoie → Supprime liens expirés

## 🆘 Support

Pour toute question technique, contacter l'équipe dev SAR.

---

**Fait avec ❤️ par l'équipe Solution Argent Rapide**
