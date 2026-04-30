"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Category } from "@/lib/types";
import { CATEGORIES_ORDER, formatEUR } from "@/lib/constants";

export function SettingsForm({ initial }: { initial: Category[] }) {
  const router = useRouter();
  const supabase = createClient();
  const [pending, startTransition] = useTransition();
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [cats, setCats] = useState(initial);

  function patch(id: string, key: keyof Category, value: string | number) {
    setCats((cs) => cs.map((c) => (c.id === id ? { ...c, [key]: value } : c)));
  }

  async function save() {
    setErr(null);
    startTransition(async () => {
      for (const c of cats) {
        const { error } = await supabase
          .from("categories")
          .update({
            nom: c.nom,
            taux_annuel: Number(c.taux_annuel) || 0,
            versement_mensuel_cible: Number(c.versement_mensuel_cible) || 0,
            couleur: c.couleur,
          })
          .eq("id", c.id);
        if (error) {
          setErr(error.message);
          return;
        }
      }
      setSavedAt(new Date().toLocaleTimeString("fr-FR"));
      router.refresh();
    });
  }

  const totalCible = cats.reduce((acc, c) => acc + Number(c.versement_mensuel_cible || 0), 0);
  const sortedCats = CATEGORIES_ORDER
    .map((code) => cats.find((c) => c.code === code))
    .filter((c): c is Category => Boolean(c));

  return (
    <div className="space-y-4">
      <div className="card p-5 sm:p-6">
        <h2 className="mb-1 text-lg font-semibold">Catégories</h2>
        <p className="mb-4 text-sm text-slate-500">
          Ajuste taux et versement mensuel cible. Total cible :{" "}
          <span className="font-semibold">{formatEUR(totalCible)}</span> / mois.
        </p>

        <div className="space-y-4">
          {sortedCats.map((c) => (
            <div key={c.id} className="rounded-xl border p-4 dark:border-slate-800 border-slate-200">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-12">
                <div className="sm:col-span-1">
                  <label className="label">Couleur</label>
                  <input
                    type="color"
                    value={c.couleur}
                    onChange={(e) => patch(c.id, "couleur", e.target.value)}
                    className="h-10 w-full cursor-pointer rounded-lg border bg-white dark:border-slate-700 dark:bg-slate-900"
                  />
                </div>
                <div className="sm:col-span-5">
                  <label className="label">Nom</label>
                  <input
                    value={c.nom}
                    onChange={(e) => patch(c.id, "nom", e.target.value)}
                    className="input"
                  />
                </div>
                <div className="sm:col-span-3">
                  <label className="label">Taux annuel (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={c.taux_annuel}
                    onChange={(e) => patch(c.id, "taux_annuel", parseFloat(e.target.value) || 0)}
                    className="input"
                  />
                </div>
                <div className="sm:col-span-3">
                  <label className="label">Versement / mois</label>
                  <input
                    type="number"
                    step="10"
                    value={c.versement_mensuel_cible}
                    onChange={(e) =>
                      patch(c.id, "versement_mensuel_cible", parseFloat(e.target.value) || 0)
                    }
                    className="input"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-xs text-slate-500">
            {savedAt && `✓ Sauvegardé à ${savedAt}`}
            {err && <span className="text-red-500">Erreur : {err}</span>}
          </div>
          <button onClick={save} disabled={pending} className="btn-primary">
            {pending ? "..." : "Enregistrer"}
          </button>
        </div>
      </div>

      <div className="card p-5 sm:p-6">
        <h2 className="mb-2 text-lg font-semibold">Export</h2>
        <p className="mb-3 text-sm text-slate-500">
          Télécharge tout l'historique au format CSV (compatible Excel / Numbers).
        </p>
        <a href="/api/export" className="btn-secondary">
          Télécharger le CSV
        </a>
      </div>
    </div>
  );
}
