// GET /api/seo/perf?range=30d&path=/&device=all
// Source: vercel_speed_insights_daily
// Retourne: Speed Insights détaillé par page/device

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
    const path = searchParams.get("path") || null;
    const device = searchParams.get("device") || "all";

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

    // 1️⃣ Query vercel_speed_insights_daily avec filtres
    let query = supabase
      .from("vercel_speed_insights_daily")
      .select("*")
      .gte("date", startDate)
      .order("date", { ascending: false });

    if (path && path !== "all") {
      query = query.eq("path", path);
    }

    if (device && device !== "all") {
      query = query.eq("device", device);
    }

    const { data: metrics, error } = await query;

    if (error) throw error;

    if (!metrics || metrics.length === 0) {
      return NextResponse.json({
        summary: null,
        timeline: [],
        byPage: [],
        byDevice: [],
        message: "No Speed Insights data available yet"
      });
    }

    // 2️⃣ Summary (agrégation globale)
    const summary = {
      avg_lcp_p75: Math.round(
        metrics.reduce((sum, m) => sum + (m.lcp_p75 || 0), 0) / metrics.length
      ),
      avg_inp_p75: Math.round(
        metrics.reduce((sum, m) => sum + (m.inp_p75 || 0), 0) / metrics.length
      ),
      avg_cls_p75: parseFloat(
        (metrics.reduce((sum, m) => sum + (m.cls_p75 || 0), 0) / metrics.length).toFixed(3)
      ),
      avg_ttfb_p75: Math.round(
        metrics.reduce((sum, m) => sum + (m.ttfb_p75 || 0), 0) / metrics.length
      ),
      total_samples: metrics.reduce((sum, m) => sum + (m.sample_count || 0), 0),
      perf_status_distribution: {
        GOOD: metrics.filter((m) => m.perf_status === "GOOD").length,
        WARN: metrics.filter((m) => m.perf_status === "WARN").length,
        CRIT: metrics.filter((m) => m.perf_status === "CRIT").length,
      },
    };

    // 3️⃣ Timeline (par date)
    const timelineMap: Record<string, any> = {};
    metrics.forEach((m) => {
      if (!timelineMap[m.date]) {
        timelineMap[m.date] = {
          date: m.date,
          lcp_p75: [],
          inp_p75: [],
          cls_p75: [],
          ttfb_p75: [],
          samples: 0,
          statuses: { GOOD: 0, WARN: 0, CRIT: 0 },
        };
      }
      timelineMap[m.date].lcp_p75.push(m.lcp_p75);
      timelineMap[m.date].inp_p75.push(m.inp_p75);
      timelineMap[m.date].cls_p75.push(m.cls_p75);
      timelineMap[m.date].ttfb_p75.push(m.ttfb_p75);
      timelineMap[m.date].samples += m.sample_count || 0;
      if (m.perf_status) {
        timelineMap[m.date].statuses[m.perf_status]++;
      }
    });

    const timeline = Object.values(timelineMap)
      .map((t) => ({
        date: t.date,
        avg_lcp_p75: Math.round(
          t.lcp_p75.reduce((a: number, b: number) => a + b, 0) / t.lcp_p75.length
        ),
        avg_inp_p75: Math.round(
          t.inp_p75.reduce((a: number, b: number) => a + b, 0) / t.inp_p75.length
        ),
        avg_cls_p75: parseFloat(
          (t.cls_p75.reduce((a: number, b: number) => a + b, 0) / t.cls_p75.length).toFixed(3)
        ),
        samples: t.samples,
        worst_status:
          t.statuses.CRIT > 0 ? "CRIT" : t.statuses.WARN > 0 ? "WARN" : "GOOD",
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // 4️⃣ By Page (top 10 pages par samples)
    const pageMap: Record<string, any> = {};
    metrics.forEach((m) => {
      if (!pageMap[m.path]) {
        pageMap[m.path] = {
          path: m.path,
          lcp_p75: [],
          inp_p75: [],
          cls_p75: [],
          samples: 0,
          statuses: { GOOD: 0, WARN: 0, CRIT: 0 },
        };
      }
      pageMap[m.path].lcp_p75.push(m.lcp_p75);
      pageMap[m.path].inp_p75.push(m.inp_p75);
      pageMap[m.path].cls_p75.push(m.cls_p75);
      pageMap[m.path].samples += m.sample_count || 0;
      if (m.perf_status) {
        pageMap[m.path].statuses[m.perf_status]++;
      }
    });

    const byPage = Object.values(pageMap)
      .map((p) => ({
        path: p.path,
        avg_lcp_p75: Math.round(
          p.lcp_p75.reduce((a: number, b: number) => a + b, 0) / p.lcp_p75.length
        ),
        avg_inp_p75: Math.round(
          p.inp_p75.reduce((a: number, b: number) => a + b, 0) / p.inp_p75.length
        ),
        avg_cls_p75: parseFloat(
          (p.cls_p75.reduce((a: number, b: number) => a + b, 0) / p.cls_p75.length).toFixed(3)
        ),
        samples: p.samples,
        worst_status: p.statuses.CRIT > 0 ? "CRIT" : p.statuses.WARN > 0 ? "WARN" : "GOOD",
      }))
      .sort((a, b) => b.samples - a.samples)
      .slice(0, 10);

    // 5️⃣ By Device
    const deviceMap: Record<string, any> = {};
    metrics.forEach((m) => {
      if (!deviceMap[m.device]) {
        deviceMap[m.device] = {
          device: m.device,
          lcp_p75: [],
          inp_p75: [],
          cls_p75: [],
          samples: 0,
        };
      }
      deviceMap[m.device].lcp_p75.push(m.lcp_p75);
      deviceMap[m.device].inp_p75.push(m.inp_p75);
      deviceMap[m.device].cls_p75.push(m.cls_p75);
      deviceMap[m.device].samples += m.sample_count || 0;
    });

    const byDevice = Object.values(deviceMap).map((d) => ({
      device: d.device,
      avg_lcp_p75: Math.round(
        d.lcp_p75.reduce((a: number, b: number) => a + b, 0) / d.lcp_p75.length
      ),
      avg_inp_p75: Math.round(
        d.inp_p75.reduce((a: number, b: number) => a + b, 0) / d.inp_p75.length
      ),
      avg_cls_p75: parseFloat(
        (d.cls_p75.reduce((a: number, b: number) => a + b, 0) / d.cls_p75.length).toFixed(3)
      ),
      samples: d.samples,
    }));

    return NextResponse.json({
      summary,
      timeline,
      byPage,
      byDevice,
      meta: {
        range,
        days,
        path: path || "all",
        device: device || "all",
        dataPoints: metrics.length,
      },
    });

  } catch (err: any) {
    console.error("SEO Perf Error:", err.message);
    return NextResponse.json(
      { error: "Internal error", details: err.message },
      { status: 500 }
    );
  }
}
