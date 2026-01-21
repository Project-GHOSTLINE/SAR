import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// Vérifier l'authentification admin
function isAuthenticated(request: NextRequest): boolean {
  const token = request.cookies.get('admin-session')?.value
  const apiKey = request.headers.get('x-api-key')
  return !!token || apiKey === process.env.ADMIN_PASSWORD
}

/**
 * GET /api/seo/ga4-status
 *
 * Diagnostic des credentials GA4
 */
export async function GET(request: NextRequest) {
  try {
    if (!isAuthenticated(request)) {
      return NextResponse.json(
        { success: false, error: 'Non autorisé' },
        { status: 401 }
      )
    }

    const status = {
      GA_SERVICE_ACCOUNT_JSON: {
        exists: !!process.env.GA_SERVICE_ACCOUNT_JSON,
        length: process.env.GA_SERVICE_ACCOUNT_JSON?.length || 0,
        canParse: false,
        projectId: null,
        clientEmail: null
      },
      GA_PROPERTY_ID: {
        exists: !!process.env.GA_PROPERTY_ID,
        value: process.env.GA_PROPERTY_ID || null
      },
      NEXT_PUBLIC_GA_MEASUREMENT_ID: {
        exists: !!process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID,
        value: process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || null
      }
    }

    // Essayer de parser le JSON
    if (process.env.GA_SERVICE_ACCOUNT_JSON) {
      try {
        const credentials = JSON.parse(process.env.GA_SERVICE_ACCOUNT_JSON)
        status.GA_SERVICE_ACCOUNT_JSON.canParse = true
        status.GA_SERVICE_ACCOUNT_JSON.projectId = credentials.project_id || null
        status.GA_SERVICE_ACCOUNT_JSON.clientEmail = credentials.client_email || null
      } catch (error: any) {
        status.GA_SERVICE_ACCOUNT_JSON.canParse = false
      }
    }

    // Déterminer le mode
    const mode = status.GA_SERVICE_ACCOUNT_JSON.exists && status.GA_SERVICE_ACCOUNT_JSON.canParse
      ? 'REAL DATA'
      : 'MOCK MODE'

    return NextResponse.json({
      success: true,
      mode,
      status,
      recommendation: mode === 'MOCK MODE'
        ? 'GA_SERVICE_ACCOUNT_JSON manquant ou invalide. Ajouter la variable dans Vercel.'
        : 'Tout est configuré correctement!'
    })

  } catch (error: any) {
    console.error('❌ Erreur diagnostic GA4:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Erreur lors du diagnostic',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}
