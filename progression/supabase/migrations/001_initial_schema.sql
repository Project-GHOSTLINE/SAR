-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Applications table
CREATE TABLE IF NOT EXISTS applications (
  id TEXT PRIMARY KEY,
  origin TEXT,
  name TEXT,
  email TEXT,
  phone TEXT,
  amount_cents INT,
  status TEXT NOT NULL,
  status_updated_at TIMESTAMPTZ DEFAULT now(),
  first_payment_date DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Application events table
CREATE TABLE IF NOT EXISTS application_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id TEXT NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  payload JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Magic links table
CREATE TABLE IF NOT EXISTS magic_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id TEXT NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  token_hash TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  max_uses INT DEFAULT 20,
  uses INT DEFAULT 0,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  last_used_at TIMESTAMPTZ
);

-- Client notes table
CREATE TABLE IF NOT EXISTS client_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id TEXT NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  visible_to_client BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);
CREATE INDEX IF NOT EXISTS idx_applications_created_at ON applications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_application_events_application_id ON application_events(application_id);
CREATE INDEX IF NOT EXISTS idx_application_events_created_at ON application_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_magic_links_token_hash ON magic_links(token_hash);
CREATE INDEX IF NOT EXISTS idx_magic_links_application_id ON magic_links(application_id);
CREATE INDEX IF NOT EXISTS idx_magic_links_expires_at ON magic_links(expires_at);
CREATE INDEX IF NOT EXISTS idx_client_notes_application_id ON client_notes(application_id);
CREATE INDEX IF NOT EXISTS idx_client_notes_visible ON client_notes(visible_to_client, application_id);

-- Add comment for documentation
COMMENT ON TABLE applications IS 'Client loan applications';
COMMENT ON TABLE application_events IS 'Event log for application state changes';
COMMENT ON TABLE magic_links IS 'Temporary access tokens for client portal';
COMMENT ON TABLE client_notes IS 'Messages visible to clients in their portal';
