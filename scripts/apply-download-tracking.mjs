#!/usr/bin/env node

/**
 * Script pour appliquer le système de tracking des téléchargements
 * Usage: node scripts/apply-download-tracking.mjs
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Charger les variables d'environnement
config({ path: join(__dirname, '../.env.local') });
config({ path: join(__dirname, '../.env') });

console.log('='.repeat(60));
console.log('  Application du système de tracking des téléchargements');
console.log('  Solution Argent Rapide Inc.');
console.log('='.repeat(60));
console.log('');

// Vérifier les variables d'environnement
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Variables d\'environnement manquantes:');
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) console.error('   - NEXT_PUBLIC_SUPABASE_URL');
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) console.error('   - SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Créer le client Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('✅ Connexion à Supabase établie');
console.log('');

// Lire le fichier SQL
const sqlPath = join(__dirname, '../database/create_download_tracking.sql');
let sql;
try {
  sql = readFileSync(sqlPath, 'utf-8');
  console.log('✅ Fichier SQL lu:', sqlPath);
} catch (error) {
  console.error('❌ Erreur lecture du fichier SQL:', error.message);
  process.exit(1);
}

console.log('');
console.log('📝 Contenu du SQL:');
console.log('-'.repeat(60));
console.log(sql.substring(0, 500) + '...');
console.log('-'.repeat(60));
console.log('');

// Vérifier si la table existe déjà
console.log('🔍 Vérification de l\'existence de la table download_logs...');

const { data: existingTable, error: checkError } = await supabase
  .from('download_logs')
  .select('id')
  .limit(1);

if (!checkError) {
  console.log('✅ La table download_logs existe déjà');
  console.log('');
  console.log('📊 Vérification des statistiques...');

  // Tester la fonction get_download_stats
  const { data: statsData, error: statsError } = await supabase.rpc('get_download_stats', {
    p_file_name: 'ibv-crawler-v2.16.zip'
  });

  if (statsError) {
    console.log('⚠️  La fonction get_download_stats n\'existe pas encore');
    console.log('   Erreur:', statsError.message);
    console.log('');
    console.log('📝 Application du SQL pour créer la fonction et la vue...');

    // On doit quand même appliquer le SQL pour créer la fonction
    // Mais on va le faire via l'API Supabase Management
    console.log('');
    console.log('⚠️  ATTENTION: Ce script nécessite l\'accès direct à PostgreSQL');
    console.log('');
    console.log('🔧 Pour appliquer le SQL, vous devez:');
    console.log('   1. Aller sur https://supabase.com/dashboard');
    console.log('   2. Sélectionner votre projet');
    console.log('   3. Aller dans "SQL Editor"');
    console.log('   4. Créer une nouvelle requête');
    console.log('   5. Copier-coller le contenu de: database/create_download_tracking.sql');
    console.log('   6. Exécuter la requête');
    console.log('');
    console.log('📄 Chemin du fichier SQL:');
    console.log('   ' + sqlPath);
    console.log('');
    console.log('✨ Alternative: Utilisez le client psql:');
    console.log('   psql "postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres" -f database/create_download_tracking.sql');
    console.log('');
  } else {
    console.log('✅ La fonction get_download_stats existe et fonctionne');
    console.log('');
    console.log('📊 Statistiques pour ibv-crawler-v2.16.zip:');
    console.log(JSON.stringify(statsData, null, 2));
    console.log('');
    console.log('✅ Le système de tracking est complètement configuré!');
  }
} else {
  console.log('⚠️  La table download_logs n\'existe pas encore');
  console.log('   Erreur:', checkError.message);
  console.log('');
  console.log('🔧 Pour appliquer le SQL, vous devez:');
  console.log('   1. Aller sur https://supabase.com/dashboard');
  console.log('   2. Sélectionner votre projet');
  console.log('   3. Aller dans "SQL Editor"');
  console.log('   4. Créer une nouvelle requête');
  console.log('   5. Copier-coller le contenu de: database/create_download_tracking.sql');
  console.log('   6. Exécuter la requête');
  console.log('');
  console.log('📄 Chemin du fichier SQL:');
  console.log('   ' + sqlPath);
  console.log('');
}

console.log('='.repeat(60));
console.log('Script terminé');
console.log('='.repeat(60));
