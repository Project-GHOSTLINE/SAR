# 06 - Test Plan

**Projet**: SAR - Solution Argent Rapide
**Date**: 2026-02-03

---

## 🎯 Stratégie de Tests (4 Couches)

```
┌─────────────────────────────────────────────────────────┐
│                    TEST PYRAMID                          │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  E2E Tests (Playwright)         [12 tests]    ← Lent    │
│  ────────────────────────────────────────────           │
│                                                          │
│  Integration Tests (Jest)       [20 tests]              │
│  ────────────────────────────────────────────           │
│                                                          │
│  Unit Tests (Jest)              [50 tests]              │
│  ────────────────────────────────────────────           │
│                                                          │
│  TypeCheck + Lint               [Always]      ← Rapide  │
│  ────────────────────────────────────────────           │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## ⚡ Couche 1: TypeCheck + Lint

### TypeScript Compilation
**Commande**: `tsc --noEmit`
**Durée**: ~30s
**Scope**: Tous les fichiers `.ts/.tsx`

**Tests**:
- ✅ Pas d'erreurs TypeScript
- ✅ Types corrects
- ✅ Imports valides

**CI Integration**:
```yaml
- name: TypeCheck
  run: npm run typecheck  # tsc --noEmit
```

### ESLint
**Commande**: `next lint`
**Durée**: ~15s
**Scope**: Tous les fichiers source

**Rules**:
- Next.js core web vitals
- React hooks rules
- TypeScript recommended

**CI Integration**:
```yaml
- name: Lint
  run: npm run lint
```

---

## 🧪 Couche 2: Unit Tests (Jest)

### Configuration
**Framework**: Jest 30.2.0 + Testing Library
**Config**: `jest.config.js`
**Environment**: jsdom (browser simulation)

### Coverage Target
```json
{
  "global": {
    "branches": 50,
    "functions": 50,
    "lines": 50,
    "statements": 50
  }
}
```

### Tests Prioritaires

#### 1. Utils & Helpers (20 tests)
```typescript
// src/lib/utils/__tests__/format.test.ts

describe('formatClientName', () => {
  it('should capitalize first name and uppercase last name', () => {
    expect(formatClientName('jean DUPONT')).toBe('Jean DUPONT')
  })

  it('should handle single word names', () => {
    expect(formatClientName('jean')).toBe('Jean')
  })
})

// src/lib/utils/__tests__/validators.test.ts

describe('validateEmail', () => {
  it('should validate correct emails', () => {
    expect(validateEmail('test@example.com')).toBe(true)
  })

  it('should reject invalid emails', () => {
    expect(validateEmail('invalid')).toBe(false)
  })
})
```

#### 2. Business Logic (15 tests)
```typescript
// src/lib/__tests__/reference-generator.test.ts

describe('generateReference', () => {
  it('should generate SAR-XXXXXX format', () => {
    const ref = generateReference(123)
    expect(ref).toBe('SAR-000123')
  })
})

// src/lib/__tests__/supabase-server.test.ts

describe('getSupabaseServer', () => {
  it('should return singleton instance', () => {
    const client1 = getSupabaseServer()
    const client2 = getSupabaseServer()
    expect(client1).toBe(client2)
  })

  it('should throw if missing credentials', () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL
    expect(() => getSupabaseServer()).toThrow()
  })
})
```

#### 3. Components (15 tests)
```typescript
// src/components/admin/__tests__/AdminSidebar.test.tsx

describe('AdminSidebar', () => {
  it('should render navigation items', () => {
    render(<AdminSidebar />)
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.getByText('Messages')).toBeInTheDocument()
  })

  it('should highlight active route', () => {
    render(<AdminSidebar currentPage="/admin/dashboard" />)
    expect(screen.getByText('Dashboard')).toHaveClass('active')
  })

  it('should show badge on messages when unread', () => {
    render(<AdminSidebar messagesCount={5} />)
    expect(screen.getByText('5')).toBeInTheDocument()
  })
})
```

**Total**: ~50 unit tests

**CI Integration**:
```yaml
- name: Unit Tests
  run: npm run test -- --coverage --ci
```

---

## 🔗 Couche 3: Integration Tests (Jest)

### API Route Tests (20 tests)

**Setup**:
```typescript
// __tests__/setup/test-db.ts

// Mock Supabase client for integration tests
export function mockSupabaseClient() {
  return {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          data: [{ id: 1, nom: 'Test' }],
          error: null
        }))
      })),
      insert: jest.fn(() => ({ data: { id: 1 }, error: null }))
    }))
  }
}
```

**Tests**:
```typescript
// src/app/api/admin/login/__tests__/route.test.ts

