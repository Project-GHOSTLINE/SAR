# 🔧 Guide de Configuration - UptimeRobot

**Service**: UptimeRobot (Site Uptime Monitoring)
**Coût**: GRATUIT (50 monitors)
**Temps de setup**: 5 minutes

---

## 📋 Pourquoi UptimeRobot?

**Monitore votre site 24/7** et vous alerte immédiatement en cas de:
- Site down (indisponible)
- Temps de réponse lent (> 5 secondes)
- Certificat SSL expiré
- Erreurs HTTP (500, 503, etc.)

**Métriques collectées**:
- Uptime percentage (99.9% SLA)
- Response time (milliseconds)
- SSL certificate expiry
- Downtime incidents
- Up/Down status history

---

## 🚀 Étapes de Configuration

### 1. Créer un compte gratuit

1. Visitez: https://uptimerobot.com/
2. Cliquez sur "Sign Up" (en haut à droite)
3. Créez un compte (email + password)
4. Confirmez votre email

**Plan gratuit inclut**:
- ✅ 50 monitors
- ✅ Checks toutes les 5 minutes
- ✅ Alertes email/SMS/webhook
- ✅ 90 jours d'historique
- ✅ SSL monitoring

---

### 2. Créer un monitor

Une fois connecté:

1. Cliquez sur "+ Add New Monitor"
2. Configurez le monitor:
   - **Monitor Type**: HTTP(s)
   - **Friendly Name**: Solution Argent Rapide - Production
   - **URL (or IP)**: `https://solutionargentrapide.ca/`
   - **Monitoring Interval**: 5 minutes (gratuit)

3. **Advanced Options** (optionnel):
   - **Monitor Timeout**: 30 seconds
   - **Alert When**: Down
   - **Alert Contacts**: Ajoutez votre email

4. Cliquez sur "Create Monitor"

**Recommandations**:
- Créez un deuxième monitor pour `https://admin.solutionargentrapide.ca/`
- Créez un monitor API: `https://admin.solutionargentrapide.ca/api/seo/health`

---

### 3. Obtenir l'API Key

1. Cliquez sur votre nom (en haut à droite)
2. Sélectionnez "My Settings"
3. Scrollez jusqu'à "API Settings"
4. Copiez votre **Main API Key** (format: `u1234567-abcdef1234567890abcdef12`)

**⚠️ IMPORTANT**: Gardez cette clé secrète! Ne la committez jamais dans Git.

---

### 4. Ajouter à l'environnement

#### a) Local (.env.local)

```bash
# UptimeRobot
UPTIMEROBOT_API_KEY=u1234567-abcdef1234567890abcdef12
```

#### b) Production (Vercel)

```bash
cd /Users/xunit/Desktop/📁\ Projets/sar
vercel env add UPTIMEROBOT_API_KEY production
# Collez votre API key quand demandé
```

Ou via le dashboard Vercel:
1. Allez sur vercel.com/dashboard
2. Sélectionnez le projet "sar"
3. Settings → Environment Variables
4. Add: `UPTIMEROBOT_API_KEY` = votre clé

---

### 5. Appliquer la migration SQL

Exécutez la migration dans Supabase:

```sql
-- Déjà copiée dans votre presse-papier!
-- Allez sur supabase.com → SQL Editor → Collez et exécutez
```

---

### 6. Tester l'intégration

Une fois l'API key ajoutée:

```bash
curl -X POST \
  -H "x-api-key: $ADMIN_PASSWORD" \
  "https://admin.solutionargentrapide.ca/api/seo/collect/uptime" \
  | jq '.'
```

**Résultat attendu**:
```json
{
  "success": true,
  "message": "Métriques uptime collectées avec succès",
  "monitors_count": 1,
  "data": [
    {
      "monitor_name": "Solution Argent Rapide - Production",
      "url": "https://solutionargentrapide.ca/",
      "status": 2,
      "status_label": "up",
      "response_time_ms": 245,
      "uptime_ratio_30d": 99.95,
      "ssl_days_remaining": 87
    }
  ]
}
```

---

## 📊 Utilisation

### Collecter les métriques

```bash
# Collecte manuelle
curl -X POST \
  -H "x-api-key: $ADMIN_PASSWORD" \
  "https://admin.solutionargentrapide.ca/api/seo/collect/uptime"
```

### Récupérer l'historique

