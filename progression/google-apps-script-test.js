/**
 * SCRIPT GOOGLE APPS SCRIPT - Test API Portail Progression
 *
 * Installation:
 * 1. Ouvre Google Sheets
 * 2. Extensions → Apps Script
 * 3. Colle ce code
 * 4. Sauvegarde
 * 5. Crée un menu personnalisé ou utilise les fonctions directement
 */

// Configuration
const API_URL = 'https://progression.solutionargentrapide.ca/api/webhook/margill';
const API_KEY = 'FredRosa%1978';

/**
 * Créer le menu personnalisé dans Google Sheets
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('📊 API Progression')
    .addItem('🆕 Créer un nouveau dossier', 'creerNouveauDossier')
    .addItem('📝 Mettre à jour le statut', 'mettreAJourStatut')
    .addItem('🔗 Générer Magic Link', 'genererMagicLink')
    .addSeparator()
    .addItem('🧪 Test Cycle Complet', 'testCycleComplet')
    .addItem('📊 Voir Dashboard', 'ouvrirDashboard')
    .addToUi();
}

/**
 * 1. Créer un nouveau dossier (comme si Margill l'envoyait)
 */
function creerNouveauDossier() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const ui = SpreadsheetApp.getUi();

  // Demander les informations
  const dossierId = ui.prompt('ID du dossier', 'Entrez l\'ID du dossier Margill:', ui.ButtonSet.OK_CANCEL);
  if (dossierId.getSelectedButton() != ui.Button.OK) return;

  const nomClient = ui.prompt('Nom du client', 'Nom complet:', ui.ButtonSet.OK_CANCEL);
  if (nomClient.getSelectedButton() != ui.Button.OK) return;

  const email = ui.prompt('Email', 'Adresse email:', ui.ButtonSet.OK_CANCEL);
  if (email.getSelectedButton() != ui.Button.OK) return;

  const telephone = ui.prompt('Téléphone', 'Format: +15141234567', ui.ButtonSet.OK_CANCEL);
  if (telephone.getSelectedButton() != ui.Button.OK) return;

  const montant = ui.prompt('Montant', 'Montant du prêt (ex: 7500.00):', ui.ButtonSet.OK_CANCEL);
  if (montant.getSelectedButton() != ui.Button.OK) return;

  // Construire le payload
  const payload = {
    dossier_id: dossierId.getResponseText(),
    statut_margill: 'nouveau_dossier',
    nom_client: nomClient.getResponseText(),
    email_client: email.getResponseText(),
    telephone_client: telephone.getResponseText(),
    montant: parseFloat(montant.getResponseText())
  };

  // Envoyer à l'API
  const response = envoyerWebhook(payload);

  // Afficher le résultat
  if (response.success) {
    ui.alert('✅ Succès!',
      'Dossier créé: ' + response.data.application_id + '\n' +
      'Statut mappé: ' + response.data.mapped_status,
      ui.ButtonSet.OK
    );

    // Logger dans la feuille
    loggerResultat(sheet, 'CRÉATION', dossierId.getResponseText(), response);
  } else {
    ui.alert('❌ Erreur', response.error || 'Erreur inconnue', ui.ButtonSet.OK);
  }
}

/**
 * 2. Mettre à jour le statut d'un dossier existant
 */
