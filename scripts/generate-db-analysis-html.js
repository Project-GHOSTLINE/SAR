const fs = require('fs');
const path = require('path');

const catalogPath = path.join(__dirname, '../src/data/api-catalog.generated.json');
const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf-8'));

// Group routes by base path
const apiGroups = {};

catalog.routes.forEach(route => {
  const parts = route.path.split('/').filter(p => p);
  const baseApi = parts.length >= 2 ? `/${parts[0]}/${parts[1]}` : route.path;

  if (!apiGroups[baseApi]) {
    apiGroups[baseApi] = {
      routes: [],
      allTables: new Set(),
      externalServices: new Set()
    };
  }

  apiGroups[baseApi].routes.push(route);
  route.tablesTouched.forEach(t => apiGroups[baseApi].allTables.add(t));
  route.externalCalls.forEach(s => apiGroups[baseApi].externalServices.add(s));
});

// Calculate global stats
const globalTableCounts = {};
catalog.routes.forEach(route => {
  route.tablesTouched.forEach(table => {
    globalTableCounts[table] = (globalTableCounts[table] || 0) + 1;
  });
});

const topTables = Object.entries(globalTableCounts)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 20);

const sortedGroups = Object.entries(apiGroups)
  .sort((a, b) => b[1].allTables.size - a[1].allTables.size);

