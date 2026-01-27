#!/usr/bin/env node

/**
 * Inspecter le format device_breakdown
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function inspectDeviceData() {
  console.log('🔍 Inspection device_breakdown\n')

  // GSC
  const { data: gscData } = await supabase
    .from('seo_gsc_metrics_daily')
    .select('date, total_clicks, device_breakdown')
    .order('date', { ascending: false })
    .limit(1)

  if (gscData && gscData[0]) {
    console.log('📊 GSC Data:')
    console.log('   Date:', gscData[0].date)
    console.log('   Total Clicks:', gscData[0].total_clicks)
    console.log('   Device Breakdown Type:', typeof gscData[0].device_breakdown)
    console.log('   Device Breakdown IsArray:', Array.isArray(gscData[0].device_breakdown))
    console.log('   Device Breakdown Content:')
    console.log(JSON.stringify(gscData[0].device_breakdown, null, 2))
  }

  console.log('\n' + '─'.repeat(50) + '\n')

  // GA4
  const { data: ga4Data } = await supabase
    .from('seo_ga4_metrics_daily')
    .select('date, users, mobile_users, desktop_users, tablet_users')
    .order('date', { ascending: false })
    .limit(1)

  if (ga4Data && ga4Data[0]) {
    console.log('📊 GA4 Data:')
    console.log('   Date:', ga4Data[0].date)
    console.log('   Total Users:', ga4Data[0].users)
    console.log('   Mobile Users:', ga4Data[0].mobile_users)
    console.log('   Desktop Users:', ga4Data[0].desktop_users)
    console.log('   Tablet Users:', ga4Data[0].tablet_users)
  }
}

inspectDeviceData()
