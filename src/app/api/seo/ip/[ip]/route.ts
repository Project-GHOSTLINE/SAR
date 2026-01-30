// GET /api/seo/ip/[ip]?range=30d
// Source: ip_to_seo_segment view + telemetry_requests
// Retourne: IP Intelligence + Timeline des requêtes

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  req: NextRequest,
  { params }: { params: { ip: string } }
) {
  try {
    const ipHash = params.ip;
    const { searchParams } = new URL(req.url);
    const range = searchParams.get("range") || "30d";

    // Calculer la date de début
    const daysMap: Record<string, number> = {
      "7d": 7,
      "30d": 30,
      "90d": 90,
    };
    const days = daysMap[range] || 30;
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];

    // 1️⃣ Intelligence IP (depuis view ip_to_seo_segment)
    const { data: intelligence, error: intError } = await supabase
      .from("ip_to_seo_segment")
      .select("*")
      .eq("ip", ipHash)
      .single();

    if (intError && intError.code !== "PGRST116") {
      throw intError;
    }

    if (!intelligence) {
      return NextResponse.json(
        { error: "IP not found", ip: ipHash },
        { status: 404 }
      );
    }

    // 2️⃣ Timeline des requêtes (depuis telemetry_requests)
    const { data: timeline, error: timelineError } = await supabase
      .from("telemetry_requests")
      .select("created_at, path, duration_ms, status, vercel_region, meta_redacted")
      .eq("ip_hash", ipHash)
      .eq("env", "production")
      .gte("created_at", startDate)
      .order("created_at", { ascending: false })
      .limit(200);

    if (timelineError) throw timelineError;

    // 3️⃣ Agréger stats additionnelles
    const stats = {
      total_requests: timeline?.length || 0,
      unique_paths: new Set(timeline?.map((r) => r.path)).size,
      avg_duration: timeline?.length
        ? Math.round(
            timeline.reduce((sum, r) => sum + (r.duration_ms || 0), 0) /
              timeline.length
          )
        : 0,
      success_rate: timeline?.length
        ? Math.round(
            (timeline.filter((r) => r.status >= 200 && r.status < 300).length /
              timeline.length) *
              100
          )
        : 0,
      regions: Array.from(new Set(timeline?.map((r) => r.vercel_region).filter(Boolean))),
    };

    // 4️⃣ Distribution par path
    const pathCounts: Record<string, number> = {};
    timeline?.forEach((r) => {
      if (r.path) {
        pathCounts[r.path] = (pathCounts[r.path] || 0) + 1;
      }
    });

    const topPaths = Object.entries(pathCounts)
      .map(([path, count]) => ({ path, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // 5️⃣ Distribution par jour
    const dailyCounts: Record<string, number> = {};
    timeline?.forEach((r) => {
      const date = r.created_at.split("T")[0];
      dailyCounts[date] = (dailyCounts[date] || 0) + 1;
    });

    const dailyActivity = Object.entries(dailyCounts)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return NextResponse.json({
      intelligence: {
        ip: intelligence.ip,
        first_seen: intelligence.first_seen,
        last_seen: intelligence.last_seen,
        landing_page: intelligence.landing_page,
        most_visited_page: intelligence.most_visited_page,
        total_requests: intelligence.total_requests,
        active_days: intelligence.active_days,
        unique_pages: intelligence.unique_pages,
        avg_duration_ms: intelligence.avg_duration_ms,
        p50_duration_ms: intelligence.p50_duration_ms,
        p95_duration_ms: intelligence.p95_duration_ms,
        device: intelligence.device,
        utm_source: intelligence.utm_source,
        utm_medium: intelligence.utm_medium,
        utm_campaign: intelligence.utm_campaign,
        vercel_region: intelligence.vercel_region,
        success_count: intelligence.success_count,
        client_error_count: intelligence.client_error_count,
        server_error_count: intelligence.server_error_count,
      },
      stats,
      topPaths,
      dailyActivity,
      timeline: timeline?.slice(0, 50).map((r) => ({
        timestamp: r.created_at,
        path: r.path,
        duration_ms: r.duration_ms,
        status: r.status,
        region: r.vercel_region,
      })),
      meta: {
        range,
        days,
        timeline_size: timeline?.length || 0,
      },
    });

  } catch (err: any) {
    console.error("SEO IP Error:", err.message);
    return NextResponse.json(
      { error: "Internal error", details: err.message },
      { status: 500 }
    );
  }
}
