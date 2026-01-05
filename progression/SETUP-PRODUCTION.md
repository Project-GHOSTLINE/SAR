# 🚀 Configuration Production - Portail Progression

## ✅ Checklist de mise en production

### 1. Variables d'environnement Vercel

Va sur: https://vercel.com/project-ghostline/progression/settings/environment-variables

Ajoute ces variables (pour **Production, Preview, Development**):

```env
NEXT_PUBLIC_SUPABASE_URL=https://dllyzfuqjzuhvshrlmuq.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRsbHl6ZnVxanp1aHZzaHJsbXVxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU5OTU5ODEsImV4cCI6MjA4MTU3MTk4MX0.xskVblRlKdbTST1Mdgz76oR7N2rDq8ZOUgaN-f_TTM4
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRsbHl6ZnVxanp1aHZzaHJsbXVxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTk5NTk4MSwiZXhwIjoyMDgxNTcxOTgxfQ.Qg5eQwDxeAtTDXplNkQZa4hOp_dSMBIu_DKbuquryFo
NEXT_PUBLIC_APP_URL=https://progression.solutionargentrapide.ca
ADMIN_API_KEY=FredRosa%1978
CRON_SECRET=cron-secret-progression-sar-2026
```

**Après avoir ajouté les variables, redéploie:**
```bash
cd "/Users/xunit/Desktop/📁 Projets/sar/progression"
vercel --prod --yes
```

---

### 2. Créer une application de test dans Supabase

1. Va sur: https://supabase.com/dashboard/project/dllyzfuqjzuhvshrlmuq/editor
2. Ouvre l'éditeur SQL
3. Copie-colle le contenu de `supabase/test-application.sql`
4. Clique sur **Run**

Cela va créer:
- Application ID: `TEST-2026-001`
- Client: Jean Tremblay
- Statut: IBV_COMPLETED (étape 2)
- Montant: 5000$ CAD

---

### 3. Générer un magic link

Exécute le script:
```bash
cd "/Users/xunit/Desktop/📁 Projets/sar/progression"
./test-magic-link.sh
```

Tu recevras une réponse comme:
```json
{
  "success": true,
  "magic_link_url": "https://progression.solutionargentrapide.ca/suivi?t=ABC123...",
  "expires_at": "2026-01-07T20:00:00Z"
}
```

---

### 4. Tester le lien

Copie le `magic_link_url` et ouvre-le dans:
- **Desktop** (Chrome/Safari)
- **Mobile** (ton téléphone)

Tu devrais voir:
- Barre de progression à l'étape 2/8 "IBV reçu"
- Informations du client (Jean Tremblay)
- Note de bienvenue

---

## 📱 Utilisation en production

### Pour créer une vraie application:

1. **Dans Supabase**, insère une nouvelle application:
```sql
INSERT INTO applications (
  id, origin, name, email, phone, amount_cents, status
) VALUES (
  'APP-2026-001',
  'Site Web',
  'Nom du client',
  'email@client.com',
  '+15141234567',
  300000,
  'RECEIVED'
);
```

2. **Génère un magic link via API**:
```bash
curl -X POST https://progression.solutionargentrapide.ca/api/admin/magic-link \
  -H "Content-Type: application/json" \
  -H "x-api-key: FredRosa%1978" \
  -d '{
    "application_id": "APP-2026-001"
  }'
```

3. **Envoie le lien au client par SMS**

---

## 🔄 Mettre à jour le statut d'une application

```bash
curl -X POST https://progression.solutionargentrapide.ca/api/admin/event \
  -H "Content-Type: application/json" \
  -H "x-api-key: FredRosa%1978" \
  -d '{
    "application_id": "APP-2026-001",
    "new_status": "OFFER_SENT",
    "note": "Offre envoyée par courriel"
  }'
```

---

## 📝 Ajouter une note client

```bash
curl -X POST https://progression.solutionargentrapide.ca/api/admin/note \
  -H "Content-Type: application/json" \
  -H "x-api-key: FredRosa%1978" \
  -d '{
    "application_id": "APP-2026-001",
    "message": "Votre dossier est en cours de vérification."
  }'
```

---

## 🎯 Statuts disponibles

### Étapes visibles aux clients (8):
1. `RECEIVED` - Demande reçue
2. `IBV_COMPLETED` - IBV reçu
3. `ANALYSIS_IN_PROGRESS` - Analyse du dossier
4. `OFFER_SENT` - Offre envoyée
5. `APPROVED_BY_CLIENT` - Offre approuvée
6. `AWAITING_SIGNATURE` - Signature requise
7. `SIGNED` - Contrat signé
8. `ACTIVE` - Prêt actif

### Statuts internes (masqués):
- `IBV_PENDING` - En attente IBV
- `OFFER_PENDING` - Offre en préparation
- `CONTRACT_PREPARATION` - Préparation contrat
- `CONTRACT_SENT` - Contrat envoyé
- `FUNDS_TRANSFER` - Transfert de fonds
- `REFUSED` - Refusé
- `NO_RESPONSE` - Sans réponse

---

## 🔐 Sécurité

- **Magic links**: 48h de validité, 20 utilisations max
- **API Admin**: Protégée par `X-Admin-Key`
- **Cron cleanup**: Nettoie les liens expirés quotidiennement
- **Rate limiting**: 20 req/min par IP

---

## 📞 Support

En cas de problème:
1. Vérifie les logs Vercel: https://vercel.com/project-ghostline/progression
2. Vérifie les données Supabase: https://supabase.com/dashboard/project/dllyzfuqjzuhvshrlmuq
3. Vérifie que les variables d'environnement sont bien configurées
