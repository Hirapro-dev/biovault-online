# ライブ配信プラットフォーム 実装プラン

## アーキテクチャ概要

```
[顧客フロー]
機密保持ページ → サンクスページ（ID発行）→ ライブ視聴ページ（ID認証）

[技術スタック]
- Next.js 14 (App Router) + TypeScript
- Supabase (DB + Auth + Realtime)
- Tailwind CSS + shadcn/ui
- Zoom Meeting SDK (@zoom/meetingsdk) Component View
- Vercel (デプロイ先)
```

---

## Phase 1: プロジェクト初期セットアップ

### 1-1. Next.js プロジェクト作成（online ディレクトリ）
- Next.js 14 + TypeScript + Tailwind CSS + ESLint
- shadcn/ui セットアップ（既存プロジェクトと統一）
- 必要パッケージ: `@supabase/ssr`, `@supabase/supabase-js`, `@zoom/meetingsdk`, `zod`, `react-hook-form`, `@hookform/resolvers`, `date-fns`, `nanoid`(ID生成用)

### 1-2. ディレクトリ構造
```
online/
├── src/
│   ├── app/
│   │   ├── layout.tsx                    # ルートレイアウト
│   │   ├── page.tsx                      # 機密保持同意 + 登録フォーム
│   │   ├── thanks/page.tsx               # サンクスページ（ID表示）
│   │   ├── live/
│   │   │   ├── page.tsx                  # ID入力 → 認証ゲート
│   │   │   └── [viewerId]/page.tsx       # ライブ視聴ページ本体
│   │   ├── admin/
│   │   │   ├── layout.tsx                # 管理者レイアウト（認証ガード）
│   │   │   ├── login/page.tsx            # 管理者ログイン
│   │   │   ├── page.tsx                  # ダッシュボード
│   │   │   ├── viewers/page.tsx          # 顧客一覧（機密保持同意者）
│   │   │   ├── broadcast/page.tsx        # 配信管理
│   │   │   └── chat/page.tsx             # チャット管理（承認/削除）
│   │   └── api/
│   │       ├── register/route.ts         # 顧客登録API
│   │       ├── verify/route.ts           # ID認証API
│   │       ├── zoom-signature/route.ts   # Zoom SDK JWT生成API
│   │       └── broadcast/route.ts        # 配信開始/終了API
│   ├── components/
│   │   ├── ui/                           # shadcn/ui コンポーネント
│   │   ├── forms/
│   │   │   └── registration-form.tsx     # 登録フォーム
│   │   ├── live/
│   │   │   ├── zoom-embed.tsx            # Zoom埋め込みコンポーネント
│   │   │   ├── stream-container.tsx      # 配信コンテナ（画像⇔Zoom切替）
│   │   │   └── viewer-counter.tsx        # 視聴者数表示
│   │   ├── chat/
│   │   │   ├── chat-room.tsx             # チャットルーム
│   │   │   └── admin-moderation.tsx      # 管理者モデレーション
│   │   └── admin/
│   │       ├── viewer-list.tsx           # 顧客一覧テーブル
│   │       ├── broadcast-control.tsx     # 配信コントロール
│   │       └── realtime-viewers.tsx      # リアルタイム視聴者一覧
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts                # ブラウザ用クライアント
│   │   │   └── server.ts                # サーバー用クライアント
│   │   ├── utils.ts
│   │   └── validations/
│   │       └── registration.ts           # Zodバリデーション
│   ├── hooks/
│   │   ├── use-toast.ts
│   │   ├── use-viewer-presence.ts        # 視聴者プレゼンス
│   │   └── use-broadcast-status.ts       # 配信状態管理
│   └── types/
│       └── index.ts
├── public/
│   ├── waiting.jpg                       # 配信前待機画像
│   └── ended.jpg                         # 配信終了後画像
└── supabase/
    └── setup.sql                         # DB定義
```

---

## Phase 2: Supabase DB設計