describe('POST /api/admin/login', () => {
  it('should return 401 on invalid password', async () => {
    const req = new Request('http://localhost/api/admin/login', {
      method: 'POST',
      body: JSON.stringify({ password: 'wrong' })
    })

    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('should set cookie on valid password', async () => {
    const req = new Request('http://localhost/api/admin/login', {
      method: 'POST',
      body: JSON.stringify({ password: process.env.ADMIN_PASSWORD })
    })

    const res = await POST(req)
    expect(res.status).toBe(200)

    const cookie = res.headers.get('set-cookie')
    expect(cookie).toContain('admin-session=')
  })
})

// src/app/api/telemetry/track-event/__tests__/route.test.ts

describe('POST /api/telemetry/track-event', () => {
  it('should require visit_id header', async () => {
    const req = new Request('http://localhost/api/telemetry/track-event', {
      method: 'POST',
      body: JSON.stringify({ event_name: 'test' })
    })

    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('should track event with valid data', async () => {
    const req = new Request('http://localhost/api/telemetry/track-event', {
      method: 'POST',
      headers: { 'x-sar-visit-id': 'test-visit' },
      body: JSON.stringify({ event_name: 'page_view', page_path: '/' })
    })

    const res = await POST(req)
    expect(res.status).toBe(200)
  })
})
```

**Total**: ~20 integration tests

---

## 🎭 Couche 4: E2E Tests (Playwright)

### Configuration
**Framework**: Playwright 1.58.0
**Config**: `e2e/playwright.config.ts`
**Browsers**: Chromium
**Base URL**: `process.env.BASE_URL` (preview URL from CI)

### Tests Smoke (12 tests critiques)

#### Test 1: Homepage Public
```typescript
// e2e/specs/01-homepage.spec.ts

test.describe('Homepage', () => {
  test('should load homepage', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(/Solution Argent Rapide/)
    await expect(page.locator('[data-testid="hero-title"]')).toBeVisible()
  })

  test('should have working navigation', async ({ page }) => {
    await page.goto('/')
    await page.click('[data-testid="nav-faq"]')
    await expect(page).toHaveURL('/faq')
  })

  test('should load contact form', async ({ page }) => {
    await page.goto('/nous-joindre')
    await expect(page.locator('[data-testid="contact-form"]')).toBeVisible()
  })
})
```

#### Test 2: Admin Login
```typescript
// e2e/specs/02-admin-login.spec.ts

test.describe('Admin Login', () => {
  test('should show login page', async ({ page }) => {
    await page.goto('/admin')
    await expect(page.locator('[data-testid="login-form"]')).toBeVisible()
  })

  test('should reject wrong password', async ({ page }) => {
    await page.goto('/admin')
    await page.fill('[data-testid="password-input"]', 'wrongpassword')
    await page.click('[data-testid="login-button"]')
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible()
  })

  test('should login with correct password', async ({ page }) => {
    await page.goto('/admin')
    await page.fill('[data-testid="password-input"]', process.env.STAGING_ADMIN_PASSWORD!)
    await page.click('[data-testid="login-button"]')
    await page.waitForURL('/admin/dashboard')
    await expect(page.locator('[data-testid="admin-sidebar"]')).toBeVisible()
  })
})
```

#### Test 3: Admin Dashboard
```typescript
// e2e/specs/03-admin-dashboard.spec.ts

test.describe('Admin Dashboard', () => {
  test.use({ storageState: './storage/state.json' })  // Auth

  test('should load dashboard', async ({ page }) => {
    await page.goto('/admin/dashboard')
    await expect(page.locator('[data-testid="dashboard-stats"]')).toBeVisible()
  })

  test('should show messages tab', async ({ page }) => {
    await page.goto('/admin/dashboard?tab=messages')
    await expect(page.locator('[data-testid="messages-table"]')).toBeVisible()
  })

  test('should navigate to analyses', async ({ page }) => {
    await page.goto('/admin/dashboard')
    await page.click('[data-testid="nav-analyses"]')
    await expect(page.locator('[data-testid="analyses-view"]')).toBeVisible()
  })
})
```

#### Test 4: Messages CRUD
```typescript
// e2e/specs/04-messages.spec.ts

test.describe('Messages Management', () => {
  test.use({ storageState: './storage/state.json' })

  test('should list messages', async ({ page }) => {
    await page.goto('/admin/dashboard?tab=messages')
    await expect(page.locator('[data-testid="message-row"]').first()).toBeVisible()
  })

  test('should view message details', async ({ page }) => {
    await page.goto('/admin/dashboard?tab=messages')
    await page.click('[data-testid="message-row"]')
    await expect(page.locator('[data-testid="message-detail"]')).toBeVisible()
  })

  test('should mark message as read', async ({ page }) => {
    await page.goto('/admin/dashboard?tab=messages')
    const message = page.locator('[data-testid="message-row"]').first()
    await message.click()
    await page.click('[data-testid="mark-read-button"]')
    await expect(message).toHaveAttribute('data-status', 'lu')
  })
})
```

#### Test 5: VoPay Tab
```typescript
// e2e/specs/05-vopay.spec.ts

test.describe('VoPay Dashboard', () => {
  test.use({ storageState: './storage/state.json' })

  test('should load vopay tab', async ({ page }) => {
    await page.goto('/admin/dashboard?tab=vopay')
    await expect(page.locator('[data-testid="vopay-stats"]')).toBeVisible()
  })

  test('should show transactions table', async ({ page }) => {
    await page.goto('/admin/dashboard?tab=vopay')
    await expect(page.locator('[data-testid="transactions-table"]')).toBeVisible()
  })
})
```

#### Test 6: Downloads
```typescript
// e2e/specs/06-downloads.spec.ts

test.describe('Downloads Page', () => {
  test.use({ storageState: './storage/state.json' })

  test('should load downloads page', async ({ page }) => {
    await page.goto('/admin/downloads')
    await expect(page.locator('[data-testid="downloads-list"]')).toBeVisible()
  })

  test('should show file list', async ({ page }) => {
    await page.goto('/admin/downloads')
    await expect(page.locator('[data-testid="file-item"]')).toHaveCount.greaterThan(0)
  })
})
```

#### Test 7: Data Explorer
```typescript
// e2e/specs/07-data-explorer.spec.ts

test.describe('Data Explorer', () => {
  test.use({ storageState: './storage/state.json' })

  test('should load data explorer', async ({ page }) => {
    await page.goto('/admin/data-explorer')
    await expect(page.locator('[data-testid="table-selector"]')).toBeVisible()
  })

  test('should select table and show data', async ({ page }) => {
    await page.goto('/admin/data-explorer')
    await page.selectOption('[data-testid="table-selector"]', 'contact_messages')
    await expect(page.locator('[data-testid="data-grid"]')).toBeVisible()
  })
})
```

#### Test 8: Navigation Links
```typescript
// e2e/specs/08-sidebar-navigation.spec.ts

test.describe('Sidebar Navigation', () => {
  test.use({ storageState: './storage/state.json' })

  test('should navigate to all main pages', async ({ page }) => {
    const pages = [
      { name: 'Dashboard', url: '/admin/dashboard', testid: 'dashboard-view' },
      { name: 'Analytics', url: '/admin/analytics', testid: 'analytics-view' },
      { name: 'Webhooks', url: '/admin/webhooks', testid: 'webhooks-view' },
      { name: 'Performance', url: '/admin/performance', testid: 'performance-view' },
      { name: 'Blacklist', url: '/admin/blacklist', testid: 'blacklist-view' },
    ]

    for (const { url, testid } of pages) {
      await page.goto(url)
      await expect(page.locator(`[data-testid="${testid}"]`)).toBeVisible()
    }
  })
})
```

#### Test 9: Logout
```typescript
// e2e/specs/09-logout.spec.ts

test.describe('Logout', () => {
  test.use({ storageState: './storage/state.json' })

  test('should logout and redirect to login', async ({ page }) => {
    await page.goto('/admin/dashboard')
    await page.click('[data-testid="logout-button"]')
    await page.waitForURL('/admin')
    await expect(page.locator('[data-testid="login-form"]')).toBeVisible()
  })

  test('should require re-login after logout', async ({ page }) => {
    await page.goto('/admin/dashboard')
    await page.click('[data-testid="logout-button"]')
    await page.goto('/admin/dashboard')
    await page.waitForURL('/admin')  // Redirect to login
  })
})
```

#### Test 10: API Health Check
```typescript
// e2e/specs/10-api-health.spec.ts

test.describe('API Health Check', () => {
  test('should return healthy status', async ({ request }) => {
    const response = await request.get('/api/health')
    expect(response.ok()).toBeTruthy()

    const body = await response.json()
    expect(body.status).toBe('healthy')
    expect(body.checks.database).toBe('ok')
  })
})
```

#### Test 11: Telemetry Tracking
```typescript
// e2e/specs/11-telemetry.spec.ts

test.describe('Telemetry Tracking', () => {
  test('should track page views', async ({ request }) => {
    const response = await request.post('/api/telemetry/track-event', {
      headers: {
        'x-sar-visit-id': 'test-visit-' + Date.now(),
      },
      data: {
        event_name: 'page_view',
        page_path: '/test',
      }
    })

    expect(response.ok()).toBeTruthy()
  })
})
```

#### Test 12: Mobile Responsive
```typescript
// e2e/specs/12-mobile-responsive.spec.ts

test.describe('Mobile Responsive', () => {
  test.use({ viewport: { width: 375, height: 667 } })  // iPhone SE

  test('should show mobile menu on small screen', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('[data-testid="mobile-menu-button"]')).toBeVisible()
  })

  test('admin dashboard should be mobile-friendly', async ({ page }) => {
    await page.goto('/admin')
    await expect(page.locator('[data-testid="login-form"]')).toBeVisible()
    // Should not have horizontal scroll
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth)
    expect(scrollWidth).toBe(clientWidth)
  })
})
```

**Total**: 12 E2E smoke tests

---

## 🏷️ Data-TestID Strategy

### Prérequis: Ajouter data-testid

**Avant**:
```tsx
<button className="bg-blue-500" onClick={handleLogin}>
  Login
