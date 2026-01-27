import { NextResponse } from 'next/server'

/**
 * GET /api/telemetry/test-track
 *
 * Automatic test endpoint - simulates a real telemetry tracking request
 * Returns detailed error information for debugging
 */
export async function GET(request: Request) {
  const diagnostics = {
    timestamp: new Date().toISOString(),
    test: 'Telemetry Track Event',
    steps: [] as any[]
  }

  try {
    // Step 1: Test with a real POST to track-event
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://admin.solutionargentrapide.ca'
    const trackEventUrl = `${baseUrl}/api/telemetry/track-event`

    diagnostics.steps.push({
      step: 1,
      action: 'Prepare test request',
      url: trackEventUrl
    })

    // Step 2: Create test payload
    const testPayload = {
      event_type: 'page_view',
      event_name: '/test-automated',
      page_url: '/test',
      referrer_url: null,
      duration_ms: 100,
      payload: {},
      utm_source: null,
      utm_medium: null,
      utm_campaign: null
    }

    diagnostics.steps.push({
      step: 2,
      action: 'Test payload created',
      payload: testPayload
    })

    // Step 3: Make request with test session cookie
    const testSessionId = 'test_' + Date.now() + '_' + Math.random().toString(36).substring(2, 15)

    diagnostics.steps.push({
      step: 3,
      action: 'Generated test session ID',
      sessionId: testSessionId.substring(0, 20) + '...'
    })

    // Step 4: Execute POST request
    const response = await fetch(trackEventUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `sar_session_id=${testSessionId}`,
        'User-Agent': 'TestBot/1.0 (Automated Debug)',
        'x-forwarded-for': '1.1.1.1', // Cloudflare DNS (safe test IP)
      },
      body: JSON.stringify(testPayload)
    })

    const responseData = await response.json()

    diagnostics.steps.push({
      step: 4,
      action: 'POST request completed',
      status: response.status,
      statusText: response.statusText,
      response: responseData
    })

    // Step 5: Analyze result
    if (response.ok) {
      diagnostics.steps.push({
        step: 5,
        action: 'SUCCESS',
        result: '✅ Telemetry tracking is working!',
        event_id: responseData.event_id
      })

      return NextResponse.json({
        success: true,
        message: 'Telemetry tracking is working correctly',
        diagnostics
      })
    } else {
      // FAILURE - Capture error details
      diagnostics.steps.push({
        step: 5,
        action: 'FAILURE',
        result: '❌ Telemetry tracking returned an error',
        error: responseData.error || 'Unknown error',
        details: responseData.details || null
      })

      return NextResponse.json({
        success: false,
        message: 'Telemetry tracking failed',
        error: responseData,
        diagnostics
      }, { status: 500 })
    }

  } catch (error) {
    // Catch any network/fetch errors
    diagnostics.steps.push({
      step: 'ERROR',
      action: 'Exception caught',
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack,
        name: error.name
      } : String(error)
    })

    return NextResponse.json({
      success: false,
      message: 'Test failed with exception',
      diagnostics
    }, { status: 500 })
  }
}
