# 🚀 Guide de déploiement - Sous-domaine progression

## 📋 Information actuelle

**Domaine principal :** `solutionargentrapide.ca`
**Registrar :** GoDaddy
**Nameservers :** `ns49.domaincontrol.com`, `ns50.domaincontrol.com`
**IP Vercel actuelle :** `76.76.21.21`

**Sous-domaine à créer :** `progression.solutionargentrapide.ca`

---

## Étape 1 : Déployer sur Vercel

### Option A : Via Vercel Dashboard (Recommandé)

1. Aller sur [vercel.com/dashboard](https://vercel.com/dashboard)
2. Cliquer sur **"Add New"** → **"Project"**
3. Importer le repo Git ou uploader le dossier `progression`
4. Configuration :
   - **Framework Preset :** Next.js
   - **Root Directory :** `./` (si tu upload juste le dossier progression)
   - **Build Command :** `npm run build`
   - **Output Directory :** `.next`
5. Ajouter les **Environment Variables** :
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
   SUPABASE_SERVICE_ROLE_KEY=eyJxxx...
   NEXT_PUBLIC_APP_URL=https://progression.solutionargentrapide.ca
   ADMIN_API_KEY=votre-cle-admin
   CRON_SECRET=votre-cle-cron
   ```
6. Cliquer **"Deploy"**

### Option B : Via CLI

```bash
cd /Users/xunit/Desktop/📁\ Projets/sar/progression

# Installer Vercel CLI si pas déjà fait
npm i -g vercel

# Login (si pas déjà fait)
vercel login

# Déployer
vercel

# Répondre aux questions :
# ? Set up and deploy "~/progression"? [Y/n] Y
# ? Which scope? [Choisir ton team/account]
# ? Link to existing project? [N]
# ? What's your project's name? sar-progression
# ? In which directory is your code located? ./

# Ajouter les env vars via le dashboard ou CLI :
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_ROLE_KEY
vercel env add NEXT_PUBLIC_APP_URL
vercel env add ADMIN_API_KEY
vercel env add CRON_SECRET

# Deploy en production
vercel --prod
```

**Note importante :** Vercel va te donner une URL temporaire comme :
```
https://sar-progression-xxxxx.vercel.app
```

---

## Étape 2 : Configurer le domaine dans Vercel

1. Aller sur ton projet dans Vercel Dashboard
2. Cliquer sur **"Settings"** → **"Domains"**
3. Cliquer **"Add"**
4. Entrer : `progression.solutionargentrapide.ca`
5. Cliquer **"Add"**

Vercel va te demander de configurer le DNS. Tu verras un message comme :
```
⚠️ Invalid Configuration
Add the following record to your DNS provider:

Type: CNAME
Name: progression
Value: cname.vercel-dns.com
```

**OU**

```
Type: A
Name: progression
Value: 76.76.21.21
```

---

## Étape 3 : Configurer le DNS chez GoDaddy

### Se connecter à GoDaddy

1. Aller sur [godaddy.com](https://www.godaddy.com)
2. Se connecter avec ton compte
3. Aller dans **"My Products"** → **"Domains"**
4. Cliquer sur le domaine **solutionargentrapide.ca**
5. Cliquer sur **"DNS"** ou **"Manage DNS"**

### Ajouter l'enregistrement DNS

Tu as **2 options** (choisis celle que Vercel te recommande) :

#### Option A : CNAME (Recommandé par Vercel)

Dans GoDaddy DNS Management :

| Type  | Name        | Value                | TTL    |
|-------|-------------|----------------------|--------|
| CNAME | progression | cname.vercel-dns.com | 1 hour |

**OU si Vercel te donne un domaine spécifique :**

| Type  | Name        | Value                              | TTL    |
|-------|-------------|------------------------------------|--------|
| CNAME | progression | cname.vercel-dns.com               | 1 hour |

**Étapes dans GoDaddy :**
1. Cliquer **"Add"** ou **"Add Record"**
2. Type : Sélectionner **"CNAME"**
3. Name : Entrer **"progression"**
4. Value/Points to : Entrer la valeur donnée par Vercel
5. TTL : Laisser **"1 hour"** ou **"600 seconds"**
6. Cliquer **"Save"**

#### Option B : A Record (Alternative)

| Type | Name        | Value      | TTL    |
|------|-------------|------------|--------|
| A    | progression | 76.76.21.21| 1 hour |

**Étapes dans GoDaddy :**
1. Cliquer **"Add"** ou **"Add Record"**
2. Type : Sélectionner **"A"**
3. Name : Entrer **"progression"**
4. Value : Entrer **"76.76.21.21"**
5. TTL : Laisser **"1 hour"**
6. Cliquer **"Save"**

---

## Étape 4 : Attendre la propagation DNS

⏱️ **Délai de propagation :** 5 minutes à 48 heures (généralement 15-30 min)

### Vérifier la propagation

```bash
# Vérifier le DNS
nslookup progression.solutionargentrapide.ca

# Devrait retourner :
# Name: progression.solutionargentrapide.ca
# Address: 76.76.21.21 (ou autre IP Vercel)
```

**Ou via des outils en ligne :**
- [dnschecker.org](https://dnschecker.org)
- [whatsmydns.net](https://www.whatsmydns.net)

### Tester le site

Une fois propagé, tester :
```bash
curl -I https://progression.solutionargentrapide.ca
```

Ou ouvrir dans le navigateur :
```
https://progression.solutionargentrapide.ca
```

---

## Étape 5 : Vérifier le certificat SSL

Vercel génère automatiquement un certificat SSL Let's Encrypt.

**Vérification :**
1. Ouvrir le site dans le navigateur
2. Vérifier le cadenas 🔒 dans la barre d'adresse
3. Le certificat devrait être valide automatiquement

Si le certificat n'est pas généré :
1. Aller dans Vercel Dashboard → Settings → Domains
2. Trouver `progression.solutionargentrapide.ca`
3. Cliquer **"Renew Certificate"** ou attendre (ça peut prendre 1h)

---

## Étape 6 : Tester l'API

Une fois déployé et le DNS propagé :

```bash
# Créer une application de test
curl -X POST https://progression.solutionargentrapide.ca/api/admin/event \
  -H "Content-Type: application/json" \
  -H "x-api-key: VOTRE_ADMIN_API_KEY" \
  -d '{
    "application_id": "PROD-001",
    "event_type": "application_created",
    "status": "RECEIVED",
    "payload": {
      "name": "Test Production",
      "email": "test@prod.com",
      "phone": "+15141234567",
      "amount_cents": 500000
    }
  }'

