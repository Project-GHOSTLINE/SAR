/**
 * SCRIPT DE TEST COMPLET - ANALYSE CLIENT
 * Pour Google Apps Script
 *
 * Instructions:
 * 1. Ouvrir https://script.google.com/
 * 2. Créer un nouveau projet
 * 3. Coller ce code
 * 4. Modifier API_URL si nécessaire
 * 5. Exécuter la fonction testSendAnalysis()
 * 6. Vérifier les logs (Ctrl+Enter ou Cmd+Enter)
 */

// ========================================
// CONFIGURATION
// ========================================
const API_URL = 'https://admin.solutionargentrapide.ca/api/admin/client-analysis';
// const API_URL = 'http://localhost:3000/api/admin/client-analysis'; // Pour tests locaux

// ========================================
// FONCTION PRINCIPALE DE TEST
// ========================================
function testSendAnalysis() {
  Logger.log('🚀 Début du test d\'envoi d\'analyse client...\n');

  try {
    // Test 1: Analyse Flinks (Solution Argent Rapide)
    Logger.log('📊 Test 1: Envoi analyse Flinks...');
    const resultFlinks = sendAnalysisToAPI(generateFlinksTestData());
    Logger.log('✅ Résultat Flinks:');
    Logger.log(JSON.stringify(resultFlinks, null, 2));
    Logger.log('\n---\n');

    // Attendre 2 secondes
    Utilities.sleep(2000);

    // Test 2: Analyse Inverite (Crédit Secours)
    Logger.log('📊 Test 2: Envoi analyse Inverite...');
    const resultInverite = sendAnalysisToAPI(generateInveriteTestData());
    Logger.log('✅ Résultat Inverite:');
    Logger.log(JSON.stringify(resultInverite, null, 2));

    Logger.log('\n✨ Tests terminés avec succès!');

  } catch (error) {
    Logger.log('❌ ERREUR: ' + error.message);
    Logger.log('Stack: ' + error.stack);
  }
}

// ========================================
// ENVOI À L'API
// ========================================
function sendAnalysisToAPI(analysisData) {
  const options = {
    'method': 'post',
    'contentType': 'application/json',
    'payload': JSON.stringify(analysisData),
    'muteHttpExceptions': true,
    'headers': {
      'Origin': 'https://dashboard.flinks.com' // Origine de confiance
    }
  };

  Logger.log('📤 Envoi à: ' + API_URL);
  Logger.log('📦 Données: ' + analysisData.client_name + ' - ' + analysisData.source);

  const response = UrlFetchApp.fetch(API_URL, options);
  const responseCode = response.getResponseCode();
  const responseBody = response.getContentText();

  Logger.log('📥 Code de réponse: ' + responseCode);

  if (responseCode === 200) {
    return JSON.parse(responseBody);
  } else {
    throw new Error('Erreur HTTP ' + responseCode + ': ' + responseBody);
  }
}

