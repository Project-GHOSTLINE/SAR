/**
 * TEMPORARY DEBUG ROUTE
 * To check GA4 env vars on Vercel
 */

import { NextResponse } from 'next/server'

export async function GET() {
  const hasJson = !!process.env.GA_SERVICE_ACCOUNT_JSON
  const hasPropertyId = !!process.env.GA_PROPERTY_ID
  const jsonLength = process.env.GA_SERVICE_ACCOUNT_JSON?.length || 0

  let parseable = false
  let parseError = null

  if (hasJson) {
    try {
      JSON.parse(process.env.GA_SERVICE_ACCOUNT_JSON!)
      parseable = true
    } catch (err: any) {
      parseError = err.message
    }
  }

  return NextResponse.json({
    hasJson,
    hasPropertyId,
    jsonLength,
    parseable,
    parseError,
    propertyId: process.env.GA_PROPERTY_ID || 'missing',
    jsonPreview: process.env.GA_SERVICE_ACCOUNT_JSON?.substring(0, 100) + '...'
  })
}
