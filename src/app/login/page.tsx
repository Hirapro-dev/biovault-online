"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [customerId, setCustomerId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId.trim()) return;
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customer_id: customerId.trim() }),
      });
      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || "ログインに失敗しました");
      }

      localStorage.setItem("customer_id", result.customer_id);
      localStorage.setItem("customer_name", result.name);

      const params = new URLSearchParams(window.location.search);
      const redirectSlug = params.get("redirect");
      if (redirectSlug) {
        router.push(`/watch/${redirectSlug}`);
      } else {
        router.push(result.latest_slug ? `/watch/${result.latest_slug}` : "/login");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "ログインに失敗しました");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#050a0e] px-4">
      {/* 背景動画（最背面） */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-40"
      >
        <source src="/login-bg.mp4" type="video/mp4" />
      </video>

      {/* 動画の上に暗めのオーバーレイ（グラデーションとの馴染み） */}
      <div className="pointer-events-none absolute inset-0 bg-[#050a0e]/50" />

      {/* 背景：斜めの光線エフェクト（動画の上に重なる） */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {/* メインの斜め光線（左下→右上） */}
        <div
          className="absolute -left-[20%] top-[10%] h-[200px] w-[140%] rotate-[-35deg] bg-gradient-to-r from-transparent via-teal-500/10 to-transparent blur-[60px]"
        />
        <div
          className="absolute -left-[10%] top-[30%] h-[150px] w-[130%] rotate-[-35deg] bg-gradient-to-r from-transparent via-cyan-400/8 to-transparent blur-[80px]"
        />
        <div
          className="absolute -left-[15%] top-[55%] h-[180px] w-[140%] rotate-[-35deg] bg-gradient-to-r from-transparent via-emerald-500/8 to-transparent blur-[70px]"
        />

        {/* 補助グロー */}
        <div className="absolute left-[10%] top-[20%] h-[400px] w-[400px] rounded-full bg-teal-900/20 blur-[120px]" />
        <div className="absolute bottom-[10%] right-[15%] h-[350px] w-[350px] rounded-full bg-cyan-900/15 blur-[100px]" />
        <div className="absolute left-[50%] top-[60%] h-[300px] w-[300px] -translate-x-1/2 rounded-full bg-emerald-900/10 blur-[90px]" />

        {/* パーティクル（キラキラ） */}
        <div className="absolute left-[15%] top-[25%] h-1 w-1 rounded-full bg-teal-300/40 shadow-[0_0_6px_rgba(94,234,212,0.4)]" />
        <div className="absolute left-[70%] top-[15%] h-0.5 w-0.5 rounded-full bg-cyan-300/50 shadow-[0_0_4px_rgba(103,232,249,0.5)]" />
        <div className="absolute left-[45%] top-[70%] h-1 w-1 rounded-full bg-emerald-300/35 shadow-[0_0_6px_rgba(110,231,183,0.35)]" />
        <div className="absolute left-[80%] top-[45%] h-0.5 w-0.5 rounded-full bg-teal-200/45 shadow-[0_0_4px_rgba(153,246,228,0.45)]" />
        <div className="absolute left-[25%] top-[60%] h-1 w-1 rounded-full bg-cyan-200/30 shadow-[0_0_5px_rgba(165,243,252,0.3)]" />
        <div className="absolute left-[60%] top-[80%] h-0.5 w-0.5 rounded-full bg-teal-300/40 shadow-[0_0_4px_rgba(94,234,212,0.4)]" />
        <div className="absolute left-[35%] top-[10%] h-0.5 w-0.5 rounded-full bg-emerald-200/35 shadow-[0_0_4px_rgba(167,243,208,0.35)]" />
        <div className="absolute left-[90%] top-[70%] h-1 w-1 rounded-full bg-cyan-300/30 shadow-[0_0_5px_rgba(103,232,249,0.3)]" />

        {/* 細い光線ライン */}
        <div className="absolute -left-[5%] top-[40%] h-[1px] w-[60%] rotate-[-35deg] bg-gradient-to-r from-transparent via-teal-400/25 to-transparent" />
        <div className="absolute left-[30%] top-[20%] h-[1px] w-[50%] rotate-[-35deg] bg-gradient-to-r from-transparent via-cyan-400/20 to-transparent" />
        <div className="absolute left-[10%] top-[65%] h-[1px] w-[55%] rotate-[-35deg] bg-gradient-to-r from-transparent via-emerald-400/20 to-transparent" />
      </div>

      {/* カード */}
      <div className="relative z-10 w-full max-w-md">
        {/* ティールのボーダーグロー */}
        <div className="absolute -inset-[1px] rounded-2xl bg-gradient-to-b from-teal-400/40 via-cyan-400/20 to-teal-400/30" />

        <div className="relative rounded-2xl bg-[#0a1118]/90 px-8 py-12 shadow-2xl shadow-teal-900/10 backdrop-blur-xl sm:px-12 sm:py-16">
          {/* ロゴ */}
          <div className="mb-8 flex flex-col items-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo.png"
              alt="BioVault"
              className="mb-6 h-8 w-auto object-contain drop-shadow-[0_0_15px_rgba(94,234,212,0.25)]"
            />
            <h1 className="bg-gradient-to-r from-teal-200 via-cyan-100 to-teal-200 bg-clip-text text-xl font-bold tracking-wide text-transparent">
              ONLINE SEMINAR
            </h1>
            <div className="mt-3 h-[1px] w-16 bg-gradient-to-r from-transparent via-teal-500/50 to-transparent" />
            <p className="mt-4 text-sm tracking-wide text-slate-400">
              専用IDを入力してログインしてください
            </p>
          </div>

          {/* フォーム */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label
                htmlFor="customerId"
                className="block text-xs font-medium uppercase tracking-widest text-white"
              >
                視聴ID
              </label>
              <div className="relative">
                <div className="absolute -inset-[1px] rounded-lg bg-gradient-to-r from-teal-600/20 via-cyan-500/10 to-teal-600/20" />
                <Input
                  id="customerId"
                  placeholder="IDを入力"
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  className="relative border-0 bg-[#0d1520] text-center text-lg font-mono tracking-widest text-white placeholder:text-slate-600 focus-visible:ring-1 focus-visible:ring-teal-500/40 h-12"
                  autoFocus
                />
              </div>
            </div>

            {error && (
              <div className="rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3 text-center text-sm text-red-400">
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="relative w-full overflow-hidden bg-gradient-to-r from-teal-600 via-cyan-500 to-teal-600 text-white font-semibold tracking-wide shadow-lg shadow-teal-900/30 transition-all duration-300 hover:from-teal-500 hover:via-cyan-400 hover:to-teal-500 hover:shadow-teal-800/40 h-12 text-base"
              disabled={isLoading || !customerId.trim()}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  認証中...
                </>
              ) : (
                "ログイン"
              )}
            </Button>
          </form>

        </div>
      </div>

      {/* Copyright */}
      <p className="absolute bottom-4 left-0 right-0 z-10 text-center text-[10px] text-white/40">
        © SCPP Co.,Ltd. All rights reserved.
      </p>
    </div>
  );
}
