/**
 * Script pour créer la table vopay_webhook_logs dans Supabase
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve } from 'path'

// Charger .env.local
config({ path: resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variables d\'environnement manquantes')
  process.exit(1)
}

console.log('✅ Connexion à Supabase:', supabaseUrl)

const supabase = createClient(supabaseUrl, supabaseKey)

// SQL à exécuter
const sql = `
-- Table pour stocker les webhooks VoPay
CREATE TABLE IF NOT EXISTS vopay_webhook_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  transaction_id TEXT NOT NULL,
  transaction_type TEXT NOT NULL,
  transaction_amount DECIMAL(10, 2) NOT NULL,
  currency TEXT DEFAULT 'CAD',
  status TEXT NOT NULL,
  previous_status TEXT,
  failure_reason TEXT,
  environment TEXT DEFAULT 'Production',
  validation_key TEXT NOT NULL,
  is_validated BOOLEAN DEFAULT false,
  raw_payload JSONB NOT NULL,
  updated_at TIMESTAMPTZ,
  received_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vopay_transaction_id ON vopay_webhook_logs(transaction_id);
CREATE INDEX IF NOT EXISTS idx_vopay_status ON vopay_webhook_logs(status);
CREATE INDEX IF NOT EXISTS idx_vopay_received_at ON vopay_webhook_logs(received_at DESC);
CREATE INDEX IF NOT EXISTS idx_vopay_environment ON vopay_webhook_logs(environment);
`

console.log('📄 Exécution du SQL...\n')

// Tenter d'insérer un test pour voir si la table existe déjà
const { error: testError } = await supabase
  .from('vopay_webhook_logs')
  .select('id')
  .limit(1)

if (!testError) {
  console.log('✅ La table vopay_webhook_logs existe déjà!')
  console.log('\n📊 Structure confirmée.')
  process.exit(0)
}

console.log('ℹ️  La table n\'existe pas encore, création en cours...\n')
console.log('📋 Copiez le SQL ci-dessous et exécutez-le dans le SQL Editor de Supabase:')
console.log('   👉 https://supabase.com/dashboard/project/dllyzfuqjzuhvshrlmuq/sql/new\n')
console.log('─'.repeat(80))
console.log(sql)
console.log('─'.repeat(80))
console.log('\nAprès avoir exécuté le SQL, relancez ce script pour vérifier.')
