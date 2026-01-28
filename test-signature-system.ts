/**
 * Script de test pour le système de signature SAR
 *
 * Ce script teste le flow complet:
 * 1. Crée un document de test
 * 2. Génère le lien de signature
 * 3. Affiche le lien pour test manuel
 */

import * as fs from 'fs'
import * as path from 'path'

const API_URL = 'http://localhost:3000'

// PDF de test simple (1 page blanche)
const createTestPDF = (): string => {
  // PDF minimal valide (1 page blanche)
  const pdfContent = `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj
2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj
3 0 obj
<<
/Type /Page
/Parent 2 0 R
/Resources <<
/Font <<
/F1 <<
/Type /Font
/Subtype /Type1
/BaseFont /Helvetica
>>
>>
>>
/MediaBox [0 0 612 792]
/Contents 4 0 R
>>
endobj
4 0 obj
<<
/Length 44
>>
stream
BT
/F1 24 Tf
100 700 Td
(Contrat de Test SAR) Tj
ET
endstream
endobj
xref
0 5
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n
0000000315 00000 n
trailer
<<
/Size 5
/Root 1 0 R
>>
startxref
408
%%EOF`

  return Buffer.from(pdfContent).toString('base64')
}

async function testSignatureSystem() {
  console.log('🧪 Test du système de signature SAR\n')

  // 1. Créer le document de test
  console.log('📄 Création du document de test...')

  const testData = {
    clientName: 'Jean Tremblay (TEST)',
    clientEmail: 'test@example.com', // Remplacer par votre email pour tester
    title: 'Contrat de Test - SAR Signature',
    pdfBase64: createTestPDF(),
    signatureFields: [
      {
        id: 'signature_1',
        type: 'signature',
        label: 'Signature du client',
        page: 1,
        x: 100,
        y: 500,
        width: 200,
        height: 80
      },
      {
        id: 'initials_1',
        type: 'initials',
        label: 'Initiales',
        page: 1,
        x: 400,
        y: 500,
        width: 100,
        height: 50
      }
    ]
  }

  try {
    const response = await fetch(`${API_URL}/api/admin/contrats-clients`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testData)
    })

    const result = await response.json()

    if (!response.ok) {
      console.error('❌ Erreur:', result.error)
      return
    }

    console.log('✅ Document créé avec succès!\n')
    console.log('📋 Détails:')
    console.log(`   Document ID: ${result.documentId}`)
    console.log(`   Expire le: ${new Date(result.expiresAt).toLocaleString('fr-CA')}`)
    console.log('\n🔗 Lien de signature:')
    console.log(`   ${result.signUrl}`)
    console.log('\n📧 Un email a été envoyé à:', testData.clientEmail)
    console.log('\n✨ Ouvrez le lien ci-dessus dans votre navigateur pour tester!')

    // Sauvegarder les infos dans un fichier
    const testInfo = {
      documentId: result.documentId,
      signUrl: result.signUrl,
      expiresAt: result.expiresAt,
      createdAt: new Date().toISOString()
    }

    fs.writeFileSync(
      path.join(__dirname, 'last-test-signature.json'),
      JSON.stringify(testInfo, null, 2)
    )

    console.log('\n💾 Infos sauvegardées dans: last-test-signature.json')

  } catch (error: any) {
    console.error('❌ Erreur:', error.message)
  }
}

// Exécuter le test
testSignatureSystem()
