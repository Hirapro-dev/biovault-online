"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Users } from "lucide-react";
import type { RealtimeChannel } from "@supabase/supabase-js";

interface ChatMessageItem {
  id: string;
  display_name: string;
  content: string;
  created_at: string;
  customer_id: string;
}

interface ChatRoomProps {
  scheduleId: string;
  scheduleSlug: string;
  customerId: string;
}

export function ChatRoom({ scheduleId, scheduleSlug, customerId }: ChatRoomProps) {
  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const [viewerCount, setViewerCount] = useState(0);
  const [displayName, setDisplayName] = useState("");
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const supabase = createClient();
    let channel: RealtimeChannel;
    let cancelled = false;

    async function setup() {
      // 承認済みメッセージ履歴
      const { data: history } = await supabase
        .from("chat_messages")
        .select("id, display_name, content, created_at, customer_id")
        .eq("schedule_id", scheduleId)
        .eq("status", "approved")
        .order("created_at", { ascending: true })
        .limit(100);

      if (cancelled) return;
      if (history) setMessages(history);

      channel = supabase.channel(`schedule:${scheduleSlug}:chat`, {
        config: { broadcast: { self: false } },
      });

      channel.on("broadcast", { event: "new_message" }, (payload) => {
        const newMsg = payload.payload as ChatMessageItem;
        setMessages((prev) => {
          if (prev.some((m) => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });
      });

      channel.on("broadcast", { event: "delete_message" }, (payload) => {
        const { id } = payload.payload as { id: string };
        setMessages((prev) => prev.filter((m) => m.id !== id));
      });

      channel.on("presence", { event: "sync" }, () => {
        setViewerCount(Object.keys(channel.presenceState()).length);
      });

      channel.subscribe(async (st) => {
        if (cancelled) return;
        if (st === "SUBSCRIBED") {
          await channel.track({ customer_id: customerId, joined_at: new Date().toISOString() });
          setIsConnected(true);
        }
      });
    }

    setup();
    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [scheduleId, scheduleSlug, customerId]);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }, [messages]);

  const sendMessage = useCallback(async () => {
    if (!input.trim() || isSending || !isConnected) return;
    setIsSending(true);
    const supabase = createClient();
    const { error } = await supabase.from("chat_messages").insert({
      schedule_id: scheduleId,
      customer_id: customerId,
      display_name: displayName.trim() || "匿名",
      content: input.trim(),
    });
    if (!error) setInput("");
    setIsSending(false);
  }, [input, displayName, isSending, isConnected, scheduleId, customerId]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  return (
    <div className="flex h-full flex-col">
      {/* ヘッダー */}
      <div className="flex items-center justify-between border-b border-teal-500/10 px-4 py-3">
        <h3 className="text-sm font-semibold text-white">チャット</h3>
      </div>

      {/* メッセージ */}
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-3 space-y-1.5">
        {messages.length === 0 && (
          <div className="flex h-full items-center justify-center">
            <p className="text-xs text-slate-500">チャットメッセージはここに表示されます</p>
          </div>
        )}
        {messages.map((msg) => (
          <div key={msg.id} className="group rounded px-2 py-1.5 hover:bg-teal-500/5">
            <p className="text-sm text-slate-200">{msg.content}</p>
            <p className="text-xs font-medium text-teal-300/50">{msg.display_name}</p>
          </div>
        ))}
      </div>

      {/* 入力 */}
      <div className="border-t border-teal-500/10 p-3 space-y-2">
        <Input
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="名前（匿名も可能です）"
          maxLength={30}
          disabled={!isConnected}
          className="border-teal-500/15 bg-[#0d1520] text-base text-white placeholder:text-slate-500 focus-visible:ring-1 focus-visible:ring-teal-500/30"
        />
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="メッセージを入力..."
            maxLength={500}
            disabled={!isConnected}
            className="border-teal-500/15 bg-[#0d1520] text-base text-white placeholder:text-slate-500 focus-visible:ring-1 focus-visible:ring-teal-500/30"
          />
          <Button
            onClick={sendMessage}
            disabled={!input.trim() || isSending || !isConnected}
            size="icon"
            className="shrink-0 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-500 hover:to-cyan-500 shadow-lg shadow-teal-900/20"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
