-- PilsBuddy B1: profiles, ratings, beer catalogue.
-- Users sign in anonymously (B2); every row belongs to auth.uid(). Nothing is public except the
-- published beer catalogue and – later, opt-in only – visible profiles for Pils-Match (C2).

-- ---------------------------------------------------------------------------------------------
-- helpers
-- ---------------------------------------------------------------------------------------------

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------------------------
-- beers: mirror of src/data/beers.json (B3 loads it from here, the JSON stays the fallback)
-- ---------------------------------------------------------------------------------------------

create table public.beers (
  id text primary key check (id ~ '^[a-z0-9-]{1,64}$'),
  -- the full Beer object as the app knows it (name, taste axes, copy …)
  data jsonb not null check (jsonb_typeof(data) = 'object'),
  published boolean not null default true,
  sort integer not null default 0,
  updated_at timestamptz not null default now()
);

comment on table public.beers is 'Beer catalogue; data mirrors one entry of src/data/beers.json.';

create trigger beers_touch before update on public.beers
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------------------------
-- profiles: one per (anonymous) user
-- ---------------------------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  buddy_no integer not null check (buddy_no between 0 and 9999),
  -- chosen for Pils-Match (C3); null until the user picks one
  handle text unique check (handle ~ '^[A-Za-z0-9ÄÖÜäöüß_.-]{2,24}$'),
  archetype text not null default 'logo'
    check (archetype in ('logo', 'herb', 'feierabend', 'abenteurer', 'geniesser', 'philosoph', 'probierer', 'kasten')),
  -- taste vector, 8 axes 0–100 (derived on the client, stored for matching)
  taste jsonb check (taste is null or jsonb_typeof(taste) = 'object'),
  decoded smallint not null default 0 check (decoded between 0 and 100),
  -- opt-in for Pils-Match; off by default
  visible boolean not null default false,
  dark boolean not null default false,
  onboarded boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on column public.profiles.visible is 'Opt-in: only visible profiles can be found by other users.';

create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------------------------
-- ratings: one row per user and beer; "newest at wins" when syncing
-- ---------------------------------------------------------------------------------------------

create table public.ratings (
  user_id uuid not null references auth.users (id) on delete cascade,
  -- no FK to beers on purpose: the bundled JSON can know beers the DB does not (yet)
  beer_id text not null check (beer_id ~ '^[a-z0-9-]{1,64}$'),
  rating text not null check (rating in ('LIKE', 'DISLIKE', 'WANT_TO_TRY', 'KNOW', 'UNKNOWN')),
  previous text check (previous in ('LIKE', 'DISLIKE', 'WANT_TO_TRY', 'KNOW', 'UNKNOWN')),
  at timestamptz not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, beer_id)
);

create trigger ratings_touch before update on public.ratings
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------------------------
-- row level security
-- ---------------------------------------------------------------------------------------------

alter table public.beers enable row level security;
alter table public.profiles enable row level security;
alter table public.ratings enable row level security;

create policy "published beers are public"
  on public.beers for select
  to anon, authenticated
  using (published);

-- own profile, plus profiles that opted in to Pils-Match
create policy "read own or visible profiles"
  on public.profiles for select
  to authenticated
  using ((select auth.uid()) = id or visible);

create policy "create own profile"
  on public.profiles for insert
  to authenticated
  with check ((select auth.uid()) = id);

create policy "update own profile"
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create policy "delete own profile"
  on public.profiles for delete
  to authenticated
  using ((select auth.uid()) = id);

create policy "own ratings"
  on public.ratings for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------------------------------
-- grants (new projects do not expose public tables to the API roles by default)
-- ---------------------------------------------------------------------------------------------

grant select on public.beers to anon, authenticated;
grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.ratings to authenticated;
revoke execute on function public.touch_updated_at() from public, anon, authenticated;
