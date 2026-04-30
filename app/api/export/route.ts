import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { totalSoldes, totalVersements, totalInterets } from "@/lib/calculations";
import type { MoisEpargne } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data } = await supabase
    .from("mois_epargne")
    .select("*")
    .order("mois_date");

  const rows = (data ?? []) as MoisEpargne[];

  const headers = [
    "mois",
    "livret_versement", "livret_solde", "livret_interets",
    "av_versement",     "av_solde",     "av_interets",
    "pea_versement",    "pea_solde",    "pea_interets",
    "per_versement",    "per_solde",    "per_interets",
    "total_versement", "total_solde", "total_interets",
    "notes",
  ];

  const escape = (v: unknown) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };

  const lines = [headers.join(";")];
  for (const m of rows) {
    lines.push([
      m.mois_date,
      m.livret_vers, m.livret_solde, m.livret_interets,
      m.av_vers,     m.av_solde,     m.av_interets,
      m.pea_vers,    m.pea_solde,    m.pea_interets,
      m.per_vers,    m.per_solde,    m.per_interets,
      totalVersements(m), totalSoldes(m), totalInterets(m),
      m.notes ?? "",
    ].map(escape).join(";"));
  }

  const csv = "﻿" + lines.join("\n"); // BOM pour Excel
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="liberty-epargne-${new Date().toISOString().slice(0,10)}.csv"`,
    },
  });
}
