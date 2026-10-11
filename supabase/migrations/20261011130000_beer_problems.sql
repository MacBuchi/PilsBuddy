-- PilsBuddy V2: „Problem melden“ at every beer (Stufe V, Wunsch 2026-10-11).
-- Reports reuse the anonymous feedback inbox (tool/feedback_bot.py → public GitHub issue, label `bier-problem`):
-- type `beer` plus which beer and what is wrong. Nothing about the person, as for feedback.
-- The maintainer confirms a report on a regional beer with the label `ausblenden`; the bot then sets
-- regional_beers.hidden – the catalogue import never touches that column, so the beer stays hidden on the next import.
-- Released clients: they never send type `beer`, and hidden rows simply disappear from their queries.

alter table public.feedback drop constraint feedback_type_check;
alter table public.feedback add constraint feedback_type_check check (type in ('feature', 'bug', 'beer'));

alter table public.feedback
  -- curated id (`jever-pilsener`) or regional id (`r-…`), charset of ratings.beer_id
  add column beer_id text check (beer_id ~ '^[a-z0-9-]{1,60}$'),
  add column beer_name text check (char_length(beer_name) between 1 and 200),
  add column problem text check (problem in ('not_a_beer', 'not_exists', 'wrong_values', 'wrong_brewery', 'duplicate', 'other')),
  add constraint feedback_beer_fields check ((type = 'beer') = (beer_id is not null and beer_name is not null and problem is not null));

grant insert (beer_id, beer_name, problem) on public.feedback to anon, authenticated;

comment on column public.feedback.problem is 'V2 beer reports: not_a_beer · not_exists · wrong_values · wrong_brewery · duplicate · other';

alter table public.regional_beers add column hidden boolean not null default false;
comment on column public.regional_beers.hidden is
  'V2: hidden after a confirmed problem report (label `ausblenden`, tool/feedback_bot.py); never set by the import';

drop policy "published regional beers are public" on public.regional_beers;
create policy "published regional beers are public"
  on public.regional_beers for select
  to anon, authenticated
  using (published and not hidden);
