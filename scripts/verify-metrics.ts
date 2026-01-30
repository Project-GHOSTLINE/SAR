/**
 * VERIFICATION SCRIPT - Check All Metrics in Database
 * Run after Playwright test to verify all data is captured
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface MetricsReport {
  test_name: string;
  status: 'PASS' | 'FAIL' | 'WARN';
  details: string;
  data?: any;
}

const reports: MetricsReport[] = [];

function log(test: string, status: 'PASS' | 'FAIL' | 'WARN', details: string, data?: any) {
  const emoji = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️';
  console.log(`${emoji} ${test}: ${details}`);
  if (data) console.log('   Data:', JSON.stringify(data, null, 2));
  reports.push({ test_name: test, status, details, data });
}

async function verifyMetrics() {
  console.log('\n🔍 VERIFICATION DES METRICS - Audit Complet\n');
  console.log('═'.repeat(80));

  // Test 1: Recent telemetry_requests with meta_redacted
  console.log('\n📊 Test 1: Telemetry Requests - Device Info');
  const { data: requests, error: reqError } = await supabase
    .from('telemetry_requests')
    .select('id, created_at, path, ip, meta_redacted')
    .eq('env', 'production')
    .gte('created_at', new Date(Date.now() - 3600000).toISOString())
    .order('created_at', { ascending: false })
    .limit(5);

  if (reqError) {
    log('Telemetry Requests', 'FAIL', reqError.message);
  } else if (!requests || requests.length === 0) {
    log('Telemetry Requests', 'WARN', 'No recent requests found (last hour)');
  } else {
    const withMeta = requests.filter(r => r.meta_redacted && Object.keys(r.meta_redacted).length > 0);
    const sample = withMeta[0];

    if (withMeta.length > 0 && sample?.meta_redacted) {
      log('Telemetry Requests', 'PASS', `${withMeta.length}/${requests.length} requests have device info`, {
        sample_id: sample.id,
        device: sample.meta_redacted.device,
        browser: sample.meta_redacted.browser,
        os: sample.meta_redacted.os,
        browser_version: sample.meta_redacted.browser_version,
        os_version: sample.meta_redacted.os_version,
      });
    } else {
      log('Telemetry Requests', 'FAIL', 'No requests have meta_redacted populated');
    }
  }

  // Test 2: Telemetry Events
  console.log('\n📊 Test 2: Telemetry Events');
  const { data: events, error: evError } = await supabase
    .from('telemetry_events')
    .select('id, visit_id, event_name, page_path, device, utm, created_at')
    .gte('created_at', new Date(Date.now() - 3600000).toISOString())
    .order('created_at', { ascending: false })
    .limit(10);

  if (evError) {
    log('Telemetry Events', 'FAIL', evError.message);
  } else if (!events || events.length === 0) {
    log('Telemetry Events', 'WARN', 'No recent events (last hour)');
  } else {
    const withDevice = events.filter(e => e.device && Object.keys(e.device).length > 0);
    const withUtm = events.filter(e => e.utm && Object.keys(e.utm).length > 0);
    log('Telemetry Events', 'PASS', `${events.length} events found`, {
      total: events.length,
      with_device: withDevice.length,
      with_utm: withUtm.length,
      event_types: [...new Set(events.map(e => e.event_name))],
    });
  }

  // Test 3: Network Correlation View
  console.log('\n📊 Test 3: Network Correlation View');
  const { data: correlation, error: corrError } = await supabase
    .from('network_correlation')
    .select('*')
    .gte('first_seen', new Date(Date.now() - 3600000).toISOString())
    .order('first_seen', { ascending: false })
    .limit(5);

  if (corrError) {
    log('Network Correlation', 'FAIL', corrError.message);
  } else if (!correlation || correlation.length === 0) {
    log('Network Correlation', 'WARN', 'No recent correlations');
  } else {
    const sample = correlation[0];
    log('Network Correlation', 'PASS', `${correlation.length} correlations found`, {
      total_requests: sample.total_requests,
      total_events: sample.total_events,
      correlation_score: sample.correlation_score,
      device_type: sample.device_type,
      browser: sample.browser,
      os: sample.os,
    });
  }

  // Test 4: Fraud Detection Live
  console.log('\n📊 Test 4: Fraud Detection Live');
  const { data: fraud, error: fraudError } = await supabase
    .from('fraud_detection_live')
    .select('*')
    .gte('first_seen', new Date(Date.now() - 3600000).toISOString())
    .order('fraud_score', { ascending: false })
    .limit(10);

  if (fraudError) {
    log('Fraud Detection', 'FAIL', fraudError.message);
  } else if (!fraud || fraud.length === 0) {
    log('Fraud Detection', 'WARN', 'No recent fraud detections');
  } else {
    const bots = fraud.filter(f => f.classification === 'BOT');
    const humans = fraud.filter(f => f.classification !== 'BOT' && f.total_events > 0);
    log('Fraud Detection', 'PASS', `${fraud.length} detections`, {
      total: fraud.length,
      bots: bots.length,
      humans: humans.length,
      classifications: [...new Set(fraud.map(f => f.classification))],
    });
  }

  // Test 5: Device Profiles
  console.log('\n📊 Test 5: Device Profiles');
  const { data: devices, error: devError } = await supabase
    .from('device_profiles')
    .select('*')
    .gte('first_seen', new Date(Date.now() - 3600000).toISOString())
    .order('first_seen', { ascending: false })
    .limit(5);

  if (devError) {
    log('Device Profiles', 'FAIL', devError.message);
  } else if (!devices || devices.length === 0) {
    log('Device Profiles', 'WARN', 'No recent device profiles');
  } else {
    const withLabels = devices.filter(d => d.device_label && d.device_label !== 'Unknown Device');
    const sample = devices[0];
    log('Device Profiles', 'PASS', `${devices.length} profiles found`, {
      with_labels: withLabels.length,
      sample_label: sample.device_label,
      sample_browser: sample.browser_label,
      sample_classification: sample.classification,
      sample_fraud_score: sample.fraud_score,
    });
  }

  // Test 6: Visit Timeline
  console.log('\n📊 Test 6: Visit Timeline');
  const { data: timeline, error: timeError } = await supabase
    .from('visit_timeline')
    .select('*')
    .gte('timestamp', new Date(Date.now() - 3600000).toISOString())
    .order('timestamp', { ascending: false })
    .limit(20);

  if (timeError) {
    log('Visit Timeline', 'FAIL', timeError.message);
  } else if (!timeline || timeline.length === 0) {
    log('Visit Timeline', 'WARN', 'No recent timeline events');
  } else {
    const requests = timeline.filter(t => t.event_type === 'http_request');
    const events = timeline.filter(t => t.event_type === 'client_event');
    log('Visit Timeline', 'PASS', `${timeline.length} timeline entries`, {
      total: timeline.length,
      http_requests: requests.length,
      client_events: events.length,
    });
  }

  // Summary
  console.log('\n═'.repeat(80));
  console.log('\n📋 SUMMARY\n');
  const passed = reports.filter(r => r.status === 'PASS').length;
  const failed = reports.filter(r => r.status === 'FAIL').length;
  const warned = reports.filter(r => r.status === 'WARN').length;

  console.log(`✅ PASS: ${passed}`);
  console.log(`❌ FAIL: ${failed}`);
  console.log(`⚠️  WARN: ${warned}`);

  const overallStatus = failed === 0 ? (warned === 0 ? '🎉 PERFECT' : '✅ GOOD') : '❌ ISSUES FOUND';
  console.log(`\n${overallStatus}\n`);

  return { passed, failed, warned, reports };
}

// Run verification
verifyMetrics().catch(console.error);
