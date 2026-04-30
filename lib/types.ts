export type CategoryCode = "livret" | "av" | "pea" | "per";

export interface Category {
  id: string;
  user_id: string;
  code: CategoryCode;
  nom: string;
  taux_annuel: number;
  versement_mensuel_cible: number;
  couleur: string;
  created_at: string;
}

export type ProfilRisque = "prudent" | "equilibre" | "dynamique";

export interface UserProfile {
  user_id: string;
  age: number | null;
  tmi: number | null;                  // 0 / 11 / 30 / 41 / 45
  fonds_urgence_mois: number | null;
  horizon_annees: number | null;
  profil_risque: ProfilRisque | null;
  objectif: string | null;
  livret_a_solde: number;
  livret_a_plafond: number;
  pea_date_ouverture: string | null;
  notes: string | null;
  updated_at: string;
}

export interface AllocationCible {
  livret: number;
  av: number;
  pea: number;
  per: number;
}

export interface Reco {
  level: "info" | "warning" | "success";
  title: string;
  detail: string;
  source: "rule" | "ai";
  action?: AllocationCible;
}

export interface MoisEpargne {
  id: string;
  user_id: string;
  mois_date: string; // YYYY-MM-DD
  livret_vers: number;
  av_vers: number;
  pea_vers: number;
  per_vers: number;
  livret_solde: number;
  av_solde: number;
  pea_solde: number;
  per_solde: number;
  livret_interets: number;
  av_interets: number;
  pea_interets: number;
  per_interets: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}
