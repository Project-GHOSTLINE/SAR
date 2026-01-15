import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    const { clientId } = await params

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY! // Service role côté serveur
    )

    const { data, error } = await supabase
      .rpc('get_client_audit_history', { p_client_id: clientId })

    if (error) {
      console.error('Audit RPC error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data || [])
  } catch (err: any) {
    console.error('Audit API error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
