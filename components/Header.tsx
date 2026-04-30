"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ThemeToggle } from "./ThemeToggle";

export function Header({ email }: { email: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  async function logout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const navItem = (href: string, label: string) => (
    <Link
      href={href}
      className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
        pathname === href
          ? "bg-blue-600 text-white"
          : "text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
      }`}
    >
      {label}
    </Link>
  );

  return (
    <header className="sticky top-0 z-30 border-b bg-white/80 backdrop-blur dark:bg-slate-950/80 dark:border-slate-800 border-slate-200">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-bold">
          <span className="inline-block h-7 w-7 rounded-lg bg-gradient-to-br from-blue-500 to-emerald-500" />
          <span className="hidden sm:inline">Liberty Épargne</span>
        </Link>
        <nav className="flex items-center gap-1">
          {navItem("/", "Dashboard")}
          {navItem("/settings", "Paramètres")}
        </nav>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <button onClick={logout} className="btn-ghost" title={email}>
            Déconnexion
          </button>
        </div>
      </div>
    </header>
  );
}
