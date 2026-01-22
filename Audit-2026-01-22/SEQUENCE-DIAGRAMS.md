# SEQUENCE DIAGRAMS

Diagrammes de séquence UML formels pour tous les processus principaux de l'application SAR.

---

## 1. Processus Complet Demande de Prêt

```mermaid
sequenceDiagram
    actor Client
    participant Browser
    participant API as API Route
    participant Cortex as Cortex Scoring
    participant Supabase
    participant Margill as Margill API
    participant Resend as Resend Email

    Note over Client,Resend: Soumission et traitement d'une demande de prêt

    Client->>Browser: Remplit formulaire de demande
    Browser->>Browser: Validation client-side (Zod)

    alt Validation échoue
        Browser-->>Client: Affiche erreurs de validation
    end

    Browser->>API: POST /api/loan-application
    Note right of API: Payload: personal info,<br/>financial data, employment

    API->>API: Validation Zod schema
    API->>Supabase: Vérifie si client existe

    alt Client n'existe pas
        API->>Supabase: INSERT INTO clients
        Supabase-->>API: client_id
    else Client existe
        API->>Supabase: UPDATE clients
        Supabase-->>API: client_id
    end

    API->>Cortex: POST /score
    Note right of Cortex: Envoie données financières<br/>et historique
    Cortex->>Cortex: Analyse risque
    Cortex->>Cortex: Calculate credit score
    Cortex-->>API: Score + recommandations

    API->>Supabase: INSERT INTO loan_applications
    Note right of Supabase: Status: 'pending'<br/>Score: cortex_score
    Supabase-->>API: application_id

    alt Score >= seuil
        API->>Margill: POST /applications
        Note right of Margill: Soumet dossier complet

        alt Margill accepte
            Margill-->>API: Success + margill_id
            API->>Supabase: UPDATE status='submitted_to_margill'
        else Margill rejette
            Margill-->>API: Error
            API->>Supabase: UPDATE status='margill_error'
        end
    else Score < seuil
        API->>Supabase: UPDATE status='rejected_score'
    end

    API->>Resend: POST /emails/send
    Note right of Resend: Template: confirmation<br/>Inclut status et next steps
    Resend->>Resend: Envoie email
    Resend-->>API: email_id

    API->>Supabase: INSERT INTO notifications

    API-->>Browser: Response avec application_id et status
    Browser-->>Client: Affiche confirmation

    Note over Client,Resend: Client reçoit email de confirmation
```

---

## 2. Processus de Paiement VoPay

```mermaid
sequenceDiagram
    actor VoPay
    participant Webhook as Webhook API
    participant Verify as Signature Verifier
    participant RPC as Supabase RPC
    participant DB as Supabase Tables
    participant Matching as Payment Matcher
    participant Notif as Notification Service

    Note over VoPay,Notif: Traitement d'un webhook de paiement VoPay

    VoPay->>Webhook: POST /api/webhooks/vopay
    Note right of Webhook: Headers: X-VoPay-Signature<br/>Body: payment event

    Webhook->>Verify: Vérifie signature HMAC
    Verify->>Verify: Calculate HMAC-SHA256
    Verify->>Verify: Compare signatures

    alt Signature invalide
        Verify-->>Webhook: Unauthorized
        Webhook-->>VoPay: 401 Unauthorized
        Note over Webhook: Log security alert
    end

    Webhook->>Webhook: Parse payload
    Webhook->>RPC: CALL process_vopay_payment()
    Note right of RPC: Params: transaction_id,<br/>amount, status, metadata

    RPC->>RPC: Begin transaction

    RPC->>DB: SELECT FROM vopay_transactions
    Note right of DB: Check if already processed

    alt Transaction déjà traitée
        RPC-->>Webhook: Idempotent - Already processed
        Webhook-->>VoPay: 200 OK
    end

    RPC->>DB: INSERT INTO vopay_transactions

    RPC->>Matching: Match payment to loan
    Matching->>DB: SELECT loans WHERE client_id
    Matching->>Matching: Match by amount and due date

    alt Matching trouvé
        Matching-->>RPC: loan_id, installment_id

        RPC->>DB: UPDATE installments
        Note right of DB: SET status='paid'<br/>SET paid_at=NOW()<br/>SET amount_paid=amount

        RPC->>DB: UPDATE loans
        Note right of DB: UPDATE balance_remaining<br/>UPDATE last_payment_date

        RPC->>DB: SELECT remaining installments

        alt Toutes installments payées
            RPC->>DB: UPDATE loans SET status='paid_off'
            Note right of RPC: Prêt complètement remboursé
        end

        RPC->>Notif: Send payment confirmation
        Notif->>DB: INSERT INTO notifications
        Notif->>Notif: Envoie email/SMS

    else Matching échoué
        RPC->>DB: INSERT INTO unmatched_payments
        Note right of DB: Status: 'pending_review'
        RPC->>Notif: Alert admin
    end

    RPC->>RPC: Commit transaction
    RPC-->>Webhook: Success result

    Webhook-->>VoPay: 200 OK
    Note over VoPay: VoPay marque webhook<br/>comme traité
```

