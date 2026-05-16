"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CATEGORY_LABELS, formatEUR } from "@/lib/constants";
import type { CategoryCode } from "@/lib/types";

type Allocation = { livret: number; av: number; pea: number; per: number };

export function ApplyPlanForm({ plan, current }: { plan: Allocation; current: Record<string, number> }) {
  const router = useRouter();
  const [values, setValues] = useState<Allocation>(plan);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  const order: CategoryCode[] = ["livret", "av", "pea", "per"];
  const total = order.reduce((s, k) => s + values[k], 0);

  function update(k: CategoryCode, v: string) {
    setValues(prev => ({ ...prev, [k]: Math.max(0, Math.floor(Number(v) || 0)) }));
  }

  async function apply() {
    setSaving(true);
    setErr(null);
    try {
      const res = await fetch("/api/appliquer-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Erreur");
      }
      setOk(true);
      setTimeout(() => router.push("/"), 1200);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
          Ces montants vont remplacer ton <strong>versement mensuel cible</strong> pour chaque catégorie.
          Tu peux ajuster avant confirmation.
        </p>

        <div className="space-y-3">
          {order.map(k => (
            <div key={k} className="flex items-center gap-3">
              <label className="w-32 text-sm font-medium">{CATEGORY_LABELS[k]}</label>
              <div className="flex-1 flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  value={values[k]}
                  onChange={e => update(k, e.target.value)}
                  className="w-32 rounded-md border border-slate-300 bg-white px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-950"
                />
                <span className="text-sm text-slate-500">€/mois</span>
                {current[k] !== undefined && current[k] !== values[k] && (
                  <span className="text-xs text-slate-400">
                    (actuel : {formatEUR(current[k])})
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-between text-sm">
          <span className="text-slate-500">Total mensuel</span>
          <strong>{formatEUR(total)}</strong>
        </div>
      </div>

      {err && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          {err}
        </div>
      )}

      {ok ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300">
          Plan appliqué. Redirection...
        </div>
      ) : (
        <div className="flex gap-2">
          <button
            onClick={apply}
            disabled={saving || total === 0}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? "Application..." : `Appliquer ce plan (${formatEUR(total)}/mois)`}
          </button>
          <button
            onClick={() => router.push("/")}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
          >
            Annuler
          </button>
        </div>
      )}
    </div>
  );
}
