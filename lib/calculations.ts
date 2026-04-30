import type { Category, MoisEpargne } from "./types";
import { CATEGORIES_ORDER, NB_MOIS, MOIS_DEBUT } from "./constants";

type Versements = Pick<MoisEpargne, "livret_vers" | "av_vers" | "pea_vers" | "per_vers">;
type Soldes = Pick<MoisEpargne, "livret_solde" | "av_solde" | "pea_solde" | "per_solde">;
type Interets = Pick<MoisEpargne, "livret_interets" | "av_interets" | "pea_interets" | "per_interets">;

export function totalVersements(m: Versements): number {
  return m.livret_vers + m.av_vers + m.pea_vers + m.per_vers;
}

export function totalSoldes(m: Soldes): number {
  return m.livret_solde + m.av_solde + m.pea_solde + m.per_solde;
}

export function totalInterets(m: Interets): number {
  return m.livret_interets + m.av_interets + m.pea_interets + m.per_interets;
}

/**
 * Intérêts composés mensuels.
 * Pour chaque mois : nouveau_solde = (solde_précédent + versement) * (1 + taux/12)
 * Retourne la projection sur NB_MOIS mois à partir de MOIS_DEBUT.
 */
export interface ProjectionPoint {
  mois_date: string;
  livret_solde: number;
  av_solde: number;
  pea_solde: number;
  per_solde: number;
  total: number;
  total_verse: number;
  total_interets: number;
}

export function projectSavings(categories: Category[]): ProjectionPoint[] {
  const byCode = Object.fromEntries(categories.map((c) => [c.code, c]));
  const start = new Date(MOIS_DEBUT);
  const out: ProjectionPoint[] = [];
  const soldes: Record<string, number> = { livret: 0, av: 0, pea: 0, per: 0 };
  let totalVerse = 0;

  for (let i = 0; i < NB_MOIS; i++) {
    const d = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + i, 1));
    const moisStr = d.toISOString().slice(0, 10);
    let totalInteretsCumul = 0;
    let totalCum = 0;

    for (const code of CATEGORIES_ORDER) {
      const c = byCode[code];
      if (!c) continue;
      const versement = Number(c.versement_mensuel_cible) || 0;
      const tauxMensuel = (Number(c.taux_annuel) || 0) / 100 / 12;
      const nouveauBrut = soldes[code] + versement;
      const apresInterets = nouveauBrut * (1 + tauxMensuel);
      soldes[code] = apresInterets;
      totalVerse += versement;
      totalCum += apresInterets;
    }

    totalInteretsCumul = totalCum - totalVerse;

    out.push({
      mois_date: moisStr,
      livret_solde: round2(soldes.livret),
      av_solde: round2(soldes.av),
      pea_solde: round2(soldes.pea),
      per_solde: round2(soldes.per),
      total: round2(totalCum),
      total_verse: round2(totalVerse),
      total_interets: round2(totalInteretsCumul),
    });
  }

  return out;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Combine projections + données réelles : pour chaque mois où l'utilisateur
 * a saisi un solde, on prend le réel ; sinon, on prend la projection.
 */
export interface CombinedPoint extends ProjectionPoint {
  reel: boolean;
}

export function combineWithActuals(
  projection: ProjectionPoint[],
  mois: MoisEpargne[],
): CombinedPoint[] {
  const byDate = Object.fromEntries(mois.map((m) => [m.mois_date, m]));
  return projection.map((p) => {
    const m = byDate[p.mois_date];
    if (!m) return { ...p, reel: false };
    const totalReel = totalSoldes(m);
    if (totalReel <= 0) return { ...p, reel: false };
    return {
      ...p,
      livret_solde: m.livret_solde,
      av_solde: m.av_solde,
      pea_solde: m.pea_solde,
      per_solde: m.per_solde,
      total: round2(totalReel),
      reel: true,
    };
  });
}