---

## 3. Processus d'Authentification Admin

```mermaid
sequenceDiagram
    actor Admin
    participant Login as Login Page
    participant API as /api/auth/login
    participant Supabase
    participant JWT as JWT Service
    participant Cookie as Cookie Handler
    participant Middleware
    participant Dashboard

    Note over Admin,Dashboard: Authentification et accès au dashboard admin

    Admin->>Login: Accède /admin/login
    Login-->>Admin: Affiche formulaire

    Admin->>Login: Soumet credentials
    Note right of Login: Email + password

    Login->>Login: Validation client-side

    Login->>API: POST /api/auth/login
    Note right of API: Body: { email, password }

    API->>API: Validation Zod

    API->>Supabase: auth.signInWithPassword()

    alt Credentials invalides
        Supabase-->>API: AuthError
        API-->>Login: 401 Invalid credentials
        Login-->>Admin: Affiche erreur
    end

    Supabase->>Supabase: Vérifie credentials
    Supabase-->>API: Session + User

    API->>Supabase: SELECT FROM admin_users
    Note right of API: Vérifie rôle admin

    alt Pas un admin
        API-->>Login: 403 Forbidden
        Login-->>Admin: Accès refusé
    end

    API->>JWT: Generate token
    Note right of JWT: Payload: user_id, email,<br/>role, permissions
    JWT->>JWT: Sign with SECRET_KEY
    JWT->>JWT: Set expiration (7d)
    JWT-->>API: JWT token

    API->>Cookie: Set HTTP-only cookie
    Note right of Cookie: Options:<br/>- httpOnly: true<br/>- secure: true<br/>- sameSite: 'lax'<br/>- maxAge: 7d

    API-->>Login: 200 OK + user data
    Login->>Browser: Redirect to /admin/dashboard

    Browser->>Dashboard: GET /admin/dashboard
    Note right of Dashboard: Cookie automatiquement<br/>envoyé par browser

    Dashboard->>Middleware: Vérifie authentification
    Middleware->>Cookie: Extract JWT from cookie

    alt Pas de cookie
        Middleware-->>Dashboard: Redirect /admin/login
    end

    Middleware->>JWT: Verify token
    JWT->>JWT: Vérifie signature
    JWT->>JWT: Vérifie expiration

    alt Token invalide/expiré
        JWT-->>Middleware: Invalid token
        Middleware-->>Dashboard: Redirect /admin/login
    end

    JWT-->>Middleware: Decoded payload

    Middleware->>Supabase: SELECT FROM admin_users
    Note right of Middleware: Vérifie que user existe<br/>et est toujours admin

    alt User désactivé
        Supabase-->>Middleware: User not found/disabled
        Middleware-->>Dashboard: Redirect /admin/login
    end

    Middleware-->>Dashboard: Auth successful
    Dashboard->>Supabase: Fetch dashboard data
    Supabase-->>Dashboard: Applications, loans, stats
    Dashboard-->>Admin: Affiche dashboard
```

---

## 4. Webhook Margill