### 2-1. テーブル設計

```sql
-- ============================================
-- ライブ配信プラットフォーム DB Setup
-- ============================================

-- 配信イベントテーブル
CREATE TABLE live_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  scheduled_start TIMESTAMPTZ NOT NULL,          -- 配信予定開始時刻
  scheduled_end TIMESTAMPTZ,                      -- 配信予定終了時刻
  actual_start TIMESTAMPTZ,                       -- 実際の配信開始時刻
  actual_end TIMESTAMPTZ,                         -- 実際の配信終了時刻
  auto_end_hours INTEGER NOT NULL DEFAULT 3,      -- 自動終了時間（時間）
  zoom_meeting_number TEXT,                       -- ZoomミーティングID
  zoom_password TEXT,                             -- Zoomパスワード
  waiting_image_url TEXT DEFAULT '/waiting.jpg',  -- 待機画像
  ended_image_url TEXT DEFAULT '/ended.jpg',      -- 終了画像
  status TEXT NOT NULL DEFAULT 'upcoming'          -- upcoming, live, ended
    CHECK (status IN ('upcoming', 'live', 'ended')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 視聴者テーブル（機密保持同意者）
CREATE TABLE viewers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  viewer_id TEXT UNIQUE NOT NULL,                 -- 発行される視聴ID（例: BV-XXXX-XXXX）
  event_id UUID NOT NULL REFERENCES live_events(id),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  question TEXT,                                   -- 質問事項
  confidentiality_agreed BOOLEAN NOT NULL DEFAULT FALSE,
  registered_at TIMESTAMPTZ DEFAULT NOW()
);

-- 視聴ログテーブル（視聴時間解析用）
CREATE TABLE viewer_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  viewer_id TEXT NOT NULL REFERENCES viewers(viewer_id),
  event_id UUID NOT NULL REFERENCES live_events(id),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  left_at TIMESTAMPTZ,
  duration_seconds INTEGER,                        -- 離脱時に計算
  is_active BOOLEAN DEFAULT TRUE
);

-- チャットメッセージテーブル
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES live_events(id),
  session_id TEXT NOT NULL,                        -- 匿名セッションID
  display_name TEXT NOT NULL DEFAULT '匿名',
  content TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'deleted')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES auth.users(id)
);

-- 管理者テーブル
CREATE TABLE admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 2-2. RLS ポリシー
- `live_events`: 全員SELECT可、管理者のみCRUD
- `viewers`: 匿名INSERT可（登録用）、管理者のみSELECT/UPDATE
- `viewer_sessions`: 匿名INSERT/UPDATE可、管理者のみSELECT
- `chat_messages`: 匿名INSERT可、approved状態のみ全員SELECT、管理者はALL

### 2-3. Realtime機能
- **Broadcast**: 配信ステータス変更（upcoming→live→ended）を全視聴者に通知
- **Broadcast**: 承認済みチャットメッセージの配信（DBトリガー経由）
- **Broadcast**: メッセージ削除通知
- **Presence**: リアルタイム視聴者数・一覧追跡

---

## Phase 3: 顧客登録フロー

### 3-1. 機密保持ページ（`/` トップページ）
- **フォーム項目**: 氏名、電話番号、質問事項（任意）、機密保持同意チェックボックス
- 機密保持契約の全文を表示し、チェックボックスで同意
- Zodバリデーション + react-hook-form
- 送信時に `/api/register` へPOST

### 3-2. 登録API（`/api/register`）
- バリデーション
- 視聴ID生成: `BV-${nanoid(4)}-${nanoid(4)}` 形式（8文字、衝突チェック付き）
- `viewers` テーブルにINSERT
- 成功時にviewer_idをレスポンス

### 3-3. サンクスページ（`/thanks`）
- 登録完了メッセージ
- 発行された視聴ID（大きく表示）
- 視聴ページへのリンク + ID入力方法の説明
- 「IDをコピー」ボタン

---

## Phase 4: ライブ視聴ページ

### 4-1. ID認証ゲート（`/live`）
- 視聴ID入力フォーム
- `/api/verify` でID存在チェック
- 有効なIDの場合 → `/live/[viewerId]` にリダイレクト
- 無効なIDの場合 → エラー表示

### 4-2. 視聴ページ本体（`/live/[viewerId]`）

#### 配信コンテナ（stream-container.tsx）
配信状態に応じて表示を自動切替:

```
状態: upcoming（配信前）
  → 待機画像を表示 + カウントダウン表示
  → Supabase Realtimeで配信開始を監視
  → 配信開始ブロードキャスト受信 → 自動でZoom表示に切替

