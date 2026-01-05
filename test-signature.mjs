import crypto from 'crypto'
import { config } from 'dotenv'

config({ path: '.env.local' })

const secret = process.env.VOPAY_SHARED_SECRET
const txId = 'TEST_123'

console.log('Secret:', secret)
console.log('Secret length:', secret?.length)
console.log('Transaction ID:', txId)
console.log('')

const signature = crypto.createHmac('sha1', secret)
  .update(txId)
  .digest('hex')

console.log('Node.js Signature:', signature)
