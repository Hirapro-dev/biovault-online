"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import type { Schedule, StreamStatus } from "@/types";
import { Radio, Maximize, Minimize } from "lucide-react";

interface StreamContainerProps {
  schedule: Schedule;
  customerId: string;
  customerName: string;
  isTestMode?: boolean;
}

export function StreamContainer({
  schedule,
  customerId,
  customerName,
  isTestMode = false,
}: StreamContainerProps) {
  const [status, setStatus] = useState<StreamStatus>(schedule.status);
  const [isTestLive, setIsTestLive] = useState(schedule.is_test_live);
  const [actualStart, setActualStart] = useState<string | null>(schedule.actual_start);
  const videoAreaRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // フルスクリーン切り替え
  const toggleFullscreen = useCallback(() => {
    if (!videoAreaRef.current) return;

    if (!document.fullscreenElement) {
      videoAreaRef.current.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch(() => {});
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
      }).catch(() => {});
    }
  }, []);

  // フルスクリーン状態の監視
  useEffect(() => {
    function onFullscreenChange() {
      setIsFullscreen(!!document.fullscreenElement);
    }
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  // 配信ステータスのリアルタイム監視
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase.channel(`schedule:${schedule.slug}:status`);

    channel.on("broadcast", { event: "status_change" }, (payload) => {
      const p = payload.payload as { status: StreamStatus; actual_start: string | null; is_test_live?: boolean };
      setStatus(p.status);
      if (p.actual_start) setActualStart(p.actual_start);
      if (typeof p.is_test_live === "boolean") setIsTestLive(p.is_test_live);
    });

    channel.on("broadcast", { event: "test_live_change" }, (payload) => {
      const p = payload.payload as { is_test_live: boolean };
      setIsTestLive(p.is_test_live);
    });

    channel.subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [schedule.slug]);

  // 自動終了タイマー
  useEffect(() => {
    if (status !== "live" || !actualStart) return;
    const endTime = new Date(actualStart).getTime() + schedule.auto_end_hours * 3600000;
    const remaining = endTime - Date.now();
    if (remaining <= 0) { setStatus("ended"); return; }
    const timer = setTimeout(() => setStatus("ended"), remaining);
    return () => clearTimeout(timer);
  }, [status, actualStart, schedule.auto_end_hours]);

  // 視聴セッション記録
  useEffect(() => {
    if (status !== "live") return;
    const supabase = createClient();
    let sessionId: string | null = null;

    async function startSession() {
      const { data } = await supabase
        .from("viewer_sessions")
        .insert({ schedule_id: schedule.id, customer_id: customerId, is_active: true })
        .select("id")
        .single();
      if (data) sessionId = data.id;
    }

    function endSession() {
      if (!sessionId) return;
      navigator.sendBeacon(
        "/api/session",
        JSON.stringify({ session_id: sessionId, left_at: new Date().toISOString() })
      );
    }

    startSession();
    const onBeforeUnload = () => endSession();
    const onVisibilityChange = () => { if (document.visibilityState === "hidden") endSession(); };
    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      endSession();
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [status, customerId, schedule.id]);

  return (
    <div
      ref={videoAreaRef}
      className={`relative w-full bg-[#050a0e] ${isFullscreen ? "h-screen" : "aspect-video"}`}
    >
      {/* テストモード: is_test_live で表示制御 */}
      {isTestMode && isTestLive && schedule.zoom_meeting_number && (
        <iframe
          src={`/zoom-meeting?meetingNumber=${encodeURIComponent(schedule.zoom_meeting_number)}&password=${encodeURIComponent(schedule.zoom_password || "")}&userName=${encodeURIComponent(customerName)}`}
          allow="camera; microphone; display-capture; autoplay; fullscreen"
          className="absolute inset-0 h-full w-full border-0"
          title="Zoom Test Stream"
        />
      )}
      {isTestMode && isTestLive && !schedule.zoom_meeting_number && (
        <div className="flex h-full items-center justify-center text-white">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/video-bg.png" alt="" className="absolute inset-0 h-full w-full object-cover" />
          <div className="relative z-10 text-center">
            <Radio className="mx-auto mb-4 h-16 w-16 animate-pulse text-teal-400" />
            <p className="text-xl font-semibold">テスト配信中</p>
            <p className="mt-2 text-sm text-slate-400">Zoom設定がされていません。管理画面で設定してください。</p>
          </div>
        </div>
      )}
      {isTestMode && !isTestLive && (
        <div className="flex h-full items-center justify-center text-white">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/video-bg.png" alt="" className="absolute inset-0 h-full w-full object-cover" />
          <div className="relative z-10 text-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="BioVault" className="mx-auto mb-6 h-8 w-auto object-contain drop-shadow-[0_0_15px_rgba(94,234,212,0.25)]" />
            <p className="text-xl font-semibold">テスト配信待機中</p>
            <p className="mt-2 text-sm text-slate-400">管理画面で「テスト配信」を開始してください</p>
            <p className="mt-1 text-xs text-slate-500">開始すると自動で切り替わります</p>
          </div>
        </div>
      )}

      {/* 本番モード: status で表示制御 */}
      {!isTestMode && status === "upcoming" && (
        <div className="flex h-full items-center justify-center">
          {schedule.waiting_image_url && schedule.waiting_image_url !== "/waiting.jpg" ? (
            <Image src={schedule.waiting_image_url} alt="配信前" fill className="object-cover" priority />
          ) : (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/video-bg.png" alt="" className="absolute inset-0 h-full w-full object-cover" />
              <div className="relative z-10 text-center text-white">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/logo.png" alt="BioVault" className="mx-auto mb-6 h-8 w-auto object-contain drop-shadow-[0_0_15px_rgba(94,234,212,0.25)]" />
                <p className="text-base md:text-lg font-semibold">配信時間まで今しばらくお待ちください</p>
                <p className="mt-2 text-sm text-slate-400">
                  開始時刻: {new Date(schedule.scheduled_start).toLocaleString("ja-JP")}
                </p>
                <p className="mt-1 text-xs text-slate-500">開始時に自動で切り替わります</p>
              </div>
            </>
          )}
        </div>
      )}

      {!isTestMode && status === "live" && schedule.zoom_meeting_number && (
        <iframe
          src={`/zoom-meeting?meetingNumber=${encodeURIComponent(schedule.zoom_meeting_number)}&password=${encodeURIComponent(schedule.zoom_password || "")}&userName=${encodeURIComponent(customerName)}`}
          allow="camera; microphone; display-capture; autoplay; fullscreen"
          className="absolute inset-0 h-full w-full border-0"
          title="Zoom Live Stream"
        />
      )}
      {!isTestMode && status === "live" && !schedule.zoom_meeting_number && (
        <div className="flex h-full items-center justify-center text-white">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/video-bg.png" alt="" className="absolute inset-0 h-full w-full object-cover" />
          <div className="relative z-10 text-center">
            <Radio className="mx-auto mb-4 h-16 w-16 animate-pulse text-teal-400" />
            <p className="text-xl font-semibold">配信中</p>
            <p className="mt-2 text-sm text-slate-400">準備中です。しばらくお待ちください。</p>
          </div>
        </div>
      )}

      {!isTestMode && status === "ended" && (
        <div className="flex h-full items-center justify-center">
          {schedule.ended_image_url && schedule.ended_image_url !== "/ended.jpg" ? (
            <Image src={schedule.ended_image_url} alt="配信終了" fill className="object-cover" priority />
          ) : (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/video-bg.png" alt="" className="absolute inset-0 h-full w-full object-cover" />
              <div className="relative z-10 text-center text-white">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/logo.png" alt="BioVault" className="mx-auto mb-6 h-8 w-auto object-contain drop-shadow-[0_0_15px_rgba(94,234,212,0.25)]" />
                <p className="text-xl font-semibold">配信は終了しました</p>
                <p className="mt-2 text-sm text-slate-400">ご視聴ありがとうございました。</p>
              </div>
            </>
          )}
        </div>
      )}

      {/* 最大化 / 最小化ボタン */}
      <button
        onClick={toggleFullscreen}
        className="absolute right-3 top-3 z-20 rounded bg-black/60 p-1.5 text-white transition-colors hover:bg-teal-900/60"
        title={isFullscreen ? "最小化" : "最大化"}
      >
        {isFullscreen ? (
          <Minimize className="h-4 w-4" />
        ) : (
          <Maximize className="h-4 w-4" />
        )}
      </button>
    </div>
  );
}
