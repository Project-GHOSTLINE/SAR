# 🧪 E2E Testing Setup - SAR

## 📋 Vue d'ensemble

Ce projet dispose maintenant d'un système complet de tests E2E avec:

- ✅ **Playwright** - Tests automatisés navigateur
- ✅ **n8n** - Orchestration et automation
- ✅ **Docker** - Environnement isolé
- ✅ **Artifacts** - Traces, screenshots, rapports
- ✅ **MCP Ready** - Claude Code peut utiliser les tools

---

## 🚀 Démarrage Rapide

### 1. Lancer le stack Docker (optionnel pour n8n)

```bash
make stack-up
```

Cela démarre:
- n8n sur http://localhost:5678
- Playwright runner (container en background)

### 2. Lancer les tests

**Smoke tests** (rapide - 1-2 min):
```bash
make smoke
```

**Tests complets** (5-10 min):
```bash
make e2e
```

**Tests QuickBooks uniquement**:
```bash
make test-quickbooks
```

### 3. Voir les résultats

**Rapport HTML**:
```bash
make report
```

**Traces détaillées**:
```bash
make trace
```

---

## 📁 Structure

```
.
├── e2e/
│   ├── specs/              # Tests Playwright (.spec.ts)
│   │   ├── auth.setup.ts   # Setup: authentification
│   │   ├── smoke.spec.ts   # Tests critiques
│   │   └── quickbooks.spec.ts  # Tests QuickBooks
│   ├── plans/              # Plans tests (Markdown)
│   ├── fixtures/           # Données de test
│   ├── storage/            # Auth state
│   └── playwright.config.ts
│
├── test-artifacts/
│   ├── playwright-report/  # Rapport HTML
│   ├── traces/            # Traces debugging
│   ├── screenshots/       # Screenshots (failures)
│   └── logs/              # Logs texte
│
├── tools/
│   ├── reset_env.sh       # Nettoyer artifacts
│   ├── run_e2e.sh         # Lancer E2E
│   ├── run_smoke.sh       # Lancer smoke
│   └── collect_artifacts.sh  # Packager artifacts
│
├── n8n/
│   ├── workflows/         # Workflows automation
│   └── README.md
│
├── docker-compose.yml     # Stack n8n + playwright
├── Makefile              # Raccourcis commandes
├── .env                  # Config Docker (n8n)
├── .env.test             # Config tests (gitignored)
└── CLAUDE_TOOLS.md       # Guide pour Claude Code
```

---

## 🧪 Tests Disponibles

### Smoke Tests (@smoke)
Tests critiques rapides - valident que l'app fonctionne:
- App accessible
- Dashboard charge
- API répond
- QuickBooks page charge

### QuickBooks Tests (@quickbooks)
Tests d'intégration QuickBooks:
- Status API
- OAuth flow initiation
- Disconnect
- Sync customers
- Reports (profit-loss)

### Auth Tests (@auth)
Tests d'authentification:
- Login admin
- Session persistence

---

## 🔧 Configuration

### Variables d'environnement

Fichier `.env.test` (gitignored):
```bash
BASE_URL=http://localhost:3000
ADMIN_PASSWORD=***
INTUIT_CLIENT_ID=***
INTUIT_CLIENT_SECRET=***
INTUIT_ENVIRONMENT=sandbox
TEST_MODE=true
```

### Playwright config

`e2e/playwright.config.ts`:
- Timeout: 60s par test
- Retry: 1 fois
- Traces: sur failure
- Screenshots: sur failure
- Storage state: auth persistante

---

## 📊 Rapports et Debugging

### Après un test:

1. **Voir le rapport HTML**:
   ```bash
   make report
   ```
   - Liste tous les tests (pass/fail)
   - Temps d'exécution
   - Screenshots des failures

2. **Inspecter une trace**:
   ```bash
   make trace
   ```
   - Timeline complète
   - Network requests
   - Console logs
   - DOM snapshots

3. **Lire les logs**:
   ```bash
   cat test-artifacts/logs/e2e.log
   ```

---

## 🐳 Docker Stack

### Démarrer:
```bash
make stack-up
```

### Arrêter:
```bash
make stack-down
```

### Logs n8n:
```bash
make stack-logs
```

### Exécuter dans le runner:
```bash
docker exec -it sar-playwright-runner bash
cd /workspace
make smoke
```

---

## 🤖 n8n Automation

### Accéder à n8n:
http://localhost:5678

### Workflows disponibles:

1. **run-e2e-on-webhook.json**
   - Déclencher via: `POST http://localhost:5678/webhook/run-e2e`
   - Exécute les tests E2E
   - Retourne le résultat

