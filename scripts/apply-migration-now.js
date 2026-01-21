#!/usr/bin/env node

/**
 * Script pour appliquer la migration SEO directement dans Supabase
 */

const fs = require('fs');
const path = require('path');

async function applyMigration() {
  try {
    console.log('🚀 Application de la migration SEO...\n');

    // Lire les credentials depuis .env.local
    const envPath = path.join(__dirname, '..', '.env.local');
    const envContent = fs.readFileSync(envPath, 'utf-8');

    const getEnvValue = (key) => {
      const match = envContent.match(new RegExp(`${key}=(.+)`));
      return match ? match[1].trim() : null;
    };

    const supabaseUrl = getEnvValue('NEXT_PUBLIC_SUPABASE_URL');
    const supabaseKey = getEnvValue('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseKey) {
      console.error('❌ Credentials Supabase manquants dans .env.local');
      process.exit(1);
    }

    console.log('✅ Credentials trouvés');
    console.log(`📡 URL: ${supabaseUrl}`);

    // Lire le fichier SQL
    const sqlPath = path.join(__dirname, '..', 'supabase', 'migrations', '20260121000000_seo_metrics_system.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf-8');

    console.log(`📄 Migration chargée (${sqlContent.split('\n').length} lignes)\n`);

    // Exécuter via l'API Supabase
    console.log('⏳ Exécution de la migration...');

    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({ query: sqlContent })
    });

    // Note: L'endpoint exec_sql peut ne pas exister
    // Essayons une autre approche via le client Supabase

    console.log('\n⚠️  L\'API REST Supabase ne permet pas l\'exécution SQL directe.');
    console.log('📋 Utilisons l\'approche manuelle...\n');

    console.log('╔═══════════════════════════════════════════════════════════════╗');
    console.log('║  ÉTAPES POUR APPLIQUER LA MIGRATION MANUELLEMENT             ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝\n');

    console.log('1️⃣  Ouvrir Supabase Dashboard:');
    console.log('   https://supabase.com/dashboard/project/dllyzfuqjzuhvshrlmuq/editor\n');

    console.log('2️⃣  Cliquer sur "SQL Editor" dans la sidebar\n');

    console.log('3️⃣  Cliquer sur "New Query"\n');

    console.log('4️⃣  Copier le fichier SQL:');
    console.log(`   ${sqlPath}\n`);

    console.log('5️⃣  Coller dans l\'éditeur SQL\n');

    console.log('6️⃣  Cliquer sur "RUN" (ou Ctrl+Enter)\n');

    console.log('7️⃣  Vérifier le message:');
    console.log('   ✅ SEO Metrics System: Toutes les tables créées avec succès (6/6)\n');

    console.log('═══════════════════════════════════════════════════════════════\n');

    console.log('💡 Voulez-vous ouvrir le fichier SQL maintenant? [O/n]');
    console.log(`   cat ${sqlPath}\n`);

    // Afficher les 50 premières lignes
    const lines = sqlContent.split('\n');
    console.log('📄 Aperçu du fichier (50 premières lignes):\n');
    console.log('─────────────────────────────────────────────────────────────');
    console.log(lines.slice(0, 50).join('\n'));
    console.log('─────────────────────────────────────────────────────────────');
    console.log(`... et ${lines.length - 50} lignes supplémentaires\n`);

    console.log('✅ Pour voir le fichier complet:');
    console.log(`   cat ${sqlPath}\n`);

  } catch (error) {
    console.error('❌ Erreur:', error.message);
    process.exit(1);
  }
}

applyMigration();
