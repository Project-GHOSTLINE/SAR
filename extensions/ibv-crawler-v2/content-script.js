/**
 * Content Script pour IBV Crawler V2
 * S'exécute sur les pages Inverite pour extraire et uploader les données
 */

// ============================================================================
// Configuration et État
// ============================================================================

const CONFIG = {
  API_ENDPOINT: 'https://admin.solutionargentrapide.ca/api/admin/client-analysis',
  INVERITE_API_BASE: 'https://app.inverite.com/api/v2',
  CHECK_INTERVAL: 2000, // Vérifier toutes les 2 secondes
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000
};

// État de l'extraction
let extractionState = {
  isRunning: false,
  lastGuid: null,
  uploadedGuids: new Set() // Pour éviter les doublons
};

// ============================================================================
// Logger Utility
// ============================================================================

const Logger = {
  prefix: '[IBV-Crawler-V2]',

  log: (stage, message, data = {}) => {
    console.log(`${Logger.prefix} [${stage}] ${message}`, {
      timestamp: new Date().toISOString(),
      ...data
    });
  },

  error: (stage, message, error) => {
    console.error(`${Logger.prefix} [${stage}] ❌ ${message}`, {
      timestamp: new Date().toISOString(),
      error: error.message,
      stack: error.stack
    });
  },

  timing: (stage, duration) => {
    console.log(`${Logger.prefix} [${stage}] ⏱️ ${Math.round(duration)}ms`);
  }
};

// ============================================================================
// Détection du GUID Inverite
// ============================================================================

/**
 * Extrait le GUID depuis l'URL ou la page
 */
function extractGuidFromPage() {
  // Méthode 1: Depuis l'URL (ex: /request/abc123def)
  const urlMatch = window.location.pathname.match(/\/request\/([a-f0-9-]+)/i);
  if (urlMatch) {
    return urlMatch[1];
  }

  // Méthode 2: Depuis l'URL query param (ex: ?guid=abc123def)
  const params = new URLSearchParams(window.location.search);
  const guidParam = params.get('guid') || params.get('request');
  if (guidParam) {
    return guidParam;
  }

  // Méthode 3: Depuis le DOM (chercher des attributs data-guid ou similaires)
  const guidElement = document.querySelector('[data-guid], [data-request-id], [data-request]');
  if (guidElement) {
    return guidElement.dataset.guid || guidElement.dataset.requestId || guidElement.dataset.request;
  }

  // Méthode 4: Depuis le texte visible (ex: "Request ID: abc123def")
  const bodyText = document.body.textContent;
  const textMatch = bodyText.match(/(?:Request ID|GUID|Verification ID):\s*([a-f0-9-]+)/i);
  if (textMatch) {
    return textMatch[1];
  }

  return null;
}

/**
 * Vérifie si la page est une page de complétion Inverite
 */
function isInveriteCompletionPage() {
  // Vérifier l'URL
  const isRequestPage = window.location.pathname.includes('/request/');

  // Vérifier les indicateurs visuels
  const hasStatusIndicator = document.body.textContent.match(/(?:Verified|Complete|Status:)/i);

  // Vérifier la présence de données client
  const hasClientData = document.querySelector('[data-client-name], .client-info, .verification-complete');

  return isRequestPage && (hasStatusIndicator || hasClientData);
}

// ============================================================================
// Extraction des Données Inverite via API
// ============================================================================

/**
 * Récupère les données complètes d'une vérification Inverite
 */
