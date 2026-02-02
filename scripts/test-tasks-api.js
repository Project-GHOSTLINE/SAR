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

// Test DevOps tasks endpoint
const options = {
  hostname: 'admin.solutionargentrapide.ca',
  path: '/api/admin/devops/tasks',
  method: 'GET',
  headers: {
    'Cookie': cookie
  }
}

console.log('🧪 Testing DevOps Tasks Endpoint...\n')

const req = https.request(options, (res) => {
  let data = ''

  res.on('data', (chunk) => {
    data += chunk
  })

  res.on('end', () => {
    console.log(`Status Code: ${res.statusCode}\n`)

    try {
      const json = JSON.parse(data)

      if (res.statusCode === 200) {
        console.log('✅ Tasks endpoint works!')
        console.log(`Total tasks: ${json.total}`)
        console.log(`Tasks returned: ${json.tasks.length}`)
        if (json.tasks.length > 0) {
          console.log('\nFirst task:')
          console.log(`  - ${json.tasks[0].task_number}: ${json.tasks[0].title}`)
          console.log(`  - Status: ${json.tasks[0].status}`)
          console.log(`  - Priority: ${json.tasks[0].priority}`)
        }
        process.exit(0)
      } else {
        console.log('❌ Error:')
        console.log(JSON.stringify(json, null, 2))
        process.exit(1)
      }
    } catch (err) {
      console.log('❌ Failed to parse response:')
      console.log(data.substring(0, 1000))
      process.exit(1)
    }
  })
})

req.on('error', (err) => {
  console.error('❌ Request failed:', err.message)
  process.exit(1)
})

req.end()
