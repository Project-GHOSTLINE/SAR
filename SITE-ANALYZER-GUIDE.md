# 🕷️ SAR - Site Analyzer Guide

**Analyseur automatique de site** - Détecte toutes les erreurs sur solutionargentrapide.ca

## 🎯 Qu'est-ce que ça fait?

L'analyseur de site va automatiquement:

✅ **Crawler toutes les pages** de ton site
✅ **Détecter les erreurs JavaScript** (console errors, exceptions)
✅ **Trouver les liens cassés** (404, 500, etc.)
✅ **Capturer les erreurs réseau** (API failures, timeouts)
✅ **Mesurer les performances** (pages lentes)
✅ **Prendre des screenshots** des pages avec erreurs
✅ **Générer un rapport HTML** détaillé et visuel

---

## 🚀 Utilisation Rapide

### Option 1: Analyser le site local

```bash
# Assure-toi que l'app tourne
npm run dev:4000

# Dans un autre terminal
cd "/Users/xunit/Desktop/📁 Projets/sar"
npm run analyze:site

# Voir le rapport
npm run analyze:report
```

### Option 2: Via Makefile (plus court)

```bash
make analyze              # Lance l'analyse
make analyze-report       # Voir le rapport
```

---

## 📊 Ce que l'analyse va détecter

### 1. Erreurs JavaScript 🐛

**Exemples détectés**:
```
❌ Uncaught TypeError: Cannot read property 'x' of undefined
❌ ReferenceError: myFunction is not defined
❌ SyntaxError: Unexpected token
⚠️  Console warning: Deprecated API usage
```

### 2. Liens Cassés 🔗

**Exemples détectés**:
```
❌ http://localhost:4000/admin/quickbooks → 404 Not Found
❌ http://localhost:4000/api/missing → 500 Internal Server Error
⚠️  http://localhost:4000/old-page → 301 Redirect
```

### 3. Erreurs Réseau 🌐

**Exemples détectés**:
```
❌ Failed to load: http://localhost:4000/api/data (CORS error)
❌ Request timeout: http://localhost:4000/slow-api
❌ HTTP 403: http://localhost:4000/api/unauthorized
```

### 4. Pages Lentes 🐌

**Exemples détectés**:
```
⚠️  /admin/dashboard → 3500ms (slow)
⚠️  /api/reports/heavy → 4200ms (slow)
```

### 5. Exceptions Non Gérées ⚡

**Exemples détectés**:
```
❌ Unhandled Promise Rejection
❌ Network request failed
❌ JSON.parse error
```

---

## 📈 Rapport Généré

### Rapport HTML (Visuel)

**Contient**:
- 📊 **Statistiques globales**: total pages, erreurs, warnings
- 🔗 **Liste des liens cassés**
- 🐛 **Liste des erreurs JavaScript**
- 🌐 **Erreurs réseau**
- 📄 **Tableau de toutes les pages** avec statut, temps de chargement
- 📸 **Screenshots** des pages avec erreurs

**Design**: Interface moderne, dark theme, filtres, recherche

**Localisation**: `test-artifacts/site-analysis/report.html`

### Rapport JSON (Machine-readable)

**Contient**:
- Données brutes complètes
- Structure programmatique
- Idéal pour CI/CD

**Localisation**: `test-artifacts/site-analysis/report.json`

---

## 🔧 Configuration

### Analyser le site de PRODUCTION

Par défaut, l'analyseur teste `localhost:4000`. Pour tester le site de production:

1. Crée un fichier: `e2e/.env.analyzer`

```bash
BASE_URL=https://admin.solutionargentrapide.ca
```

2. Modifie `playwright.config.ts`:

```typescript
// Utilise BASE_URL depuis l'environnement
use: {
  baseURL: process.env.BASE_URL || 'http://localhost:4000',
}
```

3. Lance l'analyse:

```bash
BASE_URL=https://admin.solutionargentrapide.ca npm run analyze:site
```

### Limiter le nombre de pages

Par défaut: max 50 pages (pour éviter boucles infinies)

Pour changer, édite `e2e/specs/site-analyzer.spec.ts`:

```typescript
// Ligne ~215
if (report.totalPages >= 100) {  // Change 50 → 100
  console.log('\n⚠️  Reached maximum page limit (100)');
  break;
}
```

### Ajouter des pages spécifiques

Édite `e2e/specs/site-analyzer.spec.ts`:

```typescript
// Ligne ~189
const knownPages = [
  '/',
  '/admin',
  '/admin/dashboard',
  '/admin/quickbooks',     // Ajoute ici
  '/api/quickbooks/status',
  '/contact',              // Ajoute d'autres pages
];
```

---

## 📖 Exemples de Résultats

### Exemple 1: Tout fonctionne ✅

```
🕷️  Starting Site Analysis
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Base URL: http://localhost:4000

🔍 Analyzing: http://localhost:4000/
  ✅ Loaded in 234ms
  📊 Found 15 links, 0 errors

🔍 Analyzing: http://localhost:4000/admin
  ✅ Loaded in 156ms
  📊 Found 8 links, 0 errors

📈 ANALYSIS SUMMARY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total Pages Analyzed: 10
Total Errors: 0 ❌
Total Warnings: 0 ⚠️

✅ ALL GOOD! No errors found.
```

### Exemple 2: Erreurs détectées ❌