状態: live（配信中）
  → Zoom Meeting SDK Component View で配信映像を表示
  → 視聴時間計測開始（viewer_sessions にINSERT）
  → ページ離脱時に left_at / duration を UPDATE（beforeunload + visibilitychange）

状態: ended（配信終了）
  → 終了画像を表示
  → Supabase Realtimeで終了ブロードキャストを受信 → 自動切替
  → ※配信開始から auto_end_hours(3時間) 後に自動でサーバー側も ended に
```

#### Zoom埋め込み（zoom-embed.tsx）
- `@zoom/meetingsdk` の Component View モードを使用
- Next.jsでSSR回避: `dynamic(() => import(...), { ssr: false })`
- 管理者がZOOM側で「カスタムライブストリーミング」を開始 →
  実際にはZoom Meeting SDK で webinar/meeting に attendee として join させる方式
- `/api/zoom-signature` で SDK JWT（role=0: 視聴者）を生成

#### 自動リフレッシュロジック
```typescript
// ポーリングではなくSupabase Realtimeで実装
// 配信ステータスのブロードキャストを受信して状態切替
channel.on('broadcast', { event: 'status_change' }, (payload) => {
  if (payload.payload.status === 'live') {
    setStreamStatus('live')  // → Zoom表示
  } else if (payload.payload.status === 'ended') {
    setStreamStatus('ended') // → 終了画像
  }
})

