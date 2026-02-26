"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Pencil, Trash2, Check, X, Copy, Download, RefreshCw } from "lucide-react";
import type { Customer } from "@/types";

// 6桁の半角英数（大文字小文字混合）を生成
function generateId(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ customer_id: "", name: "", memo: "" });
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    const supabase = createClient();
    const { data } = await supabase.from("customers").select("*").order("created_at", { ascending: false });
    if (data) setCustomers(data as Customer[]);
  }

  async function handleCreate() {
    if (!form.name) return;
    setIsLoading(true);
    const supabase = createClient();
    const cid = form.customer_id || generateId();
    const { error } = await supabase.from("customers").insert({
      customer_id: cid,
      name: form.name,
      memo: form.memo || null,
    });
    if (!error) {
      setForm({ customer_id: "", name: "", memo: "" });
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
      memo: form.memo || null,
    }).eq("id", editingId);
    setEditingId(null);
    setForm({ customer_id: "", name: "", memo: "" });
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
    setForm({ customer_id: c.customer_id, name: c.name, memo: c.memo || "" });
    setShowForm(false);
  }

  function copyId(id: string) {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  }

  function downloadCSV() {
    const headers = ["顧客ID", "氏名", "メモ", "ステータス", "登録日"];
    const rows = filtered.map(c => [
      c.customer_id, c.name, c.memo || "",
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
    c.name.includes(search) || c.customer_id.toLowerCase().includes(search.toLowerCase()) || (c.memo || "").includes(search)
  );

  return (
    <div className="space-y-6 min-w-0 max-w-full">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold">顧客管理</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={downloadCSV} className="gap-1" size="sm"><Download className="h-4 w-4" />CSV</Button>
          <Button onClick={() => { setShowForm(!showForm); setEditingId(null); setForm({ customer_id: generateId(), name: "", memo: "" }); }} className="gap-1" size="sm">
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
                <Label>顧客ID（編集可）</Label>
                <div className="flex gap-2">
                  <Input
                    value={form.customer_id}
                    onChange={e => setForm({ ...form, customer_id: e.target.value })}
                    placeholder="例: aBc123"
                    className="font-mono flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1 shrink-0"
                    onClick={() => setForm({ ...form, customer_id: generateId() })}
                    title="自動生成"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    自動生成
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">6桁の英数字が自動生成されます。手入力もOK</p>
              </div>
              <div className="space-y-2">
                <Label>氏名 *</Label>
                <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="山田 太郎" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>メモ</Label>
              <Input value={form.memo} onChange={e => setForm({ ...form, memo: e.target.value })} placeholder="備考" />
            </div>
            <div className="flex gap-2">
              <Button onClick={editingId ? handleUpdate : handleCreate} disabled={isLoading || !form.name}>
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
        <Input placeholder="氏名・IDで検索..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
      </div>

      {/* 一覧 */}
      <Card className="overflow-hidden min-w-0">
        <CardHeader><CardTitle>顧客一覧（{filtered.length}名）</CardTitle></CardHeader>
        <CardContent className="px-0 sm:px-6 min-w-0">
          <div className="overflow-x-auto px-4 sm:px-0 -mx-0">
            <table className="w-full min-w-[600px] text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="whitespace-nowrap pb-3 pr-4 font-medium">顧客ID</th>
                  <th className="whitespace-nowrap pb-3 pr-4 font-medium">氏名</th>
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