```mermaid
sequenceDiagram
    actor Margill as Margill System
    participant Webhook as /api/webhooks/margill
    participant Verify as Signature Verifier
    participant Parser as Payload Parser
    participant DB as Supabase
    participant Status as Status Manager
    participant Notif as Notification Service
    participant Client

    Note over Margill,Client: Mise à jour statut depuis Margill

    Margill->>Webhook: POST /api/webhooks/margill
    Note right of Webhook: Headers: X-Margill-Signature<br/>Body: status update event

    Webhook->>Verify: Vérifie signature
    Verify->>Verify: Calculate HMAC

    alt Signature invalide
        Verify-->>Webhook: Invalid signature
        Webhook-->>Margill: 401 Unauthorized
        Note over Webhook: Log security alert
    end

    Webhook->>Parser: Parse payload
    Parser->>Parser: Extract event type
    Parser->>Parser: Extract margill_id
    Parser->>Parser: Extract new status
    Parser->>Parser: Extract metadata

    Parser-->>Webhook: Parsed data

    Webhook->>DB: SELECT FROM loan_applications
    Note right of DB: WHERE margill_id = ?

    alt Application non trouvée
        DB-->>Webhook: Not found
        Webhook-->>Margill: 404 Not found
    end

    DB-->>Webhook: application record

    Webhook->>Status: Process status change

    alt Status = 'approved'
        Status->>DB: BEGIN TRANSACTION

        Status->>DB: UPDATE loan_applications
        Note right of DB: SET status='approved'<br/>SET approved_at=NOW()<br/>SET approved_by='margill'

        Status->>DB: INSERT INTO loans
        Note right of DB: Crée enregistrement loan<br/>avec termes du prêt

        Status->>DB: INSERT INTO installments
        Note right of DB: Génère schedule de paiements

        loop Pour chaque installment
            Status->>DB: INSERT installment record
        end

        Status->>DB: COMMIT TRANSACTION

        Status->>Notif: Trigger approval notification

    else Status = 'rejected'
        Status->>DB: UPDATE loan_applications
        Note right of DB: SET status='rejected'<br/>SET rejected_at=NOW()<br/>SET rejection_reason

        Status->>Notif: Trigger rejection notification

    else Status = 'under_review'
        Status->>DB: UPDATE loan_applications
        Note right of DB: SET status='under_review'<br/>SET review_notes

        Status->>Notif: Trigger review notification

    else Status = 'requires_documents'
        Status->>DB: UPDATE loan_applications
        Note right of DB: SET status='documents_required'<br/>SET required_documents[]

        Status->>Notif: Trigger documents request
    end

    Notif->>DB: SELECT client info
    Notif->>Notif: Select template
    Notif->>Notif: Render email/SMS
    Notif->>Client: Envoie notification

    Notif->>DB: INSERT INTO notifications
    Note right of DB: Log notification sent

    Status-->>Webhook: Processing complete
    Webhook-->>Margill: 200 OK
```

---

## 5. IBV (Instant Bank Verification)

