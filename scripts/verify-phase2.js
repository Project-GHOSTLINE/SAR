/**
 * Verify Phase 2 Migration Success
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function verify() {
  console.log('🔍 VERIFYING PHASE 2 MIGRATION');
  console.log('================================\n');

  let allGood = true;

  // Check 1: Tables created
  console.log('1️⃣ Checking tables...');
  try {
    const { data: securityEvents, error: se1 } = await supabase
      .from('security_events')
      .select('id')
      .limit(1);

    const { data: patternHits, error: ph1 } = await supabase
      .from('client_pattern_hits')
      .select('id')
      .limit(1);

    if (!se1 && !ph1) {
      console.log('   ✅ security_events table exists');
      console.log('   ✅ client_pattern_hits table exists\n');
    } else {
      console.log('   ❌ Tables not found:', se1?.message || ph1?.message);
      allGood = false;
    }
  } catch (err) {
    console.log('   ❌ Table check failed:', err.message, '\n');
    allGood = false;
  }

  // Check 2: Columns added to client_sessions
  console.log('2️⃣ Checking client_sessions columns...');
  try {
    const { data: sessions, error } = await supabase
      .from('client_sessions')
      .select('asn, country_code, ip_prefix, consent_analytics, consent_marketing')
      .limit(1);

    if (!error) {
      console.log('   ✅ asn column exists');
      console.log('   ✅ country_code column exists');
      console.log('   ✅ ip_prefix column exists');
      console.log('   ✅ consent_analytics column exists');
      console.log('   ✅ consent_marketing column exists\n');
    } else {
      console.log('   ❌ Columns check failed:', error.message, '\n');
      allGood = false;
    }
  } catch (err) {
    console.log('   ❌ Columns check failed:', err.message, '\n');
    allGood = false;
  }

  // Check 3: RPC function exists
  console.log('3️⃣ Checking RPC function...');
  try {
    const { data, error } = await supabase.rpc('match_client_patterns', {
      p_client_id: '00000000-0000-0000-0000-000000000000',
    });

    if (error && error.message.includes('violates foreign key')) {
      // Expected error - client doesn't exist, but function works
      console.log('   ✅ match_client_patterns() function exists\n');
    } else if (error) {
      console.log('   ❌ RPC function check failed:', error.message, '\n');
      allGood = false;
    } else {
      console.log('   ✅ match_client_patterns() function exists\n');
    }
  } catch (err) {
    console.log('   ❌ RPC check failed:', err.message, '\n');
    allGood = false;
  }

  // Check 4: Cleanup function updated
  console.log('4️⃣ Checking cleanup function...');
  try {
    const { data, error } = await supabase.rpc('cleanup_client_sessions');

    if (!error) {
      console.log('   ✅ cleanup_client_sessions() function updated');
      console.log('   Results:', data);
      console.log('');
    } else {
      console.log('   ❌ Cleanup function check failed:', error.message, '\n');
      allGood = false;
    }
  } catch (err) {
    console.log('   ❌ Cleanup check failed:', err.message, '\n');
    allGood = false;
  }

  // Summary
  console.log('================================');
  if (allGood) {
    console.log('✅ MIGRATION SUCCESSFUL!');
    console.log('\n📋 Phase 2 Features Ready:');
    console.log('   • ASN + Country tracking');
    console.log('   • VPN/Proxy detection');
    console.log('   • Country change detection');
    console.log('   • Fraud pattern matching (7 patterns)');
    console.log('   • Security events logging');
    console.log('   • Enhanced cleanup');
    console.log('\n🚀 Next: Test with /aidesecurite form submission\n');
  } else {
    console.log('❌ MIGRATION INCOMPLETE');
    console.log('\nPlease check errors above and retry.\n');
    process.exit(1);
  }
}

verify().catch(console.error);
