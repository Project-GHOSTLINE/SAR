# 🎯 Configuration Semrush API

Guide complet pour configurer Semrush API et commencer à collecter des données de référencement avancées.

---

## 📋 Qu'est-ce que Semrush?

Semrush est une plateforme complète de marketing digital qui fournit:
- Analyse de mots-clés et positions
- Analyse de backlinks
- Analyse de la concurrence
- Authority Score
- Traffic organique estimé
- Opportunités SEO

---

## 💰 Tarification

### Plans Semrush

| Plan | Prix/mois | API Incluse |
|------|-----------|-------------|
| **Pro** | $119.95 | ❌ Non |
| **Guru** | $229.95 | ❌ Non |
| **Business** | $449.95 | ❌ Non |
| **API Access** | **+$200/mois** | ✅ Oui (en supplément) |

**⚠️ Important**: L'accès API est un **add-on payant** à ajouter à n'importe quel plan.

### Quotas API

- **10,000 unités API / jour** incluses
- Coût par unité supplémentaire: $0.0333 (~3.3¢)
- 1 requête = 10 unités en moyenne

**Exemple de coûts**:
- 100 requêtes/jour = 1000 unités/jour → **Inclus**
- 1000 requêmes/jour = 10,000 unités/jour → **Inclus**
- 2000 requêtes/jour = 20,000 unités/jour → **+$333/mois**

### Alternatives Gratuites/Moins Chères

Si le budget Semrush est trop élevé, considérer:

1. **Ahrefs Webmaster Tools** - Gratuit
   - Analyse du site
   - Backlinks
   - Keywords
   - Limité à vos propres sites

2. **Ubersuggest** - $29/mois
   - Keywords
   - Traffic estimé
   - Backlinks basiques

3. **Serpstat** - $69/mois
   - Alternative moins chère à Semrush
   - API disponible

4. **SE Ranking** - $55/mois
   - Tracking de positions
   - Audit SEO
   - API disponible

---

## 🚀 Configuration Semrush API

### Étape 1: S'inscrire à Semrush

1. Aller sur: https://www.semrush.com/pricing/
2. Choisir un plan (Pro minimum recommandé pour commencer)
3. Créer un compte
4. Compléter le paiement

### Étape 2: Ajouter l'API Access

1. Se connecter sur: https://www.semrush.com
2. Aller dans: **Settings → Subscription → API Access**
3. Cliquer sur **"Add API Access"**
4. Confirmer l'ajout de **$200/mois** au plan
5. Accepter et confirmer

### Étape 3: Obtenir l'API Key

1. Une fois l'API activée, aller dans: https://www.semrush.com/api-analytics/
2. Cliquer sur **"API Key"** dans le menu
3. Copier votre API Key (format: alphanumérique, ~40 caractères)
4. **⚠️ IMPORTANT**: Ne jamais partager cette clé

### Étape 4: Tester l'API

**Test de base** (via navigateur ou curl):
```bash
# Test Domain Overview
curl "https://api.semrush.com/?type=domain_overview&key=VOTRE_API_KEY&domain=solutionargentrapide.ca&database=ca"

# Test Domain Ranks
curl "https://api.semrush.com/?type=domain_ranks&key=VOTRE_API_KEY&export_columns=Dn,Rk,Or,Ot&domain=solutionargentrapide.ca&database=ca"

# Test Backlinks
curl "https://api.semrush.com/?type=backlinks&key=VOTRE_API_KEY&target=solutionargentrapide.ca&target_type=root_domain&export_columns=source_url,source_title,external_num"
```

### Étape 5: Configurer dans .env.local

Ajouter dans `/Users/xunit/Desktop/📁 Projets/sar/.env.local`:

```env
# Semrush API
SEMRUSH_API_KEY=votre-api-key-ici
SEMRUSH_API_URL=https://api.semrush.com/
```

### Étape 6: Configurer dans Vercel (Production)

