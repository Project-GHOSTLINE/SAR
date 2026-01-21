# Configuration Google Analytics 4 Service Account

## 🎯 Objectif
Obtenir les vraies données de Google Analytics 4 dans votre dashboard admin.

---

## Étape 1: Créer un Service Account dans Google Cloud Console

### 1.1 Aller sur Google Cloud Console
Ouvrir: https://console.cloud.google.com

### 1.2 Sélectionner ou créer un projet
- Si vous avez déjà un projet Google Cloud → le sélectionner
- Sinon → Créer un nouveau projet nommé "SAR Analytics"

### 1.3 Activer l'API Google Analytics Data
1. Aller dans **APIs & Services** → **Library**
2. Chercher "Google Analytics Data API"
3. Cliquer sur "Google Analytics Data API"
4. Cliquer sur **Enable**

### 1.4 Créer un Service Account
1. Aller dans **APIs & Services** → **Credentials**
2. Cliquer sur **+ CREATE CREDENTIALS**
3. Sélectionner **Service Account**

**Remplir le formulaire:**
- **Service account name**: `sar-analytics-reader`
- **Service account ID**: sera auto-généré (ex: `sar-analytics-reader@...`)
- **Description**: "Service account pour lire les données GA4 de Solution Argent Rapide"

4. Cliquer sur **CREATE AND CONTINUE**

5. Dans "Grant this service account access to project":
   - **Role**: Sélectionner "Viewer" (ou laisser vide)
   - Cliquer sur **CONTINUE**

6. Cliquer sur **DONE**

### 1.5 Créer une clé JSON
1. Dans la liste des Service Accounts, cliquer sur le service account que vous venez de créer
2. Aller dans l'onglet **KEYS**
3. Cliquer sur **ADD KEY** → **Create new key**
4. Sélectionner **JSON**
5. Cliquer sur **CREATE**

**⚠️ Un fichier JSON sera téléchargé automatiquement - GARDEZ-LE EN SÉCURITÉ!**

Le fichier ressemble à:
```json
{
  "type": "service_account",
  "project_id": "votre-projet-123456",
  "private_key_id": "abc123...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...",
  "client_email": "sar-analytics-reader@votre-projet.iam.gserviceaccount.com",
  "client_id": "123456789",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  ...
}
```

---

## Étape 2: Donner accès au Service Account dans Google Analytics

### 2.1 Copier l'email du Service Account
Dans le fichier JSON téléchargé, copier la valeur de `client_email`:
```
sar-analytics-reader@votre-projet.iam.gserviceaccount.com
```

### 2.2 Aller dans Google Analytics 4
Ouvrir: https://analytics.google.com

### 2.3 Ajouter le Service Account comme utilisateur
1. Dans Google Analytics 4, cliquer sur **Admin** (roue dentée en bas à gauche)
2. Dans la colonne **Property**, cliquer sur **Property Access Management**
3. Cliquer sur le **+ (Plus)** en haut à droite
4. Sélectionner **Add users**
5. Coller l'email du Service Account (ex: `sar-analytics-reader@...`)
6. Dans **Roles**, sélectionner **Viewer**
7. Décocher "Notify new users by email" (c'est un service account, pas un humain)
8. Cliquer sur **Add**

✅ Le Service Account a maintenant accès en lecture à vos données GA4!

---

## Étape 3: Configurer les credentials dans le projet

### 3.1 Ouvrir le fichier JSON téléchargé

### 3.2 Copier tout le contenu JSON

### 3.3 Ajouter à .env.local

Ajouter cette variable dans `/Users/xunit/Desktop/📁 Projets/sar/.env.local`:

```bash
# Service Account pour Google Analytics Data API
GA_SERVICE_ACCOUNT_JSON='{"type":"service_account","project_id":"...TOUT LE CONTENU JSON ICI..."}'
```

**⚠️ Important:**
- Entourer le JSON de **guillemets simples** `'...'`
- Tout sur **une seule ligne**
- **Pas d'espaces** ni de **retours à la ligne** dans le JSON

Exemple:
```bash
GA_SERVICE_ACCOUNT_JSON='{"type":"service_account","project_id":"sar-analytics-123456","private_key_id":"abc123","private_key":"-----BEGIN PRIVATE KEY-----\nMIIE...XYZ\n-----END PRIVATE KEY-----\n","client_email":"sar-analytics-reader@sar-analytics-123456.iam.gserviceaccount.com","client_id":"123456789","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token"}'
```

---

## Étape 4: Configurer les mêmes credentials dans Vercel

### 4.1 Aller sur Vercel
Ouvrir: https://vercel.com/project-ghostline/sar/settings/environment-variables

### 4.2 Ajouter la variable d'environnement
1. Cliquer sur **Add New**
2. **Key**: `GA_SERVICE_ACCOUNT_JSON`
3. **Value**: Coller le JSON (tout sur une ligne)
4. **Environment**: Sélectionner **Production**, **Preview**, **Development**
5. Cliquer sur **Save**

### 4.3 Redéployer le projet
1. Aller dans l'onglet **Deployments**
2. Trouver le dernier déploiement
3. Cliquer sur **⋮** → **Redeploy**
4. Confirmer

---

## Étape 5: Tester les vraies données

### 5.1 Collecter les données manuellement

```bash
curl -X POST https://admin.solutionargentrapide.ca/api/seo/collect/ga4 \
  -H "x-api-key: FredRosa%1978" \
  -H "Content-Type: application/json"
```

**Réponse attendue:**
```json
{
  "success": true,
  "message": "Métriques GA4 collectées avec succès",
  "date": "2026-01-21",
  "data": {
    "users": 1234,
    "sessions": 2456,
    "engagement_rate": 65.3,
    ...
  }
}
```

### 5.2 Vérifier dans le dashboard
1. Ouvrir: https://admin.solutionargentrapide.ca/seo
2. Vérifier que les données correspondent à votre Google Analytics

---

## ✅ Vérification

Les données sont réelles si:
- ✅ Les chiffres dans le dashboard correspondent à Google Analytics
- ✅ Pas de message "Mode mock actif"
- ✅ Les données changent quotidiennement via le cron job

---

## 🆘 Troubleshooting

### Erreur: "Unable to find field 'users' in table"
→ Le Service Account n'a pas encore accès aux données. Attendre 5-10 minutes après l'ajout dans GA4.

### Erreur: "insufficient authentication scopes"
→ Vérifier que l'API Google Analytics Data API est bien activée dans Google Cloud Console.

### Erreur: "Permission denied"
→ Vérifier que le Service Account a bien le rôle "Viewer" dans GA4 Property Access Management.

### Les données ne correspondent pas
→ Vérifier que `GA_PROPERTY_ID=340237010` correspond bien à votre propriété GA4.

Pour trouver le bon Property ID:
1. Aller dans Google Analytics 4
2. Admin → Property Settings
3. Copier le "Property ID" (sans le "G-")

---

## 📊 Prochaines étapes

Une fois configuré:
- ✅ Collecte automatique quotidienne à 6h UTC (2h EST)
- ✅ Données historiques disponibles
- ✅ Dashboard SEO avec vraies données en temps réel

**Durée totale de configuration: ~10-15 minutes**
