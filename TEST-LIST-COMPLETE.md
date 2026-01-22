# TEST LIST COMPLÈTE - Solution Argent Rapide

**Date**: 2026-01-22
**Version**: 1.0
**Projet**: SAR - Solution Argent Rapide INC

---

## SOMMAIRE EXÉCUTIF

### Statistiques Globales
- **Total Routes API**: 109 endpoints
- **Total Pages**: 41 pages (publiques + admin)
- **Tests E2E Existants**: 23 specs
- **Tests Unitaires**: 0 (à créer)
- **Coverage Estimé**: ~15% (E2E seulement)
- **Tests Manquants Estimés**: ~850 tests

### Effort Estimé Total
- **Tests API**: ~320 heures (109 endpoints × 3h moyenne)
- **Tests E2E**: ~180 heures (41 pages × 4-5h moyenne)
- **Tests d'Intégration**: ~120 heures
- **Tests de Sécurité**: ~80 heures
- **Tests Performance**: ~40 heures
- **Tests Mobile**: ~60 heures
- **Total**: **~800 heures** (20 semaines à 40h/semaine)

### Priorités Critiques
1. **Tests Sécurité Admin** (JWT, CSRF, XSS) - HIGH
2. **Tests API VoPay** (paiements critiques) - CRITICAL
3. **Tests Formulaire de Prêt** (flux principal) - CRITICAL
4. **Tests QuickBooks Sync** (données comptables) - HIGH
5. **Tests Mobile Responsive** (50% trafic mobile) - MEDIUM

---

## 1. TESTS E2E EXISTANTS (Playwright)

### Status Actuel
**23 tests** dans `/e2e/specs/`

### Inventory des Tests Existants

#### Smoke Tests (smoke.spec.ts) ✅
- [x] App accessibility test
- [x] Admin dashboard load test
- [x] API health check
- [x] QuickBooks API response
**Status**: ✅ Complet
**Priority**: Critical
**Coverage**: Pages principales

---

#### QuickBooks Tests (multiple files) ⚠️
**Fichiers**:
- `quickbooks.spec.ts`
- `admin-quickbooks-analyzer.spec.ts`
- `verify-qb-fix.spec.ts`
- `verify-qb-fix-direct.spec.ts`
- `fix-qb-connection.spec.ts`
- `qb-diagnostic-noauth.spec.ts`
- `qb-real-test.spec.ts`
- `qb-auto-fix-and-sync.spec.ts`
- `qb-verify-bank-accounts.spec.ts`
- `qb-auto-reconnect.spec.ts`
- `qb-full-auto.spec.ts`
- `qb-force-workflow.spec.ts`

**Tests couverts**:
- [x] QuickBooks connection status
- [x] QuickBooks authentication flow
- [x] QuickBooks bank accounts sync
- [x] QuickBooks auto-reconnect
- [x] QuickBooks diagnostic tools

**Status**: ⚠️ Redondant (12 fichiers pour QB!)
**Priority**: High
**Recommandation**: Consolider en 3 fichiers max

---

#### Google Analytics Tests (3 files) ✅
- `ga4-real-data-validation.spec.ts`
- `ga4-api-validation.spec.ts`
- `ga4-ui-manual-check.spec.ts`

**Tests couverts**:
- [x] GA4 API data validation
- [x] GA4 UI display check
- [x] GA4 real data collection

**Status**: ✅ Complet
**Priority**: Medium

---

#### SEO Tests (2 files) ✅
- `seo-real-data.spec.ts`
- `seo-complete-analysis.spec.ts`

**Tests couverts**:
- [x] SEO metrics collection
- [x] SEO data analysis

**Status**: ✅ Complet
**Priority**: Low

---

#### Margill Tests ✅
- `test-margill-iframe.spec.ts`

**Tests couverts**:
- [x] Margill iframe loading

**Status**: ✅ Complet
**Priority**: Medium

---

#### Clients SAR Tests ✅
- `clients-sar.spec.ts`

**Tests couverts**:
- [x] Clients SAR page accessibility
- [x] Navigation tabs
- [x] API endpoints (/stats, /search)
- [x] Dashboard display
- [x] Export CSV button

**Status**: ✅ Complet
**Priority**: Medium

---

#### Mobile Tests ⚠️
- `mobile-site-verification.spec.ts`

**Tests couverts**:
- [x] Mobile homepage (iPhone 13 Pro)
- [x] Mobile form submission
- [x] Mobile FAQ page
- [x] Mobile admin login
- [x] Mobile VoPay tab
- [x] Mobile performance (< 10s)
- [x] Responsive viewports (375px, 390px, 414px)

**Status**: ⚠️ Partiel
**Priority**: High
**Manquant**: Tests Android, tests tactiles, menu hamburger

---

#### VoPay Tests ⚠️
- `check-vopay-tab.spec.ts`

**Tests couverts**:
- [x] VoPay tab visibility in admin

**Status**: ⚠️ Insuffisant
**Priority**: Critical
**Manquant**: Tests transactions, webhooks, balance

---

#### Site Analyzer ✅
- `site-analyzer.spec.ts`

**Tests couverts**:
- [x] Site analysis tool

**Status**: ✅ Complet
**Priority**: Low

---

## 2. TESTS À CRÉER - PAR PAGE

### Pages Publiques (9 pages)

#### 2.1. Page d'accueil (`/`)
**Fichier**: `e2e/specs/public-homepage.spec.ts`

**Tests à créer**:
- [ ] Chargement de la page (< 3s)
- [ ] Affichage du hero banner
- [ ] Bouton CTA "Demander un prêt" fonctionne
- [ ] Navigation menu (desktop)
- [ ] Menu hamburger (mobile)
- [ ] Footer links fonctionnels
- [ ] Images chargées (logo, hero)
- [ ] Meta tags (title, description)
- [ ] Open Graph tags
- [ ] Google Analytics tracking
- [ ] Axeptio cookie banner
- [ ] Responsive design (320px-1920px)

**Priority**: Critical
**Effort**: 4 heures
**Status**: ❌ Missing

---

#### 2.2. Formulaire de Prêt (`/demande-de-pret-en-ligne-formulaire`)
**Fichier**: `e2e/specs/public-loan-form.spec.ts`

**Tests à créer**:
- [ ] Chargement du formulaire
- [ ] Tous les champs requis présents
- [ ] Validation prénom (min 2 chars)
- [ ] Validation nom (min 2 chars)
- [ ] Validation email (format)
- [ ] Validation téléphone (format canadien)
- [ ] Validation montant (min/max)
- [ ] Validation NAS (optionnel, format)
- [ ] Checkbox consentement requis
- [ ] Bouton submit désactivé si invalide
- [ ] Soumission réussie (mock API)
- [ ] Message de succès affiché
- [ ] Redirection vers `/demande-de-pret/success`
- [ ] Email de confirmation envoyé (mock)
- [ ] Données sauvegardées en DB
- [ ] Protection CSRF
- [ ] Rate limiting (max 3 soumissions/heure)
- [ ] Validation côté serveur

**Priority**: Critical
**Effort**: 8 heures
**Status**: ❌ Missing

---

#### 2.3. FAQ (`/faq`)
**Fichier**: `e2e/specs/public-faq.spec.ts`

**Tests à créer**:
- [ ] Chargement de la page
- [ ] Liste des questions affichée
- [ ] Accordéon fonctionnel (ouvrir/fermer)
- [ ] Toutes les réponses visibles au clic
- [ ] Recherche dans FAQ (si applicable)
- [ ] Links dans réponses fonctionnels
- [ ] Responsive design

**Priority**: Low
**Effort**: 2 heures
**Status**: ⚠️ Partial (mobile test exists)

---

#### 2.4. Nous Joindre (`/nous-joindre`)
**Fichier**: `e2e/specs/public-contact.spec.ts`

**Tests à créer**:
- [ ] Chargement de la page
- [ ] Formulaire de contact présent
- [ ] Validation nom (requis)
- [ ] Validation email (format)
- [ ] Validation message (min 10 chars)
- [ ] Soumission réussie
- [ ] Email envoyé via Resend
- [ ] Message de confirmation
- [ ] Coordonnées affichées (téléphone, adresse)
- [ ] Liens réseaux sociaux (si applicable)

**Priority**: Medium
**Effort**: 3 heures
**Status**: ❌ Missing

---

#### 2.5. IBV - Identity Bank Verification (`/ibv`)
**Fichier**: `e2e/specs/public-ibv.spec.ts`

