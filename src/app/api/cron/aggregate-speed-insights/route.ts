// src/app/api/cron/aggregate-speed-insights/route.ts
// Job quotidien: agrège vercel_speed_insights_raw → vercel_speed_insights_daily
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Calcule le percentile p d'un tableau de valeurs
 */
function percentile(values: number[], p: number): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

/**
 * Détermine le perf_status selon les seuils Google Core Web Vitals
 */
function calculatePerfStatus(
  lcp_p75: number | null,
  inp_p75: number | null,
  cls_p75: number | null,
  ttfb_p75: number | null
): "GOOD" | "WARN" | "CRIT" {
  // Seuils Google:
  // LCP: < 2500ms = GOOD, < 4000ms = WARN, >= 4000ms = CRIT
  // INP: < 200ms = GOOD, < 500ms = WARN, >= 500ms = CRIT
  // CLS: < 0.1 = GOOD, < 0.25 = WARN, >= 0.25 = CRIT
  // TTFB: < 800ms = GOOD, < 1800ms = WARN, >= 1800ms = CRIT

  if (
    (lcp_p75 && lcp_p75 >= 4000) ||
    (inp_p75 && inp_p75 >= 500) ||
    (cls_p75 && cls_p75 >= 0.25) ||
    (ttfb_p75 && ttfb_p75 >= 1800)
  ) {
    return "CRIT";
  }

  if (
    (lcp_p75 && lcp_p75 >= 2500) ||
    (inp_p75 && inp_p75 >= 200) ||
    (cls_p75 && cls_p75 >= 0.1) ||
    (ttfb_p75 && ttfb_p75 >= 800)
  ) {
    return "WARN";
  }

  return "GOOD";
}

export async function GET() {
  try {
    console.log("🔄 Starting Speed Insights aggregation...");

    // 1️⃣ Charger raw non traités (avec extracted fields)
    const { data: raw, error: fetchError } = await supabase
      .from("vercel_speed_insights_raw")
      .select("id, payload, received_at, extracted_url, extracted_device, extracted_lcp, extracted_inp, extracted_cls, extracted_ttfb, extracted_fcp")
      .eq("processed", false)
      .limit(10000); // Limite pour éviter timeout

    if (fetchError) {
      console.error("Fetch error:", fetchError);
      throw fetchError;
    }

    if (!raw || raw.length === 0) {
      console.log("✅ No unprocessed data");
      return NextResponse.json({ status: "nothing to process" });
    }

    console.log(`📊 Processing ${raw.length} raw events...`);

    // 2️⃣ Groupement par date + path + device
    const buckets: Record<string, any[]> = {};

    for (const r of raw) {
      // Extraire la date depuis payload.timestamp ou received_at
      const p = r.payload;
      const date = p.timestamp
        ? new Date(p.timestamp).toISOString().slice(0, 10)
        : r.received_at
        ? new Date(r.received_at).toISOString().slice(0, 10)
        : new Date().toISOString().slice(0, 10);

      // Utiliser extracted_url et extracted_device (déjà extraits au moment de l'insertion)
      const path = r.extracted_url || "/";
      const device = r.extracted_device || "unknown";

      const key = `${date}|${path}|${device}`;
      buckets[key] ||= [];
      buckets[key].push({
        id: r.id,
        lcp: r.extracted_lcp,
        inp: r.extracted_inp,
        cls: r.extracted_cls,
        ttfb: r.extracted_ttfb,
        fcp: r.extracted_fcp,
      });
    }

    console.log(`📦 Created ${Object.keys(buckets).length} buckets`);

    // 3️⃣ Agrégation et upsert
    const upserts: any[] = [];

    for (const key of Object.keys(buckets)) {
      const [date, path, device] = key.split("|");
      const rows = buckets[key];

      // Extraire les valeurs numériques (déjà extraites)
      const lcp = rows.map(r => r.lcp).filter(v => v !== null && !isNaN(v));
      const inp = rows.map(r => r.inp).filter(v => v !== null && !isNaN(v));
      const cls = rows.map(r => r.cls).filter(v => v !== null && !isNaN(v));
      const ttfb = rows.map(r => r.ttfb).filter(v => v !== null && !isNaN(v));
      const fcp = rows.map(r => r.fcp).filter(v => v !== null && !isNaN(v));

      // Calculer percentiles
      const lcp_p50 = percentile(lcp, 50);
      const lcp_p75 = percentile(lcp, 75);
      const lcp_p95 = percentile(lcp, 95);

      const inp_p50 = percentile(inp, 50);
      const inp_p75 = percentile(inp, 75);
      const inp_p95 = percentile(inp, 95);

      const cls_p50 = percentile(cls, 50);
      const cls_p75 = percentile(cls, 75);
      const cls_p95 = percentile(cls, 95);

      const ttfb_p50 = percentile(ttfb, 50);
      const ttfb_p75 = percentile(ttfb, 75);
      const ttfb_p95 = percentile(ttfb, 95);

      const fcp_p75 = percentile(fcp, 75);

      // Calculer perf_status
      const perf_status = calculatePerfStatus(lcp_p75, inp_p75, cls_p75, ttfb_p75);

      upserts.push({
        date,
        path,
        device,
        lcp_p50,
        lcp_p75,
        lcp_p95,
        inp_p50,
        inp_p75,
        inp_p95,
        cls_p50,
        cls_p75,
        cls_p95,
        ttfb_p50,
        ttfb_p75,
        ttfb_p95,
        fcp_p75,
        sample_count: rows.length,
        perf_status,
        updated_at: new Date().toISOString(),
      });
    }

    // Upsert dans vercel_speed_insights_daily
    if (upserts.length > 0) {
      const { error: upsertError } = await supabase
        .from("vercel_speed_insights_daily")
        .upsert(upserts, {
          onConflict: "date,path,device",
        });

      if (upsertError) {
        console.error("Upsert error:", upsertError);
        throw upsertError;
      }

      console.log(`✅ Upserted ${upserts.length} daily aggregations`);
    }

    // 4️⃣ Marquer comme traités
    const ids = raw.map(r => r.id);
    const { error: updateError } = await supabase
      .from("vercel_speed_insights_raw")
      .update({ processed: true, processed_at: new Date().toISOString() })
      .in("id", ids);

    if (updateError) {
      console.error("Update error:", updateError);
      throw updateError;
    }

    console.log(`✅ Marked ${ids.length} raw events as processed`);

    return NextResponse.json({
      status: "ok",
      processed: raw.length,
      buckets: Object.keys(buckets).length,
      upserted: upserts.length,
      summary: upserts.map(u => ({
        date: u.date,
        path: u.path,
        device: u.device,
        samples: u.sample_count,
        lcp_p75: u.lcp_p75,
        status: u.perf_status,
      })),
    });

  } catch (err: any) {
    console.error("Speed Insights Aggregation Error:", err.message);
    return NextResponse.json(
      { error: "Internal error", details: err.message },
      { status: 500 }
    );
  }
}
