-- ============================================================================
-- MIGRATION: Fraud Detection Phase 2
-- ============================================================================
-- Tables: security_events, client_pattern_hits
-- Améliore: client_sessions (ASN, Country, IP prefix, Consent)
-- RPC: match_client_patterns() pour scoring temps réel
-- ============================================================================

-- ============================================================================
-- 1. TABLE: security_events (Événements de sécurité/fraude)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.security_events (
  id bigserial PRIMARY KEY,
  ts timestamptz NOT NULL DEFAULT now(),
  event_type text NOT NULL,
  session_id text REFERENCES public.client_sessions(session_id) ON DELETE CASCADE,
  ip_hash text,
  ip_prefix text,
  ua_hash text,
  asn integer,
  country_code char(2),
  tls_fingerprint text,
  meta jsonb DEFAULT '{}'::jsonb,
  expires_at timestamptz NOT NULL DEFAULT (now() + INTERVAL '30 days'),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_security_event_type CHECK (
    event_type IN (
      'rate_limit',
      'failed_login',
      'ibv_fail',
      'ibv_success',
      'bot_detected',
      'vpn_detected',
      'country_change',
      'device_change',
      'suspicious_velocity',
      'ip_blacklist_hit',
      'multiple_accounts'
    )
  )
);

-- Indexes pour performance
CREATE INDEX IF NOT EXISTS idx_security_events_ts
  ON public.security_events(ts DESC);

CREATE INDEX IF NOT EXISTS idx_security_events_session
  ON public.security_events(session_id, ts DESC);

CREATE INDEX IF NOT EXISTS idx_security_events_ip_hash
  ON public.security_events(ip_hash, ts DESC)
  WHERE ip_hash IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_security_events_event_type
  ON public.security_events(event_type, ts DESC);

CREATE INDEX IF NOT EXISTS idx_security_events_expires
  ON public.security_events(expires_at);

CREATE INDEX IF NOT EXISTS idx_security_events_country
  ON public.security_events(country_code, ts DESC)
  WHERE country_code IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_security_events_asn
  ON public.security_events(asn, ts DESC)
  WHERE asn IS NOT NULL;

-- Comments pour documentation
COMMENT ON TABLE public.security_events IS
'Source: Server-side detection. Retention: 30 days (auto-purge via expires_at). Privacy: Hashed IPs only, no PII. Justification: Fraud detection, bot prevention, police reports.';

COMMENT ON COLUMN public.security_events.ts IS
'Source: Server timestamp. Retention: 30d. Justification: Timeline reconstruction for fraud investigations.';

COMMENT ON COLUMN public.security_events.event_type IS
'Source: Server-side rules. Retention: 30d. Values: rate_limit, failed_login, ibv_fail, bot_detected, vpn_detected, country_change, device_change, suspicious_velocity, ip_blacklist_hit, multiple_accounts.';

COMMENT ON COLUMN public.security_events.ip_hash IS
'Source: SHA256(IP + TELEMETRY_HASH_SALT). Retention: 30d. Privacy: Hashed, NOT reversible. Justification: Rate limiting, bot detection, fraud correlation.';

COMMENT ON COLUMN public.security_events.ip_prefix IS
'Source: IP geolocation (/24 CIDR). Retention: 30d. Privacy: No individual IP, range only. Justification: Detect IP range abuse.';

COMMENT ON COLUMN public.security_events.asn IS
'Source: IP geolocation (ipapi.co). Retention: 30d. Privacy: No PII, ISP identifier. Justification: Detect VPN, hosting providers, fraudulent ISPs.';

COMMENT ON COLUMN public.security_events.country_code IS
'Source: IP geolocation (ipapi.co). Retention: 30d. Privacy: ISO 3166-1 alpha-2 code. Justification: Detect geo-anomalies (Canada -> Russia).';

COMMENT ON COLUMN public.security_events.tls_fingerprint IS
'Source: WAF/CDN (Vercel Edge). Retention: 30d. Privacy: JA3 hash, no PII. Justification: Detect bot automation tools.';

COMMENT ON COLUMN public.security_events.meta IS
'Source: Event-specific data (SANITIZED, no PII). Retention: 30d. Privacy: Whitelisted keys only. Justification: Contextual evidence for fraud analysis.';

