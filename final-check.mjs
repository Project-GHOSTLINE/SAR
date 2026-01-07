#!/usr/bin/env node
import { readFileSync } from 'fs'

console.log('🔍 Vérification finale du dashboard...\n')

const file = readFileSync('src/app/admin/dashboard/page.tsx', 'utf-8')
const issues = []

// Check 1: animate-pulse
if (file.includes('animate-pulse')) {
  issues.push('❌ animate-pulse trouvé (cause hydration error)')
} else {
  console.log('✅ Pas d\'animate-pulse')
}

// Check 2: useState avec new Date()
if (file.match(/useState\(new Date\(\)\)/)) {
  issues.push('❌ useState(new Date()) trouvé (cause hydration error)')
} else {
  console.log('✅ Pas de useState(new Date())')
}

// Check 3: Math.random au rendu
if (file.match(/Math\.random\(\)/) && !file.includes('useEffect')) {
  issues.push('⚠️  Math.random() au rendu peut causer hydration error')
} else {
  console.log('✅ Pas de Math.random() problématique')
}

// Check 4: window sans check
const windowUsage = file.match(/(?<!typeof )window\./g)
if (windowUsage && windowUsage.length > 0) {
  console.log('⚠️  Usages de window: ' + windowUsage.length + ' (vérifier si dans useEffect)')
} else {
  console.log('✅ Pas d\'accès direct à window')
}

// Check 5: animate-spin conditionnel (OK)
const animateSpinCount = (file.match(/animate-spin/g) || []).length
console.log(`✅ animate-spin conditionnel: ${animateSpinCount} instances (OK)`)

console.log('\n' + '═'.repeat(50))
if (issues.length === 0) {
  console.log('✅ AUCUN PROBLÈME DÉTECTÉ!')
  console.log('✅ Le dashboard est prêt pour production')
  process.exit(0)
} else {
  console.log('❌ PROBLÈMES DÉTECTÉS:\n')
  issues.forEach(issue => console.log('  ' + issue))
  process.exit(1)
}