**Tests à créer**:
- [ ] Chargement de la page
- [ ] Iframe Margill visible
- [ ] Iframe chargé sans erreur
- [ ] CSP autorise argentrapide.margill.com
- [ ] Responsive iframe (mobile)
- [ ] Fallback si iframe ne charge pas

**Priority**: Medium
**Effort**: 2 heures
**Status**: ⚠️ Partial (Margill test exists)

---

#### 2.6. Pages Légales (3 pages)
**Fichier**: `e2e/specs/public-legal.spec.ts`

**Tests à créer** (pour chaque page):
- `/mentions-legales`
- `/politique-de-confidentialite`
- `/politique-de-cookies`

**Tests**:
- [ ] Chargement de chaque page
- [ ] Contenu affiché
- [ ] Liens internes fonctionnels
- [ ] Footer présent
- [ ] Responsive design

**Priority**: Low
**Effort**: 1.5 heures
**Status**: ❌ Missing

---

#### 2.7. Espace Client (`/client`)
**Fichier**: `e2e/specs/public-client-portal.spec.ts`

**Tests à créer**:
- [ ] Chargement de la page
- [ ] Formulaire de login présent
- [ ] Validation email
- [ ] Validation mot de passe
- [ ] Login réussi (mock user)
- [ ] Redirection vers dashboard client
- [ ] Lien "Mot de passe oublié"
- [ ] Lien "Créer un compte"

**Priority**: Medium
**Effort**: 3 heures
**Status**: ❌ Missing

---

#### 2.8. Success Page (`/demande-de-pret/success`)
**Fichier**: `e2e/specs/public-loan-success.spec.ts`

**Tests à créer**:
- [ ] Chargement de la page
- [ ] Message de succès affiché
- [ ] Numéro de référence visible
- [ ] Lien retour à l'accueil
- [ ] Tracking GA4 conversion

**Priority**: Low
**Effort**: 1 heure
**Status**: ❌ Missing

---

### Pages Admin (32 pages)

#### 2.9. Admin Login (`/admin`)
**Fichier**: `e2e/specs/admin-login.spec.ts`

**Tests à créer**:
- [ ] Chargement de la page login
- [ ] Champ password présent
- [ ] Login avec bon password (FredRosa%1978)
- [ ] Login avec mauvais password (erreur)
- [ ] JWT token créé après login
- [ ] Cookie HTTP-only créé
- [ ] Redirection vers `/admin/dashboard`
- [ ] Session persiste (7 jours)
- [ ] Logout détruit le token
- [ ] Protection brute-force (rate limiting)
- [ ] Redirection auto si déjà logged in

**Priority**: Critical
**Effort**: 5 heures
**Status**: ⚠️ Partial (mobile test exists)

---

#### 2.10. Admin Dashboard (`/admin/dashboard`)
**Fichier**: `e2e/specs/admin-dashboard.spec.ts`

**Tests à créer**:
- [ ] Chargement du dashboard (authentifié)
- [ ] Sidebar navigation visible
- [ ] Tous les menus présents
- [ ] Widgets principaux chargés
- [ ] Stats temps réel affichées
- [ ] Liens vers sous-pages fonctionnels
- [ ] Protection sans auth (redirect to login)
- [ ] JWT validation
- [ ] Mobile responsive

**Priority**: Critical
**Effort**: 4 heures
**Status**: ⚠️ Partial (smoke test exists)

---

#### 2.11. Admin Messages (`/admin/messages`)
**Fichier**: `e2e/specs/admin-messages.spec.ts`

**Tests à créer**:
- [ ] Liste des messages chargée
- [ ] Pagination fonctionnelle
- [ ] Filtres (lu/non lu, date)
- [ ] Tri (date, expéditeur)
- [ ] Ouverture d'un message
- [ ] Marquer comme lu
- [ ] Répondre à un message
- [ ] Supprimer un message
- [ ] Recherche dans messages
- [ ] Export CSV

**Priority**: High
**Effort**: 6 heures
**Status**: ❌ Missing

---

#### 2.12. Admin VoPay (`/admin/vopay`)
**Fichier**: `e2e/specs/admin-vopay.spec.ts`

**Tests à créer**:
- [ ] Onglet VoPay visible
- [ ] Balance VoPay affiché
- [ ] API VoPay accessible
- [ ] Historique transactions chargé
- [ ] Filtres transactions (date, montant)
- [ ] Détails transaction au clic
- [ ] Export transactions CSV
- [ ] Refresh balance button
- [ ] Erreur si API VoPay down

**Priority**: Critical
**Effort**: 5 heures
**Status**: ⚠️ Partial (check-vopay-tab exists)

---

#### 2.13. Admin VoPay Orphans (`/admin/vopay/orphans`)
**Fichier**: `e2e/specs/admin-vopay-orphans.spec.ts`

**Tests à créer**:
- [ ] Page orphans chargée
- [ ] Liste des transactions orphelines
- [ ] Bouton "Réconcilier" présent
- [ ] Modal de réconciliation
- [ ] Assignation à un client
- [ ] Mise à jour statut après réconciliation

**Priority**: Medium
**Effort**: 3 heures
**Status**: ❌ Missing

---

#### 2.14. Admin QuickBooks (`/admin/quickbooks`)
**Fichier**: `e2e/specs/admin-quickbooks-dashboard.spec.ts`

**Tests à créer**:
- [ ] Dashboard QuickBooks chargé
- [ ] Status connexion affiché
- [ ] Bouton "Connecter" si disconnected
- [ ] Bouton "Refresh" si connected
- [ ] OAuth flow fonctionnel
- [ ] Callback URL valide
- [ ] Token refresh automatique
- [ ] Liste des comptes bancaires
- [ ] Sync manuelle fonctionnelle
- [ ] Logs sync affichés

**Priority**: High
**Effort**: 6 heures
**Status**: ⚠️ Partial (nombreux tests QB existent)

---

#### 2.15. Admin SEO (`/admin/seo`)
**Fichier**: `e2e/specs/admin-seo-dashboard.spec.ts`

**Tests à créer**:
- [ ] Dashboard SEO chargé
- [ ] Métriques Google Analytics affichées
- [ ] Métriques Search Console affichées
- [ ] Keywords top 10
- [ ] Graphiques de trafic
- [ ] Export données SEO
- [ ] Refresh data button

**Priority**: Low
**Effort**: 4 heures
**Status**: ⚠️ Partial (SEO tests exist)

---

#### 2.16. Admin Support (`/admin/support`)
**Fichier**: `e2e/specs/admin-support.spec.ts`

**Tests à créer**:
- [ ] Page support chargée
- [ ] Liste des tickets
- [ ] Filtres tickets (statut, priorité)
- [ ] Créer un nouveau ticket
- [ ] Assigner un ticket
- [ ] Changer statut ticket
- [ ] Ajouter commentaire
- [ ] Fermer un ticket

**Priority**: Medium
**Effort**: 5 heures
**Status**: ❌ Missing

---

#### 2.17. Admin Webhooks (`/admin/webhooks`)
**Fichier**: `e2e/specs/admin-webhooks.spec.ts`

**Tests à créer**:
- [ ] Page webhooks chargée
- [ ] Liste des webhooks
- [ ] Logs webhooks récents
- [ ] Filtres (type, statut)
- [ ] Détails webhook
- [ ] Retry webhook failed
- [ ] Stats webhooks (success/fail)

**Priority**: Medium
**Effort**: 4 heures
**Status**: ❌ Missing

---

#### 2.18. Admin Clients SAR (`/admin/clients-sar`)
**Fichier**: `e2e/specs/admin-clients-sar-full.spec.ts`

**Tests à créer** (en plus de ceux existants):
- [ ] Recherche avancée (multiple filtres)
- [ ] Tri par colonnes
- [ ] Pagination (>100 clients)
- [ ] Détails client modal
- [ ] Édition client
- [ ] Suppression client (soft delete)
- [ ] Export filtré CSV
- [ ] Patterns de fraude détectés
- [ ] Score de risque calculé
- [ ] Liste noire fonctionnelle

**Priority**: High
**Effort**: 8 heures
**Status**: ⚠️ Partial (clients-sar.spec exists)

---

#### 2.19. Admin Analyses (`/admin/analyses`)
**Fichier**: `e2e/specs/admin-analyses.spec.ts`

