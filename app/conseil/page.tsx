import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ConseilForm } from "@/components/ConseilForm";
import type { Category, MoisEpargne, UserProfile } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ConseilPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, { data: categories }, { data: mois }] = await Promise.all([
    supabase.from("user_profile").select("*").eq("user_id", user.id).maybeSingle(),
    supabase.from("categories").select("*").order("code"),
    supabase.from("mois_epargne").select("*").order("mois_date"),
  ]);

  // Si la migration 001 n'a pas été exécutée, profile est null → on guide l'utilisateur.
  return (
    <ConseilForm
      profileInit={(profile ?? null) as UserProfile | null}
      categories={(categories ?? []) as Category[]}
      mois={(mois ?? []) as MoisEpargne[]}
    />
  );
}
