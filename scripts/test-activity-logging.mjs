#!/usr/bin/env node

/**
 * Script de test pour le système de logging d'activité
 * Insère des actions de test dans la base de données
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const API_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

const testActions = [
  {
    action_type: 'Read',
    target: 'src/app/page.tsx',
    thought: 'Lecture de la page principale pour comprendre la structure',
    goal: 'Analyser le code existant',
    status: 'success',
    duration_ms: 150
  },
  {
    action_type: 'Read',
    target: 'package.json',
    thought: 'Vérification des dépendances du projet',
    goal: 'Comprendre la stack technique',
    status: 'success',
    duration_ms: 80
  },
  {
    action_type: 'Grep',
    target: 'supabase',
    thought: 'Recherche de toutes les utilisations de Supabase',
    goal: 'Mapper l\'intégration Supabase',
    status: 'success',
    duration_ms: 230
  },
  {
    action_type: 'Write',
    target: 'src/lib/claude-memory-loader.ts',
    thought: 'Création du système de chargement de mémoire',
    goal: 'Implémenter la mémoire longue durée',
    status: 'success',
    duration_ms: 450
  },
  {
    action_type: 'Edit',
    target: 'src/app/api/memory/store/route.ts',
    thought: 'Correction du bug de variable d\'environnement',
    goal: 'Fixer l\'erreur supabaseKey is required',
    status: 'success',
    duration_ms: 180
  },
  {
    action_type: 'Bash',
    target: 'npm run build',
    thought: 'Build du projet pour vérifier qu\'il n\'y a pas d\'erreurs',
    goal: 'Validation de la compilation',
    status: 'success',
    duration_ms: 3200
  },
  {
    action_type: 'Read',
    target: 'database/claude-memory-system.sql',
    thought: 'Lecture du schéma de base de données',
    goal: 'Comprendre la structure des tables',
    status: 'success',
    duration_ms: 200
  },
  {
    action_type: 'Write',
    target: 'public/claude-monitor.html',
    thought: 'Création du dashboard de monitoring visuel',
    goal: 'Permettre au user de voir mes actions en temps réel',
    status: 'success',
    duration_ms: 520
  },
  {
    action_type: 'Edit',
    target: 'public/test-memory.html',
    thought: 'Ajout du formatage des recalls pour affichage lisible',
    goal: 'Améliorer l\'expérience utilisateur',
    status: 'success',
    duration_ms: 280
  },
  {
    action_type: 'Bash',
    target: 'npm install',
    thought: 'Installation des dépendances',
    goal: 'Préparer l\'environnement de développement',
    status: 'success',
    duration_ms: 1800
  }
];

async function logAction(action) {
  try {
    const response = await fetch(`${API_URL}/api/activity/log`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        project_name: 'sar',
        session_id: 'test-session-' + Date.now(),
        ...action
      })
    });

    const data = await response.json();

    if (data.success) {
      console.log('✅', action.action_type.padEnd(10), '→', action.target);
    } else {
      console.log('❌', action.action_type.padEnd(10), '→', action.target, '- Erreur:', data.error);
    }

    return data;
  } catch (error) {
    console.log('❌', action.action_type.padEnd(10), '→', action.target, '- Erreur:', error.message);
    return { success: false, error: error.message };
  }
}

async function main() {
  console.log('🧪 TEST DU SYSTÈME DE LOGGING D\'ACTIVITÉ');
  console.log('═'.repeat(70));
  console.log('');
  console.log(`API URL: ${API_URL}`);
  console.log(`Actions à logger: ${testActions.length}`);
  console.log('');
  console.log('─'.repeat(70));
  console.log('');

  let successCount = 0;
  let errorCount = 0;

  for (const action of testActions) {
    const result = await logAction(action);
    if (result.success) {
      successCount++;
    } else {
      errorCount++;
    }

    // Petit délai pour simuler un timing réaliste
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log('');
  console.log('─'.repeat(70));
  console.log('');
  console.log('📊 RÉSUMÉ:');
  console.log(`  ✅ Succès: ${successCount}`);
  console.log(`  ❌ Erreurs: ${errorCount}`);
  console.log('');
  console.log('🎯 Prochaine étape:');
  console.log('  Ouvre http://localhost:3000/claude-monitor.html');
  console.log('  pour voir les actions loggées!');
  console.log('');
}

main().catch(console.error);