```bash
# Dernières 24 heures
curl -H "x-api-key: $ADMIN_PASSWORD" \
  "https://admin.solutionargentrapide.ca/api/seo/collect/uptime?hours=24"

# Derniers 7 jours
curl -H "x-api-key: $ADMIN_PASSWORD" \
  "https://admin.solutionargentrapide.ca/api/seo/collect/uptime?hours=168"
```

---

## 🔔 Configurer les Alertes

### Email Alerts (dans UptimeRobot)

1. My Settings → Alert Contacts
2. Add Alert Contact → Type: E-mail
3. Entrez votre email
4. Confirmez par email

### Webhook Alerts (optionnel)

Pour recevoir des notifications dans Slack/Discord:

1. Alert Contact Type: Webhook
2. URL: Votre webhook URL
3. POST Value (JSON):
```json
{
  "monitor_name": "*monitorFriendlyName*",
  "status": "*alertTypeFriendlyName*",
  "url": "*monitorURL*",
  "reason": "*alertDetails*"
}
```

---

## 🎯 Monitors Recommandés

| Monitor Name | URL | Intervalle |
|--------------|-----|------------|
| SAR - Homepage | https://solutionargentrapide.ca/ | 5 min |
| SAR - Admin | https://admin.solutionargentrapide.ca/ | 5 min |
| SAR - API Health | https://admin.solutionargentrapide.ca/api/seo/health | 5 min |
| SAR - Application Form | https://solutionargentrapide.ca/application | 15 min |

---

## 📈 Métriques Disponibles

### Status Codes
- **2** = Up (✅ site opérationnel)
- **8** = Down (❌ site indisponible)
- **9** = Seems Down (⚠️ timeout ou erreur)
- **0** = Paused
- **1** = Not checked yet

### Uptime Ratios
- **1d**: Dernières 24 heures
- **7d**: Derniers 7 jours
- **30d**: Derniers 30 jours (SLA standard: 99.9%)
- **90d**: Derniers 90 jours

### Response Time
- **< 200ms**: Excellent ⚡
- **200-500ms**: Bon ✅
- **500-1000ms**: Acceptable ⚠️
- **> 1000ms**: Lent ❌ (à investiguer)

### SSL Monitoring
- **Days Remaining**: Jours avant expiration
- **Alert si**: < 30 jours
- **Action**: Renouveler le certificat

---

## 🤖 Automatisation

### Cron Job (Vercel)

Créez un fichier `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/seo/collect/uptime",
      "schedule": "*/15 * * * *"
    }
  ]
}
```

Collecte automatique toutes les 15 minutes.

### Alternative: GitHub Actions

Créez `.github/workflows/uptime-check.yml`:

```yaml
name: Uptime Check
on:
  schedule:
    - cron: '*/15 * * * *'

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - name: Collect Uptime Metrics
        run: |
          curl -X POST \
            -H "x-api-key: ${{ secrets.ADMIN_PASSWORD }}" \
            https://admin.solutionargentrapide.ca/api/seo/collect/uptime
```

---

## 🐛 Troubleshooting

### Erreur: "Invalid API key"
- Vérifiez que vous avez copié la clé complète
- La clé doit commencer par `u` ou `m`
- Pas d'espaces avant/après

### Erreur: "No monitors found"
- Créez au moins un monitor dans UptimeRobot
- Attendez 5 minutes pour la première collecte

### Erreur: "Account not activated"
- Vérifiez votre email et confirmez votre compte

---

## 💰 Plan Gratuit vs Payant

| Feature | Gratuit | Pro ($7/mois) |
|---------|---------|---------------|
| Monitors | 50 | 50 |
| Check Interval | 5 min | 1 min |
| Alertes | Illimité | Illimité |
| SMS Alerts | ❌ | ✅ |
| Status Pages | 1 | Illimité |
| Maintenance Windows | ❌ | ✅ |

**Recommandation**: Le plan gratuit est largement suffisant pour commencer.

---

## 📝 Checklist

- [ ] Compte UptimeRobot créé
- [ ] Email confirmé
- [ ] Monitor créé pour homepage
- [ ] Monitor créé pour admin
- [ ] API key obtenue
- [ ] API key ajoutée à .env.local
- [ ] API key ajoutée à Vercel
- [ ] Migration SQL exécutée
- [ ] Test API réussi
- [ ] Alertes email configurées

---

**Dernière mise à jour**: 2026-01-27
**Temps estimé**: 5 minutes
**Coût**: GRATUIT
