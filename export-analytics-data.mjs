#!/usr/bin/env node
/**
 * Export all analytics data to JSON for analysis
 */

const BASE_URL = 'https://admin.solutionargentrapide.ca';

const endpoints = [
  'funnel',
  'timeline',
  'abandons',
  'journeys',
  'sources',
  'pages',
  'sessions',
  'heatmap',
  'ip-details',
  'page-flow',
  'referrers',
  'metrics'
];

console.log('📊 Fetching analytics data from all endpoints...\n');

const data = {
  exported_at: new Date().toISOString(),
  endpoints: {}
};

for (const endpoint of endpoints) {
  try {
    console.log(`🔄 Fetching /api/analytics/${endpoint}...`);
    const response = await fetch(`${BASE_URL}/api/analytics/${endpoint}`);

    if (!response.ok) {
      console.log(`   ❌ Error ${response.status}`);
      data.endpoints[endpoint] = { error: response.status };
      continue;
    }

    const json = await response.json();
    data.endpoints[endpoint] = json;

    const count = json.data?.length || 0;
    console.log(`   ✅ Success (${count} items)`);
  } catch (error) {
    console.log(`   ❌ Failed: ${error.message}`);
    data.endpoints[endpoint] = { error: error.message };
  }
}

// Save to file
import { writeFileSync } from 'fs';
const outputPath = '/Users/xunit/Desktop/analytics-data-export.json';
writeFileSync(outputPath, JSON.stringify(data, null, 2), 'utf-8');

console.log(`\n✅ Data exported to: ${outputPath}`);
console.log('\n📊 Summary:');
console.log('-----------------------------------');

for (const [endpoint, result] of Object.entries(data.endpoints)) {
  if (result.error) {
    console.log(`❌ ${endpoint}: ERROR`);
  } else {
    const count = result.data?.length || 0;
    console.log(`✅ ${endpoint}: ${count} items`);
  }
}

console.log('-----------------------------------\n');
