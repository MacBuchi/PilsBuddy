-- RLS for the regional catalogue (R1): everyone reads published rows, nobody writes through the API.
-- Run with `supabase test db` against the local stack.
begin;
select plan(17);

insert into public.breweries (id, name, lat, lon, country, sources) values
  ('osm-n1', 'Brauerei Offen', 49.2, 9.1, 'DE', '{osm}'),
  ('wd-q2', 'Brauerei Zu', 49.3, 9.2, 'DE', '{wikidata}');
update public.breweries set published = false where id = 'wd-q2';
insert into public.regional_beers (id, brewery_id, name, style, abv, pack, source, source_ref) values
  ('r-4000000000001', 'osm-n1', 'Offen Pils', 'Pils', 4.9, '{"ml":500}', 1, '4000000000001'),
  ('r-4000000000002', 'osm-n1', 'Offen Bock', 'Bock', 6.8, null, 3, '/biere/bock');
update public.regional_beers set published = false where id = 'r-4000000000002';
insert into public.places (country, postcode, name, lat, lon) values ('DE', '74906', 'Bad Rappenau', 49.24, 9.1);

select throws_ok($$insert into public.breweries (id, name, lat, lon, country) values ('r:1', 'X', 1, 1, 'DE')$$,
  '23514', null, 'brewery ids are source ids');
select throws_ok($$insert into public.regional_beers (id, brewery_id, name, source) values ('r-1234567', 'osm-n404', 'X', 1)$$,
  '23503', null, 'beers need a known brewery');
select throws_ok($$insert into public.regional_beers (id, brewery_id, name, source) values ('r-1234568', 'osm-n1', 'X', 99)$$,
  '23503', null, 'beers need a known source');

-- anon
set local role anon;
select results_eq('select id from public.breweries', array['osm-n1'], 'anon sees published breweries only');
select results_eq('select id from public.regional_beers', array['r-4000000000001'], 'anon sees published beers only');
select results_eq('select name from public.places where postcode = ''74906''', array['Bad Rappenau'], 'anon finds a postcode');
select results_eq(
  $$select replace(s.url_template, '{ref}', r.source_ref) from public.regional_beers r join public.beer_sources s on s.id = r.source$$,
  array['https://world.openfoodfacts.org/product/4000000000001'], 'anon builds the source link');
select throws_ok($$update public.beer_sources set name = 'X'$$, '42501', null, 'anon cannot change sources');
select throws_ok($$insert into public.breweries (id, name, lat, lon, country) values ('osm-n9', 'X', 1, 1, 'DE')$$,
  '42501', null, 'anon cannot add breweries');
select throws_ok($$update public.regional_beers set name = 'X'$$, '42501', null, 'anon cannot change beers');
select throws_ok($$insert into public.places (country, postcode, name, lat, lon) values ('DE', '12345', 'X', 1, 1)$$,
  '42501', null, 'anon cannot add places');

-- authenticated (anonymous sign-in)
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
select results_eq('select id from public.breweries', array['osm-n1'], 'users see published breweries only');
select results_eq(
  $$select b.id from public.breweries b join public.regional_beers r on r.brewery_id = b.id$$,
  array['osm-n1'], 'users see published beers of a brewery only');
select throws_ok($$delete from public.breweries$$, '42501', null, 'users cannot delete breweries');
select throws_ok($$insert into public.regional_beers (id, brewery_id, name) values ('r-12345678', 'osm-n1', 'X')$$,
  '42501', null, 'users cannot add beers');
select throws_ok($$delete from public.places$$, '42501', null, 'users cannot delete places');

-- the owner (import) sees everything
reset role;
select results_eq('select count(*)::int from public.regional_beers', array[2], 'the import keeps unpublished rows');

select * from finish();
rollback;
