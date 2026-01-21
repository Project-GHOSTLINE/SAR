# 🔍 Configuration Google Search Console API

Guide complet pour configurer Google Search Console API et commencer à collecter des données de recherche.

---

## 📋 Prérequis

- Accès au compte Google Search Console pour `solutionargentrapide.ca`
- Accès à Google Cloud Console
- 15-20 minutes

---

## 🚀 Étapes de Configuration

### Étape 1: Créer/Sélectionner un Projet Google Cloud

1. Aller sur: https://console.cloud.google.com
2. Cliquer sur le sélecteur de projet (en haut à gauche)
3. Options:
   - **Option A**: Créer un nouveau projet
     - Cliquer sur "NEW PROJECT"
     - Nom: `SAR SEO Metrics`
     - Organization: (laisser vide ou sélectionner)
     - Cliquer sur "CREATE"
   - **Option B**: Utiliser un projet existant
     - Sélectionner le projet existant

### Étape 2: Activer l'API Google Search Console

1. Dans le projet sélectionné, aller dans:
   **Navigation Menu → APIs & Services → Library**
2. Rechercher: `Google Search Console API`
3. Cliquer sur "Google Search Console API"
4. Cliquer sur **"ENABLE"**
5. Attendre l'activation (quelques secondes)

### Étape 3: Créer un Service Account

1. Aller dans: **Navigation Menu → APIs & Services → Credentials**
2. Cliquer sur **"+ CREATE CREDENTIALS"**
3. Sélectionner **"Service Account"**
4. Remplir:
   - **Service account name**: `seo-metrics-collector`
   - **Service account ID**: (auto-généré, laisser tel quel)
   - **Description**: `Service account pour collecter les métriques SEO via API`
5. Cliquer sur **"CREATE AND CONTINUE"**
6. **Role**: Sélectionner `Owner` ou `Editor` (pour accès complet)
7. Cliquer sur **"CONTINUE"**
8. Cliquer sur **"DONE"** (pas besoin de Grant users access)

### Étape 4: Créer une Clé JSON

1. Dans la liste des Service Accounts, cliquer sur celui que vous venez de créer
   - Email format: `seo-metrics-collector@PROJECT-ID.iam.gserviceaccount.com`
2. Aller dans l'onglet **"KEYS"**
3. Cliquer sur **"ADD KEY" → "Create new key"**
4. Sélectionner **"JSON"**
5. Cliquer sur **"CREATE"**
6. Le fichier JSON sera téléchargé automatiquement
7. **⚠️ IMPORTANT**: Sauvegarder ce fichier en lieu sûr (c'est la seule fois qu'il sera disponible)

### Étape 5: Ajouter le Service Account à Google Search Console

1. Ouvrir le fichier JSON téléchargé
2. Copier la valeur de `client_email` (format: `xxx@xxx.iam.gserviceaccount.com`)
3. Aller sur: https://search.google.com/search-console
4. Sélectionner la propriété: `solutionargentrapide.ca`
5. Dans le menu gauche, cliquer sur **"Settings"** (⚙️)
6. Cliquer sur **"Users and permissions"**
7. Cliquer sur **"ADD USER"**
8. Coller l'email du service account (`client_email`)
9. Sélectionner permission: **"Full"** (accès complet)
10. Cliquer sur **"ADD"**

### Étape 6: Extraire les Credentials pour .env.local

Ouvrir le fichier JSON téléchargé et extraire ces valeurs:

```json
{
  "type": "service_account",
  "project_id": "VOTRE-PROJECT-ID",           // ← Copier cette valeur
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",  // ← Copier cette valeur
  "client_email": "seo-metrics-collector@PROJECT-ID.iam.gserviceaccount.com",  // ← Copier cette valeur
  "client_id": "...",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "..."
}
```

### Étape 7: Ajouter les Variables d'Environnement

Ajouter dans `/Users/xunit/Desktop/📁 Projets/sar/.env.local`:

```env
# Google Search Console API
GOOGLE_SERVICE_ACCOUNT_EMAIL=seo-metrics-collector@PROJECT-ID.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nVOTRE-PRIVATE-KEY\n-----END PRIVATE KEY-----\n"
GOOGLE_PROJECT_ID=VOTRE-PROJECT-ID
GSC_SITE_URL=https://solutionargentrapide.ca
```

**⚠️ IMPORTANT pour `GOOGLE_PRIVATE_KEY`**:
- Garder les guillemets doubles
- Garder les `\n` pour les retours à la ligne
- La valeur doit être sur **UNE SEULE LIGNE**
- Format: `"-----BEGIN PRIVATE KEY-----\nXXX\nXXX\n-----END PRIVATE KEY-----\n"`

### Étape 8: Configurer dans Vercel (Production)

1. Aller sur: https://vercel.com/project-ghostline/sar/settings/environment-variables
2. Ajouter les 4 variables:
   - `GOOGLE_SERVICE_ACCOUNT_EMAIL`
   - `GOOGLE_PRIVATE_KEY` (⚠️ bien formater avec \n)
   - `GOOGLE_PROJECT_ID`
   - `GSC_SITE_URL`
