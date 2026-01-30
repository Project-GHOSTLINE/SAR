// GET /api/seo/overview?range=30d&device=all&page=all
// Source: seo_unified_daily_plus view
// Retourne: KPIs consolidés + série temporelle + top pages

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const range = searchParams.get("range") || "30d";
    const device = searchParams.get("device") || "all";
    const page = searchParams.get("page") || "all";

    // Calculer la date de début selon le range
    const daysMap: Record<string, number> = {
      "7d": 7,
      "30d": 30,
      "90d": 90,
    };
    const days = daysMap[range] || 30;

    // 1️⃣ Query principale: seo_unified_daily_plus
    const { data: timeline, error } = await supabase
      .from("seo_unified_daily_plus")
      .select("*")
      .gte("date", new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split("T")[0])
      .order("date", { ascending: false });

    if (error) throw error;

    if (!timeline || timeline.length === 0) {
      return NextResponse.json({
        kpis: null,
        timeline: [],
        topPages: [],
        message: "No data available"
      });
    }

    // 2️⃣ Agréger KPIs (dernière date = données les plus récentes)
    const latest = timeline[0];
    const previous = timeline[1] || latest;

    const kpis = {
      ga4: {
        users: latest.ga4_users || 0,
        sessions: latest.ga4_sessions || 0,
        conversions: latest.ga4_conversions || 0,
        engagement_rate: latest.ga4_engagement_rate || 0,
        bounce_rate: latest.ga4_bounce_rate || 0,
        trend: {
          users: calculateTrend(latest.ga4_users, previous.ga4_users),
          sessions: calculateTrend(latest.ga4_sessions, previous.ga4_sessions),
          conversions: calculateTrend(latest.ga4_conversions, previous.ga4_conversions),
        },
      },
      gsc: {
        clicks: latest.gsc_clicks || 0,
        impressions: latest.gsc_impressions || 0,
        ctr: latest.gsc_ctr || 0,
        position: latest.gsc_position || 0,
        trend: {
          clicks: calculateTrend(latest.gsc_clicks, previous.gsc_clicks),
          impressions: calculateTrend(latest.gsc_impressions, previous.gsc_impressions),
        },
      },
      semrush: {
        keywords: latest.semrush_keywords || 0,
        traffic: latest.semrush_traffic || 0,
        rank: latest.semrush_rank || 0,
        authority: latest.semrush_authority || 0,
        backlinks: latest.semrush_backlinks || 0,
        trend: {
          keywords: calculateTrend(latest.semrush_keywords, previous.semrush_keywords),
          traffic: calculateTrend(latest.semrush_traffic, previous.semrush_traffic),
        },
      },
      speed: {
        lcp_p75: latest.avg_lcp_p75 || null,
        inp_p75: latest.avg_inp_p75 || null,
        cls_p75: latest.avg_cls_p75 || null,
        ttfb_p75: latest.avg_ttfb_p75 || null,
        status: latest.perf_status || null,
        samples: latest.speed_samples || 0,
        mobile_lcp: latest.mobile_lcp_p75 || null,
        desktop_lcp: latest.desktop_lcp_p75 || null,
      },
    };

    // 3️⃣ Top pages (depuis GA4 top_pages JSONB)
    let topPages: any[] = [];
    if (latest.ga4_top_pages) {
      try {
        const pages = typeof latest.ga4_top_pages === "string"
          ? JSON.parse(latest.ga4_top_pages)
          : latest.ga4_top_pages;
        topPages = Array.isArray(pages) ? pages.slice(0, 10) : [];
      } catch (e) {
        console.error("Failed to parse ga4_top_pages:", e);
      }
    }

    // 4️⃣ Série temporelle (inverser pour avoir chronologique)
    const timelineSeries = timeline.reverse().map((d) => ({
      date: d.date,
      ga4_users: d.ga4_users || 0,
      ga4_sessions: d.ga4_sessions || 0,
      ga4_conversions: d.ga4_conversions || 0,
      gsc_clicks: d.gsc_clicks || 0,
      gsc_impressions: d.gsc_impressions || 0,
      semrush_keywords: d.semrush_keywords || 0,
      avg_lcp_p75: d.avg_lcp_p75 || null,
      perf_status: d.perf_status || null,
    }));

    return NextResponse.json({
      kpis,
      timeline: timelineSeries,
      topPages,
      meta: {
        range,
        days,
        dataPoints: timeline.length,
        lastUpdated: latest.date,
      },
    });

  } catch (err: any) {
    console.error("SEO Overview Error:", err.message);
    return NextResponse.json(
      { error: "Internal error", details: err.message },
      { status: 500 }
    );
  }
}

/**
 * Calcule le trend entre 2 valeurs (pourcentage de changement)
 */
function calculateTrend(current: number | null, previous: number | null): number {
  if (!current || !previous || previous === 0) return 0;
  return Math.round(((current - previous) / previous) * 100);
}
