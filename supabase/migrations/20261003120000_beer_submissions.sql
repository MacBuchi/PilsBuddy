-- PilsBuddy R6: „Bier fehlt? Eintragen“. Anyone reports a missing beer – a brewery at minimum, plus a link
-- or the beer's facts. Anonymous like `feedback`: no account, no user id. tool/beer_bot.py turns each row
-- into a GitHub issue (label `bier-meldung`); the label `freigegeben` imports the (possibly corrected) issue
-- into `regional_beers` (source 5), for an unknown brewery also into `breweries` (id `app-<issue>`).

create table public.beer_submissions (
  id uuid primary key default gen_random_uuid(),
  -- a brewery the app showed (finder / brewery sheet); null = typed by hand
  brewery_id text references public.breweries (id) on delete set null,
  brewery_name text not null check (char_length(btrim(brewery_name)) between 2 and 200),
  -- postcode or town of a typed brewery, so it can be placed on the map
  brewery_place text check (char_length(btrim(brewery_place)) between 2 and 120),
  link text check (char_length(link) <= 500 and link ~ '^https?://[^\s/$.?#][^\s]*$'),
  beer_name text check (char_length(btrim(beer_name)) between 1 and 200),
  style text check (char_length(style) <= 40),
  abv numeric(4, 1) check (abv between 0 and 20),
  note text check (char_length(note) <= 500),
  app_version text check (char_length(app_version) <= 40),
  platform text check (char_length(platform) <= 40),
  created_at timestamptz not null default now(),
  -- set by the bot once the issue exists (idempotency); rows are deleted 30 days later
  processed_at timestamptz,
  issue_number integer,
  -- a link or at least the beer's name
  check (link is not null or beer_name is not null),
  -- a typed brewery needs a place
  check (brewery_id is not null or brewery_place is not null)
);

comment on table public.beer_submissions is 'Missing beers reported in the app (R6), turned into GitHub issues by tool/beer_bot.py. Anonymous, write-only via API.';

create index beer_submissions_unprocessed on public.beer_submissions (created_at) where processed_at is null;

-- ---------------------------------------------------------------------------------------------
-- spam guard: at most 20 reports per 10 minutes overall, the same beer only once per week
-- ---------------------------------------------------------------------------------------------

create function public.beer_submissions_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.created_at := now();
  new.processed_at := null;
  new.issue_number := null;
  new.brewery_name := btrim(new.brewery_name);
  new.brewery_place := nullif(btrim(new.brewery_place), '');
  new.beer_name := nullif(btrim(new.beer_name), '');
  new.link := nullif(btrim(new.link), '');
  new.note := nullif(btrim(new.note), '');
  if (select count(*) from public.beer_submissions where created_at > now() - interval '10 minutes') >= 20 then
    raise exception 'submission rate limit' using errcode = 'P0001', hint = 'later';
  end if;
  if exists (
    select 1 from public.beer_submissions s
    where lower(s.brewery_name) = lower(new.brewery_name)
      and lower(coalesce(s.beer_name, '')) = lower(coalesce(new.beer_name, ''))
      and coalesce(s.link, '') = coalesce(new.link, '')
      and s.created_at > now() - interval '7 days'
  ) then
    raise exception 'submission duplicate' using errcode = 'P0001', hint = 'duplicate';
  end if;
  return new;
end;
$$;

revoke execute on function public.beer_submissions_guard() from public, anon, authenticated;

create trigger beer_submissions_guard before insert on public.beer_submissions
  for each row execute function public.beer_submissions_guard();

-- ---------------------------------------------------------------------------------------------
-- row level security: anyone may report, nobody reads through the API
-- ---------------------------------------------------------------------------------------------

alter table public.beer_submissions enable row level security;

create policy "anyone can report a missing beer"
  on public.beer_submissions for insert
  to anon, authenticated
  with check (processed_at is null and issue_number is null);

-- the live project grants API roles everything on new tables by default – take it back first
revoke all on public.beer_submissions from anon, authenticated;
grant insert (brewery_id, brewery_name, brewery_place, link, beer_name, style, abv, note, app_version, platform)
  on public.beer_submissions to anon, authenticated;
grant all on public.beer_submissions to service_role;

-- ---------------------------------------------------------------------------------------------
-- approved reports land in the regional catalogue
-- ---------------------------------------------------------------------------------------------

insert into public.beer_sources (id, key, name, licence, url_template) values
  (5, 'app', 'Meldung aus der App', 'Fakten (Name, Stil, Alkohol), geprüft', null);

-- breweries reported in the app get `app-<issue number>`
alter table public.breweries drop constraint breweries_id_check;
alter table public.breweries add constraint breweries_id_check check (id ~ '^(osm-[nwr]|wd-q|app-)[0-9]{1,20}$');

-- tool/beer_bot.py writes approved reports with the service key; spelt out because the local stack (unlike live)
-- grants service_role nothing on these tables by default
grant select, insert, update on public.breweries, public.regional_beers to service_role;
grant select on public.places, public.beer_sources to service_role;
