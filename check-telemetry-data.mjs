#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://dllyzfuqjzuhvshrlmuq.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRsbHl6ZnVxanp1aHZzaHJsbXVxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTk5NTk4MSwiZXhwIjoyMDgxNTcxOTgxfQ.Qg5eQwDxeAtTDXplNkQZa4hOp_dSMBIu_DKbuquryFo'
);

console.log('🔍 Checking telemetry data...\n');

// Check sessions
const { data: sessions, error: sessionsError } = await supabase
  .from('client_sessions')
  .select('session_id, created_at, ip_hash, country_code')
  .order('created_at', { ascending: false })
  .limit(10);

console.log('📍 Recent Sessions:', sessions?.length || 0);
if (sessions) sessions.forEach(s => console.log('  -', s.session_id.substring(0, 20) + '...', s.country_code || 'N/A', s.created_at));

// Check events
const { data: events, error: eventsError } = await supabase
  .from('client_telemetry_events')
  .select('id, event_type, event_name, created_at')
  .order('created_at', { ascending: false })
  .limit(10);

console.log('\n📊 Recent Events:', events?.length || 0);
if (events) events.forEach(e => console.log('  -', e.event_type, '→', e.event_name, '@', e.created_at));

if (sessionsError) console.error('\n❌ Sessions error:', sessionsError);
if (eventsError) console.error('\n❌ Events error:', eventsError);

console.log('\n✅ Data check complete!');
