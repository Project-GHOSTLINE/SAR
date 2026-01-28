# 🔏 Système de Signature Électronique SAR

Système de signature électronique intégré dans le projet SAR principal.

## 🚀 Fonctionnalités

✅ **Création de contrats**
- Upload de PDF via API
- Définition des zones de signature/initiales
- Génération de lien sécurisé avec expiration (7 jours)

✅ **Signature électronique**
- Interface web moderne et responsive
- Capture de signature manuscrite (canvas)
- Application directe sur le PDF

✅ **Workflow complet**
- Email automatique au client avec lien
- Statuts: `pending` → `viewed` → `signed`
- Audit trail complet (IP, timestamp, user-agent)

✅ **Dashboard Admin**
- Vue d'ensemble de tous les documents
- Statistiques en temps réel (taux de signature, etc.)
- Téléchargement des PDFs signés
- Accessible à: `/admin/contrats-clients`

---

## 📦 Installation

### 1️⃣ Dépendances installées

```bash
npm install pdf-lib resend signature_pad
```

### 2️⃣ Variables d'environnement

Déjà configurées dans `.env.local`:

```env
SUPABASE_URL=https://dllyzfuqjzuhvshrlmuq.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...
RESEND_API_KEY=...
FROM_EMAIL=SAR <noreply@solutionargentrapide.ca>
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

### 3️⃣ Configuration Supabase Storage

Créer le bucket "contrats":

```bash
npx tsx setup-signature-storage.ts
```

### 4️⃣ Tester le système

```bash
npx tsx test-signature-system.ts
```

---

## 🗂️ Structure du Code

```
src/
├── app/
│   ├── admin/
│   │   └── contrats-clients/
│   │       └── page.tsx                    # Dashboard admin
│   ├── api/
│   │   ├── admin/
│   │   │   └── contrats-clients/
│   │   │       └── route.ts                # API CRUD contrats
│   │   └── sign/
│   │       └── [id]/
│   │           ├── route.ts                # GET document pour signature
│   │           └── submit/
│   │               └── route.ts            # POST soumettre signature
│   └── sign/
│       └── [id]/
│           └── page.tsx                    # Page de signature client
```

---

## 📡 API Endpoints

### Créer un contrat

```bash
POST /api/admin/contrats-clients
Content-Type: application/json

{
  "clientName": "Jean Tremblay",
  "clientEmail": "jean@example.com",
  "title": "Contrat de prêt 5000$",
  "pdfBase64": "JVBERi0xLjQK...",
  "signatureFields": [
    {
      "id": "sig1",
      "type": "signature",
      "label": "Signature",
      "page": 1,
      "x": 100,
      "y": 500,
      "width": 200,
      "height": 80
    },
    {
      "id": "init1",
      "type": "initials",
      "label": "Initiales",
      "page": 1,
      "x": 400,
      "y": 500,
      "width": 100,
      "height": 50
    }
  ]
}
```

**Réponse:**
```json
{
  "success": true,
  "documentId": "abc-123-def",
  "signUrl": "http://localhost:3000/sign/abc-123-def?token=xyz789",
  "expiresAt": "2026-02-04T10:00:00Z"
}
```

### Lister tous les contrats

```bash
GET /api/admin/contrats-clients
```

### Charger document pour signature

```bash
GET /api/sign/{documentId}?token=xyz789
```

### Soumettre la signature

```bash
POST /api/sign/{documentId}/submit
Content-Type: application/json

{
  "token": "xyz789",
  "signatures": [
    {
      "fieldId": "sig1",
      "data": "data:image/png;base64,iVBORw0KGgo..."
    },
    {
      "fieldId": "init1",
      "data": "data:image/png;base64,iVBORw0KGgo..."
    }
  ]
}
```

---

## 🔄 Workflow Complet

```
1. Admin crée le contrat
   ├─ Upload PDF en base64
   ├─ Définit zones de signature
   └─ POST /api/admin/contrats-clients

2. Backend SAR
   ├─ Sauvegarde PDF dans Supabase Storage
   ├─ Crée entrée en base de données
   ├─ Génère token sécurisé
   └─ Envoie email au client

3. Client reçoit email → Clic sur lien

4. Page de signature (/sign/{id})
   ├─ Capture initiales (si besoin)
   ├─ Capture signature
   ├─ Affiche PDF avec zones cliquables
   └─ Client clique pour apposer signatures

5. Soumission
   ├─ Embed signatures dans PDF (pdf-lib)
   ├─ Upload PDF signé dans Supabase Storage
   ├─ Update statut: "signed"
   ├─ Email client (avec PDF joint)
   └─ Email admin (avec PDF joint)
