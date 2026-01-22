# Installation du Système de Détection de Fraude - Guide Rapide

## ✅ Étape 1: Créer la table dans Supabase

```bash
# Option 1: Via l'interface web Supabase
# 1. Ouvrez https://dllyzfuqjzuhvshrlmuq.supabase.co
# 2. Allez dans "SQL Editor"
# 3. Copiez le contenu de migrations/001_create_clients_fraud_detection.sql
# 4. Cliquez "Run"

# Option 2: Via psql (si vous avez accès direct)
psql "postgresql://postgres:Solution%99@db.dllyzfuqjzuhvshrlmuq.supabase.co:5432/postgres" \
  -f migrations/001_create_clients_fraud_detection.sql
```

## ✅ Étape 2: Importer les données depuis le CSV

```bash
# Installation de csv-parse si nécessaire
npm install csv-parse

# Import complet
tsx scripts/import-clients-sar.ts ~/Desktop/clientsar.csv

# Ou avec options
tsx scripts/import-clients-sar.ts ~/Desktop/clientsar.csv --skip-duplicates
```

**Durée**: ~2-3 minutes pour 3200 clients

**Ce que fait le script**:
- ✅ Lit et valide le CSV Margill
- ✅ Calcule automatiquement les scores de fraude
- ✅ Détecte les clients sans IBV
- ✅ Identifie les patterns suspects
- ✅ Insère par lots dans Supabase

## ✅ Étape 3: Accéder à l'interface

Ouvrez votre navigateur:
```
https://admin.solutionargentrapide.ca/admin/clients-sar
```

Le lien apparaît dans le menu de navigation admin, entre "Blacklist" et "Explorer".

## 🎯 Utilisation Immédiate

### Rechercher un client suspect

1. Allez sur `/admin/clients-sar`
2. Dans "Vérification IBV", sélectionnez **"Sans IBV"**
3. Dans "Score fraude minimum", sélectionnez **"60+ (Élevé)"**
4. Cliquez "Rechercher"

Résultat: Liste de tous les clients à risque élevé sans vérification bancaire.

### Voir les clients qui ont disparu après le 1er paiement

1. Cochez **"Mauvaises créances seulement"**
2. État: **"Actif"** (pour voir les dossiers encore ouverts)
3. Score minimum: **"40+ (Moyen)"**

### Exporter la liste noire

1. Filtrez selon vos critères
2. Cliquez "Exporter CSV"
3. Le fichier contient tous les indicateurs de fraude

## 🔧 Mises à Jour Régulières

Pour mettre à jour depuis Margill (hebdomadaire recommandé):

```bash
# Exporter nouveau CSV depuis Margill
# Puis:
tsx scripts/import-clients-sar.ts ~/Desktop/clientsar-nouveau.csv --skip-duplicates
```

Le flag `--skip-duplicates` fait un upsert (update + insert), donc:
- Nouveaux clients → insérés
- Clients existants → mis à jour
- Scores recalculés automatiquement

## 📊 Statistiques Disponibles

Le dashboard affiche en temps réel:
- Total de clients dans la base
- Nombre sans IBV (🚨 CRITIQUE)
- Clients en risque critique (score ≥ 80)
- Clients en risque élevé (score ≥ 60)
- Total mauvaises créances

## 🚨 Politique Recommandée

Basé sur les statistiques de fraude détectées:

### ❌ REFUSER AUTOMATIQUEMENT
- Score ≥ 80 (Critique)
- Pas d'IBV (`flag_pas_ibv = true`)
- Documents bancaires par email

### ⚠️ VÉRIFICATIONS MANUELLES
- Score 60-79 (Élevé)
- Contact téléphonique obligatoire
- Validation employeur

### ✅ ACCEPTER
- Score < 40 (Faible/Moyen)
- IBV complété (`flag_pas_ibv = false`)
- Pas d'historique de paiements ratés

## 🛠 Dépannage Rapide

### "Module 'csv-parse' not found"
```bash
npm install csv-parse
```

### "Supabase credentials not configured"
Vérifiez `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://dllyzfuqjzuhvshrlmuq.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

### "duplicate key value"
Utilisez `--skip-duplicates`:
```bash
tsx scripts/import-clients-sar.ts ~/Desktop/clientsar.csv --skip-duplicates
```

### Page blanche ou erreur 404
```bash
# Redémarrer le serveur Next.js
npm run dev
```

## 📚 Documentation Complète

Pour plus de détails, voir:
- **CLIENTS-SAR-FRAUD-DETECTION.md**: Documentation complète du système
- **migrations/001_create_clients_fraud_detection.sql**: Structure de la base de données
- **scripts/import-clients-sar.ts**: Code du script d'import

## ✉️ Support

Pour questions ou problèmes, contactez l'équipe technique SAR.

---

**Version**: 1.0.0
**Date**: 2026-01-22
