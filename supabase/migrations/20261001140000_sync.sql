-- PilsBuddy B2: device sync.
-- * ratings.deleted: an undo/reset on one device must reach the others, so removals are tombstones
--   (rating keeps its last value, `at` is the removal time; "newest at wins" also for deletes).
-- * sync_codes: one long-lived code per user that signs another device into the same anonymous
--   account. Only the sha-256 hash is stored; the table is reachable by the `sync-code` edge
--   function (service role) only – no grants, no policies for the API roles.

alter table public.ratings add column deleted boolean not null default false;

create table public.sync_codes (
  user_id uuid primary key references auth.users (id) on delete cascade,
  code_hash text not null unique check (code_hash ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);

comment on table public.sync_codes is 'Sync-Code per user (hash only); used by the sync-code edge function.';

alter table public.sync_codes enable row level security;
revoke all on public.sync_codes from anon, authenticated;
-- the edge function works as service_role (bypasses RLS, but still needs table privileges)
grant select, insert, update, delete on public.sync_codes to service_role;