1. Aller sur: https://vercel.com/project-ghostline/sar/settings/environment-variables
2. Ajouter les variables:
   - `SEMRUSH_API_KEY`: Votre clé API
   - `SEMRUSH_API_URL`: `https://api.semrush.com/`
3. Sélectionner: **Production, Preview, Development**
4. Cliquer sur **"Save"**
5. Redéployer l'application

### Étape 7: Tester la Collecte

**Test local**:
```bash
curl -X POST http://localhost:3000/api/seo/collect/semrush \
  -H "x-api-key: FredRosa%1978" \
  -H "Content-Type: application/json"
```

**Test production**:
```bash
curl -X POST https://admin.solutionargentrapide.ca/api/seo/collect/semrush \
  -H "x-api-key: FredRosa%1978" \
  -H "Content-Type: application/json"
```

**Réponse attendue**:
```json
{
  "success": true,
  "message": "Métriques Semrush collectées avec succès",
  "date": "2026-01-20",
  "data": {
    "domain": "solutionargentrapide.ca",
    "organic_keywords": 156,
    "organic_traffic": 1234,
    "authority_score": 28,
    "total_backlinks": 342,
    ...
  }
}
```

---

## 📊 Données Collectées par l'API

### Domain Overview
- **Domain Rank**: Ranking global du domaine
- **Organic Keywords**: Nombre de mots-clés positionnés
- **Organic Traffic**: Traffic organique estimé (visiteurs/mois)
- **Organic Cost**: Valeur du traffic si payé en PPC
- **Paid Keywords**: Mots-clés en campagnes payantes
- **Paid Traffic**: Traffic payant estimé

### Backlinks
- **Total Backlinks**: Nombre total de backlinks
- **Referring Domains**: Nombre de domaines référents
- **Referring IPs**: Nombre d'IPs distinctes
- **Follow/Nofollow**: Distribution des backlinks

### Authority Score
- Score de 0 à 100 basé sur:
  - Qualité des backlinks
  - Traffic organique
  - Données de recherche

### Keywords Rankings
- **Top Keywords**: Liste des meilleurs mots-clés
- **Positions**: Position dans les SERPs
- **Search Volume**: Volume de recherche mensuel
- **Keyword Difficulty**: Difficulté (0-100)
- **CPC**: Coût par clic estimé

### Competitors
- **Organic Competitors**: Domaines concurrents
- **Common Keywords**: Mots-clés en commun
- **Competitive Positioning**: Analyse comparative

---

## 🔧 Endpoints API Disponibles

Notre système utilise ces endpoints Semrush:

```bash
# 1. Domain Overview
type=domain_overview&domain=DOMAIN&database=DATABASE

# 2. Domain Ranks
type=domain_ranks&domain=DOMAIN&database=DATABASE

# 3. Domain Organic Keywords
type=domain_organic&domain=DOMAIN&database=DATABASE&display_limit=50

# 4. Backlinks Overview
type=backlinks_overview&target=DOMAIN&target_type=root_domain

# 5. Referring Domains
type=backlinks_refdomains&target=DOMAIN&target_type=root_domain

# 6. Backlinks
type=backlinks&target=DOMAIN&target_type=root_domain&display_limit=100

# 7. Domain Competitors
type=domain_organic_organic&domain=DOMAIN&database=DATABASE&display_limit=10
```

### Databases Disponibles

Pour le Canada: `database=ca`

Autres databases:
- `us` - États-Unis
- `uk` - Royaume-Uni
- `fr` - France
- etc. (voir documentation Semrush)

---

## 💡 Optimisation des Coûts

### Stratégies pour Réduire l'Utilisation

1. **Collecte Quotidienne Seulement**
   - Ne pas faire de collectes en temps réel
   - 1 requête/jour par domaine = ~300 unités/mois = **Bien en dessous de la limite**

2. **Limiter les Résultats**
   - Utiliser `display_limit=50` au lieu de `display_limit=1000`
   - Réduit les unités consommées

3. **Caching**
   - Stocker les résultats dans Supabase
   - Utiliser les données en cache pour l'affichage
   - Ne re-fetch que si nécessaire

