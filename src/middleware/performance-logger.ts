/**
 * 📊 Performance Logger Middleware
 *
 * Mesure et log le temps de réponse de TOUTES les routes API
 * Stocke les résultats dans Supabase pour analyse et visualisation
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

export interface PerformanceLog {
  route: string
  method: string
  status: number
  duration_ms: number
  timestamp: string
  phase?: string
  user_agent?: string
  ip_address?: string
}

/**
 * Wrapper pour mesurer le temps d'une route API
 */
export async function measureRoutePerformance(
  request: NextRequest,
  handler: () => Promise<NextResponse>
): Promise<NextResponse> {
  const startTime = performance.now()
  const route = new URL(request.url).pathname
  const method = request.method

  let response: NextResponse
  let error: Error | null = null

  try {
    response = await handler()
  } catch (err) {
    error = err as Error
    response = NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    )
  }

  const endTime = performance.now()
  const durationMs = Math.round(endTime - startTime)

  // Logger dans la console
  const statusEmoji = response.status < 400 ? '✅' : '❌'
  const speedEmoji =
    durationMs < 50 ? '🟢' :
    durationMs < 150 ? '🟡' :
    durationMs < 300 ? '🟠' : '🔴'

  console.log(
    `${statusEmoji} ${speedEmoji} ${method} ${route} - ${durationMs}ms - ${response.status}`
  )

  // Sauvegarder dans Supabase (async, ne pas bloquer la réponse)
  savePerformanceLog({
    route,
    method,
    status: response.status,
    duration_ms: durationMs,
    timestamp: new Date().toISOString(),
    user_agent: request.headers.get('user-agent') || undefined,
    ip_address: request.headers.get('x-forwarded-for') ||
                request.headers.get('x-real-ip') ||
                undefined
  }).catch(err => {
    console.error('Failed to save performance log:', err)
  })

  // Ajouter header de performance
  response.headers.set('X-Response-Time', `${durationMs}ms`)

  return response
}

/**
 * Sauvegarder le log de performance dans Supabase
 */
async function savePerformanceLog(log: PerformanceLog): Promise<void> {
  try {
    const { error } = await supabase
      .from('api_performance_logs')
      .insert({
        route: log.route,
        method: log.method,
        status: log.status,
        duration_ms: log.duration_ms,
        timestamp: log.timestamp,
        phase: log.phase,
        user_agent: log.user_agent,
        ip_address: log.ip_address
      })

    if (error) {
      console.error('Supabase insert error:', error)
    }
  } catch (err) {
    console.error('savePerformanceLog error:', err)
  }
}

/**
 * Hook pour wrapper facilement une route API
 *
 * @example
 * export async function GET(request: NextRequest) {
 *   return withPerformanceLogging(request, async () => {
 *     // Votre logique ici
 *     return NextResponse.json({ data: 'ok' })
 *   })
 * }
 */
export const withPerformanceLogging = measureRoutePerformance
