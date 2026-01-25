-- ============================================================================
-- MIGRATION: Client Sessions & Telemetry Events (Privacy-by-Design)
-- Date: 2026-01-25
-- Purpose: Track anonymous sessions + link to client_id on voluntary action
-- ============================================================================

-- ============================================================================
-- TABLE: client_sessions
-- Purpose: Track visitor sessions with pseudonymous identifiers
-- Link to client_id ONLY via voluntary events (form submit, magic link, login)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.client_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Session identification (pseudonymous)
  session_id text NOT NULL UNIQUE,
  -- SOURCE: Server-generated crypto.randomBytes(32).hex() (64 chars)
  -- RETENTION: 90 days (extends on activity)
  -- PRIVACY: Pseudonymous identifier, no PII
  -- JUSTIFICATION: Session tracking without user identification until voluntary action

  -- Client linkage (NULL until voluntary event)
  client_id uuid,
  -- SOURCE: Foreign key to clients table (set ONLY on voluntary event)
  -- RETENTION: Permanent (while client exists)
  -- PRIVACY: NULL until user submits form/magic-link/login
  -- JUSTIFICATION: Medical record model - client_id is lifetime identifier

  linked_via text,
  -- SOURCE: Enum: 'form_submit', 'magic_link', 'login', 'contact_form'
  -- RETENTION: Permanent (audit trail)
  -- PRIVACY: Metadata about HOW linkage was created
  -- JUSTIFICATION: Audit compliance, understand customer journey

  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  -- SOURCE: Server timestamp
  -- RETENTION: 90 days (session lifetime)

  last_activity_at timestamptz NOT NULL DEFAULT now(),
  -- SOURCE: Updated on each request with this session_id
  -- RETENTION: 90 days
  -- JUSTIFICATION: Session expiry logic (inactive > 30 days = cleanup)

  linked_at timestamptz,
  -- SOURCE: Server timestamp when client_id was set
  -- RETENTION: Permanent (audit trail)

  expires_at timestamptz NOT NULL DEFAULT (now() + INTERVAL '90 days'),
  -- SOURCE: Computed (last_activity_at + 90 days)
  -- RETENTION: Auto-calculated
  -- JUSTIFICATION: GDPR compliance, automatic cleanup

  -- Fraud detection (hashed, short TTL)
  ip_hash text,
  -- SOURCE: SHA256(IP + TELEMETRY_HASH_SALT), first 16 chars
  -- RETENTION: 30 days (security window)
  -- PRIVACY: SHA256 hashed, NOT reversible, NO raw IP stored
  -- JUSTIFICATION: Rate limiting, fraud detection, bot filtering

  ua_hash text,
  -- SOURCE: SHA256(UA + TELEMETRY_HASH_SALT), first 16 chars
  -- RETENTION: 30 days
  -- PRIVACY: SHA256 hashed, NOT reversible
  -- JUSTIFICATION: Detect suspicious User-Agent changes

  -- GA4 integration (pseudonymous)
  ga4_session_id text,
  -- SOURCE: Google Analytics _ga_<container_id> cookie
  -- RETENTION: 90 days
  -- PRIVACY: GA4-generated pseudonymous ID
  -- JUSTIFICATION: Cross-platform analytics correlation

  ga4_client_id text,
  -- SOURCE: Google Analytics _ga cookie
  -- RETENTION: 90 days
  -- PRIVACY: GA4-generated pseudonymous ID

  -- Device context (privacy-safe, aggregated categories)
  device_type text,
  -- SOURCE: Parsed from User-Agent (Desktop/Mobile/Tablet)
  -- RETENTION: 90 days
  -- PRIVACY: No PII, aggregated category only

  browser text,
  -- SOURCE: Parsed from User-Agent (Chrome/Firefox/Safari)
  -- RETENTION: 90 days

  os text,
  -- SOURCE: Parsed from User-Agent (Windows/macOS/iOS/Android)
  -- RETENTION: 90 days

  -- Marketing attribution
  first_referrer text,
  -- SOURCE: HTTP Referer header (stripped of query params with PII)
  -- RETENTION: 90 days
  -- PRIVACY: URL without query params
  -- JUSTIFICATION: Marketing attribution

  first_utm_source text,
  first_utm_medium text,
  first_utm_campaign text,
  -- SOURCE: URL query params from first visit
  -- RETENTION: 90 days
  -- PRIVACY: Marketing params only, no PII
  -- JUSTIFICATION: Marketing attribution

  -- Metadata
  meta jsonb DEFAULT '{}',
  -- SOURCE: Extensible metadata (screen resolution, timezone, etc.)
  -- RETENTION: 90 days
  -- PRIVACY: NO PII allowed, validated before insert
  -- JUSTIFICATION: UX optimization, fraud detection

  -- Constraints
  CONSTRAINT fk_client FOREIGN KEY (client_id)
    REFERENCES public.clients(id) ON DELETE SET NULL,

  CONSTRAINT chk_linked_via CHECK (
    linked_via IS NULL OR
    linked_via IN ('form_submit', 'magic_link', 'login', 'contact_form')
  )
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_client_sessions_session_id
  ON public.client_sessions(session_id);

