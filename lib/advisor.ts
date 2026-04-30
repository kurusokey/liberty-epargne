import type { AllocationCible, Category, MoisEpargne, Reco, UserProfile } from "./types";
import { OBJECTIF_MENSUEL } from "./constants";
import { totalSoldes, totalVersements } from "./calculations";

const PLAFOND_LIVRET_A = 22_950;
const PLAFOND_PEA = 150_000;

export interface AdvisorContext {
  profile: UserProfile;
  categories: Category[];
  mois: MoisEpargne[];
  salaireMensuel?: number;
}

export interface AdvisorResult {
  recos: Reco[];
  economie_impot_per_annuelle: number;     // si TMI renseigné
  duree_avant_plafond_livret_mois: number | null;
  pea_anciennete_annees: number | null;
  allocation_actuelle: AllocationCible;
  allocation_suggeree: AllocationCible | null;
}

export function runRules(ctx: AdvisorContext): AdvisorResult {
  const { profile, categories, mois } = ctx;
  const recos: Reco[] = [];

  // === Allocation actuelle (versement_mensuel_cible) ===
  const byCode = Object.fromEntries(categories.map((c) => [c.code, c]));
  const allocActuelle: AllocationCible = {
    livret: byCode.livret?.versement_mensuel_cible ?? 0,
    av: byCode.av?.versement_mensuel_cible ?? 0,
    pea: byCode.pea?.versement_mensuel_cible ?? 0,
    per: byCode.per?.versement_mensuel_cible ?? 0,
  };
  const totalAlloc =
    allocActuelle.livret + allocActuelle.av + allocActuelle.pea + allocActuelle.per;

  // === Économie d'impôt PER annuelle ===
  // PER : versement déductible du revenu imposable, économie = versement_annuel × TMI
  const perAnnuel = allocActuelle.per * 12;
  const economieImpotPER =
    profile.tmi != null ? Math.round(perAnnuel * (profile.tmi / 100)) : 0;

  // === Plafond Livret A ===
  let dureeAvantPlafond: number | null = null;
  const plafond = profile.livret_a_plafond ?? PLAFOND_LIVRET_A;
  const livretSoldeActuel = profile.livret_a_solde ?? 0;
  if (allocActuelle.livret > 0) {
    const restant = plafond - livretSoldeActuel;
    dureeAvantPlafond = restant > 0 ? Math.floor(restant / allocActuelle.livret) : 0;
  }

  // === Ancienneté PEA ===
  let peaAnciennete: number | null = null;
  if (profile.pea_date_ouverture) {
    const open = new Date(profile.pea_date_ouverture);
    const now = new Date();
    peaAnciennete = (now.getTime() - open.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
  }

  // ============================================================
  // RÈGLES
  // ============================================================
  let allocSuggeree: AllocationCible | null = null;

  // R1 — Fonds d'urgence insuffisant
  if (profile.fonds_urgence_mois != null && profile.fonds_urgence_mois < 3) {
    recos.push({
      level: "warning",
      source: "rule",
      title: "Constitue d'abord ton fonds d'urgence",
      detail: `Tu as ${profile.fonds_urgence_mois} mois de coussin, en dessous des 3 mois recommandés. Privilégie 100% Livret A jusqu'à atteindre 3 mois de salaire avant d'optimiser le rendement.`,
      action: { livret: OBJECTIF_MENSUEL, av: 0, pea: 0, per: 0 },
    });
    allocSuggeree = { livret: OBJECTIF_MENSUEL, av: 0, pea: 0, per: 0 };
  }

  // R2 — Plafond Livret A bientôt atteint
  if (
    dureeAvantPlafond !== null &&
    dureeAvantPlafond <= 3 &&
    allocActuelle.livret > 0
  ) {
    recos.push({
      level: "warning",
      source: "rule",
      title: `Plafond Livret A atteint dans ${dureeAvantPlafond} mois`,
      detail: `Tu approches du plafond de ${plafond.toLocaleString("fr-FR")} €. Bascule l'excédent vers Assurance Vie (liquide, fiscalité avantageuse après 8 ans).`,
    });
  }

  // R3 — TMI ≥ 30% : prioriser PER pour défiscalisation
  if (profile.tmi != null && profile.tmi >= 30 && allocActuelle.per < 300) {
    const economieSi300 = Math.round(300 * 12 * (profile.tmi / 100));
    recos.push({
      level: "success",
      source: "rule",
      title: "Maxime ta défiscalisation PER",
      detail: `Avec une TMI ${profile.tmi}%, chaque euro versé en PER te fait économiser ${profile.tmi} centimes d'impôt. À 300 €/mois en PER tu économiserais ${economieSi300} € d'impôt sur l'année — soit un rendement effectif net immédiat de +${profile.tmi}%.`,
    });
  }

  // R4 — PEA > 5 ans : prioriser pour le long terme
  if (peaAnciennete !== null && peaAnciennete >= 5 && allocActuelle.pea < 350) {
    recos.push({
      level: "info",
      source: "rule",
      title: "Profite de l'ancienneté de ton PEA",
      detail: `Ton PEA a ${peaAnciennete.toFixed(1)} ans → fiscalité optimale (17,2% PS uniquement sur les gains). Pour un horizon long, augmenter la part PEA maximise le rendement net après impôt.`,
    });
  } else if (peaAnciennete !== null && peaAnciennete < 5) {
    const ansRestants = 5 - peaAnciennete;
    recos.push({
      level: "info",
      source: "rule",
      title: `PEA : ${ansRestants.toFixed(1)} ans avant fiscalité optimale`,
      detail: `Avant 5 ans, tout retrait clôt le PEA et déclenche 30% de flat tax sur les gains. Évite les retraits anticipés.`,
    });
  }

  // R5 — Profil dynamique + horizon long mais peu de PEA
  if (
    profile.profil_risque === "dynamique" &&
    profile.horizon_annees != null &&
    profile.horizon_annees >= 8 &&
    allocActuelle.pea < 350
  ) {
    recos.push({
      level: "info",
      source: "rule",
      title: "Profil dynamique + horizon long → augmente le PEA",
      detail: `Sur un horizon de ${profile.horizon_annees} ans avec un profil dynamique, le PEA (rendement historique 6-8%) surperforme largement les fonds euros. Une réallocation PEA prioritaire maximise l'espérance de gain.`,
    });
  }

  // R6 — Profil prudent : équilibre Livret + AV
  if (profile.profil_risque === "prudent" && allocActuelle.pea > 200) {
    recos.push({
      level: "info",
      source: "rule",
      title: "Profil prudent → réduis l'exposition PEA",
      detail: `Le PEA est volatil (-30% possible sur un an). Pour un profil prudent, privilégie Livret A + AV fonds euros (capital garanti).`,
    });
  }

  // R7 — Versement total < cible
  if (totalAlloc < OBJECTIF_MENSUEL) {
    recos.push({
      level: "warning",
      source: "rule",
      title: `Versement cible total = ${totalAlloc} € (< ${OBJECTIF_MENSUEL} €)`,
      detail: `Pour atteindre l'objectif 10 000 € en 12 mois, la somme des cibles mensuelles doit être ≥ ${OBJECTIF_MENSUEL} €.`,
    });
  }

  // === Allocation suggérée auto si pas déjà fixée par R1 ===
  if (!allocSuggeree && profile.tmi != null && profile.profil_risque) {
    allocSuggeree = computeOptimalAllocation(profile);
  }

  return {
    recos,
    economie_impot_per_annuelle: economieImpotPER,
    duree_avant_plafond_livret_mois: dureeAvantPlafond,
    pea_anciennete_annees: peaAnciennete,
    allocation_actuelle: allocActuelle,
    allocation_suggeree: allocSuggeree,
  };
}

/**
 * Heuristique d'allocation optimale en fonction du profil.
 * Inspiré : (a) maxer PER si TMI haute pour défiscaliser, (b) PEA prioritaire
 * si horizon long et risque OK, (c) Livret pour la liquidité.
 */
function computeOptimalAllocation(profile: UserProfile): AllocationCible {
  const tmi = profile.tmi ?? 0;
  const horizon = profile.horizon_annees ?? 5;
  const risque = profile.profil_risque ?? "equilibre";

  // Base poids
  let livret = 1, av = 1, pea = 1, per = 1;

  // PER renforcé si TMI ≥ 30
  if (tmi >= 30) per += 1.5;
  if (tmi >= 41) per += 1;

  // PEA renforcé si horizon long + risque OK
  if (horizon >= 8 && risque !== "prudent") pea += 1.5;
  if (horizon >= 15 && risque === "dynamique") pea += 1;

  // Livret : confort si profil prudent ou horizon court
  if (risque === "prudent") livret += 1;
  if (horizon < 5) livret += 1;

  // AV : neutre, augmente si équilibre
  if (risque === "equilibre") av += 0.5;

  const total = livret + av + pea + per;
  const round50 = (n: number) => Math.round((n / total) * OBJECTIF_MENSUEL / 50) * 50;

  const r: AllocationCible = {
    livret: round50(livret),
    av: round50(av),
    pea: round50(pea),
    per: round50(per),
  };
  // Ajuste pour que ça somme exactement à OBJECTIF_MENSUEL
  const diff = OBJECTIF_MENSUEL - (r.livret + r.av + r.pea + r.per);
  // On ajoute le diff sur la catégorie au plus haut poids
  const maxCat = Math.max(r.livret, r.av, r.pea, r.per);
  if (r.pea === maxCat) r.pea += diff;
  else if (r.per === maxCat) r.per += diff;
  else if (r.av === maxCat) r.av += diff;
  else r.livret += diff;
  return r;
}

/** Construit la chaîne JSON envoyée à Claude pour l'analyse profonde. */
export function buildClaudeUserPayload(ctx: AdvisorContext, ruleResult: AdvisorResult) {
  const versementsCumul = ctx.mois.reduce((acc, m) => acc + totalVersements(m), 0);
  const soldeCumul = ctx.mois.reduce((acc, m) => Math.max(acc, totalSoldes(m)), 0);
  return {
    profil: {
      age: ctx.profile.age,
      tmi: ctx.profile.tmi,
      fonds_urgence_mois: ctx.profile.fonds_urgence_mois,
      horizon_annees: ctx.profile.horizon_annees,
      profil_risque: ctx.profile.profil_risque,
      objectif: ctx.profile.objectif,
      livret_a_solde_existant: ctx.profile.livret_a_solde,
      pea_date_ouverture: ctx.profile.pea_date_ouverture,
      pea_anciennete_annees: ruleResult.pea_anciennete_annees,
    },
    enveloppes: ctx.categories.map((c) => ({
      code: c.code,
      nom: c.nom,
      taux_annuel: c.taux_annuel,
      versement_mensuel_cible: c.versement_mensuel_cible,
    })),
    progression: {
      versements_cumules: Math.round(versementsCumul),
      solde_max_atteint: Math.round(soldeCumul),
      objectif_total: 10000,
      mois_renseignes: ctx.mois.filter((m) => totalVersements(m) > 0).length,
    },
    contraintes: {
      plafond_livret_a: PLAFOND_LIVRET_A,
      plafond_pea: PLAFOND_PEA,
      total_mensuel_souhaite: OBJECTIF_MENSUEL,
    },
    economie_impot_per_actuelle: ruleResult.economie_impot_per_annuelle,
    allocation_actuelle: ruleResult.allocation_actuelle,
    allocation_suggeree_par_regles: ruleResult.allocation_suggeree,
  };
}