COMMENT ON COLUMN public.security_events.expires_at IS
'Source: Computed (ts + 30d). Retention: Auto-purge via cleanup cron. Privacy: Aggressive cleanup. Justification: Minimize data retention.';

-- ============================================================================
-- 2. TABLE: client_pattern_hits (Détection de patterns frauduleux)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.client_pattern_hits (
  id bigserial PRIMARY KEY,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  ts timestamptz NOT NULL DEFAULT now(),
  pattern_key text NOT NULL,
  score integer NOT NULL CHECK (score >= 0 AND score <= 100),
  risk_level text NOT NULL,
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_pattern_key CHECK (
    pattern_key IN (
      'nsf_rapid',
      'ibv_multi_fail',
      'device_churn',
      'vpn_use',
      'country_anomaly',
      'rate_abuse',
      'bot_behavior',
      'multiple_applications',
      'suspicious_velocity',
      'ip_blacklist',
      'stolen_identity_indicators'
    )
  ),
  CONSTRAINT chk_risk_level CHECK (
    risk_level IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')
  )
);

-- Indexes pour queries par client et pattern
CREATE INDEX IF NOT EXISTS idx_pattern_hits_client
  ON public.client_pattern_hits(client_id, ts DESC);

CREATE INDEX IF NOT EXISTS idx_pattern_hits_pattern
  ON public.client_pattern_hits(pattern_key, ts DESC);

CREATE INDEX IF NOT EXISTS idx_pattern_hits_risk
  ON public.client_pattern_hits(risk_level, ts DESC);

CREATE INDEX IF NOT EXISTS idx_pattern_hits_score
  ON public.client_pattern_hits(score DESC, ts DESC);

-- Comments
COMMENT ON TABLE public.client_pattern_hits IS
'Source: RPC match_client_patterns(). Retention: Permanent (linked to client). Privacy: No PII, aggregated scores. Justification: Fraud detection audit trail.';

COMMENT ON COLUMN public.client_pattern_hits.pattern_key IS
'Source: Server-side pattern matching. Retention: Permanent. Values: nsf_rapid, ibv_multi_fail, device_churn, vpn_use, country_anomaly, rate_abuse, bot_behavior, multiple_applications, suspicious_velocity, ip_blacklist, stolen_identity_indicators.';

COMMENT ON COLUMN public.client_pattern_hits.score IS
'Source: Computed risk score (0-100). Retention: Permanent. Privacy: No PII, numeric only. Justification: Fraud risk quantification.';

COMMENT ON COLUMN public.client_pattern_hits.evidence IS
'Source: Aggregated event IDs + counts (SANITIZED, no PII). Retention: Permanent. Privacy: References only, no raw data. Justification: Audit trail for police reports.';

-- ============================================================================
-- 3. AMÉLIORER: client_sessions (Ajouter ASN, Country, IP prefix, Consent)
-- ============================================================================

-- Ajouter colonnes si elles n'existent pas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'client_sessions'
      AND column_name = 'asn'
  ) THEN
    ALTER TABLE public.client_sessions ADD COLUMN asn integer;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'client_sessions'
      AND column_name = 'country_code'
  ) THEN
    ALTER TABLE public.client_sessions ADD COLUMN country_code char(2);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'client_sessions'
      AND column_name = 'ip_prefix'
  ) THEN
    ALTER TABLE public.client_sessions ADD COLUMN ip_prefix text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'client_sessions'
      AND column_name = 'consent_analytics'
  ) THEN
    ALTER TABLE public.client_sessions ADD COLUMN consent_analytics boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'client_sessions'
      AND column_name = 'consent_marketing'
  ) THEN
    ALTER TABLE public.client_sessions ADD COLUMN consent_marketing boolean DEFAULT false;
  END IF;
END
$$;

-- Indexes pour nouvelles colonnes
CREATE INDEX IF NOT EXISTS idx_client_sessions_asn
  ON public.client_sessions(asn, created_at DESC)
  WHERE asn IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_client_sessions_country
  ON public.client_sessions(country_code, created_at DESC)
  WHERE country_code IS NOT NULL;

-- Comments
COMMENT ON COLUMN public.client_sessions.asn IS
'Source: IP geolocation (ipapi.co). Retention: 90d. Privacy: No PII, ISP identifier. Justification: Detect VPN, hosting providers, fraudulent ISPs.';

