-- WebAuthn credentials table
CREATE TABLE IF NOT EXISTS webauthn_credentials (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  credential_id TEXT UNIQUE NOT NULL,
  public_key TEXT NOT NULL,
  counter INTEGER DEFAULT 0,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_used_at TIMESTAMPTZ
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_webauthn_credentials_email ON webauthn_credentials(email);
CREATE INDEX IF NOT EXISTS idx_webauthn_credentials_credential_id ON webauthn_credentials(credential_id);

-- WebAuthn challenges table (temporary storage)
CREATE TABLE IF NOT EXISTS webauthn_challenges (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  challenge_key TEXT UNIQUE NOT NULL,
  challenge TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-delete expired challenges (older than 5 minutes)
CREATE OR REPLACE FUNCTION delete_expired_challenges()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM webauthn_challenges WHERE created_at < NOW() - INTERVAL '5 minutes';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to clean up on insert
DROP TRIGGER IF EXISTS cleanup_challenges ON webauthn_challenges;
CREATE TRIGGER cleanup_challenges
  AFTER INSERT ON webauthn_challenges
  EXECUTE FUNCTION delete_expired_challenges();
