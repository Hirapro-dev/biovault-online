-- ============================================
-- シードデータ（開発用）
-- ============================================

-- テスト用ライブイベントを作成
INSERT INTO public.live_events (
  title,
  description,
  scheduled_start,
  scheduled_end,
  zoom_meeting_number,
  zoom_password,
  status
) VALUES (
  'テストセミナー',
  'これはテスト用のライブ配信イベントです。',
  NOW() + INTERVAL '1 hour',
  NOW() + INTERVAL '4 hours',
  '',
  '',
  'upcoming'
);

-- 注意: 管理者ユーザーは Supabase Auth でアカウントを作成後、
-- 以下のように admin_users テーブルに手動で追加してください:
--
-- INSERT INTO public.admin_users (user_id, email)
-- VALUES ('Supabase Auth で作成したユーザーのUUID', 'admin@example.com');