```

---

## 📊 Base de Données

### Table `signature_documents`

| Colonne | Type | Description |
|---------|------|-------------|
| `id` | UUID | ID interne |
| `document_id` | TEXT | ID public (UUID) |
| `client_name` | TEXT | Nom du client |
| `client_email` | TEXT | Email du client |
| `title` | TEXT | Titre du document |
| `original_pdf_url` | TEXT | URL PDF original |
| `signed_pdf_url` | TEXT | URL PDF signé |
| `signature_fields` | JSONB | Zones de signature |
| `sign_token` | TEXT | Token sécurisé |
| `token_expires_at` | TIMESTAMPTZ | Expiration (7j) |
| `status` | TEXT | pending/viewed/signed/expired |
| `created_at` | TIMESTAMPTZ | Date création |
| `viewed_at` | TIMESTAMPTZ | Date consultation |
| `signed_at` | TIMESTAMPTZ | Date signature |
| `signed_ip` | TEXT | IP du signataire |
| `signed_user_agent` | TEXT | User agent |

### Table `signature_audit_logs`

| Colonne | Type | Description |
|---------|------|-------------|
| `id` | UUID | ID log |
| `document_id` | TEXT | Référence document |
| `action` | TEXT | Type d'action |
| `details` | JSONB | Détails supplémentaires |
| `timestamp` | TIMESTAMPTZ | Quand |
| `ip_address` | TEXT | IP |
| `user_agent` | TEXT | Navigateur |

---

## 🎨 Interface Utilisateur

### Dashboard Admin (`/admin/contrats-clients`)

- 📊 **Stats Cards**: Total, En attente, Consultés, Signés, Taux de signature
- 🔍 **Filtres**: Recherche par nom/email, filtre par statut
- 📋 **Tableau**: Liste tous les contrats avec actions
- 🔄 **Actualisation**: Bouton refresh en temps réel
- ⬇️ **Actions**: Télécharger PDF signé, Copier lien de signature

### Page de Signature Client (`/sign/{id}`)

**Étape 1: Capture des initiales**
- Canvas HTML5 avec signature_pad
- Boutons Effacer / Continuer

**Étape 2: Capture de la signature**
- Canvas HTML5 avec signature_pad
- Boutons Effacer / Commencer à signer

**Étape 3: Signature du document**
- Affichage du PDF dans iframe
- Liste des champs à signer
- Indicateur de progression (X/Y signés)
- Bouton "Terminer et envoyer" (activé quand tout est signé)

**Étape 4: Confirmation**
- Message de succès
- Confirmation d'envoi par email

---

## 🛡️ Sécurité

✅ **Tokens sécurisés**
- Génération crypto.randomBytes(32)
- Expiration automatique (7 jours)
- Vérification à chaque requête

✅ **Audit trail**
- Traçabilité complète
- IP + timestamp + user-agent
- Logs dans `signature_audit_logs`

✅ **Protection des données**
- URLs publiques mais token requis
- RLS Supabase activé
- Service role pour les opérations sensibles

---

## 📧 Emails

### Email au client (création)

- Template professionnel aux couleurs SAR
- Bouton CTA "Signer mon contrat"
- Info d'expiration (7 jours)
- Lien personnel et sécurisé

### Email au client (signature)

- Confirmation de signature
- PDF signé en pièce jointe
- Date et heure de signature
- Infos légales (IP, timestamp)

### Email admin (signature)

- Notification de nouvelle signature
- Détails du client
- PDF signé en pièce jointe
- Lien vers le dashboard

---

## 🧪 Tests

### Test complet du système

```bash
npx tsx test-signature-system.ts
```

Ce script:
1. Crée un document de test
2. Génère le lien de signature
3. Affiche le lien pour test manuel
4. Envoie un email de test

### Test manuel

1. Démarrer le serveur: `npm run dev`
2. Exécuter le script de test
3. Ouvrir le lien généré
4. Tester le flow complet de signature

---

## 🚀 Déploiement sur Vercel

### Variables d'environnement à configurer

```env
SUPABASE_URL=https://dllyzfuqjzuhvshrlmuq.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...
RESEND_API_KEY=...
FROM_EMAIL=SAR <noreply@solutionargentrapide.ca>
NEXT_PUBLIC_BASE_URL=https://solutionargentrapide.ca
```

### Commandes de déploiement

```bash
git add .
git commit -m "feat: Integrate SAR-Signature system"
git push origin main
```

Vercel détectera automatiquement le push et déploiera.

---

## 📝 Notes

- **Storage**: Les PDFs sont stockés dans Supabase Storage bucket "contrats"
- **Emails**: Limite Resend = 3000 emails/mois (plan gratuit)
- **Expiration**: Liens de signature valides 7 jours
- **Format**: Seuls les PDFs sont acceptés

---

## 🆘 Support

Pour toute question:
- anthony@solutionargentrapide.ca
- Dashboard: https://solutionargentrapide.ca/admin/contrats-clients

---

## 📄 Licence

Propriété de **Solution Argent Rapide** © 2026
