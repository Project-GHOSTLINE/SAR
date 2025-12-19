import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://dllyzfuqjzuhvshrlmuq.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRsbHl6ZnVxanp1aHZzaHJsbXVxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTk5NTk4MSwiZXhwIjoyMDgxNTcxOTgxfQ.Qg5eQwDxeAtTDXplNkQZa4hOp_dSMBIu_DKbuquryFo'

const supabase = createClient(supabaseUrl, supabaseKey)

console.log('Creating WebAuthn tables...')

// Create webauthn_credentials table
const { error: error1 } = await supabase.rpc('exec_sql', {
  sql: `
    CREATE TABLE IF NOT EXISTS webauthn_credentials (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      credential_id TEXT UNIQUE NOT NULL,
      public_key TEXT NOT NULL,
      counter INTEGER DEFAULT 0,
      email TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      last_used_at TIMESTAMPTZ
    );
  `
})

if (error1) {
  console.log('Note: RPC not available, trying direct table creation...')

  // Try to insert a test record to see if table exists
  const { error: testError } = await supabase
    .from('webauthn_credentials')
    .select('*')
    .limit(1)

  if (testError && testError.code === '42P01') {
    console.log('Tables do not exist. Please run the following SQL in Supabase SQL Editor:')
    console.log(`
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

CREATE INDEX IF NOT EXISTS idx_webauthn_credentials_email ON webauthn_credentials(email);
CREATE INDEX IF NOT EXISTS idx_webauthn_credentials_credential_id ON webauthn_credentials(credential_id);

-- WebAuthn challenges table
CREATE TABLE IF NOT EXISTS webauthn_challenges (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  challenge_key TEXT UNIQUE NOT NULL,
  challenge TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
    `)
  } else if (testError) {
    console.log('Error:', testError.message)
  } else {
    console.log('webauthn_credentials table already exists!')
  }

  // Check challenges table
  const { error: testError2 } = await supabase
    .from('webauthn_challenges')
    .select('*')
    .limit(1)

  if (testError2 && testError2.code === '42P01') {
    console.log('webauthn_challenges table does not exist')
  } else if (!testError2) {
    console.log('webauthn_challenges table already exists!')
  }
} else {
  console.log('Tables created successfully!')
}
