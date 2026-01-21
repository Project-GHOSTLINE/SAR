# 🤖 Claude Code - E2E Testing Tools

Ce guide décrit les outils disponibles pour que Claude Code puisse gérer automatiquement les tests E2E.

## 🎯 Règles de Sécurité

**CRITIQUE**: Ces outils sont configurés pour un environnement de test ISOLÉ.

- ❌ **JAMAIS** utiliser des credentials production
- ❌ **JAMAIS** pointer `BASE_URL` vers production
- ✅ Utiliser `BASE_URL=http://localhost:3000` ou staging uniquement
- ✅ Utiliser `INTUIT_ENVIRONMENT=sandbox` pour QuickBooks
- ✅ Tous les secrets doivent rester dans `.env.test` (gitignored)

---

## 📋 Commandes Autorisées

### Tests Rapides
```bash
make smoke          # Tests critiques uniquement (1-2 min)
make test-quickbooks # Tests QuickBooks uniquement
make test-auth      # Tests authentification uniquement
```

### Tests Complets
```bash
make reset          # Nettoyer les artifacts
make e2e            # Suite complète (avec reset)
make e2e-quick      # Suite complète (sans reset)
```

### Docker Stack
```bash
make stack-up       # Démarrer n8n + playwright-runner
make stack-down     # Arrêter tous les containers
make stack-logs     # Voir les logs n8n
```

### Artifacts et Debugging
```bash
make report         # Ouvrir le rapport HTML
make trace          # Voir la dernière trace Playwright
make collect        # Packager tous les artifacts
```

---

## 📊 Lire les Résultats

### Après un test, vérifier:

1. **Exit code**
   - `0` = ✅ Tous les tests passent
   - `1` = ❌ Au moins un test échoue

2. **Logs**
   - `test-artifacts/logs/e2e.log` (tests complets)
   - `test-artifacts/logs/smoke.log` (smoke tests)

3. **Rapport HTML**
   - `test-artifacts/playwright-report/index.html`
   - Ouvrir avec `make report`

4. **Traces (debugging)**
   - `test-artifacts/traces/*.zip`
   - Ouvrir avec `make trace`

5. **Screenshots (failures)**
   - `test-artifacts/screenshots/*.png`

---

## 🔄 Workflow Recommandé

### Après un changement de code:

```bash
# 1. Reset l'environnement
make reset

# 2. Tests rapides d'abord
make smoke

# 3. Si smoke OK, tests complets
make e2e

# 4. Si FAIL, analyser
make report    # Voir le rapport
make trace     # Voir la trace détaillée

# 5. Proposer un fix, puis re-run
make e2e-quick
```

---

## 📁 Structure des Fichiers

```
e2e/
├── plans/          # Plans Markdown (Planner Agent)
├── specs/          # Tests générés (.spec.ts)
├── fixtures/       # Données de test
├── storage/        # Auth state (storage state)
└── playwright.config.ts

test-artifacts/
├── playwright-report/  # Rapport HTML
├── traces/            # Traces Playwright
├── screenshots/       # Screenshots (failures)
├── logs/              # Logs texte
├── junit.xml          # Rapport JUnit (CI)
└── results.json       # Résultats JSON

tools/
├── reset_env.sh       # Nettoyer artifacts
├── run_e2e.sh         # Lancer suite complète
├── run_smoke.sh       # Lancer smoke tests
└── collect_artifacts.sh # Packager artifacts

n8n/workflows/
└── *.json             # Workflows n8n exportés
```

---

## 🧪 Écrire des Tests

### Test tags disponibles:

```typescript
test('should login @smoke @auth', async ({ page }) => {
  // Test rapide et critique
});

test('should sync customers @quickbooks', async ({ page }) => {
  // Test QuickBooks spécifique
});
```

### Lancer par tag:
```bash
make test-quickbooks  # Seulement @quickbooks
make smoke            # Seulement @smoke
```

---

## 🔧 Variables d'Environnement

Définies dans `.env.test`:

```bash
BASE_URL=http://localhost:3000      # URL de test
ADMIN_PASSWORD=***                  # Password admin
INTUIT_CLIENT_ID=***                # QuickBooks sandbox
INTUIT_CLIENT_SECRET=***            # QuickBooks sandbox
INTUIT_ENVIRONMENT=sandbox          # JAMAIS production
TEST_MODE=true                      # Flag de test
```

---

## 🐛 Debugging

### Si les tests échouent:

1. **Lire les logs**
   ```bash
   cat test-artifacts/logs/e2e.log
   ```

2. **Voir le rapport HTML**
   ```bash
   make report
   ```

3. **Inspecter la trace**
   ```bash
   make trace
   ```

4. **Voir les screenshots**
   ```bash
   open test-artifacts/screenshots/
   ```

### Si l'app ne démarre pas:

```bash
# Vérifier que l'app tourne
curl http://localhost:3000

# Démarrer l'app si nécessaire
npm run dev
```

---

## 🚀 n8n Workflows

### Démarrer n8n:
```bash
make stack-up
```

### Accéder à n8n:
http://localhost:5678

### Workflows disponibles:
- `run-e2e-on-push.json` - Lancer E2E après un push Git
- `notify-on-failure.json` - Notifier si tests échouent
- `scheduled-smoke.json` - Smoke tests toutes les heures

---

## 📊 Intégration CI/CD

### Simulation locale:
```bash
make ci
```

Cela exécute:
1. `make reset` (nettoyer)
2. `make e2e` (tests complets)
3. `make collect` (packager artifacts)

---

## ⚠️ Limitations

- Les tests ne doivent **JAMAIS** modifier de données en production
- `BASE_URL` doit pointer vers localhost ou staging
- Les credentials prod ne doivent **JAMAIS** être dans `.env.test`
- Les tests utilisent QuickBooks Sandbox uniquement
- Storage state est partagé entre tests (auth persistante)

---

## 🆘 Aide

### Lister toutes les commandes:
```bash
make help
```

### Problèmes communs:

**"No tests found"**
→ Vérifier que des fichiers `*.spec.ts` existent dans `e2e/specs/`

**"Cannot connect to localhost:3000"**
→ Démarrer l'app: `npm run dev`

**"Playwright not installed"**
→ Installer: `cd e2e && npm ci && npx playwright install chromium`

**"Permission denied"**
→ Rendre exécutable: `chmod +x tools/*.sh`

---

## 📚 Ressources

- **Playwright Docs**: https://playwright.dev
- **n8n Docs**: https://docs.n8n.io
- **Project README**: `/README.md`
- **QuickBooks Sandbox**: https://developer.intuit.com/app/developer/dashboard
