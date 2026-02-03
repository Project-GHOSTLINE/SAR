# 07 - CI/CD Requirements

**Projet**: SAR - Solution Argent Rapide
**Date**: 2026-02-03

---

## 🔐 GitHub Actions Secrets (À Configurer)

### Vercel Deployment
```bash
VERCEL_TOKEN                    # Vercel CLI token (pour deploy previews)
VERCEL_ORG_ID                   # Organization ID (team_xxx)
VERCEL_PROJECT_ID               # Project ID (prj_xxx)
```

**Comment obtenir**:
```bash
# 1. Login Vercel CLI
npm install -g vercel
vercel login

# 2. Link project
cd /path/to/sar
vercel link

# 3. Récupérer IDs
cat .vercel/project.json
# {
#   "orgId": "team_Rsbwr6LzT93S2w90kI3Cdz07",
#   "projectId": "prj_zrZxYj7W08vVPFyVQMtWG3qed4ri"
# }

# 4. Créer token
# → Vercel Dashboard → Settings → Tokens → Create Token
```

### Supabase Staging
```bash
STAGING_SUPABASE_URL                    # URL projet staging
STAGING_SUPABASE_ANON_KEY               # Anon key staging
STAGING_SUPABASE_SERVICE_KEY            # Service role key staging
```

**Comment obtenir**:
```bash
# 1. Créer projet staging sur supabase.com
# 2. Settings → API
# 3. Copier:
#    - URL: https://[project-id].supabase.co
#    - anon key: eyJxxx...
#    - service_role key: eyJxxx...
```

### Auth Staging
```bash
STAGING_JWT_SECRET                      # Secret JWT staging (unique)
STAGING_ADMIN_PASSWORD                  # Password admin test
STAGING_ADMIN_PASSWORD_HASH             # Hash bcrypt du password
```

**Générer**:
```bash
# JWT Secret (random 32 bytes)
openssl rand -base64 32
# → Ex: 56K2TFqsBtHQjzihmTS8palyJeA3KZHI1yYsvGEkxWQ=

# Admin Password (staging)
# → Ex: StagingPassword123!

# Hash Password
node -e "console.log(require('bcryptjs').hashSync('StagingPassword123!', 10))"
# → Ex: $2b$10$Ddx05yJ05gRgjaM4Ha1zqOdgsQFFoF1nlh4LQKR2HkXkM901aPiUG
```

### Optional (Notifications)
```bash
SLACK_WEBHOOK_URL                       # Notifications Slack (optionnel)
```

---

## 🔧 Vercel Environment Variables

### Preview Environment (À Configurer)

**Path**: Vercel Dashboard → Project → Settings → Environment Variables

| Variable | Value | Environment |
|----------|-------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | [STAGING_URL] | Preview |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | [STAGING_ANON] | Preview |
| `SUPABASE_SERVICE_ROLE_KEY` | [STAGING_SERVICE] | Preview |
| `JWT_SECRET` | [PREVIEW_SECRET] | Preview |
| `ADMIN_PASSWORD` | [STAGING_PASSWORD] | Preview |
| `ADMIN_PASSWORD_HASH` | [STAGING_HASH] | Preview |
| `TELEMETRY_WRITE_KEY` | [STAGING_KEY] | Preview |
| `TELEMETRY_HASH_SALT` | [STAGING_SALT] | Preview |

**Autres variables** (copier depuis Production):
```bash
# Services externes (sandbox mode)
VOPAY_API_URL=https://earthnode.vopay.com/api/v2/
VOPAY_ACCOUNT_ID=[SANDBOX_ACCOUNT]
VOPAY_API_KEY=[SANDBOX_KEY]
VOPAY_SHARED_SECRET=[SANDBOX_SECRET]

INTUIT_ENVIRONMENT=sandbox
INTUIT_CLIENT_ID=[SANDBOX_CLIENT]
INTUIT_CLIENT_SECRET=[SANDBOX_SECRET]

# Email (staging)
RESEND_API_KEY=[STAGING_KEY]
FROM_EMAIL=SAR Staging <noreply-staging@solutionargentrapide.ca>

# Analytics (optionnel - peut pointer vers staging GA property)
NEXT_PUBLIC_GA_MEASUREMENT_ID=[STAGING_GA_ID]
GA_PROPERTY_ID=[STAGING_PROPERTY]
GA_SERVICE_ACCOUNT_JSON=[STAGING_JSON]

# Base URLs
NEXT_PUBLIC_APP_URL=https://admin-preview.solutionargentrapide.ca
NEXT_PUBLIC_BASE_URL=[DYNAMIC_PREVIEW_URL]
```