4. **Prioriser les Requêtes**
   - Collecter Domain Overview tous les jours (peu coûteux)
   - Collecter Backlinks 1x/semaine (plus coûteux)
   - Collecter Keywords 1x/semaine

### Estimation pour SAR

**Scénario actuel** (1 domaine):
- Domain Overview: 10 unités/jour × 30 jours = **300 unités/mois**
- Keywords: 50 unités/semaine × 4 = **200 unités/mois**
- Backlinks: 100 unités/semaine × 4 = **400 unités/mois**

**Total**: ~900 unités/mois → **Largement dans la limite de 10,000**

---

## 🆘 Troubleshooting

### Erreur: "Invalid API key"
- Vérifier que l'API Access est activé dans votre compte
- Vérifier que la clé est correctement copiée (pas d'espaces)
- La clé peut prendre 5-10 minutes à s'activer après achat

### Erreur: "Insufficient units"
- Vérifier votre quota sur: https://www.semrush.com/api-analytics/
- Attendre le renouvellement quotidien (minuit UTC)
- Acheter des unités supplémentaires si nécessaire

### Erreur: "No data available"
- Normal pour nouveaux domaines ou domaines avec peu de traffic
- Semrush n'a pas encore de données pour ce domaine
- Attendre quelques semaines pour que Semrush indexe le domaine

### Données semblent incorrectes
- Les données Semrush sont des **estimations**
- Basées sur échantillons et algorithmes propriétaires
- Utiliser comme indicateurs de tendance, pas valeurs absolues

---

## 🔍 Alternatives pour Commencer

### Option 1: Commencer sans Semrush

Le système fonctionne parfaitement sans Semrush:
- ✅ Google Analytics 4 collecte le traffic réel
- ✅ Google Search Console collecte les vraies positions
- ❌ Pas d'analyse de backlinks
- ❌ Pas d'analyse de concurrence
- ❌ Pas d'Authority Score

**Recommandation**: Commencer sans Semrush, ajouter plus tard si budget disponible.

### Option 2: Utiliser Ahrefs Webmaster Tools (Gratuit)

1. S'inscrire sur: https://ahrefs.com/webmaster-tools
2. Vérifier le domaine `solutionargentrapide.ca`
3. Accès gratuit à:
   - Backlinks
   - Keywords organiques
   - Site audit
   - Analyse de concurrence
4. **Limitation**: Seulement pour vos propres sites vérifiés

### Option 3: Utiliser Serpstat ($69/mois)

Alternative moins chère avec API:
- API access inclus dans tous les plans
- Fonctionnalités similaires à Semrush
- Moins de données mais suffisant pour commencer

---

## 📞 Support

- **Documentation API**: https://www.semrush.com/api-analytics/
- **Support Semrush**: https://www.semrush.com/kb/
- **API Units Calculator**: https://www.semrush.com/api-units/

---

## ✅ Checklist de Configuration

- [ ] Compte Semrush créé
- [ ] Plan Pro/Guru/Business souscrit
- [ ] API Access ajouté (+$200/mois)
- [ ] API Key obtenue
- [ ] Test API réussi
- [ ] Variables ajoutées dans .env.local
- [ ] Variables configurées dans Vercel
- [ ] Premier test de collecte réussi
- [ ] Vérification des données dans Supabase

---

**💡 Recommandation Finale**

Pour SAR, je recommande de:

1. **Court terme** (maintenant):
   - Commencer avec GA4 + Google Search Console (déjà disponibles)
   - Évaluer les besoins en analyse de backlinks/concurrence

2. **Moyen terme** (dans 1-2 mois):
   - Si budget disponible: Ajouter Semrush API
   - Sinon: Utiliser Ahrefs Webmaster Tools (gratuit)

3. **Long terme** (dans 3-6 mois):
   - Réévaluer le ROI de Semrush
   - Considérer d'autres outils selon besoins

**Le système est conçu pour fonctionner avec ou sans Semrush!**

*Dernière mise à jour: 2026-01-21*