**Tests à créer**:
- [ ] Page analyses chargée
- [ ] Liste des analyses clients
- [ ] Filtres par statut
- [ ] Détails analyse
- [ ] Score crédit affiché
- [ ] Recommandation affichée
- [ ] Approuver/Refuser analyse

**Priority**: Medium
**Effort**: 4 heures
**Status**: ❌ Missing

---

#### 2.20. Admin Blacklist (`/admin/blacklist`)
**Fichier**: `e2e/specs/admin-blacklist.spec.ts`

**Tests à créer**:
- [ ] Page blacklist chargée
- [ ] Liste des entrées blacklist
- [ ] Ajouter une entrée (email, téléphone, NAS)
- [ ] Supprimer une entrée
- [ ] Raison blacklist affichée
- [ ] Recherche dans blacklist
- [ ] Export blacklist

**Priority**: Medium
**Effort**: 3 heures
**Status**: ❌ Missing

---

#### 2.21. Admin Margill (`/admin/margill`)
**Fichier**: `e2e/specs/admin-margill.spec.ts`

**Tests à créer**:
- [ ] Page Margill chargée
- [ ] Iframe Margill visible
- [ ] Données clients synchronisées
- [ ] Export vers Margill

**Priority**: Low
**Effort**: 2 heures
**Status**: ❌ Missing

---

#### 2.22. Admin Database Explorer (`/admin/database-explorer`)
**Fichier**: `e2e/specs/admin-database-explorer.spec.ts`

**Tests à créer**:
- [ ] Page explorer chargée
- [ ] Liste des tables affichée
- [ ] Sélection d'une table
- [ ] Données table affichées
- [ ] Pagination données
- [ ] Recherche dans table
- [ ] Export table CSV

**Priority**: Low
**Effort**: 4 heures
**Status**: ❌ Missing

---

#### 2.23. Admin Data Explorer (`/admin/data-explorer`)
**Fichier**: `e2e/specs/admin-data-explorer-v2.spec.ts`

**Tests à créer**:
- [ ] Version améliorée du database explorer
- [ ] Filtres avancés
- [ ] Visualisations graphiques

**Priority**: Low
**Effort**: 3 heures
**Status**: ❌ Missing

---

#### 2.24. Admin Metric Inspector (`/admin/metric-inspector`)
**Fichier**: `e2e/specs/admin-metric-inspector.spec.ts`

**Tests à créer**:
- [ ] Page inspector chargée
- [ ] Métriques système affichées
- [ ] Métriques temps réel
- [ ] Graphiques performance
- [ ] Export métriques

**Priority**: Low
**Effort**: 3 heures
**Status**: ❌ Missing

---

#### 2.25. Admin Performance (`/admin/performance`)
**Fichier**: `e2e/specs/admin-performance.spec.ts`

**Tests à créer**:
- [ ] Dashboard performance chargé
- [ ] Métriques API response time
- [ ] Métriques page load time
- [ ] Métriques database queries
- [ ] Alertes performance

**Priority**: Medium
**Effort**: 4 heures
**Status**: ❌ Missing

---

#### 2.26. Admin Monitoring (`/admin/monitoring`)
**Fichier**: `e2e/specs/admin-monitoring.spec.ts`

**Tests à créer**:
- [ ] Page monitoring chargée
- [ ] Uptime stats
- [ ] Error logs
- [ ] System health
- [ ] Alerts configuration

**Priority**: Medium
**Effort**: 4 heures
**Status**: ❌ Missing

---

#### 2.27. Admin Downloads (`/admin/downloads`)
**Fichier**: `e2e/specs/admin-downloads.spec.ts`

**Tests à créer**:
- [ ] Page downloads chargée
- [ ] Liste des fichiers téléchargeables
- [ ] Stats téléchargements
- [ ] Upload nouveau fichier
- [ ] Supprimer un fichier

**Priority**: Low
**Effort**: 3 heures
**Status**: ❌ Missing

---

#### 2.28. Admin Extension Token (`/admin/extension-token`)
**Fichier**: `e2e/specs/admin-extension-token.spec.ts`

**Tests à créer**:
- [ ] Page token chargée
- [ ] Générer nouveau token
- [ ] Token affiché (copie)
- [ ] Token expiré détecté
- [ ] Refresh token

**Priority**: Low
**Effort**: 2 heures
**Status**: ❌ Missing

---

#### 2.29. Admin Exemple Widgets (`/admin/exemple-widgets`)
**Fichier**: `e2e/specs/admin-widgets-demo.spec.ts`

**Tests à créer**:
- [ ] Page widgets chargée
- [ ] Tous les widgets affichés
- [ ] Widgets interactifs

**Priority**: Low
**Effort**: 1 heure
**Status**: ❌ Missing

---

#### 2.30. Pages de Test/Debug (à supprimer en production)
**Fichiers**:
- `/analyse` - Page d'analyse publique (?)
- `/clients/[id]` - Page client dynamique
- `/demo-widgets` - Demo widgets
- `/m` - Page mystère
- `/metrics-debug` - Debug métriques
- `/metrics` - Métriques publiques
- `/test-simple` - Test simple
- `/hacker-lab` - Lab sécurité
- `/security-dashboard` - Dashboard sécurité

**Recommandation**: Supprimer ou déplacer en admin avec auth

---

## 3. TESTS API - PAR ENDPOINT (109 Endpoints)

### 3.1. Admin APIs (31 endpoints)

#### Admin Auth
| Endpoint | Methods | Tests Required | Priority | Status |
|----------|---------|----------------|----------|--------|
| `/api/admin/login` | POST | Auth valid password, JWT creation, Cookie creation, Wrong password, Rate limiting, CSRF protection | Critical | ❌ Missing |
| `/api/admin/logout` | POST | JWT deletion, Cookie deletion, Redirect to login | Critical | ❌ Missing |

**Tests à créer** (login):
- [ ] POST valid password → 200 + JWT token
- [ ] POST invalid password → 401
- [ ] POST missing password → 400
- [ ] POST empty password → 400
- [ ] Cookie HTTP-only created
- [ ] Cookie Secure in production
- [ ] JWT expires in 7 days
- [ ] Rate limiting (max 5 attempts/15min)
- [ ] CSRF token validation
- [ ] Redirect to dashboard after login

**Tests à créer** (logout):
- [ ] POST logout → 200 + cookie deleted
- [ ] JWT invalidated
- [ ] Redirect to login page

**Effort**: 6 heures

---

#### Admin Messages
| Endpoint | Methods | Tests Required | Priority | Status |
|----------|---------|----------------|----------|--------|
| `/api/admin/messages` | GET, POST, PATCH | Auth required, List messages, Create message, Update message, Pagination, Filters | High | ❌ Missing |
| `/api/admin/messages/assign` | GET, POST | Assign message to admin, Unassign | Medium | ❌ Missing |

**Tests à créer** (messages):
- [ ] GET without auth → 401
- [ ] GET with valid auth → 200 + messages list
- [ ] GET with pagination (?limit=10&offset=0)
- [ ] GET with filters (?status=unread)
- [ ] POST create message → 201
- [ ] POST invalid data → 400
- [ ] PATCH update message → 200
- [ ] PATCH invalid ID → 404

**Effort**: 5 heures

---

#### Admin VoPay
| Endpoint | Methods | Tests Required | Priority | Status |
|----------|---------|----------------|----------|--------|
| `/api/admin/vopay` | GET | Balance VoPay, Auth VoPay, Error handling | Critical | ❌ Missing |
| `/api/admin/vopay/transactions` | GET | List transactions, Pagination, Filters | Critical | ❌ Missing |
| `/api/admin/vopay/real-transactions` | GET | Real transactions (not mock) | Critical | ❌ Missing |
| `/api/admin/vopay-debug` | GET | Debug VoPay auth, API keys validation | Medium | ❌ Missing |

**Tests à créer**:
- [ ] GET balance → 200 + balance data
- [ ] GET balance with invalid VoPay key → 401
- [ ] GET transactions → 200 + array
- [ ] GET transactions pagination
- [ ] GET transactions filters (date range)
- [ ] GET real-transactions vs mock
- [ ] GET debug → auth status

**Effort**: 6 heures

---

#### Admin Webhooks
| Endpoint | Methods | Tests Required | Priority | Status |
|----------|---------|----------------|----------|--------|
| `/api/admin/webhooks/list` | GET | List all webhooks | Medium | ❌ Missing |
| `/api/admin/webhooks/stats` | GET | Webhooks statistics | Medium | ❌ Missing |
| `/api/admin/webhooks/debug` | GET | Debug webhooks | Low | ❌ Missing |
| `/api/admin/webhooks/send-alert` | POST | Send webhook alert | Medium | ❌ Missing |

