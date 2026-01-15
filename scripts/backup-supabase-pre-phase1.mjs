#!/usr/bin/env node

/**
 * BACKUP SUPABASE PRE-PHASE 1
 * Exporte toutes les tables critiques avant restructuration
 */

import fs from 'fs';
import path from 'path';

const SUPABASE_URL = 'https://dllyzfuqjzuhvshrlmuq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRsbHl6ZnVxanp1aHZzaHJsbXVxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQzNzE4NTAsImV4cCI6MjA0OTk0Nzg1MH0.s-rt_DQMU2U0f6eMH33sw_E-TEo_gS_0Zb51CKQE_2k';

// Tables critiques à sauvegarder
const CRITICAL_TABLES = [
  'loan_applications',
  'client_accounts',
  'client_transactions', // INTOUCHABLE - 222k rows
  'client_analyses',
  'emails_envoyes',      // READ-ONLY - 719 rows
  'contact_messages',
  'support_tickets',
  'vopay_webhook_logs',  // RAW - 998 rows
  'fraud_cases'
];

const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
const backupDir = `/Users/xunit/Desktop/SAR_SUPABASE_BACKUP_${timestamp}`;

console.log('🔵 BACKUP SUPABASE PRE-PHASE 1');
console.log('='.repeat(60));
console.log(`📁 Backup directory: ${backupDir}`);
console.log('');

// Créer répertoire backup
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

async function getTableCount(table) {
  const url = `${SUPABASE_URL}/rest/v1/${table}?select=count`;
  const response = await fetch(url, {
    method: 'HEAD',
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Prefer': 'count=exact'
    }
  });

  const contentRange = response.headers.get('content-range');
  if (contentRange) {
    const match = contentRange.match(/\/(\d+)/);
    return match ? parseInt(match[1]) : 0;
  }
  return 0;
}

async function exportTable(table) {
  try {
    console.log(`📦 Exporting ${table}...`);

    // Compter records
    const count = await getTableCount(table);
    console.log(`   Records: ${count.toLocaleString()}`);

    if (count === 0) {
      console.log(`   ⚠️  Table vide, skip\n`);
      return { table, count: 0, status: 'empty' };
    }

    // Pour les grosses tables (>10k), on exporte par batches
    const batchSize = 1000;
    const batches = Math.ceil(count / batchSize);
    let allData = [];

    if (count > 10000) {
      console.log(`   📊 ${batches} batches de ${batchSize} records...`);

      for (let i = 0; i < batches; i++) {
        const offset = i * batchSize;
        const url = `${SUPABASE_URL}/rest/v1/${table}?select=*&limit=${batchSize}&offset=${offset}`;
        const response = await fetch(url, {
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
          }
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${await response.text()}`);
        }

        const batch = await response.json();
        allData = allData.concat(batch);

        if ((i + 1) % 10 === 0) {
          console.log(`   Progress: ${i + 1}/${batches} batches (${allData.length.toLocaleString()} records)`);
        }
      }
    } else {
      // Petites tables: un seul fetch
      const url = `${SUPABASE_URL}/rest/v1/${table}?select=*`;
      const response = await fetch(url, {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      }

      allData = await response.json();
    }

    // Sauvegarder JSON
    const filePath = path.join(backupDir, `${table}.json`);
    fs.writeFileSync(filePath, JSON.stringify(allData, null, 2));

    const fileSize = (fs.statSync(filePath).size / 1024 / 1024).toFixed(2);
    console.log(`   ✅ Saved: ${allData.length.toLocaleString()} records (${fileSize} MB)\n`);

    return {
      table,
      count: allData.length,
      size_mb: parseFloat(fileSize),
      status: 'success'
    };

  } catch (error) {
    console.error(`   ❌ Error: ${error.message}\n`);
    return { table, count: 0, status: 'error', error: error.message };
  }
}

async function createMetadata(results) {
  const metadata = {
    backup_date: new Date().toISOString(),
    backup_reason: 'Pre-Phase 1: Restructuration DB (création table clients + liens client_id)',
    total_tables: results.length,
    total_records: results.reduce((sum, r) => sum + r.count, 0),
    total_size_mb: results.reduce((sum, r) => sum + (r.size_mb || 0), 0).toFixed(2),
    tables: results,
    git_branch: 'feat/db-restructure-dossier-client',
    phase: 'Phase 0 Complete → Phase 1 Pending',
    critical_notes: [
      'client_transactions (222,101 rows) - INTOUCHABLE',
      'emails_envoyes (719 rows) - READ-ONLY',
      'vopay_webhook_logs (998 rows) - RAW',
      'Baseline établie: 224,441 total records'
    ]
  };

  const metadataPath = path.join(backupDir, '_BACKUP_METADATA.json');
  fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));

  return metadata;
}

async function createReadme(metadata) {
  const readme = `# BACKUP SUPABASE PRE-PHASE 1

**Date:** ${metadata.backup_date}
**Raison:** ${metadata.backup_reason}

## Résumé

- **Tables sauvegardées:** ${metadata.total_tables}
- **Records totaux:** ${metadata.total_records.toLocaleString()}
- **Taille totale:** ${metadata.total_size_mb} MB

## Tables

${metadata.tables.map(t => {
  if (t.status === 'success') {
    return `- ✅ **${t.table}**: ${t.count.toLocaleString()} records (${t.size_mb} MB)`;
  } else if (t.status === 'empty') {
    return `- ⚠️  **${t.table}**: 0 records (vide)`;
  } else {
    return `- ❌ **${t.table}**: ERREUR - ${t.error}`;
  }
}).join('\n')}

## Notes Critiques

${metadata.critical_notes.map(note => `- ${note}`).join('\n')}

## Restauration

Pour restaurer cette backup:
\`\`\`bash
# Option 1: Via Supabase SQL Editor
# Importer manuellement les données via interface

# Option 2: Via API (script à créer)
node scripts/restore-backup.mjs ${path.basename(backupDir)}
\`\`\`

## Contexte Git

- **Branch:** ${metadata.git_branch}
- **Phase:** ${metadata.phase}
`;

  const readmePath = path.join(backupDir, 'README.md');
  fs.writeFileSync(readmePath, readme);
}

// Exécution principale
(async () => {
  try {
    const results = [];

    for (const table of CRITICAL_TABLES) {
      const result = await exportTable(table);
      results.push(result);
    }

    console.log('='.repeat(60));
    console.log('📊 CRÉATION METADATA...');
    const metadata = await createMetadata(results);
    await createReadme(metadata);

    console.log('='.repeat(60));
    console.log('✅ BACKUP COMPLET');
    console.log('');
    console.log(`📁 Location: ${backupDir}`);
    console.log(`📊 Tables: ${metadata.total_tables}`);
    console.log(`📦 Records: ${metadata.total_records.toLocaleString()}`);
    console.log(`💾 Size: ${metadata.total_size_mb} MB`);
    console.log('');
    console.log('🟢 READY FOR PHASE 1');

  } catch (error) {
    console.error('❌ BACKUP FAILED:', error);
    process.exit(1);
  }
})();
