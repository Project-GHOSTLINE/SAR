/**
 * SMS Provider abstraction
 * Implement this based on your SMS provider (Twilio, AWS SNS, etc.)
 */

export interface SendSmsParams {
  to: string
  message: string
}

export async function sendSms(params: SendSmsParams): Promise<boolean> {
  // TODO: Implement with your SMS provider
  // For now, just log to console

  console.log('📱 SMS to send:')
  console.log('  To:', params.to)
  console.log('  Message:', params.message)

  // In development, return success
  if (process.env.NODE_ENV === 'development') {
    return true
  }

  // TODO: Replace with actual SMS provider implementation
  // Example with Twilio:
  // const client = require('twilio')(accountSid, authToken)
  // const message = await client.messages.create({
  //   body: params.message,
  //   to: params.to,
  //   from: twilioPhone
  // })
  // return !!message.sid

  throw new Error('SMS provider not configured')
}
