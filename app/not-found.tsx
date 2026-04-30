import Link from "next/link";

export default function NotFound() {
  return (
    <div className="card mt-10 p-8 text-center">
      <h1 className="text-2xl font-bold">Mois introuvable</h1>
      <p className="mt-2 text-sm text-slate-500">
        Ce mois ne fait pas partie de la période de suivi (juin 2026 → mai 2027).
      </p>
      <Link href="/" className="btn-primary mt-4 inline-flex">
        Retour au dashboard
      </Link>
    </div>
  );
}