COMMENT ON COLUMN public.client_sessions.country_code IS
'Source: IP geolocation (ipapi.co). Retention: 90d. Privacy: ISO 3166-1 alpha-2 code. Justification: Detect geo-anomalies.';

COMMENT ON COLUMN public.client_sessions.ip_prefix IS
'Source: IP geolocation (/24 CIDR). Retention: 90d. Privacy: No individual IP, range only. Justification: Detect IP range abuse.';

COMMENT ON COLUMN public.client_sessions.consent_analytics IS
'Source: User opt-in (cookie banner). Retention: 90d. Privacy: Boolean flag. Justification: GDPR compliance.';

COMMENT ON COLUMN public.client_sessions.consent_marketing IS
'Source: User opt-in (cookie banner). Retention: 90d. Privacy: Boolean flag. Justification: GDPR compliance.';

-- ============================================================================
-- 4. RPC: match_client_patterns() - Fraud Scoring en Temps Réel
-- ============================================================================

CREATE OR REPLACE FUNCTION public.match_client_patterns(p_client_id uuid)
RETURNS TABLE(
  pattern_key text,
  score integer,
  risk_level text,
  evidence jsonb
) AS $$
DECLARE
  v_nsf_rate integer;
  v_ibv_fails integer;
  v_device_changes integer;
  v_country_changes integer;
  v_vpn_detected integer;
  v_rate_limit_hits integer;
  v_application_count integer;
  v_client_age_days integer;
  v_bot_signals integer;
