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

    // 2️⃣ Agréger KPIs (dernières données disponibles pour chaque source)
    // Trouver la dernière date avec données GA4 (pas null)
    const latestGa4 = timeline.find(d => d.ga4_users !== null) || timeline[0];
    const previousGa4 = timeline.find(d => d !== latestGa4 && d.ga4_users !== null) || latestGa4;

    // Trouver la dernière date avec données GSC
    const latestGsc = timeline.find(d => d.gsc_clicks !== null) || timeline[0];
    const previousGsc = timeline.find(d => d !== latestGsc && d.gsc_clicks !== null) || latestGsc;

    // Trouver la dernière date avec données Semrush
    const latestSemrush = timeline.find(d => d.semrush_keywords !== null) || timeline[0];
    const previousSemrush = timeline.find(d => d !== latestSemrush && d.semrush_keywords !== null) || latestSemrush;

    // Trouver la dernière date avec données Speed Insights
    const latestSpeed = timeline.find(d => d.avg_lcp_p75 !== null) || timeline[0];

    const kpis = {
      ga4: {
        users: latestGa4.ga4_users || 0,
        sessions: latestGa4.ga4_sessions || 0,
        conversions: latestGa4.ga4_conversions || 0,
        engagement_rate: latestGa4.ga4_engagement_rate || 0,
        bounce_rate: latestGa4.ga4_bounce_rate || 0,
        trend: {
          users: calculateTrend(latestGa4.ga4_users, previousGa4.ga4_users),
          sessions: calculateTrend(latestGa4.ga4_sessions, previousGa4.ga4_sessions),
          conversions: calculateTrend(latestGa4.ga4_conversions, previousGa4.ga4_conversions),
        },
      },
      gsc: {
        clicks: latestGsc.gsc_clicks || 0,
        impressions: latestGsc.gsc_impressions || 0,
        ctr: latestGsc.gsc_ctr || 0,
        position: latestGsc.gsc_position || 0,
        trend: {
          clicks: calculateTrend(latestGsc.gsc_clicks, previousGsc.gsc_clicks),
          impressions: calculateTrend(latestGsc.gsc_impressions, previousGsc.gsc_impressions),
        },
      },
      semrush: {
        keywords: latestSemrush.semrush_keywords || 0,
        traffic: latestSemrush.semrush_traffic || 0,
        rank: latestSemrush.semrush_rank || 0,
        authority: latestSemrush.semrush_authority || 0,
        backlinks: latestSemrush.semrush_backlinks || 0,
        trend: {
          keywords: calculateTrend(latestSemrush.semrush_keywords, previousSemrush.semrush_keywords),
          traffic: calculateTrend(latestSemrush.semrush_traffic, previousSemrush.semrush_traffic),
        },
      },
      speed: {
        lcp_p75: latestSpeed.avg_lcp_p75 || null,
        inp_p75: latestSpeed.avg_inp_p75 || null,
        cls_p75: latestSpeed.avg_cls_p75 || null,
        ttfb_p75: latestSpeed.avg_ttfb_p75 || null,
        status: latestSpeed.perf_status || null,
        samples: latestSpeed.speed_samples || 0,
        mobile_lcp: latestSpeed.mobile_lcp_p75 || null,
        desktop_lcp: latestSpeed.desktop_lcp_p75 || null,
      },
    };

    // 3️⃣ Top pages (depuis GA4 top_pages JSONB)
    let topPages: any[] = [];
    if (latestGa4.ga4_top_pages) {
      try {
        const pages = typeof latestGa4.ga4_top_pages === "string"
          ? JSON.parse(latestGa4.ga4_top_pages)
          : latestGa4.ga4_top_pages;
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
        lastUpdated: timeline[0].date, // Date la plus récente
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
