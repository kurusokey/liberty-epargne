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
