-- ============================================================================
-- QUERY: Check Last Form Submission (Phase 2 Data)
-- ============================================================================
-- Execute this after form submission to see all captured data

-- 1. Last linked session
SELECT
  session_id,
  client_id,
  linked_via,
  linked_at,
  asn,
  country_code,
  ip_prefix,
  device_type,
  browser,
  os,
  ip_hash,
  ua_hash
FROM client_sessions
WHERE client_id IS NOT NULL
ORDER BY linked_at DESC
LIMIT 1;

-- 2. Security events for that session
SELECT
  ts,
  event_type,
  asn,
  country_code,
  ip_prefix,
  meta
FROM security_events
WHERE session_id = (
  SELECT session_id FROM client_sessions
  WHERE client_id IS NOT NULL
  ORDER BY linked_at DESC
  LIMIT 1
)
ORDER BY ts DESC;

-- 3. Fraud patterns detected
SELECT
  pattern_key,
  score,
  risk_level,
  evidence,
  ts
FROM client_pattern_hits
WHERE client_id = (
  SELECT client_id FROM client_sessions
  WHERE client_id IS NOT NULL
  ORDER BY linked_at DESC
  LIMIT 1
)
ORDER BY ts DESC;

-- 4. Total fraud score
SELECT
  c.primary_email,
  COUNT(cph.id) as pattern_count,
  SUM(cph.score) as total_score,
  MAX(cph.score) as max_score,
  STRING_AGG(cph.pattern_key, ', ' ORDER BY cph.score DESC) as patterns,
  CASE
    WHEN MAX(cph.score) >= 90 THEN 'CRITICAL'
    WHEN MAX(cph.score) >= 75 THEN 'HIGH'
    WHEN MAX(cph.score) >= 50 THEN 'MEDIUM'
    ELSE 'LOW'
  END as risk_level
FROM clients c
INNER JOIN client_pattern_hits cph ON c.id = cph.client_id
WHERE c.id = (
  SELECT client_id FROM client_sessions
  WHERE client_id IS NOT NULL
  ORDER BY linked_at DESC
  LIMIT 1
)
GROUP BY c.id, c.primary_email;