function mettreAJourStatut() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const ui = SpreadsheetApp.getUi();

  // Liste des statuts disponibles
  const statuts = [
    'nouveau_dossier',
    'en_attente_ibv',
    'ibv_completee',
    'analyse_en_cours',
    'offre_en_preparation',
    'offre_envoyee',
    'offre_acceptee',
    'contrat_en_preparation',
    'contrat_envoye',
    'en_attente_signature',
    'contrat_signe',
    'transfert_de_fonds',
    'pret_actif',
    'refuse',
    'sans_reponse'
  ];

  const dossierId = ui.prompt('ID du dossier', 'Entrez l\'ID du dossier à mettre à jour:', ui.ButtonSet.OK_CANCEL);
  if (dossierId.getSelectedButton() != ui.Button.OK) return;

  const statutChoisi = ui.prompt(
    'Nouveau statut',
    'Statuts disponibles:\n' + statuts.join('\n') + '\n\nEntrez le statut:',
    ui.ButtonSet.OK_CANCEL
  );
  if (statutChoisi.getSelectedButton() != ui.Button.OK) return;

  // Construire le payload
  const payload = {
    dossier_id: dossierId.getResponseText(),
    statut_margill: statutChoisi.getResponseText()
  };

  // Envoyer à l'API
  const response = envoyerWebhook(payload);

  // Afficher le résultat
  if (response.success) {
    ui.alert('✅ Succès!',
      'Statut mis à jour: ' + response.data.mapped_status,
      ui.ButtonSet.OK
    );

    // Logger dans la feuille
    loggerResultat(sheet, 'MAJ STATUT', dossierId.getResponseText(), response);
  } else {
    ui.alert('❌ Erreur', response.error || 'Erreur inconnue', ui.ButtonSet.OK);
  }
}

/**
 * 3. Générer un Magic Link
 */
function genererMagicLink() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const ui = SpreadsheetApp.getUi();

  const dossierId = ui.prompt('ID du dossier', 'ID du dossier Margill:', ui.ButtonSet.OK_CANCEL);
  if (dossierId.getSelectedButton() != ui.Button.OK) return;

  const telephone = ui.prompt('Téléphone', 'Numéro de téléphone (+15141234567):', ui.ButtonSet.OK_CANCEL);
  if (telephone.getSelectedButton() != ui.Button.OK) return;

  const payload = {
    application_id: 'MARGILL-' + dossierId.getResponseText(),
    phone: telephone.getResponseText()
  };

  const options = {
    method: 'post',
    contentType: 'application/json',
    headers: {
      'x-api-key': API_KEY
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  try {
    const response = UrlFetchApp.fetch('https://progression.solutionargentrapide.ca/api/admin/magic-link', options);
    const result = JSON.parse(response.getContentText());

    if (result.success) {
      ui.alert('✅ Magic Link généré!',
        'URL: ' + result.data.url + '\n\n' +
        'Expire: ' + result.data.expires_at + '\n' +
        'Max utilisations: ' + result.data.max_uses,
        ui.ButtonSet.OK
      );

      // Logger dans la feuille
      const row = sheet.getLastRow() + 1;
      sheet.getRange(row, 1, 1, 5).setValues([[
        new Date(),
        'MAGIC LINK',
        'MARGILL-' + dossierId.getResponseText(),
        '✅ Succès',
        result.data.url
      ]]);
    } else {
      ui.alert('❌ Erreur', result.error || 'Erreur inconnue', ui.ButtonSet.OK);
    }
  } catch (e) {
    ui.alert('❌ Erreur', e.toString(), ui.ButtonSet.OK);
  }
}

/**
 * 4. Test cycle complet (création → IBV → offre → signature → actif)
 */
function testCycleComplet() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const ui = SpreadsheetApp.getUi();

  const confirmation = ui.alert(
    '🧪 Test Cycle Complet',
    'Ce test va:\n' +
    '1. Créer un dossier TEST-CYCLE-' + Date.now() + '\n' +
    '2. Passer par plusieurs statuts\n' +
    '3. Générer un magic link\n\n' +
    'Continuer?',
    ui.ButtonSet.YES_NO
  );

  if (confirmation != ui.Button.YES) return;

  const dossierId = 'TEST-CYCLE-' + Date.now();
  const telephone = '+15140000999';

  const etapes = [
    { statut: 'nouveau_dossier', label: '1. Demande reçue' },
    { statut: 'ibv_completee', label: '2. IBV reçu' },
    { statut: 'analyse_en_cours', label: '3. Analyse en cours' },
    { statut: 'offre_envoyee', label: '4. Offre envoyée' },
    { statut: 'offre_acceptee', label: '5. Offre acceptée' },
    { statut: 'en_attente_signature', label: '6. En attente signature' },
    { statut: 'contrat_signe', label: '7. Contrat signé' },
    { statut: 'pret_actif', label: '8. Prêt actif' }
  ];

  let resultats = [];

  // Étape 1: Créer le dossier
  const payloadCreation = {
    dossier_id: dossierId,
    statut_margill: 'nouveau_dossier',
    nom_client: 'Test Cycle Complet',
    email_client: 'cycle@test.com',
    telephone_client: telephone,
    montant: 5000.00
  };

  const responseCreation = envoyerWebhook(payloadCreation);
  resultats.push(['Création', responseCreation.success ? '✅' : '❌', responseCreation.data ? responseCreation.data.mapped_status : responseCreation.error]);

  Utilities.sleep(1000);

  // Passer par chaque statut
  for (let i = 1; i < etapes.length; i++) {
    const payload = {
      dossier_id: dossierId,
      statut_margill: etapes[i].statut
    };

    const response = envoyerWebhook(payload);
    resultats.push([etapes[i].label, response.success ? '✅' : '❌', response.data ? response.data.mapped_status : response.error]);

    Utilities.sleep(1000);
  }

  // Générer magic link
  const payloadLink = {
    application_id: 'MARGILL-' + dossierId,
    phone: telephone
  };

  const optionsLink = {
    method: 'post',
    contentType: 'application/json',
    headers: {
      'x-api-key': API_KEY
    },
    payload: JSON.stringify(payloadLink),
    muteHttpExceptions: true
  };

  try {
    const responseLink = UrlFetchApp.fetch('https://progression.solutionargentrapide.ca/api/admin/magic-link', optionsLink);
    const resultLink = JSON.parse(responseLink.getContentText());

    if (resultLink.success) {
      resultats.push(['Magic Link', '✅', resultLink.data.url]);
    } else {
      resultats.push(['Magic Link', '❌', resultLink.error]);
    }
  } catch (e) {
    resultats.push(['Magic Link', '❌', e.toString()]);
  }

  // Écrire les résultats dans la feuille
  const row = sheet.getLastRow() + 1;
  sheet.getRange(row, 1).setValue('=== TEST CYCLE COMPLET: ' + dossierId + ' ===');
  sheet.getRange(row + 1, 1, resultats.length, 3).setValues(resultats);

  ui.alert('✅ Test terminé!',
    'Dossier créé: MARGILL-' + dossierId + '\n\n' +
    'Consulte la feuille pour voir tous les résultats.\n\n' +
    'Dashboard: https://progression.solutionargentrapide.ca/debug',
    ui.ButtonSet.OK
  );
}

