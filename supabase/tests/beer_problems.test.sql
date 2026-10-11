-- V2: „Problem melden“ – beer reports through the feedback inbox; hidden regional beers vanish from the API.
-- Run with `supabase test db` against the local stack.
begin;
select plan(8);

set local role anon;
select lives_ok($$insert into public.feedback (type, message, beer_id, beer_name, problem, app_version, platform)
  values ('beer', '„T-Shirt Schwarz“: Das ist kein Bier', 'r-wb412292101b0b4d0', 'T-Shirt Schwarz', 'not_a_beer', 'ci', 'iOS · App')$$,
  'anon can report a problem with a beer');
select throws_ok($$insert into public.feedback (type, message) values ('beer', 'Gibt es nicht')$$,
  '23514', null, 'a beer report names the beer and the problem');
select throws_ok($$insert into public.feedback (type, message, beer_id, beer_name, problem) values ('beer', 'Was anderes', 'jever', 'Jever', 'tastes_bad')$$,
  '23514', null, 'only the known problems');
select throws_ok($$insert into public.feedback (type, message, beer_id, beer_name, problem) values ('bug', 'Swipe hängt beim Bier', 'jever', 'Jever', 'other')$$,
  '23514', null, 'beer fields only on beer reports');
select throws_ok($$insert into public.feedback (type, message, beer_id, beer_name, problem) values ('beer', 'Kaputte ID', 'R-<script>', 'X', 'other')$$,
  '23514', null, 'beer ids keep the ratings charset');

reset role;
insert into public.breweries (id, name, lat, lon, country, sources) values ('osm-n4243', 'Schlossbräu', 49.2, 9.1, 'DE', '{osm}');
insert into public.regional_beers (id, brewery_id, name, source, source_ref) values
  ('r-shirt', 'osm-n4243', 'T-Shirt Schwarz', 3, '/shop'), ('r-dunkel', 'osm-n4243', 'Schloss Dunkel', 3, '/biere');
update public.regional_beers set hidden = true where id = 'r-shirt';

set local role anon;
select results_eq($$select id from public.regional_beers where brewery_id = 'osm-n4243' order by id$$,
  array['r-dunkel'], 'a hidden beer is gone for the app');
select throws_ok($$update public.regional_beers set hidden = false where id = 'r-shirt'$$, '42501', null, 'anon cannot unhide');

reset role;
-- the import upserts without `hidden` – the flag survives
insert into public.regional_beers (id, brewery_id, name, source, source_ref, published) values ('r-shirt', 'osm-n4243', 'T-Shirt Schwarz', 3, '/shop', true)
  on conflict (id) do update set name = excluded.name, published = excluded.published;
select is((select hidden from public.regional_beers where id = 'r-shirt'), true, 'the next import keeps it hidden');

select * from finish();
rollback;
