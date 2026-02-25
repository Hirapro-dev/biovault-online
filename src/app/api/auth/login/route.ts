import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const { customer_id } = await request.json();

    if (!customer_id || typeof customer_id !== "string") {
      return NextResponse.json({ error: "IDを入力してください" }, { status: 400 });
    }

    const supabase = createServiceRoleClient();
    const trimmedId = customer_id.trim();

    // --- 管理者ショートカット: "admin" で全ページアクセス可 ---
    if (trimmedId.toLowerCase() === "admin") {
      const { data: latestSchedule } = await supabase
        .from("schedules")
        .select("slug")
        .in("status", ["upcoming", "live"])
        .order("scheduled_start", { ascending: true })
        .limit(1)
        .single();

      return NextResponse.json({
        customer_id: "ADMIN",
        name: "管理者",
        latest_slug: latestSchedule?.slug || null,
      });
    }

    // --- 通常の顧客ログイン ---
    const { data: customer, error } = await supabase
      .from("customers")
      .select("customer_id, name, is_active")
      .eq("customer_id", trimmedId)
      .single();

    if (error || !customer) {
      return NextResponse.json({ error: "無効なIDです" }, { status: 404 });
    }

    if (!customer.is_active) {
      return NextResponse.json({ error: "このIDは現在無効です" }, { status: 403 });
    }

    // 最新のスケジュールslugを取得
    const { data: latestSchedule } = await supabase
      .from("schedules")
      .select("slug")
      .in("status", ["upcoming", "live"])
      .order("scheduled_start", { ascending: true })
      .limit(1)
      .single();

    return NextResponse.json({
      customer_id: customer.customer_id,
      name: customer.name,
      latest_slug: latestSchedule?.slug || null,
    });
  } catch (err) {
    console.error("Login error:", err);
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}