```mermaid
sequenceDiagram
    actor Client
    participant Form as IBV Form
    participant API as /api/ibv/initiate
    participant Provider as Flinks/Inverite
    participant OAuth as Bank OAuth
    participant Extractor as Transaction Extractor
    participant Analyzer as Analysis Engine
    participant DB as Supabase
    participant Dashboard

    Note over Client,Dashboard: Vérification bancaire instantanée

    Client->>Form: Clique "Connect Bank"
    Form->>API: POST /api/ibv/initiate
    Note right of API: Body: { client_id,<br/>application_id, provider }

    API->>DB: INSERT INTO ibv_sessions
    Note right of DB: Status: 'initiated'
    DB-->>API: session_id

    API->>Provider: Create connection request
    Note right of Provider: Request access token
    Provider-->>API: login_url + request_id

    API->>DB: UPDATE ibv_sessions
    Note right of DB: SET request_id<br/>SET login_url

    API-->>Form: { login_url, session_id }

    Form->>Client: Ouvre modal/popup
    Form->>OAuth: Redirect to login_url

    Client->>OAuth: Sélectionne banque
    OAuth-->>Client: Redirect to bank login

    Client->>OAuth: Entre credentials bancaires
    Note over Client,OAuth: Client authentifie<br/>directement avec sa banque

    OAuth->>OAuth: Authentification
    OAuth->>OAuth: Consent screen
    Client->>OAuth: Autorise accès

    OAuth->>Provider: Authorization granted
    Provider->>Provider: Generate access token

    OAuth-->>Form: Redirect to callback_url
    Note right of Form: Avec authorization_code

    Form->>API: POST /api/ibv/callback
    Note right of API: Body: { session_id,<br/>authorization_code }

    API->>Provider: Exchange code for token
    Provider-->>API: access_token

    API->>DB: UPDATE ibv_sessions
    Note right of DB: SET status='connected'<br/>SET access_token (encrypted)

    API->>Extractor: Extract transactions
    Note right of Extractor: Fetch 3-6 months history

    Extractor->>Provider: GET /accounts
    Provider-->>Extractor: Accounts list

    loop Pour chaque compte
        Extractor->>Provider: GET /transactions
        Provider-->>Extractor: Transactions
    end

    Extractor->>DB: INSERT INTO bank_accounts
    Extractor->>DB: BULK INSERT transactions

    Extractor-->>API: Extraction complete

    API->>Analyzer: Analyze financial data

    Analyzer->>Analyzer: Calculate income
    Note right of Analyzer: Identify recurring deposits

    Analyzer->>Analyzer: Calculate expenses
    Note right of Analyzer: Categorize spending

    Analyzer->>Analyzer: Detect patterns
    Note right of Analyzer: - NSF occurrences<br/>- Overdrafts<br/>- Bill payments<br/>- Savings behavior

    Analyzer->>Analyzer: Calculate DTI ratio
    Note right of Analyzer: Debt-to-Income ratio

    Analyzer->>Analyzer: Assess stability
    Note right of Analyzer: - Income consistency<br/>- Balance trends<br/>- Unusual activity

    Analyzer->>Analyzer: Generate risk score
    Note right of Analyzer: Based on all metrics

    Analyzer-->>API: Analysis results

    API->>DB: UPDATE ibv_sessions
    Note right of DB: SET status='completed'<br/>SET analysis_results<br/>SET risk_score

    API->>DB: UPDATE loan_applications
    Note right of DB: SET ibv_score<br/>SET ibv_completed=true<br/>ADD analysis data

    alt Score élevé
        API->>DB: UPDATE status='ibv_approved'
    else Score faible
        API->>DB: UPDATE status='ibv_review_needed'
    end

    API-->>Form: Analysis complete
    Form-->>Client: Affiche résultats

    Note over Dashboard: Dashboard admin<br/>voit score et détails
```

---

## 6. Notifications Automatiques

```mermaid
sequenceDiagram
    participant Event as Event System
    participant Trigger as Event Trigger
    participant Queue as Notification Queue
    participant Template as Template Engine
    participant Selector as Channel Selector
    participant Resend
    participant Twilio
    participant DB as Supabase
    actor Client

    Note over Event,Client: Système de notifications automatiques

    Event->>Trigger: Application event occurs
    Note right of Trigger: Ex: loan_approved,<br/>payment_due, status_change

    Trigger->>Queue: Enqueue notification
    Note right of Queue: Payload: event_type,<br/>client_id, context_data

    Queue->>Template: Process notification

    Template->>DB: SELECT client preferences
    Note right of DB: Récupère préférences<br/>de notification

    DB-->>Template: Preferences
    Note right of Template: channels: ['email', 'sms']<br/>language: 'fr'

    Template->>Template: Select template
    Note right of Template: Based on event_type<br/>and language

    alt Template non trouvé
        Template->>DB: Log error
        Template-->>Queue: Template missing error
    end

    Template->>DB: SELECT template content
    DB-->>Template: Template markup

    Template->>Template: Render template
    Note right of Template: Inject context variables:<br/>- client_name<br/>- amount<br/>- due_date<br/>- etc.

    Template-->>Selector: Rendered content

    Selector->>DB: Check notification history
    Note right of Selector: Évite doublons récents

    alt Notification récente existe
        Selector->>DB: Log skipped notification
        Selector-->>Queue: Skipped (duplicate)
    end

    par Envoi Email
        alt Email enabled
            Selector->>Resend: POST /emails
            Note right of Resend: To: client_email<br/>Subject: rendered_subject<br/>HTML: rendered_html

            alt Envoi réussi
                Resend-->>Selector: email_id
                Selector->>DB: INSERT INTO notifications
                Note right of DB: channel='email'<br/>status='sent'<br/>provider_id=email_id
            else Envoi échoué
                Resend-->>Selector: Error
                Selector->>DB: INSERT INTO notifications
                Note right of DB: status='failed'<br/>error_message
            end
        end
    and Envoi SMS
        alt SMS enabled
            Selector->>Twilio: POST /Messages
            Note right of Twilio: To: client_phone<br/>Body: rendered_sms

            alt Envoi réussi
                Twilio-->>Selector: message_sid
                Selector->>DB: INSERT INTO notifications
                Note right of DB: channel='sms'<br/>status='sent'<br/>provider_id=message_sid
            else Envoi échoué
                Twilio-->>Selector: Error
                Selector->>DB: INSERT INTO notifications
                Note right of DB: status='failed'<br/>error_message
            end
        end
    end

    Selector->>DB: UPDATE notification_stats
    Note right of DB: Incrémente compteurs

    Selector-->>Queue: Notification processed

    opt Delivery confirmation
        Resend->>Event: Webhook: email.delivered
        Event->>DB: UPDATE notifications
        Note right of DB: SET delivered_at=NOW()

        Twilio->>Event: Webhook: message.delivered
        Event->>DB: UPDATE notifications
        Note right of DB: SET delivered_at=NOW()
    end

    Client->>Client: Reçoit email/SMS
```

