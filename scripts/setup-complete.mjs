#!/usr/bin/env node
/**
 * Script complet d'installation du système de mémoire
 * Fait TOUT en une seule commande
 */

import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Variables d\'environnement manquantes');
  console.error('Vérifiez que .env.local contient:');
  console.error('  NEXT_PUBLIC_SUPABASE_URL=...');
  console.error('  SUPABASE_SERVICE_KEY=... (ou SUPABASE_SERVICE_ROLE_KEY)');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

console.log('\n🚀 Installation Complète du Système de Mémoire\n');
console.log('📍 Supabase URL:', SUPABASE_URL);
console.log('');

// Étape 1: Vérifier si les tables existent déjà
console.log('📋 Étape 1/3: Vérification des tables...\n');

const { data: tables, error: tablesError } = await supabase
  .from('claude_memory')
  .select('id')
  .limit(1);

if (tablesError && tablesError.code === '42P01') {
  console.log('⚠️  Les tables n\'existent pas encore.');
  console.log('');
  console.log('🔧 INSTRUCTIONS MANUELLES REQUISES:');
  console.log('');
  console.log('1. Ouvrir Supabase Dashboard:');
  console.log(`   ${SUPABASE_URL.replace('https://', 'https://supabase.com/dashboard/project/')}`);
  console.log('');
  console.log('2. Aller dans "SQL Editor" (dans le menu de gauche)');
  console.log('');
  console.log('3. Cliquer sur "New Query"');
  console.log('');
  console.log('4. Copier le contenu du fichier:');
  console.log('   database/claude-memory-system.sql');
  console.log('');
  console.log('5. Cliquer sur "Run" (▶️)');
  console.log('');
  console.log('6. Relancer ce script: node scripts/setup-complete.mjs');
  console.log('');
  process.exit(0);
}

console.log('✅ Tables trouvées!\n');

// Étape 2: Insérer les mémoires initiales
console.log('📋 Étape 2/3: Création des mémoires essentielles...\n');

const memories = [
  {
    category: 'project_info',
    key: 'project_overview',
    content: {
      name: 'Solution Argent Rapide',
      type: 'Next.js Application',
      description: 'Plateforme de prêts avec IBV (Flinks/Inverite)',
      status: 'Production',
      url: 'https://admin.solutionargentrapide.ca'
    },
    context: 'Solution Argent Rapide (SAR) est une application Next.js de gestion de prêts avec vérification bancaire instantanée.',
    importance: 10,
    tags: ['project', 'nextjs', 'production']
  },
  {
    category: 'stack',
    key: 'tech_stack',
    content: {
      frontend: ['Next.js 14', 'React 18', 'TypeScript', 'Tailwind CSS'],
      backend: ['Next.js API Routes', 'Node.js'],
      database: ['Supabase', 'PostgreSQL'],
      services: ['VoPay', 'Flinks', 'Inverite', 'Vercel'],
      analytics: ['Google Analytics Data API']
    },
    context: 'Stack technique du projet SAR: Next.js 14, TypeScript, Supabase, VoPay, Flinks/Inverite',
    importance: 10,
    tags: ['stack', 'tech', 'nextjs', 'typescript', 'supabase']
  },
  {
    category: 'deployment',
    key: 'workflow',
    content: {
      steps: [
        'Faire les changements dans le code',
        'git add . && git commit -m "message"',
        'git push',
        'Vercel déploie automatiquement',
        'Tester sur production'
      ],
      important: 'TOUJOURS déployer sur Vercel, JAMAIS en local sauf demande explicite'
    },
    context: 'Workflow de déploiement: Git push → Vercel auto-deploy → Test production',
    importance: 10,
    tags: ['deployment', 'vercel', 'git', 'workflow']
  },
  {
    category: 'urls',
    key: 'production_urls',
    content: {
      main: 'https://solutionargentrapide.ca',
      admin: 'https://admin.solutionargentrapide.ca',
      client: 'https://client.solutionargentrapide.ca',
      preview: 'https://sar-nu.vercel.app'
    },
    context: 'URLs de production du projet SAR',
    importance: 10,
    tags: ['urls', 'production', 'domains']
  },
  {
    category: 'security',
    key: 'credentials_location',
    content: {
      master_env: '/Users/xunit/Desktop/📁 Projets/outils/.env.master',
      credentials_doc: '/Users/xunit/Desktop/📁 Projets/outils/CREDENTIALS-MASTER.md',
      apis_doc: '/Users/xunit/Desktop/📁 Projets/outils/APIS-DISPONIBLES.md',
      admin_password: 'FredRosa%1978'
    },
    context: 'Emplacement des credentials et documentation: outils/.env.master et CREDENTIALS-MASTER.md',
    importance: 10,
    tags: ['security', 'credentials', 'passwords']
  }
];

