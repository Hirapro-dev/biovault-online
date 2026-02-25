"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";

interface ZoomEmbedProps {
  meetingNumber: string;
  password: string;
  userName: string;
  initialWidth: number;
  initialHeight: number;
}

export function ZoomEmbed({
  meetingNumber,
  password,
  userName,
  initialWidth,
  initialHeight,
}: ZoomEmbedProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const clientRef = useRef<any>(null);
  const initDoneRef = useRef(false);

  // join後にSDK内部のビデオ要素を探して全画面に引き伸ばす
  function forceVideoFullSize() {
    if (!wrapperRef.current) return;

    // SDK内部のcanvas/videoを全て探す
    const canvases = wrapperRef.current.querySelectorAll("canvas, video");
    canvases.forEach((el) => {
      const htmlEl = el as HTMLElement;
      htmlEl.style.position = "fixed";
      htmlEl.style.top = "0";
      htmlEl.style.left = "0";
      htmlEl.style.width = "100%";
      htmlEl.style.height = "100%";
      htmlEl.style.objectFit = "contain";
      htmlEl.style.zIndex = "1";
      htmlEl.style.background = "black";
    });
  }

  // Zoom SDK 初期化 (1回だけ)
  useEffect(() => {
    if (initDoneRef.current) return;
    let mounted = true;

    async function initZoom() {
      try {
        const cleanMeetingNumber = meetingNumber.replace(/[\s\-]/g, "");

        const ZoomMtgEmbedded = (await import("@zoom/meetingsdk/embedded"))
          .default;

        if (!mounted || !containerRef.current) return;

        const client = ZoomMtgEmbedded.createClient();
        clientRef.current = client;
        initDoneRef.current = true;

        console.log("Zoom init (once) with size:", initialWidth, "x", initialHeight);

        await client.init({
          zoomAppRoot: containerRef.current,
          language: "ja-JP",
          patchJsMedia: true,
          leaveOnPageUnload: true,
          customize: {
            video: {
              isResizable: true,
              viewSizes: {
                default: { width: initialWidth, height: initialHeight },
              },
            },
            meetingInfo: [],
          },
        });

        // SDK署名を取得
        const res = await fetch("/api/zoom-signature", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ meetingNumber: cleanMeetingNumber, role: 0 }),
        });

        const { signature, sdkKey, error: sigError } = await res.json();

        if (!signature) {
          throw new Error(sigError || "Zoom署名の取得に失敗しました");
        }

        const joinConfig = {
          signature,
          appKey: sdkKey,
          meetingNumber: cleanMeetingNumber,
          userName,
          userEmail: "viewer@example.com",
          ...(password ? { password } : {}),
        };
        await client.join(joinConfig);

        if (mounted) setIsLoading(false);

        // join後、ビデオ描画が始まるまで待ってからcanvas/videoを全画面化
        // 複数回試行（描画タイミングが不定のため）
        for (const delay of [1000, 2000, 3500, 5000]) {
          setTimeout(() => {
            if (mounted) forceVideoFullSize();
          }, delay);
        }
      } catch (err) {
        console.error("Zoom init error:", err);
        if (mounted) {
          setError(
            err instanceof Error
              ? err.message
              : "Zoom配信への接続に失敗しました"
          );
          setIsLoading(false);
        }
      }
    }

    if (meetingNumber && initialWidth > 0 && initialHeight > 0) {
      initZoom();
    }

    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meetingNumber, password, userName]);

  // canvas/video要素の変更を監視して常にフルサイズを維持
  useEffect(() => {
    if (!wrapperRef.current) return;

    const observer = new MutationObserver(() => {
      forceVideoFullSize();
    });

    observer.observe(wrapperRef.current, {
      childList: true,
      subtree: true,
    });

    return () => observer.disconnect();
  }, []);

  // クリーンアップ（アンマウント時のみ）
  useEffect(() => {
    return () => {
      if (clientRef.current) {
        try {
          clientRef.current.leaveMeeting();
        } catch {}
      }
    };
  }, []);

  // フルスクリーン変更時にもビデオサイズを調整
  useEffect(() => {
    function handleFullscreen() {
      setTimeout(forceVideoFullSize, 500);
    }
    document.addEventListener("fullscreenchange", handleFullscreen);
    window.addEventListener("resize", handleFullscreen);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreen);
      window.removeEventListener("resize", handleFullscreen);
    };
  }, []);

  if (error) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-slate-900 p-8 text-center text-white">
        <div>
          <p className="mb-2 text-lg font-semibold">接続エラー</p>
          <p className="text-sm text-slate-300">{error}</p>
          <p className="mt-4 text-xs text-slate-400">
            ページを再読み込みしてもう一度お試しください
          </p>
        </div>
      </div>
    );
  }

  return (
    <div ref={wrapperRef} className="zoom-viewer absolute inset-0 overflow-hidden bg-black">
      {isLoading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-900">
          <div className="text-center text-white">
            <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin" />
            <p>配信に接続中...</p>
          </div>
        </div>
      )}
      <div
        ref={containerRef}
        id="meetingSDKElement"
        style={{ width: "100%", height: "100%" }}
      />

      <style>{`
        /* SDKのUI要素を全て非表示 */
        .zoom-viewer [class*="footer"],
        .zoom-viewer [class*="toolbar"],
        .zoom-viewer [class*="meeting-info"],
        .zoom-viewer [class*="notification"],
        .zoom-viewer [class*="speaker-bar"],
        .zoom-viewer [class*="speaking"],
        .zoom-viewer [class*="active-speaker"],
        .zoom-viewer [class*="view-mode"],
        .zoom-viewer [class*="minimize"],
        .zoom-viewer [class*="layout-btn"],
        .zoom-viewer [class*="header"],
        .zoom-viewer [class*="participants-header"] {
          display: none !important;
          height: 0 !important;
          min-height: 0 !important;
          padding: 0 !important;
          margin: 0 !important;
          overflow: hidden !important;
        }

        /* SDK内部コンテナを全画面に */
        #meetingSDKElement > div {
          position: absolute !important;
          inset: 0 !important;
          width: 100% !important;
          height: 100% !important;
          overflow: hidden !important;
        }

        /* SDKのReactルートも全画面に */
        #meetingSDKElement > div > div {
          width: 100% !important;
          height: 100% !important;
        }
      `}</style>
    </div>
  );
}
