/**
 * Popup UI pour IBV Crawler V2
 * Gère l'interface utilisateur de l'extension
 */

// Charger la configuration au démarrage
document.addEventListener('DOMContentLoaded', async () => {
  console.log('[IBV-Crawler-V2] Popup loaded');

  // Charger la config depuis le storage
  const { config } = await chrome.storage.local.get('config');
  const autoUploadEnabled = config?.autoUpload !== false;

  updateAutoUploadUI(autoUploadEnabled);

  // Bouton pour ouvrir l'admin panel
  document.getElementById('open-admin').addEventListener('click', () => {
    chrome.tabs.create({
      url: 'https://admin.solutionargentrapide.ca/admin'
    });
  });

  // Bouton pour toggle auto-upload
  document.getElementById('toggle-auto-upload').addEventListener('click', async () => {
    const { config } = await chrome.storage.local.get('config');
    const newAutoUpload = !(config?.autoUpload !== false);

    await chrome.storage.local.set({
      config: {
        ...config,
        autoUpload: newAutoUpload
      }
    });

    updateAutoUploadUI(newAutoUpload);

    console.log('[IBV-Crawler-V2] Auto-upload toggled:', newAutoUpload);
  });
});

// Mettre à jour l'UI du toggle auto-upload
function updateAutoUploadUI(enabled) {
  const statusElement = document.getElementById('auto-upload-status');
  const buttonElement = document.getElementById('toggle-auto-upload');
  const indicator = statusElement.querySelector('.status-indicator');

  if (enabled) {
    statusElement.innerHTML = '<span class="status-indicator active"></span>Activé';
    buttonElement.textContent = 'Désactiver Auto-Upload';
  } else {
    statusElement.innerHTML = '<span class="status-indicator inactive"></span>Désactivé';
    buttonElement.textContent = 'Activer Auto-Upload';
  }
}
