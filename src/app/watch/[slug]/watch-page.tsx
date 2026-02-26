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

  // iOS実機でのズームを防止（gestureイベント = iOS Safari固有API）
  useEffect(() => {
    // iOS Safari のピンチズームを防止（gesture系はSafari独自イベント）
    const preventGesture = (e: Event) => { e.preventDefault(); };
    document.addEventListener("gesturestart", preventGesture, { passive: false } as EventListenerOptions);
    document.addEventListener("gesturechange", preventGesture, { passive: false } as EventListenerOptions);
    document.addEventListener("gestureend", preventGesture, { passive: false } as EventListenerOptions);

    // 2本指タッチによるズームを防止
    const preventTouchZoom = (e: TouchEvent) => {
      if (e.touches.length > 1) e.preventDefault();
    };
    document.addEventListener("touchstart", preventTouchZoom, { passive: false });
    document.addEventListener("touchmove", preventTouchZoom, { passive: false });

    // ダブルタップズーム防止
    let lastTouchEnd = 0;
    const preventDoubleTap = (e: TouchEvent) => {
      const now = Date.now();
      if (now - lastTouchEnd <= 300) e.preventDefault();
      lastTouchEnd = now;
    };
    document.addEventListener("touchend", preventDoubleTap, { passive: false });

    return () => {
      document.removeEventListener("gesturestart", preventGesture);
      document.removeEventListener("gesturechange", preventGesture);
      document.removeEventListener("gestureend", preventGesture);
      document.removeEventListener("touchstart", preventTouchZoom);
      document.removeEventListener("touchmove", preventTouchZoom);
      document.removeEventListener("touchend", preventDoubleTap);
    };
  }, []);

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
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#050a0e]">
        {/* 背景グロー */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-1/2 h-[400px] w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-teal-900/15 blur-[100px]" />
        </div>
        <p className="relative z-10 text-slate-400">認証確認中...</p>
      </div>
    );
  }

  const formattedDate = new Date(schedule.scheduled_start).toLocaleDateString(
    "ja-JP",
    { year: "numeric", month: "long", day: "numeric" }
  );

  return (
    <div className="relative min-h-screen bg-[#050a0e]">
      {/* 背景エフェクト（ページ全体） */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        {/* 斜め光線 */}
        <div className="absolute -left-[20%] top-[5%] h-[150px] w-[140%] rotate-[-35deg] bg-gradient-to-r from-transparent via-teal-500/5 to-transparent blur-[80px]" />
        <div className="absolute -left-[10%] top-[40%] h-[120px] w-[130%] rotate-[-35deg] bg-gradient-to-r from-transparent via-cyan-400/4 to-transparent blur-[70px]" />
        <div className="absolute -left-[15%] top-[75%] h-[130px] w-[140%] rotate-[-35deg] bg-gradient-to-r from-transparent via-emerald-500/4 to-transparent blur-[60px]" />
        {/* 補助グロー */}
        <div className="absolute left-[5%] top-[15%] h-[300px] w-[300px] rounded-full bg-teal-900/8 blur-[100px]" />
        <div className="absolute bottom-[10%] right-[10%] h-[250px] w-[250px] rounded-full bg-cyan-900/6 blur-[80px]" />
      </div>

      {/* ヘッダー */}
      <header className="relative z-10 border-b border-teal-500/10 bg-[#050a0e]/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-[1800px] items-center justify-between px-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.png"
            alt="BioVault"
            className="h-6 w-auto object-contain drop-shadow-[0_0_10px_rgba(94,234,212,0.15)]"
          />
          <div className="flex items-center gap-3">
            <span className="text-sm text-teal-400">{customerName} 様</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="text-slate-400 hover:text-teal-200"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* テストモードバナー */}
      {isTestMode && (
        <div className="relative z-10 bg-gradient-to-r from-teal-700 via-cyan-600 to-teal-700 px-4 py-1.5 text-center text-sm font-medium text-white">
          テスト配信モード — 本番環境には影響しません
        </div>
      )}

      {/* メインコンテンツ */}
      <main className="relative z-10 mx-auto max-w-[1800px] px-4 py-6 lg:flex lg:gap-6">
        {/* 左: 動画エリア + 情報 */}
        <div className="flex-1">
          {/* タイトル */}
          <h1 className="mb-1 text-2xl font-bold text-white">
            {schedule.title}
          </h1>
          <p className="mb-4 text-sm font-medium text-teal-400">
            {schedule.speaker || ""}
          </p>

          {/* 動画プレーヤー */}
          <div className="overflow-hidden rounded-lg ring-1 ring-teal-500/10">
            <StreamContainer
              schedule={schedule}
              customerId={customerId}
              customerName={customerName}
              isTestMode={isTestMode}
            />
          </div>

          {/* 説明欄（常に動画の直下） */}
          {schedule.description && (
            <div className="mt-4 rounded-lg border border-teal-500/10 bg-[#0a1118]/60 p-4 backdrop-blur-sm">
              <p className="whitespace-pre-wrap text-sm text-slate-300">
                {schedule.description}
              </p>
            </div>
          )}

          {/* デスクトップ: 再読み込み・確認事項を動画の下に表示 */}
          <div className="hidden lg:block">
            {/* 再読み込みセクション */}
            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-slate-300">
                ※配信中に画面・音声の不具合がありましたら、 こちらの再読み込みボタンをお試しください。
              </p>
              <Button
                onClick={handleReload}
                className="w-full rounded-full bg-gradient-to-r from-teal-500 to-cyan-500 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-teal-900/20 hover:from-teal-400 hover:to-cyan-400 sm:w-auto sm:py-2 sm:text-sm"
              >
                再読み込み
              </Button>
            </div>

            {/* 確認事項アコーディオン */}
            <div className="mt-4 rounded-lg border border-teal-500/10 bg-[#0a1118]/60 backdrop-blur-sm">
              <div className="flex w-full flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <span className="text-sm font-medium text-teal-400">
                  視聴の際は必ずこちらをご確認ください
                </span>
                <button
                  onClick={() => setIsConfirmOpen(!isConfirmOpen)}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-teal-500/20 px-4 py-2 text-sm text-slate-300 transition-colors hover:bg-teal-500/5 sm:w-auto"
                >
                  確認する
                  {isConfirmOpen ? (
                    <ChevronUp className="h-4 w-4 text-teal-400" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-teal-400" />
                  )}
                </button>
              </div>
              {isConfirmOpen && (
                <div className="border-t border-teal-500/10 px-4 pb-4 pt-3">
                  <ul className="space-y-3 text-sm leading-relaxed text-slate-300">
                    <li className="flex gap-2">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-teal-500/50" />
                      <span>
                        視聴できる状態になりましたら、再生ボタンが表示されますので、再生ボタンを押してご視聴を開始されてください。
                      </span>
                    </li>
                    <li className="flex gap-2">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-teal-500/50" />
                      <span>
                        インターネットを通じたリアルタイム配信となりますので、ネット環境により映像が止まったり、暗くなってしまったりすることがございます。その際は、ページを再読み込みしてご視聴を再開されてください。
                      </span>
                    </li>
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 右: チャット */}
        <div className="mt-6 h-[500px] w-full overflow-hidden rounded-xl border border-teal-500/15 bg-[#0a1118]/80 backdrop-blur-sm lg:mt-0 lg:h-[calc(100vh-72px)] lg:w-[400px] lg:sticky lg:top-[60px]">
          <ChatRoom
            scheduleId={schedule.id}
            scheduleSlug={schedule.slug}
            customerId={customerId}
          />
        </div>

        {/* スマホ: 再読み込み・確認事項・説明欄をチャットの下に表示 */}
        <div className="lg:hidden">
          {/* 再読み込みセクション */}
          <div className="mt-5 flex flex-col gap-3">
            <p className="text-sm text-slate-300">
              ※配信中に画面・音声の不具合がありましたら、 こちらの再読み込みボタンをお試しください。
            </p>
            <Button
              onClick={handleReload}
              className="w-full rounded-full bg-gradient-to-r from-teal-500 to-cyan-500 px-6 py-3 text-base font-bold text-white shadow-lg shadow-teal-900/20 hover:from-teal-400 hover:to-cyan-400"
            >
              再読み込み
            </Button>
          </div>

          {/* 確認事項アコーディオン */}
          <div className="mt-4 rounded-lg border border-teal-500/10 bg-[#0a1118]/60 backdrop-blur-sm">
            <div className="flex w-full flex-col gap-2 px-4 py-3">
              <span className="text-sm font-medium text-teal-400">
                視聴の際は必ずこちらをご確認ください
              </span>
              <button
                onClick={() => setIsConfirmOpen(!isConfirmOpen)}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-teal-500/20 px-4 py-2 text-sm text-slate-300 transition-colors hover:bg-teal-500/5"
              >
                確認する
                {isConfirmOpen ? (
                  <ChevronUp className="h-4 w-4 text-teal-400" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-teal-400" />
                )}
              </button>
            </div>
            {isConfirmOpen && (
              <div className="border-t border-teal-500/10 px-4 pb-4 pt-3">
                <ul className="space-y-3 text-sm leading-relaxed text-slate-300">
                  <li className="flex gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-teal-500/50" />
                    <span>
                      視聴できる状態になりましたら、再生ボタンが表示されますので、再生ボタンを押してご視聴を開始されてください。
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-teal-500/50" />
                    <span>
                      インターネットを通じたリアルタイム配信となりますので、ネット環境により映像が止まったり、暗くなってしまったりすることがございます。その際は、ページを再読み込みしてご視聴を再開されてください。
                    </span>
                  </li>
                </ul>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Copyright */}
      <footer className="relative z-10 py-4 text-center text-[10px] text-white/40">
        © SCPP Co.,Ltd. All rights reserved.
      </footer>
    </div>
  );
}
