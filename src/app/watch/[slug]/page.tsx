import { createServiceRoleClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { Schedule } from "@/types";
import { WatchPage } from "./watch-page";

interface PageProps {
  params: { slug: string };
}

export default async function WatchSlugPage({ params }: PageProps) {
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

  return <WatchPage schedule={schedule as Schedule} />;
}
