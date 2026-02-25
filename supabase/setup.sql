-- ============================================
-- ライブ配信プラットフォーム DB Setup (v2)
-- Supabase SQL Editor で実行してください
-- ============================================

-- ============================================
-- 1. テーブル作成
-- ============================================

-- 管理者テーブル
CREATE TABLE public.admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 顧客テーブル（管理者が登録し、IDを発行）
CREATE TABLE public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id TEXT UNIQUE NOT NULL,           -- ログイン用ID (例: BV-XXXX-XXXX、編集可)
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  memo TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- スケジュールテーブル（配信予定。スケジュールごとにURLが変わる）
CREATE TABLE public.schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  slug TEXT UNIQUE NOT NULL,                   -- URL用スラッグ (例: seminar-2025-03-01)
  scheduled_start TIMESTAMPTZ NOT NULL,
  scheduled_end TIMESTAMPTZ,
  auto_end_hours INTEGER NOT NULL DEFAULT 3,
  actual_start TIMESTAMPTZ,
  actual_end TIMESTAMPTZ,
  zoom_meeting_number TEXT,
  zoom_password TEXT,
  waiting_image_url TEXT DEFAULT '/waiting.jpg',
  ended_image_url TEXT DEFAULT '/ended.jpg',
  status TEXT NOT NULL DEFAULT 'upcoming'
    CHECK (status IN ('upcoming', 'live', 'ended')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 視聴アクセスログ（どの顧客がどのスケジュールURLにアクセスしたか）
CREATE TABLE public.viewer_access_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID NOT NULL REFERENCES public.schedules(id) ON DELETE CASCADE,
  customer_id TEXT NOT NULL,
  accessed_at TIMESTAMPTZ DEFAULT NOW()
);

-- 視聴セッション（視聴時間解析用）
CREATE TABLE public.viewer_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID NOT NULL REFERENCES public.schedules(id) ON DELETE CASCADE,
  customer_id TEXT NOT NULL,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  left_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  is_active BOOLEAN DEFAULT TRUE
);

-- チャットメッセージ
CREATE TABLE public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID NOT NULL REFERENCES public.schedules(id) ON DELETE CASCADE,
  customer_id TEXT NOT NULL,
  display_name TEXT NOT NULL DEFAULT '匿名',
  content TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'deleted')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  approved_by UUID
);

-- ============================================
-- 2. インデックス
-- ============================================

CREATE INDEX idx_customers_customer_id ON public.customers(customer_id);
CREATE INDEX idx_schedules_slug ON public.schedules(slug);
CREATE INDEX idx_schedules_status ON public.schedules(status);
CREATE INDEX idx_access_logs_schedule ON public.viewer_access_logs(schedule_id);
CREATE INDEX idx_access_logs_customer ON public.viewer_access_logs(customer_id);
CREATE INDEX idx_sessions_schedule ON public.viewer_sessions(schedule_id);
CREATE INDEX idx_sessions_customer ON public.viewer_sessions(customer_id);
CREATE INDEX idx_sessions_active ON public.viewer_sessions(schedule_id, is_active) WHERE is_active = TRUE;
CREATE INDEX idx_chat_pending ON public.chat_messages(schedule_id, status, created_at) WHERE status = 'pending';
CREATE INDEX idx_chat_approved ON public.chat_messages(schedule_id, created_at) WHERE status = 'approved';

-- ============================================
-- 3. RLS ポリシー
-- ============================================

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.viewer_access_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.viewer_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- admin_users
CREATE POLICY "admin_select" ON public.admin_users
  FOR SELECT TO authenticated USING (user_id = auth.uid());

-- customers
CREATE POLICY "customers_anon_select" ON public.customers FOR SELECT TO anon USING (true);
CREATE POLICY "customers_auth_select" ON public.customers FOR SELECT TO authenticated USING (true);
CREATE POLICY "customers_admin_insert" ON public.customers FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()));
CREATE POLICY "customers_admin_update" ON public.customers FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()));
CREATE POLICY "customers_admin_delete" ON public.customers FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()));