/**
 * Ouvrir le dashboard
 */
function ouvrirDashboard() {
  const ui = SpreadsheetApp.getUi();
  ui.alert('📊 Dashboard',
    'URL: https://progression.solutionargentrapide.ca/debug\n\n' +
    'Mot de passe: FredRosa%1978',
    ui.ButtonSet.OK
  );
}

/**
 * Fonction helper: Envoyer un webhook
 */
function envoyerWebhook(payload) {
  const options = {
    method: 'post',
    contentType: 'application/json',
    headers: {
      'x-api-key': API_KEY
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  try {
    const response = UrlFetchApp.fetch(API_URL, options);
    const result = JSON.parse(response.getContentText());
    return result;
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

/**
 * Fonction helper: Logger le résultat dans la feuille
 */
function loggerResultat(sheet, action, dossierId, response) {
  const row = sheet.getLastRow() + 1;
  sheet.getRange(row, 1, 1, 5).setValues([[
    new Date(),
    action,
    dossierId,
    response.success ? '✅ Succès' : '❌ Erreur',
    response.success ? response.data.mapped_status : response.error
  ]]);
}

/**
 * Fonction de test rapide (sans UI)
 */
function testRapideAPI() {
  const payload = {
    dossier_id: 'GOOGLE-TEST-' + Date.now(),
    statut_margill: 'nouveau_dossier',
    nom_client: 'Test Google Script',
    email_client: 'google@test.com',
    telephone_client: '+15140000777',
    montant: 3000.00
  };

  const response = envoyerWebhook(payload);
  Logger.log(response);
  return response;
}