// ========================================
// GÉNÉRATION DE DONNÉES DE TEST FLINKS
// ========================================
function generateFlinksTestData() {
  const today = new Date();

  // Générer des transactions pour les 3 derniers mois
  const transactions = [];
  for (let monthOffset = 0; monthOffset < 3; monthOffset++) {
    const monthDate = new Date(today.getFullYear(), today.getMonth() - monthOffset, 1);

    // 20-30 transactions par mois
    const txCount = Math.floor(Math.random() * 10) + 20;
    for (let i = 0; i < txCount; i++) {
      const day = Math.floor(Math.random() * 28) + 1;
      const txDate = new Date(monthDate.getFullYear(), monthDate.getMonth(), day);

      const isCredit = Math.random() > 0.6; // 40% crédits, 60% débits
      const amount = Math.random() * (isCredit ? 2000 : 500) + (isCredit ? 500 : 20);

      transactions.push({
        date: txDate.toISOString().split('T')[0],
        description: getRandomTransaction(isCredit),
        credit: isCredit ? amount : 0,
        debit: isCredit ? 0 : amount,
        balance: 1000 + Math.random() * 500,
        category: getRandomCategory(isCredit),
        flags: getRandomFlags()
      });
    }
  }

  // Trier par date décroissante
  transactions.sort((a, b) => new Date(b.date) - new Date(a.date));

  // Générer 4 dernières paies
  const paychecks = [];
  for (let i = 0; i < 4; i++) {
    const payDate = new Date(today);
    payDate.setDate(payDate.getDate() - (i * 14)); // Bi-hebdomadaire

    paychecks.push({
      date: payDate.toISOString().split('T')[0],
      amount: 1450.75 + Math.random() * 200,
      employer: i % 2 === 0 ? 'TECH SOLUTIONS INC' : 'ABC CORPORATION',
      netPay: 1450.75 + Math.random() * 200,
      payDate: payDate.toISOString().split('T')[0]
    });
  }

  return {
    client_name: 'Melissa Emmanuelle Brillant',
    source: 'flinks',
    inverite_guid: null,
    raw_data: {
      clientInfo: {
        email: 'meliboom25@gmail.com',
        phone: '514-555-1234',
        address: '2940 AV BOURQUE MASCOUCHE, QC, J7K 2A3'
      },
      accounts: [
        {
          bank: 'Banque Nationale',
          institution: 'Banque Nationale du Canada',
          accountNumber: '1234567',
          account: '1234567',
          institution_number: '006',
          institutionNumber: '006',
          transit_number: '10001',
          transitNumber: '10001',
          type: 'Operation - Chequing',
          balance: 609.07,
          current_balance: 609.07,
          transactions: transactions.slice(0, Math.floor(transactions.length * 0.87))
        },
        {
          bank: 'Banque Nationale',
          institution: 'Banque Nationale du Canada',
          accountNumber: '7654321',
          account: '7654321',
          institution_number: '006',
          institutionNumber: '006',
          transit_number: '10001',
          transitNumber: '10001',
          type: 'Operation - Savings',
          balance: 0.00,
          current_balance: 0.00,
          transactions: transactions.slice(Math.floor(transactions.length * 0.87))
        }
      ],
      paychecks: paychecks
    }
  };
}

// ========================================
// GÉNÉRATION DE DONNÉES DE TEST INVERITE
// ========================================
function generateInveriteTestData() {
  const today = new Date();

  // Transactions pour Desjardins
  const transactions = [];
  for (let monthOffset = 0; monthOffset < 3; monthOffset++) {
    const monthDate = new Date(today.getFullYear(), today.getMonth() - monthOffset, 1);
    const txCount = Math.floor(Math.random() * 15) + 15;

    for (let i = 0; i < txCount; i++) {
      const day = Math.floor(Math.random() * 28) + 1;
      const txDate = new Date(monthDate.getFullYear(), monthDate.getMonth(), day);
      const isCredit = Math.random() > 0.65;
      const amount = Math.random() * (isCredit ? 1500 : 400) + (isCredit ? 400 : 15);

      transactions.push({
        date: txDate.toISOString().split('T')[0],
        description: getRandomTransaction(isCredit),
        credit: isCredit ? amount : 0,
        debit: isCredit ? 0 : amount,
        balance: 800 + Math.random() * 400,
        category: getRandomCategory(isCredit),
        flags: getRandomFlags()
      });
    }
  }

  transactions.sort((a, b) => new Date(b.date) - new Date(a.date));

  // Paychecks
  const paychecks = [];
  for (let i = 0; i < 4; i++) {
    const payDate = new Date(today);
    payDate.setDate(payDate.getDate() - (i * 14));

    paychecks.push({
      date: payDate.toISOString().split('T')[0],
      amount: 1285.50 + Math.random() * 150,
      employer: 'SERVICES QUÉBEC INC',
      netPay: 1285.50 + Math.random() * 150,
      payDate: payDate.toISOString().split('T')[0]
    });
  }

  return {
    client_name: 'Jean-François Tremblay',
    source: 'inverite',
    inverite_guid: 'INV-' + Utilities.getUuid(),
    raw_data: {
      clientInfo: {
        email: 'jf.tremblay@example.com',
        phone: '418-555-9876',
        address: '123 RUE PRINCIPALE QUÉBEC, QC, G1A 1A1'
      },
      accounts: [
        {
          bank: 'Desjardins',
          institution: 'Caisse Desjardins',
          accountNumber: '9876543',
          account: '9876543',
          institution_number: '815',
          institutionNumber: '815',
          transit_number: '90001',
          transitNumber: '90001',
          type: 'Compte-chèques',
          balance: 1245.88,
          current_balance: 1245.88,
          transactions: transactions
        }
      ],
      paychecks: paychecks
    }
  };
}

