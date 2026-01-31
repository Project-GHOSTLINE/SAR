const fs = require('fs');
const path = require('path');

const catalogPath = path.join(__dirname, '../src/data/api-catalog.generated.json');
const data = JSON.parse(fs.readFileSync(catalogPath, 'utf-8'));

// Calculate stats
const withAuth = data.routes.filter(r => !r.auth.includes('Public')).length;
const uniqueTables = [...new Set(data.routes.flatMap(r => r.tablesTouched))].length;
const uniqueServices = [...new Set(data.routes.flatMap(r => r.externalCalls))].length;

// Top tables
const tableCounts = {};
data.routes.forEach(r => {
  r.tablesTouched.forEach(t => {
    tableCounts[t] = (tableCounts[t] || 0) + 1;
  });
});
const topTables = Object.entries(tableCounts)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 10);

const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>API Explorer - SAR</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-50 min-h-screen">
  <div class="container mx-auto p-8">
    <!-- Header -->
    <div class="mb-8">
      <h1 class="text-4xl font-bold text-gray-900 mb-2">🔍 API Explorer</h1>
      <p class="text-gray-600">${data.totalRoutes} routes • Scanné le ${new Date(data.scannedAt).toLocaleString('fr-CA')}</p>
    </div>

    <!-- Stats -->
    <div class="grid grid-cols-4 gap-4 mb-8">
      <div class="bg-white rounded-lg shadow p-6">
        <div class="text-sm text-gray-600 mb-1">Total Routes</div>
        <div class="text-3xl font-bold text-blue-600">${data.totalRoutes}</div>
      </div>
      <div class="bg-white rounded-lg shadow p-6">
        <div class="text-sm text-gray-600 mb-1">Avec Auth</div>
        <div class="text-3xl font-bold text-green-600">${withAuth}</div>
      </div>
      <div class="bg-white rounded-lg shadow p-6">
        <div class="text-sm text-gray-600 mb-1">Tables</div>
        <div class="text-3xl font-bold text-purple-600">${uniqueTables}</div>
      </div>
      <div class="bg-white rounded-lg shadow p-6">
        <div class="text-sm text-gray-600 mb-1">Services</div>
        <div class="text-3xl font-bold text-orange-600">${uniqueServices}</div>
      </div>
    </div>

    <!-- Top Tables -->
    <div class="bg-white rounded-lg shadow p-6 mb-8">
      <h2 class="text-2xl font-bold mb-4">📊 Top 10 Tables</h2>
      <div class="grid grid-cols-2 gap-3">
        ${topTables.map(([table, count]) => `
          <div class="flex justify-between items-center p-3 bg-gray-50 rounded">
            <span class="font-mono text-sm">${table}</span>
            <span class="px-3 py-1 bg-blue-500 text-white text-sm rounded-full font-bold">${count}</span>
          </div>
        `).join('')}
      </div>
    </div>

    <!-- Search -->
    <div class="bg-white rounded-lg shadow mb-4 p-4">
      <input
        type="text"
        id="search"
        placeholder="🔍 Rechercher par path, description, ou table..."
        class="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
      />
    </div>

    <!-- Routes List -->
    <div class="bg-white rounded-lg shadow">
      <div class="p-4 border-b bg-gray-50">
        <h2 class="text-xl font-bold">📋 Routes API</h2>
        <div id="count" class="text-sm text-gray-600 mt-1"></div>
      </div>
      <div id="routes" class="divide-y max-h-[800px] overflow-y-auto"></div>
    </div>
  </div>

  <script>
    const allRoutes = ${JSON.stringify(data.routes)};
    const routesDiv = document.getElementById('routes');
    const searchInput = document.getElementById('search');
    const countDiv = document.getElementById('count');

    const methodColors = {
      GET: 'bg-blue-100 text-blue-700',
      POST: 'bg-green-100 text-green-700',
      PUT: 'bg-yellow-100 text-yellow-700',
      PATCH: 'bg-orange-100 text-orange-700',
      DELETE: 'bg-red-100 text-red-700'
    };

    function renderRoutes(routes) {
      countDiv.textContent = routes.length + ' routes affichées';

      routesDiv.innerHTML = routes.map(route => {
        const methodClass = methodColors[route.methods[0]] || 'bg-gray-100 text-gray-700';

        return \`
          <div class="p-5 hover:bg-blue-50 transition-colors cursor-pointer">
            <div class="flex items-center gap-3 mb-3">
              <span class="px-3 py-1 text-xs font-mono font-bold rounded \${methodClass}">
                \${route.methods[0]}
              </span>
              <code class="text-sm font-bold text-gray-900">\${route.path}</code>
            </div>

            <p class="text-sm text-gray-700 mb-3">\${route.description}</p>

            <div class="flex flex-wrap gap-2 mb-3">
              <span class="px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded">
                🔐 \${route.auth}
              </span>
              \${route.cors ? '<span class="px-2 py-1 text-xs bg-cyan-100 text-cyan-700 rounded">🌐 CORS</span>' : ''}
              \${route.rateLimit ? '<span class="px-2 py-1 text-xs bg-amber-100 text-amber-700 rounded">⏱️ Rate Limit</span>' : ''}
            </div>

            \${route.tablesTouched.length > 0 ? \`
              <div class="mb-2">
                <div class="text-xs text-gray-500 mb-1">📊 Tables (\${route.tablesTouched.length}):</div>
                <div class="flex flex-wrap gap-1">
                  \${route.tablesTouched.slice(0, 8).map(t =>
                    \`<span class="px-2 py-1 text-xs bg-green-50 text-green-700 rounded font-mono">\${t}</span>\`
                  ).join('')}
                  \${route.tablesTouched.length > 8 ?
                    \`<span class="px-2 py-1 text-xs text-gray-500">+\${route.tablesTouched.length - 8} more</span>\`
                    : ''}
                </div>
              </div>
            \` : ''}

            \${route.externalCalls.length > 0 ? \`
              <div class="mb-2">
                <div class="text-xs text-gray-500 mb-1">🌐 Services externes:</div>
                <div class="flex flex-wrap gap-1">
                  \${route.externalCalls.map(s =>
                    \`<span class="px-2 py-1 text-xs bg-orange-50 text-orange-700 rounded">\${s}</span>\`
                  ).join('')}
                </div>
              </div>
            \` : ''}

            \${route.middleware.length > 0 ? \`
              <div class="mb-2">
                <div class="text-xs text-gray-500 mb-1">⚙️ Middleware:</div>
                <div class="flex flex-wrap gap-1">
                  \${route.middleware.map(m =>
                    \`<span class="px-2 py-1 text-xs bg-indigo-50 text-indigo-700 rounded">\${m}</span>\`
                  ).join('')}
                </div>
              </div>
            \` : ''}

            <div class="text-xs text-gray-500 mt-3">
              📁 <code>\${route.fileRef.file}</code> (lines \${route.fileRef.lines})
            </div>
          </div>
        \`;
      }).join('');
    }

    // Initial render
    renderRoutes(allRoutes);

    // Search functionality
    searchInput.addEventListener('input', (e) => {
      const query = e.target.value.toLowerCase().trim();

      if (!query) {
        renderRoutes(allRoutes);
        return;
      }

      const filtered = allRoutes.filter(route =>
        route.path.toLowerCase().includes(query) ||
        route.description.toLowerCase().includes(query) ||
        route.tablesTouched.some(t => t.toLowerCase().includes(query)) ||
        route.externalCalls.some(s => s.toLowerCase().includes(query)) ||
        route.auth.toLowerCase().includes(query)
      );

      renderRoutes(filtered);
    });

    // Click to expand
    routesDiv.addEventListener('click', (e) => {
      const routeDiv = e.target.closest('[class*="p-5"]');
      if (routeDiv) {
        routeDiv.classList.toggle('bg-blue-50');
      }
    });
  </script>
</body>
</html>`;

const outputPath = path.join(__dirname, '../public/api-explorer-data.html');
fs.writeFileSync(outputPath, html);

console.log('✅ HTML généré:', outputPath);
console.log('📊 Stats:', {
  totalRoutes: data.totalRoutes,
  withAuth,
  uniqueTables,
  uniqueServices
});
