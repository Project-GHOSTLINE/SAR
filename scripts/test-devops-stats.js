#!/usr/bin/env node

const jwt = require('jsonwebtoken')
const https = require('https')

// Generate admin JWT token
const JWT_SECRET = '56K2TFqsBtHQjzihmTS8palyJeA3KZHI1yYsvGEkxWQ='
const token = jwt.sign(
  { role: 'admin', email: 'admin@solutionargentrapide.ca' },
  JWT_SECRET,
  { expiresIn: '1h' }
)

const cookie = `admin-session=${token}`

// Test DevOps stats endpoint
const options = {
  hostname: 'admin.solutionargentrapide.ca',
  path: '/api/admin/devops/stats',
  method: 'GET',
  headers: {
    'Cookie': cookie
  }
}

console.log('🧪 Testing DevOps Stats Endpoint with Authentication...\n')

const req = https.request(options, (res) => {
  let data = ''

  res.on('data', (chunk) => {
    data += chunk
  })

  res.on('end', () => {
    console.log(`Status Code: ${res.statusCode}\n`)

    try {
      const json = JSON.parse(data)

      if (res.statusCode === 500 && json.details && json.details.includes('nested')) {
        console.log('❌ SQL ERROR STILL EXISTS:')
        console.log(JSON.stringify(json, null, 2))
        console.log('\n⚠️  The SQL fix needs to be applied manually.')
        console.log('\n📋 To fix:')
        console.log('1. Go to: https://supabase.com/dashboard/project/dllyzfuqjzuhvshrlmuq/sql')
        console.log('2. Copy SQL from: /tmp/DEVOPS-FIX.sql')
        console.log('3. Paste and run in SQL Editor')
        console.log('4. Re-run this test\n')
        process.exit(1)
      } else if (res.statusCode === 200) {
        console.log('✅ DevOps stats endpoint works!')
        console.log('Stats preview:', JSON.stringify(json, null, 2).substring(0, 500) + '...')
        process.exit(0)
      } else {
        console.log('⚠️  Unexpected response:')
        console.log(JSON.stringify(json, null, 2))
        process.exit(1)
      }
    } catch (err) {
      console.log('❌ Failed to parse response:')
      console.log(data.substring(0, 500))
      process.exit(1)
    }
  })
})

req.on('error', (err) => {
  console.error('❌ Request failed:', err.message)
  process.exit(1)
})

req.end()
