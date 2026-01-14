import { validateCanadianPhone } from './src/lib/validators.js'

const phones = [
  '5141234567',
  '514-123-4567',
  '(514) 123-4567',
  '+1 514 123 4567',
  '1-514-123-4567',
]

console.log('\n🧪 Test validation téléphone:\n')

phones.forEach(phone => {
  const result = validateCanadianPhone(phone)
  console.log(`Phone: "${phone}"`)
  console.log(`  Valid: ${result.valid}`)
  if (result.error) {
    console.log(`  Error: ${result.error}`)
  }
  if (result.cleaned) {
    console.log(`  Cleaned: ${result.cleaned}`)
  }
  console.log()
})
