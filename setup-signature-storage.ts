/**
 * Script de setup pour le Supabase Storage
 * Vérifie et crée le bucket "contrats" si nécessaire
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Charger les variables d'environnement
dotenv.config({ path: path.join(__dirname, '.env.local') })

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function setupStorage() {
  console.log('🔧 Configuration du Supabase Storage pour les signatures...\n')

  try {
    // Vérifier si le bucket existe
    console.log('1️⃣ Vérification du bucket "contrats"...')
    const { data: buckets, error: listError } = await supabase.storage.listBuckets()

    if (listError) {
      console.error('❌ Erreur lors de la liste des buckets:', listError.message)
      return
    }

    const bucketExists = buckets?.some(b => b.name === 'contrats')

    if (bucketExists) {
      console.log('✅ Le bucket "contrats" existe déjà')
    } else {
      console.log('📦 Création du bucket "contrats"...')

      const { data: newBucket, error: createError } = await supabase.storage.createBucket('contrats', {
        public: true,
        fileSizeLimit: 10485760, // 10MB
        allowedMimeTypes: ['application/pdf']
      })

      if (createError) {
        console.error('❌ Erreur création bucket:', createError.message)
        return
      }

      console.log('✅ Bucket "contrats" créé avec succès')
    }

    // Vérifier les permissions
    console.log('\n2️⃣ Vérification des permissions...')

    // Test d'upload
    const testPdfContent = Buffer.from('%PDF-1.4\ntest')
    const testPath = 'test/test.pdf'

    const { error: uploadError } = await supabase.storage
      .from('contrats')
      .upload(testPath, testPdfContent, {
        contentType: 'application/pdf',
        upsert: true
      })

    if (uploadError) {
      console.error('❌ Erreur test upload:', uploadError.message)
    } else {
      console.log('✅ Upload test réussi')

      // Nettoyer le fichier test
      await supabase.storage.from('contrats').remove([testPath])
      console.log('✅ Fichier test supprimé')
    }

    console.log('\n✨ Configuration terminée avec succès!')
    console.log('\n📋 Résumé:')
    console.log('   Bucket: contrats')
    console.log('   Public: Oui')
    console.log('   Taille max: 10MB')
    console.log('   Types acceptés: PDF')

  } catch (error: any) {
    console.error('❌ Erreur:', error.message)
  }
}

// Exécuter le setup
setupStorage()
