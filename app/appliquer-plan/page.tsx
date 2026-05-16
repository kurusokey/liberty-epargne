import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ApplyPlanForm } from "@/components/ApplyPlanForm";

export const dynamic = "force-dynamic";

type Allocation = { livret: number; av: number; pea: number; per: number };

function parsePlan(p: string | undefined): Allocation | null {
  if (!p) return null;
  try {
    const json = atob(p);
    const parsed = JSON.parse(json) as Partial<Allocation>;
    return {
      livret: Math.max(0, Math.floor(Number(parsed.livret) || 0)),
      av: Math.max(0, Math.floor(Number(parsed.av) || 0)),
      pea: Math.max(0, Math.floor(Number(parsed.pea) || 0)),
      per: Math.max(0, Math.floor(Number(parsed.per) || 0)),
    };
  } catch {
    return null;
  }
}

export default async function ApplyPlanPage({
  searchParams,
}: {
  searchParams: Promise<{ p?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent("/appliquer-plan")}`);

  const sp = await searchParams;
  const plan = parsePlan(sp.p);

  const { data: categories } = await supabase
    .from("categories")
    .select("*")
    .order("code");

  const current = (categories ?? []).reduce<Record<string, number>>((acc, c) => {
    acc[c.code] = Number(c.versement_mensuel_cible) || 0;
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Appliquer un plan d&apos;épargne</h1>
        <p className="text-sm text-slate-500">
          Plan transmis depuis Liberty Budget. Tu peux ajuster avant de confirmer.
        </p>
      </div>

      {!plan ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          Plan invalide ou manquant. Retourne sur Liberty Budget et clique à nouveau sur « Appliquer ce plan ».
        </div>
      ) : (
        <ApplyPlanForm plan={plan} current={current} />
      )}
    </div>
  );
}
