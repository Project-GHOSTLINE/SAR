const fs = require('fs');
const path = require('path');

const catalogPath = path.join(__dirname, '../src/data/api-catalog.generated.json');
const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf-8'));

console.log('📊 ANALYSE DES TABLES BD PAR API\n');
console.log('=' .repeat(100));

// Group routes by base path
const apiGroups = {};

catalog.routes.forEach(route => {
  // Extract base API path (e.g., /api/telemetry from /api/telemetry/track-event)
  const parts = route.path.split('/').filter(p => p);
  const baseApi = parts.length >= 2 ? `/${parts[0]}/${parts[1]}` : route.path;

  if (!apiGroups[baseApi]) {
    apiGroups[baseApi] = {
      routes: [],
      allTables: new Set(),
      totalDbCalls: 0,
      externalServices: new Set()
    };
  }

  apiGroups[baseApi].routes.push(route);
  route.tablesTouched.forEach(t => apiGroups[baseApi].allTables.add(t));
  route.externalCalls.forEach(s => apiGroups[baseApi].externalServices.add(s));
});

// Sort by number of tables
const sortedGroups = Object.entries(apiGroups)
  .sort((a, b) => b[1].allTables.size - a[1].allTables.size);

// Print detailed report
sortedGroups.forEach(([apiPath, data], index) => {
  const tables = Array.from(data.allTables);
  const services = Array.from(data.externalServices);

  console.log(`\n${index + 1}. 📡 ${apiPath}`);
  console.log('─'.repeat(100));

  console.log(`   Routes: ${data.routes.length}`);
  console.log(`   Tables BD: ${tables.length}`);
  console.log(`   Services externes: ${services.length}`);

  if (tables.length > 0) {
    console.log(`\n   🗄️  Tables utilisées:`);
    tables.forEach(table => {
      // Count how many routes use this table
      const routeCount = data.routes.filter(r => r.tablesTouched.includes(table)).length;
      console.log(`      • ${table.padEnd(35)} (${routeCount} route${routeCount > 1 ? 's' : ''})`);
    });
  }

  if (services.length > 0) {
    console.log(`\n   🌐 Services externes:`);
    services.forEach(service => {
      console.log(`      • ${service}`);
    });
  }

  console.log(`\n   📋 Routes détaillées:`);
  data.routes.forEach(route => {
    const methods = route.methods.join(', ');
    console.log(`      ${methods.padEnd(20)} ${route.path}`);
    if (route.tablesTouched.length > 0) {
      console.log(`                           └─ Tables: ${route.tablesTouched.join(', ')}`);
    }
  });
});

// Summary statistics
console.log('\n\n' + '='.repeat(100));
console.log('📈 RÉSUMÉ GLOBAL\n');

// Top tables overall
const globalTableCounts = {};
catalog.routes.forEach(route => {
  route.tablesTouched.forEach(table => {
    globalTableCounts[table] = (globalTableCounts[table] || 0) + 1;
  });
});

const topTables = Object.entries(globalTableCounts)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 15);

console.log('🏆 TOP 15 TABLES LES PLUS UTILISÉES:\n');
topTables.forEach(([table, count], i) => {
  const bar = '█'.repeat(Math.ceil(count / 2));
  console.log(`${(i + 1).toString().padStart(2)}. ${table.padEnd(35)} ${count.toString().padStart(3)} routes ${bar}`);
});

// API groups by table count
console.log('\n\n🎯 GROUPES D\'API PAR INTENSITÉ BD:\n');

const heavy = sortedGroups.filter(([_, d]) => d.allTables.size >= 5);
const medium = sortedGroups.filter(([_, d]) => d.allTables.size >= 2 && d.allTables.size < 5);
const light = sortedGroups.filter(([_, d]) => d.allTables.size === 1);
const none = sortedGroups.filter(([_, d]) => d.allTables.size === 0);

console.log(`🔴 Heavy (5+ tables):   ${heavy.length} groupes`);
heavy.slice(0, 5).forEach(([path, data]) => {
  console.log(`   • ${path} (${data.allTables.size} tables, ${data.routes.length} routes)`);
});

console.log(`\n🟡 Medium (2-4 tables): ${medium.length} groupes`);
medium.slice(0, 5).forEach(([path, data]) => {
  console.log(`   • ${path} (${data.allTables.size} tables, ${data.routes.length} routes)`);
});

console.log(`\n🟢 Light (1 table):     ${light.length} groupes`);
console.log(`⚪ No DB (0 tables):    ${none.length} groupes`);

// External services summary
const globalServices = {};
catalog.routes.forEach(route => {
  route.externalCalls.forEach(service => {
    globalServices[service] = (globalServices[service] || 0) + 1;
  });
});

if (Object.keys(globalServices).length > 0) {
  console.log('\n\n🌐 SERVICES EXTERNES:\n');
  Object.entries(globalServices)
    .sort((a, b) => b[1] - a[1])
    .forEach(([service, count]) => {
      console.log(`   • ${service.padEnd(30)} ${count} routes`);
    });
}

console.log('\n' + '='.repeat(100));
console.log(`\n✅ Analyse terminée: ${catalog.totalRoutes} routes, ${Object.keys(globalTableCounts).length} tables uniques\n`);
