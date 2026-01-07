import crypto from 'crypto'

const config = {
  accountId: 'solutionargentrapideinc',
  apiKey: 'bUXExKVc0sLyNS9zjfGq6AJukdDB1pvCR5ihHF78',
  sharedSecret: 'ToDqaRRl4nmwnAYVc+==',
  apiUrl: 'https://earthnode.vopay.com/api/v2/'
}

function generateSignature() {
  const today = new Date().toISOString().split('T')[0]
  const signatureString = config.apiKey + config.sharedSecret + today
  return crypto.createHash('sha1').update(signatureString).digest('hex')
}

const params = new URLSearchParams()
params.set('AccountID', config.accountId)
params.set('Key', config.apiKey)
params.set('Signature', generateSignature())

const endDate = new Date().toISOString().split('T')[0]
const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
params.set('StartDateTime', startDate)
params.set('EndDateTime', endDate)
params.set('NumberOfTransactions', '5')

const url = `${config.apiUrl}account/transactions?${params.toString()}`

const response = await fetch(url)
const data = await response.json()

console.log('Response keys:', Object.keys(data))
console.log('Transactions type:', typeof data.Transactions)
console.log('Transactions is array:', Array.isArray(data.Transactions))
console.log('\nFull response:')
console.log(JSON.stringify(data, null, 2).substring(0, 3000))
