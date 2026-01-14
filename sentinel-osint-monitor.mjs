#!/usr/bin/env node
/**
 * 🛡️ SENTINEL OSINT Monitor
 * Surveillance en temps réel du Worker Claude
 */

import { watch } from 'fs';
import { readFileSync, statSync, readdirSync } from 'fs';
import { join, basename, extname } from 'path';
import { createHash } from 'crypto';
import { execSync } from 'child_process';

const PROJECT_DIR = process.cwd();
const REPORT_FILE = join(PROJECT_DIR, 'SENTINEL-OSINT-REPORT.json');
const UPDATE_INTERVAL = 2000; // 2 secondes

// État du système
const state = {
  startTime: new Date().toISOString(),
  totalScans: 0,
  detectedFiles: [],
  activities: [],
  workerStatus: {
    status: 'UNKNOWN',
    lastUpdate: null,
    filesCreated: 0,
    filesModified: 0,
    linesAdded: 0,
    commits: 0
  },
  alerts: [],
  fileHashes: new Map()
};

// Couleurs pour console
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(emoji, color, message) {
  console.log(`${colors[color]}${emoji} ${message}${colors.reset}`);
}

function calculateHash(content) {
  return createHash('sha256').update(content).digest('hex');
}

function getGitStatus() {
  try {
    const output = execSync('git status --short', { encoding: 'utf8', cwd: PROJECT_DIR });
    return output.split('\n').filter(line => line.trim());
  } catch (error) {
    return [];
  }
}

function getGitDiff() {
  try {
    const output = execSync('git diff --stat', { encoding: 'utf8', cwd: PROJECT_DIR });
    return output;
  } catch (error) {
    return '';
  }
}

function countLinesInFile(filePath) {
  try {
    const content = readFileSync(filePath, 'utf8');
    return content.split('\n').length;
  } catch {
    return 0;
  }
}

function analyzeFile(filePath) {
  try {
    const stats = statSync(filePath);
    const content = readFileSync(filePath, 'utf8');
    const hash = calculateHash(content);
    const lines = content.split('\n').length;
    const size = stats.size;
    const ext = extname(filePath);

    return {
      path: filePath,
      name: basename(filePath),
      extension: ext,
      size: size,
      lines: lines,
      hash: hash,
      modified: stats.mtime.toISOString(),
      content: content.substring(0, 500) // Premiers 500 chars pour analyse
    };
  } catch (error) {
    return null;
  }
}

function detectFileType(filePath) {
  const ext = extname(filePath);
  const name = basename(filePath);

  if (name.includes('WORKER')) return '👷 WORKER';
  if (name.includes('SENTINEL')) return '🛡️ SENTINEL';
  if (ext === '.sql') return '💾 SQL';
  if (ext === '.ts' || ext === '.tsx') return '💻 TypeScript';
  if (ext === '.js' || ext === '.mjs') return '📜 JavaScript';
  if (ext === '.md') return '📄 Markdown';
  if (ext === '.html') return '🌐 HTML';
  if (ext === '.json') return '⚙️ JSON';
  return '📁 File';
}

function analyzeWorkerStatus() {
  const workerStatusPath = join(PROJECT_DIR, 'WORKER-STATUS.md');
  const workerChangelogPath = join(PROJECT_DIR, 'WORKER-CHANGELOG.md');

  let status = 'UNKNOWN';
  let lastUpdate = null;

  // Lire WORKER-STATUS.md
  try {
    const content = readFileSync(workerStatusPath, 'utf8');

    // Extraire le status
    if (content.includes('Status: ⏳ WAITING')) status = 'WAITING';
    else if (content.includes('Status: 🔄 IN_PROGRESS')) status = 'IN_PROGRESS';
    else if (content.includes('Status: ✅ COMPLETED')) status = 'COMPLETED';
    else if (content.includes('Status: 🚫 BLOCKED')) status = 'BLOCKED';

    // Extraire la dernière mise à jour
    const updateMatch = content.match(/Last Update: (.*)/);
    if (updateMatch) lastUpdate = updateMatch[1];

  } catch (error) {
    // Fichier n'existe pas encore
  }

  return { status, lastUpdate };
}

