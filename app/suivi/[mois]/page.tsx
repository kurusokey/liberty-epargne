import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MonthlyForm } from "@/components/MonthlyForm";
import type { Category, MoisEpargne } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function SuiviMoisPage({
  params,
}: {
  params: Promise<{ mois: string }>;
}) {
  const { mois: moisParam } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Récupère mois courant + précédent + catégories
  const { data: moisRow } = await supabase
    .from("mois_epargne")
    .select("*")
    .eq("mois_date", moisParam)
    .maybeSingle();

  if (!moisRow) notFound();

  const dPrev = new Date(moisParam);
  dPrev.setUTCMonth(dPrev.getUTCMonth() - 1);
  const moisPrev = dPrev.toISOString().slice(0, 10);

  const [{ data: precedent }, { data: categories }] = await Promise.all([
    supabase.from("mois_epargne").select("*").eq("mois_date", moisPrev).maybeSingle(),
    supabase.from("categories").select("*"),
  ]);

  return (
    <div className="space-y-4">
      <Link href="/" className="btn-ghost text-sm">
        ← Retour au dashboard
      </Link>
      <MonthlyForm
        mois={moisRow as MoisEpargne}
        categories={(categories ?? []) as Category[]}
        precedent={(precedent ?? null) as MoisEpargne | null}
      />
    </div>
  );
}