**Effort**: 3 heures

---

#### Admin Support
| Endpoint | Methods | Tests Required | Priority | Status |
|----------|---------|----------------|----------|--------|
| `/api/admin/support/messages` | POST | Create support message | Medium | ❌ Missing |
| `/api/admin/support/stats` | GET | Support statistics | Low | ❌ Missing |
| `/api/admin/support/tickets` | GET, POST | List tickets, Create ticket | Medium | ❌ Missing |
| `/api/admin/support/tickets/[id]` | GET, PATCH | Get ticket, Update ticket | Medium | ❌ Missing |

**Effort**: 4 heures

---

#### Admin Analytics
| Endpoint | Methods | Tests Required | Priority | Status |
|----------|---------|----------------|----------|--------|
| `/api/admin/analytics` | GET | Global analytics | Medium | ❌ Missing |
| `/api/admin/analytics/dashboard` | GET | Dashboard analytics | Medium | ❌ Missing |

**Effort**: 2 heures

---

#### Admin Clients SAR
| Endpoint | Methods | Tests Required | Priority | Status |
|----------|---------|----------------|----------|--------|
| `/api/admin/clients-sar/search` | GET | Search clients, Filters, Pagination | High | ⚠️ Partial |
| `/api/admin/clients-sar/stats` | GET | Clients statistics | Medium | ⚠️ Partial |
| `/api/admin/clients-sar/concordances` | GET | Concordances detection | Medium | ❌ Missing |
| `/api/admin/clients-sar/concordances-stats` | GET | Concordances stats | Low | ❌ Missing |
| `/api/admin/clients-sar/autres-contrats` | GET | Other contracts | Low | ❌ Missing |

**Effort**: 5 heures

---

#### Admin Misc
| Endpoint | Methods | Tests Required | Priority | Status |
|----------|---------|----------------|----------|--------|
| `/api/admin/send` | POST | Send email from admin | High | ❌ Missing |
| `/api/admin/client-analysis` | GET, POST, DELETE, PATCH | CRUD client analysis | High | ❌ Missing |
| `/api/admin/database/explore` | GET | Explore database tables | Low | ❌ Missing |
| `/api/admin/metrics/inspect` | GET | Inspect metrics | Low | ❌ Missing |
| `/api/admin/downloads/stats` | GET | Downloads statistics | Low | ❌ Missing |

**Effort**: 6 heures

---

### 3.2. QuickBooks APIs (28 endpoints)

#### QB Auth & Connection
| Endpoint | Methods | Tests Required | Priority | Status |
|----------|---------|----------------|----------|--------|
| `/api/quickbooks/auth/connect` | GET | OAuth initiation, Redirect to Intuit | Critical | ❌ Missing |
| `/api/quickbooks/auth/callback` | GET | OAuth callback, Code exchange, Token storage | Critical | ❌ Missing |
| `/api/quickbooks/auth/refresh` | POST | Refresh access token | Critical | ❌ Missing |
| `/api/quickbooks/status` | GET | Connection status | High | ⚠️ Partial |
| `/api/quickbooks/connection/status` | GET | Detailed connection status | High | ❌ Missing |
| `/api/quickbooks/connection/test` | GET | Test QB API connection | High | ❌ Missing |
| `/api/quickbooks/connection/refresh` | POST | Manual token refresh | Medium | ❌ Missing |
| `/api/quickbooks/connection/auto-refresh` | POST | Auto refresh token | Medium | ❌ Missing |
| `/api/quickbooks/connection/disconnect` | POST | Disconnect QB account | Medium | ❌ Missing |
| `/api/quickbooks/connection/force-reconnect` | POST | Force reconnection | Medium | ❌ Missing |
| `/api/quickbooks/connection/force-status` | POST | Force status check | Low | ❌ Missing |

**Tests à créer**:
- [ ] GET auth/connect → 302 redirect to Intuit
- [ ] GET auth/callback?code=xxx → 200 + tokens saved
- [ ] GET auth/callback without code → 400
- [ ] POST auth/refresh → 200 + new token
- [ ] POST auth/refresh with expired token → 401
- [ ] GET status → 200 + {connected: boolean}
- [ ] GET connection/status → detailed info
- [ ] POST disconnect → 200 + tokens deleted

**Effort**: 10 heures

---

#### QB Accounts
| Endpoint | Methods | Tests Required | Priority | Status |
|----------|---------|----------------|----------|--------|
| `/api/quickbooks/accounts` | GET | List all QB accounts | High | ❌ Missing |

**Effort**: 2 heures

---

#### QB Sync
| Endpoint | Methods | Tests Required | Priority | Status |
|----------|---------|----------------|----------|--------|
| `/api/quickbooks/sync/all` | POST | Sync all data (accounts, customers, invoices, payments, vendors) | Critical | ❌ Missing |
| `/api/quickbooks/sync/accounts` | POST | Sync accounts only | High | ❌ Missing |
| `/api/quickbooks/sync/customers` | POST | Sync customers only | High | ❌ Missing |
| `/api/quickbooks/sync/invoices` | POST | Sync invoices only | High | ❌ Missing |
| `/api/quickbooks/sync/payments` | POST | Sync payments only | High | ❌ Missing |
| `/api/quickbooks/sync/vendors` | POST | Sync vendors only | Medium | ❌ Missing |

**Tests à créer**:
- [ ] POST sync/all without auth → 401
- [ ] POST sync/all with QB disconnected → 400
- [ ] POST sync/all with valid connection → 200 + synced counts
- [ ] POST sync/accounts → 200 + accounts synced
- [ ] Verify data saved in Supabase after sync
- [ ] Handle QB API rate limiting
- [ ] Handle QB API errors (500, 503)

**Effort**: 8 heures

---

#### QB Reports
| Endpoint | Methods | Tests Required | Priority | Status |
|----------|---------|----------------|----------|--------|
| `/api/quickbooks/reports/profit-loss` | GET | Profit & Loss report | High | ❌ Missing |
| `/api/quickbooks/reports/balance-sheet` | GET | Balance Sheet report | High | ❌ Missing |
| `/api/quickbooks/reports/balance-sheet-detailed` | GET | Detailed Balance Sheet | Medium | ❌ Missing |
| `/api/quickbooks/reports/cash-flow` | GET | Cash Flow report | Medium | ❌ Missing |
| `/api/quickbooks/reports/aged-receivables` | GET | Aged Receivables report | Medium | ❌ Missing |

**Tests à créer**:
- [ ] GET profit-loss → 200 + report data
- [ ] GET balance-sheet → 200 + report data
- [ ] GET with date filters (?start_date=2026-01-01)
- [ ] GET without QB connection → 400
- [ ] Verify report format matches QB API

**Effort**: 6 heures

---

### 3.3. VoPay APIs (4 endpoints)

| Endpoint | Methods | Tests Required | Priority | Status |
|----------|---------|----------------|----------|--------|
| `/api/vopay/stats` | GET | Global VoPay stats | Medium | ❌ Missing |
| `/api/vopay/stats/[clientId]` | GET | Client-specific stats | Medium | ❌ Missing |
| `/api/webhooks/vopay` | POST | VoPay webhook handler | Critical | ❌ Missing |

**Tests à créer** (webhook VoPay):
- [ ] POST webhook with valid signature → 200
- [ ] POST webhook with invalid signature → 401
- [ ] POST webhook transaction success → update DB
- [ ] POST webhook transaction failed → log error
- [ ] POST webhook duplicate (idempotency)
- [ ] POST webhook timeout handling
- [ ] Verify Shared Secret validation

**Priority**: Critical
**Effort**: 8 heures

---

### 3.4. Contact APIs (2 endpoints)

| Endpoint | Methods | Tests Required | Priority | Status |
|----------|---------|----------------|----------|--------|
| `/api/contact` | POST | Submit contact form | High | ❌ Missing |
| `/api/contact-analyse` | POST | Submit loan application with analysis | Critical | ❌ Missing |

**Tests à créer** (contact):
- [ ] POST valid data → 200 + email sent
- [ ] POST invalid email → 400
- [ ] POST missing fields → 400
- [ ] POST with XSS attempt → sanitized
- [ ] POST with SQL injection → sanitized
- [ ] Rate limiting (max 3/hour per IP)
- [ ] CSRF protection
- [ ] Resend API called
- [ ] Data saved in Supabase