-- schedules
CREATE POLICY "schedules_select" ON public.schedules FOR SELECT USING (true);
CREATE POLICY "schedules_admin_insert" ON public.schedules FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()));
CREATE POLICY "schedules_admin_update" ON public.schedules FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()));
CREATE POLICY "schedules_admin_delete" ON public.schedules FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()));

-- viewer_access_logs
CREATE POLICY "logs_anon_insert" ON public.viewer_access_logs FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "logs_auth_insert" ON public.viewer_access_logs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "logs_anon_select" ON public.viewer_access_logs FOR SELECT TO anon USING (true);
CREATE POLICY "logs_auth_select" ON public.viewer_access_logs FOR SELECT TO authenticated USING (true);

-- viewer_sessions
CREATE POLICY "vs_anon_insert" ON public.viewer_sessions FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "vs_anon_update" ON public.viewer_sessions FOR UPDATE TO anon USING (true);
CREATE POLICY "vs_anon_select" ON public.viewer_sessions FOR SELECT TO anon USING (true);
CREATE POLICY "vs_auth_select" ON public.viewer_sessions FOR SELECT TO authenticated USING (true);
CREATE POLICY "vs_auth_insert" ON public.viewer_sessions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "vs_auth_update" ON public.viewer_sessions FOR UPDATE TO authenticated USING (true);

-- chat_messages
CREATE POLICY "chat_anon_insert" ON public.chat_messages FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "chat_auth_insert" ON public.chat_messages FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "chat_anon_select" ON public.chat_messages FOR SELECT TO anon USING (status = 'approved');
CREATE POLICY "chat_auth_select" ON public.chat_messages FOR SELECT TO authenticated
  USING (status = 'approved' OR EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()));
CREATE POLICY "chat_admin_update" ON public.chat_messages FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()));

-- ============================================
-- 4. Functions & Triggers
-- ============================================

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;

CREATE TRIGGER trg_customers_updated BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_schedules_updated BEFORE UPDATE ON public.schedules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- 配信ステータス変更ブロードキャスト
CREATE OR REPLACE FUNCTION public.broadcast_schedule_status()
RETURNS TRIGGER SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    PERFORM realtime.send(
      jsonb_build_object('schedule_id', NEW.id, 'status', NEW.status, 'actual_start', NEW.actual_start, 'actual_end', NEW.actual_end),
      'status_change', 'schedule:' || NEW.slug || ':status', false
    );
  END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

CREATE TRIGGER trg_schedule_status AFTER UPDATE ON public.schedules FOR EACH ROW EXECUTE FUNCTION public.broadcast_schedule_status();

-- チャット承認ブロードキャスト
CREATE OR REPLACE FUNCTION public.broadcast_chat_message()
RETURNS TRIGGER SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_slug TEXT;
BEGIN
  SELECT slug INTO v_slug FROM public.schedules WHERE id = NEW.schedule_id;
  IF NEW.status = 'approved' AND OLD.status = 'pending' THEN
    PERFORM realtime.send(
      jsonb_build_object('id', NEW.id, 'display_name', NEW.display_name, 'content', NEW.content, 'created_at', NEW.created_at, 'customer_id', NEW.customer_id),
      'new_message', 'schedule:' || v_slug || ':chat', false
    );
  END IF;
  IF NEW.status = 'deleted' AND OLD.status = 'approved' THEN
    PERFORM realtime.send(
      jsonb_build_object('id', NEW.id, 'action', 'delete'),
      'delete_message', 'schedule:' || v_slug || ':chat', false
    );
  END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

CREATE TRIGGER trg_chat_status AFTER UPDATE ON public.chat_messages FOR EACH ROW EXECUTE FUNCTION public.broadcast_chat_message();

-- ============================================
-- 5. Realtime 有効化
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.schedules;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
