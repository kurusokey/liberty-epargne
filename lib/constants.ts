import type { CategoryCode } from "./types";

export const OBJECTIF_TOTAL = 10_000;
export const OBJECTIF_MENSUEL = 1_000;
export const SEUIL_ALERTE = 800;
export const SALAIRE = 4_000;

export const MOIS_DEBUT = "2026-06-01";
export const MOIS_FIN = "2027-05-01";
export const NB_MOIS = 12;

export const CATEGORIES_ORDER: CategoryCode[] = ["livret", "av", "pea", "per"];

export const CATEGORY_LABELS: Record<CategoryCode, string> = {
  livret: "Livret A",
  av: "Assurance Vie",
  pea: "PEA / CTO",
  per: "PER",
};

export const FR_MONTHS = [
  "janvier", "février", "mars", "avril", "mai", "juin",
  "juillet", "août", "septembre", "octobre", "novembre", "décembre",
];

export function formatMois(dateStr: string): string {
  const d = new Date(dateStr);
  return `${FR_MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

export function formatEUR(value: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatEURPrecise(value: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 2,
  }).format(value);
}