**Tests à créer** (contact-analyse):
- [ ] POST valid loan application → 200
- [ ] POST with fraud detection → flagged
- [ ] POST with blacklist email → rejected
- [ ] Validation all required fields
- [ ] Credit score calculation
- [ ] Risk assessment
- [ ] Email notification sent

**Priority**: Critical
**Effort**: 10 heures

---

### 3.5. SEO APIs (8 endpoints)

| Endpoint | Methods | Tests Required | Priority | Status |
|----------|---------|----------------|----------|--------|
| `/api/seo/metrics` | GET | SEO metrics | Low | ❌ Missing |
| `/api/seo/keywords` | GET | Keywords data | Low | ❌ Missing |
| `/api/seo/analytics/detailed` | GET | Detailed analytics | Low | ❌ Missing |
| `/api/seo/collect/ga4` | POST | Collect GA4 data | Low | ❌ Missing |
| `/api/seo/collect/gsc` | POST | Collect Google Search Console data | Low | ❌ Missing |
| `/api/seo/collect/semrush` | POST | Collect SEMrush data | Low | ❌ Missing |
| `/api/seo/ga4-status` | GET | GA4 connection status | Low | ❌ Missing |
| `/api/seo/exploit-secrets` | GET | Security test endpoint (REMOVE) | Critical | ⚠️ SECURITY RISK |

**Recommandation**: Supprimer `/api/seo/exploit-secrets` IMMÉDIATEMENT

**Effort**: 4 heures (SEO) + 0.5 heure (remove exploit)

---

### 3.6. Sentinel/OSINT/Network APIs (20 endpoints)

**Note**: Ces endpoints semblent être pour des outils de développement/monitoring internes. À sécuriser ou déplacer en admin.

#### OSINT APIs
| Endpoint | Methods | Tests Required | Priority | Status |
|----------|---------|----------------|----------|--------|
| `/api/osint/scan` | GET | Local network scan | Low | ❌ Missing |
| `/api/osint/network-scan` | GET | Network scan | Low | ❌ Missing |
| `/api/osint/advanced` | POST | Advanced OSINT | Low | ❌ Missing |
| `/api/osint/vulnerabilities` | GET | Vulnerability scan | Low | ❌ Missing |
| `/api/osint/lab-scan` | GET | Lab scan | Low | ❌ Missing |
| `/api/osint/bypass-tests` | GET | Bypass tests (REMOVE) | Critical | ⚠️ SECURITY RISK |
| `/api/osint/exploit-chains` | GET | Exploit chains (REMOVE) | Critical | ⚠️ SECURITY RISK |

**Recommandation**: Supprimer tous les endpoints "exploit" et "bypass"

---

#### Sentinel APIs
| Endpoint | Methods | Tests Required | Priority | Status |
|----------|---------|----------------|----------|--------|
| `/api/sentinel/fleet` | GET, POST | Sentinel fleet management | Low | ❌ Missing |
| `/api/sentinel/orchestrator` | POST | Orchestrate sentinel actions | Low | ❌ Missing |
| `/api/sentinel/execute-command` | POST | Execute system command | Critical | ⚠️ SECURITY RISK |
| `/api/sentinel/scan-project` | POST | Scan project files | Low | ❌ Missing |
| `/api/sentinel/scoring` | GET, POST | Scoring system | Low | ❌ Missing |
| `/api/sentinel/execute` | POST | Execute wrapper | Low | ❌ Missing |
| `/api/sentinel/network-monitor` | GET | Network monitoring | Low | ❌ Missing |

**Recommandation**: Sécuriser tous les endpoints Sentinel (admin auth required)

**Effort**: 2 heures (sécurisation) + tests si nécessaire

---

#### Network APIs
| Endpoint | Methods | Tests Required | Priority | Status |
|----------|---------|----------------|----------|--------|
| `/api/network/trace` | GET | Network trace | Low | ❌ Missing |
| `/api/network/active-recon` | GET | Active reconnaissance | Low | ❌ Missing |
| `/api/network/packet-capture` | GET | Packet capture | Low | ❌ Missing |

---

### 3.7. Routes Discovery APIs (2 endpoints)

| Endpoint | Methods | Tests Required | Priority | Status |
|----------|---------|----------------|----------|--------|
| `/api/routes/discover` | GET, POST | Discover API routes | Low | ❌ Missing |
| `/api/routes/expand` | POST | Create new route dynamically | Low | ❌ Missing |

---

### 3.8. Memory/Activity APIs (8 endpoints)

| Endpoint | Methods | Tests Required | Priority | Status |
|----------|---------|----------------|----------|--------|
| `/api/memory/store` | POST | Store memory | Low | ❌ Missing |
| `/api/memory/recall` | GET | Recall memory | Low | ❌ Missing |
| `/api/memory/context` | GET | Get context | Low | ❌ Missing |
| `/api/memory/session` | GET, POST | Session management | Low | ❌ Missing |
| `/api/memory/doc-read` | GET, POST | Document reading | Low | ❌ Missing |
| `/api/activity/log` | POST | Log activity | Low | ❌ Missing |
| `/api/activity/recent` | GET | Recent activity | Low | ❌ Missing |
| `/api/activity/stats` | GET | Activity stats | Low | ❌ Missing |

---

### 3.9. Misc/Utility APIs (12 endpoints)

| Endpoint | Methods | Tests Required | Priority | Status |
|----------|---------|----------------|----------|--------|
| `/api/applications/submit` | POST | Submit application | High | ❌ Missing |
| `/api/audit/[clientId]` | GET | Client audit | Medium | ❌ Missing |
| `/api/audit/stats` | GET | Audit stats | Low | ❌ Missing |
| `/api/download/[filename]` | GET | Download file | Medium | ❌ Missing |
| `/api/download/track` | POST | Track download | Low | ❌ Missing |
| `/api/metrics/all` | GET | All metrics | Low | ❌ Missing |
| `/api/performance-diagnostic` | GET | Performance diagnostic | Low | ❌ Missing |
| `/api/cron/seo-collect` | GET | Cron job SEO collection | Low | ❌ Missing |
| `/api/webhooks/quickbooks` | POST | QuickBooks webhook | High | ❌ Missing |
| `/api/worker/process-jobs` | POST | Background job processing | Medium | ❌ Missing |

---

### 3.10. Test/Debug APIs (À SUPPRIMER EN PRODUCTION)

| Endpoint | Priority | Action |
|----------|----------|--------|
| `/api/test-db` | Critical | REMOVE |
| `/api/test-insert` | Critical | REMOVE |
| `/api/test-tool` | Critical | REMOVE |
| `/api/test/demo` | Critical | REMOVE |
| `/api/anonymity/check` | Medium | Déplacer en admin |
| `/api/device/deep-inspector` | Medium | Déplacer en admin |
| `/api/fingerprint/deep-scan` | Medium | Déplacer en admin |
| `/api/cortex/sync-miro` | Low | Vérifier utilité |

**Recommandation**: Supprimer tous les endpoints de test/debug en production

---

## 4. TESTS D'INTÉGRATION

### 4.1. VoPay Integration Flow
**Fichier**: `e2e/specs/integration-vopay-flow.spec.ts`

**Tests à créer**:
- [ ] Client submits loan application
- [ ] Application approved by admin
- [ ] IBV verification initiated (Margill)
- [ ] IBV completed successfully
- [ ] VoPay transaction created
- [ ] Webhook received from VoPay (transaction success)
- [ ] Transaction updated in database
- [ ] Client notified by email
- [ ] Admin sees transaction in VoPay dashboard
- [ ] QuickBooks invoice created automatically

**Priority**: Critical
**Effort**: 12 heures
**Status**: ❌ Missing

---

### 4.2. Margill Submission Flow
**Fichier**: `e2e/specs/integration-margill-flow.spec.ts`

**Tests à créer**:
- [ ] Client opens IBV page
- [ ] Margill iframe loads correctly
- [ ] Client submits bank verification
- [ ] Data sent to Margill API
- [ ] Margill response received
- [ ] Verification status updated in SAR DB
- [ ] Admin notified of verification completion
- [ ] Client can proceed to next step

**Priority**: High
**Effort**: 8 heures
**Status**: ❌ Missing

---

### 4.3. QuickBooks Sync Flow
**Fichier**: `e2e/specs/integration-quickbooks-sync.spec.ts`