// バックアップ: 3時間後のフォールバック自動終了（クライアント側タイマー）
useEffect(() => {
  if (event.actual_start && streamStatus === 'live') {
    const endTime = new Date(event.actual_start).getTime() + event.auto_end_hours * 3600000
    const timeout = endTime - Date.now()
    if (timeout > 0) {
      const timer = setTimeout(() => setStreamStatus('ended'), timeout)
      return () => clearTimeout(timer)
    }
  }
}, [event, streamStatus])
```

### 4-3. 視聴時間解析
- ページ表示時に `viewer_sessions` にレコードINSERT（joined_at記録）
- `beforeunload` + `visibilitychange` イベントで `left_at` を UPDATE
- `navigator.sendBeacon` を使用して確実にデータ送信
- 管理画面で集計表示（合計視聴時間、平均視聴時間、離脱率）

---

## Phase 5: チャット機能

### 5-1. チャットルーム（chat-room.tsx）
- 匿名チャット（Supabase Anonymous Sign-In不要 → sessionIdのみで管理）
- メッセージ送信: `chat_messages` テーブルにINSERT（status='pending'）
- メッセージ受信: Supabase Realtime Broadcast でDB triggerから配信
- 「承認待ち」のインジケーター表示
- メッセージ上限: 500文字

### 5-2. DBトリガー（承認時自動ブロードキャスト）
```sql
-- メッセージ承認時にブロードキャスト
CREATE OR REPLACE FUNCTION broadcast_approved_message()
RETURNS trigger AS $$
BEGIN
  IF NEW.status = 'approved' AND OLD.status = 'pending' THEN
    PERFORM realtime.send(
      jsonb_build_object(
        'id', NEW.id, 'display_name', NEW.display_name,
        'content', NEW.content, 'created_at', NEW.created_at
      ),
      'new_message',
      'live:' || NEW.event_id || ':chat',
      false
    );
  END IF;
  IF NEW.status = 'deleted' AND OLD.status = 'approved' THEN
    PERFORM realtime.send(
      jsonb_build_object('id', NEW.id, 'action', 'delete'),
      'delete_message',
      'live:' || NEW.event_id || ':chat',
      false
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 5-3. 管理者モデレーション
- Postgres Changesで新規メッセージをリアルタイム受信
- 承認/拒否/削除ボタン
- 承認 → DBトリガー → 全視聴者にブロードキャスト

---

## Phase 6: 管理画面

### 6-1. 管理者認証
- Supabase Auth（メール+パスワード）
- middleware.ts で `/admin/*` ルートを保護
- 初回は手動で admin_users にレコード追加

### 6-2. ダッシュボード（`/admin`）
- 配信イベント一覧（upcoming / live / ended）
- リアルタイム視聴者数
- 新規イベント作成フォーム

### 6-3. 顧客一覧（`/admin/viewers`）
| 視聴ID | 氏名 | 電話番号 | 質問事項 | 機密保持同意 | 登録時間 |
|--------|------|----------|----------|------------|----------|
- フィルター、検索、CSV出力機能
- 視聴時間の集計も表示

### 6-4. 配信管理（`/admin/broadcast`）
- **配信開始ボタン**: クリックで
  1. `live_events.status` を `'live'` に更新
  2. `live_events.actual_start` を NOW() に設定
  3. Supabase Broadcast で全視聴者に `status_change: live` を送信
  4. → 視聴者のページが自動でZoom表示に切替

- **配信終了ボタン**: クリックで
  1. `live_events.status` を `'ended'` に更新
  2. `live_events.actual_end` を NOW() に設定
  3. Supabase Broadcast で全視聴者に `status_change: ended` を送信
  4. → 視聴者のページが自動で終了画像に切替

- **自動終了**: 配信開始から3時間後にcronまたはクライアントタイマーで自動終了

### 6-5. リアルタイム視聴者一覧（`/admin/broadcast`内）
- Supabase Presence で接続中の視聴者を一覧表示
- 視聴者ID、接続時間を表示
- 視聴者数のリアルタイムカウンター

### 6-6. チャット管理（`/admin/chat`）
- 承認キュー（pending メッセージ一覧）
- 承認済みメッセージ一覧（削除可能）
- 一括承認機能

---

## Phase 7: ZOOM連携の簡易化

### ZOOM側の設定（システム管理者が事前に行う）
1. Zoom Marketplace で Meeting SDK アプリを作成
2. SDK Key / SDK Secret を取得
3. 環境変数に設定

### 配信時のオペレーション（管理者が行う手順）
1. Zoomアプリで通常通りウェビナー/ミーティングを作成
2. 管理画面でミーティングID + パスワードを入力
3. 管理画面の「配信開始」ボタンをクリック
4. → 視聴者側にZoom画面が自動表示される
5. Zoom側でそのまま配信するだけ

※ Zoom Web SDK は参加者としてミーティング/ウェビナーに接続する仕組み。
  ホストはZoomアプリで通常通り操作するだけでOK。

---

## 環境変数（.env.local）

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Zoom Meeting SDK
ZOOM_SDK_KEY=
ZOOM_SDK_SECRET=

# アプリ設定
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## 実装順序

1. **Phase 1**: プロジェクト初期セットアップ + shadcn/ui
2. **Phase 2**: Supabase DB構築（テーブル + RLS + トリガー）
3. **Phase 3**: 顧客登録フロー（フォーム → サンクスページ）
4. **Phase 4**: ライブ視聴ページ（ID認証 + 状態切替 + Zoom埋め込み）
5. **Phase 5**: チャット機能（匿名チャット + モデレーション）
6. **Phase 6**: 管理画面（顧客一覧 + 配信管理 + 視聴者追跡）
7. **Phase 7**: 視聴時間解析 + 仕上げ