---

## 7. QuickBooks Sync

```mermaid
sequenceDiagram
    actor Admin
    participant UI as Admin UI
    participant API as /api/quickbooks/sync
    participant OAuth as QB OAuth Handler
    participant QB as QuickBooks API
    participant Transform as Data Transformer
    participant DB as Supabase
    participant Log as Sync Logger

    Note over Admin,Log: Synchronisation QuickBooks

    Admin->>UI: Clique "Sync QuickBooks"

    UI->>API: POST /api/quickbooks/sync
    Note right of API: Body: { entity_types:<br/>['customers', 'invoices'] }

    API->>DB: SELECT quickbooks_tokens
    Note right of DB: Récupère access_token<br/>et refresh_token

    alt Pas de tokens
        DB-->>API: No tokens found
        API->>OAuth: Initiate OAuth flow
        OAuth-->>Admin: Redirect to QB login
        Admin->>QB: Authorize app
        QB-->>OAuth: Authorization code
        OAuth->>QB: Exchange for tokens
        QB-->>OAuth: access_token + refresh_token
        OAuth->>DB: INSERT INTO quickbooks_tokens
    end

    DB-->>API: tokens

    API->>OAuth: Verify token validity
    OAuth->>OAuth: Check expiration

    alt Token expiré
        OAuth->>QB: POST /oauth2/v1/tokens/refresh
        Note right of QB: Body: { refresh_token }
        QB-->>OAuth: new access_token
        OAuth->>DB: UPDATE quickbooks_tokens
    end

    API->>Log: Start sync session
    Log->>DB: INSERT INTO sync_sessions
    Note right of DB: status='in_progress'<br/>started_at=NOW()

    alt Sync Customers
        API->>QB: GET /v3/company/{id}/customer
        Note right of QB: Query all customers<br/>depuis last_sync_at

        loop Paginate results
            QB-->>API: Customer batch

            API->>Transform: Transform QB customers
            Transform->>Transform: Map QB fields to schema
            Note right of Transform: QB.DisplayName -> clients.name<br/>QB.PrimaryEmailAddr -> email<br/>etc.

            Transform-->>API: Transformed customers

            loop Pour chaque customer
                API->>DB: UPSERT INTO clients
                Note right of DB: ON CONFLICT (quickbooks_id)<br/>DO UPDATE

                alt Erreur lors de l'insert
                    DB-->>API: Error
                    API->>Log: Log sync error
                end
            end
        end

        API->>Log: Log customers synced
    end

    alt Sync Invoices
        API->>QB: GET /v3/company/{id}/invoice
        Note right of QB: Query all invoices<br/>depuis last_sync_at

        loop Paginate results
            QB-->>API: Invoice batch

            API->>Transform: Transform QB invoices
            Transform->>Transform: Map invoice fields
            Note right of Transform: QB.TotalAmt -> amount<br/>QB.DueDate -> due_date<br/>QB.Balance -> balance

            Transform->>DB: SELECT client_id
            Note right of Transform: Match par quickbooks_id

            Transform-->>API: Transformed invoices

            loop Pour chaque invoice
                API->>DB: UPSERT INTO invoices
                Note right of DB: Link to client_id

                API->>DB: UPSERT INTO invoice_items
                Note right of DB: Line items de la facture
            end
        end

        API->>Log: Log invoices synced
    end

    alt Sync Payments
        API->>QB: GET /v3/company/{id}/payment
        Note right of QB: Query all payments

        loop Process payments
            QB-->>API: Payment batch
            API->>Transform: Transform payments
            Transform-->>API: Transformed data

            API->>DB: UPSERT INTO payments
            API->>DB: UPDATE invoices balance
        end

        API->>Log: Log payments synced
    end

    API->>Log: Complete sync session
    Log->>DB: UPDATE sync_sessions
    Note right of DB: SET status='completed'<br/>SET completed_at=NOW()<br/>SET stats (counts)

    API->>DB: UPDATE quickbooks_config
    Note right of DB: SET last_sync_at=NOW()

    API-->>UI: Sync results
    Note right of UI: Stats: entities synced,<br/>errors, duration

    UI-->>Admin: Affiche résultats

    opt Sync échoue
        alt QB API error
            QB-->>API: API Error
            API->>Log: Log error
            Log->>DB: UPDATE sync_sessions
            Note right of DB: SET status='failed'<br/>SET error_message
            API-->>UI: Error response
            UI-->>Admin: Affiche erreur
        end
    end
```

