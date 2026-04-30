import type { Category } from "@/lib/types";
import { formatEUR, formatEURPrecise } from "@/lib/constants";

interface Props {
  cat: Category;
  soldeActuel: number;
  versementCumul: number;
  interetsCumul: number;
}

export function SavingsCard({ cat, soldeActuel, versementCumul, interetsCumul }: Props) {
  return (
    <div className="card p-4 sm:p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            className="inline-block h-3 w-3 rounded-full"
            style={{ background: cat.couleur }}
          />
          <h3 className="font-semibold">{cat.nom}</h3>
        </div>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          {cat.taux_annuel.toFixed(1)} %
        </span>
      </div>

      <p className="text-2xl font-bold">{formatEURPrecise(soldeActuel)}</p>
      <p className="mt-1 text-xs text-slate-500">Solde actuel</p>

      <div className="mt-4 grid grid-cols-2 gap-2 border-t pt-3 text-xs dark:border-slate-800">
        <div>
          <p className="text-slate-500">Versé</p>
          <p className="font-medium">{formatEUR(versementCumul)}</p>
        </div>
        <div>
          <p className="text-slate-500">Intérêts</p>
          <p className="font-medium text-emerald-500">+ {formatEUR(interetsCumul)}</p>
        </div>
      </div>

      <div className="mt-3 text-xs text-slate-500">
        Cible : {formatEUR(cat.versement_mensuel_cible)} / mois
      </div>
    </div>
  );
}
