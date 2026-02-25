import { redirect } from "next/navigation";

// トップページはログインページへリダイレクト
export default function HomePage() {
  redirect("/login");
}
