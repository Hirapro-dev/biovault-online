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

                // 参加成功後にDOM検査 + UI非表示（繰り返し実行）
                setTimeout(() => {
                  logZoomDOM();
                  hideUIElements();
                }, 2000);
                setTimeout(() => hideUIElements(), 4000);
                setTimeout(() => hideUIElements(), 6000);
                setTimeout(() => hideUIElements(), 10000);
                setTimeout(() => hideUIElements(), 15000);
                // 定期的にUIを非表示にし続ける（SDK再表示対策）
                setInterval(() => hideUIElements(), 5000);
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
      "#wc-footer",                          // フッター
      ".footer",                             // フッター
      ".WCL-footer-more-btn-container",      // フッターMoreボタン
      "#wc-header",                          // ヘッダー
      "#meeting-header",                     // ミーティングヘッダー
      ".meeting-info-container",             // ミーティング情報
      ".right-panel-portal",                 // 右パネル
      ".sharer-controlbar-container",        // 共有コントロールバー
      ".suspension-window-container",        // セルフビデオコンテナ
      ".single-suspension-container__self-video", // セルフビデオ本体
      ".speaker-active-container__wrap",     // スピーカービュー小窓
      ".speaker-bar-container",              // スピーカーバー
      ".gallery-video-container__wrap",      // ギャラリービュー
      ".sharing-layout-video-list",          // 画面共有時のビデオリスト
      ".sharee-container__side-panel",       // サイドパネル
      ".active-speaker-video",              // アクティブスピーカー
      ".ReactModalPortal",                   // モーダル
      ".global-pop-up-box",                  // ポップアップ
      "#aria-notify-area",                   // 通知エリア
      ".ax-outline",                         // ツールバーアウトライン
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

      /* === ヘッダー・ツールバー・Leaveボタン完全非表示 === */

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

      /* フッター（全パターン） */
      #wc-footer,
      .footer,
      .footer__inner,
      .WCL-footer-more-btn-container,
      [class*="footer-button"],
      [class*="footer__footer"] {
        display: none !important;
        height: 0 !important;
        max-height: 0 !important;
        overflow: hidden !important;
      }

      /* ヘッダー・ツールバー・Leaveボタン */
      #wc-header,
      #meeting-header,
      .meeting-info-container,
      .meeting-info-container--left-side,
      .meeting-app__header,
      [class*="meeting-header"],
      [class*="header-button"],
      .ax-outline,
      .ax-outline-blue {
        display: none !important;
        height: 0 !important;
        max-height: 0 !important;
      }

      /* Leaveボタン（赤い）を直接非表示 */
      [class*="leave-meeting"],
      [class*="LeaveButton"],
      button[title="Leave"],
      button[aria-label="Leave"],
      .leave-btn,
      .footer-leave-btn,
      .meeting-info-icon__leave-icon {
        display: none !important;
      }

      /* 上部ツールバー全体 */
      .meeting-app > div:first-child:not(.meeting-client) {
        display: none !important;
        height: 0 !important;
      }

      /* 右パネル・共有コントロールバー */
      .right-panel-portal,
      .sharer-controlbar-container {
        display: none !important;
      }

      /* セルフビデオ・スピーカーサムネイル（画面共有時に表示される小窓） */
      .suspension-window-container,
      .single-suspension-container__self-video,
      [class*="suspension-window"],
      [class*="self-video"],
      .speaker-active-container__wrap,
      .speaker-bar-container,
      [class*="speaker-bar"],
      [class*="avatar-list"],
      .active-speaker-video,
      .gallery-video-container__wrap,
      .sharing-layout-video-list,
      [class*="video-avatar"],
      .sharee-container__side-panel {
        display: none !important;
        width: 0 !important;
        height: 0 !important;
        overflow: hidden !important;
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

      /* 画面共有コンテンツを全画面に拡大 */
      .sharee-container,
      .sharee-container__viewport,
      .sharing-layout-container {
        width: 100vw !important;
        height: 100vh !important;
        position: fixed !important;
        inset: 0 !important;
        top: 0 !important;
        left: 0 !important;
        margin: 0 !important;
        padding: 0 !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
      }

      /* canvas/video全画面 — 中央揃え */
      #zmmtg-root canvas,
      #zmmtg-root video {
        max-width: 100vw !important;
        max-height: 100vh !important;
        width: auto !important;
        height: auto !important;
        object-fit: contain !important;
        margin: auto !important;
        display: block !important;
        border: none !important;
        outline: none !important;
        box-shadow: none !important;
      }

      /* 通知・モーダル・ポップアップ */
      .join-audio-by-voip,
      .audio-notice-container,
      .notification-container,
      .ReactModalPortal,
      .global-pop-up-box,
      #aria-notify-area,
      .zm-modal,
      .zm-modal-legacy,
      .join-dialog,
      .join-audio-container,
      [class*="notification"],
      [class*="toast"] {
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
