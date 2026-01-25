# 🚔 REQUÊTES SQL POUR RAPPORTS POLICE

**Usage:** Copier-coller ces requêtes dans Supabase SQL Editor et remplacer les paramètres.

**Important:** Ces requêtes retournent UNIQUEMENT des données anonymisées (hashes, UUIDs, metadata). Jamais de raw IPs.

---

## 📋 QUERY 1: Rapport Client Complet (Fraud Investigation)

**Cas d'usage:** Police demande le dossier complet d'une victime de fraude d'identité.

**Input:** Email de la victime

```sql
-- ============================================================================
-- RAPPORT COMPLET: Timeline + Fraud Score + Security Events
-- ============================================================================
-- PARAMÈTRE: Remplacer 'victim@example.com' par l'email de la victime

WITH client_info AS (
  SELECT id, primary_email, first_name, last_name, created_at
  FROM clients
  WHERE primary_email = 'victim@example.com' -- ⚠️ REMPLACER ICI
),
client_sessions_data AS (
  SELECT
    cs.session_id,
    cs.client_id,
    cs.linked_via,
    cs.linked_at,
    cs.created_at as session_created_at,
    cs.last_activity_at,
    cs.device_type,
    cs.browser,
    cs.os,
    cs.ip_hash,
    cs.ua_hash,
    cs.asn,
    cs.country_code,
    cs.ip_prefix,
    cs.first_referrer,
    cs.first_utm_source,
    cs.first_utm_medium,
    cs.first_utm_campaign
  FROM client_sessions cs
  INNER JOIN client_info ci ON cs.client_id = ci.id
),
telemetry_events AS (
  SELECT
    cte.id as event_id,
    cte.session_id,
    cte.event_type,
    cte.event_name,
    cte.page_url,
    cte.referrer_url,
    cte.duration_ms,
    cte.payload,
    cte.created_at
  FROM client_telemetry_events cte
  WHERE cte.session_id IN (SELECT session_id FROM client_sessions_data)
),
security_events_data AS (
  SELECT
    se.id as security_event_id,
    se.session_id,
    se.ts,
    se.event_type,
    se.ip_hash,
    se.ip_prefix,
    se.ua_hash,
    se.asn,
    se.country_code,
    se.tls_fingerprint,
    se.meta
  FROM security_events se
  WHERE se.session_id IN (SELECT session_id FROM client_sessions_data)
),
fraud_patterns AS (
  SELECT
    cph.pattern_key,
    cph.score,
    cph.risk_level,
    cph.evidence,
    cph.ts
  FROM client_pattern_hits cph
  INNER JOIN client_info ci ON cph.client_id = ci.id
)

-- ============================================================================
-- SECTION 1: CLIENT INFO
-- ============================================================================
SELECT
  '=== CLIENT INFO ===' as section,
  ci.id as client_id,
  ci.primary_email,
  ci.first_name,
  ci.last_name,
  ci.created_at as client_created_at,
  (
    SELECT COUNT(*)
    FROM loan_applications la
    WHERE la.client_id = ci.id
  ) as total_loan_applications
FROM client_info ci

UNION ALL

-- ============================================================================
-- SECTION 2: FRAUD SCORE
-- ============================================================================
SELECT
  '=== FRAUD SCORE ===' as section,
  pattern_key::text,
  score::text,
  risk_level::text,
  evidence::text,
  ts::text
FROM fraud_patterns
ORDER BY score DESC

UNION ALL

-- ============================================================================
-- SECTION 3: SESSIONS (Chronological)
-- ============================================================================
SELECT
  '=== SESSIONS ===' as section,
  session_id::text,
  linked_via::text,
  linked_at::text,
  session_created_at::text,
  last_activity_at::text
FROM client_sessions_data
ORDER BY session_created_at DESC

UNION ALL

-- ============================================================================
-- SECTION 4: SESSION METADATA (Device, Location, Network)
-- ============================================================================
SELECT
  '=== SESSION METADATA ===' as section,
  session_id::text,
  device_type::text || ' / ' || browser::text || ' / ' || os::text as device_info,
  country_code::text,
  asn::text,
  ip_prefix::text,
  ip_hash::text
FROM client_sessions_data
ORDER BY session_created_at DESC

UNION ALL

-- ============================================================================
-- SECTION 5: TELEMETRY EVENTS (Timeline)
-- ============================================================================
SELECT
  '=== TELEMETRY TIMELINE ===' as section,
  created_at::text,
  event_type::text,
  event_name::text,
  page_url::text,
  duration_ms::text
FROM telemetry_events
ORDER BY created_at ASC

UNION ALL

-- ============================================================================
-- SECTION 6: SECURITY EVENTS (Fraud Indicators)
-- ============================================================================
SELECT
  '=== SECURITY EVENTS ===' as section,
  ts::text,
  event_type::text,
  country_code::text,
  asn::text,
  meta::text
FROM security_events_data
ORDER BY ts ASC;
```

