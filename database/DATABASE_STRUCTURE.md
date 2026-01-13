# Structure de la Base de Données SAR

Documentation des tables principales découvertes dans le code.

---

## 📊 Tables Principales

### 1. `vopay_webhook_logs` (998 lignes)

**Stocke les webhooks reçus de VoPay**

Colonnes:
```
id                  UUID PRIMARY KEY
transaction_id      TEXT
transaction_type    TEXT
transaction_amount  DECIMAL
status              TEXT
failure_reason      TEXT NULL
environment         TEXT
validation_key      TEXT
is_validated        BOOLEAN
raw_payload         JSONB
updated_at          TIMESTAMP
processed_at        TIMESTAMP
created_at          TIMESTAMP DEFAULT NOW()
```

**Valeurs de `status`**:
- `'successful'` - Transaction réussie
- `'failed'` - Transaction échouée
- `'cancelled'` - Transaction annulée
- `'pending'` - En attente
- `'in progress'` - En cours de traitement

**Source**: `src/app/api/webhooks/vopay/route.ts` ligne 110-124

---

### 2. `client_analyses` (27 lignes)

**Stocke les analyses financières clients (IBV/Flinks)**

Colonnes principales (à compléter):
```
id                  UUID PRIMARY KEY
client_email        TEXT
client_name         TEXT
status              TEXT
created_at          TIMESTAMP
```

**Relations**:
- → `client_accounts` (one-to-many)
- → `client_transactions` (one-to-many)
- → `client_analysis_notes` (one-to-many)
- → `client_analysis_status_history` (one-to-many)
- → `client_analysis_tags` (one-to-many)
- → `client_phones` (one-to-many)

---

### 3. `client_transactions` (180,560 lignes)

**Stocke toutes les transactions bancaires importées**

Colonnes principales (à compléter):
```
id                  UUID PRIMARY KEY
analysis_id         UUID REFERENCES client_analyses(id)
account_id          UUID REFERENCES client_accounts(id)
transaction_date    DATE
amount              DECIMAL
description         TEXT
category            TEXT
created_at          TIMESTAMP
```

**Usage**: Calcul des métriques NSF, revenus, dépenses, etc.

---

### 4. `client_accounts` (107 lignes)

**Comptes bancaires des clients**

Colonnes principales (à compléter):
```
id                  UUID PRIMARY KEY
analysis_id         UUID REFERENCES client_analyses(id)
account_number      TEXT
institution         TEXT
account_type        TEXT
balance             DECIMAL
created_at          TIMESTAMP
```

**Relations**:
- → `client_transactions` (one-to-many)

---

### 5. `fraud_cases` (0 lignes)

**Cas de fraude détectés et investigués**

Colonnes (créées via metric_engine_schema.sql):
```
id                  UUID PRIMARY KEY
case_number         TEXT UNIQUE
client_name         TEXT
client_email        TEXT
client_phone        TEXT
analysis_id         UUID
fraud_type          TEXT
severity            TEXT ('low', 'medium', 'high', 'critical')
status              TEXT ('open', 'investigating', 'confirmed', 'closed', 'false_positive')
amount_involved     DECIMAL
amount_recovered    DECIMAL DEFAULT 0
detected_at         TIMESTAMP DEFAULT NOW()
reported_at         TIMESTAMP
closed_at           TIMESTAMP
assigned_to         TEXT
notes               TEXT
evidence_urls       TEXT[]
reported_to_authorities BOOLEAN DEFAULT false
insurance_claim_filed BOOLEAN DEFAULT false
created_at          TIMESTAMP DEFAULT NOW()
updated_at          TIMESTAMP DEFAULT NOW()
```

---

### 6. `contact_messages` (278 lignes)

**Messages de contact du site web**

Colonnes principales (à compléter):
```
id                  UUID PRIMARY KEY
name                TEXT
email               TEXT
phone               TEXT
message             TEXT
status              TEXT
created_at          TIMESTAMP
```

**Relations**:
- → `emails_envoyes` (one-to-many)
- → `notes_internes` (one-to-many)

