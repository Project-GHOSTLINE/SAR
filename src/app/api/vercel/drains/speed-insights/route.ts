// src/app/api/vercel/drains/speed-insights/route.ts
// Webhook Vercel Speed Insights → stocke payload brut
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    // 1️⃣ Sécurité - Vérifier le secret Vercel
    const auth = req.headers.get("authorization");
    if (!auth || auth !== `Bearer ${process.env.VERCEL_DRAIN_SECRET}`) {
      console.error("Speed Insights Drain: Unauthorized attempt");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2️⃣ Lire body (JSON ou NDJSON)
    const contentType = req.headers.get("content-type") || "";
    const rawBody = await req.text();

    if (!rawBody) {
      return NextResponse.json({ error: "Empty body" }, { status: 400 });
    }

    let payloads: any[] = [];

    // Support NDJSON (recommandé par Vercel) et JSON
    if (contentType.includes("application/x-ndjson")) {
      payloads = rawBody
        .split("\n")
        .filter(Boolean)
        .map(line => {
          try {
            return JSON.parse(line);
          } catch (e) {
            console.error("Failed to parse NDJSON line:", line);
            return null;
          }
        })
        .filter(Boolean);
    } else {
      try {
        const parsed = JSON.parse(rawBody);
        payloads = Array.isArray(parsed) ? parsed : [parsed];
      } catch (e) {
        console.error("Failed to parse JSON body:", rawBody);
        return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
      }
    }

    if (payloads.length === 0) {
      return NextResponse.json({ error: "No valid payloads" }, { status: 400 });
    }

    // 3️⃣ Insert brut dans vercel_speed_insights_raw
    const rows = payloads.map(p => ({
      payload: p,
      processed: false,
      // Extraction optionnelle pour quick queries
      extracted_url: p.route || p.path || p.url || null,
      extracted_device: p.device || null,
      extracted_lcp: p.lcp ? parseFloat(p.lcp) : null,
      extracted_inp: p.inp ? parseFloat(p.inp) : null,
      extracted_cls: p.cls ? parseFloat(p.cls) : null,
      extracted_ttfb: p.ttfb ? parseFloat(p.ttfb) : null,
      extracted_fcp: p.fcp ? parseFloat(p.fcp) : null,
    }));

    const { error, data } = await supabase
      .from("vercel_speed_insights_raw")
      .insert(rows)
      .select();

    if (error) {
      console.error("Speed Insights DB Error:", error);
      throw error;
    }

    console.log(`✅ Speed Insights: Stored ${rows.length} events`);

    return NextResponse.json({
      status: "ok",
      received: rows.length,
      stored: data?.length || 0
    });

  } catch (err: any) {
    console.error("Speed Insights Drain Error:", err.message);
    return NextResponse.json(
      { error: "Internal error", details: err.message },
      { status: 500 }
    );
  }
}
