#!/usr/bin/env node

/**
 * Script pour appliquer les migrations Supabase manuellement
 * Usage: node scripts/apply-migration.mjs
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration Supabase
const SUPABASE_URL = 'https://dllyzfuqjzuhvshrlmuq.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRsbHl6ZnVxanp1aHZzaHJsbXVxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTk5NTk4MSwiZXhwIjoyMDgxNTcxOTgxfQ.Qg5eQwDxeAtTDXplNkQZa4hOp_dSMBIu_DKbuquryFo';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function applyMigration() {
  console.log('🚀 Application de la migration Supabase...\n');

  try {
    // Lire le fichier SQL
    const migrationPath = join(__dirname, '../supabase/migrations/20260122000001_add_analysis_tables.sql');
    const sql = readFileSync(migrationPath, 'utf8');

    console.log('📄 Migration lue:', migrationPath);
    console.log('📏 Taille:', sql.length, 'caractères\n');

    // Exécuter la migration via RPC (si disponible) ou requêtes séparées
    console.log('⚙️  Exécution de la migration...\n');

    // Note: Supabase JS client ne supporte pas l'exécution de SQL brut directement
    // Il faut utiliser le Dashboard Supabase ou pg client
    console.log('⚠️  ATTENTION: Le client Supabase JS ne peut pas exécuter du SQL brut.');
    console.log('');
    console.log('📋 Options pour appliquer la migration:');
    console.log('');
    console.log('1. Dashboard Supabase:');
    console.log('   • Ouvrir: https://supabase.com/dashboard/project/dllyzfuqjzuhvshrlmuq/sql');
    console.log('   • Coller le contenu de:', migrationPath);
    console.log('   • Cliquer sur "Run"');
    console.log('');
    console.log('2. psql (PostgreSQL CLI):');
    console.log('   • psql "postgresql://postgres:[PASSWORD]@db.dllyzfuqjzuhvshrlmuq.supabase.co:5432/postgres"');
    console.log('   • \\i', migrationPath);
    console.log('');
    console.log('3. Supabase CLI (si Docker est installé):');
    console.log('   • npx supabase db push');
    console.log('');

    // Alternative: créer les tables via le client une par une (moins idéal)
    console.log('🔄 Tentative de création des tables via le client...\n');

    // Vérifier si les tables existent déjà
    const { data: jobs, error: jobsError } = await supabase
      .from('analysis_jobs')
      .select('id')
      .limit(1);

    if (!jobsError || jobsError.code !== 'PGRST204') {
      console.log('✅ Table analysis_jobs existe déjà');
    } else {
      console.log('❌ Table analysis_jobs n\'existe pas encore');
    }

    const { data: scores, error: scoresError } = await supabase
      .from('analysis_scores')
      .select('id')
      .limit(1);

    if (!scoresError || scoresError.code !== 'PGRST204') {
      console.log('✅ Table analysis_scores existe déjà');
    } else {
      console.log('❌ Table analysis_scores n\'existe pas encore');
    }

    const { data: recs, error: recsError } = await supabase
      .from('analysis_recommendations')
      .select('id')
      .limit(1);

    if (!recsError || recsError.code !== 'PGRST204') {
      console.log('✅ Table analysis_recommendations existe déjà');
    } else {
      console.log('❌ Table analysis_recommendations n\'existe pas encore');
    }

    console.log('\n📊 Vérification terminée.');
    console.log('\n💡 Utilisez le Dashboard Supabase pour appliquer la migration manuellement.');

  } catch (error) {
    console.error('❌ Erreur:', error.message);
    process.exit(1);
  }
}

applyMigration();