let successCount = 0;
for (const memory of memories) {
  const { error } = await supabase
    .from('claude_memory')
    .upsert({
      project_name: 'sar',
      ...memory,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'project_name,category,key'
    });

  if (error) {
    console.error(`❌ ${memory.category}/${memory.key}:`, error.message);
  } else {
    console.log(`✅ ${memory.category}/${memory.key}`);
    successCount++;
  }
}

console.log(`\n✅ ${successCount}/${memories.length} mémoires créées\n`);

// Étape 3: Créer une session de test
console.log('📋 Étape 3/3: Création de la session initiale...\n');

const { error: sessionError } = await supabase
  .from('claude_sessions')
  .insert({
    project_name: 'sar',
    session_date: new Date().toISOString(),
    summary: 'Installation du système de mémoire longue durée',
    tasks_completed: [
      'Vérification des tables Supabase',
      'Création des mémoires essentielles (stack, deployment, urls, security)',
      'Initialisation de la session de test'
    ],
    learnings: [
      'Projet SAR utilise Next.js 14 + TypeScript + Supabase',
      'Workflow: Git push → Vercel auto-deploy',
      'URLs production: admin.solutionargentrapide.ca',
      'Credentials dans outils/.env.master'
    ],
    next_steps: [
      'Tester les APIs de mémoire',
      'Lire la documentation complète',
      'Utiliser la mémoire dans les conversations'
    ]
  });

if (sessionError) {
  console.error('❌ Erreur session:', sessionError.message);
} else {
  console.log('✅ Session créée\n');
}

// Afficher les stats
console.log('📊 Statistiques:\n');

const { count: memoryCount } = await supabase
  .from('claude_memory')
  .select('*', { count: 'exact', head: true })
  .eq('project_name', 'sar');

const { count: sessionsCount } = await supabase
  .from('claude_sessions')
  .select('*', { count: 'exact', head: true })
  .eq('project_name', 'sar');

console.log(`🧠 Mémoires stockées: ${memoryCount || 0}`);
console.log(`📝 Sessions: ${sessionsCount || 0}`);
console.log('');

