# 🚀 SAR Cortex × Miro - Quick Start Guide

## ⚡ Setup en 5 Minutes

### Étape 1: Créer une App Miro (2 min)

1. Va sur [developers.miro.com](https://developers.miro.com)
2. Click **"Your apps"** en haut à droite
3. Click **"Create new app"** (bouton bleu)
4. Remplis les infos de base:
   - **App name:** SAR Cortex Sync
   - **Description:** Synchronisation automatique des performances SAR
   - **Your development team:** Sélectionne ton workspace Miro
5. Click **"Create app"**

6. Tu es maintenant dans la page de ton app. Dans le menu à gauche, click sur **"OAuth & Permissions"**

7. Dans la section **"Redirect URI for OAuth2.0"**:
   - Click **"Add redirect URI"**
   - Entre: `https://admin.solutionargentrapide.ca/api/miro/callback`
   - Click **"Add"**

8. Dans la section **"Scopes"**, sélectionne:
   - ✅ `boards:read` - Read boards
   - ✅ `boards:write` - Write to boards

9. Click **"Save"** en bas de la page

10. Toujours dans "OAuth & Permissions", trouve la section **"App Credentials"**:
    - **Copie le Client ID**
    - **Copie le Client secret** (click sur "Show" pour le voir)

11. **Pour tester rapidement:** Scroll vers le bas jusqu'à **"Access tokens"**
    - Click **"Generate access token"**
    - Copie ce token (c'est ton `MIRO_ACCESS_TOKEN` pour débuter)

### Étape 2: Configurer les Variables d'Environnement (1 min)

Ajoute dans `.env.local`:

```bash
# Miro Integration
MIRO_CLIENT_ID="your_client_id_here"
MIRO_CLIENT_SECRET="your_client_secret_here"
MIRO_ACCESS_TOKEN=""  # Sera rempli après OAuth

# App URL (déjà configuré normalement)
NEXT_PUBLIC_APP_URL="https://admin.solutionargentrapide.ca"
```

### Étape 3: Obtenir un Access Token (2 min)

#### Option A: Via OAuth Flow (Recommandé)
1. Lance le serveur: `npm run dev`
2. Va sur `http://localhost:3000/api/miro/auth`
3. Autorise l'app Miro
4. Tu seras redirigé et le token sera sauvegardé automatiquement

#### Option B: Token Manuel (Plus rapide pour tester)
1. Va dans les settings de ton app Miro
2. Section "OAuth & Permissions"
3. Click "Generate access token for development"
4. Copie le token
5. Ajoute-le dans `.env.local` → `MIRO_ACCESS_TOKEN="..."`

---

## 🎯 Utilisation

### Test 1: Vérifier la Connexion

```bash
curl http://localhost:3000/api/cortex/sync-miro
```

**Réponse attendue:**
```json
{
  "connected": true,
  "message": "Miro est connecté et prêt à synchroniser"
}
```

### Test 2: Créer un Board Architecture

1. Ouvre SAR Cortex: `https://admin.solutionargentrapide.ca/admin/performance`
2. Lance un "Diagnostic Complet"
3. Click sur le nouveau bouton **"📊 Synchroniser avec Miro"**
4. Attends 10-30 secondes
5. Un lien vers ton board Miro apparaîtra

**Ou via API:**

```bash
curl -X POST http://localhost:3000/api/cortex/sync-miro \
  -H "Content-Type: application/json" \
  -d '{
    "action": "create",
    "performanceData": [
      {
        "name": "Messages API",
        "url": "/api/admin/messages",
        "time": 23,
        "status": 200,
        "success": true,
        "critical": true,
        "timing": {
          "dns": 2,
          "tcp": 5,
          "tls": 8,
          "request": 4,
          "response": 4,
          "total": 23
        }
      }
    ]
  }'
```

---

## 🎨 Ce Que Tu Vas Voir sur Miro

### Board 1: System Architecture Map

```
┌──────────────────────────────────────────────────────────┐
│  💬 MESSAGES                    💰 VOPAY                  │
│  ┌──────────────┐              ┌──────────────┐         │
│  │ Messages API │              │VoPay Trans.  │         │
│  │ 🟢 23ms      │─────────────▶│ 🟡 89ms      │         │
│  └──────────────┘              └──────────────┘         │
│                                                           │
│  📊 ANALYTICS                   🔧 SUPPORT                │
│  ┌──────────────┐              ┌──────────────┐         │
│  │Analytics API │              │Support API   │         │
│  │ 🟢 34ms      │              │ 🟢 45ms      │         │
│  └──────────────┘              └──────────────┘         │
└──────────────────────────────────────────────────────────┘
```

**Légende des couleurs:**
- 🟢 Vert (< 50ms): Performance excellente
- 🟡 Jaune (50-150ms): Performance bonne
- 🟠 Orange (150-300ms): Performance lente
- 🔴 Rouge (> 300ms): Performance critique

---

## 🔄 Mises à Jour Automatiques

### Option 1: Mise à Jour Manuelle
1. Dans SAR Cortex, click **"🔄 Mettre à jour Miro"**
2. Les métriques sont rafraîchies sur le board existant

### Option 2: Mise à Jour Auto (Cron Job)

Ajoute dans `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cortex/auto-sync-miro",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

Crée `/api/cortex/auto-sync-miro/route.ts`:

```typescript
export async function GET() {
  // Lance les tests de performance
  // Sync avec Miro
  // Return status
}
```

---

## 🎯 Use Cases Immédiats

### 1. Visualisation Architecture (Maintenant)
✅ Voir tous tes endpoints en un coup d'œil
✅ Identifier visuellement les APIs lentes
✅ Comprendre les relations entre services

### 2. Monitoring Performance (Cette semaine)
✅ Board mis à jour automatiquement toutes les 5 min
✅ Alertes visuelles si dégradation
✅ Historique des performances

### 3. Documentation Vivante (Prochaine étape)
✅ Board = source unique de vérité
✅ Auto-update quand code change
✅ Onboarding nouveaux devs accéléré

### 4. War Room (Quand incident)
✅ Board spécial créé automatiquement
✅ Toute l'équipe collabore visuellement
✅ Timeline des événements tracée

---

## 🐛 Troubleshooting

### "Miro non configuré"
- ✅ Vérifie que `MIRO_ACCESS_TOKEN` est dans `.env.local`
- ✅ Redémarre le serveur après changement de `.env`

### "Rate limit exceeded"
- ✅ Attends 1 minute (limite: 100k crédits/min)
- ✅ Si persistant, ton token est peut-être utilisé ailleurs

### "Board creation failed"
- ✅ Vérifie les scopes de ton app Miro
- ✅ Assure-toi que `boards:write` est activé

### "No items found"
- ✅ Lance d'abord un diagnostic dans Cortex
- ✅ Assure-toi que `performanceData` n'est pas vide

---

## 🚀 Prochaines Fonctionnalités

### Cette Semaine
- [ ] Bouton "Sync Miro" dans SAR Cortex UI
- [ ] OAuth flow complet (pas besoin de token manuel)
- [ ] Sauvegarde des boards créés dans Supabase

### Ce Mois
- [ ] Board "Performance Dashboard" avec graphiques
- [ ] Board "API Flow Analyzer" pour tracer user journeys
- [ ] Alertes Slack/Email quand board détecte problème
- [ ] Export des boards en PDF pour reporting

### Roadmap
- [ ] Intelligence: détection automatique des patterns
- [ ] Prédictions: alertes avant que problème arrive
- [ ] Intégration GitHub: annotations de code sur Miro
- [ ] Time-travel: replay des flows historiques

---

## 📚 Ressources

### Documentation
- [Miro REST API Docs](https://developers.miro.com/docs/rest-api-introduction)
- [SAR Cortex × Miro Full Guide](./SAR-CORTEX-MIRO-INTEGRATION.md)

### Support
- Questions? → Check `#dev-cortex` sur Slack
- Bugs? → Ouvre un issue sur GitHub
- Features? → Ajoute dans le board Miro "Feature Requests"

---

## ✅ Checklist de Démarrage

- [ ] App Miro créée avec credentials
- [ ] `.env.local` configuré avec `MIRO_CLIENT_ID` et `MIRO_CLIENT_SECRET`
- [ ] Access token obtenu (via OAuth ou manuel)
- [ ] Test de connexion OK (`/api/cortex/sync-miro`)
- [ ] Premier board créé avec succès
- [ ] Board visible sur [miro.com](https://miro.com)

**Temps total:** ~5 minutes ⚡

---

**Prêt?** Lance `npm run dev` et va sur `/admin/performance` pour synchroniser ton premier board! 🚀