function scanDirectory() {
  state.totalScans++;

  log('🔍', 'cyan', `Scan #${state.totalScans} - ${new Date().toLocaleTimeString()}`);

  // Récupérer les fichiers non commités
  const gitStatus = getGitStatus();
  const newFiles = [];
  const modifiedFiles = [];

  gitStatus.forEach(line => {
    const [status, file] = line.trim().split(/\s+/);
    if (status === '??') {
      newFiles.push(file);
    } else if (status === 'M' || status === 'MM') {
      modifiedFiles.push(file);
    }
  });

  // Analyser chaque fichier
  const allFiles = [...new Set([...newFiles, ...modifiedFiles])];

  allFiles.forEach(file => {
    const filePath = join(PROJECT_DIR, file);
    const analysis = analyzeFile(filePath);

    if (analysis) {
      const previousHash = state.fileHashes.get(filePath);

      if (!previousHash) {
        // Nouveau fichier détecté
        log('✨', 'green', `NOUVEAU: ${file}`);

        state.activities.unshift({
          time: new Date().toISOString(),
          type: 'created',
          file: file,
          size: analysis.size,
          lines: analysis.lines,
          fileType: detectFileType(file)
        });

        state.alerts.unshift({
          level: 'info',
          time: new Date().toISOString(),
          message: `Nouveau fichier créé: ${file}`,
          file: file
        });

        state.workerStatus.filesCreated++;

      } else if (previousHash !== analysis.hash) {
        // Fichier modifié
        log('📝', 'yellow', `MODIFIÉ: ${file}`);

        state.activities.unshift({
          time: new Date().toISOString(),
          type: 'modified',
          file: file,
          size: analysis.size,
          lines: analysis.lines,
          fileType: detectFileType(file)
        });

        state.alerts.unshift({
          level: 'warning',
          time: new Date().toISOString(),
          message: `Fichier modifié: ${file}`,
          file: file
        });

        state.workerStatus.filesModified++;
      }

      state.fileHashes.set(filePath, analysis.hash);

      // Ajouter à la liste des fichiers détectés
      const existingIndex = state.detectedFiles.findIndex(f => f.path === filePath);
      if (existingIndex >= 0) {
        state.detectedFiles[existingIndex] = analysis;
      } else {
        state.detectedFiles.push(analysis);
      }
    }
  });

  // Mettre à jour le statut du Worker
  const workerStatus = analyzeWorkerStatus();
  state.workerStatus = {
    ...state.workerStatus,
    ...workerStatus
  };

  // Compter les lignes totales
  state.workerStatus.linesAdded = state.detectedFiles.reduce((sum, file) => sum + file.lines, 0);

  // Limiter les tableaux
  if (state.activities.length > 50) state.activities = state.activities.slice(0, 50);
  if (state.alerts.length > 20) state.alerts = state.alerts.slice(0, 20);

  // Vérifications spécifiques
  checkWorkerCompliance();

  // Afficher résumé
  console.log('');
  log('📊', 'blue', `Fichiers détectés: ${state.detectedFiles.length}`);
  log('👷', 'magenta', `Worker status: ${workerStatus.status}`);
  log('📝', 'cyan', `Lignes totales: ${state.workerStatus.linesAdded}`);
  console.log('');
}

function checkWorkerCompliance() {
  // Vérifier si le Worker suit le protocole

  const sentinelInstructionsPath = join(PROJECT_DIR, 'SENTINEL-INSTRUCTIONS.md');
  const workerStatusPath = join(PROJECT_DIR, 'WORKER-STATUS.md');

  try {
    const instructionsStat = statSync(sentinelInstructionsPath);
    const statusStat = statSync(workerStatusPath);

    // Si les instructions ont été modifiées après le status
    if (instructionsStat.mtime > statusStat.mtime) {
      const alert = {
        level: 'danger',
        time: new Date().toISOString(),
        message: '⚠️ Worker n\'a pas lu les nouvelles instructions!',
        file: 'SENTINEL-INSTRUCTIONS.md'
      };

      // Éviter les doublons
      if (!state.alerts.find(a => a.message === alert.message)) {
        state.alerts.unshift(alert);
        log('🚨', 'red', alert.message);
      }
    }
  } catch (error) {
    // Fichiers n'existent pas encore
  }

  // Vérifier les fichiers critiques
  const criticalFiles = [
    'database/claude-memory-system.sql',
    'scripts/init-claude-memory.mjs',
    'CLAUDE-MEMORY-GUIDE.md'
  ];

  criticalFiles.forEach(file => {
    const filePath = join(PROJECT_DIR, file);
    try {
      statSync(filePath);
      // Fichier existe - OK
    } catch {
      const alert = {
        level: 'warning',
        time: new Date().toISOString(),
        message: `⚠️ Fichier critique manquant: ${file}`,
        file: file
      };

      if (!state.alerts.find(a => a.file === file && a.message.includes('manquant'))) {
        state.alerts.unshift(alert);
      }
    }
  });
}

