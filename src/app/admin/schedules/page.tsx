"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, ExternalLink, Copy, Check, Trash2, CalendarDays, ArrowUpDown, ChevronDown, Download } from "lucide-react";
import type { Schedule } from "@/types";

function slugify(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let id = "";
  for (let i = 0; i < 8; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id + "-" + Date.now().toString(36);
}

export default function SchedulesPage() {
  const router = useRouter();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", speaker: "", description: "", scheduled_start: "", zoom_meeting_number: "", zoom_password: "" });
  const [isLoading, setIsLoading] = useState(false);
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);

  // タブ & フィルター
  const [activeTab, setActiveTab] = useState<"all" | "upcoming" | "live" | "ended">("upcoming");
  const [filterYear, setFilterYear] = useState<string>("all");
  const [filterMonth, setFilterMonth] = useState<string>("all");
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");

  useEffect(() => { load(); }, []);

  async function load() {
    const supabase = createClient();
    const { data } = await supabase.from("schedules").select("*").order("scheduled_start", { ascending: false });
    if (data) setSchedules(data as Schedule[]);
  }

  // ステータス別カウント
  const statusCounts = useMemo(() => ({
    upcoming: schedules.filter(s => s.status === "upcoming").length,
    live: schedules.filter(s => s.status === "live").length,
    ended: schedules.filter(s => s.status === "ended").length,
  }), [schedules]);

  // タブでフィルタされたスケジュール
  const tabFiltered = useMemo(() => {
    if (activeTab === "all") return schedules;
    return schedules.filter(s => s.status === activeTab);
  }, [schedules, activeTab]);

  // 年・月の選択肢を算出（タブフィルタ後のデータから）
  const availableYears = useMemo(() => {
    const years = new Set(tabFiltered.map(s => new Date(s.scheduled_start).getFullYear()));
    return Array.from(years).sort((a, b) => b - a);
  }, [tabFiltered]);

  const availableMonths = useMemo(() => {
    let filtered = tabFiltered;
    if (filterYear !== "all") {
      filtered = filtered.filter(s => new Date(s.scheduled_start).getFullYear() === Number(filterYear));
    }
    const months = new Set(filtered.map(s => new Date(s.scheduled_start).getMonth() + 1));
    return Array.from(months).sort((a, b) => a - b);
  }, [tabFiltered, filterYear]);

  // フィルタリング & ソート
  const filteredSchedules = useMemo(() => {
    let result = [...tabFiltered];
    if (filterYear !== "all") {
      result = result.filter(s => new Date(s.scheduled_start).getFullYear() === Number(filterYear));
    }
    if (filterMonth !== "all") {
      result = result.filter(s => new Date(s.scheduled_start).getMonth() + 1 === Number(filterMonth));
    }
    result.sort((a, b) => {
      const diff = new Date(a.scheduled_start).getTime() - new Date(b.scheduled_start).getTime();
      return sortOrder === "asc" ? diff : -diff;
    });
    return result;
  }, [tabFiltered, filterYear, filterMonth, sortOrder]);

  async function handleCreate() {
    if (!form.title || !form.scheduled_start) return;
    setIsLoading(true);
    const supabase = createClient();
    const slug = slugify();
    const { error } = await supabase.from("schedules").insert({
      title: form.title,
      speaker: form.speaker || null,
      description: form.description || null,
      slug,
      scheduled_start: new Date(form.scheduled_start).toISOString(),
      zoom_meeting_number: form.zoom_meeting_number || null,
      zoom_password: form.zoom_password || null,
    });
    if (!error) {
      setForm({ title: "", speaker: "", description: "", scheduled_start: "", zoom_meeting_number: "", zoom_password: "" });
      setShowForm(false);
      load();
    }
    setIsLoading(false);
  }

  async function handleDelete(id: string, title: string) {
    if (!confirm(`「${title}」を削除しますか？\n\n関連するアクセスログ・視聴セッション・チャットメッセージもすべて削除されます。`)) return;
    const supabase = createClient();
    // 関連データを先に削除
    await supabase.from("chat_messages").delete().eq("schedule_id", id);
    await supabase.from("viewer_sessions").delete().eq("schedule_id", id);
    await supabase.from("viewer_access_logs").delete().eq("schedule_id", id);
    // スケジュール本体を削除
    await supabase.from("schedules").delete().eq("id", id);
    load();
  }

  function copyUrl(slug: string) {
    const url = `${window.location.origin}/watch/${slug}`;
    navigator.clipboard.writeText(url);
    setCopiedSlug(slug);
    setTimeout(() => setCopiedSlug(null), 1500);
  }

  function downloadCSV() {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const headers = ["日時", "タイトル", "URL"];
    const rows = filteredSchedules.map(s => {
      const d = new Date(s.scheduled_start);
      const dateStr = `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
      return [dateStr, s.title, `${origin}/watch/${s.slug}`];
    });
    const csv = [headers, ...rows].map(r => r.map(cell => `"${cell}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `schedules_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  }

  const statusLabel = { upcoming: "配信前", live: "配信中", ended: "終了" } as const;
  const statusVariant = { upcoming: "secondary", live: "destructive", ended: "outline" } as const;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">スケジュール管理</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={downloadCSV} className="gap-1" size="sm"><Download className="h-4 w-4" />CSV</Button>
          <Button onClick={() => setShowForm(!showForm)} className="gap-1" size="sm"><Plus className="h-4 w-4" />新規スケジュール</Button>
        </div>
      </div>

      {showForm && (
        <Card>
          <CardHeader><CardTitle className="text-lg">新規スケジュール作成</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>タイトル *</Label>
                <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="セミナータイトル" />
              </div>
              <div className="space-y-2">
                <Label>スピーカー</Label>
                <Input value={form.speaker} onChange={e => setForm({ ...form, speaker: e.target.value })} placeholder="講師名" />
              </div>
              <div className="space-y-2">
                <Label>配信開始日時 *</Label>
                <Input type="datetime-local" value={form.scheduled_start} onChange={e => setForm({ ...form, scheduled_start: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>ZoomミーティングID（後から設定可）</Label>
                <Input value={form.zoom_meeting_number} onChange={e => setForm({ ...form, zoom_meeting_number: e.target.value })} placeholder="123 456 7890" />
              </div>
              <div className="space-y-2">
                <Label>Zoomパスワード（後から設定可）</Label>
                <Input value={form.zoom_password} onChange={e => setForm({ ...form, zoom_password: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>説明</Label>
              <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="セミナーの説明" className="min-h-[120px] resize-y" />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleCreate} disabled={isLoading || !form.title || !form.scheduled_start}>作成</Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>キャンセル</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ステータスタブ */}
      {schedules.length > 0 && (
        <div className="flex border-b border-border">
          {([
            { key: "all", label: "すべて", count: schedules.length },
            { key: "upcoming", label: "予定", count: statusCounts.upcoming },
            { key: "live", label: "配信中", count: statusCounts.live },
            { key: "ended", label: "配信済", count: statusCounts.ended },
          ] as const).map(tab => {
            const isLiveHighlight = tab.key === "live" && statusCounts.live > 0;
            return (
              <button
                key={tab.key}
                onClick={() => { setActiveTab(tab.key); setFilterYear("all"); setFilterMonth("all"); }}
                className={`relative px-4 py-2.5 text-sm font-medium transition-colors ${
                  isLiveHighlight
                    ? "font-bold text-red-600 dark:text-red-500"
                    : activeTab === tab.key
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.label}
                <span className={`ml-1.5 inline-flex items-center justify-center rounded-full px-1.5 py-0.5 text-xs ${
                  isLiveHighlight
                    ? "bg-red-600 text-white"
                    : activeTab === tab.key
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                }`}>
                  {tab.count}
                </span>
                {activeTab === tab.key && (
                  <span className={`absolute bottom-0 left-0 right-0 h-0.5 ${isLiveHighlight ? "bg-red-600" : "bg-primary"}`} />
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* フィルター */}
      {schedules.length > 0 && (
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <CalendarDays className="h-4 w-4" />
            <span>絞り込み:</span>
          </div>
          {/* 年 */}
          <div className="relative">
            <select
              value={filterYear}
              onChange={e => { setFilterYear(e.target.value); setFilterMonth("all"); }}
              className="appearance-none rounded-md border border-border bg-background px-3 py-1.5 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="all">すべての年</option>
              {availableYears.map(y => (
                <option key={y} value={y}>{y}年</option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          </div>
          {/* 月 */}
          <div className="relative">
            <select
              value={filterMonth}
              onChange={e => setFilterMonth(e.target.value)}
              className="appearance-none rounded-md border border-border bg-background px-3 py-1.5 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="all">すべての月</option>
              {availableMonths.map(m => (
                <option key={m} value={m}>{m}月</option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          </div>
          {/* 昇降順 */}
          <button
            onClick={() => setSortOrder(prev => prev === "desc" ? "asc" : "desc")}
            className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm transition-colors hover:bg-muted"
          >
            <ArrowUpDown className="h-3.5 w-3.5" />
            {sortOrder === "desc" ? "新しい順" : "古い順"}
          </button>
          {/* フィルターリセット */}
          {(filterYear !== "all" || filterMonth !== "all") && (
            <button
              onClick={() => { setFilterYear("all"); setFilterMonth("all"); }}
              className="text-xs text-muted-foreground underline hover:text-foreground"
            >
              リセット
            </button>
          )}
          <span className="ml-auto text-xs text-muted-foreground">
            {filteredSchedules.length}件
          </span>
        </div>
      )}

      {/* 一覧 */}
      <div className="space-y-3">
        {schedules.length === 0 ? (
          <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">スケジュールがありません</CardContent></Card>
        ) : filteredSchedules.length === 0 ? (
          <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">該当するスケジュールがありません</CardContent></Card>
        ) : filteredSchedules.map(s => {
          const d = new Date(s.scheduled_start);
          const dateStr = `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
          const timeStr = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
          const watchUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/watch/${s.slug}`;

          return (
            <Card key={s.id} className="cursor-pointer transition-colors hover:bg-muted/30" onClick={() => router.push(`/admin/schedules/${s.id}`)}>
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1 space-y-2">
                    {/* 日時 — 一番大きいフォント */}
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <span className="text-lg sm:text-xl font-bold tabular-nums">{dateStr}</span>
                      <span className="text-lg sm:text-xl font-bold tabular-nums">{timeStr}</span>
                      <Badge variant={statusVariant[s.status]} className="ml-1">{statusLabel[s.status]}</Badge>
                    </div>
                    {/* セミナー名 — 日時の0.8倍 */}
                    <h3 className="text-base sm:text-lg leading-tight">{s.title}</h3>
                    {/* URL — コピーしやすく */}
                    <div
                      className="flex items-center gap-2"
                      onClick={e => e.stopPropagation()}
                    >
                      <span className="min-w-0 truncate rounded bg-muted px-2 py-1 font-mono text-xs sm:text-sm text-muted-foreground select-all">
                        {watchUrl}
                      </span>
                      <button
                        onClick={() => copyUrl(s.slug)}
                        className="shrink-0 rounded-md border border-border p-1.5 transition-colors hover:bg-muted"
                        title="URLをコピー"
                      >
                        {copiedSlug === s.slug ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4 text-muted-foreground" />}
                      </button>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={e => { e.stopPropagation(); handleDelete(s.id, s.title); }}
                      title="削除"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <ExternalLink className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