2. **Créer vos workflows**
   - Voir `n8n/README.md` pour guides

---

## 🎯 Workflows Recommandés

### 1. Après chaque deploy Vercel:
```
Vercel Webhook → n8n → Run smoke tests → Notify Discord
```

### 2. Tests planifiés:
```
Cron (toutes les heures) → Run smoke → Log results
```

### 3. PR validation:
```
GitHub PR → n8n → Run E2E → Comment on PR
```

---

## 🔐 Sécurité

### Règles CRITIQUES:

- ❌ **JAMAIS** utiliser credentials production
- ❌ **JAMAIS** pointer BASE_URL vers production
- ✅ Tests sur localhost ou staging UNIQUEMENT
- ✅ QuickBooks sandbox UNIQUEMENT
- ✅ Fichiers `.env*` gitignored

### Fichiers sensibles:
- `.env` (Docker config)
- `.env.test` (Test credentials)
- `e2e/storage/state.json` (Auth tokens)
- `test-artifacts/` (peut contenir données)

Tous sont dans `.gitignore`.

---

## 📚 Commandes Utiles

```bash
# Tests
make smoke              # Tests rapides
make e2e                # Tests complets
make test-quickbooks    # QuickBooks uniquement

# Docker
make stack-up           # Démarrer n8n + runner
make stack-down         # Arrêter
make stack-logs         # Logs n8n

# Debugging
make report             # Ouvrir rapport HTML
make trace              # Voir trace
make collect            # Packager artifacts

# Maintenance
make reset              # Nettoyer artifacts
make install            # Installer dépendances
make clean              # Nettoyage complet

# Aide
make help               # Lister toutes les commandes
```

---

## 🐛 Troubleshooting

### Tests ne trouvent pas l'app
**Problème**: `Cannot connect to http://localhost:3000`

**Solution**:
```bash
npm run dev  # Démarrer l'app dans un autre terminal
```

---

### Playwright pas installé
**Problème**: `Executable doesn't exist at /Users/.../chromium-xxx`

**Solution**:
```bash
cd e2e
npm ci
npx playwright install chromium
```

---

### Permission denied sur scripts
**Problème**: `bash: ./tools/run_e2e.sh: Permission denied`

**Solution**:
```bash
chmod +x tools/*.sh
```

---

### n8n ne démarre pas
**Problème**: `Error: N8N_ENCRYPTION_KEY is required`

**Solution**: Fichier `.env` existe à la racine (créé automatiquement)

---

## 🎓 Pour aller plus loin

### Ajouter un nouveau test:

1. Créer `e2e/specs/mon-test.spec.ts`
2. Utiliser les tags: `@smoke`, `@quickbooks`, etc.
3. Lancer: `cd e2e && npx playwright test mon-test.spec.ts`

### Ajouter un workflow n8n:

1. Créer workflow dans n8n UI
2. Exporter: Menu → Download
3. Sauvegarder dans `n8n/workflows/`

### CI/CD Integration:

Voir workflow GitHub Actions template (à créer):
```yaml
# .github/workflows/e2e.yml
name: E2E Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: make install
      - run: npm run dev &
      - run: make smoke
```

---

## 📖 Documentation

- **CLAUDE_TOOLS.md** - Guide pour Claude Code
- **n8n/README.md** - Guide workflows n8n
- **Playwright Docs**: https://playwright.dev
- **n8n Docs**: https://docs.n8n.io

---

## ✅ Checklist Première Utilisation

- [ ] Docker installé et running
- [ ] Node.js 18+ installé
- [ ] `make install` exécuté
- [ ] `.env.test` créé (automatique)
- [ ] `make smoke` fonctionne
- [ ] `make report` ouvre le rapport
- [ ] `make stack-up` démarre n8n
- [ ] http://localhost:5678 accessible

---

## 🎉 Prochaines Étapes

1. **Connecter QuickBooks en sandbox**
   - Aller sur http://localhost:3000/admin/quickbooks
   - Cliquer "Connecter QuickBooks"
   - Choisir sandbox company

2. **Lancer les tests QuickBooks**
   ```bash
   make test-quickbooks
   ```

3. **Configurer n8n** (optionnel)
   - Accéder http://localhost:5678
   - Importer `n8n/workflows/run-e2e-on-webhook.json`
   - Activer le workflow

4. **Intégrer à votre CI/CD**
   - GitHub Actions
   - Vercel webhooks
   - Notifications Discord/Slack

---

**Questions?** Consulter `CLAUDE_TOOLS.md` ou les README dans chaque dossier.