function generateOSINTReport() {
  const report = {
    metadata: {
      generated: new Date().toISOString(),
      sentinel_version: '1.0.0',
      project: 'SAR',
      uptime: Math.floor((Date.now() - new Date(state.startTime).getTime()) / 1000),
      total_scans: state.totalScans
    },
    worker: {
      status: state.workerStatus.status,
      last_update: state.workerStatus.lastUpdate,
      statistics: {
        files_created: state.workerStatus.filesCreated,
        files_modified: state.workerStatus.filesModified,
        lines_added: state.workerStatus.linesAdded,
        commits: state.workerStatus.commits,
        total_files: state.detectedFiles.length
      }
    },
    files: state.detectedFiles.map(f => ({
      name: f.name,
      path: f.path,
      extension: f.extension,
      size: f.size,
      lines: f.lines,
      modified: f.modified,
      hash: f.hash.substring(0, 16) + '...',
      preview: f.content.substring(0, 200)
    })),
    activities: state.activities.slice(0, 20),
    alerts: state.alerts.slice(0, 10),
    git: {
      uncommitted_files: getGitStatus().length,
      diff_summary: getGitDiff()
    }
  };

  return report;
}

async function saveReport() {
  const report = generateOSINTReport();

  try {
    const { writeFile } = await import('fs/promises');
    await writeFile(REPORT_FILE, JSON.stringify(report, null, 2));
    log('💾', 'green', `Rapport OSINT sauvegardé: ${REPORT_FILE}`);
  } catch (error) {
    log('❌', 'red', `Erreur sauvegarde: ${error.message}`);
  }
}

function startMonitoring() {
  console.clear();
  log('🛡️', 'bright', '════════════════════════════════════════');
  log('🛡️', 'bright', '   SENTINEL OSINT Monitor - ACTIF');
  log('🛡️', 'bright', '   Surveillance en Temps Réel');
  log('🛡️', 'bright', '════════════════════════════════════════');
  console.log('');
  log('📍', 'cyan', `Dossier: ${PROJECT_DIR}`);
  log('⏰', 'cyan', `Démarré: ${new Date().toLocaleString()}`);
  log('🔄', 'cyan', `Intervalle: ${UPDATE_INTERVAL}ms`);
  console.log('');
  log('🎯', 'green', 'Surveillance démarrée...');
  console.log('');

  // Scan initial
  scanDirectory();

  // Scan périodique
  setInterval(() => {
    scanDirectory();
    saveReport();
  }, UPDATE_INTERVAL);

  // Surveiller les changements de fichiers en temps réel
  watch(PROJECT_DIR, { recursive: true }, (eventType, filename) => {
    if (filename && !filename.includes('node_modules') && !filename.includes('.git')) {
      log('👁️', 'yellow', `Changement détecté: ${filename}`);
      setTimeout(scanDirectory, 500); // Petit délai pour laisser l'écriture se terminer
    }
  });
}

// Gestion des erreurs
process.on('uncaughtException', (error) => {
  log('❌', 'red', `Erreur: ${error.message}`);
});

process.on('SIGINT', () => {
  console.log('');
  log('🛑', 'yellow', 'Arrêt du Sentinel...');
  saveReport();
  log('✅', 'green', 'Rapport final sauvegardé');
  process.exit(0);
});

// Démarrer
startMonitoring();
