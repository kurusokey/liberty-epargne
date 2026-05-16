import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const CODES = ["livret", "av", "pea", "per"] as const;
type Code = (typeof CODES)[number];
type Allocation = Record<Code, number>;

const DEFAULT_NAMES: Record<Code, string> = {
  livret: "Livret A",
  av: "Assurance Vie",
  pea: "PEA / CTO",
  per: "PER",
};

const DEFAULT_COLORS: Record<Code, string> = {
  livret: "#3b82f6",
  av: "#10b981",
  pea: "#f59e0b",
  per: "#a855f7",
};

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json()) as Partial<Allocation>;
  const alloc: Allocation = {
    livret: Math.max(0, Math.floor(Number(body.livret) || 0)),
    av: Math.max(0, Math.floor(Number(body.av) || 0)),
    pea: Math.max(0, Math.floor(Number(body.pea) || 0)),
    per: Math.max(0, Math.floor(Number(body.per) || 0)),
  };

  // Recupere les categories existantes pour ne pas ecraser nom/couleur/taux
  const { data: existing } = await supabase
    .from("categories")
    .select("code")
    .eq("user_id", user.id);
  const existingCodes = new Set((existing ?? []).map(c => c.code));

  // UPDATE pour les categories existantes (seulement la cible)
  for (const code of CODES) {
    if (existingCodes.has(code)) {
      const { error } = await supabase
        .from("categories")
        .update({ versement_mensuel_cible: alloc[code] })
        .eq("user_id", user.id)
        .eq("code", code);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  // INSERT pour les categories absentes (avec defauts)
  const toInsert = CODES.filter(c => !existingCodes.has(c)).map(code => ({
    user_id: user.id,
    code,
    nom: DEFAULT_NAMES[code],
    versement_mensuel_cible: alloc[code],
    couleur: DEFAULT_COLORS[code],
  }));
  if (toInsert.length > 0) {
    const { error } = await supabase.from("categories").insert(toInsert);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, applied: alloc });
}
