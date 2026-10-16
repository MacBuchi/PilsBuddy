-- V12: the research source – a beer can point at it, the app can read it.
-- Run with `supabase test db` against the local stack.
begin;
select plan(2);

insert into public.breweries (id, name, lat, lon, country, sources) values ('osm-n4245', 'Dorfbräu', 49.2, 9.1, 'DE', '{osm}');
select lives_ok($$insert into public.regional_beers (id, brewery_id, name, style, source, source_ref) values
  ('r-x1a2b', 'osm-n4245', 'Dorfhell', 'Helles', 6, 'https://www.example.org/dorfbraeu')$$, 'a researched beer');

set local role anon;
select is((select key from public.beer_sources where id = 6), 'research', 'the app reads the source');

select * from finish();
rollback;
