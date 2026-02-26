import { createServiceRoleClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { Schedule } from "@/types";
import { WatchPage } from "./watch-page";

interface PageProps {
  params: { slug: string };
  searchParams: { mode?: string };
}

export default async function WatchSlugPage({ params, searchParams }: PageProps) {
  const supabase = createServiceRoleClient();

  // スケジュールをslugで取得
  const { data: schedule } = await supabase
    .from("schedules")
    .select("*")
    .eq("slug", decodeURIComponent(params.slug))
    .single();

  if (!schedule) {
    redirect("/login");
  }

  const isTestMode = searchParams.mode === "test";

  return <WatchPage schedule={schedule as Schedule} isTestMode={isTestMode} />;
}