**Export:** Copier résultats → Excel → Imprimer PDF → Remettre à la police

---

## 🚨 QUERY 2: Fraud Score Only (Quick Check)

**Cas d'usage:** Vérifier rapidement le score de risque d'un client.

```sql
-- ============================================================================
-- FRAUD SCORE: Quick summary
-- ============================================================================
-- PARAMÈTRE: Remplacer 'client-uuid-here' par le client_id

SELECT
  cph.client_id,
  c.primary_email,
  COUNT(*) as pattern_count,
  SUM(cph.score) as total_score,
  MAX(cph.score) as max_score,
  STRING_AGG(cph.pattern_key, ', ' ORDER BY cph.score DESC) as patterns,
  CASE
    WHEN MAX(cph.score) >= 90 THEN 'CRITICAL'
    WHEN MAX(cph.score) >= 75 THEN 'HIGH'
    WHEN MAX(cph.score) >= 50 THEN 'MEDIUM'
    ELSE 'LOW'
  END as overall_risk
FROM client_pattern_hits cph
INNER JOIN clients c ON cph.client_id = c.id
WHERE cph.client_id = 'client-uuid-here'::uuid -- ⚠️ REMPLACER ICI
GROUP BY cph.client_id, c.primary_email;
```

---

## 🔍 QUERY 3: Timeline Complète (Minute-by-Minute)

**Cas d'usage:** Reconstruire la timeline exacte du fraudeur pour la police.

```sql
-- ============================================================================
-- TIMELINE COMPLÈTE: Chaque action minute par minute
-- ============================================================================
-- PARAMÈTRE: Remplacer 'client-uuid-here' par le client_id

WITH all_events AS (
  -- Telemetry events
  SELECT
    cte.created_at as ts,
    'telemetry' as source,
    cte.event_type as type,
    cte.event_name as name,
    cte.page_url as detail,
    cte.session_id,
    NULL::jsonb as meta
  FROM client_telemetry_events cte
  WHERE cte.session_id IN (
    SELECT session_id
    FROM client_sessions
    WHERE client_id = 'client-uuid-here'::uuid -- ⚠️ REMPLACER ICI
  )

  UNION ALL

  -- Security events
  SELECT
    se.ts,
    'security' as source,
    se.event_type as type,
    se.country_code as name,
    se.ip_prefix as detail,
    se.session_id,
    se.meta
  FROM security_events se
  WHERE se.session_id IN (
    SELECT session_id
    FROM client_sessions
    WHERE client_id = 'client-uuid-here'::uuid -- ⚠️ REMPLACER ICI
  )

  UNION ALL

  -- Session creation
  SELECT
    cs.created_at as ts,
    'session' as source,
    'session_created' as type,
    cs.linked_via as name,
    cs.device_type || ' / ' || cs.browser as detail,
    cs.session_id,
    jsonb_build_object(
      'country', cs.country_code,
      'asn', cs.asn,
      'ip_hash', cs.ip_hash
    ) as meta
  FROM client_sessions cs
  WHERE cs.client_id = 'client-uuid-here'::uuid -- ⚠️ REMPLACER ICI
)

SELECT
  ts,
  source,
  type,
  name,
  detail,
  session_id,
  meta
FROM all_events
ORDER BY ts ASC;
```

**Export:** Copier → Excel → Créer graphique timeline

---

## 🌍 QUERY 4: Country Changes (Géo-Anomalies)

**Cas d'usage:** Détecter si fraudeur a changé de pays pendant la session.

