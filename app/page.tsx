import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Dashboard } from "@/components/Dashboard";
import type { Category, MoisEpargne } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: categories }, { data: mois }] = await Promise.all([
    supabase.from("categories").select("*").order("code"),
    supabase.from("mois_epargne").select("*").order("mois_date"),
  ]);

  return (
    <Dashboard
      categories={(categories ?? []) as Category[]}
      mois={(mois ?? []) as MoisEpargne[]}
    />
  );
}
