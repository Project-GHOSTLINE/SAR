#!/usr/bin/env node

/**
 * Script pour démarrer le worker d'analyse automatique SAR
 * Usage: node scripts/start-worker.mjs
 */

import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Charger les variables d'environnement
config({ path: join(__dirname, '../.env.local') });
config({ path: join(__dirname, '../.env') });

console.log('='.repeat(60));
console.log('  SAR Analysis Worker');
console.log('  Solution Argent Rapide Inc.');
console.log('='.repeat(60));
console.log('');

// Vérifier les variables d'environnement requises
const requiredEnvVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY'
];

let missingVars = [];
for (const varName of requiredEnvVars) {
  if (!process.env[varName]) {
    missingVars.push(varName);
  }
}

if (missingVars.length > 0) {
  console.error('❌ Variables d\'environnement manquantes:');
  missingVars.forEach(v => console.error(`   - ${v}`));
  console.error('');
  console.error('💡 Assurez-vous que .env.local existe et contient ces variables.');
  process.exit(1);
}

console.log('✅ Variables d\'environnement chargées');
console.log('');
console.log('Configuration:');
console.log(`  Supabase URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL}`);
console.log(`  Service Key: ${process.env.SUPABASE_SERVICE_ROLE_KEY.slice(0, 20)}...`);
console.log('');

// Import dynamique du worker
console.log('📦 Chargement du module worker...');

try {
  // Note: Pour que cela fonctionne, il faut soit:
  // 1. Build le projet d'abord avec `npm run build`
  // 2. Ou utiliser un loader comme tsx ou ts-node

  console.log('⚠️  ATTENTION: Ce script nécessite que le projet soit compilé.');
  console.log('');
  console.log('Options pour démarrer le worker:');
  console.log('');
  console.log('1. Via une route API (Recommandé pour production):');
  console.log('   - Créer: src/app/api/worker/process-jobs/route.ts');
  console.log('   - Appeler via cron: curl http://localhost:3000/api/worker/process-jobs');
  console.log('');
  console.log('2. Via un processus séparé (Développement):');
  console.log('   - npm run build');
  console.log('   - node scripts/start-worker-compiled.js');
  console.log('');
  console.log('3. Via Next.js API route dans le navigateur:');
  console.log('   - Créer une page /admin/worker avec bouton "Process Jobs"');
  console.log('   - Appeler l\'API depuis le bouton');
  console.log('');
  console.log('Pour l\'instant, utilisez l\'option 1 ou 3 pour tester.');

} catch (error) {
  console.error('❌ Erreur lors du chargement du worker:');
  console.error(error);
  console.error('');
  console.error('💡 Assurez-vous que le projet est compilé avec `npm run build`');
  process.exit(1);
}

console.log('');
console.log('Pour quitter, appuyez sur Ctrl+C');
