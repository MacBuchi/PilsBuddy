-- V6: corrections from confirmed beer reports – readable by the app, writable only by the bot, kept by the import.
-- Run with `supabase test db` against the local stack.
begin;
select plan(7);

insert into public.breweries (id, name, lat, lon, country, sources) values ('osm-n4244', 'Klosterbräu', 49.2, 9.1, 'DE', '{osm}');
insert into public.regional_beers (id, brewery_id, name, style, abv, source, source_ref) values
  ('r-maibock', 'osm-n4244', 'Maibock', 'Bock', null, 3, '/biere');

select lives_ok($$update public.regional_beers set correction = '{"abv": 7.2, "style": "Bock"}' where id = 'r-maibock'$$,
  'the bot can store a correction');
select throws_ok($$update public.regional_beers set correction = '{"taste": 90}' where id = 'r-maibock'$$,
  '23514', null, 'only name, style and abv');
select throws_ok($$update public.regional_beers set correction = '{"abv": 25}' where id = 'r-maibock'$$,
  '23514', null, 'abv stays within 0–20');
select throws_ok($$update public.regional_beers set correction = '{}' where id = 'r-maibock'$$,
  '23514', null, 'an empty correction is no correction');

set local role anon;
select is((select correction ->> 'abv' from public.regional_beers where id = 'r-maibock'), '7.2', 'the app reads the correction');
select throws_ok($$update public.regional_beers set correction = '{"abv": 4}' where id = 'r-maibock'$$, '42501', null, 'anon cannot correct');

reset role;
-- the import upserts without `correction` – the values survive
insert into public.regional_beers (id, brewery_id, name, style, abv, source, source_ref, published) values
  ('r-maibock', 'osm-n4244', 'Maibock', 'Bock', 16, 3, '/biere', true)
  on conflict (id) do update set name = excluded.name, style = excluded.style, abv = excluded.abv, published = excluded.published;
select is((select correction from public.regional_beers where id = 'r-maibock'), '{"abv": 7.2, "style": "Bock"}'::jsonb,
  'the next import keeps the correction');

select * from finish();
rollback;
