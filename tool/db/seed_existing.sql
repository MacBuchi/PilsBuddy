-- Q1 upgrade path: rows like the ones live, loaded AFTER the base branch's migrations and BEFORE the new ones,
-- so a new migration has to cope with existing data (not null columns, new checks, unique keys …).
-- Runs against the BASE schema, which may be older than this file: every block checks that its table exists.
-- Add a block when a table is added, using only columns that exist since that table's first migration.
-- The regional catalogue (fixture) and e2e/catalog-seed.sql are loaded separately by tool/db/upgrade_check.sh.
do $$
declare
  uid constant uuid := '0b0b0b0b-0000-4000-8000-000000000001';
begin
  -- an anonymous sync account with a profile, ratings and a sync code
  insert into auth.users (instance_id, id, aud, role, is_anonymous, created_at, updated_at)
    values ('00000000-0000-0000-0000-000000000000', uid, 'authenticated', 'authenticated', true, now(), now())
    on conflict (id) do nothing;
  if to_regclass('public.profiles') is not null then
    insert into public.profiles (id, buddy_no, archetype, taste, decoded, dark, onboarded)
      values (uid, 4711, 'herb', '{"bitterness":80,"hopIntensity":70,"maltiness":30,"sweetness":20,"dryness":75,"body":40,"drinkability":60,"character":70}', 64, true, true)
      on conflict (id) do nothing;
  end if;
  if to_regclass('public.ratings') is not null then
    insert into public.ratings (user_id, beer_id, rating, previous, at) values
      (uid, 'jever', 'LIKE', null, now() - interval '3 days'),
      (uid, 'augustiner-helles', 'WANT_TO_TRY', 'UNKNOWN', now() - interval '2 days'),
      (uid, 'r-4000000000001', 'KNOW', null, now() - interval '1 day')
      on conflict do nothing;
  end if;
  if to_regclass('public.sync_codes') is not null then
    insert into public.sync_codes (user_id, code_hash) values (uid, repeat('ab', 32)) on conflict do nothing;
  end if;

  -- anonymous inboxes: one row waiting for the bot, one already turned into an issue
  if to_regclass('public.feedback') is not null then
    insert into public.feedback (type, message, app_version, platform) values
      ('feature', 'Bestand: Bitte eine Bierbibliothek', 'base', 'iOS · App'),
      ('bug', 'Bestand: Swipe hängt manchmal', 'base', 'Android · Browser');
    update public.feedback set processed_at = now(), issue_number = 1 where message like 'Bestand: Swipe%';
  end if;
  if to_regclass('public.beer_submissions') is not null then
    insert into public.beer_submissions (brewery_id, brewery_name, beer_name, style, abv)
      select id, name, 'Bestand Kellerbier', 'Kellerbier', 5.2 from public.breweries order by id limit 1;
    insert into public.beer_submissions (brewery_name, brewery_place, link)
      values ('Bestand Hinterhofbräu', '74906 Bad Rappenau', 'https://hinterhof.example/biere');
  end if;
end $$;
