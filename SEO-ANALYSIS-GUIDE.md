# Guide d'Analyse Complète de /admin/seo

Ce guide décrit comment utiliser le test Playwright pour analyser en détail la page `/admin/seo` en production.

## Ce que fait le test

Le test Playwright `seo-complete-analysis.spec.ts` effectue les actions suivantes:

1. **Connexion Admin**
   - Se connecte sur `https://admin.solutionargentrapide.ca/admin/login`
   - Utilise le mot de passe: `FredRosa%1978`
   - Capture un screenshot de la page de login

2. **Navigation vers /admin/seo**
   - Va sur la page `/admin/seo`
   - Attend le chargement complet de la page
   - Capture un screenshot pleine page et viewport

3. **Lecture des Valeurs**
   - Lit TOUTES les valeurs affichées sur la page
   - Extrait les métriques principales:
     - Utilisateurs
     - Sessions
     - Engagement
     - Conversions
   - Détecte si ce sont les **vraies données (1955)** ou le **cache (377)**

4. **Analyse des Tableaux**
   - Cherche la section "Données Détaillées Jour par Jour"
   - Liste tous les tableaux présents
   - Capture un screenshot de chaque tableau
   - Analyse les en-têtes et le nombre de lignes

5. **Test du Modal**
   - Scroll vers le premier tableau
   - Clique sur la première ligne
   - Vérifie si un modal s'ouvre
   - Compte le nombre de métriques dans le modal (doit être 100+)
   - Capture un screenshot du modal

6. **Génération du Rapport**
   - Crée un rapport HTML détaillé avec tous les screenshots
   - Génère un rapport JSON avec toutes les données brutes
   - Liste tous les problèmes détectés

## Utilisation Rapide

### Option 1: Script Shell (Recommandé)

```bash
# Rendre le script exécutable (une seule fois)
chmod +x run-seo-analysis.sh

# Exécuter l'analyse
./run-seo-analysis.sh
```

Le script va:
- Nettoyer les anciens artifacts
- Installer Playwright si nécessaire
- Exécuter le test complet
- Afficher les résultats dans le terminal
- Ouvrir le rapport HTML dans le navigateur

### Option 2: Commande Playwright Directe

```bash
cd e2e
npx playwright test seo-complete-analysis.spec.ts --project=chromium
```

## Résultats Générés

Tous les fichiers sont créés dans: `e2e/test-artifacts/seo-analysis/`

### Fichiers Générés

1. **rapport-complet.html** - Rapport HTML avec:
   - Résumé des résultats
   - Type de données (cache ou vraies données)
   - Toutes les métriques trouvées
   - Liste des problèmes
   - Tous les screenshots avec descriptions

2. **rapport-complet.json** - Données brutes en JSON:
   - Timestamps de chaque étape
   - Toutes les valeurs extraites
   - Structure complète de la page
   - Liste exhaustive des problèmes

3. **Screenshots** (PNG):
   - `01-login-page.png` - Page de connexion
   - `02-seo-page-full.png` - Page SEO complète
   - `03-seo-page-viewport.png` - Page SEO viewport
   - `04-tableau-X.png` - Chaque tableau trouvé
   - `05-avant-clic-tableau.png` - Avant le clic
   - `06-apres-clic-no-modal.png` - Si pas de modal
   - `07-modal-ouvert.png` - Modal ouvert (pleine page)
   - `08-modal-full.png` - Modal en plein écran

## Interprétation des Résultats

### Type de Données

Le test détecte automatiquement:

- **CACHE (377 utilisateurs)**: Anciennes données en cache
  - Problème: Les données ne sont pas à jour
  - Action: Vérifier pourquoi le cache n'est pas invalidé

- **VRAIES DONNÉES (1955 utilisateurs)**: Données actuelles
  - OK: Les données sont à jour
  - Continuez avec les autres vérifications

- **Autres valeurs**: Données différentes
  - À investiguer: Pourquoi la valeur est différente?