**Tests à créer**:
- [ ] Admin clicks "Connect QuickBooks"
- [ ] OAuth flow redirects to Intuit
- [ ] User authorizes app
- [ ] Callback receives authorization code
- [ ] Access token + refresh token stored
- [ ] Sync all data initiated
- [ ] Accounts synced to Supabase
- [ ] Customers synced to Supabase
- [ ] Invoices synced to Supabase
- [ ] Payments synced to Supabase
- [ ] Sync status displayed in admin
- [ ] Token auto-refresh works (before expiry)
- [ ] Disconnect QB removes tokens

**Priority**: High
**Effort**: 10 heures
**Status**: ❌ Missing

---

### 4.4. Email Sending (Resend)
**Fichier**: `e2e/specs/integration-email-resend.spec.ts`

**Tests à créer**:
- [ ] Contact form submission triggers email
- [ ] Email sent via Resend API
- [ ] Email received in inbox (test email)
- [ ] Email content correct (template)
- [ ] Email headers correct (SPF, DKIM)
- [ ] Attachments work (if applicable)
- [ ] Email delivery status tracked
- [ ] Bounced email logged
- [ ] Rate limiting respected (Resend limits)

**Priority**: High
**Effort**: 6 heures
**Status**: ❌ Missing

---

### 4.5. Google Analytics Tracking
**Fichier**: `e2e/specs/integration-ga4-tracking.spec.ts`

**Tests à créer**:
- [ ] GA4 script loaded on all pages
- [ ] Page view tracked on navigation
- [ ] Event tracked on form submission
- [ ] Conversion tracked on success page
- [ ] User properties set correctly
- [ ] Custom events tracked (button clicks)
- [ ] E-commerce events (if applicable)
- [ ] GA4 API data collection works
- [ ] Data visible in GA4 dashboard

**Priority**: Medium
**Effort**: 5 heures
**Status**: ⚠️ Partial (GA4 tests exist)

---

### 4.6. Axeptio Cookie Consent
**Fichier**: `e2e/specs/integration-axeptio-cookies.spec.ts`

**Tests à créer**:
- [ ] Axeptio banner displays on first visit
- [ ] Cookie consent choices saved
- [ ] GA4 blocked until consent given
- [ ] Cookies set after consent
- [ ] Opt-out removes cookies
- [ ] Consent preferences persisted
- [ ] RGPD compliance verified

**Priority**: Medium
**Effort**: 4 heures
**Status**: ❌ Missing

---

## 5. TESTS DE SÉCURITÉ

### 5.1. JWT Validation
**Fichier**: `e2e/specs/security-jwt.spec.ts`

**Tests à créer**:
- [ ] Valid JWT grants access to admin routes
- [ ] Expired JWT rejected (401)
- [ ] Invalid signature rejected
- [ ] Missing JWT redirects to login
- [ ] JWT tampered payload rejected
- [ ] JWT secret strength validated
- [ ] JWT claims validated (exp, iat, iss)
- [ ] JWT refresh mechanism works
- [ ] Logout invalidates JWT
- [ ] Concurrent JWT sessions handled

**Priority**: Critical
**Effort**: 8 heures
**Status**: ❌ Missing

---

### 5.2. CSRF Protection
**Fichier**: `e2e/specs/security-csrf.spec.ts`

**Tests à créer**:
- [ ] CSRF token generated on form load
- [ ] POST without CSRF token rejected
- [ ] POST with invalid CSRF token rejected
- [ ] POST with valid CSRF token accepted
- [ ] CSRF token rotated after use
- [ ] CSRF token expires after timeout
- [ ] Double submit cookie pattern validated

**Priority**: Critical
**Effort**: 6 heures
**Status**: ❌ Missing

---

### 5.3. XSS Prevention
**Fichier**: `e2e/specs/security-xss.spec.ts`

**Tests à créer**:
- [ ] Script tags in input sanitized
- [ ] HTML tags in input escaped
- [ ] Event handlers (onclick) removed
- [ ] JavaScript URL schemes blocked
- [ ] SVG XSS payloads blocked
- [ ] Data URLs blocked in href
- [ ] CSP headers block inline scripts
- [ ] User-generated content sanitized

**Priority**: Critical
**Effort**: 8 heures
**Status**: ❌ Missing

---

### 5.4. SQL Injection Prevention
**Fichier**: `e2e/specs/security-sql-injection.spec.ts`

**Tests à créer**:
- [ ] SQL payloads in search input blocked
- [ ] Union-based SQL injection blocked
- [ ] Boolean-based SQL injection blocked
- [ ] Time-based SQL injection blocked
- [ ] Supabase RLS enforced
- [ ] Prepared statements used (verify code)
- [ ] ORM used (not raw queries)

**Priority**: Critical
**Effort**: 6 heures
**Status**: ❌ Missing

---

### 5.5. Rate Limiting
**Fichier**: `e2e/specs/security-rate-limiting.spec.ts`

**Tests à créer**:
- [ ] Login endpoint rate limited (5/15min)
- [ ] Contact form rate limited (3/hour)
- [ ] API endpoints rate limited (100/min)
- [ ] Rate limit headers returned (X-RateLimit-*)
- [ ] 429 status returned when exceeded
- [ ] Rate limit per IP address
- [ ] Rate limit per user (if authenticated)
- [ ] Rate limit bypass attempts logged

**Priority**: High
**Effort**: 8 heures
**Status**: ❌ Missing

---

### 5.6. Cookie Security
**Fichier**: `e2e/specs/security-cookies.spec.ts`

**Tests à créer**:
- [ ] JWT cookie HTTP-only flag set
- [ ] JWT cookie Secure flag in production
- [ ] JWT cookie SameSite=Strict or Lax
- [ ] Cookie expiration correct (7 days)
- [ ] Session cookie deleted on logout
- [ ] Cookies not accessible via JavaScript
- [ ] Cookies domain-specific

**Priority**: High
**Effort**: 4 heures
**Status**: ❌ Missing

---

### 5.7. CSP (Content Security Policy)
**Fichier**: `e2e/specs/security-csp.spec.ts`

**Tests à créer**:
- [ ] CSP header present on all pages
- [ ] Inline scripts blocked (except nonce)
- [ ] External scripts whitelisted only
- [ ] Unsafe-eval blocked
- [ ] Frame-ancestors configured
- [ ] Image sources restricted
- [ ] CSP violations logged
- [ ] CSP report-uri configured

**Priority**: High
**Effort**: 5 heures
**Status**: ⚠️ Partial (CSP configured in middleware)

---

### 5.8. Authentication Bypass Attempts
**Fichier**: `e2e/specs/security-auth-bypass.spec.ts`

**Tests à créer**:
- [ ] Direct access to admin routes without auth → 401
- [ ] Cookie manipulation blocked
- [ ] JWT forging attempts logged
- [ ] Session fixation prevented
- [ ] Password reset token validation
- [ ] OAuth state parameter validation
- [ ] Brute force login attempts blocked

**Priority**: Critical
**Effort**: 8 heures
**Status**: ❌ Missing

---

### 5.9. File Upload Security (si applicable)
**Fichier**: `e2e/specs/security-file-upload.spec.ts`

**Tests à créer**:
- [ ] File type validation (whitelist)
- [ ] File size limits enforced
- [ ] Malicious files rejected (exe, sh, php)
- [ ] File content validation (magic bytes)
- [ ] Uploaded files stored outside webroot
- [ ] Filenames sanitized
- [ ] Virus scanning (if applicable)

**Priority**: Medium
**Effort**: 4 heures
**Status**: ❌ Missing

---

### 5.10. API Security
**Fichier**: `e2e/specs/security-api-endpoints.spec.ts`

**Tests à créer**:
- [ ] All admin APIs require authentication
- [ ] CORS configured correctly
- [ ] OPTIONS requests handled
- [ ] API keys validated (VoPay, QB)
- [ ] Secrets not exposed in responses
- [ ] Error messages don't leak info
- [ ] API versioning in place

**Priority**: High
**Effort**: 6 heures
**Status**: ❌ Missing

---

## 6. TESTS DE PERFORMANCE

### 6.1. Page Load Times
**Fichier**: `e2e/specs/performance-page-load.spec.ts`

**Tests à créer**:
- [ ] Homepage loads < 2s (desktop)
- [ ] Homepage loads < 3s (mobile)
- [ ] Loan form loads < 2s
- [ ] Admin dashboard loads < 3s
- [ ] Images lazy-loaded
- [ ] CSS/JS minified
- [ ] Fonts optimized
- [ ] Lighthouse score > 90