```sql
-- ============================================================================
-- GEO-ANOMALIES: Changements de pays suspects
-- ============================================================================
-- PARAMÈTRE: Remplacer 'client-uuid-here' par le client_id

SELECT
  se.ts,
  se.session_id,
  se.meta->>'previous_country' as from_country,
  se.meta->>'new_country' as to_country,
  se.ip_hash,
  se.asn,
  se.meta->>'user_agent' as browser,
  -- Time since previous event
  LAG(se.ts) OVER (ORDER BY se.ts) as previous_event_time,
  EXTRACT(EPOCH FROM (se.ts - LAG(se.ts) OVER (ORDER BY se.ts))) as seconds_since_previous
FROM security_events se
WHERE se.event_type = 'country_change'
  AND se.session_id IN (
    SELECT session_id
    FROM client_sessions
    WHERE client_id = 'client-uuid-here'::uuid -- ⚠️ REMPLACER ICI
  )
ORDER BY se.ts ASC;
```

**Interprétation:**
- Si `seconds_since_previous` < 300 (5 min) → **VPN switching**
- Si changement Canada → pays suspect → **Fraud indicator**

---

## 🤖 QUERY 5: VPN/Bot Detection

**Cas d'usage:** Identifier si fraudeur a utilisé VPN/proxy/bot.

```sql
-- ============================================================================
-- VPN/BOT DETECTION: Signaux de fraude technique
-- ============================================================================
-- PARAMÈTRE: Remplacer 'client-uuid-here' par le client_id

SELECT
  se.ts,
  se.event_type,
  se.asn,
  se.country_code,
  se.ip_prefix,
  se.meta->>'is_vpn' as is_vpn,
  se.meta->>'is_proxy' as is_proxy,
  se.meta->>'is_hosting' as is_hosting,
  se.meta->>'reason' as detection_reason,
  cs.device_type,
  cs.browser
FROM security_events se
INNER JOIN client_sessions cs ON se.session_id = cs.session_id
WHERE se.event_type IN ('vpn_detected', 'bot_detected')
  AND se.session_id IN (
    SELECT session_id
    FROM client_sessions
    WHERE client_id = 'client-uuid-here'::uuid -- ⚠️ REMPLACER ICI
  )
ORDER BY se.ts ASC;
```

**Red Flags:**
- `is_vpn = true` → Fraudeur cache son IP réelle
- `is_hosting = true` → Utilise un serveur VPS (pas un humain normal)
- ASN dans liste VPN connue → NordVPN, ExpressVPN, etc.

---

## 🔄 QUERY 6: Repeat Offenders (IP Hash Matching)

**Cas d'usage:** Détecter si même fraudeur (même IP hash) a attaqué plusieurs victimes.

```sql
-- ============================================================================
-- REPEAT OFFENDERS: Même IP hash sur plusieurs clients
-- ============================================================================
-- PARAMÈTRE: Remplacer 'ip-hash-here' par le ip_hash du fraudeur

WITH ip_usage AS (
  SELECT
    cs.ip_hash,
    cs.client_id,
    c.primary_email,
    c.first_name,
    c.last_name,
    cs.created_at,
    cs.country_code,
    cs.asn,
    cs.device_type,
    cs.browser
  FROM client_sessions cs
  INNER JOIN clients c ON cs.client_id = c.id
  WHERE cs.ip_hash = 'ip-hash-here' -- ⚠️ REMPLACER ICI (ou laisser pour voir tous)
)

SELECT
  ip_hash,
  COUNT(DISTINCT client_id) as victim_count,
  STRING_AGG(DISTINCT primary_email, ', ') as victims,
  MIN(created_at) as first_seen,
  MAX(created_at) as last_seen,
  STRING_AGG(DISTINCT country_code, ', ') as countries,
  STRING_AGG(DISTINCT asn::text, ', ') as asns
FROM ip_usage
GROUP BY ip_hash
HAVING COUNT(DISTINCT client_id) > 1 -- Plus d'une victime = repeat offender
ORDER BY victim_count DESC;
```

**Usage:**
1. Trouver l'IP hash du fraudeur avec QUERY 1
2. Remplacer `ip-hash-here` par cette valeur
3. Résultat montre TOUTES les victimes du même fraudeur

**CRITIQUE pour police:** Prouve que c'est un fraudeur professionnel (pas un accident).

---

## 📊 QUERY 7: Fraud Heatmap (Tous les clients suspects)

**Cas d'usage:** Dashboard admin - voir tous les clients avec scores élevés.