BEGIN
  -- Calculer l'âge du client
  SELECT EXTRACT(DAY FROM (now() - created_at))::integer
  INTO v_client_age_days
  FROM public.clients
  WHERE id = p_client_id;

  -- ========================================================================
  -- PATTERN 1: NSF rapide (demande prêt < 7j après création compte)
  -- ========================================================================
  SELECT COUNT(*) INTO v_application_count
  FROM public.loan_applications
  WHERE client_id = p_client_id;

  IF v_client_age_days < 7 AND v_application_count > 0 THEN
    v_nsf_rate := v_application_count;

    INSERT INTO public.client_pattern_hits (client_id, pattern_key, score, risk_level, evidence)
    VALUES (p_client_id, 'nsf_rapid', 75, 'HIGH', jsonb_build_object(
      'applications_in_first_week', v_nsf_rate,
      'client_age_days', v_client_age_days
    ))
    ON CONFLICT DO NOTHING;

    RETURN QUERY SELECT 'nsf_rapid'::text, 75, 'HIGH'::text,
                        jsonb_build_object(
                          'applications_in_first_week', v_nsf_rate,
                          'client_age_days', v_client_age_days
                        );
  END IF;

  -- ========================================================================
  -- PATTERN 2: IBV multi-fail (échecs vérification identité)
  -- ========================================================================
  SELECT COUNT(*) INTO v_ibv_fails
  FROM public.security_events
  WHERE session_id IN (
    SELECT session_id FROM public.client_sessions WHERE client_id = p_client_id
  ) AND event_type = 'ibv_fail';

  IF v_ibv_fails >= 2 THEN
    INSERT INTO public.client_pattern_hits (client_id, pattern_key, score, risk_level, evidence)
    VALUES (p_client_id, 'ibv_multi_fail',
            CASE
              WHEN v_ibv_fails >= 4 THEN 95
              WHEN v_ibv_fails >= 3 THEN 90
              ELSE 80
            END,
            CASE
              WHEN v_ibv_fails >= 3 THEN 'CRITICAL'
              ELSE 'HIGH'
            END,
            jsonb_build_object(
              'fail_count', v_ibv_fails,
              'event_ids', (
                SELECT jsonb_agg(id)
                FROM public.security_events
                WHERE session_id IN (
                  SELECT session_id FROM public.client_sessions WHERE client_id = p_client_id
                ) AND event_type = 'ibv_fail'
              )
            ))
    ON CONFLICT DO NOTHING;

    RETURN QUERY SELECT 'ibv_multi_fail'::text,
                        CASE WHEN v_ibv_fails >= 4 THEN 95 WHEN v_ibv_fails >= 3 THEN 90 ELSE 80 END,
                        CASE WHEN v_ibv_fails >= 3 THEN 'CRITICAL'::text ELSE 'HIGH'::text END,
                        jsonb_build_object('fail_count', v_ibv_fails);
  END IF;

  -- ========================================================================
  -- PATTERN 3: Device churn (changement device suspect)
  -- ========================================================================
  SELECT COUNT(DISTINCT device_type) INTO v_device_changes
  FROM public.client_sessions
  WHERE client_id = p_client_id AND device_type IS NOT NULL;

  IF v_device_changes >= 3 THEN
    INSERT INTO public.client_pattern_hits (client_id, pattern_key, score, risk_level, evidence)
    VALUES (p_client_id, 'device_churn',
            CASE
              WHEN v_device_changes >= 5 THEN 75
              WHEN v_device_changes >= 4 THEN 65
              ELSE 55
            END,
            CASE
              WHEN v_device_changes >= 4 THEN 'HIGH'
              ELSE 'MEDIUM'
            END,
            jsonb_build_object(
              'device_count', v_device_changes,
              'devices', (
                SELECT jsonb_agg(DISTINCT device_type)
                FROM public.client_sessions
                WHERE client_id = p_client_id AND device_type IS NOT NULL
              )
            ))
    ON CONFLICT DO NOTHING;

    RETURN QUERY SELECT 'device_churn'::text,
                        CASE WHEN v_device_changes >= 5 THEN 75 WHEN v_device_changes >= 4 THEN 65 ELSE 55 END,
                        CASE WHEN v_device_changes >= 4 THEN 'HIGH'::text ELSE 'MEDIUM'::text END,
                        jsonb_build_object('device_count', v_device_changes);
  END IF;

  -- ========================================================================
  -- PATTERN 4: Country anomaly (changement pays)
  -- ========================================================================
  SELECT COUNT(DISTINCT country_code) INTO v_country_changes
  FROM public.client_sessions
  WHERE client_id = p_client_id AND country_code IS NOT NULL;

  IF v_country_changes > 1 THEN
    INSERT INTO public.client_pattern_hits (client_id, pattern_key, score, risk_level, evidence)
    VALUES (p_client_id, 'country_anomaly',
            CASE
              WHEN v_country_changes >= 3 THEN 90
              ELSE 85
            END,
            'HIGH',
            jsonb_build_object(
              'country_count', v_country_changes,
              'countries', (
                SELECT jsonb_agg(DISTINCT country_code)
                FROM public.client_sessions
                WHERE client_id = p_client_id AND country_code IS NOT NULL
              )
            ))
    ON CONFLICT DO NOTHING;

    RETURN QUERY SELECT 'country_anomaly'::text,
                        CASE WHEN v_country_changes >= 3 THEN 90 ELSE 85 END,
                        'HIGH'::text,
                        jsonb_build_object('country_count', v_country_changes);
  END IF;

  -- ========================================================================
  -- PATTERN 5: VPN detection
  -- ========================================================================
  SELECT COUNT(*) INTO v_vpn_detected
  FROM public.security_events
  WHERE session_id IN (
    SELECT session_id FROM public.client_sessions WHERE client_id = p_client_id
  ) AND event_type = 'vpn_detected';

  IF v_vpn_detected > 0 THEN
    INSERT INTO public.client_pattern_hits (client_id, pattern_key, score, risk_level, evidence)
    VALUES (p_client_id, 'vpn_use', 70, 'HIGH', jsonb_build_object(
      'vpn_count', v_vpn_detected
    ))
    ON CONFLICT DO NOTHING;

    RETURN QUERY SELECT 'vpn_use'::text, 70, 'HIGH'::text,
                        jsonb_build_object('vpn_count', v_vpn_detected);
  END IF;

  -- ========================================================================
  -- PATTERN 6: Rate abuse (trop de requêtes)
  -- ========================================================================
  SELECT COUNT(*) INTO v_rate_limit_hits
  FROM public.security_events
  WHERE session_id IN (
    SELECT session_id FROM public.client_sessions WHERE client_id = p_client_id
  ) AND event_type = 'rate_limit';

  IF v_rate_limit_hits >= 3 THEN
    INSERT INTO public.client_pattern_hits (client_id, pattern_key, score, risk_level, evidence)
    VALUES (p_client_id, 'rate_abuse',
            CASE
              WHEN v_rate_limit_hits >= 10 THEN 85
              WHEN v_rate_limit_hits >= 5 THEN 75
              ELSE 60
            END,
            CASE
              WHEN v_rate_limit_hits >= 5 THEN 'HIGH'
              ELSE 'MEDIUM'
            END,
            jsonb_build_object(
              'rate_limit_hits', v_rate_limit_hits
            ))
    ON CONFLICT DO NOTHING;

    RETURN QUERY SELECT 'rate_abuse'::text,
                        CASE WHEN v_rate_limit_hits >= 10 THEN 85 WHEN v_rate_limit_hits >= 5 THEN 75 ELSE 60 END,
                        CASE WHEN v_rate_limit_hits >= 5 THEN 'HIGH'::text ELSE 'MEDIUM'::text END,
                        jsonb_build_object('rate_limit_hits', v_rate_limit_hits);
  END IF;

  -- ========================================================================
  -- PATTERN 7: Bot behavior
  -- ========================================================================
  SELECT COUNT(*) INTO v_bot_signals
  FROM public.security_events
  WHERE session_id IN (
    SELECT session_id FROM public.client_sessions WHERE client_id = p_client_id
  ) AND event_type = 'bot_detected';

  IF v_bot_signals > 0 THEN
    INSERT INTO public.client_pattern_hits (client_id, pattern_key, score, risk_level, evidence)
    VALUES (p_client_id, 'bot_behavior', 95, 'CRITICAL', jsonb_build_object(
      'bot_signals', v_bot_signals
    ))
    ON CONFLICT DO NOTHING;

    RETURN QUERY SELECT 'bot_behavior'::text, 95, 'CRITICAL'::text,
                        jsonb_build_object('bot_signals', v_bot_signals);
  END IF;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.match_client_patterns IS