CREATE INDEX IF NOT EXISTS idx_client_sessions_client_id
  ON public.client_sessions(client_id)
  WHERE client_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_client_sessions_last_activity
  ON public.client_sessions(last_activity_at DESC);

CREATE INDEX IF NOT EXISTS idx_client_sessions_expires
  ON public.client_sessions(expires_at);

CREATE INDEX IF NOT EXISTS idx_client_sessions_ip_hash
  ON public.client_sessions(ip_hash, created_at)
  WHERE ip_hash IS NOT NULL;

-- RLS Policies
ALTER TABLE public.client_sessions ENABLE ROW LEVEL SECURITY;

-- Service role: full access
CREATE POLICY "Service role full access"
  ON public.client_sessions
  FOR ALL
  TO service_role
  USING (true);

-- Authenticated (admin): read-only
CREATE POLICY "Admin read access"
  ON public.client_sessions
  FOR SELECT
  TO authenticated
  USING (true);

-- ============================================================================
-- TABLE: client_telemetry_events
-- Purpose: Track client behavior events (page views, form interactions)
-- Linked via session_id (pseudonymous) until client linkage
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.client_telemetry_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Linkage
  session_id text NOT NULL,
  -- SOURCE: From client_sessions.session_id (via cookie)
  -- RETENTION: 30 days
  -- PRIVACY: Pseudonymous identifier
  -- JUSTIFICATION: Behavior analysis, funnel optimization

  trace_id uuid,
  -- SOURCE: From telemetry_requests.trace_id (middleware)
  -- RETENTION: 30 days
  -- PRIVACY: Ties to server-side telemetry for debugging
  -- JUSTIFICATION: Distributed tracing, error correlation

  -- Event details
  event_type text NOT NULL,
  -- SOURCE: Application code
  -- RETENTION: 30 days
  -- PRIVACY: No PII in event type
  -- VALUES: 'page_view', 'form_start', 'form_step', 'form_abandon', 'button_click'
  -- JUSTIFICATION: UX analytics, conversion optimization

  event_name text NOT NULL,
  -- SOURCE: Application code
  -- RETENTION: 30 days
  -- PRIVACY: No PII
  -- EXAMPLES: '/applications', 'step_2_employment', 'contact_submit'

  -- Timestamp
  created_at timestamptz NOT NULL DEFAULT now(),
  -- SOURCE: Server timestamp
  -- RETENTION: 30 days
  -- JUSTIFICATION: Time-series analysis

  -- Client-side metadata (privacy-safe)
  page_url text,
  -- SOURCE: Client-side window.location.pathname (NO query params)
  -- RETENTION: 30 days
  -- PRIVACY: Path only, query params stripped
  -- JUSTIFICATION: Navigation flow analysis

  referrer_url text,
  -- SOURCE: Client-side document.referrer (domain + path only)
  -- RETENTION: 30 days
  -- PRIVACY: Stripped of PII/tokens

  -- Performance metrics
  duration_ms integer,
  -- SOURCE: Client-side performance.now() delta
  -- RETENTION: 30 days
  -- PRIVACY: No PII
  -- JUSTIFICATION: Page performance optimization

  -- Event payload (sanitized)
  payload jsonb DEFAULT '{}',
  -- SOURCE: Application-specific data
  -- RETENTION: 30 days
  -- PRIVACY: MUST be sanitized before insert (no PII/secrets)
  -- ALLOWED KEYS: step, field_count, scroll_depth, button_id, form_field
  -- EXAMPLES: {'step': 2, 'field_count': 5}, {'scroll_depth': 75}
  -- JUSTIFICATION: Event-specific context for analysis

  -- Constraints
  CONSTRAINT fk_session FOREIGN KEY (session_id)
    REFERENCES public.client_sessions(session_id) ON DELETE CASCADE,

  CONSTRAINT fk_trace FOREIGN KEY (trace_id)
    REFERENCES public.telemetry_requests(trace_id) ON DELETE SET NULL,

  CONSTRAINT chk_event_type CHECK (
    event_type IN ('page_view', 'form_start', 'form_step', 'form_abandon', 'form_interaction', 'button_click', 'form_submit')
  )
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_telemetry_events_session
  ON public.client_telemetry_events(session_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_telemetry_events_type
  ON public.client_telemetry_events(event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_telemetry_events_created
  ON public.client_telemetry_events(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_telemetry_events_trace
  ON public.client_telemetry_events(trace_id)
  WHERE trace_id IS NOT NULL;

-- RLS Policies
ALTER TABLE public.client_telemetry_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access"
  ON public.client_telemetry_events
  FOR ALL
  TO service_role
  USING (true);

CREATE POLICY "Admin read access"
  ON public.client_telemetry_events
  FOR SELECT
  TO authenticated
  USING (true);

-- ============================================================================
-- CLEANUP FUNCTION
-- Purpose: Remove expired sessions and old events (privacy compliance)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.cleanup_client_sessions()
RETURNS TABLE(
  operation text,
  rows_affected bigint
) AS $$
DECLARE
  deleted_sessions bigint;
  deleted_events bigint;
  cleared_ips bigint;
BEGIN
  -- 1. Delete expired sessions (cascade deletes events via FK)
  DELETE FROM public.client_sessions
  WHERE expires_at < now();
  GET DIAGNOSTICS deleted_sessions = ROW_COUNT;

  -- 2. Delete old events (redundant due to CASCADE, but explicit for clarity)
  DELETE FROM public.client_telemetry_events
  WHERE created_at < now() - INTERVAL '30 days';
  GET DIAGNOSTICS deleted_events = ROW_COUNT;

  -- 3. Clear IP/UA hashes after 30 days (PRIVACY: aggressive cleanup)
  UPDATE public.client_sessions
  SET ip_hash = NULL, ua_hash = NULL
  WHERE last_activity_at < now() - INTERVAL '30 days'
    AND ip_hash IS NOT NULL;
  GET DIAGNOSTICS cleared_ips = ROW_COUNT;

  RETURN QUERY
  SELECT 'deleted_expired_sessions'::text, deleted_sessions
  UNION ALL
  SELECT 'deleted_old_events'::text, deleted_events
  UNION ALL
  SELECT 'cleared_ip_hashes'::text, cleared_ips;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE public.client_sessions IS
'Privacy-by-design session tracking. Pseudonymous until voluntary linkage. Retention: 90d sessions, 30d IP hashes.';

COMMENT ON TABLE public.client_telemetry_events IS
'Behavior event tracking linked to sessions. Retention: 30d. Payload MUST be sanitized (no PII).';

COMMENT ON FUNCTION public.cleanup_client_sessions() IS
'Cleanup expired sessions + old events + IP hashes. Run daily via cron. Ensures privacy compliance.';

COMMENT ON COLUMN public.client_sessions.session_id IS
'Source: crypto.randomBytes(32).hex(). Retention: 90d. Privacy: Pseudonymous.';

COMMENT ON COLUMN public.client_sessions.client_id IS
'Source: Voluntary event link. Retention: Permanent. Privacy: NULL until consent.';

COMMENT ON COLUMN public.client_sessions.ip_hash IS
'Source: SHA256(IP+salt). Retention: 30d. Privacy: Hashed, NOT reversible.';

COMMENT ON COLUMN public.client_sessions.ua_hash IS
'Source: SHA256(UA+salt). Retention: 30d. Privacy: Hashed, NOT reversible.';

COMMENT ON COLUMN public.client_telemetry_events.payload IS
'Source: App code. Retention: 30d. Privacy: SANITIZED, no PII/secrets. Whitelist: step, field_count, scroll_depth, button_id.';