```sql
-- ============================================================================
-- FRAUD HEATMAP: Top 50 clients à risque élevé
-- ============================================================================

SELECT
  c.id as client_id,
  c.primary_email,
  c.first_name,
  c.last_name,
  COUNT(DISTINCT cph.pattern_key) as pattern_count,
  SUM(cph.score) as total_score,
  MAX(cph.score) as max_score,
  STRING_AGG(cph.pattern_key, ', ' ORDER BY cph.score DESC) as patterns,
  CASE
    WHEN MAX(cph.score) >= 90 THEN 'CRITICAL'
    WHEN MAX(cph.score) >= 75 THEN 'HIGH'
    WHEN MAX(cph.score) >= 50 THEN 'MEDIUM'
    ELSE 'LOW'
  END as risk_level,
  (
    SELECT COUNT(*)
    FROM loan_applications la
    WHERE la.client_id = c.id
  ) as total_applications,
  MAX(cph.ts) as last_pattern_detected
FROM clients c
INNER JOIN client_pattern_hits cph ON c.id = cph.client_id
GROUP BY c.id, c.primary_email, c.first_name, c.last_name
HAVING MAX(cph.score) >= 50 -- Seulement risque MEDIUM et plus
ORDER BY total_score DESC, max_score DESC
LIMIT 50;
```

**Usage:** Exécuter quotidiennement pour monitoring proactif.

---

## 🛠️ QUERY 8: Manual Fraud Scoring (On-Demand)

**Cas d'usage:** Re-calculer le fraud score d'un client à la demande.

```sql
-- ============================================================================
-- MANUAL FRAUD SCORING: Trigger pattern matching
-- ============================================================================
-- PARAMÈTRE: Remplacer 'client-uuid-here' par le client_id

SELECT * FROM match_client_patterns('client-uuid-here'::uuid);
```

**Returns:**
```
pattern_key       | score | risk_level | evidence
------------------+-------+------------+----------
nsf_rapid         | 75    | HIGH       | {"applications_in_first_week": 1, ...}
ibv_multi_fail    | 90    | CRITICAL   | {"fail_count": 3, ...}
country_anomaly   | 85    | HIGH       | {"country_count": 2, ...}
```

---

## 📤 QUERY 9: Export JSON pour Police (Format Officiel)

**Cas d'usage:** Générer un JSON structuré pour rapport officiel police.

```sql
-- ============================================================================
-- EXPORT JSON: Rapport officiel pour autorités
-- ============================================================================
-- PARAMÈTRE: Remplacer 'client-uuid-here' par le client_id

WITH client_data AS (
  SELECT
    c.id as client_id,
    c.primary_email,
    c.first_name,
    c.last_name,
    c.created_at
  FROM clients c
  WHERE c.id = 'client-uuid-here'::uuid -- ⚠️ REMPLACER ICI
),
sessions_data AS (
  SELECT jsonb_agg(
    jsonb_build_object(
      'session_id', cs.session_id,
      'linked_via', cs.linked_via,
      'linked_at', cs.linked_at,
      'created_at', cs.created_at,
      'device', jsonb_build_object(
        'type', cs.device_type,
        'browser', cs.browser,
        'os', cs.os
      ),
      'network', jsonb_build_object(
        'ip_hash', cs.ip_hash,
        'ua_hash', cs.ua_hash,
        'asn', cs.asn,
        'country', cs.country_code,
        'ip_prefix', cs.ip_prefix
      ),
      'attribution', jsonb_build_object(
        'referrer', cs.first_referrer,
        'utm_source', cs.first_utm_source,
        'utm_medium', cs.first_utm_medium,
        'utm_campaign', cs.first_utm_campaign
      )
    ) ORDER BY cs.created_at
  ) as sessions
  FROM client_sessions cs
  WHERE cs.client_id = (SELECT client_id FROM client_data)
),
events_data AS (
  SELECT jsonb_agg(
    jsonb_build_object(
      'ts', cte.created_at,
      'type', cte.event_type,
      'name', cte.event_name,
      'page', cte.page_url,
      'duration_ms', cte.duration_ms
    ) ORDER BY cte.created_at
  ) as events
  FROM client_telemetry_events cte
  WHERE cte.session_id IN (
    SELECT cs.session_id
    FROM client_sessions cs
    WHERE cs.client_id = (SELECT client_id FROM client_data)
  )
),
security_data AS (
  SELECT jsonb_agg(
    jsonb_build_object(
      'ts', se.ts,
      'type', se.event_type,
      'asn', se.asn,
      'country', se.country_code,
      'ip_prefix', se.ip_prefix,
      'details', se.meta
    ) ORDER BY se.ts
  ) as security_events
  FROM security_events se
  WHERE se.session_id IN (
    SELECT cs.session_id
    FROM client_sessions cs
    WHERE cs.client_id = (SELECT client_id FROM client_data)
  )
),
fraud_data AS (
  SELECT jsonb_agg(
    jsonb_build_object(
      'pattern', cph.pattern_key,
      'score', cph.score,
      'risk', cph.risk_level,
      'evidence', cph.evidence,
      'detected_at', cph.ts
    ) ORDER BY cph.score DESC
  ) as fraud_patterns
  FROM client_pattern_hits cph
  WHERE cph.client_id = (SELECT client_id FROM client_data)
)

SELECT jsonb_build_object(
  'report_type', 'fraud_investigation',
  'generated_at', now(),
  'client', (
    SELECT jsonb_build_object(
      'id', client_id,
      'email', primary_email,
      'name', first_name || ' ' || last_name,
      'account_created', created_at
    )
    FROM client_data
  ),
  'fraud_score', (
    SELECT jsonb_build_object(
      'total', COALESCE(SUM(cph.score), 0),
      'max', COALESCE(MAX(cph.score), 0),
      'pattern_count', COUNT(*),
      'risk_level', CASE
        WHEN MAX(cph.score) >= 90 THEN 'CRITICAL'
        WHEN MAX(cph.score) >= 75 THEN 'HIGH'
        WHEN MAX(cph.score) >= 50 THEN 'MEDIUM'
        ELSE 'LOW'
      END
    )
    FROM client_pattern_hits cph
    WHERE cph.client_id = (SELECT client_id FROM client_data)
  ),
  'fraud_patterns', (SELECT fraud_patterns FROM fraud_data),
  'sessions', (SELECT sessions FROM sessions_data),
  'timeline', (SELECT events FROM events_data),
  'security_events', (SELECT security_events FROM security_data)
) as police_report;
```