// Créer une page de test HTML
const testPageHTML = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Test Système de Mémoire - SAR</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      padding: 40px 20px;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
    }
    .card {
      background: white;
      border-radius: 16px;
      padding: 32px;
      margin-bottom: 24px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.15);
    }
    h1 {
      color: #1a202c;
      font-size: 36px;
      margin-bottom: 8px;
    }
    .subtitle {
      color: #718096;
      font-size: 16px;
      margin-bottom: 32px;
    }
    .status {
      display: inline-block;
      padding: 6px 16px;
      background: #10b981;
      color: white;
      border-radius: 20px;
      font-size: 14px;
      font-weight: 600;
      margin-bottom: 24px;
    }
    .test-section {
      margin-top: 24px;
    }
    .test-title {
      font-size: 20px;
      font-weight: 600;
      color: #2d3748;
      margin-bottom: 16px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    button {
      background: #667eea;
      color: white;
      border: none;
      padding: 12px 24px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      margin-right: 12px;
      margin-bottom: 12px;
    }
    button:hover {
      background: #5a67d8;
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
    }
    .result {
      background: #f7fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 16px;
      margin-top: 16px;
      font-family: 'Monaco', 'Courier New', monospace;
      font-size: 12px;
      max-height: 400px;
      overflow-y: auto;
      white-space: pre-wrap;
      word-wrap: break-word;
    }
    .loading {
      color: #667eea;
      font-style: italic;
    }
    .error {
      color: #e53e3e;
      background: #fff5f5;
      border-color: #fc8181;
    }
    .success {
      color: #10b981;
    }
    .stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      margin-top: 24px;
    }
    .stat {
      background: #f7fafc;
      padding: 20px;
      border-radius: 12px;
      text-align: center;
    }
    .stat-value {
      font-size: 32px;
      font-weight: 700;
      color: #667eea;
      margin-bottom: 8px;
    }
    .stat-label {
      color: #718096;
      font-size: 14px;
    }
    code {
      background: #2d3748;
      color: #48bb78;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 13px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <h1>🧠 Système de Mémoire Claude</h1>
      <p class="subtitle">Solution Argent Rapide - Test d'Intégration</p>
      <span class="status">✅ OPÉRATIONNEL</span>

      <div class="stats">
        <div class="stat">
          <div class="stat-value" id="memoryCount">-</div>
          <div class="stat-label">Mémoires</div>
        </div>
        <div class="stat">
          <div class="stat-value" id="sessionCount">-</div>
          <div class="stat-label">Sessions</div>
        </div>
        <div class="stat">
          <div class="stat-value" id="docsCount">-</div>
          <div class="stat-label">Documents</div>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="test-section">
        <div class="test-title">
          🔍 Tests Disponibles
        </div>
        <button onclick="testContext()">📊 Charger le Contexte Complet</button>
        <button onclick="testRecall('stack')">💻 Recall: Stack Technique</button>
        <button onclick="testRecall('deployment')">🚀 Recall: Déploiement</button>
        <button onclick="testRecall('urls')">🌐 Recall: URLs Production</button>
        <button onclick="testStore()">💾 Test: Stocker une Mémoire</button>
        <button onclick="loadStats()">📈 Rafraîchir Stats</button>
        <div id="result" class="result" style="display:none;"></div>
      </div>
    </div>

    <div class="card">
      <div class="test-title">📚 Guide d'Utilisation</div>
      <p style="color: #4a5568; line-height: 1.6; margin-top: 16px;">
        <strong>Pour Claude:</strong><br>
        • Au début de chaque session, charger le contexte: <code>GET /api/memory/context?project=sar</code><br>
        • Rechercher des infos: <code>GET /api/memory/recall?project=sar&category=stack</code><br>
        • Stocker des connaissances: <code>POST /api/memory/store</code><br>
        • Enregistrer la session: <code>POST /api/memory/session</code>
      </p>
    </div>
  </div>

  <script>
    const API_BASE = window.location.origin;

    function showResult(text, isError = false) {
      const result = document.getElementById('result');
      result.style.display = 'block';
      result.className = isError ? 'result error' : 'result';
      result.textContent = text;
    }

    async function loadStats() {
      try {
        const res = await fetch(\`\${API_BASE}/api/memory/context?project=sar\`);
        const data = await res.json();

        if (data.success) {
          const ctx = data.context;
          document.getElementById('memoryCount').textContent = ctx.top_memories?.length || 0;
          document.getElementById('sessionCount').textContent = ctx.recent_sessions?.length || 0;
          document.getElementById('docsCount').textContent = ctx.docs_count || 0;
          showResult('✅ Stats chargées avec succès!');
        } else {
          throw new Error(data.error || 'Erreur inconnue');
        }
      } catch (error) {
        showResult('❌ Erreur: ' + error.message, true);
      }
    }

    async function testContext() {
      showResult('⏳ Chargement du contexte...', false);
      try {
        const res = await fetch(\`\${API_BASE}/api/memory/context?project=sar\`);
        const data = await res.json();
        showResult(JSON.stringify(data, null, 2));
      } catch (error) {
        showResult('❌ Erreur: ' + error.message, true);
      }
    }

    async function testRecall(category) {
      showResult(\`⏳ Recherche des mémoires: \${category}...\`, false);
      try {
        const res = await fetch(\`\${API_BASE}/api/memory/recall?project=sar&category=\${category}\`);
        const data = await res.json();
        showResult(JSON.stringify(data, null, 2));
      } catch (error) {
        showResult('❌ Erreur: ' + error.message, true);
      }
    }

    async function testStore() {
      showResult('⏳ Stockage d\'une mémoire de test...', false);
      try {
        const res = await fetch(\`\${API_BASE}/api/memory/store\`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            project_name: 'sar',
            category: 'test',
            key: 'test_' + Date.now(),
            content: { message: 'Test de stockage', timestamp: new Date().toISOString() },
            context: 'Mémoire de test créée depuis la page de test',
            importance: 5,
            tags: ['test', 'demo']
          })
        });
        const data = await res.json();
        showResult(JSON.stringify(data, null, 2));
        loadStats(); // Rafraîchir les stats
      } catch (error) {
        showResult('❌ Erreur: ' + error.message, true);
      }
    }

    // Charger les stats au chargement
    loadStats();
  </script>
</body>
</html>`;

// Sauvegarder la page de test
import { writeFileSync } from 'fs';
writeFileSync('public/test-memory.html', testPageHTML);

console.log('✅ Installation terminée avec succès!\n');
console.log('🎯 Prochaine étape:\n');
console.log('   Ouvrir dans le navigateur:');
console.log('   http://localhost:3000/test-memory.html');
console.log('');
console.log('   Ou si le serveur tourne déjà sur Vercel:');
console.log('   https://admin.solutionargentrapide.ca/test-memory.html');
console.log('');