'Source: Server-side pattern matching. Retention: Results inserted into client_pattern_hits (permanent). Privacy: No PII, aggregated scores. Justification: Real-time fraud detection for police reports.';

-- ============================================================================
-- 5. RLS POLICIES (Row Level Security)
-- ============================================================================

-- Enable RLS
ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_pattern_hits ENABLE ROW LEVEL SECURITY;

-- Service role: ALL
CREATE POLICY "Service role full access to security_events"
  ON public.security_events
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role full access to client_pattern_hits"
  ON public.client_pattern_hits
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Authenticated (admin): SELECT only
CREATE POLICY "Authenticated users can read security_events"
  ON public.security_events
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can read client_pattern_hits"
  ON public.client_pattern_hits
  FOR SELECT
  TO authenticated
  USING (true);

-- Anonymous: NONE
-- (default deny, no policy needed)

-- ============================================================================
-- 6. AMÉLIORER: cleanup_client_sessions() pour inclure security_events
-- ============================================================================

CREATE OR REPLACE FUNCTION public.cleanup_client_sessions()
RETURNS TABLE(operation text, rows_affected bigint) AS $$
DECLARE
  deleted_sessions bigint;
  deleted_events bigint;
  deleted_security_events bigint;
  cleared_ips bigint;
BEGIN
  -- 1. Delete expired sessions (cascade deletes client_telemetry_events via FK)
  DELETE FROM public.client_sessions
  WHERE expires_at < now();
  GET DIAGNOSTICS deleted_sessions = ROW_COUNT;

  -- 2. Delete old telemetry events (redundant due to CASCADE, but explicit)
  DELETE FROM public.client_telemetry_events
  WHERE created_at < now() - INTERVAL '30 days';
  GET DIAGNOSTICS deleted_events = ROW_COUNT;

  -- 3. Delete expired security events (TTL-based)
  DELETE FROM public.security_events
  WHERE expires_at < now();
  GET DIAGNOSTICS deleted_security_events = ROW_COUNT;

  -- 4. Clear IP/UA hashes after 30 days (PRIVACY: aggressive cleanup)
  UPDATE public.client_sessions
  SET ip_hash = NULL, ua_hash = NULL
  WHERE last_activity_at < now() - INTERVAL '30 days'
    AND ip_hash IS NOT NULL;
  GET DIAGNOSTICS cleared_ips = ROW_COUNT;

  RETURN QUERY
  SELECT 'deleted_expired_sessions'::text, deleted_sessions
  UNION ALL
  SELECT 'deleted_old_telemetry_events'::text, deleted_events
  UNION ALL
  SELECT 'deleted_expired_security_events'::text, deleted_security_events
  UNION ALL
  SELECT 'cleared_ip_hashes'::text, cleared_ips;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- FIN MIGRATION
-- ============================================================================
