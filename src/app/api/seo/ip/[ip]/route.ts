// GET /api/seo/ip/[ip]?range=30d
// Retourne le dossier complet d'une IP

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
    const ip = params.ip;
    const { searchParams } = new URL(req.url);
    const range = searchParams.get("range") || "30d";

    const daysMap: Record<string, number> = { "7d": 7, "30d": 30, "90d": 90 };
    const days = daysMap[range] || 30;
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const { data: ipIntel, error: intelError } = await supabase
      .from("ip_to_seo_segment")
      .select("*")
      .eq("ip", ip)
      .single();

    if (intelError || !ipIntel) {
      return NextResponse.json({ error: "IP not found" }, { status: 404 });
    }

    const { data: timelineRaw } = await supabase
      .from("telemetry_requests")
      .select("created_at, method, path, status, duration_ms")
      .eq("ip_hash", ip)
      .eq("env", "production")
      .gte("created_at", startDate.toISOString())
      .order("created_at", { ascending: false })
      .limit(100);

    // Map timeline to include all fields for both preview and full dossier
    const timeline = timelineRaw?.map((r) => ({
      timestamp: r.created_at, // For ExplorerIpPanel
      created_at: r.created_at, // For IP Dossier page
      method: r.method,
      path: r.path,
      status: r.status,
      duration_ms: r.duration_ms || 0,
      region: null, // Not tracked yet
    })) || [];

    const { data: topPaths } = await supabase
      .from("telemetry_requests")
      .select("path")
      .eq("ip_hash", ip)
      .eq("env", "production")
      .gte("created_at", startDate.toISOString());

    const pathCounts: Record<string, number> = {};
    topPaths?.forEach((r) => { pathCounts[r.path] = (pathCounts[r.path] || 0) + 1; });
    const topPathsList = Object.entries(pathCounts)
      .map(([path, count]) => ({ path, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const pathDurations: Record<string, { sum: number; count: number }> = {};
    timelineRaw?.forEach((r) => {
      if (!pathDurations[r.path]) pathDurations[r.path] = { sum: 0, count: 0 };
      pathDurations[r.path].sum += r.duration_ms || 0;
      pathDurations[r.path].count += 1;
    });

    const slowestEndpoints = Object.entries(pathDurations)
      .map(([path, stats]) => ({
        path,
        avg_duration: Math.round(stats.sum / stats.count),
        count: stats.count,
      }))
      .sort((a, b) => b.avg_duration - a.avg_duration)
      .slice(0, 10);

    const score = calculateIpScore(ipIntel);
    const alerts = generateAlerts(ipIntel);

    // Calculate stats for preview
    const successCount = ipIntel.success_count || 0;
    const totalRequests = ipIntel.total_requests || 1;
    const successRate = Math.round((successCount / totalRequests) * 100);

    // Fetch visits from visit_dossier view
    const { data: visits } = await supabase
      .from("visit_dossier")
      .select("*")
      .eq("ip", ip)
      .gte("first_seen", startDate.toISOString())
      .order("first_seen", { ascending: false })
      .limit(10);

    // Enrich visits with events data
    const enrichedVisits = await Promise.all(
      (visits || []).map(async (visit) => {
        // Get events for this visit
        const { data: events } = await supabase
          .from("telemetry_events")
          .select("event_name, page_path, utm, referrer, created_at")
          .eq("visit_id", visit.visit_id)
          .order("created_at", { ascending: true })
          .limit(50);

        // Parse UTM from first event
        const firstEvent = events?.[0];
        const utm = firstEvent?.utm || null;
        const referrer = firstEvent?.referrer || null;

        // Count key events
        const eventCounts = events?.reduce(
          (acc, e) => {
            acc.total++;
            if (e.event_name === "page_view") acc.page_views++;
            if (e.event_name === "form_start") acc.form_starts++;
            if (e.event_name === "form_submit") acc.form_submits++;
            return acc;
          },
          { total: 0, page_views: 0, form_starts: 0, form_submits: 0 }
        ) || { total: 0, page_views: 0, form_starts: 0, form_submits: 0 };

        return {
          visit_id: visit.visit_id,
          first_seen: visit.first_seen,
          last_seen: visit.last_seen,
          landing_page: visit.landing_page,
          utm,
          referrer,
          total_requests: visit.total_requests,
          unique_pages: visit.unique_pages,
          events: eventCounts,
          perf: {
            avg_duration_ms: visit.avg_duration_ms,
            p95_duration_ms: visit.p95_duration_ms,
          },
          links: {
            session_id: visit.session_id,
            user_id: visit.user_id,
            client_id: visit.client_id,
          },
        };
      })
    );

    return NextResponse.json({
      ip: ipIntel.ip,
      intelligence: {
        first_seen: ipIntel.first_seen,
        last_seen: ipIntel.last_seen,
        total_requests: ipIntel.total_requests,
        active_days: ipIntel.active_days,
        unique_pages: ipIntel.unique_pages,
        landing_page: ipIntel.landing_page,
        most_visited_page: ipIntel.most_visited_page,
        device: ipIntel.device || "Unknown",
        utm_source: ipIntel.utm_source || "Unknown",
        utm_medium: ipIntel.utm_medium || "Unknown",
        utm_campaign: ipIntel.utm_campaign || "Unknown",
        avg_duration_ms: ipIntel.avg_duration_ms,
        p50_duration_ms: ipIntel.p50_duration_ms,
        p95_duration_ms: ipIntel.p95_duration_ms,
        success_count: ipIntel.success_count,
        client_error_count: ipIntel.client_error_count,
        server_error_count: ipIntel.server_error_count,
      },
      score,
      alerts,
      stats: {
        total_requests: totalRequests,
        unique_paths: ipIntel.unique_pages || 0,
        avg_duration: ipIntel.avg_duration_ms || 0,
        success_rate: successRate,
        regions: [], // Not tracking regions yet
      },
      timeline: timeline || [],
      topPaths: topPathsList,
      slowestEndpoints,
      visits: enrichedVisits,
      meta: {
        range,
        days,
        dataPoints: timeline?.length || 0,
        distinct_visits: enrichedVisits.length,
      },
    });
  } catch (err: any) {
    console.error("IP Dossier Error:", err.message);
    return NextResponse.json({ error: "Internal error", details: err.message }, { status: 500 });
  }
}

function calculateIpScore(ipData: any): number {
  let score = 0;
  if (ipData.unique_pages >= 3) score += 10;
  if (ipData.total_requests >= 20) score += 10;
  if (ipData.active_days >= 2) score += 10;
  if (ipData.landing_page?.includes("/demande") || ipData.landing_page?.includes("/faq")) score += 10;
  if (ipData.p95_duration_ms < 800) score += 20;
  if (ipData.server_error_count === 0) score += 10;
  if (ipData.client_error_count <= 2) score += 10;
  if (ipData.utm_source === "google" && ipData.utm_medium === "organic") score += 10;
  const targetPages = ["/demande", "/faq", "/ibv", "/marge-credit"];
  if (targetPages.some((page) => ipData.landing_page?.includes(page))) score += 10;
  return Math.min(score, 100);
}

function generateAlerts(ipData: any) {
  const alerts: any[] = [];
  if (ipData.server_error_count >= 1 && ipData.landing_page?.includes("/demande")) {
    alerts.push({ level: "CRIT", title: "Erreurs 5xx sur page conversion", description: `${ipData.server_error_count} erreur(s) serveur`, action: "Vérifier logs backend", metric: "5xx", value: ipData.server_error_count });
  }
  if (ipData.p95_duration_ms >= 2000) {
    alerts.push({ level: "CRIT", title: "Backend très lent", description: `p95 à ${ipData.p95_duration_ms}ms`, action: "Profiler endpoints", metric: "p95", value: `${ipData.p95_duration_ms}ms` });
  }
  if (ipData.client_error_count >= 5) {
    alerts.push({ level: "WARN", title: "Nombreuses erreurs 4xx", description: `${ipData.client_error_count} erreur(s) client`, action: "Vérifier liens cassés", metric: "4xx", value: ipData.client_error_count });
  }
  if (ipData.p95_duration_ms >= 800 && ipData.p95_duration_ms < 2000) {
    alerts.push({ level: "WARN", title: "Latence élevée", description: `p95 à ${ipData.p95_duration_ms}ms`, action: "Optimiser DB", metric: "p95", value: `${ipData.p95_duration_ms}ms` });
  }
  if (ipData.unique_pages === 1 && ipData.total_requests >= 10) {
    alerts.push({ level: "WARN", title: "Boucle détectée", description: `${ipData.total_requests} requêtes sur 1 page`, action: "Possible bot", metric: "Loop", value: `${ipData.total_requests}x` });
  }
  if (ipData.server_error_count === 0 && ipData.p95_duration_ms < 800 && ipData.unique_pages >= 3) {
    alerts.push({ level: "OK", title: "Expérience fluide", description: "Aucune erreur, latence faible", metric: "UX" });
  }
  return alerts.sort((a, b) => { const order: Record<string, number> = { CRIT: 0, WARN: 1, OK: 2 }; return order[a.level] - order[b.level]; });
}
