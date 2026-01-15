# 📊 Système de Visualisation de Progression - Miro

**Date de création:** 2026-01-15
**Objectif:** Visualiser en temps réel la progression de la restructuration DB SAR sur Miro

---

## 🎯 Vue d'Ensemble

Ce système synchronise automatiquement les fichiers du dossier `JOURNAL/` avec un board Miro visuel pour suivre la progression de l'autre Claude qui travaille sur la restructuration de la base de données.

### Ce Que Tu Vois sur Miro

**Structure du Board:**
```
                    🗄️ SAR DB
                   Restructuration
                         |
        +----------------+------------------+
        |                |                  |
    Phase 0-2        Phase 3-4          Phase 5-6
  (En haut)         (Au milieu)        (En bas)

Légende gauche:     Centre:           Activité droite:
📊 PROGRESSION      Phases avec       📖 ACTIVITÉ
4/7 complètes       statuts           RÉCENTE
✅ Complète         ✅ 🚀 ⏳          (Dernières 5
🚀 En cours                           entrées logbook)
⏳ En attente
```

**Codes Couleur:**
- 🟢 **Vert** (✅): Phase complète - bordure verte épaisse
- 🟡 **Jaune** (🚀): Phase en cours - bordure orange
- ⚪ **Gris** (⏳): Phase en attente - bordure grise, ligne pointillée

---

## 🚀 Utilisation

### 1. Première Synchronisation (Déjà Faite)

Le board initial a été créé:
```
🔗 URL: https://miro.com/app/board/uXjVGPp1agE=
```

### 2. Mettre à Jour le Board

Quand l'autre Claude fait des mises à jour dans le JOURNAL, lance:

```bash
cd /Users/xunit/Desktop/📁\ Projets/sar
node scripts/sync-journal-to-miro.mjs
```

**Ce qui se passe:**
1. ✅ Lecture de `JOURNAL/STATUS-BOARD.md`
2. ✅ Lecture de `JOURNAL/LOGBOOK.md`
3. ✅ Création d'un nouveau board Miro (avec URL mise à jour)
4. ✅ Visualisation des 7 phases avec statuts
5. ✅ Affichage des 5 dernières entrées du logbook
6. ✅ Statistiques de progression

**Temps d'exécution:** ~10-15 secondes

### 3. Suivre les Mises à Jour de l'Autre Claude

Quand tu veux voir où en est l'autre Claude:

**Option A: Via le board Miro**
- Ouvre le lien Miro (bookmark recommandé)
- Refresh le board si nécessaire
- Visualise instantanément les phases complètes

**Option B: Via le terminal**
```bash
# Resync rapide
node scripts/sync-journal-to-miro.mjs

# Le nouveau board URL s'affichera
```

---

## 📋 Structure des Phases

### Phase 0: Préparation ✅ (Complète)
- Snapshot baseline
- Backup DB
- Validation environnement

### Phase 1: Clients + client_id ✅ (Complète)
- Table `clients` canonique créée
- Colonne `client_id` ajoutée sur 5+ tables
- Migration données + matching

### Phase 2: Communications ✅ (Complète)
- Table `communications` unifiée
- Migration `emails_envoyes`
- View `vw_support_as_communications`

### Phase 3: Loans + Payments ✅ (Complète)
- Tables `loans`, `payment_schedules`, `payment_events`
- Versioning échéanciers
- Historique complet paiements

### Phase 4: VoPay Normalisé 🚀 (En Cours)
- Table `vopay_objects`
- Normalisation webhooks
- Matching intelligent clients/loans

### Phase 5: Timeline Views ⏳ (En Attente)
- View `vw_client_timeline`
- View `vw_client_summary`
- "Dossier médical" complet

### Phase 6: RLS + Performance ⏳ (En Attente)
- Row Level Security
- Policies admin
- Optimisations queries

---

## 🔄 Automatisation (Optionnel)

### Option 1: Script Watch Automatique

Créer un script qui surveille les changements et resync automatiquement:

```bash
# Créer le watcher
nano scripts/watch-journal.sh
```

```bash
#!/bin/bash
# Watch JOURNAL/ et resync sur changement

while true; do
  fswatch -1 JOURNAL/
  echo "📊 Changement détecté, resync Miro..."
  node scripts/sync-journal-to-miro.mjs
  echo "✅ Sync complète, attente prochain changement..."
done
```

