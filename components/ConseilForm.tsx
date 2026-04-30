"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type {
  AllocationCible,
  Category,
  MoisEpargne,
  ProfilRisque,
  UserProfile,
} from "@/lib/types";
import { runRules, type AdvisorResult } from "@/lib/advisor";
import { CATEGORY_LABELS, OBJECTIF_MENSUEL, formatEUR } from "@/lib/constants";

interface Props {
  profileInit: UserProfile | null;
  categories: Category[];
  mois: MoisEpargne[];
}

interface ClaudeAnalysis {
  analyse: string;
  allocation_recommandee: AllocationCible;
  raison_par_enveloppe: { livret: string; av: string; pea: string; per: string };
  alertes: string[];
  gain_estime_vs_actuel_eur_an: number;
}

interface ApiResp {
  rules: AdvisorResult;
  claude: ClaudeAnalysis | null;
  claudeError: string | null;
  cacheStats: { creation: number; read: number } | null;
}

const TMI_OPTIONS = [0, 11, 30, 41, 45];

export function ConseilForm({ profileInit, categories, mois }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [savingProfile, startSavingProfile] = useTransition();
  const [applyingAlloc, startApplyingAlloc] = useTransition();
  const [askingClaude, setAskingClaude] = useState(false);
  const [apiResp, setApiResp] = useState<ApiResp | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const [profile, setProfile] = useState<UserProfile | null>(profileInit);

  // Local rules preview (sans appel API) — recalcule live au fur et à mesure de la saisie
  const localRules = useMemo(() => {
    if (!profile) return null;
    return runRules({ profile, categories, mois });
  }, [profile, categories, mois]);

  // Auto-save profil (debounce 700ms)
  useEffect(() => {
    if (!profile) return;
    const t = setTimeout(() => {
      startSavingProfile(async () => {
        await supabase
          .from("user_profile")
          .upsert({
            user_id: profile.user_id,
            age: profile.age,
            tmi: profile.tmi,
            fonds_urgence_mois: profile.fonds_urgence_mois,
            horizon_annees: profile.horizon_annees,
            profil_risque: profile.profil_risque,
            objectif: profile.objectif,
            livret_a_solde: profile.livret_a_solde,
            pea_date_ouverture: profile.pea_date_ouverture,
          });
      });
    }, 700);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    profile?.age,
    profile?.tmi,
    profile?.fonds_urgence_mois,
    profile?.horizon_annees,
    profile?.profil_risque,
    profile?.objectif,
    profile?.livret_a_solde,
    profile?.pea_date_ouverture,
  ]);

  if (!profile) {
    return (
      <div className="card p-6">
        <h1 className="text-xl font-bold">Conseil IA</h1>
        <p className="mt-2 text-sm text-slate-500">
          Migration manquante. Exécute le SQL{" "}
          <code className="rounded bg-slate-100 px-1 dark:bg-slate-800">
            supabase/migrations/001_user_profile.sql
          </code>{" "}
          dans le SQL Editor Supabase, puis recharge la page.
        </p>
      </div>
    );
  }

  function patch<K extends keyof UserProfile>(k: K, v: UserProfile[K]) {
    setProfile((p) => (p ? { ...p, [k]: v } : p));
  }

  async function askClaude() {
    setAskingClaude(true);
    setErr(null);
    try {
      const res = await fetch("/api/conseil", { method: "POST" });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? `HTTP ${res.status}`);
      }
      const data: ApiResp = await res.json();
      setApiResp(data);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setAskingClaude(false);
    }
  }

  async function applyAllocation(alloc: AllocationCible) {
    if (!confirm("Appliquer cette nouvelle répartition aux versements mensuels cibles ?")) return;
    startApplyingAlloc(async () => {
      const updates: { code: string; v: number }[] = [
        { code: "livret", v: alloc.livret },
        { code: "av", v: alloc.av },
        { code: "pea", v: alloc.pea },
        { code: "per", v: alloc.per },
      ];
      for (const u of updates) {
        await supabase
          .from("categories")
          .update({ versement_mensuel_cible: u.v })
          .eq("code", u.code);
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Conseil IA</h1>
        <p className="mt-1 text-sm text-slate-500">
          Renseigne ton profil → on calcule l'allocation optimale (règles + Claude).
          {savingProfile && <span className="ml-2 text-xs text-emerald-500">enregistré</span>}
        </p>
      </header>

      {/* PROFIL */}
      <section className="card p-5 sm:p-6">
        <h2 className="mb-4 font-semibold">Ton profil</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Âge</label>
            <input
              type="number"
              min={16}
              max={99}
              value={profile.age ?? ""}
              onChange={(e) => patch("age", e.target.value ? +e.target.value : null)}
              className="input"
            />
          </div>
          <div>
            <label className="label">Tranche marginale d'imposition (TMI)</label>
            <div className="flex gap-2">
              {TMI_OPTIONS.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => patch("tmi", t)}
                  className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium ${
                    profile.tmi === t
                      ? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300"
                      : "border-slate-200 dark:border-slate-700"
                  }`}
                >
                  {t} %
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="label">Fonds d'urgence (mois de salaire de côté)</label>
            <input
              type="number"
              min={0}
              step={0.5}
              value={profile.fonds_urgence_mois ?? ""}
              onChange={(e) =>
                patch("fonds_urgence_mois", e.target.value ? +e.target.value : null)
              }
              className="input"
              placeholder="3"
            />
          </div>
          <div>
            <label className="label">Horizon (années avant utilisation)</label>
            <input
              type="number"
              min={1}
              max={50}
              value={profile.horizon_annees ?? ""}
              onChange={(e) =>
                patch("horizon_annees", e.target.value ? +e.target.value : null)
              }
              className="input"
              placeholder="10"
            />
          </div>
          <div>
            <label className="label">Profil de risque</label>
            <div className="flex gap-2">
              {(["prudent", "equilibre", "dynamique"] as ProfilRisque[]).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => patch("profil_risque", r)}
                  className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium capitalize ${
                    profile.profil_risque === r
                      ? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300"
                      : "border-slate-200 dark:border-slate-700"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="label">Date d'ouverture du PEA</label>
            <input
              type="date"
              value={profile.pea_date_ouverture ?? ""}
              onChange={(e) => patch("pea_date_ouverture", e.target.value || null)}
              className="input"
            />
          </div>
          <div>
            <label className="label">Solde Livret A déjà existant (hors versements app)</label>
            <input
              type="number"
              min={0}
              step={100}
              value={profile.livret_a_solde}
              onChange={(e) => patch("livret_a_solde", +e.target.value || 0)}
              className="input"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Objectif (libre)</label>
            <input
              type="text"
              value={profile.objectif ?? ""}
              onChange={(e) => patch("objectif", e.target.value || null)}
              className="input"
              placeholder="Apport résidence principale d'ici 7 ans, ou complément retraite, etc."
            />
          </div>
        </div>
      </section>

      {/* INDICATEURS RAPIDES */}
      {localRules && (
        <section className="grid gap-4 sm:grid-cols-3">
          <KPI
            label="Économie d'impôt PER (an)"
            value={
              profile.tmi != null
                ? formatEUR(localRules.economie_impot_per_annuelle)
                : "—"
            }
            sub={profile.tmi != null ? `À TMI ${profile.tmi}%` : "Renseigne ta TMI"}
            tone="success"
          />
          <KPI
            label="Plafond Livret A"
            value={
              localRules.duree_avant_plafond_livret_mois != null
                ? `${localRules.duree_avant_plafond_livret_mois} mois`
                : "—"
            }
            sub="Avant saturation"
            tone={
              (localRules.duree_avant_plafond_livret_mois ?? 99) <= 6
                ? "warning"
                : "neutral"
            }
          />
          <KPI
            label="Ancienneté PEA"
            value={
              localRules.pea_anciennete_annees != null
                ? `${localRules.pea_anciennete_annees.toFixed(1)} ans`
                : "—"
            }
            sub={
              (localRules.pea_anciennete_annees ?? 0) >= 5
                ? "✓ Fiscalité optimale"
                : "Avant 5 ans"
            }
            tone={
              (localRules.pea_anciennete_annees ?? 0) >= 5 ? "success" : "neutral"
            }
          />
        </section>
      )}

      {/* RÈGLES — affichage live */}
      {localRules && localRules.recos.length > 0 && (
        <section className="card p-5 sm:p-6">
          <h2 className="mb-4 font-semibold">Règles automatiques</h2>
          <ul className="space-y-3">
            {localRules.recos.map((r, i) => (
              <RecoItem
                key={i}
                level={r.level}
                title={r.title}
                detail={r.detail}
                action={r.action}
                onApply={r.action ? () => applyAllocation(r.action!) : undefined}
                applying={applyingAlloc}
              />
            ))}
          </ul>
        </section>
      )}

      {/* ALLOCATION suggérée par règles */}
      {localRules?.allocation_suggeree && (
        <AllocationDiff
          actuelle={localRules.allocation_actuelle}
          suggeree={localRules.allocation_suggeree}
          label="Allocation suggérée par les règles"
          onApply={() => applyAllocation(localRules.allocation_suggeree!)}
          applying={applyingAlloc}
        />
      )}

      {/* CLAUDE */}
      <section className="card p-5 sm:p-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">Analyse Claude</h2>
          <button
            type="button"
            onClick={askClaude}
            disabled={askingClaude}
            className="btn-primary"
          >
            {askingClaude ? "Analyse en cours..." : "Demander à Claude"}
          </button>
        </div>

        {err && <p className="text-sm text-red-500">{err}</p>}

        {apiResp?.claudeError && (
          <p className="text-sm text-amber-600">⚠️ {apiResp.claudeError}</p>
        )}

        {apiResp?.claude && (
          <div className="space-y-4">
            <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
              {apiResp.claude.analyse}
            </p>

            <AllocationDiff
              actuelle={localRules!.allocation_actuelle}
              suggeree={apiResp.claude.allocation_recommandee}
              label="Allocation recommandée par Claude"
              onApply={() => applyAllocation(apiResp.claude!.allocation_recommandee)}
              applying={applyingAlloc}
            />

            <div className="grid gap-2 sm:grid-cols-2">
              {(["livret", "av", "pea", "per"] as const).map((k) => (
                <div
                  key={k}
                  className="rounded-lg border bg-slate-50 p-3 text-xs dark:border-slate-800 dark:bg-slate-900/60"
                >
                  <p className="font-semibold">{CATEGORY_LABELS[k]}</p>
                  <p className="mt-0.5 text-slate-600 dark:text-slate-400">
                    {apiResp.claude.raison_par_enveloppe[k]}
                  </p>
                </div>
              ))}
            </div>

            {apiResp.claude.alertes.length > 0 && (
              <ul className="space-y-1 rounded-lg bg-amber-50 p-3 text-xs text-amber-900 dark:bg-amber-900/20 dark:text-amber-200">
                {apiResp.claude.alertes.map((a, i) => (
                  <li key={i}>⚠️ {a}</li>
                ))}
              </ul>
            )}

            <p className="text-xs text-slate-500">
              Gain estimé vs allocation actuelle :{" "}
              <span className="font-semibold text-emerald-500">
                +{formatEUR(apiResp.claude.gain_estime_vs_actuel_eur_an)}
              </span>{" "}
              / an
              {apiResp.cacheStats && apiResp.cacheStats.read > 0 && (
                <span className="ml-2">
                  · cache hit {apiResp.cacheStats.read} tokens
                </span>
              )}
            </p>
          </div>
        )}

        {!apiResp && !askingClaude && (
          <p className="text-sm text-slate-500">
            Clique pour obtenir une recommandation chiffrée et personnalisée
            (Claude analyse ton profil + tes données réelles + les règles métier).
          </p>
        )}
      </section>
    </div>
  );
}

function KPI({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub: string;
  tone: "neutral" | "success" | "warning";
}) {
  const color =
    tone === "success"
      ? "text-emerald-500"
      : tone === "warning"
      ? "text-amber-500"
      : "";
  return (
    <div className="card p-4">
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${color}`}>{value}</p>
      <p className="mt-1 text-xs text-slate-500">{sub}</p>
    </div>
  );
}

function RecoItem({
  level,
  title,
  detail,
  action,
  onApply,
  applying,
}: {
  level: "info" | "warning" | "success";
  title: string;
  detail: string;
  action?: AllocationCible;
  onApply?: () => void;
  applying: boolean;
}) {
  const tone =
    level === "warning"
      ? "border-amber-300 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-900/10"
      : level === "success"
      ? "border-emerald-300 bg-emerald-50 dark:border-emerald-900/50 dark:bg-emerald-900/10"
      : "border-blue-300 bg-blue-50 dark:border-blue-900/50 dark:bg-blue-900/10";
  return (
    <li className={`rounded-lg border p-3 ${tone}`}>
      <p className="text-sm font-semibold">{title}</p>
      <p className="mt-1 text-xs leading-relaxed text-slate-700 dark:text-slate-300">
        {detail}
      </p>
      {action && onApply && (
        <button
          type="button"
          onClick={onApply}
          disabled={applying}
          className="mt-2 text-xs font-medium text-blue-600 hover:underline disabled:opacity-50 dark:text-blue-400"
        >
          → Appliquer cette répartition
        </button>
      )}
    </li>
  );
}

function AllocationDiff({
  actuelle,
  suggeree,
  label,
  onApply,
  applying,
}: {
  actuelle: AllocationCible;
  suggeree: AllocationCible;
  label: string;
  onApply: () => void;
  applying: boolean;
}) {
  const total = suggeree.livret + suggeree.av + suggeree.pea + suggeree.per;
  return (
    <section className="card p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-semibold">{label}</h3>
        <button
          type="button"
          onClick={onApply}
          disabled={applying || total !== OBJECTIF_MENSUEL}
          className="btn-primary text-xs"
          title={
            total !== OBJECTIF_MENSUEL ? `Total = ${total}€ (≠ ${OBJECTIF_MENSUEL}€)` : ""
          }
        >
          {applying ? "..." : "Appliquer"}
        </button>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-slate-500">
            <th className="pb-2">Enveloppe</th>
            <th className="pb-2 text-right">Actuelle</th>
            <th className="pb-2 text-right">Suggérée</th>
            <th className="pb-2 text-right">Δ</th>
          </tr>
        </thead>
        <tbody>
          {(["livret", "av", "pea", "per"] as const).map((k) => {
            const diff = suggeree[k] - actuelle[k];
            return (
              <tr key={k} className="border-t dark:border-slate-800">
                <td className="py-2">{CATEGORY_LABELS[k]}</td>
                <td className="py-2 text-right">{formatEUR(actuelle[k])}</td>
                <td className="py-2 text-right font-semibold">
                  {formatEUR(suggeree[k])}
                </td>
                <td
                  className={`py-2 text-right text-xs ${
                    diff > 0
                      ? "text-emerald-500"
                      : diff < 0
                      ? "text-red-500"
                      : "text-slate-400"
                  }`}
                >
                  {diff > 0 ? "+" : ""}
                  {diff}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}
