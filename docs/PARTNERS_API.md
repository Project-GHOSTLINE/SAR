# Partners API - Documentation

API routes pour le système Partners MVP (Solution Argent Rapide)

## 🔐 Authentification

Toutes les routes (sauf `/activate`) utilisent **cookie httpOnly** pour l'authentification:

```
Cookie: sb-access-token=<token>
Cookie: sb-refresh-token=<token>
```

**Domain**: `.solutionargentrapide.ca`
**Secure**: `true` (HTTPS only)
**SameSite**: `Lax`
**Path**: `/`

## 📡 Endpoints

### 1. POST /api/partners/activate

Activation d'un partenaire via token d'invitation.

**Request**:
```json
{
  "token": "ABC123XYZ..." // 32 chars
}
```

**Response** (200):
```json
{
  "success": true,
  "partner_id": "uuid",
  "ref_code": "ABC123",
  "message": "Activation réussie. Bienvenue au projet Partners."
}
```

**Errors**:
- `400`: Token invalide, expiré, ou déjà utilisé
- `404`: Invitation introuvable
- `429`: Rate-limit (max 5 tentatives/heure par IP)
- `500`: Erreur serveur

**Side effects**:
- Crée user Supabase Auth (`partner+<client_id>@solutionargentrapide.ca`)
- Crée `partner_profile`
- Génère `ref_code` unique
- Crée `partner_ref_link`
- Marque invitation comme utilisée
- Retourne cookies httpOnly (session 7 jours)

---

### 2. GET /api/partners/me

Dashboard data pour le partenaire authentifié.

**Auth**: Required (cookie)

**Response** (200):
```json
{
  "partner": {
    "started_at": "2026-02-02T10:00:00Z",
    "status": "active",
    "ref_code": "ABC123",
    "preferred_channels": ["whatsapp", "sms"]
  },
  "project_state": {
    "phase": "MVP - Phase test (500 partenaires)",
    "updated_at": "2026-02-02T00:00:00Z",
    "participants_active": 142,
    "changelog": [
      {
        "date": "2026-02-02",
        "change": "Lancement du programme partenaires (MVP)"
      }
    ]
  },
  "impact_cards": {
    "shares": 12,
    "clicks": 45,
    "applications": 3,
    "ibv": 2,
    "funded": 1
  },
  "credits": {
    "total": 75.00,
    "applied": 0.00,
    "available": 75.00,
    "next_apply_date": "2026-02-10T00:00:00Z"
  },
  "timeline": [
    {
      "type": "funded",
      "at": "2026-02-05T14:30:00Z",
      "label": "Prêt financé",
      "meta": {}
    }
  ]
}
```

**Errors**:
- `401`: Non authentifié ou session expirée
- `404`: Profil partenaire introuvable
- `500`: Erreur serveur

---

### 3. POST /api/partners/event

Tracking d'événements partenaires (shares, clicks).

**Auth**: Required (cookie)

**Request**:
```json
{
  "event_type": "share_whatsapp", // "click_referral" | "share_whatsapp" | "share_sms" | "share_messenger" | "share_copy"
  "ref_code": "ABC123", // optional
  "metadata": {} // optional
}
```

**Response** (200):
```json
{
  "success": true,
  "event_id": "uuid",
  "message": "Événement enregistré avec succès"
}
```

**Errors**:
- `400`: Données invalides
- `401`: Non authentifié
- `404`: Profil partenaire introuvable
- `429`: Rate-limit (max 60 events/heure par partenaire)
- `500`: Erreur serveur

**Anti-fraude**:
- Hash IP + User-Agent (privacy)
- Détection doublons (même partner + event + jour + IP)
- Flag `is_suspicious` si doublon

---

### 4. POST /api/partners/credit-engine

Calcul et attribution des crédits (trigger manuel MVP).

**Auth**: Admin secret required

**Request**:
```json
{
  "admin_secret": "your-secret-key",
  "dry_run": false // optional, default false
}
```

**Response** (200):
```json
{
  "success": true,
  "processed_count": 42,
  "credits_awarded": 1050.00,
  "errors": [],
  "dry_run": false
}
```

**Errors**:
- `400`: Données invalides
- `403`: Secret invalide
- `500`: Erreur serveur

**Règles de crédits**:
- `application_submitted`: +10 crédits
- `ibv_completed`: +15 crédits
- `funded`: +50 crédits

**Plafond**: 150 crédits / partenaire / 30 jours

**Idempotence**: Même attribution ne génère qu'un seul crédit (vérification via `source_event_id` + `source_type`).

---

## 🛡️ Sécurité

### Rate-limiting

- `/activate`: 5 tentatives/heure par IP
- `/event`: 60 events/heure par partenaire

### Anti-fraude

- Hash IP/UA/Email/Phone (SHA256)
- Détection doublons événements
- Plafond crédits 30 jours
- Audit trail complet (ledger append-only)

### RLS Supabase

- Partners: Read-only sur leurs données (via `auth.uid()`)
- Writes: Service role uniquement (via API)
- Zero écriture directe client-side sur tables sensibles

### Cookies

- `httpOnly`: true (pas accessible via JavaScript)
- `secure`: true (HTTPS only)
- `sameSite`: Lax (protection CSRF)
- `domain`: `.solutionargentrapide.ca` (partage sous-domaines)

---

## 🧪 Testing

### Test activation (local)

```bash
curl -X POST http://localhost:3000/api/partners/activate \
  -H "Content-Type: application/json" \
  -d '{"token":"ABC123XYZ..."}'
```

### Test dashboard (avec cookie)

```bash
curl http://localhost:3000/api/partners/me \
  -H "Cookie: sb-access-token=<token>"
```

### Test event tracking

```bash
curl -X POST http://localhost:3000/api/partners/event \
  -H "Content-Type: application/json" \
  -H "Cookie: sb-access-token=<token>" \
  -d '{"event_type":"share_whatsapp","ref_code":"ABC123"}'
```

### Test credit-engine (dry-run)

```bash
curl -X POST http://localhost:3000/api/partners/credit-engine \
  -H "Content-Type: application/json" \
  -d '{"admin_secret":"your-secret","dry_run":true}'
```

---

## 📝 Variables d'environnement

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
SUPABASE_SERVICE_ROLE_KEY=eyJxxx...

# Admin
ADMIN_SECRET=your-secret-key-32-chars-min
JWT_SECRET=your-jwt-secret (fallback pour admin_secret)
```

---

## 🔄 Flow complet (Happy Path)

1. **Client reçoit invitation email**: `https://partners.solutionargentrapide.ca/invite?token=ABC123`
2. **Accepte consent** → `POST /api/partners/activate`
3. **Session créée** (cookies httpOnly)
4. **Redirect vers onboarding** → `/onboarding`
5. **Dashboard** → `GET /api/partners/me`
6. **Partage lien** → `POST /api/partners/event` (share_whatsapp)
7. **Client clique** → Attribution tracée (via cookie `first_ref`)
8. **Client applique** → `partner_attributions` créée
9. **Cron job quotidien** → `POST /api/partners/credit-engine` (calcul crédits)
10. **Dashboard** → Voir crédits gagnés

---

**Dernière mise à jour**: 2026-02-02
**Version**: 1.0.0 (MVP)
