import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SettingsForm } from "@/components/SettingsForm";
import type { Category } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data } = await supabase.from("categories").select("*").order("code");

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Paramètres</h1>
        <p className="text-sm text-slate-500">Compte : {user.email}</p>
      </div>
      <SettingsForm initial={(data ?? []) as Category[]} />
    </div>
  );
}