3. Sélectionner: **Production, Preview, Development**
4. Cliquer sur **"Save"**
5. Redéployer l'application

### Étape 9: Tester la Configuration

**Test local**:
```bash
curl -X POST http://localhost:3000/api/seo/collect/gsc \
  -H "x-api-key: FredRosa%1978" \
  -H "Content-Type: application/json" \
  -d '{"date": "2026-01-18"}' # Date il y a 3 jours
```

**Test production**:
```bash
curl -X POST https://admin.solutionargentrapide.ca/api/seo/collect/gsc \
  -H "x-api-key: FredRosa%1978" \
  -H "Content-Type: application/json" \
  -d '{"date": "2026-01-18"}'
```

**Réponse attendue**:
```json
{
  "success": true,
  "message": "Métriques GSC collectées avec succès",
  "date": "2026-01-18",
  "data": {
    "id": "uuid...",
    "site_url": "https://solutionargentrapide.ca",
    "clicks": 234,
    "impressions": 8500,
    ...
  }
}
```

---

## ✅ Vérification

### Dans Supabase

1. Aller sur: https://supabase.com/dashboard/project/dllyzfuqjzuhvshrlmuq/editor
2. Ouvrir la table: `seo_gsc_metrics_daily`
3. Vérifier qu'il y a au moins 1 ligne avec les données collectées

### Dans l'Admin SAR

1. Aller sur: https://admin.solutionargentrapide.ca
2. Se connecter
3. Aller dans la section SEO Metrics (à créer)
4. Vérifier l'affichage des métriques GSC

---

## 🔍 Données Disponibles via GSC API

Une fois configuré, vous pourrez collecter:

### Métriques Principales
- **Clicks**: Nombre de clics depuis les résultats de recherche
- **Impressions**: Nombre de fois que le site apparaît dans les résultats
- **CTR**: Taux de clic (clicks / impressions * 100)
- **Position**: Position moyenne dans les résultats de recherche

### Par Dimension
- **Queries**: Top mots-clés qui génèrent du trafic
- **Pages**: Pages les plus performantes
- **Countries**: Pays d'origine du trafic
- **Devices**: Desktop, mobile, tablet
- **Search Appearance**: Rich results, AMP, etc.

### Données d'Indexation
- Pages indexées vs soumises
- Problèmes de couverture
- Issues d'indexation

---

## 🆘 Troubleshooting

### Erreur: "Permission denied"
- Vérifier que le service account est bien ajouté dans Search Console
- Vérifier que la permission est "Full"
- Attendre 5-10 minutes pour propagation des permissions

### Erreur: "Invalid private key"
- Vérifier le format de `GOOGLE_PRIVATE_KEY` dans .env.local
- S'assurer que les `\n` sont présents
- S'assurer qu'il n'y a pas d'espaces en trop

### Erreur: "Property not found"
- Vérifier que `GSC_SITE_URL` correspond exactement à la propriété dans Search Console
- Format: `https://solutionargentrapide.ca` (avec https, sans trailing slash)

### Pas de données retournées
- Google Search Console a un délai de ~3 jours
- Utiliser une date d'il y a au moins 3 jours pour le test
- Exemple: Si aujourd'hui = 21 janvier, tester avec date = 18 janvier

### Erreur: "API not enabled"
- Retourner à l'étape 2 et vérifier que l'API est bien activée
- Vérifier que vous êtes dans le bon projet Google Cloud

---

## 📊 Limites de l'API

- **Quota quotidien**: 500 requêtes / jour (par défaut)
- **Délai des données**: 2-3 jours
- **Historique**: Jusqu'à 16 mois de données
- **Lignes par requête**: Max 25,000 rows

Pour augmenter le quota:
1. Google Cloud Console → APIs & Services → Quotas
2. Rechercher "Search Console API"
3. Demander une augmentation

---

## 🔐 Sécurité

### ⚠️ IMPORTANT

- **JAMAIS** committer le fichier JSON téléchargé
- **JAMAIS** partager le `GOOGLE_PRIVATE_KEY`
- Stocker le fichier JSON dans un gestionnaire de mots de passe
- Révoquer et recréer les clés si compromises

### Pour révoquer une clé compromise

1. Google Cloud Console → APIs & Services → Credentials
2. Cliquer sur le service account
3. Onglet "KEYS"
4. Cliquer sur ⋮ à côté de la clé → DELETE
5. Créer une nouvelle clé (étape 4)
6. Mettre à jour .env.local et Vercel

---

## 📞 Support

- **Documentation officielle**: https://developers.google.com/webmaster-tools/v1/api_reference_index
- **Console d'API**: https://console.cloud.google.com
- **Search Console**: https://search.google.com/search-console

---

**✅ Configuration terminée!**

Une fois ces étapes complétées, le système collectera automatiquement les données GSC tous les jours via le cron job.

*Dernière mise à jour: 2026-01-21*
