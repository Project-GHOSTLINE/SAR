#!/usr/bin/env node

/**
 * PHASE 1: Supprimer Malicious Records
 * Date: 2026-01-22
 * Risk: LOW
 */

const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = 'https://dllyzfuqjzuhvshrlmuq.supabase.co'
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRsbHl6ZnVxanp1aHZzaHJsbXVxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTk5NTk4MSwiZXhwIjoyMDgxNTcxOTgxfQ.Qg5eQwDxeAtTDXplNkQZa4hOp_dSMBIu_DKbuquryFo'

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

const MALICIOUS_IDS = [
  "'; DROP TABLE vopay_webhook_logs; --",
  '<script>alert("XSS")</script>',
  '../../../etc/passwd',
  '; cat /etc/passwd'
]

async function main() {
  console.log('🔴 PHASE 1: SUPPRIMER MALICIOUS RECORDS')
  console.log('=========================================')
  console.log(`Date: ${new Date().toISOString()}`)
  console.log(`Records à supprimer: ${MALICIOUS_IDS.length}`)
  console.log('')

  // Vérifier d'abord que ces records existent
  console.log('🔍 Vérification des records malveillants...')
  const { data: existingRecords, error: selectError } = await supabase
    .from('vopay_objects')
    .select('id, vopay_id, object_type, created_at')
    .in('vopay_id', MALICIOUS_IDS)

  if (selectError) {
    console.error('❌ Erreur lors de la vérification:', selectError.message)
    process.exit(1)
  }

  console.log(`✅ ${existingRecords.length} records malveillants trouvés:`)
  existingRecords.forEach(r => {
    console.log(`  - ${r.vopay_id.substring(0, 40)}...`)
  })
  console.log('')

  if (existingRecords.length === 0) {
    console.log('✅ Aucun record malveillant trouvé! Déjà nettoyé.')
    process.exit(0)
  }

  // Supprimer les records
  console.log('🗑️  Suppression des records malveillants...')
  const { data: deletedData, error: deleteError } = await supabase
    .from('vopay_objects')
    .delete()
    .in('vopay_id', MALICIOUS_IDS)
    .select()

  if (deleteError) {
    console.error('❌ Erreur lors de la suppression:', deleteError.message)
    process.exit(1)
  }

  console.log(`✅ ${deletedData.length} records supprimés avec succès!`)
  console.log('')

  // Vérifier qu'ils sont bien supprimés
  console.log('✅ Vérification post-suppression...')
  const { data: remainingRecords, error: verifyError } = await supabase
    .from('vopay_objects')
    .select('count')
    .in('vopay_id', MALICIOUS_IDS)

  if (verifyError) {
    console.error('❌ Erreur lors de la vérification:', verifyError.message)
    process.exit(1)
  }

  if (remainingRecords.length === 0) {
    console.log('✅ Tous les records malveillants ont été supprimés!')
  } else {
    console.error('❌ Certains records existent encore!')
    process.exit(1)
  }

  // Statistiques finales
  const { count: totalVopay } = await supabase
    .from('vopay_objects')
    .select('*', { count: 'exact', head: true })

  console.log('')
  console.log('📊 STATISTIQUES FINALES')
  console.log('=========================================')
  console.log(`Records malveillants supprimés: ${deletedData.length}`)
  console.log(`Total vopay_objects restants: ${totalVopay}`)
  console.log('')
  console.log('🎉 PHASE 1 TERMINÉE AVEC SUCCÈS!')
  console.log('')
}

main()