**Export:**
1. Copier le résultat JSON
2. Sauvegarder dans fichier `police_report_<client_email>_<date>.json`
3. Joindre au dossier PDF officiel

---

## 📝 NOTES POUR LA POLICE

### Données Fournies

**✅ INCLUS dans rapports:**
- Timeline complète des actions (seconde par seconde)
- Device/Browser/OS (server-parsed)
- IP hash (SHA256, non-réversible)
- UA hash (SHA256, non-réversible)
- ASN (fournisseur internet)
- Country code (ISO)
- IP prefix (/24 CIDR, pas IP individuelle)
- Fraud score (0-100)
- Pattern matches (NSF rapide, IBV fails, etc.)
- Security events (VPN, country change, bot)

**❌ NON INCLUS (Privacy):**
- Raw IP addresses (seulement hash)
- Raw User-Agent strings (seulement hash)
- Contenu de formulaires (seulement metadata)
- Emails/phones dans payload events (sanitized)

### Interprétation des Scores

| Score | Risque | Action Recommandée |
|-------|--------|-------------------|
| 90-100 | CRITICAL | Investigation immédiate, bloquer compte |
| 75-89 | HIGH | Vérification manuelle requise |
| 50-74 | MEDIUM | Monitoring renforcé |
| 0-49 | LOW | Normal |

### Patterns Clés

| Pattern | Description | Score Typique |
|---------|-------------|---------------|
| `nsf_rapid` | Demande prêt < 7j après création compte | 75 |
| `ibv_multi_fail` | Échecs vérification identité (2+) | 80-95 |
| `country_anomaly` | Changement de pays pendant session | 85 |
| `vpn_use` | Utilisation VPN/proxy | 70 |
| `device_churn` | Changement device suspect (3+) | 55-75 |
| `bot_behavior` | Signaux bot (hosting ASN) | 95 |
| `rate_abuse` | Trop de requêtes (3+ rate limits) | 60-85 |

### Durée de Rétention

| Donnée | Rétention | Justification |
|--------|-----------|---------------|
| Events | 30 jours | Analyse comportementale |
| Sessions | 90 jours | Corrélation multi-visites |
| IP hash | 30 jours | Détection fraude (puis purge auto) |
| Pattern hits | Permanent | Audit trail légal |
| Security events | 30 jours | Fenêtre investigation |

---

**FIN DU DOCUMENT**
