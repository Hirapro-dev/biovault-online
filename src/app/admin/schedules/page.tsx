"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, ExternalLink, Copy, Check } from "lucide-react";
import type { Schedule } from "@/types";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\u3000-\u9fff]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 50) + "-" + Date.now().toString(36);
}

export default function SchedulesPage() {
  const router = useRouter();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", speaker: "", description: "", scheduled_start: "", zoom_meeting_number: "", zoom_password: "" });
  const [isLoading, setIsLoading] = useState(false);
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    const supabase = createClient();
    const { data } = await supabase.from("schedules").select("*").order("scheduled_start", { ascending: false });
    if (data) setSchedules(data as Schedule[]);
  }

  async function handleCreate() {
    if (!form.title || !form.scheduled_start) return;
    setIsLoading(true);
    const supabase = createClient();
    const slug = slugify(form.title);
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

  function copyUrl(slug: string) {
    const url = `${window.location.origin}/watch/${slug}`;
    navigator.clipboard.writeText(url);
    setCopiedSlug(slug);
    setTimeout(() => setCopiedSlug(null), 1500);
  }

  const statusLabel = { upcoming: "配信前", live: "配信中", ended: "終了" } as const;
  const statusVariant = { upcoming: "secondary", live: "destructive", ended: "outline" } as const;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">スケジュール管理</h1>
        <Button onClick={() => setShowForm(!showForm)} className="gap-1"><Plus className="h-4 w-4" />新規スケジュール</Button>
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

      {/* 一覧 */}
      <div className="space-y-3">
        {schedules.length === 0 ? (
          <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">スケジュールがありません</CardContent></Card>
        ) : schedules.map(s => (
          <Card key={s.id} className="cursor-pointer transition-colors hover:bg-muted/30" onClick={() => router.push(`/admin/schedules/${s.id}`)}>
            <CardContent className="flex items-center justify-between p-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium">{s.title}</h3>
                  <Badge variant={statusVariant[s.status]}>{statusLabel[s.status]}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {new Date(s.scheduled_start).toLocaleString("ja-JP")}
                </p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="font-mono">/watch/{s.slug}</span>
                  <button onClick={e => { e.stopPropagation(); copyUrl(s.slug); }} className="hover:text-foreground">
                    {copiedSlug === s.slug ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
                  </button>
                </div>
              </div>
              <ExternalLink className="h-4 w-4 text-muted-foreground" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
