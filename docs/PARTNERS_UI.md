# Partners UI - Documentation

Interface utilisateur pour le système Partners MVP (Solution Argent Rapide)

## 🎨 Principes UX

### Ton & Style
- ✅ **Sobre, transparence radicale**
- ✅ **"Projet en développement" vibe**
- ❌ **NO marketing vendeur**
- ❌ **NO promesse de revenu**

### Wording interdit
- ❌ "Gagne de l'argent"
- ❌ "Invite tes amis"
- ❌ "Ambassadeur"
- ❌ "Niveau" / "Badges"

### Wording approuvé
- ✅ "Contribution mesurée"
- ✅ "Contrepartie claire"
- ✅ "Partager une information"
- ✅ "Impact mesuré"
- ✅ "Crédits"
- ✅ "Facultatif"

---

## 📂 Structure Pages

```
app/(partners)/
├── layout.tsx              # Layout principal (header sobre + footer)
├── page.tsx                # Root redirect → /invite
├── invite/
│   └── page.tsx           # Activation via token + consent
├── onboarding/
│   └── page.tsx           # Objectifs + préférences (facultatif)
├── dashboard/
│   └── page.tsx           # ⭐ Page centrale (Impact → Crédits → Action)
├── contribute/
│   └── page.tsx           # Partage info (copy/paste + deep links)
├── credits/
│   └── page.tsx           # Ledger transparent + règles
├── project/
│   └── page.tsx           # ⭐ Page de CONFIANCE (pourquoi le projet existe)
└── feedback/
    └── page.tsx           # Feedback facultatif (3 questions)
```

---

## 🧭 User Flow

### 1. Activation (première visite)
```
Email invitation
  ↓
partners.solutionargentrapide.ca/invite?token=XXX
  ↓
Consent simple (opt-in)
  ↓
POST /api/partners/activate
  ↓
Session créée (cookie httpOnly)
  ↓
Redirect → /onboarding (facultatif)
  ↓
Redirect → /dashboard
```

### 2. Utilisation normale
```
Dashboard (/dashboard)
  ↓
Voir impact mesuré (cards)
  ↓
Voir crédits disponibles
  ↓
Action: "Partager une information" → /contribute
  ↓
Copier lien ou deep link (WhatsApp/SMS/Messenger)
  ↓
POST /api/partners/event (tracking)
  ↓
Retour dashboard
```

### 3. Confiance & transparence
```
Dashboard → Link "Voir pourquoi ce projet existe"
  ↓
/project (page de confiance)
  ↓
Lecture: objectif, ce qu'on apprend, changelog, ce qui ne marche pas
  ↓
Optionnel: /feedback (donner son avis)
```

---

## 📄 Pages détaillées

### `/invite` - Activation
**Objectif**: Activer le partenaire via token d'invitation

**Éléments**:
- Explication sobre du projet
- "Ce que cela signifie" (bullet points factuels)
- "Ce que ce n'est pas" (clarifications)
- Consent opt-in simple (checkbox)
- Bouton "Accepter et continuer"

**API appelée**: `POST /api/partners/activate`

**Redirect**: `/onboarding` après activation

---

### `/onboarding` - Configuration (facultatif)
**Objectif**: Recueillir préférences (canaux, objectifs)

**Éléments**:
- Étape 1/2: Canaux préférés (WhatsApp, SMS, Messenger)
- Étape 2/2: Objectifs personnels (textarea libre, optionnel)
- Bouton "Passer cette étape" toujours visible

**API appelée**: Aucune (pour MVP, pas de sauvegarde préférences)

**Redirect**: `/dashboard`

---

### `/dashboard` - Tableau de bord ⭐
**Objectif**: Vue centrale de l'activité partenaire

**Ordre d'affichage** (STRICT):
1. **État du projet** (contexte)
2. **Impact mesuré** (5 cards: shares, clicks, applications, ibv, funded)
3. **Crédits** (total, appliqué, disponible)
4. **Prochaine action** (simple: "Partager une information")
5. **Timeline** (dernières actions)
6. **Link vers /project** (confiance)

**API appelée**: `GET /api/partners/me` (payload unique)

**NO write direct Supabase côté client**

---

### `/contribute` - Partage information
**Objectif**: Partager le lien de référence (copy/paste + deep links)

**Wording**: "Partager une information" (PAS "invite tes amis")

**Éléments**:
- Choix canal (Copy, WhatsApp, SMS, Messenger)
- Lien de référence (input readonly + bouton copier)
- Message suggéré (textarea readonly, modifiable mentalement)
- Deep links uniquement (NO connexion Gmail/FB)

**API appelée**:
- `GET /api/partners/me` (récupérer ref_code)
- `POST /api/partners/event` (tracking share)

**Deep links**:
- WhatsApp: `https://wa.me/?text=...`
- SMS: `sms:?body=...`
- Messenger: `fb-messenger://share?link=...`

**Note transparence**: "Nous ne récupérons pas vos contacts"