---

### 7. `support_tickets` (? lignes)

**Tickets de support clients**

Colonnes principales (à compléter):
```
id                  UUID PRIMARY KEY
ticket_number       TEXT UNIQUE
client_name         TEXT
client_email        TEXT
subject             TEXT
status              TEXT
priority            TEXT
created_at          TIMESTAMP
```

**Relations**:
- → `support_messages` (one-to-many)

---

### 8. `admin_sections` (8 lignes)

**Sections du dashboard admin (Metric Engine)**

Colonnes:
```
id                  UUID PRIMARY KEY
section_key         TEXT UNIQUE
label               TEXT
description         TEXT
icon_name           TEXT
route_path          TEXT
sort_order          INTEGER DEFAULT 0
is_active           BOOLEAN DEFAULT true
created_at          TIMESTAMP DEFAULT NOW()
updated_at          TIMESTAMP DEFAULT NOW()
```

**Sections créées**:
- `'global'` - Dashboard Global
- `'analyses'` - Analyses Client
- `'fraud'` - Fraude & Risque
- `'financial'` - Métriques Financières
- `'vopay'` - VoPay
- `'support'` - Support
- `'performance'` - Performance
- `'compliance'` - Conformité

---

### 9. `metric_registry` (20 lignes)

**Registre des métriques calculables (Metric Engine)**

Colonnes:
```
id                  UUID PRIMARY KEY
metric_key          TEXT UNIQUE
label               TEXT
description         TEXT
section_key         TEXT REFERENCES admin_sections(section_key)
value_type          TEXT ('numeric', 'text', 'boolean', 'json')
unit                TEXT
format              TEXT
entity_types        TEXT[]
supports_periods    BOOLEAN
available_periods   TEXT[]
calculation_function TEXT
depends_on          TEXT[]
color_scheme        TEXT
icon_name           TEXT
display_order       INTEGER
is_visible          BOOLEAN
tags                TEXT[]
created_at          TIMESTAMP DEFAULT NOW()
updated_at          TIMESTAMP DEFAULT NOW()
```

---

### 10. `metric_values` (7 lignes actuellement)

**Valeurs calculées des métriques (Metric Engine)**

Colonnes:
```
id                  UUID PRIMARY KEY
metric_key          TEXT REFERENCES metric_registry(metric_key)
entity_type         TEXT ('global', 'analysis', 'fraud_case')
entity_id           UUID
period_label        TEXT ('30d', '60d', '90d')
value_numeric       DECIMAL
value_text          TEXT
value_boolean       BOOLEAN
value_json          JSONB
computed_at         TIMESTAMP DEFAULT NOW()
is_current          BOOLEAN DEFAULT true
created_at          TIMESTAMP DEFAULT NOW()
updated_at          TIMESTAMP DEFAULT NOW()
```

**Métriques calculées**:
- `total_clients`: 6 clients
- `total_revenue_mtd`: $0
- `active_loans`: 0
- `fraud_cases_open`: 0
- `vopay_success_rate`: À recalculer avec le bon script
- `vopay_pending`: 2
- `vopay_failed`: 67

---

## 🔗 Relations Clés

```
client_analyses
  ├─→ client_accounts (analysis_id)
  │    └─→ client_transactions (account_id)
  ├─→ client_transactions (analysis_id)
  ├─→ client_analysis_notes
  ├─→ client_analysis_status_history
  ├─→ client_analysis_tags
  └─→ client_phones

contact_messages
  ├─→ emails_envoyes
  └─→ notes_internes

support_tickets
  └─→ support_messages

applications
  ├─→ application_events
  ├─→ client_notes
  └─→ magic_links

admin_sections
  └─→ metric_registry
       └─→ metric_values
```

---

## 📝 Notes

- Cette documentation est basée sur l'analyse du code existant
- Les structures complètes des tables `client_*` nécessitent encore une inspection SQL
- Pour obtenir la structure complète, exécuter `SHOW_CRITICAL_TABLES.sql`

**Dernière mise à jour**: 2026-01-13
