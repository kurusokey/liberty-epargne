"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { CombinedPoint } from "@/lib/calculations";
import { OBJECTIF_TOTAL, formatEUR, formatMois } from "@/lib/constants";

export function ProjectionChart({ data }: { data: CombinedPoint[] }) {
  const chartData = data.map((p, i) => ({
    mois: formatMois(p.mois_date).split(" ")[0].slice(0, 3),
    Total: p.total,
    Versé: p.total_verse,
    Objectif: ((i + 1) / data.length) * OBJECTIF_TOTAL,
  }));

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="gTotal" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.4} />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-800" />
          <XAxis dataKey="mois" tick={{ fontSize: 12 }} stroke="currentColor" />
          <YAxis
            tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
            tick={{ fontSize: 12 }}
            stroke="currentColor"
            width={40}
          />
          <Tooltip
            contentStyle={{
              background: "rgba(15,23,42,0.92)",
              border: "none",
              borderRadius: 8,
              color: "#fff",
            }}
            formatter={(v: number) => formatEUR(v)}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <ReferenceLine
            y={OBJECTIF_TOTAL}
            stroke="#10b981"
            strokeDasharray="4 4"
            label={{ value: "Objectif 10 000 €", fontSize: 11, fill: "#10b981", position: "right" }}
          />
          <Area type="monotone" dataKey="Total" stroke="#3b82f6" fill="url(#gTotal)" strokeWidth={2} />
          <Area type="monotone" dataKey="Versé" stroke="#94a3b8" fill="transparent" strokeDasharray="3 3" />
          <Area type="monotone" dataKey="Objectif" stroke="#10b981" fill="transparent" strokeWidth={1} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function CategoryStackChart({ data }: { data: CombinedPoint[] }) {
  const chartData = data.map((p) => ({
    mois: formatMois(p.mois_date).split(" ")[0].slice(0, 3),
    Livret: p.livret_solde,
    AV: p.av_solde,
    PEA: p.pea_solde,
    PER: p.per_solde,
  }));

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-800" />
          <XAxis dataKey="mois" tick={{ fontSize: 12 }} stroke="currentColor" />
          <YAxis
            tickFormatter={(v) => `${(v / 1000).toFixed(1)}k`}
            tick={{ fontSize: 12 }}
            stroke="currentColor"
            width={40}
          />
          <Tooltip
            contentStyle={{
              background: "rgba(15,23,42,0.92)",
              border: "none",
              borderRadius: 8,
              color: "#fff",
            }}
            formatter={(v: number) => formatEUR(v)}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Line type="monotone" dataKey="Livret" stroke="#10b981" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="AV" stroke="#3b82f6" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="PEA" stroke="#f59e0b" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="PER" stroke="#8b5cf6" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