---

## 8. Fraud Detection Flow

```mermaid
sequenceDiagram
    participant App as Loan Application
    participant Detector as Fraud Detector
    participant Rules as Rules Engine
    participant Pattern as Pattern Matcher
    participant Scoring as Fraud Scoring
    participant ML as ML Model
    participant DB as Supabase
    participant Alert as Alert System
    participant Admin

    Note over App,Admin: Détection de fraude lors d'une application

    App->>Detector: Nouvelle application reçue
    Note right of Detector: Trigger: new application<br/>ou status change

    Detector->>DB: Fetch application data
    DB-->>Detector: Complete application

    Detector->>DB: Fetch client history
    Note right of DB: Applications précédentes,<br/>paiements, interactions
    DB-->>Detector: Client history

    Detector->>Rules: Evaluate rules

    par Rule Checks
        Rules->>Rules: Check duplicate detection
        Note right of Rules: - Même IP récente<br/>- Même device fingerprint<br/>- Email/phone similaire

        Rules->>DB: Query similar applications
        DB-->>Rules: Matching records

        alt Doublons trouvés
            Rules->>Rules: Flag: DUPLICATE_APPLICATION
        end
    and
        Rules->>Rules: Check velocity rules
        Note right of Rules: - Nb applications/jour<br/>- Nb applications/IP

        Rules->>DB: COUNT applications
        DB-->>Rules: Count

        alt Velocity dépassée
            Rules->>Rules: Flag: HIGH_VELOCITY
        end
    and
        Rules->>Rules: Check identity validation
        Note right of Rules: - SIN format<br/>- Address validation<br/>- Phone validation

        alt Données invalides
            Rules->>Rules: Flag: INVALID_IDENTITY
        end
    and
        Rules->>Rules: Check blacklist
        Note right of Rules: - Email blacklist<br/>- IP blacklist<br/>- Device blacklist

        Rules->>DB: SELECT FROM blacklist
        DB-->>Rules: Blacklist status

        alt Dans blacklist
            Rules->>Rules: Flag: BLACKLISTED
        end
    end

    Rules-->>Detector: Rule results + flags

    Detector->>Pattern: Analyze patterns

    Pattern->>Pattern: Income pattern analysis
    Note right of Pattern: - Income trop rond<br/>- Income incohérent<br/>avec profession

    Pattern->>Pattern: Document pattern analysis
    Note right of Pattern: - Documents modifiés<br/>- Metadata suspects

    Pattern->>Pattern: Behavior pattern analysis
    Note right of Pattern: - Form completion time<br/>- Copy/paste patterns<br/>- Bot-like behavior

    Pattern->>DB: Compare avec known fraud patterns
    DB-->>Pattern: Pattern matches

    alt Patterns suspects trouvés
        Pattern->>Pattern: Flag patterns
    end

    Pattern-->>Detector: Pattern analysis results

    Detector->>Scoring: Calculate fraud score

    Scoring->>Scoring: Calcul score basé sur règles
    Note right of Scoring: Poids par type de flag:<br/>- Blacklist: 50pts<br/>- Duplicate: 30pts<br/>- Pattern: 20pts<br/>etc.

    Scoring->>ML: Request ML prediction
    Note right of ML: Features: application data,<br/>rules results, patterns

    ML->>ML: Load trained model
    ML->>ML: Predict fraud probability
    ML-->>Scoring: Fraud probability (0-1)

    Scoring->>Scoring: Combine rule + ML scores
    Note right of Scoring: Weighted average:<br/>60% rules, 40% ML

    Scoring->>Scoring: Calculate final score (0-100)

    Scoring-->>Detector: Final fraud score

    Detector->>DB: INSERT INTO fraud_checks
    Note right of DB: Enregistre:<br/>- score<br/>- flags<br/>- patterns<br/>- timestamp

    alt Score >= HIGH_RISK (80+)
        Detector->>DB: UPDATE application
        Note right of DB: SET fraud_status='high_risk'<br/>SET auto_reject=true

        Detector->>DB: INSERT INTO fraud_cases
        Note right of DB: Crée case pour investigation

        Detector->>Alert: Send high risk alert
        Alert->>Alert: Format alert message
        Alert->>Admin: Email + Slack notification
        Note right of Admin: URGENT: High risk<br/>application detected

        Alert->>DB: INSERT INTO alerts

    else Score >= MEDIUM_RISK (50-79)
        Detector->>DB: UPDATE application
        Note right of DB: SET fraud_status='medium_risk'<br/>SET requires_review=true

        Detector->>Alert: Send review alert
        Alert->>Admin: Email notification
        Note right of Admin: Review required

    else Score < MEDIUM_RISK (< 50)
        Detector->>DB: UPDATE application
        Note right of DB: SET fraud_status='low_risk'<br/>SET fraud_check_passed=true

        Note over Detector: Application continue<br/>le flow normal
    end

    Detector->>DB: Log fraud check
    Note right of DB: INSERT INTO audit_log

    Detector-->>App: Fraud check complete

    opt Admin reviews case
        Admin->>DB: SELECT FROM fraud_cases
        Admin->>Admin: Investigate
        Admin->>DB: UPDATE fraud_cases
        Note right of DB: Decision: approve/reject<br/>Notes: investigation findings

        alt Faux positif
            Admin->>DB: UPDATE application
            Note right of DB: SET fraud_status='false_positive'<br/>SET approved_override=true
        else Fraude confirmée
            Admin->>DB: UPDATE application
            Note right of DB: SET fraud_status='confirmed_fraud'<br/>SET rejected=true

            Admin->>DB: INSERT INTO blacklist
            Note right of DB: Ajoute email, phone, IP
        end
    end
```

