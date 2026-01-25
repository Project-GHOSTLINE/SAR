/**
 * Check Last Telemetry Events
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function checkLastEvents() {
  console.log('📊 DERNIERS ÉVÉNEMENTS TÉLÉMÉTRIE');
  console.log('='.repeat(80));
  console.log('');

  const { data, error } = await supabase
    .from('client_telemetry_events')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);

  if (error) {
    console.error('❌ Erreur:', error.message);
    return;
  }

  if (!data || data.length === 0) {
    console.log('⚠️  Aucun événement trouvé');
    return;
  }

  data.forEach((event, i) => {
    console.log(`[${i + 1}] ${event.event_type.toUpperCase()} → ${event.event_name}`);
    console.log(`    Session: ${event.session_id.substring(0, 20)}...`);
    console.log(`    Time: ${new Date(event.created_at).toLocaleString('fr-CA')}`);
    if (event.payload && Object.keys(event.payload).length > 0) {
      console.log(`    Payload: ${JSON.stringify(event.payload)}`);
    }
    console.log('');
  });

  console.log('='.repeat(80));
}

checkLastEvents().catch(console.error);
