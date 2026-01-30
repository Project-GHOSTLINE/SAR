// GET /api/fraud/device/[visit_id]
// Retourne le profil complet d'un device + historique

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { visit_id: string } }
) {
  try {
    const visitId = params.visit_id;

    // Fetch device profile
    const { data: device, error: deviceError } = await supabase
      .from("device_profiles")
      .select("*")
      .eq("visit_id", visitId)
      .single();

    if (deviceError || !device) {
      return NextResponse.json(
        { error: "Device not found" },
        { status: 404 }
      );
    }

    // Fetch timeline (requests + events)
    const { data: timeline, error: timelineError } = await supabase
      .from("visit_timeline")
      .select("*")
      .eq("visit_id", visitId)
      .order("timestamp", { ascending: true });

    if (timelineError) {
      console.error("Timeline error:", timelineError);
    }

    // Fetch client info if linked
    let client = null;
    if (device.client_id) {
      const { data: clientData } = await supabase
        .from("clients")
        .select("id, name, email, phone")
        .eq("id", device.client_id)
        .single();

      client = clientData;
    }

    return NextResponse.json({
      device,
      timeline: timeline || [],
      client,
    });
  } catch (err: any) {
    console.error("Device API Error:", err.message);
    return NextResponse.json(
      { error: "Internal error", details: err.message },
      { status: 500 }
    );
  }
}