### Tableaux

- **0 tableau**: Problème majeur - aucun tableau n'est affiché
- **1+ tableaux**: OK - analyser le contenu de chaque tableau
  - Le test clique sur la première ligne du premier tableau

### Modal

- **Modal trouvé avec 100+ métriques**: OK - le modal fonctionne correctement
- **Modal trouvé avec < 100 métriques**: Avertissement - le modal ne contient pas toutes les métriques
- **Modal non trouvé**: Erreur - le clic n'a pas ouvert le modal

## Problèmes Courants

### 1. Test échoue à la connexion
- Vérifier que l'URL est accessible
- Vérifier le mot de passe: `FredRosa%1978`
- Vérifier que la page de login existe

### 2. Aucune métrique trouvée
- La page peut prendre du temps à charger
- Vérifier les selectors dans le code
- Les données peuvent être dans un iframe

### 3. Modal ne s'ouvre pas
- Le sélecteur de la ligne peut être incorrect
- Le modal peut avoir un délai d'animation
- Vérifier les screenshots pour voir ce qui est affiché

### 4. jq non installé
Pour un meilleur affichage dans le terminal:
```bash
# macOS
brew install jq

# Linux
sudo apt-get install jq
```

## Configuration Avancée

### Changer l'URL ou le Mot de Passe

Éditer `e2e/specs/seo-complete-analysis.spec.ts`:

```typescript
const baseURL = 'https://admin.solutionargentrapide.ca';
const password = 'FredRosa%1978';
```

### Augmenter les Timeouts

Si la page est lente:

```typescript
test.setTimeout(300000); // 5 minutes au lieu de 3
```

### Désactiver l'Ouverture Automatique du Rapport

Éditer `run-seo-analysis.sh` et commenter:

```bash
# open "$ARTIFACTS_DIR/rapport-complet.html"
```

## Debugging

### Voir le Navigateur Pendant le Test

```bash
cd e2e
npx playwright test seo-complete-analysis.spec.ts --project=chromium --headed
```

### Mode Debug Interactif

```bash
cd e2e
npx playwright test seo-complete-analysis.spec.ts --project=chromium --debug
```

### Voir les Logs Complets

```bash
cd e2e
DEBUG=pw:api npx playwright test seo-complete-analysis.spec.ts --project=chromium
```

## Intégration CI/CD

### GitHub Actions

```yaml
- name: Analyse SEO
  run: |
    chmod +x run-seo-analysis.sh
    ./run-seo-analysis.sh

- name: Upload SEO Report
  uses: actions/upload-artifact@v3
  with:
    name: seo-analysis-report
    path: e2e/test-artifacts/seo-analysis/
```

### Exécution Planifiée

Utiliser cron pour analyser la page régulièrement:

```bash
# Tous les jours à 8h
0 8 * * * cd /path/to/sar && ./run-seo-analysis.sh
```

## Personnalisation

### Ajouter Plus de Métriques

Éditer le test et ajouter:

```typescript
const nouvelleMetrique = await page.textContent('.ma-metrique');
rapport.donnees.nouvelleMetrique = nouvelleMetrique;
```

### Tester d'Autres Pages

Dupliquer le test et changer l'URL:

```typescript
await page.goto(`${baseURL}/admin/autre-page`, { waitUntil: 'networkidle' });
```

## Support

Pour toute question ou problème:

1. Vérifier les screenshots générés
2. Consulter le rapport JSON pour les données brutes
3. Exécuter en mode `--headed` ou `--debug`
4. Vérifier les logs du serveur

## Changelog

- **2026-01-21**: Création initiale du test et du guide

## À Faire

- [ ] Ajouter des tests pour d'autres pages admin
- [ ] Créer des alertes automatiques si cache détecté
- [ ] Intégrer avec Slack/Discord pour notifications
- [ ] Ajouter des tests de performance (temps de chargement)
