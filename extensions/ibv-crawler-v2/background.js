/**
 * Background Service Worker pour IBV Crawler V2
 * Gère la configuration et les événements de l'extension
 */

// Configuration par défaut
const DEFAULT_CONFIG = {
  apiEndpoint: 'https://admin.solutionargentrapide.ca/api/admin/client-analysis',
  autoUpload: true,
  notificationsEnabled: true
};

// Initialisation à l'installation
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('[IBV-Crawler-V2] Extension installed/updated:', details.reason);

  // Charger ou initialiser la config
  const { config } = await chrome.storage.local.get('config');
  if (!config) {
    await chrome.storage.local.set({ config: DEFAULT_CONFIG });
    console.log('[IBV-Crawler-V2] Configuration initialisée');
  }
});

// Écouter les messages du content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[IBV-Crawler-V2] Message reçu:', message.type);

  switch (message.type) {
    case 'UPLOAD_SUCCESS':
      // Notification de succès
      if (DEFAULT_CONFIG.notificationsEnabled) {
        showNotification('Succès', message.data.message || 'Données uploadées avec succès', 'success');
      }
      break;

    case 'UPLOAD_ERROR':
      // Notification d'erreur
      showNotification('Erreur', message.error || 'Échec de l\'upload', 'error');
      break;

    case 'DATA_EXTRACTED':
      // Badge pour indiquer l'extraction
      chrome.action.setBadgeText({ text: '✓', tabId: sender.tab.id });
      chrome.action.setBadgeBackgroundColor({ color: '#4CAF50', tabId: sender.tab.id });
      break;

    default:
      console.warn('[IBV-Crawler-V2] Type de message inconnu:', message.type);
  }

  return true;
});

// Fonction helper pour afficher une notification
function showNotification(title, message, type = 'info') {
  // Pour Manifest V3, on utilise chrome.notifications n'est plus disponible sans permission
  // On utilise l'icône du badge à la place
  const color = type === 'success' ? '#4CAF50' : type === 'error' ? '#F44336' : '#2196F3';
  const text = type === 'success' ? '✓' : type === 'error' ? '✗' : 'i';

  chrome.action.setBadgeText({ text });
  chrome.action.setBadgeBackgroundColor({ color });

  // Réinitialiser après 3 secondes
  setTimeout(() => {
    chrome.action.setBadgeText({ text: '' });
  }, 3000);

  console.log(`[IBV-Crawler-V2] [${type.toUpperCase()}] ${title}: ${message}`);
}

// Gestion du click sur l'icône de l'extension
chrome.action.onClicked.addListener((tab) => {
  console.log('[IBV-Crawler-V2] Extension icon clicked on tab:', tab.id);

  // Ouvrir le popup ou l'admin panel
  chrome.tabs.create({
    url: 'https://admin.solutionargentrapide.ca/admin'
  });
});

console.log('[IBV-Crawler-V2] Background service worker démarré');
