import { NextResponse } from 'next/server'

export async function GET() {
  const adminPassword = process.env.ADMIN_PASSWORD || 'NOT_SET'

  return NextResponse.json({
    hasAdminPassword: !!process.env.ADMIN_PASSWORD,
    length: adminPassword.length,
    first3: adminPassword.substring(0, 3),
    last3: adminPassword.substring(adminPassword.length - 3),
    charCodes: adminPassword.split('').map(c => c.charCodeAt(0))
  })
}
