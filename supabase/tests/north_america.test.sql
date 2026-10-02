-- N4: Canadian and US breweries and postcodes fit the regional catalogue; everything else still bounces.
-- Run with `supabase test db` against the local stack.
begin;
select plan(9);

select lives_ok($$insert into public.breweries (id, name, lat, lon, country, sources) values
  ('obdb-5128df48-79fc-4f0f-8b52-d06be54d0cec', 'Sierra Nevada Brewing Co', 39.72, -121.82, 'US', '{obdb}')$$,
  'a US brewery from Open Brewery DB');
select lives_ok($$insert into public.breweries (id, name, lat, lon, country, sources) values
  ('osm-n77', 'Unibroue', 45.45, -73.28, 'CA', '{osm}')$$, 'a Canadian brewery from OSM');
select throws_ok($$insert into public.breweries (id, name, lat, lon, country) values ('osm-n78', 'X', 1, 1, 'MX')$$,
  '23514', null, 'other countries stay out');
select throws_ok($$insert into public.breweries (id, name, lat, lon, country) values ('obdb-not-a-uuid', 'X', 1, 1, 'US')$$,
  '23514', null, 'Open Brewery DB ids are UUIDs');

select lives_ok($$insert into public.places (country, postcode, name, lat, lon) values ('US', '95928', 'Chico', 39.73, -121.84)$$,
  'a US ZIP code');
select lives_ok($$insert into public.places (country, postcode, name, lat, lon) values ('CA', 'J3L', 'Chambly', 45.45, -73.29)$$,
  'a Canadian FSA');
select throws_ok($$insert into public.places (country, postcode, name, lat, lon) values ('CA', 'J3L 2C7', 'Chambly', 1, 1)$$,
  '23514', null, 'full Canadian postcodes are not stored');
select throws_ok($$insert into public.places (country, postcode, name, lat, lon) values ('CA', 'j3l', 'Chambly', 1, 1)$$,
  '23514', null, 'FSAs are upper case');

set local role anon;
select results_eq($$select country from public.places where postcode in ('95928', 'J3L') order by country$$,
  array['CA', 'US'], 'anon finds both');

select * from finish();
rollback;
