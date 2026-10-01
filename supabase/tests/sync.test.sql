-- B2: tombstones are private like ratings; sync codes are invisible to the API roles.
begin;
select plan(8);

insert into auth.users (id, aud, role, email) values
  ('11111111-1111-1111-1111-111111111111', 'authenticated', 'authenticated', 'a@test.local'),
  ('22222222-2222-2222-2222-222222222222', 'authenticated', 'authenticated', 'b@test.local');
insert into public.sync_codes (user_id, code_hash)
  values ('22222222-2222-2222-2222-222222222222', repeat('a', 64));

select has_column('public', 'ratings', 'deleted', 'ratings have a tombstone flag');
select col_default_is('public', 'ratings', 'deleted', 'false', 'new ratings are alive');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
select lives_ok(
  $$insert into public.ratings (user_id, beer_id, rating, at, deleted) values ('11111111-1111-1111-1111-111111111111', 'jever', 'LIKE', now(), true)$$,
  'a user can write a tombstone for an own rating');
select throws_ok('select * from public.sync_codes', '42501', null, 'authenticated cannot read sync codes');
select throws_ok(
  $$insert into public.sync_codes (user_id, code_hash) values ('11111111-1111-1111-1111-111111111111', repeat('b', 64))$$,
  '42501', null, 'authenticated cannot create sync codes');

set local role anon;
select throws_ok('select * from public.sync_codes', '42501', null, 'anon cannot read sync codes');

set local role service_role;
select results_eq('select count(*)::int from public.sync_codes where user_id = ''22222222-2222-2222-2222-222222222222''', array[1], 'the edge function (service_role) can read sync codes');

-- B4 „Alles löschen“: the edge function deletes the auth user, the Sync-Code goes with it
reset role;
delete from auth.users where id = '22222222-2222-2222-2222-222222222222';
select is_empty($$select 1 from public.sync_codes where user_id = '22222222-2222-2222-2222-222222222222'$$, 'sync code cascades with the account');

select * from finish();
rollback;
