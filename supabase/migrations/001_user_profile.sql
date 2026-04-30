-- Migration 001 — Profil utilisateur pour le moteur Conseil IA
-- À exécuter dans le SQL Editor Supabase

create table if not exists public.user_profile (
  user_id            uuid primary key references auth.users(id) on delete cascade,
  age                smallint,
  tmi                numeric(4,1),                       -- Tranche marginale d'imposition (0, 11, 30, 41, 45)
  fonds_urgence_mois numeric(4,1),                       -- Combien de mois de salaire en épargne urgence
  horizon_annees     smallint,                           -- Horizon avant utilisation des fonds
  profil_risque      text check (profil_risque in ('prudent','equilibre','dynamique')),
  objectif           text,
  livret_a_solde     numeric(10,2) default 0,            -- Solde existant Livret A (hors versements de l'app)
  livret_a_plafond   numeric(10,2) default 22950,
  pea_date_ouverture date,                               -- Pour calculer si > 5 ans
  notes              text,
  updated_at         timestamptz not null default now()
);

drop trigger if exists user_profile_set_updated_at on public.user_profile;
create trigger user_profile_set_updated_at
  before update on public.user_profile
  for each row execute procedure public.set_updated_at();

alter table public.user_profile enable row level security;

drop policy if exists user_profile_own on public.user_profile;
create policy user_profile_own on public.user_profile
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

alter publication supabase_realtime add table public.user_profile;

-- Auto-create empty profile on signup
create or replace function public.init_user_profile() returns trigger as $$
begin
  insert into public.user_profile (user_id) values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
  after insert on auth.users
  for each row execute procedure public.init_user_profile();

-- Backfill pour les users déjà existants
insert into public.user_profile (user_id)
select id from auth.users
where id not in (select user_id from public.user_profile)
on conflict (user_id) do nothing;
