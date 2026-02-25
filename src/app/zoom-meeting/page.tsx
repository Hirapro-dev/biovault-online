"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function ZoomMeetingPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen w-screen items-center justify-center bg-black">
          <div className="text-center text-white">
            <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin" />
            <p>読み込み中...</p>
          </div>
        </div>
      }
    >
      <ZoomMeetingContent />
    </Suspense>
  );
}

function ZoomMeetingContent() {
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const initRef = useRef(false);

  const meetingNumber = searchParams.get("meetingNumber") || "";
  const password = searchParams.get("password") || "";
  const userName = searchParams.get("userName") || "Viewer";

  useEffect(() => {
    if (initRef.current || !meetingNumber) return;
    initRef.current = true;

    injectStyles();

    async function startMeeting() {
      try {
        const cleanMeetingNumber = meetingNumber.replace(/[\s\-]/g, "");
        const { ZoomMtg } = await import("@zoom/meetingsdk");

        ZoomMtg.preLoadWasm();
        ZoomMtg.prepareWebSDK();

        const res = await fetch("/api/zoom-signature", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ meetingNumber: cleanMeetingNumber, role: 0 }),
        });
        const { signature, sdkKey, error: sigError } = await res.json();

        if (!signature) {
          throw new Error(sigError || "Zoom署名の取得に失敗しました");
        }

        ZoomMtg.init({
          leaveUrl: window.location.origin + "/zoom-meeting/ended",
          patchJsMedia: true,
          leaveOnPageUnload: true,
          isSupportAV: true,
          isSupportChat: false,
          isSupportQA: false,
          isSupportCC: false,
          isSupportPolling: false,
          isSupportBreakout: false,
          isSupportNonverbal: false,
          showMeetingHeader: false,
          showPureSharingContent: true,
          disableInvite: true,
          disableCallOut: true,
          disableRecord: true,
          disableJoinAudio: true,
          disablePreview: true,
          disableVoIP: false,
          disableReport: true,
          videoHeader: false,
          isLockBottom: false,
          meetingInfo: [],
          disableCORP: true,
          videoDrag: false,
          success: () => {
            ZoomMtg.join({
              signature,
              sdkKey,
              meetingNumber: cleanMeetingNumber,
              passWord: password,
              userName,
              userEmail: "viewer@example.com",
              success: () => {
                console.log("Zoom Webinar: joined successfully");
                setIsLoading(false);

                // 参加成功後にDOM検査 + UI非表示
                setTimeout(() => {
                  logZoomDOM();
                  hideUIElements();
                }, 3000);
                setTimeout(() => hideUIElements(), 6000);
                setTimeout(() => hideUIElements(), 10000);
              },
              error: (err: any) => {
                console.error("Zoom join error:", err);
                setError("ウェビナーへの参加に失敗しました");
                setIsLoading(false);
              },
            });
          },
          error: (err: any) => {
            console.error("Zoom init error:", err);
            setError("Zoom初期化に失敗しました");
            setIsLoading(false);
          },
        });
      } catch (err) {
        console.error("Zoom error:", err);
        setError(
          err instanceof Error ? err.message : "配信への接続に失敗しました"
        );
        setIsLoading(false);
      }
    }

    startMeeting();
  }, [meetingNumber, password, userName]);

  /** DOM構造をコンソールに出力 */
  function logZoomDOM() {
    const root = document.getElementById("zmmtg-root");
    if (!root) return;
    console.log("=== ZOOM SDK DOM STRUCTURE ===");
    function logEl(el: Element, depth: number) {
      const indent = "  ".repeat(depth);
      const id = el.id ? `#${el.id}` : "";
      const cls =
        el.className && typeof el.className === "string"
          ? `.${el.className.trim().split(/\s+/).join(".")}`
          : "";
      const rect = el.getBoundingClientRect();
      const vis = rect.width > 0 && rect.height > 0 ? "✓" : "hidden";
      const txt =
        el.children.length === 0 && el.textContent
          ? ` "${el.textContent.substring(0, 40)}"`
          : "";
      console.log(
        `${indent}<${el.tagName.toLowerCase()}${id}${cls}> [${Math.round(rect.width)}x${Math.round(rect.height)}] ${vis}${txt}`
      );
      if (depth < 5) Array.from(el.children).forEach((c) => logEl(c, depth + 1));
    }
    logEl(root, 0);
    console.log("=== BODY DIRECT CHILDREN ===");
    Array.from(document.body.children).forEach((c) => {
      const el = c as Element;
      const id = el.id ? `#${el.id}` : "";
      const cls =
        el.className && typeof el.className === "string"
          ? `.${el.className.trim().split(/\s+/).join(".")}`
          : "";
      const rect = el.getBoundingClientRect();
      console.log(`<${el.tagName.toLowerCase()}${id}${cls}> [${Math.round(rect.width)}x${Math.round(rect.height)}]`);
    });
    console.log("=== END DOM STRUCTURE ===");
  }

  /**
   * 特定のクラス名の要素だけを安全に非表示にする
   * video, canvas は絶対に触らない
   * MutationObserverは使わない（画面共有を壊すリスクがあるため）
   */
  function hideUIElements() {
    // DOMログで確認済みの要素を直接セレクタで非表示
    const selectorsToHide = [
      ".sharee-sharing-indicator",           // 「You are viewing」バナー
      "#sharingViewOptions",                 // View Options
      ".full-screen-view-dropdown",          // フルスクリーンドロップダウン
      ".WCL-footer-more-btn-container",      // フッターMoreボタン
      ".right-panel-portal",                 // 右パネル
      ".sharer-controlbar-container",        // 共有コントロールバー
      ".suspension-window-container",        // セルフビデオコンテナ（※.react-draggableは使わない！画面共有も同クラスを持つため）
      ".single-suspension-container__self-video", // セルフビデオ本体
      ".ReactModalPortal",                   // モーダル
      ".global-pop-up-box",                  // ポップアップ
      "#aria-notify-area",                   // 通知エリア
    ];

    selectorsToHide.forEach((selector) => {
      document.querySelectorAll(selector).forEach((el) => {
        const htmlEl = el as HTMLElement;
        if (htmlEl.style.display !== "none") {
          htmlEl.style.setProperty("display", "none", "important");
          console.log(`[ZoomHide] Hidden: ${selector}`, el);
        }
      });
    });

    // 緑ボーダー除去: sharee-container__viewport + 全#zmmtg-root内の要素
    document.querySelectorAll("#zmmtg-root *").forEach((el) => {
      const htmlEl = el as HTMLElement;
      const cs = window.getComputedStyle(htmlEl);
      const bc = cs.borderColor || "";
      const oc = cs.outlineColor || "";
      const bs = cs.boxShadow || "";
      // 緑系の色を検出
      const isGreen = (color: string) =>
        color.includes("rgb(0, 128, 0)") ||
        color.includes("rgb(0, 255, 0)") ||
        color.includes("rgb(35, 217, 80)") ||
        color.includes("rgb(14, 166, 55)") ||
        color.includes("rgb(0, 200, 0)") ||
        color.includes("rgb(30,") ||
        color.includes("green");
      if (isGreen(bc)) {
        htmlEl.style.setProperty("border", "none", "important");
        console.log("[ZoomHide] Removed green border from:", htmlEl.className);
      }
      if (isGreen(oc)) {
        htmlEl.style.setProperty("outline", "none", "important");
      }
      if (isGreen(bs)) {
        htmlEl.style.setProperty("box-shadow", "none", "important");
      }
    });
  }

  /** CSS注入: DOMログで確認した実際のクラス名ベース */
  function injectStyles() {
    const style = document.createElement("style");
    style.id = "zoom-custom-styles";
    style.textContent = `
      /* ページ基本 */
      html, body {
        overflow: hidden !important;
        margin: 0 !important;
        padding: 0 !important;
        background: #000 !important;
        width: 100vw !important;
        height: 100vh !important;
      }

      /* SDKルート全画面 */
      #zmmtg-root,
      #zmmtg-root.websdk-body {
        width: 100vw !important;
        height: 100vh !important;
        overflow: hidden !important;
        position: fixed !important;
        inset: 0 !important;
        z-index: 1 !important;
      }

      #__next {
        position: fixed;
        z-index: -1;
      }

      /* === DOMログで確認済みの要素 === */

      /* 画面共有インジケーター「You are viewing」バナー */
      .sharee-sharing-indicator {
        display: none !important;
        height: 0 !important;
      }

      /* View Options */
      #sharingViewOptions,
      .full-screen-view-dropdown {
        display: none !important;
      }

      /* フッター */
      #wc-footer,
      .WCL-footer-more-btn-container {
        display: none !important;
        height: 0 !important;
      }

      /* ヘッダー */
      #wc-header,
      #meeting-header,
      .meeting-info-container,
      .meeting-info-container--left-side {
        display: none !important;
        height: 0 !important;
      }

      /* 右パネル・共有コントロールバー */
      .right-panel-portal,
      .sharer-controlbar-container {
        display: none !important;
      }

      /* セルフビデオ（※.react-draggableは画面共有にも付くので使わない！） */
      .suspension-window-container,
      .single-suspension-container__self-video {
        display: none !important;
      }

      /* 字幕 */
      .lt-subtitle-wrap {
        display: none !important;
      }

      /* メインコンテンツ全画面 */
      #wc-content,
      .meeting-client,
      .meeting-client-inner,
      .meeting-app {
        position: fixed !important;
        inset: 0 !important;
        width: 100vw !important;
        height: 100vh !important;
      }

      /* canvas/video全画面 */
      #zmmtg-root canvas,
      #zmmtg-root video {
        max-width: 100vw !important;
        max-height: 100vh !important;
        object-fit: contain !important;
        border: none !important;
        outline: none !important;
        box-shadow: none !important;
      }

      /* 通知・モーダル */
      .join-audio-by-voip,
      .audio-notice-container,
      .notification-container,
      .ReactModalPortal,
      .global-pop-up-box,
      #aria-notify-area,
      .zm-modal,
      .zm-modal-legacy,
      .join-dialog,
      .join-audio-container {
        display: none !important;
      }

      /* 緑枠対策 - 画面共有コンテナ + 全子要素 */
      .sharee-container__viewport,
      .sharee-container__viewport *,
      #zmmtg-root canvas,
      #zmmtg-root video,
      #zmmtg-root iframe {
        border: none !important;
        border-color: transparent !important;
        outline: none !important;
        outline-color: transparent !important;
        box-shadow: none !important;
      }
    `;
    document.head.appendChild(style);
  }

  if (error) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-black text-center text-white">
        <div>
          <p className="mb-2 text-lg font-semibold">接続エラー</p>
          <p className="text-sm text-gray-400">{error}</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-black">
        <div className="text-center text-white">
          <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin" />
          <p>配信に接続中...</p>
        </div>
      </div>
    );
  }

  return null;
}
