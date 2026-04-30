# Liberty Épargne

Suivi d'épargne — **Objectif 10 000 € en 12 mois** (juin 2026 → mai 2027).

Stack : Next.js 15 (App Router) · Supabase (Auth + Postgres + Realtime + RLS) · Recharts · Tailwind · TypeScript.

## Fonctionnalités

- Dashboard temps réel : graphique évolution vs objectif, cartes par catégorie (Livret 1.5%, AV 3%, PEA 6%, PER 5%), progression %, projection fin de période.
- Saisie mensuelle : versements, soldes réels, intérêts, notes. Bouton **Simuler versement** pré-remplit selon les cibles + intérêts composés.
- Alertes < 800 € / mois.
- Export CSV (compatible Excel).
- **Conseil IA (`/conseil`)** : moteur d'optimisation. Règles métier (PER si TMI ≥ 30%, plafond Livret A, ancienneté PEA, fonds urgence) + analyse Claude (`claude-sonnet-4-6` avec prompt caching) qui propose une nouvelle répartition mensuelle. Bouton **Appliquer** met à jour les cibles d'un clic.
- Auth Supabase email/password + Google OAuth.
- RLS : chaque utilisateur ne voit que ses propres données.
- Thème clair/sombre, mobile-first, en français.

## Setup

### 1. Supabase
1. Crée un projet sur [supabase.com](https://supabase.com).
2. Dans le **SQL Editor**, exécute `supabase/schema.sql` puis `supabase/migrations/001_user_profile.sql` (pour le Conseil IA).
3. **Authentication → Providers** : active **Email** (avec confirmation si tu veux) et **Google** (renseigne `Client ID` + `Secret`).
4. **Authentication → URL Configuration** : ajoute ces redirect URLs :
   - `http://localhost:3000/auth/callback`
   - `https://<ton-domaine-vercel>.vercel.app/auth/callback`

### 2. Variables d'environnement
Copie `.env.example` vers `.env.local` puis remplis :
```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxxxx
ANTHROPIC_API_KEY=sk-ant-xxxxx
```
(Supabase → Project Settings → API · Anthropic → console.anthropic.com/settings/keys.)
La clé Anthropic n'est utilisée que côté serveur (jamais exposée au navigateur).

### 3. Local
```bash
npm install
npm run dev
```
Ouvre [http://localhost:3000](http://localhost:3000), crée un compte → les **12 mois (juin 2026 → mai 2027)** et les **4 catégories par défaut** sont seedées automatiquement par le trigger `on_auth_user_created`.

### 4. Déploiement Vercel
```bash
# repo GitHub
git init && git add . && git commit -m "init"
gh repo create kurusokey/liberty-epargne --public --source=. --push
```
Puis sur [vercel.com](https://vercel.com) → **Import Project** → ajoute les 2 env vars (`NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY`) → Deploy.

### 5. Sous-domaine `epargne.sampapaya.com`
1. **Vercel** → Project Liberty Épargne → Settings → Domains → ajoute `epargne.sampapaya.com`.
2. **OVH** (DNS de sampapaya.com) → Zone DNS → ajoute :
   ```
   Type   Sous-domaine   Cible
   A      epargne        76.76.21.21
   ```
3. Attends la propagation (1-30 min) puis Vercel valide automatiquement le HTTPS.
4. **Supabase** → Authentication → URL Configuration → ajoute `https://epargne.sampapaya.com/auth/callback` aux redirect URLs (et même chose côté Google OAuth Console si configuré séparément).
5. Le hub `sampapaya.com` pointe déjà vers ce sous-domaine — la card est déjà ajoutée dans la catégorie *Finance & Trading*.

## Structure
```
app/
  page.tsx                 # Dashboard
  login/page.tsx           # Connexion / Inscription / Google
  suivi/[mois]/page.tsx    # Saisie mensuelle
  settings/page.tsx        # Édition catégories + export
  api/export/route.ts      # CSV export
  auth/callback/route.ts   # OAuth callback
components/
  Dashboard.tsx
  ProjectionChart.tsx      # Recharts
  SavingsCard.tsx
  CategoryBreakdown.tsx
  MonthlyForm.tsx
  SettingsForm.tsx
  Header.tsx, ThemeToggle.tsx
lib/
  supabase/{client,server,middleware}.ts
  calculations.ts          # intérêts composés + projections
  types.ts, constants.ts
supabase/
  schema.sql               # tables + RLS + trigger seed 12 mois
middleware.ts              # garde routes auth
```

## Sécurité
- RLS activée sur `categories` et `mois_epargne` — `auth.uid() = user_id`.
- `auth.users` privé (Supabase) — pas de table `users` publique exposée.
- Pas de paiements, juste tracking.

## Personnaliser
- Modifie taux / versement cible dans **Paramètres** (UI).
- Pour décaler la période : édite `MOIS_DEBUT` dans `lib/constants.ts` + le trigger SQL `init_user_data`.