async function fetchInveriteData(guid) {
  const startTime = performance.now();
  Logger.log('FETCH', `Récupération des données pour GUID: ${guid}`);

  try {
    // 1. Fetch des données principales (/api/v2/fetch/{guid})
    const fetchResponse = await fetch(`${CONFIG.INVERITE_API_BASE}/fetch/${guid}`, {
      credentials: 'include'
    });

    if (!fetchResponse.ok) {
      throw new Error(`Fetch failed: ${fetchResponse.status}`);
    }

    const fetchData = await fetchResponse.json();
    Logger.log('FETCH', 'Données principales récupérées', {
      name: fetchData.name,
      accounts: fetchData.accounts?.length,
      status: fetchData.status
    });

    // 2. Fetch du risk score (/api/v2/risk)
    let riskData = null;
    try {
      const riskResponse = await fetch(`${CONFIG.INVERITE_API_BASE}/risk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ request: guid }),
        credentials: 'include'
      });

      if (riskResponse.ok) {
        riskData = await riskResponse.json();
        Logger.log('RISK', 'Risk score récupéré', {
          score: riskData.risk_score,
          level: riskData.risk_level
        });
      }
    } catch (riskErr) {
      Logger.error('RISK', 'Échec récupération risk score', riskErr);
    }

    // 3. Fetch des microloans (/api/v2/microcheck)
    let microloansData = null;
    try {
      const microResponse = await fetch(`${CONFIG.INVERITE_API_BASE}/microcheck`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guid, days: 90 }),
        credentials: 'include'
      });

      if (microResponse.ok) {
        microloansData = await microResponse.json();
        Logger.log('MICRO', 'Microloans récupérés', {
          has_microloans: microloansData.has_microloans,
          lenders: microloansData.lenders?.length
        });
      }
    } catch (microErr) {
      Logger.error('MICRO', 'Échec récupération microloans', microErr);
    }

    const duration = performance.now() - startTime;
    Logger.timing('FETCH', duration);

    return {
      fetchData,
      riskData,
      microloansData
    };

  } catch (error) {
    Logger.error('FETCH', 'Erreur extraction données Inverite', error);
    throw error;
  }
}

// ============================================================================
// Upload vers API SAR
// ============================================================================

/**
 * Upload les données extraites vers l'API SAR
 */
async function uploadToSAR(guid, inveriteData) {
  const startTime = performance.now();
  Logger.log('UPLOAD', `Upload des données vers SAR pour GUID: ${guid}`);

  const { fetchData, riskData, microloansData } = inveriteData;

  // Préparer le payload selon le format attendu par l'API
  const payload = {
    client_name: fetchData.name,
    source: 'inverite',
    inverite_guid: guid,
    raw_data: fetchData,
    inverite_risk_score: riskData?.risk_score || null,
    risk_level: riskData?.risk_level || null,
    microloans_data: microloansData || null
  };

  try {
    const response = await fetch(CONFIG.API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload),
      credentials: 'include'
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Upload failed');
    }

    const duration = performance.now() - startTime;
    Logger.timing('UPLOAD', duration);
    Logger.log('UPLOAD', 'Upload réussi', {
      analysis_id: result.data?.id,
      isUpdate: result.isUpdate
    });

    // Notifier le background script
    chrome.runtime.sendMessage({
      type: 'UPLOAD_SUCCESS',
      data: result
    });

    return result;

  } catch (error) {
    Logger.error('UPLOAD', 'Erreur upload vers SAR', error);

    // Notifier le background script de l'erreur
    chrome.runtime.sendMessage({
      type: 'UPLOAD_ERROR',
      error: error.message
    });

    throw error;
  }
}

// ============================================================================
// Processus Principal d'Extraction
// ============================================================================

/**
 * Lance le processus complet d'extraction et upload
 */
async function extractAndUpload(guid) {
  // Éviter les extractions en double
  if (extractionState.uploadedGuids.has(guid)) {
    Logger.log('SKIP', `GUID ${guid} déjà uploadé, skip`);
    return;
  }

  if (extractionState.isRunning) {
    Logger.log('SKIP', 'Extraction déjà en cours, skip');
    return;
  }

  extractionState.isRunning = true;
  extractionState.lastGuid = guid;

  try {
    Logger.log('START', `Début de l'extraction pour GUID: ${guid}`);

    // 1. Vérifier la configuration (auto-upload activé?)
    const { config } = await chrome.storage.local.get('config');
    const autoUploadEnabled = config?.autoUpload !== false;

    if (!autoUploadEnabled) {
      Logger.log('SKIP', 'Auto-upload désactivé dans la configuration');
      return;
    }

    // 2. Extraire les données Inverite
    const inveriteData = await fetchInveriteData(guid);

    // 3. Upload vers SAR
    await uploadToSAR(guid, inveriteData);

    // 4. Marquer comme uploadé
    extractionState.uploadedGuids.add(guid);

    // 5. Notifier le background script
    chrome.runtime.sendMessage({
      type: 'DATA_EXTRACTED',
      guid
    });

    Logger.log('SUCCESS', `Extraction et upload complétés pour GUID: ${guid}`);

  } catch (error) {
    Logger.error('EXTRACT', 'Erreur durant l\'extraction', error);
  } finally {
    extractionState.isRunning = false;
  }
}

// ============================================================================
// Surveillance de la Page
// ============================================================================

/**
 * Surveille la page pour détecter les nouvelles vérifications
 */
function startPageMonitoring() {
  Logger.log('INIT', 'Démarrage de la surveillance de la page');

  // Vérification périodique
  setInterval(() => {
    if (!isInveriteCompletionPage()) {
      return;
    }

    const guid = extractGuidFromPage();
    if (!guid) {
      return;
    }

    if (guid !== extractionState.lastGuid && !extractionState.uploadedGuids.has(guid)) {
      Logger.log('DETECT', `Nouveau GUID détecté: ${guid}`);
      extractAndUpload(guid);
    }
  }, CONFIG.CHECK_INTERVAL);

  // Vérification immédiate au chargement
  setTimeout(() => {
    if (isInveriteCompletionPage()) {
      const guid = extractGuidFromPage();
      if (guid) {
        Logger.log('DETECT', `GUID détecté au chargement: ${guid}`);
        extractAndUpload(guid);
      }
    }
  }, 1000);
}

// ============================================================================
// Injection d'UI (optionnel)
// ============================================================================

/**
 * Injecte un indicateur visuel sur la page Inverite
 */
function injectVisualIndicator(status = 'ready', message = 'Extension active') {
  // Supprimer l'ancien indicateur s'il existe
  const existingIndicator = document.getElementById('ibv-crawler-indicator');
  if (existingIndicator) {
    existingIndicator.remove();
  }

  // Créer le nouvel indicateur
  const indicator = document.createElement('div');
  indicator.id = 'ibv-crawler-indicator';
  indicator.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    padding: 12px 16px;
    background: ${status === 'success' ? '#4CAF50' : status === 'error' ? '#F44336' : '#2196F3'};
    color: white;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px;
    z-index: 999999;
    transition: opacity 0.3s;
  `;
  indicator.textContent = `SAR: ${message}`;

  document.body.appendChild(indicator);

  // Retirer après 3 secondes
  setTimeout(() => {
    indicator.style.opacity = '0';
    setTimeout(() => indicator.remove(), 300);
  }, 3000);
}

// ============================================================================
// Initialisation
// ============================================================================

// Démarrer la surveillance si on est sur une page Inverite
if (window.location.hostname.includes('inverite.com')) {
  Logger.log('INIT', 'Content script chargé sur page Inverite', {
    url: window.location.href,
    pathname: window.location.pathname
  });

  startPageMonitoring();

  // Injecter l'indicateur visuel
  if (isInveriteCompletionPage()) {
    injectVisualIndicator('ready', 'Extension active - Auto-upload activé');
  }
} else {
  Logger.log('INIT', 'Page non-Inverite, content script inactif');
}
