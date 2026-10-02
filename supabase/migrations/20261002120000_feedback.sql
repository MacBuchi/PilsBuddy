-- PilsBuddy: in-app feedback („Wünsch dir was!“) → public GitHub issues via tool/feedback_bot.py.
-- Anonymous on purpose: no account, no user id – the app sends text, type, app version and a coarse
-- platform, nothing else. Write-only for the API; only the bot (service_role) reads.
-- Spam guard: a global rate limit and no identical text twice a day (trigger below).

create table public.feedback (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('feature', 'bug')),
  message text not null check (char_length(btrim(message)) between 3 and 2000),
  -- build id of the web app (commit), e.g. „a74e951“
  app_version text check (char_length(app_version) <= 40),
  -- coarse: „iOS · App“, „Android · Browser“, „macOS · Browser“ – never the full user agent
  platform text check (char_length(platform) <= 40),
  created_at timestamptz not null default now(),
  -- set by the bot once the issue exists (idempotency); rows are deleted 30 days later
  processed_at timestamptz,
  issue_number integer
);

comment on table public.feedback is 'In-app feedback, turned into GitHub issues by tool/feedback_bot.py. Anonymous, write-only via API.';

create index feedback_unprocessed on public.feedback (created_at) where processed_at is null;

-- ---------------------------------------------------------------------------------------------
-- spam guard: at most 30 messages per 10 minutes overall, the same text only once per day
-- ---------------------------------------------------------------------------------------------

create function public.feedback_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.created_at := now();
  new.processed_at := null;
  new.issue_number := null;
  new.message := btrim(new.message);
  if (select count(*) from public.feedback where created_at > now() - interval '10 minutes') >= 30 then
    raise exception 'feedback rate limit' using errcode = 'P0001', hint = 'later';
  end if;
  if exists (select 1 from public.feedback where message = new.message and created_at > now() - interval '1 day') then
    raise exception 'feedback duplicate' using errcode = 'P0001', hint = 'duplicate';
  end if;
  return new;
end;
$$;

revoke execute on function public.feedback_guard() from public, anon, authenticated;

create trigger feedback_guard before insert on public.feedback
  for each row execute function public.feedback_guard();

-- ---------------------------------------------------------------------------------------------
-- row level security: anyone may add feedback, nobody reads it through the API
-- ---------------------------------------------------------------------------------------------

alter table public.feedback enable row level security;

create policy "anyone can send feedback"
  on public.feedback for insert
  to anon, authenticated
  with check (processed_at is null and issue_number is null);

-- column grants: the client can only fill these four fields (the bot uses service_role)
grant insert (type, message, app_version, platform) on public.feedback to anon, authenticated;
grant all on public.feedback to service_role;
