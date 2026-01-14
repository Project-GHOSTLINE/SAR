#!/usr/bin/env node
/**
 * Script d'auto-chargement de la mémoire Claude
 * S'exécute au démarrage pour charger automatiquement le contexte
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Variables d\'environnement manquantes');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

/**
 * Charge et affiche le contexte complet
 */
async function loadAndDisplayContext() {
  console.log('\n🧠 Chargement du contexte SAR...\n');

  try {
    // Charger toutes les mémoires
    const { data: memories, error } = await supabase
      .from('claude_memory')
      .select('*')
      .eq('project_name', 'sar')
      .order('importance', { ascending: false })
      .order('category');

    if (error) throw error;

    if (!memories || memories.length === 0) {
      console.log('⚠️  Aucune mémoire trouvée');
      return;
    }

    console.log('═'.repeat(70));
    console.log('🧠 CONTEXTE DU PROJET SAR');
    console.log('═'.repeat(70));
    console.log('');

    // Grouper par catégorie
    const byCategory = {};
    memories.forEach(m => {
      if (!byCategory[m.category]) {
        byCategory[m.category] = [];
      }
      byCategory[m.category].push(m);
    });

    // Afficher Stack Technique
    if (byCategory.stack) {
      console.log('💻 STACK TECHNIQUE');
      console.log('─'.repeat(70));
      byCategory.stack.forEach(m => {
        if (m.content.frontend) console.log('  Frontend:', m.content.frontend.join(', '));
        if (m.content.backend) console.log('  Backend:', m.content.backend.join(', '));
        if (m.content.database) console.log('  Database:', m.content.database.join(', '));
        if (m.content.services) console.log('  Services:', m.content.services.join(', '));
      });
      console.log('');
    }

    // Afficher Déploiement
    if (byCategory.deployment) {
      console.log('🚀 WORKFLOW DE DÉPLOIEMENT');
      console.log('─'.repeat(70));
      byCategory.deployment.forEach(m => {
        if (m.content.steps) {
          m.content.steps.forEach((step, i) => {
            console.log(`  ${i + 1}. ${step}`);
          });
        }
        if (m.content.important) {
          console.log(`\n  ⚠️  IMPORTANT: ${m.content.important}`);
        }
      });
      console.log('');
    }

    // Afficher URLs
    if (byCategory.urls) {
      console.log('🌐 URLs DE PRODUCTION');
      console.log('─'.repeat(70));
      byCategory.urls.forEach(m => {
        Object.entries(m.content).forEach(([key, value]) => {
          console.log(`  • ${key}: ${value}`);
        });
      });
      console.log('');
    }

    // Afficher Security
    if (byCategory.security) {
      console.log('🔐 CREDENTIALS & SECURITY');
      console.log('─'.repeat(70));
      byCategory.security.forEach(m => {
        if (m.content.master_env) console.log('  Master ENV:', m.content.master_env);
        if (m.content.credentials_doc) console.log('  Documentation:', m.content.credentials_doc);
        if (m.content.admin_password) console.log('  Admin Password: ********');
      });
      console.log('');
    }

    // Afficher Project Info
    if (byCategory.project_info) {
      console.log('📋 INFORMATIONS PROJET');
      console.log('─'.repeat(70));
      byCategory.project_info.forEach(m => {
        Object.entries(m.content).forEach(([key, value]) => {
          console.log(`  • ${key}: ${value}`);
        });
      });
      console.log('');
    }

    // Stats
    console.log('📊 STATISTIQUES');
    console.log('─'.repeat(70));
    console.log(`  Mémoires totales: ${memories.length}`);
    console.log(`  Catégories: ${Object.keys(byCategory).length}`);
    console.log(`  Importance moyenne: ${(memories.reduce((sum, m) => sum + m.importance, 0) / memories.length).toFixed(1)}/10`);
    console.log('');

    console.log('═'.repeat(70));
    console.log('✅ Contexte chargé avec succès!');
    console.log('═'.repeat(70));
    console.log('');

  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
}

// Exécuter
loadAndDisplayContext();