```
🕷️  Starting Site Analysis
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔍 Analyzing: http://localhost:4000/admin/quickbooks
  ❌ Error: HTTP 404
  📸 Screenshot saved: test-artifacts/site-analysis/admin_quickbooks.png

🔍 Analyzing: http://localhost:4000/api/broken
  ❌ Error: Network Failed

📈 ANALYSIS SUMMARY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total Pages Analyzed: 12
Total Errors: 5 ❌
Total Warnings: 2 ⚠️

🔗 Broken Links (2):
  - http://localhost:4000/admin/quickbooks
  - http://localhost:4000/api/broken

🐛 JavaScript Errors (2):
  - [http://localhost:4000/dashboard] Uncaught TypeError: Cannot read...
  - [http://localhost:4000/admin] ReferenceError: foo is not defined

🌐 Network Errors (1):
  - HTTP 500: /api/quickbooks/reports/profit-loss
```

---

## 🎯 Cas d'Utilisation

### Cas 1: Avant un déploiement

```bash
# 1. Lance l'app localement
npm run dev:4000

# 2. Analyse le site
make analyze

# 3. Vérifie le rapport
make analyze-report

# 4. Corrige les erreurs trouvées

# 5. Re-teste
make analyze
```

### Cas 2: Après un déploiement en production

```bash
# Analyse le site de prod
BASE_URL=https://admin.solutionargentrapide.ca npm run analyze:site

# Voir le rapport
make analyze-report
```

### Cas 3: Debugging d'un problème utilisateur

```bash
# L'utilisateur signale une erreur sur /admin/dashboard

# 1. Lance l'analyse
make analyze

# 2. Ouvre le rapport HTML
make analyze-report

# 3. Cherche "/admin/dashboard" dans le rapport
# 4. Vois les erreurs JavaScript, screenshots, network errors
# 5. Fix le problème
```

### Cas 4: Intégration CI/CD

Ajoute dans `.github/workflows/site-analysis.yml`:

```yaml
name: Site Analysis

on:
  push:
    branches: [main]
  pull_request:
  schedule:
    - cron: '0 0 * * *'  # Daily at midnight

jobs:
  analyze:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4

      - name: Install dependencies
        run: npm ci

      - name: Build and start app
        run: |
          npm run build
          npm run start &
          sleep 10

      - name: Run site analysis
        run: npm run analyze:site

      - name: Upload report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: site-analysis-report
          path: test-artifacts/site-analysis/

      - name: Fail if errors found
        run: |
          ERRORS=$(jq '.totalErrors' test-artifacts/site-analysis/report.json)
          if [ "$ERRORS" -gt 0 ]; then
            echo "❌ Found $ERRORS errors"
            exit 1
          fi
```

---

## 🐛 Troubleshooting

### Problème: "No pages analyzed"

**Solution**:
```bash
# Vérifie que l'app tourne
curl http://localhost:4000

# Si pas de réponse, démarre l'app
npm run dev:4000
```

### Problème: "Timeout errors"

**Solution**: Augmente le timeout dans `site-analyzer.spec.ts`:

```typescript
await page.goto(url, {
  waitUntil: 'networkidle',
  timeout: 60000  // Change 30000 → 60000
});
```

### Problème: "Too many pages crawled"

**Solution**: L'analyseur trouve des boucles infinies. Réduis la limite:

```typescript
if (report.totalPages >= 20) {  // Limite à 20 pages
  break;
}
```

### Problème: "Screenshots not found"

**Solution**: Vérifie les permissions:

```bash
chmod -R 755 test-artifacts/site-analysis
```

---

## 📚 Commandes Complètes

### npm Scripts

```bash
# Analyse complète
npm run analyze:site

# Voir le rapport HTML
npm run analyze:report
```

### Makefile

```bash
# Analyse complète
make analyze

# Voir le rapport
make analyze-report
```

### Direct Playwright

```bash
# Analyse avec Playwright directement
cd e2e
npx playwright test site-analyzer --project=chromium

# Avec options
npx playwright test site-analyzer --headed      # Voir le browser
npx playwright test site-analyzer --debug       # Mode debug
```

---

## 🎨 Personnalisation du Rapport HTML

Pour changer le style du rapport, édite la fonction `generateHTMLReport()` dans `site-analyzer.spec.ts`.

**Exemples**:

```typescript
// Changer les couleurs
background: #1a1a2e;  // Au lieu de #0f172a

// Ajouter des sections
<div class="section">
  <h2>Custom Section</h2>
  <!-- Ton contenu -->
</div>

// Modifier les badges
.badge.critical { background: #dc2626; }
```

---

## 🚀 Prochaines Améliorations

Fonctionnalités à ajouter:

1. **Lighthouse Integration** - Score de performance, SEO, accessibilité
2. **Comparaison historique** - Voir l'évolution des erreurs
3. **Alertes Slack/Email** - Notification automatique si erreurs
4. **Analyse de sécurité** - XSS, CSRF, headers manquants
5. **Tests d'accessibilité** - WCAG compliance
6. **Mobile testing** - Responsive issues

---

## 📊 Statistiques Typiques

**Site en santé**:
- Pages: 10-30
- Erreurs: 0
- Warnings: 0-2
- Temps moyen: <500ms

**Site avec problèmes**:
- Pages: 10-30
- Erreurs: 5+
- Warnings: 10+
- Temps moyen: >1000ms

---

## ✅ Checklist Avant Production

```bash
☐ make analyze (0 erreurs)
☐ make api-test (tous tests passent)
☐ make e2e (tous tests passent)
☐ Performance < 1s par page
☐ Aucun lien cassé
☐ Aucune erreur JavaScript
☐ Aucune erreur réseau
```

---

## 🆘 Support

**En cas de problème**:

1. Vérifie que l'app tourne: `curl http://localhost:4000`
2. Vérifie les logs: `test-artifacts/logs/e2e.log`
3. Regarde les screenshots: `test-artifacts/site-analysis/*.png`
4. Consulte le rapport JSON: `test-artifacts/site-analysis/report.json`

---

**Dernière mise à jour**: 2026-01-21
**Version**: 1.0.0
**Auteur**: SAR Team
