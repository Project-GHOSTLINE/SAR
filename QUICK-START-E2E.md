# ⚡ Quick Start - E2E Testing

## 🚀 Démarrage en 3 minutes

### Étape 1: Démarrer l'app (30 secondes)

**Terminal 1** - Lancer l'app Next.js:
```bash
cd /Users/xunit/Desktop/📁\ Projets/sar
npm run dev
```

Attendre que l'app démarre sur http://localhost:3000

---

### Étape 2: Lancer les smoke tests (1-2 minutes)

**Terminal 2** - Tests rapides:
```bash
cd /Users/xunit/Desktop/📁\ Projets/sar
make smoke
```

Résultat attendu:
```
[run_smoke] Starting smoke tests...
[run_smoke] Base URL: http://localhost:3000
[run_smoke] ========================================
[run_smoke] Running smoke tests...

Running 5 tests using 1 worker
✓ smoke.spec.ts:14:7 › app should be accessible @smoke
✓ smoke.spec.ts:20:7 › admin dashboard should load @smoke
✓ smoke.spec.ts:31:7 › API health check @smoke
✓ smoke.spec.ts:42:7 › QuickBooks page should load @smoke @quickbooks
✓ quickbooks.spec.ts:18:7 › should display QuickBooks connection status @smoke @quickbooks

5 passed (15s)

[run_smoke] ✅ Smoke tests passed!
```

---

### Étape 3: Voir le rapport (30 secondes)

```bash
make report
```

Cela ouvre le rapport HTML dans votre navigateur.

---

## ✅ Si tout fonctionne

Tu devrais voir:
- ✅ 5 tests passed
- ✅ Rapport HTML qui s'ouvre
- ✅ Aucune erreur

**Félicitations!** Le setup E2E fonctionne parfaitement.

---

## 🧪 Prochains Tests

### Test complet E2E (5-10 minutes)

```bash
make e2e
```

Exécute tous les 11 tests (smoke + QuickBooks complets).

### Tests QuickBooks uniquement

```bash
make test-quickbooks
```

**Note**: Certains tests QuickBooks vont skip si QB n'est pas connecté.

---

## 🔗 Connecter QuickBooks (optionnel)

Pour tester les endpoints QuickBooks:

1. **Ouvrir la page QB**
   ```bash
   open http://localhost:3000/admin/quickbooks
   ```

2. **Se connecter** (si pas déjà connecté)
   - Cliquer "Connecter QuickBooks"
   - Sélectionner sandbox company
   - Autoriser

3. **Re-lancer les tests**
   ```bash
   make test-quickbooks
   ```

Maintenant tous les tests devraient passer (pas de skip).

---

## 🐳 n8n Automation (optionnel)

Si tu veux tester l'orchestration n8n:

### Démarrer n8n
```bash
make stack-up
```

### Accéder à n8n
```bash
open http://localhost:5678
```

### Importer le workflow
1. Créer un compte / se connecter
2. Import from File
3. Sélectionner `n8n/workflows/run-e2e-on-webhook.json`
4. Activer le workflow

### Tester le webhook
```bash
curl -X POST http://localhost:5678/webhook/run-e2e
```

---

## 🎯 Commandes Essentielles

```bash
# Tests
make smoke          # Tests rapides (1-2 min)
make e2e            # Tests complets (5-10 min)

# Debugging
make report         # Voir rapport HTML
make trace          # Voir traces Playwright
make reset          # Nettoyer artifacts

# Docker
make stack-up       # Démarrer n8n
make stack-down     # Arrêter n8n

# Aide
make help           # Lister toutes les commandes
```

---

## 📊 Résultats Attendus

### Smoke Tests (si QB pas connecté)

```
✓ app should be accessible @smoke
✓ admin dashboard should load @smoke
✓ API health check @smoke
✓ QuickBooks page should load @smoke
✓ should display QuickBooks connection status @smoke

5 passed (15-30s)
```

### Smoke Tests (si QB connecté)

Même résultat + tests QuickBooks passent complètement.

---

## 🐛 Si Ça Ne Marche Pas

### Erreur: "Cannot connect to localhost:3000"

**Solution**: L'app n'est pas démarrée.
```bash
npm run dev
```

### Erreur: "Playwright not found"

**Solution**: Installer les dépendances.
```bash
cd e2e && npm ci && npx playwright install chromium
```

### Erreur: "No tests found"

**Solution**: Vérifier que les tests existent.
```bash
cd e2e && npx playwright test --list
```

### Erreur: "Permission denied"

**Solution**: Rendre les scripts exécutables.
```bash
chmod +x tools/*.sh
```

---

## 📖 Documentation Complète

Pour plus de détails:
- **Setup complet**: `E2E-TESTING-SETUP.md`
- **Guide Claude**: `CLAUDE_TOOLS.md`
- **Summary**: `E2E-IMPLEMENTATION-SUMMARY.md`

---

## ✨ Features Testées

Les smoke tests valident:
- ✅ App Next.js accessible
- ✅ Admin dashboard charge
- ✅ API endpoints répondent
- ✅ QuickBooks page accessible
- ✅ QuickBooks status API fonctionne

---

**Temps total**: 3 minutes
**Prérequis**: Docker, Node.js, npm
**Status**: ✅ Prêt à l'utilisation
