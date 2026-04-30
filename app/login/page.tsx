"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const supabase = createClient();
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    setErr(null);

    if (mode === "signin") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setErr(error.message);
      else {
        router.push("/");
        router.refresh();
      }
    } else {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${location.origin}/auth/callback` },
      });
      if (error) setErr(error.message);
      else setMsg("Compte créé ! Vérifie tes emails pour confirmer.");
    }
    setLoading(false);
  }

  async function loginGoogle() {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${location.origin}/auth/callback` },
    });
    if (error) {
      setErr(error.message);
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto mt-10 max-w-md">
      <div className="card p-6 sm:p-8">
        <div className="mb-6 flex items-center gap-3">
          <span className="inline-block h-9 w-9 rounded-xl bg-gradient-to-br from-blue-500 to-emerald-500" />
          <div>
            <h1 className="text-xl font-bold">Liberty Épargne</h1>
            <p className="text-sm text-slate-500">10 000 € en 12 mois</p>
          </div>
        </div>

        <div className="mb-4 flex rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
          <button
            onClick={() => setMode("signin")}
            className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium ${
              mode === "signin" ? "bg-white shadow dark:bg-slate-700" : "text-slate-500"
            }`}
          >
            Connexion
          </button>
          <button
            onClick={() => setMode("signup")}
            className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium ${
              mode === "signup" ? "bg-white shadow dark:bg-slate-700" : "text-slate-500"
            }`}
          >
            Inscription
          </button>
        </div>

        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="label">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
              autoComplete="email"
            />
          </div>
          <div>
            <label className="label">Mot de passe</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input"
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
            />
          </div>
          {err && <p className="text-sm text-red-500">{err}</p>}
          {msg && <p className="text-sm text-emerald-500">{msg}</p>}
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? "..." : mode === "signin" ? "Se connecter" : "Créer mon compte"}
          </button>
        </form>

        <div className="my-4 flex items-center gap-3 text-xs text-slate-400">
          <span className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
          OU
          <span className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
        </div>

        <button onClick={loginGoogle} disabled={loading} className="btn-secondary w-full">
          Continuer avec Google
        </button>
      </div>
    </div>
  );
}