**Priority**: Medium
**Effort**: 6 heures
**Status**: ⚠️ Partial (mobile performance test exists)

---

### 6.2. API Response Times
**Fichier**: `e2e/specs/performance-api-response.spec.ts`

**Tests à créer**:
- [ ] GET /api/admin/messages < 500ms
- [ ] GET /api/admin/vopay < 1s
- [ ] POST /api/contact < 500ms
- [ ] POST /api/quickbooks/sync/all < 10s
- [ ] GET /api/admin/clients-sar/search < 1s
- [ ] All API endpoints < 2s (p95)
- [ ] Slow query alerts (>5s)

**Priority**: Medium
**Effort**: 5 heures
**Status**: ❌ Missing

---

### 6.3. Database Query Performance
**Fichier**: `e2e/specs/performance-database.spec.ts`

**Tests à créer**:
- [ ] Search queries < 500ms
- [ ] Index usage verified
- [ ] N+1 queries eliminated
- [ ] Joins optimized
- [ ] Pagination queries fast
- [ ] Count queries cached
- [ ] Connection pooling configured

**Priority**: Medium
**Effort**: 6 heures
**Status**: ❌ Missing

---

### 6.4. Large Dataset Handling
**Fichier**: `e2e/specs/performance-large-data.spec.ts`

**Tests à créer**:
- [ ] List 1000+ clients without timeout
- [ ] Export 5000+ rows CSV < 10s
- [ ] Pagination handles 10k+ records
- [ ] Search indexes work at scale
- [ ] Memory usage stable (no leaks)
- [ ] Batch operations optimized

**Priority**: Low
**Effort**: 4 heures
**Status**: ❌ Missing

---

### 6.5. Concurrent User Simulation
**Fichier**: `e2e/specs/performance-load-test.spec.ts`

**Tests à créer**:
- [ ] 10 concurrent users - no errors
- [ ] 50 concurrent users - degraded but functional
- [ ] 100 concurrent users - response times
- [ ] Database connections pooled
- [ ] API rate limits work under load
- [ ] No race conditions

**Priority**: Medium
**Effort**: 8 heures
**Tools**: k6 or Artillery
**Status**: ❌ Missing

---

## 7. TESTS MOBILE/RESPONSIVE

### 7.1. Viewport Tests
**Fichier**: `e2e/specs/responsive-viewports.spec.ts`

**Tests à créer** (pour chaque page principale):
- [ ] 320px (iPhone SE) - layout correct
- [ ] 375px (iPhone 12/13) - layout correct
- [ ] 390px (iPhone 13 Pro) - layout correct
- [ ] 414px (iPhone Pro Max) - layout correct
- [ ] 768px (iPad portrait) - layout correct
- [ ] 1024px (iPad landscape) - layout correct
- [ ] 1920px (Desktop) - layout correct
- [ ] No horizontal scroll on any viewport
- [ ] Font sizes readable on mobile
- [ ] Buttons tappable (min 44px)

**Priority**: High
**Effort**: 10 heures
**Status**: ⚠️ Partial (mobile tests exist)

---

### 7.2. Touch Interactions
**Fichier**: `e2e/specs/responsive-touch.spec.ts`

**Tests à créer**:
- [ ] Tap on buttons works
- [ ] Swipe gestures (if applicable)
- [ ] Long press (if applicable)
- [ ] Pinch to zoom (images)
- [ ] Touch targets minimum 44x44px
- [ ] No accidental clicks
- [ ] Hover states replaced on mobile

**Priority**: Medium
**Effort**: 4 heures
**Status**: ❌ Missing

---

### 7.3. Menu Hamburger
**Fichier**: `e2e/specs/responsive-hamburger-menu.spec.ts`

**Tests à créer**:
- [ ] Hamburger icon visible on mobile
- [ ] Menu opens on tap
- [ ] Menu closes on tap outside
- [ ] Menu closes on close button
- [ ] Menu items visible
- [ ] Menu links functional
- [ ] Menu animation smooth
- [ ] Menu accessible (keyboard)

**Priority**: High
**Effort**: 3 heures
**Status**: ❌ Missing

---

### 7.4. Forms on Mobile
**Fichier**: `e2e/specs/responsive-forms-mobile.spec.ts`

**Tests à créer**:
- [ ] Loan form usable on mobile
- [ ] Keyboard opens correctly (email, tel, number)
- [ ] Autofill works on mobile
- [ ] Date pickers mobile-friendly
- [ ] Select dropdowns mobile-friendly
- [ ] Validation messages visible
- [ ] Submit button accessible
- [ ] Error states clear

**Priority**: High
**Effort**: 5 heures
**Status**: ⚠️ Partial (mobile form test exists)

---

### 7.5. Images Responsive
**Fichier**: `e2e/specs/responsive-images.spec.ts`

**Tests à créer**:
- [ ] Images scale correctly
- [ ] Srcset used for different sizes
- [ ] WebP format used (with fallback)
- [ ] Images lazy-loaded
- [ ] No layout shift (CLS)
- [ ] Retina images on high-DPI screens

**Priority**: Low
**Effort**: 3 heures
**Status**: ❌ Missing

---

## 8. TESTS DE COMPATIBILITÉ

### 8.1. Browser Compatibility
**Fichier**: `e2e/specs/compatibility-browsers.spec.ts`

