/**
 * DEBUG: Check if telemetry env vars are loaded
 * DELETE THIS FILE after verification
 */

import { NextResponse } from 'next/server'

export async function GET() {
  const writeKey = process.env.TELEMETRY_WRITE_KEY
  const hashSalt = process.env.TELEMETRY_HASH_SALT

  return NextResponse.json({
    telemetry_write_key_exists: !!writeKey,
    telemetry_write_key_length: writeKey?.length || 0,
    telemetry_write_key_preview: writeKey ? writeKey.substring(0, 8) + '...' : 'NOT SET',
    telemetry_hash_salt_exists: !!hashSalt,
    telemetry_hash_salt_length: hashSalt?.length || 0,
    env: process.env.NODE_ENV,
    vercel_env: process.env.VERCEL_ENV
  })
}