const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Analyse BD par API - SAR</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
</head>
<body class="bg-gray-50">
  <div class="container mx-auto p-8">
    <!-- Header -->
    <div class="mb-8">
      <h1 class="text-4xl font-bold text-gray-900 mb-2">🗄️ Analyse Tables BD par API</h1>
      <p class="text-gray-600">${catalog.totalRoutes} routes • ${Object.keys(globalTableCounts).length} tables uniques</p>
    </div>

    <!-- Stats -->
    <div class="grid grid-cols-4 gap-4 mb-8">
      <div class="bg-white rounded-lg shadow p-6">
        <div class="text-sm text-gray-600 mb-1">Groupes API</div>
        <div class="text-3xl font-bold text-blue-600">${sortedGroups.length}</div>
      </div>
      <div class="bg-white rounded-lg shadow p-6">
        <div class="text-sm text-gray-600 mb-1">Tables Uniques</div>
        <div class="text-3xl font-bold text-green-600">${Object.keys(globalTableCounts).length}</div>
      </div>
      <div class="bg-white rounded-lg shadow p-6">
        <div class="text-sm text-gray-600 mb-1">Heavy (5+ tables)</div>
        <div class="text-3xl font-bold text-red-600">${sortedGroups.filter(([_, d]) => d.allTables.size >= 5).length}</div>
      </div>
      <div class="bg-white rounded-lg shadow p-6">
        <div class="text-sm text-gray-600 mb-1">Sans DB</div>
        <div class="text-3xl font-bold text-gray-600">${sortedGroups.filter(([_, d]) => d.allTables.size === 0).length}</div>
      </div>
    </div>

    <!-- Top Tables Chart -->
    <div class="bg-white rounded-lg shadow p-6 mb-8">
      <h2 class="text-2xl font-bold mb-4">🏆 Top 20 Tables les Plus Utilisées</h2>
      <div class="h-96">
        <canvas id="tablesChart"></canvas>
      </div>
    </div>

    <!-- Intensity Groups -->
    <div class="grid grid-cols-3 gap-4 mb-8">
      <div class="bg-red-50 border-2 border-red-200 rounded-lg p-6">
        <h3 class="text-lg font-bold text-red-700 mb-2">🔴 Heavy (5+ tables)</h3>
        <div class="text-3xl font-bold text-red-600 mb-4">${sortedGroups.filter(([_, d]) => d.allTables.size >= 5).length}</div>
        ${sortedGroups.filter(([_, d]) => d.allTables.size >= 5).slice(0, 5).map(([path, data]) => `
          <div class="text-sm mb-1">
            <span class="font-mono">${path}</span>
            <span class="text-gray-600"> (${data.allTables.size} tables)</span>
          </div>
        `).join('')}
      </div>

      <div class="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-6">
        <h3 class="text-lg font-bold text-yellow-700 mb-2">🟡 Medium (2-4 tables)</h3>
        <div class="text-3xl font-bold text-yellow-600 mb-4">${sortedGroups.filter(([_, d]) => d.allTables.size >= 2 && d.allTables.size < 5).length}</div>
        ${sortedGroups.filter(([_, d]) => d.allTables.size >= 2 && d.allTables.size < 5).slice(0, 5).map(([path, data]) => `
          <div class="text-sm mb-1">
            <span class="font-mono">${path}</span>
            <span class="text-gray-600"> (${data.allTables.size} tables)</span>
          </div>
        `).join('')}
      </div>

      <div class="bg-green-50 border-2 border-green-200 rounded-lg p-6">
        <h3 class="text-lg font-bold text-green-700 mb-2">🟢 Light (0-1 table)</h3>
        <div class="text-3xl font-bold text-green-600 mb-4">${sortedGroups.filter(([_, d]) => d.allTables.size <= 1).length}</div>
        <div class="text-sm text-gray-600">
          ${sortedGroups.filter(([_, d]) => d.allTables.size === 1).length} avec 1 table<br>
          ${sortedGroups.filter(([_, d]) => d.allTables.size === 0).length} sans DB
        </div>
      </div>
    </div>

    <!-- Search -->
    <div class="bg-white rounded-lg shadow p-4 mb-4">
      <input
        type="text"
        id="search"
        placeholder="🔍 Rechercher par API, table, ou service..."
        class="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
      />
    </div>

    <!-- API Groups List -->
    <div class="bg-white rounded-lg shadow">
      <div class="p-4 border-b bg-gray-50">
        <h2 class="text-xl font-bold">📋 Détails par Groupe API</h2>
        <div id="count" class="text-sm text-gray-600 mt-1"></div>
      </div>
      <div id="groups" class="divide-y"></div>
    </div>
  </div>

  <script>
    const apiGroups = ${JSON.stringify(sortedGroups.map(([path, data]) => ({
      path,
      routes: data.routes.length,
      tables: Array.from(data.allTables),
      services: Array.from(data.externalServices)
    })))};

    const topTables = ${JSON.stringify(topTables)};

    // Chart
    new Chart(document.getElementById('tablesChart'), {
      type: 'bar',
      data: {
        labels: topTables.map(([name]) => name),
        datasets: [{
          label: 'Nombre de routes',
          data: topTables.map(([_, count]) => count),
          backgroundColor: 'rgba(59, 130, 246, 0.5)',
          borderColor: 'rgb(59, 130, 246)',
          borderWidth: 1
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        }
      }
    });

    // Render groups
    function renderGroups(groups) {
      const groupsDiv = document.getElementById('groups');
      const countDiv = document.getElementById('count');
      countDiv.textContent = groups.length + ' groupes affichés';

      groupsDiv.innerHTML = groups.map((group, i) => {
        const intensity = group.tables.length >= 5 ? 'red' :
                         group.tables.length >= 2 ? 'yellow' : 'green';
        const intensityColors = {
          red: 'bg-red-50 border-red-200 text-red-700',
          yellow: 'bg-yellow-50 border-yellow-200 text-yellow-700',
          green: 'bg-green-50 border-green-200 text-green-700'
        };

        return \`
          <div class="p-6 hover:bg-gray-50">
            <div class="flex items-start justify-between mb-4">
              <div class="flex-1">
                <div class="flex items-center gap-3 mb-2">
                  <span class="text-2xl font-bold text-gray-700">\${i + 1}.</span>
                  <code class="text-lg font-bold text-blue-600">\${group.path}</code>
                  <span class="px-3 py-1 text-xs font-bold rounded border-2 \${intensityColors[intensity]}">
                    \${group.tables.length} tables
                  </span>
                </div>
                <div class="text-sm text-gray-600">
                  \${group.routes} routes • \${group.services.length} services externes
                </div>
              </div>
            </div>

            \${group.tables.length > 0 ? \`
              <div class="mb-4">
                <h4 class="text-sm font-semibold text-gray-700 mb-2">🗄️ Tables BD (\${group.tables.length}):</h4>
                <div class="flex flex-wrap gap-2">
                  \${group.tables.map(table => \`
                    <span class="px-3 py-1 bg-blue-50 text-blue-700 text-sm rounded font-mono">
                      \${table}
                    </span>
                  \`).join('')}
                </div>
              </div>
            \` : ''}

            \${group.services.length > 0 ? \`
              <div>
                <h4 class="text-sm font-semibold text-gray-700 mb-2">🌐 Services Externes:</h4>
                <div class="flex flex-wrap gap-2">
                  \${group.services.map(service => \`
                    <span class="px-3 py-1 bg-orange-50 text-orange-700 text-sm rounded">
                      \${service}
                    </span>
                  \`).join('')}
                </div>
              </div>
            \` : ''}
          </div>
        \`;
      }).join('');
    }

    // Initial render
    renderGroups(apiGroups);

    // Search
    document.getElementById('search').addEventListener('input', (e) => {
      const query = e.target.value.toLowerCase().trim();
      if (!query) {
        renderGroups(apiGroups);
        return;
      }

      const filtered = apiGroups.filter(group =>
        group.path.toLowerCase().includes(query) ||
        group.tables.some(t => t.toLowerCase().includes(query)) ||
        group.services.some(s => s.toLowerCase().includes(query))
      );

      renderGroups(filtered);
    });
  </script>
</body>
</html>`;

const outputPath = path.join(__dirname, '../public/api-db-analysis.html');
fs.writeFileSync(outputPath, html);

console.log('✅ HTML généré:', outputPath);
