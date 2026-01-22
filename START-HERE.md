# 🚀 Système de Détection de Fraude - DÉMARRAGE RAPIDE

## Qu'est-ce que c'est?

Un système automatique qui analyse vos clients Margill et détecte les patterns de fraude:
- ✅ Calcul automatique d'un score de risque (0-100)
- ✅ Détection des clients sans vérification IBV
- ✅ Identification des paiements ratés précoces
- ✅ Interface de recherche puissante
- ✅ Export CSV pour analyse

## 🎯 Pourquoi?

Vous avez observé que certains clients:
1. Font une demande de prêt avec de fausses informations
2. Reçoivent l'argent
3. Disparaissent dès le premier paiement
4. Envoient des documents par email au lieu de faire l'IBV

**Ce système les détecte automatiquement.**

## ⚡ Installation Ultra-Rapide (5 minutes)

### Option 1: Script automatique

```bash
cd /Users/xunit/Desktop/📁\ Projets/sar
./setup-clients-sar.sh
```

Le script vous guide à travers:
1. Vérification des dépendances
2. Création de la table Supabase
3. Import des données CSV
4. Test de l'interface

### Option 2: Installation manuelle

#### Étape 1: Créer la table (2 min)
1. Ouvrez https://dllyzfuqjzuhvshrlmuq.supabase.co
2. SQL Editor → Copiez `migrations/001_create_clients_fraud_detection.sql`
3. Run

#### Étape 2: Importer les données (2 min)
```bash
npm install csv-parse
tsx scripts/import-clients-sar.ts ~/Desktop/clientsar.csv --skip-duplicates
```

#### Étape 3: Accéder à l'interface (30 sec)
Ouvrez: https://admin.solutionargentrapide.ca/admin/clients-sar

## 🎬 Première Utilisation

### Trouver les clients suspects sans IBV

1. Ouvrez `/admin/clients-sar`
2. Filtres:
   - Vérification IBV: **Sans IBV**
   - Score minimum: **60+ (Élevé)**
3. Cliquez "Rechercher"

**Résultat**: Liste des clients à haut risque sans vérification bancaire.

### Voir qui a disparu après le premier paiement

1. Cochez **"Mauvaises créances seulement"**
2. Score: **40+**
3. Rechercher

### Exporter la liste pour analyse

Cliquez "Exporter CSV" en haut à droite.

## 📊 Comprendre les Scores

Le système calcule automatiquement un score basé sur:

| Score | Niveau | Signification |
|-------|--------|---------------|
| 0-39  | FAIBLE | Client fiable |
| 40-59 | MOYEN  | Surveillance recommandée |
| 60-79 | ÉLEVÉ  | Vérifications approfondies requises |
| 80-100 | CRITIQUE | ⛔ Ne pas prêter |

### Indicateurs automatiques

- 🚨 **Pas IBV** (+40 points) - N'a pas complété la vérification bancaire
- 📧 **Documents email** (+30 points) - A envoyé des docs par email
- ⏱️ **Paiement raté précoce** (+25 points) - Défaut dans les 3 premiers mois
- 💸 **Mauvaise créance** (+20 points) - Créance irrécouvrable
- 📞 **Contact invalide** (+15 points) - Numéro déconnecté

## 🔄 Mise à Jour Régulière

**Recommandé: Hebdomadaire**

```bash
# 1. Exporter nouveau CSV depuis Margill
# 2. Importer:
tsx scripts/import-clients-sar.ts ~/Desktop/clientsar-nouveau.csv --skip-duplicates
```

Les scores sont recalculés automatiquement.

## 🎯 Nouvelle Politique Recommandée

Basé sur vos observations et les statistiques détectées:

### ⛔ REFUSER AUTOMATIQUEMENT
- Tout client sans IBV (`flag_pas_ibv = true`)
- Score ≥ 80
- Documents bancaires par email

### ⚠️ VÉRIFICATIONS MANUELLES
- Score 60-79
- Appeler l'employeur
- Valider les références

### ✅ ACCEPTER
- Score < 40
- IBV complété
- Pas d'historique négatif

**Règle stricte**: **Uniquement les clients avec IBV complet.**

## 📈 Statistiques Visibles

Le dashboard affiche en temps réel:
- Total de clients (3200+)
- % sans IBV (votre métrique clé)
- Clients en risque critique
- Mauvaises créances totales
- Top 10 des clients à risque

## 📚 Documentation

- **INSTALLATION-CLIENTS-SAR.md**: Guide d'installation détaillé
- **CLIENTS-SAR-FRAUD-DETECTION.md**: Documentation complète du système
- **migrations/**: Structure de la base de données
- **scripts/**: Code source du script d'import

## 🛠 Problèmes Courants

### "Module csv-parse not found"
```bash
npm install csv-parse
```

### "Supabase credentials not configured"
Vérifiez que `.env.local` contient les clés Supabase.

### Page blanche
```bash
npm run dev  # Redémarrer le serveur
```

### Doublons lors de l'import
Utilisez `--skip-duplicates` pour faire un upsert.

## 💡 Cas d'Usage Réels

### Scénario 1: Nouveau client qui demande un prêt
1. Il remplit le formulaire
2. Vous recevez sa demande
3. **Cherchez-le dans Clients SAR** (par email/téléphone)
4. Si score ≥ 60 ou pas d'IBV → ⛔ REFUSER

### Scénario 2: Client existant demande un 2e prêt
1. Cherchez son historique dans Clients SAR
2. Regardez ses paiements passés
3. Si score a augmenté → vérifications supplémentaires
4. Si tout est OK (score < 40) → approuver

### Scénario 3: Audit mensuel
1. Filtrez "Risque CRITIQUE"
2. Exportez en CSV
3. Envoyez à l'équipe de recouvrement
4. Mettez à jour les statuts dans Margill

## ✅ Checklist Post-Installation

- [ ] Table Supabase créée
- [ ] Données importées (3200+ clients)
- [ ] Interface accessible à `/admin/clients-sar`
- [ ] Lien visible dans le menu admin
- [ ] Première recherche testée
- [ ] Export CSV testé
- [ ] Équipe formée à l'utilisation

## 🎉 Vous êtes prêt!

Le système est opérationnel. Vous pouvez maintenant:
1. Détecter les fraudeurs automatiquement
2. Prendre des décisions basées sur des données
3. Réduire les pertes liées aux fausses demandes

**Action immédiate**: Allez sur `/admin/clients-sar` et filtrez par "Sans IBV" + "Score 60+" pour voir vos clients à risque.

---

**Questions?** Consultez CLIENTS-SAR-FRAUD-DETECTION.md ou contactez l'équipe technique.

**Version**: 1.0.0 | **Date**: 2026-01-22
