/**
 * Check Last Session Created
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function checkLastSession() {
  console.log('📊 DERNIÈRE SESSION CRÉÉE');
  console.log('='.repeat(80));
  console.log('');

  const { data, error } = await supabase
    .from('client_sessions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1);

  if (error) {
    console.error('❌ Erreur:', error.message);
    return;
  }

  if (!data || data.length === 0) {
    console.log('⚠️  Aucune session trouvée');
    return;
  }

  const session = data[0];

  console.log('✅ Session trouvée:');
  console.log('');
  console.log('Session ID:', session.session_id);
  console.log('');

  console.log('📍 ATTRIBUTION (Google Ads):');
  console.log('  Referrer:      ', session.first_referrer || '(null)');
  console.log('  UTM Source:    ', session.first_utm_source || '(null)');
  console.log('  UTM Medium:    ', session.first_utm_medium || '(null)');
  console.log('  UTM Campaign:  ', session.first_utm_campaign || '(null)');
  console.log('');

  console.log('💻 DEVICE (Server-Parsed):');
  console.log('  Device Type:', session.device_type || '(null)');
  console.log('  Browser:    ', session.browser || '(null)');
  console.log('  OS:         ', session.os || '(null)');
  console.log('');

  console.log('🔒 SECURITY (Phase 2):');
  console.log('  IP Hash:     ', session.ip_hash || '(null)');
  console.log('  UA Hash:     ', session.ua_hash || '(null)');
  console.log('  ASN:         ', session.asn || '(null)');
  console.log('  Country:     ', session.country_code || '(null)');
  console.log('  IP Prefix:   ', session.ip_prefix || '(null)');
  console.log('');

  console.log('👤 CLIENT:');
  console.log('  Client ID:   ', session.client_id || '(null - anonyme)');
  console.log('  Linked Via:  ', session.linked_via || '(null)');
  console.log('  Linked At:   ', session.linked_at || '(null)');
  console.log('');

  console.log('⏰ TIMING:');
  console.log('  Created:     ', new Date(session.created_at).toLocaleString('fr-CA'));
  console.log('  Last Activity:', new Date(session.last_activity_at).toLocaleString('fr-CA'));
  console.log('  Expires:     ', new Date(session.expires_at).toLocaleString('fr-CA'));
  console.log('');

  console.log('='.repeat(80));
}

checkLastSession().catch(console.error);
