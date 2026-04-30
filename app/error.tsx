"use client";

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center space-y-4">
        <div className="w-16 h-16 mx-auto rounded-full flex items-center justify-center text-2xl bg-red-50 dark:bg-red-950 text-red-500">
          !
        </div>
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
          Erreur de chargement
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
          {error.message || "Une erreur est survenue lors du chargement."}
        </p>
        <button onClick={reset}
          className="btn-primary px-6 py-2.5">
          Reessayer
        </button>
      </div>
    </div>
  );
}