### Production Environment (Déjà Configuré)
**Status**: ✅ Toutes les variables production déjà configurées

**Validation**:
```bash
# Vérifier via CLI
vercel env ls
```

---

## 📦 Récupérer Preview URL Dynamique

### Approche 1: Vercel CLI Output
```yaml
# .github/workflows/ci.yml

- name: Deploy Preview
  id: deploy
  run: |
    vercel deploy \
      --token=${{ secrets.VERCEL_TOKEN }} \
      --scope=${{ secrets.VERCEL_ORG_ID }} \
      > deployment-url.txt

    PREVIEW_URL=$(cat deployment-url.txt | grep -oP 'https://[^\s]+')
    echo "url=$PREVIEW_URL" >> $GITHUB_OUTPUT

- name: E2E Tests
  env:
    BASE_URL: ${{ steps.deploy.outputs.url }}
  run: |
    cd e2e
    npx playwright test
```

### Approche 2: Vercel GitHub Integration
```yaml
# Vercel déploie automatiquement → Comment GitHub

- name: Wait for Vercel Deployment
  uses: patrickedqvist/wait-for-vercel-preview@v1.3.1
  with:
    token: ${{ secrets.GITHUB_TOKEN }}
    max_timeout: 300

- name: E2E Tests
  env:
    BASE_URL: ${{ steps.wait.outputs.url }}
  run: npx playwright test
```

### Approche 3: Vercel API
```bash
# Récupérer dernière preview via API
curl -H "Authorization: Bearer $VERCEL_TOKEN" \
  "https://api.vercel.com/v6/deployments?projectId=$VERCEL_PROJECT_ID&limit=1"
```

**Recommandation**: Approche 1 (simple et fiable)

---

## 🎯 CI/CD Workflow Complet

### `.github/workflows/ci.yml`

```yaml
name: CI Pipeline

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

env:
  NODE_VERSION: '20'

jobs:
  # ============================================
  # JOB 1: Quality Checks (Fast)
  # ============================================
  quality:
    name: Quality Checks
    runs-on: ubuntu-latest
    timeout-minutes: 10

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install Dependencies
        run: npm ci

      - name: TypeCheck
        run: npx tsc --noEmit

      - name: Lint
        run: npm run lint

      - name: Check Formatting
        run: npx prettier --check "src/**/*.{ts,tsx}"

  # ============================================
  # JOB 2: Unit & Integration Tests
  # ============================================
  test:
    name: Unit & Integration Tests
    runs-on: ubuntu-latest
    timeout-minutes: 15
    needs: quality

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install Dependencies
        run: npm ci

      - name: Run Tests
        run: npm run test -- --coverage --ci

      - name: Upload Coverage
        uses: codecov/codecov-action@v4
        with:
          files: ./coverage/lcov.info

  # ============================================
  # JOB 3: Build & Deploy Preview
  # ============================================
  deploy:
    name: Deploy Preview
    runs-on: ubuntu-latest
    timeout-minutes: 10
    needs: [quality, test]
    if: github.event_name == 'pull_request'

    outputs:
      preview-url: ${{ steps.deploy.outputs.url }}

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install Dependencies
        run: npm ci

      - name: Install Vercel CLI
        run: npm install -g vercel

      - name: Deploy to Vercel
        id: deploy
        env:
          VERCEL_TOKEN: ${{ secrets.VERCEL_TOKEN }}
          VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
          VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}
        run: |
          vercel pull --yes --token=$VERCEL_TOKEN
          vercel build --token=$VERCEL_TOKEN
          PREVIEW_URL=$(vercel deploy --prebuilt --token=$VERCEL_TOKEN)
          echo "url=$PREVIEW_URL" >> $GITHUB_OUTPUT
          echo "Preview URL: $PREVIEW_URL"

      - name: Comment PR with Preview URL
        uses: actions/github-script@v7
        with:
          script: |
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: `✅ Preview deployed to: ${{ steps.deploy.outputs.url }}`
            })

  # ============================================
  # JOB 4: E2E Tests (vs Preview)
  # ============================================
  e2e:
    name: E2E Tests
    runs-on: ubuntu-latest
    timeout-minutes: 20
    needs: deploy

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install Dependencies
        run: npm ci

      - name: Install Playwright
        run: |
          cd e2e
          npx playwright install chromium

      - name: Run E2E Tests
        env:
          BASE_URL: ${{ needs.deploy.outputs.preview-url }}
          STAGING_ADMIN_PASSWORD: ${{ secrets.STAGING_ADMIN_PASSWORD }}
        run: |
          cd e2e
          npx playwright test

      - name: Upload Playwright Report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: test-artifacts/playwright-report/

      - name: Upload Test Results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: test-results
          path: test-artifacts/junit.xml

  # ============================================
  # JOB 5: Report Results
  # ============================================
  report:
    name: Report Results
    runs-on: ubuntu-latest
    needs: [quality, test, e2e]
    if: always()

    steps:
      - name: Download Test Results
        uses: actions/download-artifact@v4
        with:
          name: test-results
          path: ./results

      - name: Publish Test Report
        uses: dorny/test-reporter@v1
        with:
          name: Test Results
          path: ./results/junit.xml
          reporter: jest-junit

      - name: Comment PR with Results
        if: github.event_name == 'pull_request'
        uses: actions/github-script@v7
        with:
          script: |
            const { data: checks } = await github.rest.checks.listForRef({
              owner: context.repo.owner,
              repo: context.repo.repo,
              ref: context.sha
            })

            const results = checks.check_runs
              .map(c => `- ${c.name}: ${c.conclusion}`)
              .join('\n')

            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: `## CI Results\n\n${results}`
            })
