import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";

// 視聴セッション終了の記録（sendBeaconから呼ばれる）
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { session_id, left_at } = body;

    if (!session_id) {
      return NextResponse.json({ error: "session_id required" }, { status: 400 });
    }

    const supabase = createServiceRoleClient();

    const { data: session } = await supabase
      .from("viewer_sessions")
      .select("joined_at")
      .eq("id", session_id)
      .single();

    let durationSeconds: number | null = null;
    if (session?.joined_at && left_at) {
      durationSeconds = Math.round(
        (new Date(left_at).getTime() - new Date(session.joined_at).getTime()) / 1000
      );
    }

    await supabase
      .from("viewer_sessions")
      .update({
        left_at: left_at || new Date().toISOString(),
        duration_seconds: durationSeconds,
        is_active: false,
      })
      .eq("id", session_id);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Session end error:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
