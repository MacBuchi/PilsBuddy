-- RLS + spam guard for „Bier fehlt? Eintragen“ (R6). Run with `supabase test db` against the local stack.
begin;
select plan(17);

-- independent of whatever the stack holds (rolled back at the end)
delete from public.beer_submissions;
insert into public.breweries (id, name, lat, lon, country) values ('osm-n4711', 'Testbräu', 49.2, 9.1, 'DE');

set local role anon;
select lives_ok($$insert into public.beer_submissions (brewery_id, brewery_name, beer_name, style, abv, app_version, platform)
  values ('osm-n4711', ' Testbräu ', ' Kellerpils ', 'Kellerbier', 5.2, 'a74e951', 'iOS · App')$$,
  'anon reports a beer of a known brewery');
select lives_ok($$insert into public.beer_submissions (brewery_name, brewery_place, link)
  values ('Hinterhofbräu', '74906', 'https://hinterhof.example/biere')$$,
  'anon reports a new brewery with a link only');
select throws_ok($$insert into public.beer_submissions (brewery_id, brewery_name, beer_name) values ('osm-n4711', 'testbräu', 'KELLERPILS')$$,
  'P0001', 'submission duplicate', 'the same beer twice a week is refused');
select throws_ok($$insert into public.beer_submissions (brewery_id, brewery_name) values ('osm-n4711', 'Testbräu')$$,
  '23514', null, 'a link or a beer name is required');
select throws_ok($$insert into public.beer_submissions (brewery_name, beer_name) values ('Irgendwo-Bräu', 'Hell')$$,
  '23514', null, 'a typed brewery needs a place');
select throws_ok($$insert into public.beer_submissions (brewery_name, brewery_place, link) values ('Bräu', '74906', 'javascript:alert(1)')$$,
  '23514', null, 'only http(s) links');
select throws_ok($$insert into public.beer_submissions (brewery_id, brewery_name, beer_name, abv) values ('osm-n4711', 'Testbräu', 'Starkbier', 45)$$,
  '23514', null, 'abv stays plausible');
select throws_ok($$insert into public.beer_submissions (brewery_id, brewery_name, beer_name) values ('osm-n0', 'Testbräu', 'Geist')$$,
  '23503', null, 'brewery_id must exist');
select throws_ok($$insert into public.beer_submissions (brewery_id, brewery_name, beer_name, issue_number) values ('osm-n4711', 'Testbräu', 'Dunkel', 1)$$,
  '42501', null, 'the client cannot set issue_number');
select throws_ok($$select * from public.beer_submissions$$, '42501', null, 'anon cannot read reports');
select throws_ok($$update public.beer_submissions set note = 'x'$$, '42501', null, 'anon cannot change reports');
select throws_ok($$delete from public.beer_submissions$$, '42501', null, 'anon cannot delete reports');

reset role;
select is(
  (select string_agg(distinct privilege_type, ',') from information_schema.role_table_grants
    where table_schema = 'public' and table_name = 'beer_submissions' and grantee in ('anon', 'authenticated')),
  null, 'API roles hold no table-wide privileges, only the insert columns');
select results_eq($$select brewery_name, beer_name, processed_at is null from public.beer_submissions order by created_at, brewery_name$$,
  $$values ('Hinterhofbräu'::text, null::text, true), ('Testbräu', 'Kellerpils', true)$$, 'names are trimmed, rows wait for the bot');

-- rate limit: 20 rows in 10 minutes overall
insert into public.beer_submissions (brewery_id, brewery_name, beer_name)
  select 'osm-n4711', 'Testbräu', 'Sorte ' || n from generate_series(3, 20) n;
set local role anon;
select throws_ok($$insert into public.beer_submissions (brewery_id, brewery_name, beer_name) values ('osm-n4711', 'Testbräu', 'noch eins')$$,
  'P0001', 'submission rate limit', 'more than 20 in 10 minutes is refused');
reset role;
select lives_ok($$insert into public.breweries (id, name, lat, lon, country) values ('app-37', 'Hinterhofbräu', 49.2, 9.1, 'DE')$$,
  'breweries accept app-<issue> ids');

select ok(
  has_table_privilege('service_role', 'public.regional_beers', 'insert') and has_table_privilege('service_role', 'public.breweries', 'update')
    and has_table_privilege('service_role', 'public.places', 'select'),
  'the bot (service_role) can write approved reports into the catalogue');

select * from finish();
rollback;
