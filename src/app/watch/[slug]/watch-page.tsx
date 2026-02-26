"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { StreamContainer } from "@/components/live/stream-container";
import { ChatRoom } from "@/components/chat/chat-room";
import { createClient } from "@/lib/supabase/client";
import type { Schedule } from "@/types";
import { Button } from "@/components/ui/button";
import {
  LogOut,
  RefreshCw,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface WatchPageProps {
  schedule: Schedule;
  isTestMode?: boolean;
}

export function WatchPage({ schedule, isTestMode = false }: WatchPageProps) {
  const router = useRouter();
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState<string>("匿名");
  const [isAuthed, setIsAuthed] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  // ログイン確認
  useEffect(() => {
    // テストモードはログイン不要
    if (isTestMode) {
      setCustomerId("test-viewer");
      setCustomerName("テスト視聴者");
      setIsAuthed(true);
      return;
    }

    const cid = localStorage.getItem("customer_id");
    const cname = localStorage.getItem("customer_name");
    if (!cid) {
      router.push(`/login?redirect=${schedule.slug}`);
      return;
    }
    setCustomerId(cid);
    setCustomerName(cname || "匿名");
    setIsAuthed(true);

    // アクセスログ記録
    const supabase = createClient();
    supabase.from("viewer_access_logs").insert({
      schedule_id: schedule.id,
      customer_id: cid,
    });
  }, [router, schedule.slug, schedule.id, isTestMode]);

  const handleLogout = () => {
    localStorage.removeItem("customer_id");
    localStorage.removeItem("customer_name");
    router.push("/login");
  };

  const handleReload = () => {
    window.location.reload();
  };

  if (!isAuthed || !customerId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <p className="text-slate-400">認証確認中...</p>
      </div>
    );
  }

  const formattedDate = new Date(schedule.scheduled_start).toLocaleDateString(
    "ja-JP",
    { year: "numeric", month: "long", day: "numeric" }
  );

  return (
    <div className="min-h-screen bg-[#0f0f1a]">
      {/* ヘッダー */}
      <header className="border-b border-slate-800 bg-[#0a0a14]">
        <div className="mx-auto flex h-14 max-w-[1800px] items-center justify-between px-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.png"
            alt="BioVault"
            className="h-6 w-auto object-contain"
          />
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-400">{customerName} 様</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="text-slate-400 hover:text-white"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* テストモードバナー */}
      {isTestMode && (
        <div className="bg-amber-600 px-4 py-1.5 text-center text-sm font-medium text-white">
          テスト配信モード — 本番環境には影響しません
        </div>
      )}

      {/* メインコンテンツ */}
      <main className="mx-auto max-w-[1800px] px-4 py-6 lg:flex lg:gap-6">
        {/* 左: 動画エリア + 情報 */}
        <div className="flex-1">
          {/* タイトル */}
          <h1 className="mb-1 text-2xl font-bold text-white">
            {schedule.title}
          </h1>
          <p className="mb-4 text-sm font-medium text-amber-500">
            {schedule.speaker || ""}
          </p>

          {/* 動画プレーヤー */}
          <div className="overflow-hidden rounded-lg">
            <StreamContainer
              schedule={schedule}
              customerId={customerId}
              customerName={customerName}
              isTestMode={isTestMode}
            />
          </div>

          {/* 再読み込みセクション */}
          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-300">
              ※配信中に画面・音声の不具合がありましたら、 こちらの再読み込みボタンをお試しください。
            </p>
            <Button
              onClick={handleReload}
              className="w-full rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-3 text-base font-bold text-white hover:from-amber-600 hover:to-orange-600 sm:w-auto sm:py-2 sm:text-sm"
            >
              再読み込み
            </Button>
          </div>

          {/* 確認事項アコーディオン */}
          <div className="mt-4 rounded-lg border border-slate-700 bg-slate-900/50">
            <div className="flex w-full flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-sm font-medium text-amber-500">
                視聴の際は必ずこちらをご確認ください
              </span>
              <button
                onClick={() => setIsConfirmOpen(!isConfirmOpen)}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-300 transition-colors hover:bg-slate-800 sm:w-auto"
              >
                確認する
                {isConfirmOpen ? (
                  <ChevronUp className="h-4 w-4 text-slate-400" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-slate-400" />
                )}
              </button>
            </div>
            {isConfirmOpen && (
              <div className="border-t border-slate-700 px-4 pb-4 pt-3">
                <ul className="space-y-3 text-sm leading-relaxed text-slate-300">
                  <li className="flex gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
                    <span>
                      視聴できる状態になりましたら、再生ボタンが表示されますので、再生ボタンを押してご視聴を開始されてください。
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
                    <span>
                      インターネットを通じたリアルタイム配信となりますので、ネット環境により映像が止まったり、暗くなってしまったりすることがございます。その際は、ページを再読み込みしてご視聴を再開されてください。
                    </span>
                  </li>
                </ul>
              </div>
            )}
          </div>

          {/* 説明欄 */}
          {schedule.description && (
            <div className="mt-4 rounded-lg bg-slate-800/50 p-4">
              <p className="whitespace-pre-wrap text-sm text-slate-300">
                {schedule.description}
              </p>
            </div>
          )}
        </div>

        {/* 右: チャット */}
        <div className="mt-6 h-[500px] w-full overflow-hidden rounded-xl border border-slate-800 bg-[#1a1a1a] lg:mt-0 lg:h-[calc(100vh-72px)] lg:w-[400px] lg:sticky lg:top-[60px]">
          <ChatRoom
            scheduleId={schedule.id}
            scheduleSlug={schedule.slug}
            customerId={customerId}
          />
        </div>
      </main>
    </div>
  );
}
