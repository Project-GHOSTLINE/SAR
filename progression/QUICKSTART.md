# 🚀 Quick Start Guide

## Étape 1 : Configuration Supabase

### Créer le projet Supabase

1. Aller sur [supabase.com](https://supabase.com)
2. Créer un nouveau projet
3. Aller dans **SQL Editor**
4. Copier-coller le contenu de `supabase/migrations/001_initial_schema.sql`
5. Exécuter la migration

### Récupérer les clés

1. Aller dans **Settings** > **API**
2. Copier :
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - anon public → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - service_role → `SUPABASE_SERVICE_ROLE_KEY` (⚠️ SECRET)

## Étape 2 : Configuration .env

Éditer le fichier `.env` :

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
NEXT_PUBLIC_APP_URL=http://localhost:3001
ADMIN_API_KEY=votre-cle-admin-secrete
```

Pour générer `ADMIN_API_KEY` :
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Étape 3 : Lancer le serveur

```bash
npm run dev
```

Le serveur démarre sur **http://localhost:3001**

## Étape 4 : Tester l'API

### 1. Créer une application

```bash
curl -X POST http://localhost:3001/api/admin/event \
  -H "Content-Type: application/json" \
  -H "x-api-key: VOTRE_ADMIN_API_KEY" \
  -d '{
    "application_id": "DEMO-001",
    "event_type": "application_created",
    "status": "RECEIVED",
    "payload": {
      "name": "Jean Tremblay",
      "email": "jean@test.com",
      "phone": "+15141234567",
      "amount_cents": 500000
    }
  }'
```

### 2. Générer un magic link

```bash
curl -X POST http://localhost:3001/api/admin/magic-link \
  -H "Content-Type: application/json" \
  -H "x-api-key: VOTRE_ADMIN_API_KEY" \
  -d '{
    "application_id": "DEMO-001",
    "phone": "+15141234567"
  }'
```

**Réponse :**
```json
{
  "success": true,
  "data": {
    "magic_link_id": "uuid",
    "url": "http://localhost:3001/suivi?t=xxxxx",
    "expires_at": "2026-01-07T...",
    "max_uses": 20
  }
}
```

### 3. Tester le lien

Copier l'URL retournée et l'ouvrir dans le navigateur :
```
http://localhost:3001/suivi?t=xxxxx
```

Tu devrais voir la page de suivi avec la progression !

### 4. Ajouter une note

```bash
curl -X POST http://localhost:3001/api/admin/note \
  -H "Content-Type: application/json" \
  -H "x-api-key: VOTRE_ADMIN_API_KEY" \
  -d '{
    "application_id": "DEMO-001",
    "message": "Votre dossier est en cours d'analyse. Nous vous contacterons sous peu."
  }'
```

Rafraîchir la page `/suivi` pour voir la note apparaître !

### 5. Mettre à jour le statut

```bash
curl -X POST http://localhost:3001/api/admin/event \
  -H "Content-Type: application/json" \
  -H "x-api-key: VOTRE_ADMIN_API_KEY" \
  -d '{
    "application_id": "DEMO-001",
    "event_type": "status_update",
    "status": "APPROVED"
  }'
```

Rafraîchir la page `/suivi` pour voir la progression mise à jour !

## ✅ Checklist avant production

- [ ] Variables d'environnement configurées dans Vercel
- [ ] Migration SQL exécutée sur Supabase
- [ ] `ADMIN_API_KEY` généré et sécurisé
- [ ] `CRON_SECRET` configuré pour le cron job
- [ ] DNS configuré pour `progression.solutionargentrapide.ca`
- [ ] SMS provider configuré dans `lib/sms.ts`
- [ ] Tests effectués en dev

## 📝 Notes importantes

1. **Aucun login** - Le token dans l'URL est l'unique authentification
2. **Expiration 48h** - Les liens expirent automatiquement
3. **Rate limiting** - 20 requêtes/min par IP
4. **Sécurité** - Tokens hashés, jamais stockés en clair
5. **Cron** - Nettoie automatiquement les liens expirés

## 🆘 Problèmes courants

### "Missing env variables"
→ Vérifier que toutes les variables dans `.env` sont remplies

### "Token invalide ou expiré"
→ Le token a expiré (48h) ou a atteint sa limite d'utilisation (20)
→ Générer un nouveau magic link

### "Non autorisé" sur routes admin
→ Vérifier le header `x-api-key` dans la requête

### SMS non reçu
→ En dev, les SMS sont juste loggés dans la console
→ En prod, implémenter `lib/sms.ts` avec un vrai provider

## 🚢 Déploiement rapide

```bash
# Installer Vercel CLI
npm i -g vercel

# Deploy
vercel

# Config variables d'environnement dans Vercel Dashboard

# Deploy en prod
vercel --prod
```

---

**Prêt à déployer ? Voir le README.md pour plus de détails !**
