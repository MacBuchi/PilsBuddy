-- C2/C3 Pils-Match: clinks and blocks are private to whoever set them; handles are unique regardless of case.
begin;
select plan(14);

insert into auth.users (id, aud, role, email) values
  ('11111111-1111-1111-1111-111111111111', 'authenticated', 'authenticated', 'a@test.local'),
  ('22222222-2222-2222-2222-222222222222', 'authenticated', 'authenticated', 'b@test.local'),
  ('33333333-3333-3333-3333-333333333333', 'authenticated', 'authenticated', 'c@test.local');
insert into public.profiles (id, buddy_no, handle, visible) values
  ('22222222-2222-2222-2222-222222222222', 42, 'Bierfan', true),
  ('33333333-3333-3333-3333-333333333333', 43, null, false);
-- C clinked B before; A must not see that
insert into public.match_clinks (from_id, to_id) values ('33333333-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222222');

select throws_ok(
  $$insert into public.profiles (id, buddy_no, handle) values ('11111111-1111-1111-1111-111111111111', 7, 'BIERFAN')$$,
  '23505', null, 'handles are unique regardless of case');
select throws_ok(
  $$update public.profiles set handle = 'x' where id = '33333333-3333-3333-3333-333333333333'$$,
  '23514', null, 'a handle needs at least two characters');

set local role anon;
select throws_ok('select * from public.match_clinks', '42501', null, 'anon cannot read clinks');
select throws_ok('select * from public.match_blocks', '42501', null, 'anon cannot read blocks');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);

select is_empty('select * from public.profiles', 'a visible profile is not readable through the API');
select is_empty('select * from public.match_clinks', 'A does not see other people''s clinks');
select lives_ok(
  $$insert into public.match_clinks (from_id, to_id) values ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222')$$,
  'A clinks B');
select throws_ok(
  $$insert into public.match_clinks (from_id, to_id) values ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111')$$,
  '42501', null, 'A cannot clink in B''s name');
select throws_ok(
  $$insert into public.match_clinks (from_id, to_id) values ('11111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111')$$,
  '23514', null, 'nobody clinks themselves');
select lives_ok(
  $$insert into public.match_blocks (from_id, to_id) values ('11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333')$$,
  'A blocks C');
select throws_ok(
  $$update public.match_blocks set to_id = '22222222-2222-2222-2222-222222222222'$$,
  '42501', null, 'blocks are not updated, only set or removed');
delete from public.match_clinks where from_id = '33333333-3333-3333-3333-333333333333';

reset role;
select results_eq('select count(*)::int from public.match_clinks', array[2], 'A could not delete C''s clink');

-- deleting an account removes its clinks and blocks in both directions
delete from auth.users where id = '11111111-1111-1111-1111-111111111111';
select is_empty($$select 1 from public.match_clinks where '11111111-1111-1111-1111-111111111111' in (from_id, to_id)$$, 'clinks cascade');
select is_empty($$select 1 from public.match_blocks where '11111111-1111-1111-1111-111111111111' in (from_id, to_id)$$, 'blocks cascade');

select * from finish();
rollback;
