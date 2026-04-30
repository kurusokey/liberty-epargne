"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { Category, MoisEpargne } from "@/lib/types";
import {
  CATEGORIES_ORDER,
  CATEGORY_LABELS,
  OBJECTIF_TOTAL,
  SEUIL_ALERTE,
  formatEUR,
  formatMois,
} from "@/lib/constants";
import {
  combineWithActuals,
  projectSavings,
  totalSoldes,
  totalVersements,
} from "@/lib/calculations";
import { ProjectionChart, CategoryStackChart } from "./ProjectionChart";
import { SavingsCard } from "./SavingsCard";
import { CategoryBreakdown } from "./CategoryBreakdown";

interface Props {
  categories: Category[];
  mois: MoisEpargne[];
}

export function Dashboard({ categories: catInit, mois: moisInit }: Props) {
  const [categories, setCategories] = useState(catInit);
  const [mois, setMois] = useState(moisInit);

  // Realtime — refresh à chaque changement
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("dashboard-sync")
      .on("postgres_changes", { event: "*", schema: "public", table: "mois_epargne" }, async () => {
        const { data } = await supabase.from("mois_epargne").select("*").order("mois_date");
        if (data) setMois(data as MoisEpargne[]);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "categories" }, async () => {
        const { data } = await supabase.from("categories").select("*");
        if (data) setCategories(data as Category[]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const projection = useMemo(() => projectSavings(categories), [categories]);
  const combined = useMemo(() => combineWithActuals(projection, mois), [projection, mois]);

  // Dernier mois renseigné (avec un solde > 0) ou projection courante
  const dernierIndex = (() => {
    for (let i = combined.length - 1; i >= 0; i--) {
      if (combined[i].reel) return i;
    }
    return 0;
  })();
  const dernier = combined[dernierIndex];

  // Soldes par catégorie (réels si dispo, sinon projection)
  const soldes = {
    livret: dernier.livret_solde,
    av: dernier.av_solde,
    pea: dernier.pea_solde,
    per: dernier.per_solde,
  };

  const totalActuel = soldes.livret + soldes.av + soldes.pea + soldes.per;
  const projectionFin = combined[combined.length - 1].total;
  const progression = (totalActuel / OBJECTIF_TOTAL) * 100;

  // Versements/intérêts cumulés réels
  const versementsCumul = mois.reduce((acc, m) => ({
    livret: acc.livret + m.livret_vers,
    av: acc.av + m.av_vers,
    pea: acc.pea + m.pea_vers,
    per: acc.per + m.per_vers,
  }), { livret: 0, av: 0, pea: 0, per: 0 });

  const interetsCumul = mois.reduce((acc, m) => ({
    livret: acc.livret + m.livret_interets,
    av: acc.av + m.av_interets,
    pea: acc.pea + m.pea_interets,
    per: acc.per + m.per_interets,
  }), { livret: 0, av: 0, pea: 0, per: 0 });

  // Alerte : dernier mois saisi avec versement total < SEUIL_ALERTE
  const alertesMois = mois
    .filter((m) => totalVersements(m) > 0 && totalVersements(m) < SEUIL_ALERTE)
    .map((m) => ({ mois: formatMois(m.mois_date), total: totalVersements(m) }));

  const catByCode = Object.fromEntries(categories.map((c) => [c.code, c]));

  return (
    <div className="space-y-6">
      {/* Header objectif */}
      <section className="card p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">Objectif 12 mois</p>
            <h1 className="mt-1 text-3xl font-bold sm:text-4xl">
              {formatEUR(totalActuel)}{" "}
              <span className="text-lg font-medium text-slate-400">
                / {formatEUR(OBJECTIF_TOTAL)}
              </span>
            </h1>
          </div>
          <div className="text-right">
            <p className="text-sm text-slate-500">Projection fin de période</p>
            <p className="text-xl font-semibold text-emerald-500">
              {formatEUR(projectionFin)}
            </p>
          </div>
        </div>
        <div className="mt-4 h-3 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 transition-all"
            style={{ width: `${Math.min(progression, 100)}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-slate-500">
          {progression.toFixed(1)} % de l'objectif atteint
        </p>
      </section>

      {alertesMois.length > 0 && (
        <section className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-900/10 dark:text-amber-200">
          <p className="font-medium">
            ⚠️ Mois sous le seuil ({formatEUR(SEUIL_ALERTE)})
          </p>
          <ul className="mt-1 list-inside list-disc">
            {alertesMois.map((a, i) => (
              <li key={i}>
                {a.mois} — {formatEUR(a.total)}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Graphique principal */}
      <section className="card p-5 sm:p-6">
        <h2 className="mb-4 font-semibold">Évolution vs objectif</h2>
        <ProjectionChart data={combined} />
      </section>

      {/* Cartes catégories */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {CATEGORIES_ORDER.map((code) => {
          const cat = catByCode[code];
          if (!cat) return null;
          return (
            <SavingsCard
              key={code}
              cat={cat}
              soldeActuel={soldes[code]}
              versementCumul={versementsCumul[code]}
              interetsCumul={interetsCumul[code]}
            />
          );
        })}
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="card p-5 sm:p-6">
          <h2 className="mb-4 font-semibold">Répartition actuelle</h2>
          <CategoryBreakdown
            slices={CATEGORIES_ORDER.filter((c) => catByCode[c]).map((c) => ({
              label: CATEGORY_LABELS[c],
              value: soldes[c],
              color: catByCode[c].couleur,
            }))}
          />
        </div>
        <div className="card p-5 sm:p-6">
          <h2 className="mb-4 font-semibold">Trajectoire par catégorie</h2>
          <CategoryStackChart data={combined} />
        </div>
      </section>

      {/* Liste des mois — accès rapide */}
      <section className="card p-5 sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold">12 mois — Suivi</h2>
          <Link href="/api/export" className="btn-ghost text-xs">
            Exporter CSV
          </Link>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {mois.map((m) => {
            const total = totalSoldes(m);
            const verse = totalVersements(m);
            const renseigne = total > 0 || verse > 0;
            return (
              <Link
                key={m.id}
                href={`/suivi/${m.mois_date}`}
                className="group flex items-center justify-between rounded-lg border bg-white p-3 transition-colors hover:border-blue-500 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-blue-500 border-slate-200"
              >
                <div>
                  <p className="font-medium capitalize">{formatMois(m.mois_date)}</p>
                  <p className="text-xs text-slate-500">
                    {renseigne ? `${formatEUR(verse)} versés` : "Non renseigné"}
                  </p>
                </div>
                <span className="text-sm font-semibold">
                  {renseigne ? formatEUR(total) : "—"}
                </span>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
