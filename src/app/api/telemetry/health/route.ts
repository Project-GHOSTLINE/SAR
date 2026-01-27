import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * GET /api/telemetry/health
 *
 * Diagnostic endpoint to check telemetry system health
 */
export async function GET() {
  const diagnostics = {
    timestamp: new Date().toISOString(),
    status: 'ok',
    checks: {} as Record<string, { status: string; details?: string }>
  }

  // Check 1: TELEMETRY_HASH_SALT
  if (!process.env.TELEMETRY_HASH_SALT) {
    diagnostics.status = 'error'
    diagnostics.checks.hash_salt = {
      status: 'MISSING',
      details: 'TELEMETRY_HASH_SALT environment variable not set'
    }
  } else {
    diagnostics.checks.hash_salt = {
      status: 'OK',
      details: `Length: ${process.env.TELEMETRY_HASH_SALT.length} chars`
    }
  }

  // Check 2: Supabase connection
  try {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      diagnostics.status = 'error'
      diagnostics.checks.supabase_config = {
        status: 'MISSING',
        details: 'Supabase credentials not configured'
      }
    } else {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      )

      // Test query
      const { data, error } = await supabase
        .from('client_sessions')
        .select('session_id')
        .limit(1)

      if (error) {
        diagnostics.status = 'error'
        diagnostics.checks.supabase_connection = {
          status: 'ERROR',
          details: error.message
        }
      } else {
        diagnostics.checks.supabase_connection = {
          status: 'OK',
          details: 'Successfully queried client_sessions table'
        }
      }
    }
  } catch (error) {
    diagnostics.status = 'error'
    diagnostics.checks.supabase_connection = {
      status: 'ERROR',
      details: error instanceof Error ? error.message : 'Unknown error'
    }
  }

  // Check 3: Tables exist
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const tables = ['client_sessions', 'client_telemetry_events']
    for (const table of tables) {
      const { error } = await supabase
        .from(table)
        .select('*')
        .limit(0)

      if (error) {
        diagnostics.status = 'error'
        diagnostics.checks[`table_${table}`] = {
          status: 'ERROR',
          details: error.message
        }
      } else {
        diagnostics.checks[`table_${table}`] = {
          status: 'OK'
        }
      }
    }
  } catch (error) {
    diagnostics.status = 'error'
    diagnostics.checks.tables = {
      status: 'ERROR',
      details: error instanceof Error ? error.message : 'Unknown error'
    }
  }

  // Check 4: Node.js crypto available
  try {
    const crypto = require('crypto')
    const testHash = crypto
      .createHash('sha256')
      .update('test')
      .digest('hex')

    diagnostics.checks.crypto = {
      status: 'OK',
      details: 'crypto module available'
    }
  } catch (error) {
    diagnostics.status = 'error'
    diagnostics.checks.crypto = {
      status: 'ERROR',
      details: error instanceof Error ? error.message : 'Unknown error'
    }
  }

  const statusCode = diagnostics.status === 'ok' ? 200 : 500

  return NextResponse.json(diagnostics, { status: statusCode })
}
