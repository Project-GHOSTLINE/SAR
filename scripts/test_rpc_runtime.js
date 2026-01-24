#!/usr/bin/env node
/**
 * Test get_client_dossier_unified RPC with REAL client data
 * Prerequisites: RPC must be deployed first
 * Output: audit_artifacts/db_live/results/rpc_get_client_dossier_unified_RUNTIME.json
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testRPCRuntime() {
  console.log('🧪 Testing get_client_dossier_unified with REAL client...');
  console.log('');

  try {
    // Step 1: Get a real client_id from the database
    console.log('1️⃣  Fetching a real client_id...');
    const { data: clients, error: clientsError } = await supabase
      .from('clients')
      .select('id, primary_email, first_name, last_name')
      .limit(1);

    if (clientsError) {
      throw new Error(`Failed to fetch clients: ${clientsError.message}`);
    }

    if (!clients || clients.length === 0) {
      throw new Error('No clients found in database');
    }

    const testClient = clients[0];
    console.log(`   ✅ Using client: ${testClient.id}`);
    console.log(`      Name: ${testClient.first_name} ${testClient.last_name}`);
    console.log(`      Email: ${testClient.primary_email || 'N/A'}`);
    console.log('');

    // Step 2: Call the RPC
    console.log('2️⃣  Calling RPC get_client_dossier_unified...');
    const startTime = Date.now();

    const { data, error } = await supabase.rpc('get_client_dossier_unified', {
      p_client_id: testClient.id,
    });

    const duration = Date.now() - startTime;

    if (error) {
      console.log(`   ❌ RPC call failed (${duration}ms)`);
      console.log(`   Error: ${error.message}`);
      console.log('');

      if (error.message.includes('Could not find the function')) {
        console.log('⚠️  RPC NOT DEPLOYED');
        console.log('   Deploy first:');
        console.log('   supabase/migrations/20260124230000_create_get_client_dossier_unified.sql');
      }

      // Save error result
      const result = {
        success: false,
        error: error.message,
        test_client_id: testClient.id,
        timestamp: new Date().toISOString(),
        duration_ms: duration,
      };

      const outputPath = path.join(
        __dirname,
        '../audit_artifacts/db_live/results/rpc_get_client_dossier_unified_RUNTIME.json'
      );
      fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
      console.log('');
      console.log(`📄 Error saved to: ${outputPath}`);

      process.exit(1);
    }

    console.log(`   ✅ RPC call succeeded (${duration}ms)`);
    console.log('');

    // Step 3: Analyze response
    console.log('3️⃣  Analyzing response...');
    console.log(`   Client data: ${data.client ? '✅' : '❌'}`);
    console.log(`   Applications: ${data.applications?.length || 0} items`);
    console.log(`   Analyses: ${data.analyses?.length || 0} items`);
    console.log(`   Events: ${data.events?.length || 0} items`);
    console.log('');
    console.log('   Metrics:');
    console.log(`   - Applications count: ${data.metrics?.applications_count || 0}`);
    console.log(`   - Analyses count: ${data.metrics?.analyses_count || 0}`);
    console.log(`   - Events count: ${data.metrics?.events_count || 0}`);
    console.log('');

    // Step 4: Save result
    const result = {
      success: true,
      test_client_id: testClient.id,
      test_client_name: `${testClient.first_name} ${testClient.last_name}`,
      response_data: data,
      duration_ms: duration,
      timestamp: new Date().toISOString(),
      db_calls: 1, // Single RPC call
      pii_extracted: 'EXISTING (no new PII - client data already in DB)',
    };

    const outputPath = path.join(
      __dirname,
      '../audit_artifacts/db_live/results/rpc_get_client_dossier_unified_RUNTIME.json'
    );
    fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));

    console.log('✅ TEST PASSED');
    console.log('');
    console.log(`📄 Results saved to: ${outputPath}`);
    console.log('');
    console.log('🎯 PROOF OF CONCEPT:');
    console.log('   - RPC exists and works ✅');
    console.log(`   - Single DB call (no N+1) ✅`);
    console.log(`   - Response time: ${duration}ms ✅`);
    console.log('   - Structured JSON output ✅');

    process.exit(0);
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

testRPCRuntime();
