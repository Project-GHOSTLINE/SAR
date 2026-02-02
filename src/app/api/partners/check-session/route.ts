/**
 * GET /api/partners/check-session
 *
 * Vérifie si une session de développement est active
 */

import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const session = request.cookies.get('partners-dev-session')?.value

  if (session === 'authenticated') {
    return NextResponse.json(
      { success: true, authenticated: true },
      { status: 200 }
    )
  }

  return NextResponse.json(
    { success: false, authenticated: false },
    { status: 401 }
  )
}