</button>
```

**Après**:
```tsx
<button
  data-testid="login-button"
  className="bg-blue-500"
  onClick={handleLogin}
>
  Login
</button>
```

### Selectors Prioritaires (à ajouter)

```typescript
// src/app/admin/page.tsx (Login)
[data-testid="login-form"]
[data-testid="password-input"]
[data-testid="login-button"]
[data-testid="error-message"]

// src/components/admin/AdminSidebar.tsx
[data-testid="admin-sidebar"]
[data-testid="nav-dashboard"]
[data-testid="nav-messages"]
[data-testid="nav-analyses"]
[data-testid="nav-vopay"]
[data-testid="logout-button"]

// src/app/admin/dashboard/page.tsx
[data-testid="dashboard-stats"]
[data-testid="dashboard-view"]
[data-testid="messages-table"]
[data-testid="message-row"]
[data-testid="message-detail"]
[data-testid="mark-read-button"]
[data-testid="vopay-stats"]
[data-testid="transactions-table"]
[data-testid="analyses-view"]

// src/components/admin/AnalysesView.tsx
[data-testid="analyses-view"]

// src/components/admin/VoPayMetricsTab.tsx
[data-testid="vopay-metrics"]
[data-testid="transaction-item"]

// src/app/admin/downloads/page.tsx
[data-testid="downloads-list"]
[data-testid="file-item"]

