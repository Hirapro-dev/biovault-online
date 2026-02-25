"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2, MonitorPlay } from "lucide-react";

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

      // ログイン成功 → customer_id をcookieに保持してリダイレクト
      // APIがSet-Cookieする or localStorageに保存
      localStorage.setItem("customer_id", result.customer_id);
      localStorage.setItem("customer_name", result.name);

      // スケジュールのslugが指定されていれば直接遷移
      const params = new URLSearchParams(window.location.search);
      const redirectSlug = params.get("redirect");
      if (redirectSlug) {
        router.push(`/watch/${redirectSlug}`);
      } else {
        // 最新のスケジュールへ
        router.push(result.latest_slug ? `/watch/${result.latest_slug}` : "/login");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "ログインに失敗しました");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-900 to-slate-800 px-4">
      <Card className="w-full max-w-md border-slate-700 bg-slate-900/80 text-white">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-600/20">
            <MonitorPlay className="h-8 w-8 text-red-500" />
          </div>
          <CardTitle className="text-xl">オンラインセミナー</CardTitle>
          <CardDescription className="text-slate-400">
            発行されたIDを入力してログインしてください
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="customerId" className="text-slate-300">
                視聴ID
              </Label>
              <Input
                id="customerId"
                placeholder="BV-XXXX-XXXX"
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                className="border-slate-600 bg-slate-800 text-center text-lg font-mono tracking-wider text-white placeholder:text-slate-500"
                autoFocus
              />
            </div>

            {error && (
              <div className="rounded-md bg-red-500/10 p-3 text-sm text-red-400">
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="w-full bg-red-600 hover:bg-red-700"
              size="lg"
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
        </CardContent>
      </Card>
    </div>
  );
}
