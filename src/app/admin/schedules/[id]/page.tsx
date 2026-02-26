"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Copy,
  Check,
  Play,
  Square,
  ExternalLink,
  Users,
  Clock,
  Eye,
  MessageSquare,
  CheckCircle,
  XCircle,
  Trash2,
  RefreshCw,
  Link as LinkIcon,
  Pencil,
  Save,
  X as XIcon,
  FlaskConical,
} from "lucide-react";
import type {
  Schedule,
  ChatMessage,
  ViewerAccessLog,
  ViewerSession,
  Customer,
  StreamStatus,
} from "@/types";
import type { RealtimeChannel } from "@supabase/supabase-js";

// --- ヘルパー ---
function fmtDate(d: string) {
  return new Date(d).toLocaleString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fmtDuration(sec: number | null) {
  if (sec === null || sec === undefined) return "-";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}時間${m}分${s}秒`;
  if (m > 0) return `${m}分${s}秒`;
  return `${s}秒`;
}

const statusLabel: Record<StreamStatus, string> = {
  upcoming: "配信前",
  live: "配信中",
  ended: "終了",
};
const statusVariant: Record<StreamStatus, "secondary" | "destructive" | "outline"> = {
  upcoming: "secondary",
  live: "destructive",
  ended: "outline",
};

// --- チャットステータスバッジ ---
function ChatStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; variant: "secondary" | "destructive" | "outline" | "default" }> = {
    pending: { label: "未承認", variant: "secondary" },
    approved: { label: "承認済", variant: "default" },
    rejected: { label: "拒否", variant: "destructive" },
    deleted: { label: "削除済", variant: "outline" },
  };
  const item = map[status] || { label: status, variant: "outline" as const };
  return <Badge variant={item.variant}>{item.label}</Badge>;
}

// --- メインコンポーネント ---
export default function ScheduleDetailPage() {
  const params = useParams();
  const router = useRouter();
  const scheduleId = params.id as string;

  // データ
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [accessLogs, setAccessLogs] = useState<(ViewerAccessLog & { customer?: Customer })[]>([]);
  const [sessions, setSessions] = useState<(ViewerSession & { customer?: Customer })[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [realtimeViewers, setRealtimeViewers] = useState<string[]>([]);

  // UI State
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [copiedTest, setCopiedTest] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [editZoom, setEditZoom] = useState({ meeting_number: "", password: "" });
  const [activeTab, setActiveTab] = useState<"overview" | "access" | "sessions" | "chat">("overview");
  const [chatFilter, setChatFilter] = useState<"all" | "pending" | "approved">("all");
  const [testPageOpened, setTestPageOpened] = useState(false);

  // 編集フォーム
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    title: "",
    speaker: "",
    description: "",
    scheduled_start: "",
    auto_end_hours: 3,
  });

  // --- データ読み込み ---
  const loadSchedule = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("schedules")
      .select("*")
      .eq("id", scheduleId)
      .single();
    if (data) {
      const s = data as Schedule;
      setSchedule(s);
      setEditZoom({
        meeting_number: s.zoom_meeting_number || "",
        password: s.zoom_password || "",
      });
      // datetime-local 用にフォーマット (YYYY-MM-DDTHH:mm)
      const startLocal = s.scheduled_start
        ? new Date(new Date(s.scheduled_start).getTime() - new Date(s.scheduled_start).getTimezoneOffset() * 60000)
            .toISOString().slice(0, 16)
        : "";
      setEditForm({
        title: s.title || "",
        speaker: s.speaker || "",
        description: s.description || "",
        scheduled_start: startLocal,
        auto_end_hours: s.auto_end_hours || 3,
      });
    }
  }, [scheduleId]);

  const loadAccessLogs = useCallback(async () => {
    const supabase = createClient();
    const { data: logs } = await supabase
      .from("viewer_access_logs")
      .select("*")
      .eq("schedule_id", scheduleId)
      .order("accessed_at", { ascending: false });

    if (logs && logs.length > 0) {
      const customerIds = Array.from(new Set(logs.map((l: ViewerAccessLog) => l.customer_id)));
      const { data: customers } = await supabase
        .from("customers")
        .select("*")
        .in("customer_id", customerIds);

      const customerMap = new Map(
        (customers || []).map((c: Customer) => [c.customer_id, c])
      );

      setAccessLogs(
        logs.map((l: ViewerAccessLog) => ({
          ...l,
          customer: customerMap.get(l.customer_id),
        }))
      );
    } else {
      setAccessLogs([]);
    }
  }, [scheduleId]);

  const loadSessions = useCallback(async () => {
    const supabase = createClient();
    const { data: sessData } = await supabase
      .from("viewer_sessions")
      .select("*")
      .eq("schedule_id", scheduleId)
      .order("joined_at", { ascending: false });

    if (sessData && sessData.length > 0) {
      const customerIds = Array.from(new Set(sessData.map((s: ViewerSession) => s.customer_id)));
      const { data: customers } = await supabase
        .from("customers")
        .select("*")
        .in("customer_id", customerIds);

      const customerMap = new Map(
        (customers || []).map((c: Customer) => [c.customer_id, c])
      );

      setSessions(
        sessData.map((s: ViewerSession) => ({
          ...s,
          customer: customerMap.get(s.customer_id),
        }))
      );
    } else {
      setSessions([]);
    }
  }, [scheduleId]);

  const loadChat = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("schedule_id", scheduleId)
      .order("created_at", { ascending: false })
      .limit(200);
    if (data) setChatMessages(data as ChatMessage[]);
  }, [scheduleId]);

  // --- 初期ロード ---
  useEffect(() => {
    async function init() {
      setIsLoading(true);
      await Promise.all([loadSchedule(), loadAccessLogs(), loadSessions(), loadChat()]);
      setIsLoading(false);
    }
    init();
  }, [loadSchedule, loadAccessLogs, loadSessions, loadChat]);

  // --- Presenceでリアルタイム視聴者追跡 ---
  useEffect(() => {
    if (!schedule) return;
    const supabase = createClient();
    const channel: RealtimeChannel = supabase.channel(
      `schedule:${schedule.slug}:chat`,
      { config: { broadcast: { self: false } } }
    );

    channel.on("presence", { event: "sync" }, () => {
      const state = channel.presenceState();
      const viewers = Object.values(state)
        .flat()
        .map((p: Record<string, unknown>) => (p.customer_id as string) || "unknown");
      setRealtimeViewers(viewers);
    });

    channel.subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [schedule]);

  // --- 配信ステータス変更 ---
  async function changeStatus(newStatus: StreamStatus) {
    if (!schedule) return;
    setIsUpdating(true);
    const supabase = createClient();

    const updates: Record<string, unknown> = { status: newStatus };
    if (newStatus === "live") {
      updates.actual_start = new Date().toISOString();
    } else if (newStatus === "ended") {
      updates.actual_end = new Date().toISOString();
    }

    const { error } = await supabase
      .from("schedules")
      .update(updates)
      .eq("id", scheduleId);

    if (!error) {
      // ステータス変更をブロードキャスト
      const channel = supabase.channel(`schedule:${schedule.slug}:status`);
      await channel.subscribe();
      await channel.send({
        type: "broadcast",
        event: "status_change",
        payload: {
          status: newStatus,
          actual_start: newStatus === "live" ? updates.actual_start : schedule.actual_start,
        },
      });
      supabase.removeChannel(channel);
      await loadSchedule();
    }
    setIsUpdating(false);
  }

  // --- テスト配信 ON/OFF ---
  async function toggleTestLive() {
    if (!schedule) return;
    setIsUpdating(true);
    const supabase = createClient();
    const newValue = !schedule.is_test_live;

    const { error } = await supabase
      .from("schedules")
      .update({ is_test_live: newValue })
      .eq("id", scheduleId);

    if (!error) {
      // テスト配信変更をブロードキャスト
      const channel = supabase.channel(`schedule:${schedule.slug}:status`);
      await channel.subscribe();
      await channel.send({
        type: "broadcast",
        event: "test_live_change",
        payload: { is_test_live: newValue },
      });
      supabase.removeChannel(channel);
      await loadSchedule();
    }
    setIsUpdating(false);
  }

  // --- スケジュール情報保存 ---
  async function saveScheduleInfo() {
    if (!schedule) return;
    setIsUpdating(true);
    const supabase = createClient();
    await supabase
      .from("schedules")
      .update({
        title: editForm.title,
        speaker: editForm.speaker || null,
        description: editForm.description || null,
        scheduled_start: new Date(editForm.scheduled_start).toISOString(),
        auto_end_hours: editForm.auto_end_hours,
      })
      .eq("id", scheduleId);
    await loadSchedule();
    setIsEditing(false);
    setIsUpdating(false);
  }

  // --- Zoom設定保存 ---
  async function saveZoomSettings() {
    if (!schedule) return;
    setIsUpdating(true);
    const supabase = createClient();
    await supabase
      .from("schedules")
      .update({
        zoom_meeting_number: editZoom.meeting_number || null,
        zoom_password: editZoom.password || null,
      })
      .eq("id", scheduleId);
    await loadSchedule();
    setIsUpdating(false);
  }

  // --- チャットアクション ---
  async function chatAction(msgId: string, action: "approved" | "rejected" | "deleted") {
    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    const updates: Record<string, unknown> = { status: action };
    if (action === "approved") {
      updates.approved_at = new Date().toISOString();
      updates.approved_by = session?.user?.id || null;
    }

    const { error } = await supabase
      .from("chat_messages")
      .update(updates)
      .eq("id", msgId);

    if (!error && action === "approved") {
      // 承認されたメッセージをブロードキャスト
      const msg = chatMessages.find((m) => m.id === msgId);
      if (msg && schedule) {
        const channel = supabase.channel(`schedule:${schedule.slug}:chat`);
        await channel.subscribe();
        await channel.send({
          type: "broadcast",
          event: "new_message",
          payload: {
            id: msg.id,
            display_name: msg.display_name,
            content: msg.content,
            created_at: msg.created_at,
            customer_id: msg.customer_id,
          },
        });
        supabase.removeChannel(channel);
      }
    }

    if (!error && action === "deleted") {
      // 削除をブロードキャスト
      if (schedule) {
        const channel = supabase.channel(`schedule:${schedule.slug}:chat`);
        await channel.subscribe();
        await channel.send({
          type: "broadcast",
          event: "delete_message",
          payload: { id: msgId },
        });
        supabase.removeChannel(channel);
      }
    }

    await loadChat();
  }

  // --- URLコピー ---
  function copyUrl() {
    if (!schedule) return;
    const url = `${window.location.origin}/watch/${schedule.slug}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  // --- テストURLコピー ---
  function copyTestUrl() {
    if (!schedule) return;
    const url = `${window.location.origin}/watch/${schedule.slug}?mode=test`;
    navigator.clipboard.writeText(url);
    setCopiedTest(true);
    setTimeout(() => setCopiedTest(false), 1500);
  }

  // --- ローディング ---
  if (isLoading || !schedule) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted-foreground">読み込み中...</p>
      </div>
    );
  }

  const filteredChat =
    chatFilter === "all"
      ? chatMessages
      : chatMessages.filter((m) => m.status === chatFilter);

  const uniqueAccessCustomers = new Set(accessLogs.map((l) => l.customer_id));
  const activeSessions = sessions.filter((s) => s.is_active);
  const totalViewTime = sessions.reduce((acc, s) => acc + (s.duration_seconds || 0), 0);

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <button
            onClick={() => router.push("/admin/schedules")}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            スケジュール一覧に戻る
          </button>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{schedule.title}</h1>
            <Badge variant={statusVariant[schedule.status]}>
              {statusLabel[schedule.status]}
            </Badge>
          </div>
          {schedule.description && (
            <p className="text-sm text-muted-foreground">{schedule.description}</p>
          )}
        </div>
      </div>

      {/* 配信URL & 操作ボタン */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            {/* URL表示 */}
            <div className="flex-1 space-y-1">
              <p className="text-xs font-medium text-muted-foreground">配信URL</p>
              <div className="flex items-center gap-2">
                <LinkIcon className="h-4 w-4 text-muted-foreground" />
                <code className="text-sm font-mono">
                  /watch/{schedule.slug}
                </code>
                <button
                  onClick={copyUrl}
                  className="rounded p-1 hover:bg-muted"
                  title="URLをコピー"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>
                <a
                  href={`/watch/${schedule.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded p-1 hover:bg-muted"
                  title="新しいタブで開く"
                >
                  <ExternalLink className="h-4 w-4 text-muted-foreground" />
                </a>
              </div>
            </div>

            {/* 配信操作 */}
            <div className="flex flex-wrap gap-2">
              {/* テスト配信: 3段階フロー */}
              {!schedule.is_test_live && !testPageOpened && (
                <Button
                  onClick={() => {
                    window.open(`/watch/${schedule.slug}?mode=test`, "_blank");
                    setTestPageOpened(true);
                  }}
                  disabled={isUpdating}
                  variant="outline"
                  className="gap-2"
                >
                  <FlaskConical className="h-4 w-4" />
                  テスト配信を行う
                </Button>
              )}
              {!schedule.is_test_live && testPageOpened && (
                <Button
                  onClick={toggleTestLive}
                  disabled={isUpdating}
                  className="gap-2 bg-amber-600 hover:bg-amber-700 text-white"
                >
                  <Play className="h-4 w-4" />
                  テスト配信開始
                </Button>
              )}
              {schedule.is_test_live && (
                <Button
                  onClick={() => {
                    toggleTestLive();
                    setTestPageOpened(false);
                  }}
                  disabled={isUpdating}
                  variant="destructive"
                  className="gap-2"
                >
                  <Square className="h-4 w-4" />
                  テスト配信終了
                </Button>
              )}
              {schedule.status === "upcoming" && (
                <Button
                  onClick={() => changeStatus("live")}
                  disabled={isUpdating}
                  className="gap-2 bg-red-600 hover:bg-red-700"
                >
                  <Play className="h-4 w-4" />
                  配信開始
                </Button>
              )}
              {schedule.status === "live" && (
                <Button
                  onClick={() => changeStatus("ended")}
                  disabled={isUpdating}
                  variant="outline"
                  className="gap-2"
                >
                  <Square className="h-4 w-4" />
                  配信終了
                </Button>
              )}
              {schedule.status === "ended" && (
                <Button
                  onClick={() => changeStatus("upcoming")}
                  disabled={isUpdating}
                  variant="outline"
                  className="gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  リセット
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* テスト配信URL */}
      {(testPageOpened || schedule.is_test_live) && (
        <Card className="border-amber-500/50 bg-amber-50 dark:bg-amber-950/20">
          <CardContent className="p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex-1 space-y-1">
                <p className="text-xs font-medium text-amber-600">
                  {schedule.is_test_live ? "テスト配信中" : "テストページ表示中（配信未開始）"}
                </p>
                <div className="flex items-center gap-2">
                  <FlaskConical className="h-4 w-4 text-amber-600" />
                  <code className="text-sm font-mono">
                    /watch/{schedule.slug}?mode=test
                  </code>
                  <button
                    onClick={copyTestUrl}
                    className="rounded p-1 hover:bg-amber-200/50"
                    title="テストURLをコピー"
                  >
                    {copiedTest ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4 text-amber-600" />
                    )}
                  </button>
                  <a
                    href={`/watch/${schedule.slug}?mode=test`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded p-1 hover:bg-amber-200/50"
                    title="テストページを開く"
                  >
                    <ExternalLink className="h-4 w-4 text-amber-600" />
                  </a>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* サマリーカード */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">アクセス数</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{accessLogs.length}</div>
            <p className="text-xs text-muted-foreground">
              ユニーク: {uniqueAccessCustomers.size}人
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">現在の視聴者</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{realtimeViewers.length}</div>
            <p className="text-xs text-muted-foreground">
              アクティブセッション: {activeSessions.length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">合計視聴時間</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{fmtDuration(totalViewTime)}</div>
            <p className="text-xs text-muted-foreground">
              セッション数: {sessions.length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">チャット</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{chatMessages.length}</div>
            <p className="text-xs text-muted-foreground">
              未承認: {chatMessages.filter((m) => m.status === "pending").length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* タブ切り替え */}
      <div className="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0">
        <div className="flex gap-1 rounded-lg border bg-muted/30 p-1 min-w-max sm:min-w-0">
          {[
            { key: "overview" as const, label: "基本情報" },
            { key: "access" as const, label: `アクセスログ (${accessLogs.length})` },
            { key: "sessions" as const, label: `視聴セッション (${sessions.length})` },
            { key: "chat" as const, label: `チャット (${chatMessages.filter((m) => m.status === "pending").length})` },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* === 基本情報タブ === */}
      {activeTab === "overview" && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* スケジュール情報 */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">スケジュール情報</CardTitle>
                {!isEditing ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1"
                    onClick={() => setIsEditing(true)}
                  >
                    <Pencil className="h-3 w-3" />
                    編集
                  </Button>
                ) : (
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1 text-green-600 hover:text-green-700"
                      onClick={saveScheduleInfo}
                      disabled={isUpdating}
                    >
                      <Save className="h-3 w-3" />
                      保存
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1"
                      onClick={() => {
                        setIsEditing(false);
                        // リセット
                        if (schedule) {
                          const startLocal = schedule.scheduled_start
                            ? new Date(new Date(schedule.scheduled_start).getTime() - new Date(schedule.scheduled_start).getTimezoneOffset() * 60000)
                                .toISOString().slice(0, 16)
                            : "";
                          setEditForm({
                            title: schedule.title || "",
                            speaker: schedule.speaker || "",
                            description: schedule.description || "",
                            scheduled_start: startLocal,
                            auto_end_hours: schedule.auto_end_hours || 3,
                          });
                        }
                      }}
                    >
                      <XIcon className="h-3 w-3" />
                      キャンセル
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {isEditing ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>タイトル</Label>
                    <Input
                      value={editForm.title}
                      onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                      placeholder="配信タイトル"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>スピーカー</Label>
                    <Input
                      value={editForm.speaker}
                      onChange={(e) => setEditForm({ ...editForm, speaker: e.target.value })}
                      placeholder="講師名（任意）"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>説明</Label>
                    <Textarea
                      value={editForm.description}
                      onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                      placeholder="説明（任意）"
                      className="min-h-[120px] resize-y"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>配信開始予定</Label>
                    <Input
                      type="datetime-local"
                      value={editForm.scheduled_start}
                      onChange={(e) => setEditForm({ ...editForm, scheduled_start: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>自動終了（時間）</Label>
                    <Input
                      type="number"
                      min={1}
                      max={24}
                      value={editForm.auto_end_hours}
                      onChange={(e) => setEditForm({ ...editForm, auto_end_hours: parseInt(e.target.value) || 3 })}
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <span className="text-muted-foreground">タイトル</span>
                  <span>{schedule.title}</span>

                  <span className="text-muted-foreground">スピーカー</span>
                  <span>{schedule.speaker || "-"}</span>

                  <span className="text-muted-foreground">説明</span>
                  <span>{schedule.description || "-"}</span>

                  <span className="text-muted-foreground">配信開始予定</span>
                  <span>{fmtDate(schedule.scheduled_start)}</span>

                  <span className="text-muted-foreground">自動終了</span>
                  <span>{schedule.auto_end_hours}時間後</span>

                  {schedule.actual_start && (
                    <>
                      <span className="text-muted-foreground">実際の開始</span>
                      <span>{fmtDate(schedule.actual_start)}</span>
                    </>
                  )}
                  {schedule.actual_end && (
                    <>
                      <span className="text-muted-foreground">実際の終了</span>
                      <span>{fmtDate(schedule.actual_end)}</span>
                    </>
                  )}

                  <span className="text-muted-foreground">作成日</span>
                  <span>{fmtDate(schedule.created_at)}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Zoom設定 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Zoom設定</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>ミーティングID</Label>
                <Input
                  value={editZoom.meeting_number}
                  onChange={(e) =>
                    setEditZoom({ ...editZoom, meeting_number: e.target.value })
                  }
                  placeholder="123 456 7890"
                />
              </div>
              <div className="space-y-2">
                <Label>パスワード</Label>
                <Input
                  value={editZoom.password}
                  onChange={(e) =>
                    setEditZoom({ ...editZoom, password: e.target.value })
                  }
                  placeholder="パスワード"
                />
              </div>
              <Button
                onClick={saveZoomSettings}
                disabled={isUpdating}
                size="sm"
              >
                保存
              </Button>
              {schedule.zoom_meeting_number && (
                <p className="text-xs text-green-600">
                  設定済み: {schedule.zoom_meeting_number}
                </p>
              )}
            </CardContent>
          </Card>

          {/* リアルタイム視聴者 */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">リアルタイム視聴者</CardTitle>
                <Badge variant={realtimeViewers.length > 0 ? "destructive" : "secondary"}>
                  {realtimeViewers.length}人
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {realtimeViewers.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  現在視聴中のユーザーはいません
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {realtimeViewers.map((v, i) => (
                    <Badge key={i} variant="outline" className="font-mono">
                      {v}
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* === アクセスログタブ === */}
      {activeTab === "access" && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">アクセスログ</CardTitle>
              <Button variant="outline" size="sm" onClick={loadAccessLogs} className="gap-1">
                <RefreshCw className="h-3 w-3" />
                更新
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {accessLogs.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                アクセスログはまだありません
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[480px] text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="whitespace-nowrap pb-2 pr-4 font-medium text-muted-foreground">顧客ID</th>
                      <th className="whitespace-nowrap pb-2 pr-4 font-medium text-muted-foreground">名前</th>
                      <th className="whitespace-nowrap pb-2 font-medium text-muted-foreground">アクセス日時</th>
                    </tr>
                  </thead>
                  <tbody>
                    {accessLogs.map((log) => (
                      <tr key={log.id} className="border-b last:border-0">
                        <td className="whitespace-nowrap py-2 pr-4 font-mono text-xs">{log.customer_id}</td>
                        <td className="whitespace-nowrap py-2 pr-4">{log.customer?.name || "-"}</td>
                        <td className="whitespace-nowrap py-2 text-muted-foreground">{fmtDate(log.accessed_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* === 視聴セッションタブ === */}
      {activeTab === "sessions" && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">視聴セッション</CardTitle>
              <Button variant="outline" size="sm" onClick={loadSessions} className="gap-1">
                <RefreshCw className="h-3 w-3" />
                更新
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {sessions.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                視聴セッションはまだありません
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[700px] text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="whitespace-nowrap pb-2 pr-4 font-medium text-muted-foreground">顧客ID</th>
                      <th className="whitespace-nowrap pb-2 pr-4 font-medium text-muted-foreground">名前</th>
                      <th className="whitespace-nowrap pb-2 pr-4 font-medium text-muted-foreground">参加時刻</th>
                      <th className="whitespace-nowrap pb-2 pr-4 font-medium text-muted-foreground">退出時刻</th>
                      <th className="whitespace-nowrap pb-2 pr-4 font-medium text-muted-foreground">視聴時間</th>
                      <th className="whitespace-nowrap pb-2 font-medium text-muted-foreground">状態</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sessions.map((s) => (
                      <tr key={s.id} className="border-b last:border-0">
                        <td className="whitespace-nowrap py-2 pr-4 font-mono text-xs">{s.customer_id}</td>
                        <td className="whitespace-nowrap py-2 pr-4">{s.customer?.name || "-"}</td>
                        <td className="whitespace-nowrap py-2 pr-4 text-muted-foreground">{fmtDate(s.joined_at)}</td>
                        <td className="whitespace-nowrap py-2 pr-4 text-muted-foreground">
                          {s.left_at ? fmtDate(s.left_at) : "-"}
                        </td>
                        <td className="whitespace-nowrap py-2 pr-4">{fmtDuration(s.duration_seconds)}</td>
                        <td className="whitespace-nowrap py-2">
                          {s.is_active ? (
                            <Badge variant="destructive">視聴中</Badge>
                          ) : (
                            <Badge variant="outline">終了</Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* === チャットモデレーションタブ === */}
      {activeTab === "chat" && (
        <Card>
          <CardHeader className="space-y-3">
            <CardTitle className="text-lg">チャットモデレーション</CardTitle>
            <div className="flex items-center gap-2">
              <div className="flex gap-1 rounded border bg-muted/30 p-0.5">
                {(["all", "pending", "approved"] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setChatFilter(f)}
                    className={`rounded px-3 py-1.5 text-xs font-medium transition-colors ${
                      chatFilter === f
                        ? "bg-background shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {f === "all" ? "すべて" : f === "pending" ? "未承認" : "承認済"}
                  </button>
                ))}
              </div>
              <Button variant="outline" size="sm" onClick={loadChat} className="gap-1">
                <RefreshCw className="h-3 w-3" />
                更新
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {filteredChat.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                {chatFilter === "pending"
                  ? "未承認のメッセージはありません"
                  : "チャットメッセージはありません"}
              </p>
            ) : (
              <div className="space-y-2">
                {filteredChat.map((msg) => (
                  <div
                    key={msg.id}
                    className="flex items-start justify-between rounded-lg border p-3"
                  >
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{msg.display_name}</span>
                        <span className="font-mono text-xs text-muted-foreground">
                          {msg.customer_id}
                        </span>
                        <ChatStatusBadge status={msg.status} />
                      </div>
                      <p className="text-sm">{msg.content}</p>
                      <p className="text-xs text-muted-foreground">{fmtDate(msg.created_at)}</p>
                    </div>
                    <div className="ml-4 flex shrink-0 gap-1">
                      {msg.status === "pending" && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-green-600 hover:text-green-700"
                            onClick={() => chatAction(msg.id, "approved")}
                            title="承認"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-600 hover:text-red-700"
                            onClick={() => chatAction(msg.id, "rejected")}
                            title="拒否"
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                      {msg.status !== "deleted" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-red-600"
                          onClick={() => chatAction(msg.id, "deleted")}
                          title="削除"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