# Générer un magic link
curl -X POST https://progression.solutionargentrapide.ca/api/admin/magic-link \
  -H "Content-Type: application/json" \
  -H "x-api-key: VOTRE_ADMIN_API_KEY" \
  -d '{
    "application_id": "PROD-001",
    "phone": "+15141234567"
  }'
```

---

## Étape 7 : Vérifier le Cron Job

Le cron job devrait se lancer automatiquement toutes les heures.

**Vérifier dans Vercel Dashboard :**
1. Aller sur le projet
2. Cliquer sur **"Deployments"**
3. Regarder les logs pour voir si le cron s'exécute

**Logs Vercel :**
- Aller dans **"Logs"** ou **"Functions"**
- Chercher les logs du cron cleanup
- Tu devrais voir : `🧹 Cleanup completed: X links removed`

---

## ✅ Checklist finale

- [ ] Projet déployé sur Vercel
- [ ] Environment variables configurées
- [ ] Domaine ajouté dans Vercel (progression.solutionargentrapide.ca)
- [ ] DNS configuré chez GoDaddy (CNAME ou A record)
- [ ] DNS propagé (vérifier avec nslookup)
- [ ] SSL actif (cadenas 🔒)
- [ ] API testée (curl /api/admin/event)
- [ ] Page /suivi testée
- [ ] Cron job actif (vérifier logs)
- [ ] SMS provider configuré (lib/sms.ts)

---

## 🔧 Troubleshooting

### "DNS_PROBE_FINISHED_NXDOMAIN"
→ DNS pas encore propagé, attendre 30 min

### "Invalid Configuration" dans Vercel
→ Vérifier que le record DNS est correct dans GoDaddy

### "This domain is not configured" erreur Vercel
→ Ajouter le domaine dans Vercel Settings → Domains

### SSL certificate non généré
→ Attendre 1h max, ou forcer le renouvellement dans Vercel

### API retourne 401 "Non autorisé"
→ Vérifier que les env vars sont bien configurées dans Vercel

### Cron job ne s'exécute pas
→ Vérifier que `vercel.json` est bien présent et déployé
→ Attendre la prochaine heure (cron = toutes les heures)

---

## 📞 Support

Si problème, vérifier :
1. Logs Vercel : Dashboard → Logs
2. DNS propagation : dnschecker.org
3. SSL certificate : ssllabs.com/ssltest

---

## 🎯 Récapitulatif des étapes

```
1. Déployer sur Vercel (vercel --prod)
2. Ajouter domaine dans Vercel (progression.solutionargentrapide.ca)
3. Configurer DNS GoDaddy (CNAME progression → vercel)
4. Attendre propagation (15-30 min)
5. Vérifier SSL (automatique)
6. Tester API (/api/admin/event)
7. C'est en ligne ! 🚀
```
