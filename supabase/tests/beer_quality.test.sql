-- V1: every regional beer carries a quality level 0–3; the API roles can read it.
-- Run with `supabase test db` against the local stack.
begin;
select plan(5);

insert into public.breweries (id, name, lat, lon, country, sources) values ('osm-n4242', 'Testbräu', 49.2, 9.1, 'DE', '{osm}');

select lives_ok($$insert into public.regional_beers (id, brewery_id, name, source, source_ref) values
  ('r-test1', 'osm-n4242', 'Testbräu Pils', 3, '/biere')$$, 'a row without quality is accepted');
select is((select quality from public.regional_beers where id = 'r-test1'), 1::smallint, 'it starts as „gefunden“');
select lives_ok($$update public.regional_beers set quality = 2 where id = 'r-test1'$$, 'the import may raise it');
select throws_ok($$update public.regional_beers set quality = 4 where id = 'r-test1'$$, '23514', null, 'only 0–3');

set local role anon;
select results_eq($$select quality from public.regional_beers where id = 'r-test1'$$, array[2::smallint], 'anon reads the level');

select * from finish();
rollback;
