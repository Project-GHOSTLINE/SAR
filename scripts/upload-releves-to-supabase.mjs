#!/usr/bin/env node

/**
 * Upload Releves_Bancaires_2025.html to Supabase Storage
 * Uploads the 10MB HTML file to a public bucket
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration Supabase
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing Supabase credentials');
  console.error('Required: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const BUCKET_NAME = 'documents';
const FILE_PATH = path.join(__dirname, '../public/Releves_Bancaires_2025.html');
const FILE_NAME = 'Releves_Bancaires_2025.html';

async function main() {
  console.log('🚀 Upload Relevés Bancaires vers Supabase Storage\n');

  // Vérifier que le fichier existe
  if (!fs.existsSync(FILE_PATH)) {
    console.error(`❌ Fichier non trouvé: ${FILE_PATH}`);
    process.exit(1);
  }

  const stats = fs.statSync(FILE_PATH);
  console.log(`📄 Fichier: ${FILE_NAME}`);
  console.log(`📊 Taille: ${(stats.size / 1024 / 1024).toFixed(2)} MB\n`);

  // Étape 1: Créer le bucket s'il n'existe pas
  console.log('🪣 Vérification du bucket...');
  const { data: buckets, error: listError } = await supabase.storage.listBuckets();

  if (listError) {
    console.error('❌ Erreur lors de la liste des buckets:', listError);
    process.exit(1);
  }

  const bucketExists = buckets.some(b => b.name === BUCKET_NAME);

  if (!bucketExists) {
    console.log(`   Création du bucket '${BUCKET_NAME}'...`);
    const { error: createError } = await supabase.storage.createBucket(BUCKET_NAME, {
      public: true,
      fileSizeLimit: 52428800, // 50MB
      allowedMimeTypes: ['text/html', 'application/octet-stream']
    });

    if (createError) {
      console.error('❌ Erreur lors de la création du bucket:', createError);
      process.exit(1);
    }
    console.log('   ✅ Bucket créé');
  } else {
    console.log('   ✅ Bucket existe déjà');
  }

  // Étape 2: Lire le fichier
  console.log('\n📖 Lecture du fichier...');
  const fileBuffer = fs.readFileSync(FILE_PATH);
  console.log('   ✅ Fichier lu en mémoire');

  // Étape 3: Upload le fichier
  console.log('\n⬆️  Upload vers Supabase Storage...');
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(FILE_NAME, fileBuffer, {
      contentType: 'text/html',
      cacheControl: '3600',
      upsert: true // Remplace si existe déjà
    });

  if (uploadError) {
    console.error('❌ Erreur lors de l\'upload:', uploadError);
    process.exit(1);
  }

  console.log('   ✅ Upload réussi!');
  console.log(`   📍 Path: ${uploadData.path}`);

  // Étape 4: Obtenir l'URL publique
  console.log('\n🔗 Génération de l\'URL publique...');
  const { data: publicUrlData } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(FILE_NAME);

  console.log('   ✅ URL publique générée\n');

  // Résumé
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ UPLOAD TERMINÉ');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log(`📄 Fichier: ${FILE_NAME}`);
  console.log(`📊 Taille: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
  console.log(`🪣 Bucket: ${BUCKET_NAME}`);
  console.log(`🔗 URL publique:\n`);
  console.log(`   ${publicUrlData.publicUrl}\n`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('💡 Prochaines étapes:');
  console.log('   1. Testez l\'URL dans votre navigateur');
  console.log('   2. Mettez à jour votre code pour utiliser cette URL');
  console.log('   3. Le fichier est maintenant servi par Supabase CDN\n');
}

main().catch(err => {
  console.error('❌ Erreur:', err);
  process.exit(1);
});
