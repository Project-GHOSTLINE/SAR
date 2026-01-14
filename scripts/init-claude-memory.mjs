#!/usr/bin/env node
/**
 * Script d'initialisation de la mémoire de Claude
 * Lit tous les fichiers MD importants et les stocke dans Supabase
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, basename, extname } from 'path';
import { createHash } from 'crypto';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Charger les variables d'environnement
dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Variables d\'environnement manquantes');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const PROJECT_NAME = 'sar';
const ROOT_DIR = process.cwd();

// Fichiers MD à lire en priorité
const PRIORITY_FILES = [
  'SAR-README.md',
  'ADMIN-DASHBOARD-IMPLEMENTATION.md',
  'ARCHITECTURE_OPTIMIZATION_PLAN.md',
  'database/DATABASE_STRUCTURE.md',
  'ANALYTICS-INTEGRATION-RAPPORT.md',
  'ADMIN-DASHBOARD-IMPROVEMENTS.md',
  'DEPLOIEMENT-PRODUCTION-11-JAN-2026.md'
];

/**
 * Calculer le hash SHA256 d'un contenu
 */
function calculateHash(content) {
  return createHash('sha256').update(content).digest('hex');
}

/**
 * Extraire les points clés d'un fichier MD
 */
function extractKeyPoints(content) {
  const points = [];
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Titres H2 et H3
    if (line.startsWith('## ') || line.startsWith('### ')) {
      points.push(line.replace(/^#+\s+/, ''));
    }

    // Listes importantes
    if (line.startsWith('- ✅') || line.startsWith('- ❌')) {
      points.push(line);
    }
  }

  return points.slice(0, 20); // Max 20 points clés
}

/**
 * Extraire les sections d'un fichier MD
 */
function extractSections(content) {
  const sections = [];
  const lines = content.split('\n');
  let currentSection = null;

  for (const line of lines) {
    if (line.startsWith('## ')) {
      if (currentSection) {
        sections.push(currentSection);
      }
      currentSection = {
        title: line.replace('## ', ''),
        content: ''
      };
    } else if (currentSection) {
      currentSection.content += line + '\n';
    }
  }

  if (currentSection) {
    sections.push(currentSection);
  }

  return sections;
}

/**
 * Générer un résumé du fichier
 */
function generateSummary(content, fileName) {
  const lines = content.split('\n');
  let summary = '';

  // Chercher la description ou le premier paragraphe
  for (let i = 0; i < Math.min(50, lines.length); i++) {
    const line = lines[i].trim();
    if (line && !line.startsWith('#') && !line.startsWith('**') && line.length > 50) {
      summary = line;
      break;
    }
  }

  if (!summary && lines[0]) {
    summary = lines[0].replace(/^#+\s+/, '');
  }

  return summary.slice(0, 500); // Max 500 caractères
}

/**
 * Stocker un document lu
 */
async function storeDocRead(filePath, fileName, fileContent) {
  const fileHash = calculateHash(fileContent);
  const keyPoints = extractKeyPoints(fileContent);
  const sections = extractSections(fileContent);
  const summary = generateSummary(fileContent, fileName);
  const fileType = extname(fileName).slice(1);
  const fileSize = Buffer.byteLength(fileContent, 'utf8');
  const linesCount = fileContent.split('\n').length;

  const { data, error } = await supabase
    .from('claude_docs_read')
    .upsert({
      project_name: PROJECT_NAME,
      file_path: filePath,
      file_name: fileName,
      file_type: fileType,
      file_hash: fileHash,
      summary: summary,
      key_points: keyPoints,
      sections: sections,
      file_size: fileSize,
      lines_count: linesCount,
      read_at: new Date().toISOString(),
      needs_reread: false
    }, {
      onConflict: 'project_name,file_path'
    })
    .select()
    .single();

  if (error) {
    console.error(`❌ Erreur storing ${fileName}:`, error.message);
    return false;
  }

  console.log(`✅ Stocké: ${fileName} (${linesCount} lignes, ${(fileSize / 1024).toFixed(1)} KB)`);
  return true;
}

/**
 * Stocker une mémoire
 */
async function storeMemory(category, key, content, context, importance = 5, tags = []) {
  const { data, error } = await supabase
    .from('claude_memory')
    .upsert({
      project_name: PROJECT_NAME,
      category,
      key,
      content,
      context,
      importance,
      tags,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'project_name,category,key'
    })
    .select()
    .single();

  if (error) {
    console.error(`❌ Erreur storing memory ${key}:`, error.message);
    return false;
  }

  console.log(`🧠 Mémoire: ${category}/${key}`);
  return true;
}

/**
 * Lire et stocker tous les fichiers MD
 */
async function readAllMarkdownFiles() {
  console.log('\n📚 Lecture des fichiers Markdown...\n');

  let successCount = 0;
  let failCount = 0;

  // Lire les fichiers prioritaires
  for (const file of PRIORITY_FILES) {
    const filePath = join(ROOT_DIR, file);
    try {
      const content = readFileSync(filePath, 'utf-8');
      const success = await storeDocRead(filePath, basename(file), content);
      if (success) successCount++;
      else failCount++;
    } catch (error) {
      console.error(`⚠️  Fichier ${file} non trouvé`);
      failCount++;
    }
  }

  // Lire d'autres fichiers MD importants
  const otherFiles = readdirSync(ROOT_DIR)
    .filter(f => f.endsWith('.md') && !PRIORITY_FILES.includes(f))
    .slice(0, 10); // Limiter à 10 fichiers supplémentaires

  for (const file of otherFiles) {
    const filePath = join(ROOT_DIR, file);
    try {
      const content = readFileSync(filePath, 'utf-8');
      const success = await storeDocRead(filePath, file, content);
      if (success) successCount++;
      else failCount++;
    } catch (error) {
      console.error(`⚠️  Erreur lecture ${file}:`, error.message);
      failCount++;
    }
  }

  console.log(`\n✅ Documents stockés: ${successCount}`);
  console.log(`❌ Échecs: ${failCount}`);

  return { successCount, failCount };
}

/**
 * Créer les mémoires essentielles
 */
async function createEssentialMemories() {
  console.log('\n🧠 Création des mémoires essentielles...\n');

  // Mémoire: Stack Technique
  await storeMemory(
    'stack',
    'tech_stack',
    {
      frontend: ['Next.js 14', 'React 18', 'TypeScript', 'Tailwind CSS'],
      backend: ['Next.js API Routes', 'Node.js'],
      database: ['Supabase', 'PostgreSQL'],
      services: ['VoPay', 'Flinks', 'Inverite', 'Vercel'],
      analytics: ['Google Analytics Data API']
    },
    'Stack technique du projet SAR: Next.js 14, TypeScript, Supabase, VoPay, Flinks/Inverite',
    10,
    ['stack', 'tech', 'nextjs', 'typescript', 'supabase']
  );

  // Mémoire: Workflow de Déploiement
  await storeMemory(
    'deployment',
    'workflow',
    {
      steps: [
        'Faire les changements dans le code',
        'git add . && git commit -m "message"',
        'git push',
        'Vercel déploie automatiquement',
        'Tester sur production'
      ],
      important: 'TOUJOURS déployer sur Vercel, JAMAIS en local sauf demande explicite'
    },
    'Workflow de déploiement: Git push → Vercel auto-deploy → Test production',
    10,
    ['deployment', 'vercel', 'git', 'workflow']
  );

  // Mémoire: URLs Production
  await storeMemory(
    'urls',
    'production_urls',
    {
      main: 'https://solutionargentrapide.ca',
      admin: 'https://admin.solutionargentrapide.ca',
      client: 'https://client.solutionargentrapide.ca',
      preview: 'https://sar-nu.vercel.app'
    },
    'URLs de production du projet SAR',
    10,
    ['urls', 'production', 'domains']
  );

  // Mémoire: Credentials Location
  await storeMemory(
    'security',
    'credentials_location',
    {
      master_env: '/Users/xunit/Desktop/📁 Projets/outils/.env.master',
      credentials_doc: '/Users/xunit/Desktop/📁 Projets/outils/CREDENTIALS-MASTER.md',
      apis_doc: '/Users/xunit/Desktop/📁 Projets/outils/APIS-DISPONIBLES.md',
      admin_password: 'FredRosa%1978'
    },
    'Emplacement des credentials et documentation: outils/.env.master et CREDENTIALS-MASTER.md',
    10,
    ['security', 'credentials', 'passwords']
  );

  // Mémoire: Services Disponibles
  await storeMemory(
    'services',
    'available_services',
    {
      payment: ['VoPay', 'Zum Rails'],
      ibv: ['Flinks', 'Inverite'],
      email: ['SendGrid', 'Resend'],
      sms: ['Twilio'],
      hosting: ['Vercel'],
      database: ['Supabase'],
      loans: ['Margill']
    },
    'Services disponibles: VoPay (paiements), Flinks/Inverite (IBV), SendGrid (email), Twilio (SMS)',
    10,
    ['services', 'apis', 'integrations']
  );

  // Mémoire: Tables Supabase
  await storeMemory(
    'database',
    'main_tables',
    {
      webhooks: 'vopay_webhook_logs - 998 lignes, webhooks VoPay',
      analyses: 'client_analyses - 27 lignes, analyses IBV clients',
      transactions: 'client_transactions - 180,560 lignes, transactions bancaires',
      accounts: 'client_accounts - 107 lignes, comptes bancaires',
      messages: 'contact_messages - 278 lignes, messages de contact',
      fraud: 'fraud_cases - 0 lignes, cas de fraude'
    },
    'Tables principales: vopay_webhook_logs, client_analyses, client_transactions, client_accounts',
    9,
    ['database', 'supabase', 'tables']
  );

  // Mémoire: Architecture Dashboard
  await storeMemory(
    'architecture',
    'admin_dashboard',
    {
      main_sections: ['Messages', 'VoPay', 'Analyses', 'Webhooks', 'Database Explorer'],
      stats: 'API /api/admin/webhooks/stats avec actualisation automatique 30s',
      optimizations: 'Materialized views, indexes, cache, React Query'
    },
    'Architecture Dashboard Admin: Stats en temps réel, actualisation auto, optimisations DB',
    8,
    ['architecture', 'dashboard', 'admin']
  );

  console.log('✅ Mémoires essentielles créées\n');
}

/**
 * Créer la session initiale
 */
async function createInitialSession() {
  console.log('📝 Création de la session initiale...\n');

  const { data, error } = await supabase
    .from('claude_sessions')
    .insert({
      project_name: PROJECT_NAME,
      session_date: new Date().toISOString(),
      summary: 'Initialisation du système de mémoire longue durée pour Claude',
      tasks_completed: [
        'Création des tables SQL (claude_memory, claude_sessions, claude_docs_read, etc.)',
        'Création des API endpoints de gestion de mémoire',
        'Lecture et stockage de la documentation du projet',
        'Création des mémoires essentielles (stack, services, architecture)'
      ],
      learnings: [
        'Projet SAR = Next.js 14 + TypeScript + Supabase',
        'Services: VoPay (paiements), Flinks/Inverite (IBV)',
        'Workflow: Git push → Vercel auto-deploy',
        'Dashboard admin avec stats en temps réel'
      ],
      next_steps: [
        'Lire le reste de la documentation',
        'Analyser le code source pour comprendre les patterns',
        'Créer des insights sur l\'architecture',
        'Documenter les APIs et endpoints'
      ],
      files_modified: [
        'database/claude-memory-system.sql',
        'src/app/api/memory/store/route.ts',
        'src/app/api/memory/recall/route.ts',
        'src/app/api/memory/context/route.ts',
        'src/app/api/memory/session/route.ts',
        'src/app/api/memory/doc-read/route.ts',
        'scripts/init-claude-memory.mjs'
      ]
    })
    .select()
    .single();

  if (error) {
    console.error('❌ Erreur création session:', error.message);
    return false;
  }

  console.log(`✅ Session créée: ${data.id}\n`);
  return true;
}

/**
 * Afficher les statistiques
 */
async function showStats() {
  console.log('\n📊 Statistiques de la mémoire:\n');

  // Compter les documents
  const { count: docsCount } = await supabase
    .from('claude_docs_read')
    .select('*', { count: 'exact', head: true })
    .eq('project_name', PROJECT_NAME);

  // Compter les mémoires
  const { count: memoryCount } = await supabase
    .from('claude_memory')
    .select('*', { count: 'exact', head: true })
    .eq('project_name', PROJECT_NAME);

  // Compter les sessions
  const { count: sessionsCount } = await supabase
    .from('claude_sessions')
    .select('*', { count: 'exact', head: true })
    .eq('project_name', PROJECT_NAME);

  console.log(`📚 Documents lus: ${docsCount || 0}`);
  console.log(`🧠 Mémoires stockées: ${memoryCount || 0}`);
  console.log(`📝 Sessions: ${sessionsCount || 0}`);
  console.log('');
}

/**
 * Main
 */
async function main() {
  console.log('\n🚀 Initialisation de la Mémoire de Claude\n');
  console.log(`📁 Projet: ${PROJECT_NAME}`);
  console.log(`📍 Répertoire: ${ROOT_DIR}\n`);

  try {
    // 1. Lire et stocker les fichiers MD
    await readAllMarkdownFiles();

    // 2. Créer les mémoires essentielles
    await createEssentialMemories();

    // 3. Créer la session initiale
    await createInitialSession();

    // 4. Afficher les stats
    await showStats();

    console.log('✅ Initialisation terminée avec succès!\n');
    console.log('🎯 Prochaines étapes:');
    console.log('   1. Exécuter le SQL dans Supabase: database/claude-memory-system.sql');
    console.log('   2. Tester les APIs: curl http://localhost:3000/api/memory/context?project=sar');
    console.log('   3. Utiliser la mémoire dans les conversations\n');

  } catch (error) {
    console.error('\n❌ Erreur fatale:', error);
    process.exit(1);
  }
}

main();