---

### `/credits` - Ledger transparent
**Objectif**: Afficher historique crédits + règles claires

**Éléments**:
- Résumé (total, appliqué, disponible)
- Règles MVP (table: événement → crédits)
- Plafond 150 crédits/30j
- Historique ledger (placeholder - À implémenter endpoint dédié)
- Note transparence (audit trail)

**API appelée**: `GET /api/partners/me` (pour résumé)

---

### `/project` - Page de confiance ⭐
**Objectif**: Transparence radicale sur le projet

**Sections**:
1. **Objectif du test** (hypothèse à valider)
2. **Ce qu'on apprend** (en temps réel)
3. **Changelog** (historique changements)
4. **Ce qui ne marche pas (encore)** (transparence radicale)
5. **Règles de crédits** (MVP)
6. **Contact & feedback** (link vers /feedback)

**Ton**: Factuel, sobre, "projet en développement"

**NO API appelée** (page statique avec copy)

---

### `/feedback` - Feedback facultatif
**Objectif**: Recueillir avis partenaires (3 questions max)

**Questions**:
1. "Le projet et ses règles sont-ils clairs ?" (radio: Très clair / Plutôt clair / Confus)
2. "Est-ce facile de partager votre lien ?" (radio: Très facile / Plutôt facile / Difficile)
3. "Suggestions d'amélioration ?" (textarea optionnel)

**API appelée**: `POST /api/partners/feedback`

**Redirect**: `/dashboard` après soumission

---

## 🔐 Sécurité Client-Side

### ✅ Ce que l'UI PEUT faire
- Lire données via `GET /api/partners/me`
- Tracker événements via `POST /api/partners/event`
- Soumettre feedback via `POST /api/partners/feedback`

### ❌ Ce que l'UI NE PEUT PAS faire
- **Aucun write direct Supabase** côté client
- **Aucune modification** de crédits/ledger/attributions
- **Aucune exposition** du service role

### Auth
- Session via **cookie httpOnly** (`sb-access-token`)
- Aucun access token stocké en localStorage
- Cookie `Domain=.solutionargentrapide.ca` (partage sous-domaines)

---

## 🎨 Styling (Tailwind)

### Palette couleurs
- **Primary**: `blue-600` (actions, liens)
- **Success**: `green-600` (crédits appliqués, funded)
- **Warning**: `amber-50/200/800` (notes, clarifications)
- **Neutral**: `gray-50/100/200/600/900` (backgrounds, borders, text)

### Components
- **Cards**: `bg-white border border-gray-200 rounded-lg p-6`
- **Buttons primary**: `bg-blue-600 text-white font-medium py-3 px-6 rounded-lg hover:bg-blue-700`
- **Buttons secondary**: `bg-gray-100 text-gray-700 font-medium py-3 px-6 rounded-lg hover:bg-gray-200`
- **Info blocks**: `bg-blue-50 border border-blue-200 rounded-lg p-6`
- **Warning blocks**: `bg-amber-50 border border-amber-200 rounded-lg p-6`

---

## 🧪 Testing Local

### 1. Simuler activation
1. Créer un invite token dans DB (via script seed ou SQL direct)
2. Ouvrir: `http://localhost:3000/invite?token=XXX`
3. Accepter consent
4. Vérifier session créée (cookie dans DevTools)

### 2. Tester dashboard
1. Après activation, naviguer vers `/dashboard`
2. Vérifier que `GET /api/partners/me` retourne payload
3. Vérifier cards, crédits, timeline

### 3. Tester partage
1. Sur `/contribute`, copier lien
2. Vérifier `POST /api/partners/event` appelé (DevTools Network)
3. Tester deep links (WhatsApp, SMS)

### 4. Tester feedback
1. Sur `/feedback`, remplir 3 questions
2. Soumettre
3. Vérifier `POST /api/partners/feedback` appelé

---

## 🚀 Sous-domaine Routing

### Middleware (src/middleware.ts)
```typescript
// Handle partners subdomain
if (hostname.startsWith('partners.')) {
  if (pathname === '/') {
    return NextResponse.rewrite(new URL('/invite', request.url))
  }
  // Allow direct access to (partners) routes
  return NextResponse.next()
}
```

### Vercel Config
1. Ajouter domaine custom: `partners.solutionargentrapide.ca`
2. Pointer vers même déploiement Vercel
3. Cloudflare DNS: CNAME `partners` → `cname.vercel-dns.com`

---

## 📊 Métriques à tracker

### Activation
- Taux conversion token → activation
- Taux abandon onboarding
- Temps moyen activation

### Engagement
- Partages par canal (WhatsApp > SMS > Messenger)
- Fréquence retour dashboard
- Taux lecture /project

### Feedback
- Taux réponse feedback
- Distribution clarté (Très clair / Plutôt clair / Confus)
- Top suggestions amélioration

---

**Dernière mise à jour**: 2026-02-02
**Version**: 1.0.0 (MVP)
