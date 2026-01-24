/**
 * Test: API endpoint with margill_id
 *
 * Purpose: Verify that /api/admin/client/{margill_id}/dossier works
 */

require('dotenv').config({ path: '.env.local' })

const TEST_MARGILL_ID = 'MC9004'
const API_URL = `http://localhost:3000/api/admin/client/${TEST_MARGILL_ID}/dossier`

async function testAPI() {
  console.log('🧪 Testing API with margill_id...\n')
  console.log(`URL: ${API_URL}\n`)

  try {
    const startTime = Date.now()
    const response = await fetch(API_URL)
    const duration = Date.now() - startTime

    console.log(`Status: ${response.status}`)
    console.log(`Duration: ${duration}ms`)

    const data = await response.json()

    if (response.ok) {
      console.log('\n✅ SUCCESS')
      console.log('\nResponse keys:', Object.keys(data).join(', '))
      console.log('\nMetadata:')
      console.log(JSON.stringify(data._meta, null, 2))
      console.log('\nConcordances count:', data.concordances?.length || 0)
      console.log('Autres contrats count:', data.autres_contrats?.length || 0)
    } else {
      console.log('\n❌ FAILED')
      console.log('Error:', data)
    }
  } catch (error) {
    console.error('\n❌ Error:', error.message)
    console.log('\n⚠️  Make sure dev server is running: npm run dev')
  }
}

testAPI().catch(console.error)