// ========================================
// FONCTIONS UTILITAIRES
// ========================================
function getRandomTransaction(isCredit) {
  const credits = [
    'PAIE - EMPLOYEUR',
    'VIREMENT INTERAC',
    'DÉPÔT',
    'REMBOURSEMENT',
    'TRANSFERT ENTRANT',
    'CRÉDIT GOUVERNEMENT'
  ];

  const debits = [
    'METRO PLUS #4521',
    'IGA EXTRA #8934',
    'SUPER C #2341',
    'TIM HORTONS #15',
    'SHELL CANADA',
    'HYDRO-QUÉBEC',
    'VIDEOTRON',
    'WALMART #3421',
    'PHARMAPRIX #876',
    'DOLLARAMA #1D6',
    'KLARNA*WALMART',
    'NETFLIX.COM',
    'SPOTIFY PREMIUM',
    'AMAZON.CA',
    'UBER EATS'
  ];

  const list = isCredit ? credits : debits;
  return list[Math.floor(Math.random() * list.length)];
}

function getRandomCategory(isCredit) {
  if (isCredit) {
    return Math.random() > 0.5 ? 'income' : null;
  }

  const categories = [
    'groceries',
    'transport',
    'bills',
    'shopping',
    'entertainment',
    'health',
    'other'
  ];

  return Math.random() > 0.3 ? categories[Math.floor(Math.random() * categories.length)] : null;
}

function getRandomFlags() {
  const allFlags = ['duplicate', 'suspicious', 'recurring', 'large', 'verified'];
  const flagCount = Math.random();

  if (flagCount > 0.9) {
    // 10% chance d'avoir des flags
    const numFlags = Math.floor(Math.random() * 2) + 1;
    const flags = [];
    for (let i = 0; i < numFlags; i++) {
      flags.push(allFlags[Math.floor(Math.random() * allFlags.length)]);
    }
    return [...new Set(flags)]; // Retirer les doublons
  }

  return [];
}

// ========================================
// TESTS INDIVIDUELS
// ========================================

/**
 * Test uniquement Flinks
 */
function testFlinksOnly() {
  Logger.log('🧪 Test Flinks uniquement...');
  const result = sendAnalysisToAPI(generateFlinksTestData());
  Logger.log('✅ Résultat:');
  Logger.log(JSON.stringify(result, null, 2));
}

/**
 * Test uniquement Inverite
 */
function testInveriteOnly() {
  Logger.log('🧪 Test Inverite uniquement...');
  const result = sendAnalysisToAPI(generateInveriteTestData());
  Logger.log('✅ Résultat:');
  Logger.log(JSON.stringify(result, null, 2));
}

/**
 * Test de mise à jour (envoyer 2 fois le même GUID)
 */
function testUpdateAnalysis() {
  Logger.log('🧪 Test de mise à jour...');

  // Premier envoi
  const data1 = generateInveriteTestData();
  const guid = 'TEST-UPDATE-' + new Date().getTime();
  data1.inverite_guid = guid;

  Logger.log('📤 Premier envoi (création)...');
  const result1 = sendAnalysisToAPI(data1);
  Logger.log('✅ Résultat 1:');
  Logger.log(JSON.stringify(result1, null, 2));

  Utilities.sleep(2000);

  // Deuxième envoi avec le même GUID (mise à jour)
  const data2 = generateInveriteTestData();
  data2.inverite_guid = guid;
  data2.client_name = 'Jean-François Tremblay (MISE À JOUR)';

  Logger.log('\n📤 Deuxième envoi (mise à jour)...');
  const result2 = sendAnalysisToAPI(data2);
  Logger.log('✅ Résultat 2:');
  Logger.log(JSON.stringify(result2, null, 2));

  if (result2.isUpdate) {
    Logger.log('\n✨ Mise à jour confirmée!');
  }
}

/**
 * Afficher un exemple de données générées sans envoyer
 */
function showSampleData() {
  Logger.log('📋 Exemple de données Flinks:');
  Logger.log(JSON.stringify(generateFlinksTestData(), null, 2));

  Logger.log('\n---\n');

  Logger.log('📋 Exemple de données Inverite:');
  Logger.log(JSON.stringify(generateInveriteTestData(), null, 2));
}

// ========================================
// MENU PERSONNALISÉ (si utilisé dans Sheets)
// ========================================
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('🧪 Tests Analyse Client')
    .addItem('▶️ Lancer tous les tests', 'testSendAnalysis')
    .addSeparator()
    .addItem('📊 Test Flinks', 'testFlinksOnly')
    .addItem('📊 Test Inverite', 'testInveriteOnly')
    .addItem('🔄 Test Mise à jour', 'testUpdateAnalysis')
    .addSeparator()
    .addItem('👁️ Voir exemples de données', 'showSampleData')
    .addToUi();
}