```

---

## ⏱️ Estimated Pipeline Duration

| Job | Duration | Parallel | Total |
|-----|----------|----------|-------|
| Quality Checks | 2 min | ✅ | 2 min |
| Unit Tests | 3 min | ✅ | 2 min |
| Deploy Preview | 4 min | ⏸️ Sequential | 6 min |
| E2E Tests | 5 min | ⏸️ Sequential | 11 min |
| Report | 1 min | ⏸️ Sequential | 12 min |

**Total**: ~12 minutes (PR workflow)

---

## 🎯 Optimizations

### Caching Strategy
```yaml
# Cache node_modules
- uses: actions/cache@v4
  with:
    path: ~/.npm
    key: ${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}

# Cache Playwright browsers
- uses: actions/cache@v4
  with:
    path: ~/.cache/ms-playwright
    key: ${{ runner.os }}-playwright-${{ hashFiles('**/package-lock.json') }}

# Cache Next.js build
- uses: actions/cache@v4
  with:
    path: .next/cache
    key: ${{ runner.os }}-nextjs-${{ hashFiles('**/package-lock.json') }}
```

### Parallel E2E Tests
```yaml
# Split E2E tests across workers
- name: Run E2E Tests
  run: |
    cd e2e
    npx playwright test --workers=4
```

**Gain**: ~30% faster (5 min → 3.5 min)

---

## 📊 Monitoring & Notifications

### Slack Notifications (Optionnel)
```yaml
- name: Notify Slack on Failure
  if: failure()
  uses: 8398a7/action-slack@v3
  with:
    status: ${{ job.status }}
    webhook_url: ${{ secrets.SLACK_WEBHOOK_URL }}
    text: 'CI Pipeline Failed for PR #${{ github.event.number }}'
```

### PR Status Checks
**Required Checks** (GitHub Branch Protection):
- ✅ Quality Checks
- ✅ Unit & Integration Tests
- ✅ E2E Tests

**Configuration**: Settings → Branches → main → Require status checks

---

## 🎯 Recommandations

### Immédiat (Setup CI)
1. ✅ **Créer** GitHub Actions secrets (7 variables)
2. ✅ **Configurer** Vercel Preview env vars
3. ✅ **Créer** `.github/workflows/ci.yml`
4. ✅ **Tester** workflow sur feature branch

### Court Terme (Optimisations)
5. ⚡ **Activer** caching (npm, playwright, next)
6. 📊 **Configurer** coverage reporting (Codecov)
7. 🔔 **Ajouter** Slack notifications
8. 🛡️ **Activer** required checks

### Moyen Terme (Advanced)
9. 🎯 **Paralléliser** E2E tests (workers)
10. 📈 **Monitor** CI performance (build times)
11. 🔄 **Automatiser** dependency updates (Dependabot)
12. 🚀 **Ajouter** auto-merge (si tous checks pass)

---

**CI/CD requirements documentés** ✅
**Secrets listés (7 variables)** ✅
**Workflow complet fourni** ✅
**Duration estimée: 12 min** ✅
