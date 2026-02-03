# 03 - Authentication Flow

**Projet**: SAR - Solution Argent Rapide
**Date**: 2026-02-03

---

## 🔐 Vue d'Ensemble

### Système d'Authentification

**Type**: JWT Custom (jose library)
**Storage**: HTTP-Only Cookies
**Protection**: Next.js Middleware
**Scope**: Admin dashboard uniquement

```
┌─────────────────────────────────────────────────────────────┐
│                    AUTH ARCHITECTURE                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Browser                    Middleware              Backend  │
│     │                           │                      │     │
│     ├─ /admin ───────────────►│                      │     │
│     │                          ├─ No cookie?         │     │
│     │                          ├─ → Redirect /admin  │     │
│     │                          │                      │     │
│     ├─ POST /api/admin/login ─┼─────────────────────►│     │
│     │   {password}             │                      │     │
│     │                          │                      ├─ Verify │
│     │                          │                      ├─ Generate JWT │
│     │                          │                      │     │
│     │◄─────────────────────────┼──────────────────────┤     │
│     │  Set-Cookie: admin-session=[JWT]               │     │
│     │                          │                      │     │
│     ├─ /admin/dashboard ──────►│                      │     │
│     │                          ├─ Verify JWT         │     │
│     │                          ├─ ✅ Valid           │     │
│     │                          ├─ → Continue         │     │
│     │                          │                      │     │
└─────────────────────────────────────────────────────────────┘
```

---

## 📝 Flow Détaillé

### 1. Login (First Time)

#### Étape 1: User Access `/admin`
```typescript
// URL: /admin
// Middleware: src/middleware.ts:245-272

if (pathname === '/admin') {
  // Page de login → Pas de vérification auth
  return NextResponse.next()
}
```

**Résultat**: Page login affichée (form password)

#### Étape 2: User Submit Password
```typescript
// POST /api/admin/login
// Route: src/app/api/admin/login/route.ts

// 1. Comparer password avec hash
const match = await bcrypt.compare(password, ADMIN_PASSWORD_HASH)

// 2. Générer JWT (jose)
const secret = new TextEncoder().encode(JWT_SECRET)
const jwt = await new SignJWT({ userId: 'admin' })
  .setProtectedHeader({ alg: 'HS256' })
  .setExpirationTime('7d')  // ⚠️ 7 jours
  .sign(secret)

// 3. Set cookie
response.cookies.set('admin-session', jwt, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: 7 * 24 * 60 * 60,  // 7 days
  path: '/'
})
```

**Résultat**: Cookie `admin-session` set → Redirect `/admin/dashboard`

#### Étape 3: Access Protected Route
```typescript
// URL: /admin/dashboard
// Middleware: src/middleware.ts:252-272

const token = request.cookies.get('admin-session')?.value

if (!token) {
  return NextResponse.redirect(new URL('/admin', request.url))
}

try {
  const secret = new TextEncoder().encode(JWT_SECRET)
  const verified = await jwtVerify(token, secret)

  // ✅ Token valide
  userRole = 'admin'
  userId = verified.payload.userId

  // Continue + inject context dans headers
  response.headers.set('x-telemetry-context', ...)
} catch (err) {
  // ❌ Token invalide ou expiré
  response.cookies.delete('admin-session')
  return NextResponse.redirect(new URL('/admin', request.url))
}
```

**Résultat**: Accès autorisé → Dashboard affiché

---

### 2. Logout

```typescript
// POST /api/admin/logout
// Route: src/app/api/admin/logout/route.ts

response.cookies.delete('admin-session')
```

**Résultat**: Cookie supprimé → Next request redirige vers `/admin`

---

### 3. Session Persistence

#### Cookie Lifecycle
```
Login → Set cookie (maxAge: 7 days)
  │
  ├─ Chaque requête → Middleware vérifie JWT
  │   ├─ Valid → Continue
  │   └─ Expired → Delete cookie + Redirect
  │
  └─ After 7 days → Cookie expire (browser auto-delete)
```

#### JWT Payload
```json
{
  "userId": "admin",
  "iat": 1738612345,      // Issued at (timestamp)
  "exp": 1739217145       // Expires at (iat + 7 days)
}
```

**⚠️ ATTENTION**: Pas de refresh mechanism
- JWT expire après 7 jours
- User doit re-login manuellement
- Pas de "remember me" option

---

## 🛡️ Protection Routes

### Middleware Logic

```typescript
// src/middleware.ts

// 1. Routes publiques (pas de check)
const publicRoutes = [
  '/',
  '/faq',
  '/politique-de-confidentialite',
  '/nous-joindre',
  // ... autres pages site
]

// 2. Routes protégées admin
const isAdminRoute = pathname.startsWith('/admin') && pathname !== '/admin'
const isAdminSubdomain = hostname.startsWith('admin.') && pathname !== '/'

if (isAdminRoute || isAdminSubdomain) {
  // ⚠️ Vérifier token JWT
  const token = request.cookies.get('admin-session')

  if (!token) {
    return redirect('/admin')  // → Login page
  }

  try {
    await jwtVerify(token, secret)
    // ✅ Continue
  } catch {
    // ❌ Redirect + delete cookie
    response.cookies.delete('admin-session')
    return redirect('/admin')
  }
}

// 3. Routes API admin
const isAdminApi = pathname.startsWith('/api/admin/')

if (isAdminApi && pathname !== '/api/admin/login') {
  // ⚠️ Pas de middleware check (check dans route handler)
  // Chaque route doit vérifier auth manuellement
}
```