// src/app/admin/data-explorer/page.tsx
[data-testid="table-selector"]
[data-testid="data-grid"]
```

**Total**: ~30 data-testid à ajouter

---

## 🎯 CI/CD Integration

### GitHub Actions Workflow

```yaml
name: CI

on: [pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      # 1. Checkout
      - uses: actions/checkout@v4

      # 2. Setup Node
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      # 3. Install
      - run: npm ci

      # 4. TypeCheck
      - name: TypeCheck
        run: npx tsc --noEmit

      # 5. Lint
      - name: Lint
        run: npm run lint

      # 6. Unit Tests
      - name: Unit Tests
        run: npm run test -- --coverage --ci

      # 7. Deploy Preview
      - name: Deploy Preview
        run: |
          npm install -g vercel
          vercel deploy --token=${{ secrets.VERCEL_TOKEN }} > preview-url.txt

      # 8. E2E Tests (vs Preview)
      - name: E2E Tests
        env:
          BASE_URL: ${{ steps.preview.outputs.url }}
          STAGING_ADMIN_PASSWORD: ${{ secrets.STAGING_ADMIN_PASSWORD }}
        run: |
          cd e2e
          npx playwright install chromium
          npx playwright test

      # 9. Upload Reports
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-report
          path: test-artifacts/
```

---

## 🎯 Recommandations

### Immédiat (avant CI/CD)
1. ✅ **Ajouter** data-testid aux composants critiques (~30)
2. ✅ **Créer** 12 tests E2E smoke
3. ✅ **Créer** user admin staging
4. ✅ **Seed** data fixtures staging

### Court Terme (avec CI/CD)
5. 🧪 **Écrire** 50 unit tests (utils, logic, components)
6. 🔗 **Écrire** 20 integration tests (API routes)
7. 📊 **Configurer** coverage reporting
8. 🎭 **Run** E2E dans CI pipeline

### Moyen Terme (amélioration continue)
9. 📈 **Augmenter** coverage à 70%
10. 🎯 **Ajouter** visual regression tests (Percy/Chromatic)
11. ⚡ **Optimiser** E2E execution time
12. 📝 **Documenter** test writing guidelines

---

**Test plan complet défini** ✅
**12 smoke tests critiques planifiés** ✅
**4 couches de tests documentées** ✅