**Tests à créer** (pour page d'accueil + formulaire):
- [ ] Chrome (latest) - full functionality
- [ ] Firefox (latest) - full functionality
- [ ] Safari (latest) - full functionality
- [ ] Edge (latest) - full functionality
- [ ] Chrome (1 version old) - works
- [ ] Safari iOS (latest) - works
- [ ] Chrome Android (latest) - works

**Priority**: Medium
**Effort**: 8 heures
**Tools**: Playwright multi-browser, BrowserStack
**Status**: ❌ Missing

---

### 8.2. iOS Safari Specific
**Fichier**: `e2e/specs/compatibility-ios-safari.spec.ts`

**Tests à créer**:
- [ ] Viewport height (100vh) works correctly
- [ ] Fixed positioning works (nav, footer)
- [ ] Input focus doesn't zoom page
- [ ] Date inputs work (native picker)
- [ ] Tel links work (call)
- [ ] Email links work (mail app)
- [ ] Back button navigation

**Priority**: High
**Effort**: 4 heures
**Status**: ❌ Missing

---

### 8.3. Android Chrome Specific
**Fichier**: `e2e/specs/compatibility-android-chrome.spec.ts`

**Tests à créer**:
- [ ] PWA installable (if applicable)
- [ ] Push notifications (if applicable)
- [ ] Autofill works
- [ ] Keyboard covers inputs correctly
- [ ] Back button navigation

**Priority**: Medium
**Effort**: 3 heures
**Status**: ❌ Missing

---

### 8.4. Desktop vs Mobile
**Fichier**: `e2e/specs/compatibility-desktop-mobile.spec.ts`

**Tests à créer**:
- [ ] Feature parity (desktop features work on mobile)
- [ ] Navigation consistent
- [ ] UI patterns adapted (not just scaled)
- [ ] Performance acceptable on both

**Priority**: Low
**Effort**: 2 heures
**Status**: ❌ Missing

---

## 9. TESTS DE RÉGRESSION

### 9.1. Critical Path Tests
**Fichier**: `e2e/specs/regression-critical-path.spec.ts`

**Tests à exécuter avant chaque déploiement**:
- [ ] Homepage loads
- [ ] Loan form submission
- [ ] Admin login
- [ ] VoPay balance check
- [ ] QuickBooks connection status
- [ ] Contact form submission
- [ ] IBV page loads

**Priority**: Critical
**Effort**: 3 heures
**Frequency**: Avant chaque déploiement
**Status**: ⚠️ Partial (smoke tests exist)

---

### 9.2. Smoke Tests (Extended)
**Fichier**: `e2e/specs/regression-smoke-extended.spec.ts`

**Tests rapides (<5 min total)**:
- [ ] All public pages return 200
- [ ] All admin pages require auth
- [ ] All API endpoints respond
- [ ] Database connection works
- [ ] External APIs reachable (VoPay, QB, Resend)

**Priority**: Critical
**Effort**: 2 heures
**Status**: ⚠️ Partial (smoke.spec exists)

---

### 9.3. Sanity Checks
**Fichier**: `e2e/specs/regression-sanity.spec.ts`

**Tests de base après déploiement**:
- [ ] Site is up (not 502/503)
- [ ] SSL certificate valid
- [ ] DNS resolves correctly
- [ ] CDN working
- [ ] Assets loading (CSS, JS, images)
- [ ] No console errors
- [ ] No broken links (homepage)

**Priority**: Critical
**Effort**: 2 heures
**Status**: ❌ Missing

---

## 10. TESTS DE DONNÉES

### 10.1. Database Constraints
**Fichier**: `tests/unit/database-constraints.test.ts`

**Tests unitaires à créer**:
- [ ] Unique constraints enforced (email, phone)
- [ ] Not null constraints enforced
- [ ] Check constraints work
- [ ] Enum types validated
- [ ] Default values set correctly

**Priority**: High
**Effort**: 4 heures
**Status**: ❌ Missing

---

### 10.2. Foreign Keys
**Fichier**: `tests/unit/database-foreign-keys.test.ts`

**Tests à créer**:
- [ ] Foreign key constraints enforced
- [ ] Cascade delete works
- [ ] Orphaned records prevented
- [ ] Referential integrity maintained

**Priority**: High
**Effort**: 3 heures
**Status**: ❌ Missing

---

### 10.3. Unique Indexes
**Fichier**: `tests/unit/database-indexes.test.ts`

**Tests à créer**:
- [ ] Unique indexes prevent duplicates
- [ ] Composite indexes work
- [ ] Partial indexes work (where applicable)
- [ ] Index usage in queries

**Priority**: Medium
**Effort**: 2 heures
**Status**: ❌ Missing

---

### 10.4. Data Migrations
**Fichier**: `tests/unit/database-migrations.test.ts`

**Tests à créer**:
- [ ] Migration up works
- [ ] Migration down (rollback) works
- [ ] No data loss during migration
- [ ] Migration idempotent (run twice = same result)

**Priority**: High
**Effort**: 4 heures
**Status**: ❌ Missing

---

### 10.5. Backup/Restore
**Fichier**: `e2e/specs/data-backup-restore.spec.ts`

**Tests à créer**:
- [ ] Backup script works
- [ ] Backup file created
- [ ] Restore from backup works
- [ ] Data integrity after restore
- [ ] Automated daily backups configured

**Priority**: Critical
**Effort**: 5 heures
**Status**: ❌ Missing

---

## RÉSUMÉ STATISTIQUES

### Coverage Actuel
- **Tests E2E**: 23 fichiers, ~100 tests individuels
- **Tests Unitaires**: 0
- **Tests d'Intégration**: 0
- **Tests de Sécurité**: 0
- **Tests Performance**: 1 (mobile)
- **Tests Mobile**: 2 fichiers
- **Coverage Total Estimé**: ~15%

---

### Tests Manquants par Catégorie

| Catégorie | Tests Manquants | Effort (h) | Priority |
|-----------|----------------|-----------|----------|
| Pages Publiques | ~80 tests | 35 | Critical |
| Pages Admin | ~250 tests | 120 | High |
| API Endpoints | ~320 tests | 160 | Critical |
| Intégrations | ~60 tests | 50 | Critical |
| Sécurité | ~80 tests | 60 | Critical |
| Performance | ~40 tests | 30 | Medium |
| Mobile/Responsive | ~60 tests | 25 | High |
| Compatibilité | ~40 tests | 20 | Medium |
| Régression | ~30 tests | 10 | Critical |
| Données | ~40 tests | 20 | High |
| **TOTAL** | **~1000 tests** | **~530h** | - |

---

### Recommandations de Priorité

#### Phase 1 - Sécurité Critique (2-3 semaines)
1. Tests Admin Auth (JWT, CSRF, XSS)
2. Tests API VoPay (webhooks, transactions)
3. Tests Formulaire de Prêt (validation, soumission)
4. Tests Rate Limiting
5. Tests SQL Injection

**Effort**: ~80 heures

---

#### Phase 2 - Tests d'Intégration Critiques (3-4 semaines)
1. VoPay Integration Flow
2. QuickBooks Sync Flow
3. Margill Submission Flow
4. Email Sending (Resend)
5. Webhook Handlers

**Effort**: ~100 heures

---

#### Phase 3 - API Endpoints Essentiels (4-5 semaines)
1. Tous les endpoints Admin (auth, messages, vopay)
2. Endpoints QuickBooks (auth, sync, reports)
3. Endpoints Contact (form, analyse)
4. Endpoints VoPay (stats, webhooks)

**Effort**: ~120 heures

---

#### Phase 4 - Pages & UI (3-4 semaines)
1. Pages publiques (accueil, formulaire, FAQ)
2. Pages admin principales (dashboard, messages, vopay)
3. Mobile responsive tests
4. Browser compatibility

**Effort**: ~100 heures

---

#### Phase 5 - Performance & Monitoring (2-3 semaines)
1. Page load times
2. API response times
3. Database query performance
4. Load testing

**Effort**: ~60 heures

---

#### Phase 6 - Data & Regression (1-2 semaines)
1. Database constraints
2. Data migrations
3. Backup/restore
4. Regression suite
5. Sanity checks

**Effort**: ~40 heures

---

### Actions Immédiates (URGENT)

**À faire MAINTENANT**:

1. **Supprimer endpoints dangereux**:
   - `/api/seo/exploit-secrets`
   - `/api/osint/bypass-tests`
   - `/api/osint/exploit-chains`
   - `/api/test-db`
   - `/api/test-insert`
   - `/api/test-tool`
   - `/api/test/demo`

2. **Sécuriser endpoints Sentinel**:
   - Ajouter auth admin sur tous les `/api/sentinel/*`
   - Ajouter auth admin sur tous les `/api/network/*`

3. **Consolider tests QuickBooks**:
   - 12 fichiers → 3 fichiers max
   - Supprimer redondances

4. **Implémenter Rate Limiting**:
   - `/api/admin/login` (5/15min)
   - `/api/contact` (3/hour)
   - `/api/contact-analyse` (3/hour)

5. **Configurer CSRF Protection**:
   - Tous les endpoints POST/PUT/DELETE/PATCH

---

### Outils Recommandés

**Tests E2E**:
- Playwright (déjà en place) ✅
- Cypress (alternative)

**Tests Unitaires**:
- Jest (Next.js default)
- Vitest (alternative plus rapide)

**Tests Performance**:
- Lighthouse CI
- k6 (load testing)
- Artillery (alternative)

**Tests Sécurité**:
- OWASP ZAP
- Burp Suite
- npm audit (déjà disponible)

**Tests Mobile**:
- BrowserStack (multi-device)
- Sauce Labs (alternative)
- Device Farm (AWS)

**Coverage**:
- Istanbul/nyc
- Codecov (CI integration)

---

### CI/CD Integration

**Recommandations**:

1. **Pre-commit hooks**:
   - Linter (ESLint)
   - TypeScript check
   - Unit tests

2. **PR checks**:
   - Smoke tests
   - Critical path tests
   - Security scans

3. **Pre-deployment**:
   - Full regression suite
   - Performance tests
   - Accessibility tests

4. **Post-deployment**:
   - Sanity checks
   - Smoke tests production
   - Monitoring alerts

---

### Métriques de Succès

**Objectifs Coverage**:
- Pages: 100% (toutes les pages testées)
- API Endpoints: 90% (endpoints critiques + haute priorité)
- Security: 100% (tous les vecteurs d'attaque testés)
- Integration: 80% (flux principaux)
- Performance: 70% (pages critiques)

**Objectifs Qualité**:
- 0 Critical bugs en production
- < 5 High bugs par release
- Page load time < 3s (p95)
- API response time < 2s (p95)
- Lighthouse score > 90

---

## CONCLUSION

Ce document liste **~1000 tests** à créer pour une couverture complète du site SAR.

**Effort Total Estimé**: ~530 heures (13 semaines à 40h/semaine)

**Priorité Immédiate**:
1. Sécurité (80h)
2. Intégrations critiques (100h)
3. API endpoints essentiels (120h)

**Coverage Actuel**: ~15%
**Coverage Objectif**: 85-90% (réaliste pour production)

**Next Steps**:
1. Supprimer endpoints dangereux (URGENT)
2. Implémenter rate limiting et CSRF
3. Créer tests Phase 1 (Sécurité Critique)
4. Mettre en place CI/CD avec tests automatisés
5. Progresser selon les phases 2-6

---

**Document généré le**: 2026-01-22
**Version**: 1.0
**Auteur**: Claude Sonnet 4.5
**Dernière mise à jour**: 2026-01-22
