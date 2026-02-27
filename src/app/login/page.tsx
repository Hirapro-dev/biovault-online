"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [customerId, setCustomerId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [agreed, setAgreed] = useState(true);

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
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-x-hidden bg-[#050a0e] px-4 py-8">
      {/* 背景動画（最背面） */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-95"
      >
        <source src="/login-bg.mp4" type="video/mp4" />
      </video>

      {/* 動画の上に暗めのオーバーレイ（グラデーションとの馴染み） */}
      <div className="pointer-events-none absolute inset-0 bg-[#000000]/30" />

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

        <div className="relative rounded-2xl bg-[#050a0e]/90 px-6 py-8 shadow-2xl shadow-teal-900/10 backdrop-blur-xl sm:px-12 sm:py-12">
          {/* ロゴ */}
          <div className="mb-6 flex flex-col items-center">
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
          <form onSubmit={handleSubmit} className="space-y-5">
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

            {/* 機密保持契約 */}
            <div className="space-y-3">
              <p className=" text-amber-300 text-xs font-medium uppercase tracking-wides font-semibold">
                *機密保持契約
              </p>
              <p className="text-xs mb-3 text-white">このLIVE配信には機密情報が含まれています。以下の機密保持契約内容をご確認ください。</p>
              <div className="h-40 overflow-y-auto rounded-lg border border-teal-500/15 bg-[#0d1520]/80 p-3 text-xs leading-relaxed text-slate-400 scrollbar-thin">
                <p className="mb-2">株式会社SCPP（以下「甲」という。）とLIVE配信視聴者（以下「乙」という。）は，乙が甲から開示された情報（以下「機密情報」という。）の取扱いについて次のとおり契約（以下「本契約」という。）を締結する。</p>
                <p className="mb-1 font-semibold text-slate-300">第１条（機密情報）</p>
                <p className="mb-2">本契約において機密情報とは，甲が乙に対して，書面，口頭，電子メールその他方法を問わず開示した技術上または営業上の情報をいう。<br />ただし，次の各号の一に該当する情報については，機密情報に含まれない。<br />・甲から開示を受けた時点で既に公知であった情報<br />・乙が正当な権限を有する第三者から機密保持義務を負うことなく取得した情報<br />・甲から開示を受けた後，乙の責に帰すべき事由によらないで公知になった情報</p>
                <p className="mb-1 font-semibold text-slate-300">第２条（秘密保持義務）</p>
                <p className="mb-2">乙は，機密情報を第三者に開示し，または漏えいしてはならない。ただし，次の各号の一に該当する場合は，この限りでない。<br />（１）乙が機密情報の開示につき事前の甲から書面による同意を受けた場合<br />（２）乙が法令上の義務に基づいて裁判所，官公庁その他の公的機関に機密情報を開示する場合<br />乙は，前項第１号または第２号に基づいて機密情報を開示するに先立ち，当該開示を受ける者が甲に対し本契約と同等の機密保持義務負うことを確約する書面を，甲に提出しなければならない。<br />乙は，第１項第１号または第２号に基づいて機密情報を第三者に開示した場合であっても，当該第三者による機密情報の管理利用その他の取扱いについて責任を負う。</p>
                <p className="mb-1 font-semibold text-slate-300">第３条（使用目的）</p>
                <p className="mb-2">乙は，機密情報を，甲と乙の取引に必要な範囲のみに使用し、これ以外の目的に使用してはならない。</p>
                <p className="mb-1 font-semibold text-slate-300">第４条（複製）</p>
                <p className="mb-2">乙は，書面による甲の承諾を事前に受けることなく，機密情報を複製または複写してはならない。</p>
                <p className="mb-1 font-semibold text-slate-300">第５条（差止請求，損害賠償等）</p>
                <p className="mb-2">甲は，乙が本契約に違反した場合，乙に対して，機密情報の使用を差し止めることができる。<br />乙は，本契約に違反して甲に損害を与えた場合，損害の拡大防止のため適切な措置を採るとともに，その損害を賠償しなければならない。</p>
                <p className="mb-1 font-semibold text-slate-300">第６条（知的財産権）</p>
                <p className="mb-2">相手方への秘密情報の開示は、機密情報に含まれる開示者又は第三者のいかなる知的財産権も受領者に移転し又は許諾するものではないことを確認する。</p>
                <p className="mb-1 font-semibold text-slate-300">第７条（契約上の地位移転等の禁止）</p>
                <p className="mb-2">甲及び乙は、本契約上の地位並びに本契約から生じる権利及び義務を相手方の事前の書面による承諾を得ずに、第三者に譲渡もしくは移転し又は第三者のための担保に供する等の一切の処分をしてはならない。</p>
                <p className="mb-1 font-semibold text-slate-300">第８条（有効期間）</p>
                <p className="mb-2">本契約に基づく機密保持義務は、本契約終了後も、機密情報が秘密である間は、存続するものとする。</p>
                <p className="mb-1 font-semibold text-slate-300">第９条（専属的合意管轄裁判所）</p>
                <p className="mb-2">本契約に関する紛争については，日本国法に準拠し、甲の指定する裁判所を第一審の専属的合意管轄裁判所とする。</p>
                <p className="mb-1 font-semibold text-slate-300">第10条（返還・廃棄）</p>
                <p className="mb-2">甲の請求があった場合，乙は機密情報及びその複製物を直ちに返還又は廃棄し，その旨を甲に通知する。</p>
                <p className="mt-3 text-slate-300">以上、乙が当社所定の機密保持締結画面において「機密保持契約に同意する」にチェックを入れた上で、「LIVE配信を視聴する」ボタンを押下した時点で、本契約は成立する。</p>
              </div>
              <label className="flex items-center gap-2.5 cursor-pointer">
                <Checkbox
                  checked={agreed}
                  onCheckedChange={(v) => setAgreed(v === true)}
                  className="border-teal-500/40 data-[state=checked]:bg-teal-600 data-[state=checked]:border-teal-600"
                />
                <span className="text-xs text-slate-300 select-none">
                  機密保持契約に同意する
                </span>
              </label>
            </div>

            {error && (
              <div className="rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3 text-center text-sm text-red-400">
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="relative w-full overflow-hidden bg-gradient-to-r from-teal-600 via-cyan-500 to-teal-600 text-white font-semibold tracking-wide shadow-lg shadow-teal-900/30 transition-all duration-300 hover:from-teal-500 hover:via-cyan-400 hover:to-teal-500 hover:shadow-teal-800/40 h-12 text-base"
              disabled={isLoading || !customerId.trim() || !agreed}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  認証中...
                </>
              ) : (
                "LIVE配信を視聴する"
              )}
            </Button>
          </form>

        </div>
      </div>

      {/* Copyright */}
      <p className="relative z-10 mt-6 text-center text-[10px] text-white/40">
        © SCPP Co.,Ltd. All rights reserved.
      </p>
    </div>
  );
}
