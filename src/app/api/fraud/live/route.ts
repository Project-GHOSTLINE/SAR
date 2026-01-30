// GET /api/fraud/live
// Retourne les détections de fraude en temps réel

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "50");
    const minScore = parseInt(searchParams.get("min_score") || "50");
    const classification = searchParams.get("classification"); // BOT, SCRAPER, SUSPICIOUS, etc.

    // Fetch live fraud detections
    let query = supabase
      .from("fraud_detection_live")
      .select("*")
      .gte("fraud_score", minScore)
      .order("fraud_score", { ascending: false })
      .limit(limit);

    if (classification) {
      query = query.eq("classification", classification);
    }

    const { data: detections, error: detectionsError } = await query;

    if (detectionsError) throw detectionsError;

    // Fetch IP risk profiles
    const { data: ipRisks, error: risksError } = await supabase
      .from("ip_risk_profile")
      .select("*")
      .order("max_fraud_score", { ascending: false })
      .limit(20);

    if (risksError) throw risksError;

    // Fetch suspicious patterns
    const { data: patterns, error: patternsError } = await supabase
      .from("suspicious_patterns")
      .select("*")
      .order("occurrences", { ascending: false });

    if (patternsError) throw patternsError;

    // Fetch unresolved fraud signals
    const { data: signals, error: signalsError } = await supabase
      .from("fraud_signals")
      .select("*")
      .eq("resolved", false)
      .order("detected_at", { ascending: false })
      .limit(100);

    if (signalsError) throw signalsError;

    // Calculate stats
    const stats = {
      total_detections: detections?.length || 0,
      critical_ips: ipRisks?.filter((r) => r.risk_level === "CRITICAL").length || 0,
      high_risk_ips: ipRisks?.filter((r) => r.risk_level === "HIGH").length || 0,
      bots: detections?.filter((d) => d.classification === "BOT").length || 0,
      scrapers: detections?.filter((d) => d.classification === "SCRAPER").length || 0,
      suspicious: detections?.filter((d) => d.classification === "SUSPICIOUS").length || 0,
      converters: detections?.filter((d) => d.classification === "CONVERTER").length || 0,
      engaged: detections?.filter((d) => d.classification === "ENGAGED").length || 0,
      unresolved_signals: signals?.length || 0,
      avg_fraud_score: detections?.length
        ? Math.round(detections.reduce((acc, d) => acc + (d.fraud_score || 0), 0) / detections.length)
        : 0,
    };

    return NextResponse.json({
      stats,
      detections: detections || [],
      ip_risks: ipRisks || [],
      patterns: patterns || [],
      signals: signals || [],
      meta: {
        limit,
        min_score: minScore,
        classification: classification || "all",
      },
    });
  } catch (err: any) {
    console.error("Fraud Detection API Error:", err.message);
    return NextResponse.json(
      { error: "Internal error", details: err.message },
      { status: 500 }
    );
  }
}
