# 🔍 Domain Auditor - Interface Locale

Interface web locale pour auditer des domaines avec curl, dig, whois et plus.

## 🚀 Démarrage Rapide

```bash
# 1. Aller dans le dossier
cd "/Users/xunit/Desktop/📁 Projets/sar/domain-auditor"

# 2. Démarrer le serveur
npm start

# 3. Ouvrir dans le navigateur
open http://localhost:3333/index.html
```

## ✨ Fonctionnalités

- ⚡ **Performance Analysis** - DNS, TCP, TLS, Server timing avec graphique
- 🔒 **SSL/TLS** - Certificat, issuer, expiration
- 🌐 **DNS Records** - A, MX, NS records
- 📋 **WHOIS** - Registrar, dates de création/expiration
- 🔍 **Subdomain Discovery** - www, api, mail, admin, app, blog
- 📍 **Geolocation** - IP, ville, pays, ASN, organisation
- 📊 **Scores** - Performance, SSL, Overall grades
- 📄 **Raw JSON** - Export complet des données

## 🎯 Utilisation

1. Entrer un domaine (ex: `google.com`, `semrush.com`, `solutionargentrapide.ca`)
2. Cliquer "Analyser" ou presser Enter
3. Explorer les onglets pour voir toutes les données
4. Copier le JSON brut si nécessaire

## 📊 Exemples de Domaines

- `solutionargentrapide.ca` - Ton site (84ms, TLS 1.3, A+)
- `semrush.com` - Concurrent (140ms, Google Cloud)
- `google.com` - Référence performance
- `github.com` - Référence sécurité

## 🛠️ Architecture

- **Backend**: Node.js + Express
- **Frontend**: HTML + Tailwind CSS + Chart.js
- **Outils**: curl, dig, whois, openssl
- **Port**: 3333

## 📁 Fichiers

```
domain-auditor/
├── server.js       # Backend API
├── index.html      # Interface web
├── package.json    # Dependencies
└── README.md       # Ce fichier
```

## 🔧 API

```bash
# POST /api/audit
curl -X POST http://localhost:3333/api/audit \
  -H "Content-Type: application/json" \
  -d '{"domain": "google.com"}'
```

## 💡 Arrêter le Serveur

```bash
# Ctrl+C dans le terminal où le serveur tourne
# Ou trouver le process:
lsof -ti:3333 | xargs kill
```

## 🎨 Screenshots

L'interface affiche:
- 4 cartes de stats en haut (Response Time, SSL, HTTP Status, Score)
- 6 onglets détaillés (Performance, SSL, DNS, WHOIS, Subdomains, Geo)
- Graphique Chart.js pour le timing breakdown
- JSON brut exportable

## 📝 Notes

- Les données sont collectées en temps réel
- Pas de stockage (tout en mémoire)
- Fonctionne 100% en local
- Aucune donnée n'est envoyée à l'extérieur

---

**Créé par:** Claude Code
**Date:** 2026-01-31
**Version:** 1.0.0
