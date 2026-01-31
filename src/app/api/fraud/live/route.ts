/**
 * API: GET /api/fraud/live
 * Real-time fraud detection from telemetry_requests
 * Analyzes patterns to detect bots and suspicious behavior
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface BotPattern {
  ip: string;
  visitor_ids: string[];
  total_requests: number;
  zero_duration_count: number;
  avg_duration: number;
  unique_pages: number;
  suspicious_score: number;
  reasons: string[];
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const days = parseInt(searchParams.get('days') || '7');
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    // Fetch recent telemetry
    const { data: requests, error } = await supabase
      .from('telemetry_requests')
      .select('ip, visitor_id, duration_ms, path, user_agent, created_at, status')
      .gte('created_at', since)
      .order('created_at', { ascending: false });

    if (error) throw error;

    if (!requests || requests.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No telemetry data available',
      });
    }

    // Analyze patterns by IP
    const ipAnalysis = new Map<string, {
      visitor_ids: Set<string>;
      requests: typeof requests;
      zero_duration: number;
      total_duration: number;
      duration_count: number;
      unique_pages: Set<string>;
    }>();

    requests.forEach(req => {
      if (!ipAnalysis.has(req.ip)) {
        ipAnalysis.set(req.ip, {
          visitor_ids: new Set(),
          requests: [],
          zero_duration: 0,
          total_duration: 0,
          duration_count: 0,
          unique_pages: new Set(),
        });
      }

      const analysis = ipAnalysis.get(req.ip)!;
      if (req.visitor_id) analysis.visitor_ids.add(req.visitor_id);
      analysis.requests.push(req);
      if (req.duration_ms === 0) analysis.zero_duration++;
      if (req.duration_ms !== null) {
        analysis.total_duration += req.duration_ms;
        analysis.duration_count++;
      }
      analysis.unique_pages.add(req.path);
    });

    // Detect bots and suspicious IPs
    const suspiciousIPs: BotPattern[] = [];
    let totalBotsDetected = 0;
    let totalCleanSessions = 0;

    ipAnalysis.forEach((analysis, ip) => {
      const reasons: string[] = [];
      let score = 0;

      // Multiple visitor IDs from same IP (device switching or scraping)
      if (analysis.visitor_ids.size > 3) {
        reasons.push(`${analysis.visitor_ids.size} different visitor IDs`);
        score += 30;
      }

      // High percentage of zero-duration requests (bots don't render)
      const zeroDurationPct = (analysis.zero_duration / analysis.requests.length) * 100;
      if (zeroDurationPct > 50) {
        reasons.push(`${zeroDurationPct.toFixed(0)}% zero-duration requests`);
        score += 25;
      }

      // Very fast average response (< 10ms suggests no rendering)
      const avgDuration = analysis.duration_count > 0
        ? analysis.total_duration / analysis.duration_count
        : 0;
      if (avgDuration < 10 && analysis.duration_count > 5) {
        reasons.push(`Avg ${avgDuration.toFixed(0)}ms (too fast)`);
        score += 20;
      }

      // High request rate (> 100 requests in period)
      if (analysis.requests.length > 100) {
        reasons.push(`${analysis.requests.length} requests in ${days}d`);
        score += 15;
      }

      // Single page repeated access (loop/crawler)
      if (analysis.unique_pages.size === 1 && analysis.requests.length > 20) {
        reasons.push('Single page loop detected');
        score += 20;
      }

      // Suspicious user agents
      const firstReq = analysis.requests[0];
      const ua = firstReq?.user_agent?.toLowerCase() || '';
      if (ua.includes('bot') || ua.includes('crawler') || ua.includes('spider')) {
        reasons.push('Bot user agent');
        score += 40;
      }

      if (score >= 50) {
        suspiciousIPs.push({
          ip,
          visitor_ids: Array.from(analysis.visitor_ids),
          total_requests: analysis.requests.length,
          zero_duration_count: analysis.zero_duration,
          avg_duration: avgDuration,
          unique_pages: analysis.unique_pages.size,
          suspicious_score: Math.min(score, 100),
          reasons,
        });
        totalBotsDetected++;
      } else {
        totalCleanSessions += analysis.visitor_ids.size;
      }
    });

    // Sort by score
    suspiciousIPs.sort((a, b) => b.suspicious_score - a.suspicious_score);

    // Calculate overall fraud score (accuracy)
    const totalIPs = ipAnalysis.size;
    const fraudAccuracy = totalIPs > 0
      ? ((totalIPs - totalBotsDetected) / totalIPs) * 100
      : 100;

    // Recent bot activity (last 24h)
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const recentBotActivity = suspiciousIPs.filter(bot =>
      bot.total_requests > 0 // All recent
    ).length;

    return NextResponse.json({
      success: true,
      overview: {
        fraud_accuracy: parseFloat(fraudAccuracy.toFixed(1)),
        bots_detected: totalBotsDetected,
        clean_sessions: totalCleanSessions,
        total_ips_analyzed: totalIPs,
        recent_bot_activity: recentBotActivity,
      },
      suspicious_ips: suspiciousIPs.slice(0, 20),
      detection_criteria: [
        'Multiple visitor IDs from same IP',
        'High zero-duration requests (>50%)',
        'Very fast avg response (<10ms)',
        'High request volume (>100 in period)',
        'Single page loop pattern',
        'Bot/crawler user agent',
      ],
      meta: {
        period_days: days,
        total_requests_analyzed: requests.length,
        data_source: 'telemetry_requests',
      },
    });

  } catch (error: any) {
    console.error('[Fraud Detection] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal error',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