---

## Notes Techniques

### Gestion des Erreurs

Tous les diagrammes incluent des paths alternatifs (`alt`) pour gérer:
- Validation failures
- Authentication errors
- API timeouts
- Database errors
- External service failures

### Transactions

Les opérations critiques utilisent des transactions DB:
- Création de loan + installments
- Processing de paiements
- Updates de statuts avec side effects

### Sécurité

Points de sécurité illustrés:
- Signature verification pour tous les webhooks
- JWT validation dans authentication flow
- Token encryption pour données sensibles
- Rate limiting implicite dans fraud detection

### Idempotence

Webhooks VoPay et Margill implémentent l'idempotence:
- Check si transaction déjà traitée
- Return 200 si duplicate
- Évite double-processing

### Asynchrone

Certains processus sont asynchrones:
- Notifications (queue-based)
- Fraud detection (peut être background)
- QuickBooks sync (long-running)

### Logging et Audit

Tous les flows critiques incluent:
- Logging dans audit_log
- Tracking de statuts
- Error recording

---

## Légende

### Acteurs
- `actor`: Utilisateur humain (Client, Admin)
- `participant`: Système ou composant

### Flèches
- `->`: Appel synchrone
- `-->>`: Réponse
- `->>`: Message

### Blocs
- `alt/else/end`: Conditions
- `opt/end`: Optionnel
- `loop/end`: Boucle
- `par/and/end`: Parallèle
- `Note`: Commentaires explicatifs

---

**Document créé le**: 2026-01-22
**Version**: 1.0
**Projet**: SAR - Système d'Applications de Remboursement
