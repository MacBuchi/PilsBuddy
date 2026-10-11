-- PilsBuddy C2/C3: Pils-Match (Absprache 2026-10-11).
-- Opt-in: a profile becomes findable with `visible` + a `handle` (both exist since the initial schema). Only visible
-- users get the feed (Edge Function `match-candidates`, service key): handle, persona and the ratings of the people
-- whose taste is closest – no photos, no location, no chat. „Anstoßen“ is a clink; two clinks make two buddies.
-- Blocking hides both people from each other for good.
--
-- The feed is the only way to see other people: profiles are now readable by their owner only (the old policy also
-- showed visible profiles to every signed-in user, with nothing to block). Released clients never read other profiles.

drop policy "read own or visible profiles" on public.profiles;
create policy "read own profile"
  on public.profiles for select
  to authenticated
  using ((select auth.uid()) = id);

-- „Bierfan“ and „bierfan“ are the same person to a reader
create unique index profiles_handle_lower on public.profiles (lower(handle));

-- ---------------------------------------------------------------------------------------------
-- clinks („Anstoßen“) and blocks: one row per pair and direction, only the own rows are visible
-- ---------------------------------------------------------------------------------------------

create table public.match_clinks (
  from_id uuid not null references auth.users (id) on delete cascade,
  to_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (from_id, to_id),
  check (from_id <> to_id)
);

create table public.match_blocks (
  from_id uuid not null references auth.users (id) on delete cascade,
  to_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (from_id, to_id),
  check (from_id <> to_id)
);

comment on table public.match_clinks is 'C2 „Anstoßen“: from_id clinked to_id; a pair in both directions = buddies.';
comment on table public.match_blocks is 'C3: from_id blocked to_id; the feed hides both from each other.';

-- the feed looks up „who clinked/blocked me“
create index match_clinks_to on public.match_clinks (to_id);
create index match_blocks_to on public.match_blocks (to_id);

alter table public.match_clinks enable row level security;
alter table public.match_blocks enable row level security;

create policy "own clinks"
  on public.match_clinks for all
  to authenticated
  using ((select auth.uid()) = from_id)
  with check ((select auth.uid()) = from_id);

create policy "own blocks"
  on public.match_blocks for all
  to authenticated
  using ((select auth.uid()) = from_id)
  with check ((select auth.uid()) = from_id);

-- no updates: a clink or block is set or removed
grant select, insert, delete on public.match_clinks, public.match_blocks to authenticated;
grant select, insert, update, delete on public.match_clinks, public.match_blocks to service_role;