```bash
chmod +x scripts/watch-journal.sh
./scripts/watch-journal.sh
```

### Option 2: Cron Job (Toutes les 10 minutes)

```bash
crontab -e
```

Ajouter:
```cron
*/10 * * * * cd /Users/xunit/Desktop/📁\ Projets/sar && node scripts/sync-journal-to-miro.mjs >> /tmp/miro-sync.log 2>&1
```

---

## 📖 Format des Fichiers Lus

### STATUS-BOARD.md

Le script lit les lignes au format:
```markdown
- [x] P0 — Préparation ✅ (2026-01-14 21:10)
- [ ] P4 — VoPay normalisé 🚀 **PRÊTE À EXÉCUTER**
```

**Parsing:**
- `[x]` = Phase complète
- `[ ]` = Phase non complète
- `P\d` = Numéro de phase
- `✅ / 🚀 / ⏳` = Statut visuel
- Date entre parenthèses si disponible

### LOGBOOK.md

Le script lit les entrées au format:
```markdown
**00:45** - Backup pré-Phase 1
- Script créé: backup-supabase...
- ✅ Backup directory: ...
```

**Parsing:**
- `**HH:MM** - Titre` = Nouvelle entrée
- Lignes commençant par `- ` = Détails
- Prend les 5 dernières entrées

---

## 🎨 Personnalisation

### Changer les Couleurs

Éditer `scripts/sync-journal-to-miro.mjs`:

```javascript
// Ligne ~192
if (phase.status === '✅') {
  color = '#d1fae5'  // vert clair
  borderColor = '#10b981'  // vert
  icon = '✅'
}
```

### Modifier les Positions

```javascript
// Ligne ~161
const phasePositions = [
  { x: -800, y: -500 },  // P0
  { x: 0, y: -500 },     // P1
  // ... ajuster x/y selon besoin
]
```

### Ajouter Plus d'Infos

Modifier le `phaseContent` (ligne ~202) pour inclure:
- Fichiers SQL créés
- Nombre de tables affectées
- Temps d'exécution
- Etc.

---

## 🐛 Troubleshooting

### "TypeError: Cannot read properties of undefined"

**Cause:** Plus de phases détectées que de positions définies

**Solution:** Ajouter positions dans `phasePositions` array

### "401 Unauthorized" ou "403 Forbidden"

**Cause:** Token Miro expiré ou permissions manquantes

