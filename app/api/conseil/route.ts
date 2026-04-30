import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { anthropic, CLAUDE_MODEL, SYSTEM_PROMPT_CONSEIL } from "@/lib/anthropic";
import { buildClaudeUserPayload, runRules, type AdvisorContext } from "@/lib/advisor";
import type { Category, MoisEpargne, UserProfile } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

interface ClaudeAnalysis {
  analyse: string;
  allocation_recommandee: { livret: number; av: number; pea: number; per: number };
  raison_par_enveloppe: { livret: string; av: string; pea: string; per: string };
  alertes: string[];
  gain_estime_vs_actuel_eur_an: number;
}

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY manquante côté serveur." },
      { status: 503 },
    );
  }

  const [{ data: profile }, { data: cats }, { data: mois }] = await Promise.all([
    supabase.from("user_profile").select("*").eq("user_id", user.id).maybeSingle(),
    supabase.from("categories").select("*"),
    supabase.from("mois_epargne").select("*").order("mois_date"),
  ]);

  if (!profile) {
    return NextResponse.json(
      { error: "Profil introuvable. Renseigne-le d'abord." },
      { status: 400 },
    );
  }

  const ctx: AdvisorContext = {
    profile: profile as UserProfile,
    categories: (cats ?? []) as Category[],
    mois: (mois ?? []) as MoisEpargne[],
  };
  const ruleResult = runRules(ctx);
  const userPayload = buildClaudeUserPayload(ctx, ruleResult);

  let claude: ClaudeAnalysis | null = null;
  let claudeError: string | null = null;
  let cacheStats: { creation: number; read: number } | null = null;

  try {
    const msg = await anthropic.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 1024,
      system: [
        {
          type: "text",
          text: SYSTEM_PROMPT_CONSEIL,
          // Cast: cache_control fait partie du payload mais n'est pas typé
          // dans toutes les versions SDK. Voir https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching
          cache_control: { type: "ephemeral" },
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ] as any,
      messages: [
        {
          role: "user",
          content: `Voici ma situation actuelle au format JSON. Analyse et propose la meilleure allocation mensuelle pour maximiser mon épargne nette :\n\n${JSON.stringify(userPayload, null, 2)}`,
        },
      ],
    });

    const text = msg.content
      .filter((b) => b.type === "text")
      .map((b) => (b.type === "text" ? b.text : ""))
      .join("");

    // Extrait le JSON même si Claude ajoute du texte autour
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      claude = JSON.parse(jsonMatch[0]);
    } else {
      claudeError = "Réponse Claude non-JSON.";
    }

    const usage = msg.usage as unknown as {
      cache_creation_input_tokens?: number;
      cache_read_input_tokens?: number;
    };
    cacheStats = {
      creation: usage.cache_creation_input_tokens ?? 0,
      read: usage.cache_read_input_tokens ?? 0,
    };
  } catch (e) {
    claudeError = e instanceof Error ? e.message : "Erreur Claude inconnue.";
  }

  return NextResponse.json({
    rules: ruleResult,
    claude,
    claudeError,
    cacheStats,
  });
}