### Routes Protégées

**Pages Admin** (protégées par middleware):
```
/admin/dashboard
/admin/messages
/admin/vopay
/admin/quickbooks
/admin/analytics
/admin/seo-hub
/admin/dataflow
/admin/webhooks
/admin/performance
/admin/blacklist
/admin/data-explorer
/admin/contrats-clients
/admin/contrats-signature
/admin/downloads
... (~30 pages total)
```

**API Admin** (vérification manuelle dans chaque route):
```typescript
// Pattern utilisé dans ~40 routes

async function verifyAuth() {
  const cookieStore = await cookies()
  const token = cookieStore.get('admin-session')

  if (!token) return false

  try {
    const secret = new TextEncoder().encode(JWT_SECRET)
    await jwtVerify(token.value, secret)
    return true
  } catch {
    return false
  }
}

// Usage
export async function GET(request: NextRequest) {
  const isAuth = await verifyAuth()

  if (!isAuth) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  // ... continue
}
```

**Routes Non Protégées**:
```
/admin                          # Login page
/api/admin/login                # Login endpoint
/analyse                        # Public report page
/api/webhooks/*                 # Webhooks (auth via autre méthode)
/api/cron/*                     # Cron (auth via Vercel cron secret)
```

---

## 🏗️ Subdomain Routing

### Admin Subdomain
```typescript
// URL: admin.solutionargentrapide.ca
// Middleware rewrite → /admin/*

if (hostname.startsWith('admin.')) {
  if (pathname === '/') {
    // admin.sar.ca/ → /admin (login)
    return NextResponse.rewrite(new URL('/admin', request.url))
  }

  if (!pathname.startsWith('/admin')) {
    // admin.sar.ca/dashboard → /admin/dashboard
    return NextResponse.rewrite(new URL('/admin' + pathname, request.url))
  }
}
```

**Résultat**:
- `admin.solutionargentrapide.ca` → Login page
- `admin.solutionargentrapide.ca/dashboard` → Dashboard (si auth)
- Auth cookie fonctionne sur subdomain

### Partners Subdomain
```typescript
// URL: partners.solutionargentrapide.ca
// Auth différente: Cookie 'partners-dev-session'

const session = request.cookies.get('partners-dev-session')?.value

if (session !== 'authenticated') {
  return redirect('/partners')  // → Partners login
}
```

**Séparation**:
- Admin: Cookie `admin-session` (JWT)
- Partners: Cookie `partners-dev-session` (simple string)

---

## 🔍 Points de Friction Identifiés

### 1. ❌ **Multi-onglet Re-login**
**Symptôme**: User ouvre nouvel onglet → Re-demande password

**Cause probable**:
```typescript
// Middleware vérifie cookie à chaque requête
// Si cookie expiré/invalide → Redirect /admin

// Hypothèse 1: Cookie sameSite='lax' + subdomain
// Hypothèse 2: JWT expire pendant session active
// Hypothèse 3: Cookie path='/' mais subdomain mismatch
```

**Debugging**:
```typescript
// À ajouter dans middleware pour debug
console.log('[Auth Debug]', {
  cookie: request.cookies.get('admin-session'),
  hostname: request.headers.get('host'),
  pathname: request.nextUrl.pathname,
  jwtValid: verified ? 'yes' : 'no'
})
```

**Fix potentiel**:
```typescript
// Option A: Cookie domain explicit
response.cookies.set('admin-session', jwt, {
  domain: '.solutionargentrapide.ca',  // ← Wildcard subdomain
  // ...
})

// Option B: LocalStorage backup (non httpOnly)
// Pas recommandé pour sécurité

// Option C: Refresh token mechanism
// Générer refresh token long-lived
```

### 2. ⚠️ **Session Non Persistante**
**Symptôme**: User revient après X heures → Re-login requis

**Cause**: JWT expiration (7 jours) sans refresh

**Impact**: UX friction pour users qui utilisent admin quotidiennement

**Fix recommandé**:
```typescript
// Ajouter refresh token
const refreshToken = await new SignJWT({ userId: 'admin', type: 'refresh' })
  .setExpirationTime('30d')
  .sign(secret)

// Access token court (1h)
const accessToken = await new SignJWT({ userId: 'admin', type: 'access' })
  .setExpirationTime('1h')
  .sign(secret)

// Set both cookies
response.cookies.set('admin-session', accessToken, { maxAge: 3600 })
response.cookies.set('admin-refresh', refreshToken, { maxAge: 30*24*3600 })

// Middleware: Si access expired, use refresh to generate new access
```

### 3. ⚠️ **Pas de Role-Based Access Control (RBAC)**
**Actuel**: Binaire (admin ou non)

