"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Radio, CalendarDays, CalendarClock } from "lucide-react";
import type { Schedule } from "@/types";

export default function AdminDashboard() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [totalCustomers, setTotalCustomers] = useState(0);

  useEffect(() => {
    const supabase = createClient();
    async function load() {
      const { data } = await supabase.from("schedules").select("*").order("scheduled_start", { ascending: false });
      if (data) setSchedules(data as Schedule[]);

      const { count } = await supabase.from("customers").select("*", { count: "exact", head: true });
      setTotalCustomers(count || 0);
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
            <CardTitle className="text-sm font-medium">配信予定</CardTitle>
            <CalendarClock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{schedules.filter(s => s.status === "upcoming").length}</div></CardContent>
        </Card>
        <Card className={schedules.filter(s => s.status === "live").length > 0 ? "border-red-500/50 bg-red-50 dark:bg-red-950/20" : ""}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className={`text-sm font-medium ${schedules.filter(s => s.status === "live").length > 0 ? "text-red-600 dark:text-red-500 font-bold" : ""}`}>配信中</CardTitle>
            <Radio className={`h-4 w-4 ${schedules.filter(s => s.status === "live").length > 0 ? "text-red-600 dark:text-red-500 animate-pulse" : "text-muted-foreground"}`} />
          </CardHeader>
          <CardContent><div className={`text-2xl font-bold ${schedules.filter(s => s.status === "live").length > 0 ? "text-red-600 dark:text-red-500" : ""}`}>{schedules.filter(s => s.status === "live").length}</div></CardContent>
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
            <CardTitle className="text-sm font-medium">総スケジュール数</CardTitle>
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{schedules.length}</div></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>今後のスケジュール</CardTitle></CardHeader>
        <CardContent>
          {schedules.filter(s => s.status === "upcoming").length === 0 ? (
            <p className="text-sm text-muted-foreground">予定されているスケジュールはありません</p>
          ) : (
            <div className="space-y-3">
              {schedules
                .filter(s => s.status === "upcoming")
                .sort((a, b) => new Date(a.scheduled_start).getTime() - new Date(b.scheduled_start).getTime())
                .map((s) => {
                  const d = new Date(s.scheduled_start);
                  const dateStr = `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
                  return (
                    <Link key={s.id} href={`/admin/schedules/${s.id}`}
                      className="flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-muted/50">
                      <div>
                        <p className="text-lg font-bold tabular-nums">{dateStr}</p>
                        <h3 className="mt-1 font-medium">{s.title}</h3>
                      </div>
                      <Badge variant={statusVariant[s.status]}>{statusLabel[s.status]}</Badge>
                    </Link>
                  );
                })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
