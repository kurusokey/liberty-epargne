"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Category, MoisEpargne } from "@/lib/types";
import { CATEGORIES_ORDER, CATEGORY_LABELS, OBJECTIF_MENSUEL, SEUIL_ALERTE, formatEUR, formatMois } from "@/lib/constants";

interface Props {
  mois: MoisEpargne;
  categories: Category[];
  precedent: MoisEpargne | null;
}

export function MonthlyForm({ mois, categories, precedent }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [pending, startTransition] = useTransition();
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const [form, setForm] = useState({
    livret_vers: mois.livret_vers,
    av_vers: mois.av_vers,
    pea_vers: mois.pea_vers,
    per_vers: mois.per_vers,
    livret_solde: mois.livret_solde,
    av_solde: mois.av_solde,
    pea_solde: mois.pea_solde,
    per_solde: mois.per_solde,
    livret_interets: mois.livret_interets,
    av_interets: mois.av_interets,
    pea_interets: mois.pea_interets,
    per_interets: mois.per_interets,
    notes: mois.notes ?? "",
  });

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function num(v: string): number {
    const n = parseFloat(v.replace(",", "."));
    return Number.isFinite(n) ? n : 0;
  }

  const totalVerse =
    form.livret_vers + form.av_vers + form.pea_vers + form.per_vers;
  const totalSolde =
    form.livret_solde + form.av_solde + form.pea_solde + form.per_solde;
  const sousObjectif = totalVerse > 0 && totalVerse < SEUIL_ALERTE;

  function simuler() {
    // Pré-remplit versements à la cible et calcule un solde projeté à partir du mois précédent
    const byCode = Object.fromEntries(categories.map((c) => [c.code, c]));
    const newForm = { ...form };
    for (const code of CATEGORIES_ORDER) {
      const c = byCode[code];
      if (!c) continue;
      const versement = c.versement_mensuel_cible;
      const taux = (c.taux_annuel || 0) / 100 / 12;
      const soldePrec = precedent ? (precedent[`${code}_solde` as const] as number) : 0;
      const projete = (soldePrec + versement) * (1 + taux);
      const interet = projete - soldePrec - versement;
      newForm[`${code}_vers` as const] = round2(versement);
      newForm[`${code}_solde` as const] = round2(projete);
      newForm[`${code}_interets` as const] = round2(interet);
    }
    setForm(newForm);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    startTransition(async () => {
      const { error } = await supabase
        .from("mois_epargne")
        .update({
          livret_vers: form.livret_vers,
          av_vers: form.av_vers,
          pea_vers: form.pea_vers,
          per_vers: form.per_vers,
          livret_solde: form.livret_solde,
          av_solde: form.av_solde,
          pea_solde: form.pea_solde,
          per_solde: form.per_solde,
          livret_interets: form.livret_interets,
          av_interets: form.av_interets,
          pea_interets: form.pea_interets,
          per_interets: form.per_interets,
          notes: form.notes || null,
        })
        .eq("id", mois.id);
      if (error) {
        setErr(error.message);
        return;
      }
      setSavedAt(new Date().toLocaleTimeString("fr-FR"));
      router.refresh();
    });
  }

  return (
    <form onSubmit={save} className="space-y-6">
      <header className="card p-5 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-slate-500">Mois suivi</p>
            <h1 className="text-2xl font-bold capitalize">{formatMois(mois.mois_date)}</h1>
          </div>
          <button type="button" onClick={simuler} className="btn-secondary">
            Simuler versement à la cible
          </button>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <Stat label="Versé" value={formatEUR(totalVerse)} highlight={sousObjectif ? "danger" : "ok"} />
          <Stat label="Solde fin de mois" value={formatEUR(totalSolde)} />
          <Stat label="Cible" value={formatEUR(OBJECTIF_MENSUEL)} />
          <Stat label="Écart cible" value={formatEUR(totalVerse - OBJECTIF_MENSUEL)} />
        </div>
        {sousObjectif && (
          <p className="mt-3 rounded-lg bg-amber-50 p-2 text-xs text-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
            ⚠️ Versement total inférieur au seuil ({formatEUR(SEUIL_ALERTE)}).
          </p>
        )}
      </header>

      <section className="grid gap-4 sm:grid-cols-2">
        {CATEGORIES_ORDER.map((code) => {
          const c = categories.find((x) => x.code === code);
          if (!c) return null;
          return (
            <div key={code} className="card p-5">
              <div className="mb-3 flex items-center gap-2">
                <span
                  className="inline-block h-3 w-3 rounded-full"
                  style={{ background: c.couleur }}
                />
                <h2 className="font-semibold">{CATEGORY_LABELS[code]}</h2>
                <span className="ml-auto text-xs text-slate-500">{c.taux_annuel}%</span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <Field
                  label="Versement"
                  value={form[`${code}_vers` as const]}
                  onChange={(v) => set(`${code}_vers` as const, num(v))}
                />
                <Field
                  label="Solde"
                  value={form[`${code}_solde` as const]}
                  onChange={(v) => set(`${code}_solde` as const, num(v))}
                />
                <Field
                  label="Intérêts"
                  value={form[`${code}_interets` as const]}
                  onChange={(v) => set(`${code}_interets` as const, num(v))}
                />
              </div>
            </div>
          );
        })}
      </section>

      <section className="card p-5">
        <label className="label">Notes (optionnel)</label>
        <textarea
          value={form.notes}
          onChange={(e) => set("notes", e.target.value)}
          rows={3}
          className="input resize-y"
          placeholder="Une remarque sur ce mois..."
        />
      </section>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-xs text-slate-500">
          {savedAt && `✓ Sauvegardé à ${savedAt}`}
          {err && <span className="text-red-500">Erreur : {err}</span>}
        </div>
        <button type="submit" disabled={pending} className="btn-primary">
          {pending ? "Enregistrement..." : "Enregistrer"}
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="label">{label}</label>
      <input
        type="number"
        step="0.01"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="input"
        inputMode="decimal"
      />
    </div>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: "ok" | "danger" }) {
  return (
    <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-900/60">
      <p className="text-xs text-slate-500">{label}</p>
      <p
        className={`mt-0.5 font-semibold ${
          highlight === "danger" ? "text-amber-600 dark:text-amber-400" : ""
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
