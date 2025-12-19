# URLs & Sous-domaines - Solution Argent Rapide

## Domaines Principaux

### Production
- **Principal:** https://solutionargentrapide.ca
- **Admin:** https://admin.solutionargentrapide.ca
- **Client:** https://client.solutionargentrapide.ca

### Vercel (Preview)
- **URL Vercel:** https://sar-nu.vercel.app

---

## Pages Publiques (solutionargentrapide.ca)

### Pages principales
| Route | URL | Description |
|-------|-----|-------------|
| `/` | https://solutionargentrapide.ca | Page d'accueil |
| `/nous-joindre` | https://solutionargentrapide.ca/nous-joindre | Contact |
| `/faq` | https://solutionargentrapide.ca/faq | Questions fréquentes |
| `/demande-de-pret-en-ligne-formulaire` | https://solutionargentrapide.ca/demande-de-pret-en-ligne-formulaire | Formulaire de prêt |

### Pages légales
| Route | URL | Description |
|-------|-----|-------------|
| `/mentions-legales` | https://solutionargentrapide.ca/mentions-legales | Mentions légales |
| `/politique-de-confidentialite` | https://solutionargentrapide.ca/politique-de-confidentialite | Politique de confidentialité |
| `/politique-de-cookies` | https://solutionargentrapide.ca/politique-de-cookies | Politique des cookies |

### IBV (Identity Verification)
| Route | URL | Description |
|-------|-----|-------------|
| `/ibv` | https://solutionargentrapide.ca/ibv | Vérification d'identité bancaire |

### Espace Client (Public)
| Route | URL | Description |
|-------|-----|-------------|
| `/client` | https://solutionargentrapide.ca/client | Page client (à migrer sur sous-domaine) |

---

## Espace Admin (admin.solutionargentrapide.ca)

### Pages Admin
| Route | URL | Description |
|-------|-----|-------------|
| `/admin` | https://admin.solutionargentrapide.ca | Login admin |
| `/admin/dashboard` | https://admin.solutionargentrapide.ca/dashboard | Dashboard admin (messages, VoPay, etc.) |

### Credentials Admin
- **Password:** `FredRosa%1978`
- **Session:** 7 jours (JWT)
- **Protection:** HTTP-only cookies + CSP

---

## Espace Client (client.solutionargentrapide.ca)

### Pages Client
| Route | URL | Description |
|-------|-----|-------------|
| `/` | https://client.solutionargentrapide.ca | Portail client (à configurer) |

**Status:** À implémenter - Actuellement sur `/client` du site principal

---

## API Endpoints

### API Publiques
| Endpoint | Méthode | Description |
|----------|---------|-------------|
| `/api/contact` | POST | Envoi formulaire de contact |
| `/api/contact-analyse` | POST | Analyse de demande de prêt |

### API Admin (Protégées)
| Endpoint | Méthode | Description |
|----------|---------|-------------|
| `/api/admin/login` | POST | Authentification admin |
| `/api/admin/logout` | POST | Déconnexion admin |
| `/api/admin/messages` | GET | Liste des messages reçus |
| `/api/admin/send` | POST | Envoi d'email depuis admin |
| `/api/admin/vopay` | GET | Solde VoPay |
| `/api/admin/vopay/transactions` | GET | Historique transactions VoPay |
| `/api/admin/vopay-debug` | GET | Debug VoPay auth |
| `/api/admin/debug-env` | GET | Debug variables d'env (à supprimer en prod) |

---

## Configuration DNS (Cloudflare)

### Records requis

```
# Domaine principal
solutionargentrapide.ca      A/CNAME  → Vercel (76.76.21.21)

# Sous-domaine Admin
admin.solutionargentrapide.ca  CNAME  → cname.vercel-dns.com

# Sous-domaine Client
client.solutionargentrapide.ca CNAME  → cname.vercel-dns.com

# WWW redirect
www.solutionargentrapide.ca    CNAME  → solutionargentrapide.ca
```

---

## Configuration Vercel

### Domaines configurés
1. `solutionargentrapide.ca` (Production)
2. `www.solutionargentrapide.ca` (Redirect)
3. `admin.solutionargentrapide.ca` (Admin)
4. `client.solutionargentrapide.ca` (Client)

### Variables d'environnement
Toutes les env vars sont configurées dans Vercel Dashboard:
- `ADMIN_PASSWORD`
- `JWT_SECRET`
- `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`
- `VOPAY_*` (Account ID, API Key, Shared Secret)
- `RESEND_API_KEY`
- `CLOUDFLARE_*`

---

## Intégrations Externes

### Margill
- **URL:** https://argentrapide.margill.com
- **Usage:** iFrame dans page `/ibv`
- **CSP:** Autorisé via `frame-src`

### Axeptio (Cookies/RGPD)
- **Project ID:** 6942e2e1ed7f7412dd4a11f2
- **Integration:** Script dans layout principal
- **Domains:** `static.axept.io`, `client.axept.io`, `api.axept.io`

### VoPay (Paiements)
- **API Base:** https://earthnode.vopay.com/api/v2/
- **Account:** solutionargentrapideinc
- **Endpoints utilisés:**
  - `/account/balance` - Solde du compte
  - `/account/transactions` - Historique

### Resend (Email)
- **Domain:** solutionargentrapide.ca
- **From:** info@solutionargentrapide.ca
- **Usage:** Contact forms, admin notifications

---

## Notes Importantes

### Sécurité
- CSP headers configurés dans middleware
- Admin protégé par JWT (7 jours)
- Cookies HTTP-only + Secure en production
- Rate limiting sur APIs sensibles (à implémenter)

### À faire
- [ ] Migrer `/client` vers `client.solutionargentrapide.ca`
- [ ] Configurer routing par sous-domaine dans Next.js middleware
- [ ] Supprimer `/api/admin/debug-env` en production
- [ ] Implémenter protection CSRF sur admin
- [ ] Ajouter rate limiting sur `/api/admin/login`

### Monitoring
- **Vercel Analytics:** Activé
- **Error Tracking:** Console logs (à améliorer)
- **Uptime:** Vercel automatique

---

**Dernière mise à jour:** 2025-12-19
