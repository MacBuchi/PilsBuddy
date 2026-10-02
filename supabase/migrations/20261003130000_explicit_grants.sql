-- PilsBuddy Q1: API rights spelt out for every table, the same live and locally.
-- The live project's default privileges gave anon/authenticated/service_role ALL on every table postgres
-- creates in `public` (arwdDxtm); the local stack only Dxtm. So live, anon could e.g. INSERT into
-- `breweries` as far as grants go and only RLS stopped it. From now on: nothing by default for the API
-- roles, and exactly the grants below (checked by tool/grants_check.sql in CI, both paths).

-- future tables/sequences: no rights for the API roles unless a migration grants them
alter default privileges for role postgres in schema public revoke all on tables from anon, authenticated;
alter default privileges for role postgres in schema public revoke all on sequences from anon, authenticated;

-- existing tables: start from zero (revoking on a table also drops its column grants) …
revoke all on public.beers, public.profiles, public.ratings, public.sync_codes, public.breweries, public.regional_beers,
  public.places, public.beer_sources, public.feedback, public.beer_submissions from anon, authenticated;

-- … and grant exactly what the app uses
grant select on public.beers, public.breweries, public.regional_beers, public.places, public.beer_sources to anon, authenticated;
grant select, insert, update, delete on public.profiles, public.ratings to authenticated;
grant insert (type, message, app_version, platform) on public.feedback to anon, authenticated;
grant insert (brewery_id, brewery_name, brewery_place, link, beer_name, style, abv, note, app_version, platform)
  on public.beer_submissions to anon, authenticated;
