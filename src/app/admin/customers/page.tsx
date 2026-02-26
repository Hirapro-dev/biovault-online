"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Pencil, Trash2, Check, X, Copy, Download, RefreshCw } from "lucide-react";
import type { Customer } from "@/types";
import { generateCustomerIdFromKana } from "@/lib/utils/kana-to-romaji";

/**
 * ひらがなのみを含むかチェック（スペース含む）
 */
function isAllHiragana(str: string): boolean {
  return /^[\u3040-\u309F\s\u3000]*$/.test(str);
}

/**
 * 文字列からひらがな部分だけを抽出
 */
function extractHiragana(str: string): string {
  return str.replace(/[^\u3040-\u309F]/g, "");
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ customer_id: "", name: "", name_kana: "", memo: "" });
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // ふりがな自動入力用
  const [kanaManuallyEdited, setKanaManuallyEdited] = useState(false);
  const isComposingRef = useRef(false);
  // IME入力セッション中に検出したひらがなを蓄積するバッファ
  const sessionKanaRef = useRef("");
  // 直前の compositionUpdate の data（差分計算用）
  const prevCompositionDataRef = useRef("");
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { load(); }, []);

  // ネイティブイベントで beforeinput を監視
  useEffect(() => {
    const input = nameInputRef.current;
    if (!input) return;

    const handleBeforeInput = (e: InputEvent) => {
      if (kanaManuallyEdited) return;
      // IME入力中のテキスト
      if (e.inputType === "insertCompositionText" && e.data) {
        // data全体がひらがななら、それがIME変換前のかな
        if (isAllHiragana(e.data)) {
          sessionKanaRef.current = e.data;
        } else {
          // 漢字変換候補が出ている場合 → 前回のひらがなバッファを保持
          // (何もしない = sessionKanaRefは最後のひらがな状態を保持)
        }
      }
    };

    input.addEventListener("beforeinput", handleBeforeInput);
    return () => input.removeEventListener("beforeinput", handleBeforeInput);
  }, [kanaManuallyEdited, showForm, editingId]);

  async function load() {
    const supabase = createClient();
    const { data } = await supabase.from("customers").select("*").order("created_at", { ascending: false });
    if (data) setCustomers(data as Customer[]);
  }

  // ---- IME イベントハンドラ ----
  const handleCompositionStart = useCallback(() => {
    isComposingRef.current = true;
    sessionKanaRef.current = "";
    prevCompositionDataRef.current = "";
  }, []);

  const handleCompositionEnd = useCallback(() => {
    isComposingRef.current = false;
    if (kanaManuallyEdited) return;

    // sessionKanaRef には、IME入力中に最後に検出されたひらがな文字列が入っている
    const kana = sessionKanaRef.current;
    sessionKanaRef.current = "";
    prevCompositionDataRef.current = "";

    if (!kana) return;

    setForm((prev) => {
      const newKana = prev.name_kana + kana;
      const newId = generateCustomerIdFromKana(newKana);
      return { ...prev, name_kana: newKana, customer_id: newId };
    });
  }, [kanaManuallyEdited]);

  // 氏名の onChange
  const handleNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, name: e.target.value }));
  }, []);

  // 氏名欄でスペースが押されたとき、ふりがなにもスペースを追加
  const handleNameKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!kanaManuallyEdited && !isComposingRef.current && e.key === " ") {
      setForm((prev) => {
        if (prev.name_kana.endsWith(" ") || prev.name_kana.endsWith("　") || !prev.name_kana) return prev;
        return { ...prev, name_kana: prev.name_kana + " " };
      });
    }
    if (!kanaManuallyEdited && !isComposingRef.current && e.key === "Backspace") {
      setForm((prev) => {
        if (!prev.name_kana) return prev;
        if (prev.name.length <= 1) {
          return { ...prev, name_kana: "", customer_id: "" };
        }
        return prev;
      });
    }
  }, [kanaManuallyEdited]);

  // ふりがな手動変更時にIDを自動生成
  const handleKanaChange = useCallback((kana: string) => {
    setKanaManuallyEdited(true);
    setForm((prev) => {
      const newId = generateCustomerIdFromKana(kana);
      return { ...prev, name_kana: kana, customer_id: newId };
    });
  }, []);

  // ID再生成
  const regenerateId = useCallback(() => {
    setForm((prev) => {
      const newId = generateCustomerIdFromKana(prev.name_kana);
      return { ...prev, customer_id: newId };
    });
  }, []);

  // フォームリセット
  const resetForm = useCallback(() => {
    setForm({ customer_id: "", name: "", name_kana: "", memo: "" });
    setKanaManuallyEdited(false);
    sessionKanaRef.current = "";
    isComposingRef.current = false;
  }, []);

  async function handleCreate() {
    if (!form.name || !form.name_kana) return;
    setIsLoading(true);
    const supabase = createClient();
    const cid = form.customer_id || generateCustomerIdFromKana(form.name_kana);
    const { error } = await supabase.from("customers").insert({
      customer_id: cid,
      name: form.name,
      name_kana: form.name_kana || null,
      memo: form.memo || null,
    });
    if (!error) {
      resetForm();
      setShowForm(false);
      load();
    }
    setIsLoading(false);
  }

  async function handleUpdate() {
    if (!editingId || !form.name) return;
    setIsLoading(true);
    const supabase = createClient();
    await supabase.from("customers").update({
      customer_id: form.customer_id,
      name: form.name,
      name_kana: form.name_kana || null,
      memo: form.memo || null,
    }).eq("id", editingId);
    setEditingId(null);
    resetForm();
    load();
    setIsLoading(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("この顧客を削除しますか？")) return;
    const supabase = createClient();
    await supabase.from("customers").delete().eq("id", id);
    load();
  }

  async function handleToggleActive(customer: Customer) {
    const supabase = createClient();
    await supabase.from("customers").update({ is_active: !customer.is_active }).eq("id", customer.id);
    load();
  }

  function startEdit(c: Customer) {
    setEditingId(c.id);
    setForm({ customer_id: c.customer_id, name: c.name, name_kana: c.name_kana || "", memo: c.memo || "" });
    setKanaManuallyEdited(true);
    setShowForm(false);
  }

  function copyId(id: string) {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  }

  function downloadCSV() {
    const headers = ["顧客ID", "氏名", "ふりがな", "メモ", "ステータス", "登録日"];
    const rows = filtered.map(c => [
      c.customer_id, c.name, c.name_kana || "",
      c.memo || "",
      c.is_active ? "有効" : "無効",
      new Date(c.created_at).toLocaleString("ja-JP"),
    ]);
    const csv = [headers, ...rows].map(r => r.map(cell => `"${cell}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `customers_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  }

  const filtered = customers.filter(c =>
    c.name.includes(search) || c.customer_id.toLowerCase().includes(search.toLowerCase()) || (c.name_kana || "").includes(search) || (c.memo || "").includes(search)
  );

  return (
    <div className="space-y-6 min-w-0 max-w-full">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold">顧客管理</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={downloadCSV} className="gap-1" size="sm"><Download className="h-4 w-4" />CSV</Button>
          <Button onClick={() => { setShowForm(!showForm); setEditingId(null); resetForm(); }} className="gap-1" size="sm">
            <Plus className="h-4 w-4" />新規顧客
          </Button>
        </div>
      </div>

      {/* 新規・編集フォーム */}
      {(showForm || editingId) && (
        <Card>
          <CardHeader><CardTitle className="text-lg">{editingId ? "顧客編集" : "新規顧客登録"}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>氏名 *</Label>
                <Input
                  ref={nameInputRef}
                  value={form.name}
                  onChange={handleNameChange}
                  onKeyDown={handleNameKeyDown}
                  onCompositionStart={handleCompositionStart}
                  onCompositionEnd={handleCompositionEnd}
                  placeholder="山田 太郎"
                />
                <p className="text-xs text-muted-foreground">姓と名の間にスペースを入れてください</p>
              </div>
              <div className="space-y-2">
                <Label>ふりがな *</Label>
                <Input
                  value={form.name_kana}
                  onChange={e => handleKanaChange(e.target.value)}
                  placeholder="やまだ たろう"
                />
                <p className="text-xs text-muted-foreground">氏名入力で自動入力されます（修正も可能）</p>
              </div>
            </div>
            <div className="space-y-2">
              <Label>顧客ID（自動生成）</Label>
              <div className="flex gap-2">
                <Input
                  value={form.customer_id}
                  onChange={e => setForm({ ...form, customer_id: e.target.value })}
                  placeholder="ふりがなからIDが自動生成されます"
                  className="font-mono flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1 shrink-0"
                  onClick={regenerateId}
                  title="再生成"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  再生成
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">苗字ローマ字＋数字4桁。手入力での変更も可能です</p>
            </div>
            <div className="space-y-2">
              <Label>メモ</Label>
              <Input value={form.memo} onChange={e => setForm({ ...form, memo: e.target.value })} placeholder="備考" />
            </div>
            <div className="flex gap-2">
              <Button onClick={editingId ? handleUpdate : handleCreate} disabled={isLoading || !form.name || !form.name_kana}>
                {editingId ? "更新" : "登録"}
              </Button>
              <Button variant="outline" onClick={() => { setShowForm(false); setEditingId(null); }}>キャンセル</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 検索 */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="氏名・ふりがな・IDで検索..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
      </div>

      {/* 一覧 */}
      <Card className="overflow-hidden min-w-0">
        <CardHeader><CardTitle>顧客一覧（{filtered.length}名）</CardTitle></CardHeader>
        <CardContent className="px-0 sm:px-6 min-w-0">
          <div className="overflow-x-auto px-4 sm:px-0 -mx-0">
            <table className="w-full min-w-[700px] text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="whitespace-nowrap pb-3 pr-4 font-medium">顧客ID</th>
                  <th className="whitespace-nowrap pb-3 pr-4 font-medium">氏名</th>
                  <th className="whitespace-nowrap pb-3 pr-4 font-medium">ふりがな</th>
                  <th className="whitespace-nowrap pb-3 pr-4 font-medium">メモ</th>
                  <th className="whitespace-nowrap pb-3 pr-4 font-medium">ステータス</th>
                  <th className="whitespace-nowrap pb-3 pr-4 font-medium">登録日</th>
                  <th className="whitespace-nowrap pb-3 font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(c => (
                  <tr key={c.id} className="border-b last:border-0">
                    <td className="whitespace-nowrap py-3 pr-4">
                      <div className="flex items-center gap-1">
                        <span className="font-mono text-xs">{c.customer_id}</span>
                        <button onClick={() => copyId(c.customer_id)} className="text-muted-foreground hover:text-foreground">
                          {copiedId === c.customer_id ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
                        </button>
                      </div>
                    </td>
                    <td className="whitespace-nowrap py-3 pr-4">{c.name}</td>
                    <td className="whitespace-nowrap py-3 pr-4 text-xs text-muted-foreground">{c.name_kana || "-"}</td>
                    <td className="py-3 pr-4 text-muted-foreground text-xs">{c.memo || "-"}</td>
                    <td className="whitespace-nowrap py-3 pr-4">
                      <button onClick={() => handleToggleActive(c)}>
                        <Badge variant={c.is_active ? "default" : "outline"} className="cursor-pointer">
                          {c.is_active ? "有効" : "無効"}
                        </Badge>
                      </button>
                    </td>
                    <td className="whitespace-nowrap py-3 pr-4 text-xs text-muted-foreground">{new Date(c.created_at).toLocaleDateString("ja-JP")}</td>
                    <td className="whitespace-nowrap py-3">
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => startEdit(c)}><Pencil className="h-3.5 w-3.5" /></Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => handleDelete(c.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">顧客が登録されていません</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
