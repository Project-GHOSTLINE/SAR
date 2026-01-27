import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Force dynamic rendering (uses query params)
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

interface ClickEvent {
  x: number
  y: number
  viewport_width: number
  viewport_height: number
  element_selector: string
  element_text: string
}

interface NormalizedClick {
  x_percent: number // 0-100
  y_percent: number // 0-100
  absolute_x: number
  absolute_y: number
  element_selector: string
  element_text: string
  viewport_width: number
  viewport_height: number
}

/**
 * GET /api/analytics/click-heatmap?page=/
 *
 * Returns click heatmap data for a specific page
 * - Aggregates all clicks for the page
 * - Normalizes coordinates by viewport size
 * - Returns click density data for visualization
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const pageUrl = searchParams.get('page') || '/'

    // Query click events for this page
    const { data: events, error } = await supabase
      .from('client_telemetry_events')
      .select('payload, created_at')
      .eq('event_type', 'click')
      .eq('page_url', pageUrl)
      .order('created_at', { ascending: false })
      .limit(1000) // Last 1000 clicks

    if (error) {
      console.error('[ClickHeatmap] Database error:', error)
      return NextResponse.json(
        { success: false, error: 'Database error', details: error.message },
        { status: 500 }
      )
    }

    if (!events || events.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          page_url: pageUrl,
          total_clicks: 0,
          clicks: [],
          viewport_stats: null
        }
      })
    }

    // Extract and normalize click data
    const normalizedClicks: NormalizedClick[] = []
    let totalViewportWidth = 0
    let totalViewportHeight = 0
    let validClickCount = 0

    for (const event of events) {
      const payload = event.payload as ClickEvent

      // Validate payload structure
      if (
        !payload ||
        typeof payload.x !== 'number' ||
        typeof payload.y !== 'number' ||
        typeof payload.viewport_width !== 'number' ||
        typeof payload.viewport_height !== 'number'
      ) {
        continue // Skip invalid clicks
      }

      // Normalize coordinates to percentage (0-100)
      const x_percent = (payload.x / payload.viewport_width) * 100
      const y_percent = (payload.y / payload.viewport_height) * 100

      normalizedClicks.push({
        x_percent,
        y_percent,
        absolute_x: payload.x,
        absolute_y: payload.y,
        element_selector: payload.element_selector || 'unknown',
        element_text: payload.element_text || '',
        viewport_width: payload.viewport_width,
        viewport_height: payload.viewport_height
      })

      totalViewportWidth += payload.viewport_width
      totalViewportHeight += payload.viewport_height
      validClickCount++
    }

    // Calculate average viewport size (for reference)
    const avgViewport = validClickCount > 0 ? {
      width: Math.round(totalViewportWidth / validClickCount),
      height: Math.round(totalViewportHeight / validClickCount)
    } : null

    // Group clicks by grid cells (10x10 grid = 100 cells)
    // This creates a density map for visualization
    const gridSize = 20 // 20x20 = 400 cells for better granularity
    const densityMap: Record<string, number> = {}

    for (const click of normalizedClicks) {
      const gridX = Math.floor(click.x_percent / (100 / gridSize))
      const gridY = Math.floor(click.y_percent / (100 / gridSize))
      const cellKey = `${gridX},${gridY}`
      densityMap[cellKey] = (densityMap[cellKey] || 0) + 1
    }

    // Convert density map to array format for visualization
    const densityGrid = Object.entries(densityMap).map(([key, count]) => {
      const [gridX, gridY] = key.split(',').map(Number)
      return {
        grid_x: gridX,
        grid_y: gridY,
        x_percent_start: gridX * (100 / gridSize),
        y_percent_start: gridY * (100 / gridSize),
        x_percent_end: (gridX + 1) * (100 / gridSize),
        y_percent_end: (gridY + 1) * (100 / gridSize),
        click_count: count
      }
    }).sort((a, b) => b.click_count - a.click_count) // Sort by hottest first

    return NextResponse.json({
      success: true,
      data: {
        page_url: pageUrl,
        total_clicks: normalizedClicks.length,
        viewport_stats: avgViewport,
        grid_size: gridSize,
        density_grid: densityGrid,
        raw_clicks: normalizedClicks.slice(0, 100) // Include first 100 raw clicks for detailed view
      }
    })
  } catch (error) {
    console.error('[ClickHeatmap] Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        debug: {
          message: error instanceof Error ? error.message : String(error)
        }
      },
      { status: 500 }
    )
  }
}
