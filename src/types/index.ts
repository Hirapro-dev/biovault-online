// 顧客（管理者が登録、IDを発行）
export interface Customer {
  id: string;
  customer_id: string;
  name: string;
  phone: string | null;
  email: string | null;
  memo: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// スケジュール（配信予定）
export interface Schedule {
  id: string;
  title: string;
  speaker: string | null;
  description: string | null;
  slug: string;
  scheduled_start: string;
  scheduled_end: string | null;
  auto_end_hours: number;
  actual_start: string | null;
  actual_end: string | null;
  zoom_meeting_number: string | null;
  zoom_password: string | null;
  waiting_image_url: string;
  ended_image_url: string;
  status: StreamStatus;
  created_at: string;
  updated_at: string;
}

// 視聴アクセスログ
export interface ViewerAccessLog {
  id: string;
  schedule_id: string;
  customer_id: string;
  accessed_at: string;
}

// 視聴セッション
export interface ViewerSession {
  id: string;
  schedule_id: string;
  customer_id: string;
  joined_at: string;
  left_at: string | null;
  duration_seconds: number | null;
  is_active: boolean;
}

// チャットメッセージ
export interface ChatMessage {
  id: string;
  schedule_id: string;
  customer_id: string;
  display_name: string;
  content: string;
  status: "pending" | "approved" | "rejected" | "deleted";
  created_at: string;
  approved_at: string | null;
  approved_by: string | null;
}

export type StreamStatus = "upcoming" | "live" | "ended";
