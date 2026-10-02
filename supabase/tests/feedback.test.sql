-- RLS + spam guard for in-app feedback. Run with `supabase test db` against the local stack.
begin;
select plan(12);

set local role anon;
select lives_ok($$insert into public.feedback (type, message, app_version, platform) values ('bug', '  Swipe hängt  ', 'a74e951', 'iOS · App')$$,
  'anon can send feedback');
select throws_ok($$insert into public.feedback (type, message) values ('bug', 'Swipe hängt')$$,
  'P0001', 'feedback duplicate', 'the same text twice a day is refused');
select throws_ok($$insert into public.feedback (type, message) values ('praise', 'Super App')$$,
  '23514', null, 'only feature and bug');
select throws_ok($$insert into public.feedback (type, message) values ('feature', '  x ')$$,
  '23514', null, 'at least 3 characters');
select throws_ok($$insert into public.feedback (type, message, processed_at) values ('feature', 'schon erledigt', now())$$,
  '42501', null, 'the client cannot set processed_at');
select throws_ok($$select * from public.feedback$$, '42501', null, 'anon cannot read feedback');
select throws_ok($$update public.feedback set message = 'x'$$, '42501', null, 'anon cannot change feedback');
select throws_ok($$delete from public.feedback$$, '42501', null, 'anon cannot delete feedback');

reset role;
select is(
  (select string_agg(distinct privilege_type, ',') from information_schema.role_table_grants
    where table_schema = 'public' and table_name = 'feedback' and grantee in ('anon', 'authenticated')),
  null, 'API roles hold no table-wide privileges, only the insert columns');
select results_eq($$select message, processed_at is null from public.feedback$$,
  $$values ('Swipe hängt'::text, true)$$, 'text is trimmed, row waits for the bot');

-- rate limit: 30 rows in 10 minutes overall
insert into public.feedback (type, message) select 'feature', 'Wunsch Nummer ' || n from generate_series(2, 30) n;
set local role anon;
select throws_ok($$insert into public.feedback (type, message) values ('feature', 'noch einer')$$,
  'P0001', 'feedback rate limit', 'more than 30 in 10 minutes is refused');
reset role;
select is((select count(*)::int from public.feedback), 30, 'exactly 30 stored');

select * from finish();
rollback;
