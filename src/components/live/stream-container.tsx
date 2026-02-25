"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import type { Schedule, StreamStatus } from "@/types";
import { Clock, Radio, Maximize, Minimize } from "lucide-react";

interface StreamContainerProps {
  schedule: Schedule;
  customerId: string;
  customerName: string;
}

export function StreamContainer({
  schedule,
  customerId,
  customerName,
}: StreamContainerProps) {
  const [status, setStatus] = useState<StreamStatus>(schedule.status);
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
      const p = payload.payload as { status: StreamStatus; actual_start: string | null };
      setStatus(p.status);
      if (p.actual_start) setActualStart(p.actual_start);
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
      className={`relative w-full bg-black ${isFullscreen ? "h-screen" : "aspect-video"}`}
    >
      {/* 配信前: 待機画像 */}
      {status === "upcoming" && (
        <div className="flex h-full items-center justify-center">
          {schedule.waiting_image_url && schedule.waiting_image_url !== "/waiting.jpg" ? (
            <Image src={schedule.waiting_image_url} alt="配信前" fill className="object-cover" priority />
          ) : (
            <div className="text-center text-white">
              <Clock className="mx-auto mb-4 h-16 w-16 text-slate-500" />
              <p className="text-xl font-semibold">まもなく配信が始まります</p>
              <p className="mt-2 text-sm text-slate-400">
                開始時刻: {new Date(schedule.scheduled_start).toLocaleString("ja-JP")}
              </p>
              <p className="mt-1 text-xs text-slate-500">開始時に自動で切り替わります</p>
            </div>
          )}
        </div>
      )}

      {/* 配信中: Zoom Client View (iframe) */}
      {status === "live" && schedule.zoom_meeting_number && (
        <iframe
          src={`/zoom-meeting?meetingNumber=${encodeURIComponent(schedule.zoom_meeting_number)}&password=${encodeURIComponent(schedule.zoom_password || "")}&userName=${encodeURIComponent(customerName)}`}
          allow="camera; microphone; display-capture; autoplay; fullscreen"
          className="absolute inset-0 h-full w-full border-0"
          title="Zoom Live Stream"
        />
      )}
      {status === "live" && !schedule.zoom_meeting_number && (
        <div className="flex h-full items-center justify-center text-white">
          <div className="text-center">
            <Radio className="mx-auto mb-4 h-16 w-16 animate-pulse text-red-500" />
            <p className="text-xl font-semibold">配信中</p>
            <p className="mt-2 text-sm text-slate-400">準備中です。しばらくお待ちください。</p>
          </div>
        </div>
      )}

      {/* 配信終了 */}
      {status === "ended" && (
        <div className="flex h-full items-center justify-center">
          {schedule.ended_image_url && schedule.ended_image_url !== "/ended.jpg" ? (
            <Image src={schedule.ended_image_url} alt="配信終了" fill className="object-cover" priority />
          ) : (
            <div className="text-center text-white">
              <p className="text-xl font-semibold">配信は終了しました</p>
              <p className="mt-2 text-sm text-slate-400">ご視聴ありがとうございました。</p>
            </div>
          )}
        </div>
      )}

      {/* 最大化 / 最小化ボタン */}
      <button
        onClick={toggleFullscreen}
        className="absolute right-3 top-3 z-20 rounded bg-black/60 p-1.5 text-white transition-colors hover:bg-black/80"
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
