// GET /api/seo/ips/top?limit=20&sort=requests|last_seen|score
export const dynamic = 'force-dynamic'

// Retourne la liste des top IPs avec preview data

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "20");
    const sort = searchParams.get("sort") || "last_seen"; // requests | last_seen | score

    // Fetch top IPs from ip_to_seo_segment
    let query = supabase
      .from("ip_to_seo_segment")
      .select("*");

    // Sort
    if (sort === "requests") {
      query = query.order("total_requests", { ascending: false });
    } else if (sort === "last_seen") {
      query = query.order("last_seen", { ascending: false });
    } else {
      query = query.order("last_seen", { ascending: false });
    }

    query = query.limit(limit);

    const { data: ips, error } = await query;

    if (error) throw error;

    if (!ips || ips.length === 0) {
      return NextResponse.json({
        ips: [],
        message: "No IPs found",
      });
    }

    // Calculate score for each IP (same logic as IP Dossier)
    const ipsWithScores = ips.map((ipData) => {
      const score = calculateIpScore(ipData);
      return {
        ip: ipData.ip,
        total_requests: ipData.total_requests || 0,
        unique_pages: ipData.unique_pages || 0,
        active_days: ipData.active_days || 0,
        last_seen: ipData.last_seen,
        first_seen: ipData.first_seen,
        landing_page: ipData.landing_page,
        device: ipData.device || "Unknown",
        utm_source: ipData.utm_source || "Unknown",
        avg_duration_ms: ipData.avg_duration_ms || 0,
        p95_duration_ms: ipData.p95_duration_ms || 0,
        success_count: ipData.success_count || 0,
        client_error_count: ipData.client_error_count || 0,
        server_error_count: ipData.server_error_count || 0,
        score,
      };
    });

    // Sort by score if requested
    if (sort === "score") {
      ipsWithScores.sort((a, b) => b.score - a.score);
    }

    return NextResponse.json({
      ips: ipsWithScores,
      meta: {
        total: ipsWithScores.length,
        sort,
        limit,
      },
    });
  } catch (err: any) {
    console.error("Top IPs Error:", err.message);
    return NextResponse.json(
      { error: "Internal error", details: err.message },
      { status: 500 }
    );
  }
}

/**
 * Calculate IP score (0-100) - Same logic as IP Dossier
 */
function calculateIpScore(ipData: any): number {
  let score = 0;

  // Engagement (0-40 points)
  if (ipData.unique_pages >= 3) score += 10;
  if (ipData.total_requests >= 20) score += 10;
  if (ipData.active_days >= 2) score += 10;
  if (
    ipData.landing_page?.includes("/demande") ||
    ipData.landing_page?.includes("/faq")
  )
    score += 10;

  // Technical Quality (0-40 points)
  if (ipData.p95_duration_ms < 800) score += 20;
  if (ipData.server_error_count === 0) score += 10;
  if (ipData.client_error_count <= 2) score += 10;

  // SEO Intent (0-20 points)
  if (ipData.utm_source === "google" && ipData.utm_medium === "organic")
    score += 10;
  const targetPages = ["/demande", "/faq", "/ibv", "/marge-credit"];
  if (targetPages.some((page) => ipData.landing_page?.includes(page)))
    score += 10;

  return Math.min(score, 100);
}