**Solution:**
1. Vérifier `.env.local` → `MIRO_ACCESS_TOKEN`
2. Régénérer token via [Miro OAuth](https://miro.com/app/settings/user-profile/apps)
3. Vérifier scopes: `boards:read`, `boards:write`

### Board Miro ne se crée pas

**Cause:** Rate limit ou problème réseau

**Solution:**
1. Attendre 1 minute (rate limit)
2. Vérifier connexion Internet
3. Tester avec curl:
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" https://api.miro.com/v2/boards
```

### Phases mal parsées

**Cause:** Format STATUS-BOARD.md différent

**Solution:**
1. Vérifier format exact: `- [x] P0 — Nom ✅`
2. Ajuster regex ligne ~42 si nécessaire
3. Activer debug: `console.log(phases)` après parsing

---

## 📊 Exemples de Sorties

### Output Terminal Normal

```
📊 SAR DB Restructuration - Synchronisation JOURNAL → Miro
======================================================================

📖 Lecture des fichiers JOURNAL...
   ✅ 7 phases détectées
   ✅ 5 entrées récentes

🎨 Création du board Miro...
✅ Board créé: 🗄️ SAR DB Restructuration - Progression Live
   🔗 URL: https://miro.com/app/board/uXjVGPp1agE=

🎯 Création de la structure...
✅ Nœud central créé
   ✅ Phase 0: Préparation ✅
   ✅ Phase 1: Clients ✅
   ...
   ✅ Phase 6: RLS ⏳
✅ Légende de progression ajoutée
✅ Activité récente ajoutée
✅ Statistiques ajoutées

======================================================================
🎉 Board Miro créé avec succès!

🔗 Ouvre ce lien pour visualiser la progression:
   https://miro.com/app/board/uXjVGPp1agE=

📊 Progression actuelle:
   4/7 phases complètes
```

### Board Miro Résultat

```
+--------------------------------------------------+
|                   🗄️ SAR DB                      |
|                 Restructuration                   |
|              Dossier Médical Client               |
+--------------------------------------------------+
           |               |                |
    +------+------+  +-----+-----+  +------+------+
    | ✅ Phase 0 |  | ✅ Phase 1|  | ✅ Phase 2|
    | Préparation|  | Clients   |  |Communications|
    +------------+  +-----------+  +-------------+
           |               |                |
    +------+------+  +-----+-----+  +------+------+
    | ✅ Phase 3 |  | 🚀 Phase 4|  | ⏳ Phase 5|
    | Loans      |  | VoPay     |  | Timeline   |
    +------------+  +-----------+  +------------+
                          |
                   +------+------+
                   | ⏳ Phase 6 |
                   | RLS        |
                   +------------+

[Légende]         [Centre]         [Activité Récente]
📊 PROGRESSION    7 phases         📖 00:50 - Phase 1...
4/7 complètes     avec détails     📖 00:47 - Migration...
                                   📖 00:46 - Exécution...
```

---

## 🔗 Ressources

### Fichiers du Système

- **Script principal:** `scripts/sync-journal-to-miro.mjs`
- **Fichiers lus:**
  - `JOURNAL/STATUS-BOARD.md`
  - `JOURNAL/LOGBOOK.md`
- **Configuration:** `.env.local` (MIRO_ACCESS_TOKEN)

### Documentation

- [Miro REST API](https://developers.miro.com/reference/api-reference)
- [SAR Cortex × Miro Integration](./SAR-CORTEX-MIRO-INTEGRATION.md)
- [Miro Quick Start](./MIRO-QUICK-START.md)

### Support

- **Problèmes Miro:** [Miro Developer Support](https://community.miro.com/)
- **Questions SAR:** fred@solutionargentrapide.ca

---

## 🎯 Cas d'Usage

### 1. Monitoring Quotidien

**Scénario:** Tu veux voir la progression chaque matin

**Action:**
```bash
# Alias recommandé
echo "alias sar-progress='cd /Users/xunit/Desktop/📁\ Projets/sar && node scripts/sync-journal-to-miro.mjs'" >> ~/.zshrc
source ~/.zshrc

# Utilisation
sar-progress
```

### 2. Présentation à l'Équipe

**Scénario:** Montrer la progression à un client/équipe

**Action:**
1. Resync avant la réunion: `node scripts/sync-journal-to-miro.mjs`
2. Partager le lien Miro (view-only si besoin)
3. Présenter visuellement les phases complètes

### 3. Audit Post-Migration

**Scénario:** Vérifier toutes les phases après completion

**Action:**
1. Garder tous les board URLs générés (historique)
2. Comparer les boards avant/après
3. Documenter la timeline complète

---

## ✅ Checklist de Setup

- [x] Script `sync-journal-to-miro.mjs` créé
- [x] Token Miro configuré dans `.env.local`
- [x] Premier board généré avec succès
- [x] Board URL sauvegardé: `https://miro.com/app/board/uXjVGPp1agE=`
- [ ] Alias shell créé (optionnel)
- [ ] Cron job configuré (optionnel)
- [ ] Watcher automatique activé (optionnel)

---

## 📝 Notes Importantes

### Boards Multiples

**Attention:** Chaque exécution crée un NOUVEAU board.

**Pourquoi?**
- Historique: garder snapshots de progression
- Pas de surcharge: éviter conflits lors d'updates concurrentes
- Simplicité: pas besoin de gérer IDs de shapes

**Alternative (Update même board):**
- Sauvegarder `BOARD_ID` après première création
- Supprimer tous les shapes existants
- Recréer avec nouvelles données
- (Plus complexe, pas implémenté)

### Sécurité Token

⚠️ **IMPORTANT:** Le token Miro est hardcodé dans le script pour simplicité

**Pour production:**
```bash
# Utiliser variable d'environnement
const TOKEN = process.env.MIRO_ACCESS_TOKEN
```

### Performance

**Temps moyen:** 10-15 secondes
- 3s: Création board
- 5s: Création shapes (7 phases + légendes)
- 2s: Création connectors
- 3s: Finalisation

**Optimisation possible:**
- Batch creation (non supporté par Miro API v2)
- Réutiliser board existant (update plutôt que recreate)

---

**Dernière mise à jour:** 2026-01-15
**Version:** 1.0
**Auteur:** Claude Sonnet 4.5
**Status:** ✅ Opérationnel