**Limitation**: Impossible de différencier:
- Super admin vs admin read-only
- Admin finance vs admin support
- Permissions granulaires (view vs edit vs delete)

**Future enhancement**:
```typescript
// JWT payload étendu
{
  userId: 'admin',
  role: 'super_admin',  // ou 'admin_readonly', 'finance', etc.
  permissions: ['messages.read', 'messages.write', 'vopay.read']
}

// Middleware check permissions
if (!hasPermission(verified.payload, 'messages.write')) {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}
```

### 4. ❌ **Pas de Audit Log Login**
**Actuel**: Aucun log des connexions admin

**Risque**: Impossible de tracer:
- Qui s'est connecté quand
- Tentatives de login échouées
- IP source des connexions

**Fix recommandé**:
```typescript
// Dans /api/admin/login
await supabase.from('admin_login_logs').insert({
  user_id: 'admin',
  ip: request.headers.get('x-forwarded-for'),
  user_agent: request.headers.get('user-agent'),
  success: true,
  timestamp: new Date().toISOString()
})
```

---

## 🧪 Testing Strategy

### Tests E2E (Playwright)

#### Auth Setup
```typescript
// e2e/specs/auth.setup.ts

test('authenticate as admin', async ({ page }) => {
  await page.goto('/admin')
  await page.fill('input[type="password"]', process.env.ADMIN_PASSWORD!)
  await page.click('button[type="submit"]')
  await page.waitForURL('/admin/dashboard')

  // Save auth state
  await page.context().storageState({
    path: './storage/state.json'
  })
})
```

**Problème actuel**: Password en clair dans `.env.test`
**Solution**: Utiliser hash test séparé

#### Protected Routes Test
```typescript
// e2e/specs/admin-protected.spec.ts

test.describe('Admin Protected Routes', () => {
  test.use({ storageState: './storage/state.json' })

  test('should access dashboard when authenticated', async ({ page }) => {
    await page.goto('/admin/dashboard')
    await expect(page).toHaveURL('/admin/dashboard')
    await expect(page.locator('[data-testid="admin-sidebar"]')).toBeVisible()
  })

  test('should redirect to login when not authenticated', async ({ page }) => {
    // Clear cookies
    await page.context().clearCookies()
    await page.goto('/admin/dashboard')
    await page.waitForURL('/admin')
  })
})
```

### Tests Unitaires (Jest)

```typescript
// src/app/api/admin/login/__tests__/route.test.ts

describe('POST /api/admin/login', () => {
  it('should return 401 on wrong password', async () => {
    const response = await POST(new Request('http://localhost:3000/api/admin/login', {
      method: 'POST',
      body: JSON.stringify({ password: 'wrong' })
    }))

    expect(response.status).toBe(401)
  })

  it('should set cookie on correct password', async () => {
    const response = await POST(new Request('http://localhost:3000/api/admin/login', {
      method: 'POST',
      body: JSON.stringify({ password: process.env.ADMIN_PASSWORD })
    }))

    expect(response.status).toBe(200)
    const cookies = response.headers.get('set-cookie')
    expect(cookies).toContain('admin-session=')
  })
})
```

---

## 📋 Checklist CI/CD Auth

### Variables Staging
```bash
# GitHub Secrets
STAGING_ADMIN_PASSWORD=[STAGING_PASSWORD]
STAGING_ADMIN_PASSWORD_HASH=[STAGING_HASH]
STAGING_JWT_SECRET=[STAGING_SECRET]

# .env.test
ADMIN_PASSWORD=[TEST_PASSWORD]
BASE_URL=http://localhost:4000
```

### Seed Script
```sql
-- seed-staging-auth.sql
-- Créer admin user staging avec password connu

INSERT INTO admin_users (id, username, password_hash, created_at)
VALUES (
  'test-admin',
  'admin@test.sar',
  '[STAGING_HASH]',  -- Hash de 'TestPassword123!'
  NOW()
);
```

### E2E Setup
```typescript
// playwright.config.ts
use: {
  baseURL: process.env.BASE_URL || 'http://localhost:4000',
}

// auth.setup.ts
await page.fill('input[type="password"]', process.env.STAGING_ADMIN_PASSWORD!)
```

---

## 🎯 Recommandations

### Court Terme (avant CI/CD)
1. ✅ Créer user admin staging avec password test
2. ✅ Configurer JWT_SECRET staging unique
3. ✅ Tester auth flow sur preview deployment
4. ⚠️ Debug multi-onglet issue

### Moyen Terme (amélioration UX)
5. 🔄 Implémenter refresh token mechanism
6. 📊 Ajouter audit log login
7. 🔐 Ajouter rate limiting login (10 tentatives/min)
8. 🎨 Améliorer page login (password strength, forgot password)

### Long Terme (fonctionnalités avancées)
9. 👥 Implémenter multi-users admin
10. 🔒 Implémenter RBAC (roles & permissions)
11. 📧 Ajouter 2FA (email OTP)
12. 🔑 Ajouter password rotation policy

---

**Auth flow documenté et prêt pour CI/CD** ✅
