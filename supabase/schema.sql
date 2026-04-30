-- Liberty Epargne — Schéma Supabase
-- À exécuter dans le SQL Editor Supabase une fois

create extension if not exists "uuid-ossp";

-- ============================================================
-- Tables
-- ============================================================

create table if not exists public.categories (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  code         text not null check (code in ('livret','av','pea','per')),
  nom          text not null,
  taux_annuel  numeric(5,2) not null default 0,
  versement_mensuel_cible numeric(10,2) not null default 250,
  couleur      text not null default '#3b82f6',
  created_at   timestamptz not null default now(),
  unique(user_id, code)
);

create table if not exists public.mois_epargne (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  mois_date       date not null,                    -- 1er du mois
  livret_vers     numeric(10,2) not null default 0,
  av_vers         numeric(10,2) not null default 0,
  pea_vers        numeric(10,2) not null default 0,
  per_vers        numeric(10,2) not null default 0,
  livret_solde    numeric(10,2) not null default 0,
  av_solde        numeric(10,2) not null default 0,
  pea_solde       numeric(10,2) not null default 0,
  per_solde       numeric(10,2) not null default 0,
  livret_interets numeric(10,2) not null default 0,
  av_interets     numeric(10,2) not null default 0,
  pea_interets    numeric(10,2) not null default 0,
  per_interets    numeric(10,2) not null default 0,
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique(user_id, mois_date)
);

create index if not exists mois_epargne_user_date_idx
  on public.mois_epargne(user_id, mois_date);

-- ============================================================
-- updated_at auto
-- ============================================================

create or replace function public.set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists mois_epargne_set_updated_at on public.mois_epargne;
create trigger mois_epargne_set_updated_at
  before update on public.mois_epargne
  for each row execute procedure public.set_updated_at();

-- ============================================================
-- Row Level Security
-- ============================================================

alter table public.categories     enable row level security;
alter table public.mois_epargne   enable row level security;

drop policy if exists categories_own on public.categories;
create policy categories_own on public.categories
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists mois_epargne_own on public.mois_epargne;
create policy mois_epargne_own on public.mois_epargne
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================
-- Bootstrap : à la création d'un user, on crée
--   - les 4 catégories par défaut
--   - les 12 mois (juin 2026 → mai 2027) à 0€
-- ============================================================

create or replace function public.init_user_data() returns trigger as $$
begin
  insert into public.categories (user_id, code, nom, taux_annuel, versement_mensuel_cible, couleur)
  values
    (new.id, 'livret', 'Livret A',       1.5, 250, '#10b981'),
    (new.id, 'av',     'Assurance Vie',  3.0, 250, '#3b82f6'),
    (new.id, 'pea',    'PEA / CTO',      6.0, 250, '#f59e0b'),
    (new.id, 'per',    'PER',            5.0, 250, '#8b5cf6')
  on conflict (user_id, code) do nothing;

  insert into public.mois_epargne (user_id, mois_date)
  select new.id, (date '2026-06-01' + (n || ' month')::interval)::date
  from generate_series(0, 11) as n
  on conflict (user_id, mois_date) do nothing;

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.init_user_data();

-- ============================================================
-- Realtime : on publie les changements de mois_epargne
-- ============================================================

alter publication supabase_realtime add table public.mois_epargne;
alter publication supabase_realtime add table public.categories;
