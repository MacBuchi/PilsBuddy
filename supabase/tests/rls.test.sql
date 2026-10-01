-- RLS for PilsBuddy: users only see and change their own rows; visible profiles are opt-in.
-- Run with `supabase test db` against the local stack.
begin;
select plan(18);

-- two users and one beer, inserted as the table owner
insert into auth.users (id, aud, role, email) values
  ('11111111-1111-1111-1111-111111111111', 'authenticated', 'authenticated', 'a@test.local'),
  ('22222222-2222-2222-2222-222222222222', 'authenticated', 'authenticated', 'b@test.local');
insert into public.beers (id, data) values ('jever', '{"name":"Jever"}'), ('geheim', '{"name":"Geheim"}');
update public.beers set published = false where id = 'geheim';
insert into public.profiles (id, buddy_no) values ('22222222-2222-2222-2222-222222222222', 42);
insert into public.ratings (user_id, beer_id, rating, at)
  values ('22222222-2222-2222-2222-222222222222', 'jever', 'LIKE', now());

-- anon: published beers only, nothing else
set local role anon;
select results_eq('select id from public.beers', array['jever'], 'anon sees published beers only');
select throws_ok('select * from public.profiles', '42501', null, 'anon cannot read profiles');
select throws_ok('select * from public.ratings', '42501', null, 'anon cannot read ratings');

-- user A
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);

select is_empty('select * from public.profiles', 'A does not see B''s hidden profile');
select is_empty('select * from public.ratings', 'A does not see B''s ratings');
select lives_ok(
  $$insert into public.profiles (id, buddy_no) values ('11111111-1111-1111-1111-111111111111', 7)$$,
  'A creates own profile');
select throws_ok(
  $$insert into public.profiles (id, buddy_no) values ('33333333-3333-3333-3333-333333333333', 8)$$,
  '42501', null, 'A cannot create a profile for someone else');
select lives_ok(
  $$insert into public.ratings (user_id, beer_id, rating, at) values ('11111111-1111-1111-1111-111111111111', 'jever', 'DISLIKE', now())$$,
  'A rates a beer');
select throws_ok(
  $$insert into public.ratings (user_id, beer_id, rating, at) values ('22222222-2222-2222-2222-222222222222', 'jever', 'DISLIKE', now())$$,
  '42501', null, 'A cannot rate in B''s name');
select throws_ok(
  $$insert into public.ratings (user_id, beer_id, rating, at) values ('11111111-1111-1111-1111-111111111111', 'becks', 'MEH', now())$$,
  '23514', null, 'unknown rating values are rejected');

-- updates/deletes on B's rows silently touch nothing
update public.ratings set rating = 'DISLIKE' where user_id = '22222222-2222-2222-2222-222222222222';
delete from public.profiles where id = '22222222-2222-2222-2222-222222222222';
select throws_ok('insert into public.beers (id, data) values (''x'', ''{}'')', '42501', null, 'users cannot edit the catalogue');

-- B opts in to Pils-Match → A can find the profile, still not the ratings
reset role;
update public.profiles set visible = true where id = '22222222-2222-2222-2222-222222222222';
select results_eq(
  $$select rating from public.ratings where user_id = '22222222-2222-2222-2222-222222222222'$$,
  array['LIKE'], 'A could not change B''s rating');
select isnt_empty(
  $$select 1 from public.profiles where id = '22222222-2222-2222-2222-222222222222'$$,
  'A could not delete B''s profile');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
select results_eq('select buddy_no from public.profiles order by buddy_no', array[7, 42], 'A sees own + visible profile');
select is_empty('select * from public.ratings where user_id <> auth.uid()', 'ratings stay private when visible');
update public.profiles set buddy_no = 1 where id = '22222222-2222-2222-2222-222222222222';

reset role;
select results_eq(
  $$select buddy_no from public.profiles where id = '22222222-2222-2222-2222-222222222222'$$,
  array[42], 'A cannot change B''s visible profile');

-- deleting the auth user removes everything (the "Alles löschen" path in B4)
delete from auth.users where id = '11111111-1111-1111-1111-111111111111';
select is_empty($$select 1 from public.ratings where user_id = '11111111-1111-1111-1111-111111111111'$$, 'ratings cascade');
select is_empty($$select 1 from public.profiles where id = '11111111-1111-1111-1111-111111111111'$$, 'profile cascades');

select * from finish();
rollback;
