"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sun, Moon, Monitor, Mail, Lock, Loader2, Pencil, X } from "lucide-react";

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();

  // 現在のメールアドレス
  const [currentEmail, setCurrentEmail] = useState("");

  // メールアドレス変更
  const [emailEditing, setEmailEditing] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailMessage, setEmailMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // パスワード変更
  const [passwordEditing, setPasswordEditing] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // 現在のユーザー情報を取得
  useEffect(() => {
    async function loadUser() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        setCurrentEmail(user.email);
      }
    }
    loadUser();
  }, []);

  async function handleEmailChange(e: React.FormEvent) {
    e.preventDefault();
    if (!newEmail.trim()) return;
    setEmailLoading(true);
    setEmailMessage(null);

    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ email: newEmail.trim() });

    if (error) {
      setEmailMessage({ type: "error", text: error.message });
    } else {
      setEmailMessage({
        type: "success",
        text: "確認メールを送信しました。メール内のリンクをクリックして変更を完了してください。",
      });
      setNewEmail("");
      setEmailEditing(false);
    }
    setEmailLoading(false);
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    if (!newPassword || !confirmPassword) return;

    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: "error", text: "パスワードが一致しません" });
      return;
    }
    if (newPassword.length < 6) {
      setPasswordMessage({ type: "error", text: "パスワードは6文字以上で入力してください" });
      return;
    }

    setPasswordLoading(true);
    setPasswordMessage(null);

    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: newPassword });

    if (error) {
      setPasswordMessage({ type: "error", text: error.message });
    } else {
      setPasswordMessage({ type: "success", text: "パスワードを変更しました" });
      setNewPassword("");
      setConfirmPassword("");
      setPasswordEditing(false);
    }
    setPasswordLoading(false);
  }

  const themeOptions = [
    { value: "light", label: "ライト", icon: Sun },
    { value: "dark", label: "ダーク", icon: Moon },
    { value: "system", label: "システム", icon: Monitor },
  ] as const;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">設定</h1>
        <p className="text-sm text-muted-foreground">
          アカウント情報と表示設定を管理します
        </p>
      </div>

      {/* メールアドレス */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Mail className="h-5 w-5" />
            メールアドレス
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!emailEditing ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">現在のメールアドレス</p>
                  <p className="font-medium">{currentEmail || "読み込み中..."}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => { setEmailEditing(true); setEmailMessage(null); }}
                >
                  <Pencil className="h-3.5 w-3.5" />
                  編集
                </Button>
              </div>
              {emailMessage && (
                <p className={`text-sm ${emailMessage.type === "error" ? "text-red-500" : "text-green-600"}`}>
                  {emailMessage.text}
                </p>
              )}
            </div>
          ) : (
            <form onSubmit={handleEmailChange} className="space-y-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">現在: {currentEmail}</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="newEmail">新しいメールアドレス</Label>
                <Input
                  id="newEmail"
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="new-email@example.com"
                  autoFocus
                />
              </div>
              {emailMessage && (
                <p className={`text-sm ${emailMessage.type === "error" ? "text-red-500" : "text-green-600"}`}>
                  {emailMessage.text}
                </p>
              )}
              <div className="flex gap-2">
                <Button type="submit" disabled={emailLoading || !newEmail.trim()} size="sm">
                  {emailLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  変更する
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => { setEmailEditing(false); setNewEmail(""); setEmailMessage(null); }}
                >
                  <X className="mr-1 h-3.5 w-3.5" />
                  キャンセル
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>

      {/* パスワード */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Lock className="h-5 w-5" />
            パスワード
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!passwordEditing ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">パスワード</p>
                  <p className="font-medium tracking-widest">••••••••</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => { setPasswordEditing(true); setPasswordMessage(null); }}
                >
                  <Pencil className="h-3.5 w-3.5" />
                  変更
                </Button>
              </div>
              {passwordMessage && (
                <p className={`text-sm ${passwordMessage.type === "error" ? "text-red-500" : "text-green-600"}`}>
                  {passwordMessage.text}
                </p>
              )}
            </div>
          ) : (
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="newPassword">新しいパスワード</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="6文字以上"
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">パスワード確認</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="もう一度入力"
                />
              </div>
              {passwordMessage && (
                <p className={`text-sm ${passwordMessage.type === "error" ? "text-red-500" : "text-green-600"}`}>
                  {passwordMessage.text}
                </p>
              )}
              <div className="flex gap-2">
                <Button type="submit" disabled={passwordLoading || !newPassword || !confirmPassword} size="sm">
                  {passwordLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  変更する
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => { setPasswordEditing(false); setNewPassword(""); setConfirmPassword(""); setPasswordMessage(null); }}
                >
                  <X className="mr-1 h-3.5 w-3.5" />
                  キャンセル
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>

      {/* テーマ設定 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sun className="h-5 w-5" />
            表示テーマ
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            {themeOptions.map((opt) => {
              const isActive = theme === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => setTheme(opt.value)}
                  className={`flex flex-1 flex-col items-center gap-2 rounded-lg border-2 px-4 py-4 text-sm font-medium transition-colors ${
                    isActive
                      ? "border-primary bg-primary/5 text-foreground"
                      : "border-border text-muted-foreground hover:border-primary/30 hover:text-foreground"
                  }`}
                >
                  <opt.icon className="h-6 w-6" />
                  {opt.label}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
