"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Radio, MessageSquare, CalendarDays } from "lucide-react";
import type { Schedule } from "@/types";

export default function AdminDashboard() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [totalCustomers, setTotalCustomers] = useState(0);
  const [pendingMessages, setPendingMessages] = useState(0);

  useEffect(() => {
    const supabase = createClient();
    async function load() {
      const { data } = await supabase.from("schedules").select("*").order("scheduled_start", { ascending: false });
      if (data) setSchedules(data as Schedule[]);

      const { count } = await supabase.from("customers").select("*", { count: "exact", head: true });
      setTotalCustomers(count || 0);

      const { count: mc } = await supabase.from("chat_messages").select("*", { count: "exact", head: true }).eq("status", "pending");
      setPendingMessages(mc || 0);
    }
    load();
  }, []);

  const statusLabel = { upcoming: "配信前", live: "配信中", ended: "終了" } as const;
  const statusVariant = { upcoming: "secondary", live: "destructive", ended: "outline" } as const;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">ダッシュボード</h1>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">スケジュール数</CardTitle>
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{schedules.length}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">登録顧客数</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{totalCustomers}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">配信中</CardTitle>
            <Radio className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{schedules.filter(s => s.status === "live").length}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">未承認チャット</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{pendingMessages}</div></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>スケジュール一覧</CardTitle></CardHeader>
        <CardContent>
          {schedules.length === 0 ? (
            <p className="text-sm text-muted-foreground">スケジュールがありません</p>
          ) : (
            <div className="space-y-3">
              {schedules.map((s) => (
                <Link key={s.id} href={`/admin/schedules/${s.id}`}
                  className="flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-muted/50">
                  <div>
                    <h3 className="font-medium">{s.title}</h3>
                    <p className="text-sm text-muted-foreground">{new Date(s.scheduled_start).toLocaleString("ja-JP")}</p>
                    <p className="mt-1 font-mono text-xs text-muted-foreground">/watch/{s.slug}</p>
                  </div>
                  <Badge variant={statusVariant[s.status]}>{statusLabel[s.status]}</Badge>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
