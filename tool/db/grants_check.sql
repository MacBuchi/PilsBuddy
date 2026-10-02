-- Rights the publishable key cannot see from outside, checked inside the database (Q1, pattern: TrailBuddy
-- tool/grants_check.sql). Runs in CI after the upgrade path (live-like default privileges) and on a fresh stack.
--
-- A new table must be listed here – with the rights the API roles get – or this check fails. That is the point:
-- whoever adds a table decides consciously what anon/authenticated may do with it.
--   psql "$DB_URL" -v ON_ERROR_STOP=1 -f tool/db/grants_check.sql
do $$
declare
  problems text := '';
  r record;
begin
  -- 1. every table in public has row level security
  for r in select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
           where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity loop
    problems := problems || format(E'\n  %s: RLS ist aus', r.relname);
  end loop;

  -- 2. table-wide rights of the API roles: exactly this list, nothing else
  --    (REFERENCES/TRIGGER/MAINTAIN are not reachable through the API and stay out of it)
  for r in
    with allowed(tbl, role, priv) as (values
      ('beers', 'anon', 'SELECT'), ('beers', 'authenticated', 'SELECT'),
      ('breweries', 'anon', 'SELECT'), ('breweries', 'authenticated', 'SELECT'),
      ('regional_beers', 'anon', 'SELECT'), ('regional_beers', 'authenticated', 'SELECT'),
      ('places', 'anon', 'SELECT'), ('places', 'authenticated', 'SELECT'),
      ('beer_sources', 'anon', 'SELECT'), ('beer_sources', 'authenticated', 'SELECT'),
      ('profiles', 'authenticated', 'SELECT'), ('profiles', 'authenticated', 'INSERT'),
      ('profiles', 'authenticated', 'UPDATE'), ('profiles', 'authenticated', 'DELETE'),
      ('ratings', 'authenticated', 'SELECT'), ('ratings', 'authenticated', 'INSERT'),
      ('ratings', 'authenticated', 'UPDATE'), ('ratings', 'authenticated', 'DELETE')
    )
    select g.table_name, g.grantee, g.privilege_type from information_schema.role_table_grants g
    where g.table_schema = 'public' and g.grantee in ('anon', 'authenticated')
      and g.privilege_type in ('SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE')
      and (g.table_name, g.grantee, g.privilege_type) not in (select tbl, role, priv from allowed)
    order by 1, 2, 3
  loop
    problems := problems || format(E'\n  %s: %s darf %s (nicht vorgesehen – Migration mit revoke, oder hier freigeben)',
      r.table_name, r.grantee, r.privilege_type);
  end loop;

  -- 3. column grants: only the insert columns of the two anonymous inboxes
  for r in
    select c.table_name, c.grantee, c.privilege_type, c.column_name from information_schema.column_privileges c
    where c.table_schema = 'public' and c.grantee in ('anon', 'authenticated')
      and c.privilege_type in ('SELECT', 'INSERT', 'UPDATE')
      and not exists (select 1 from information_schema.role_table_grants g where g.table_schema = 'public'
                      and g.table_name = c.table_name and g.grantee = c.grantee and g.privilege_type = c.privilege_type)
      and not (c.privilege_type = 'INSERT' and (
        (c.table_name = 'feedback' and c.column_name in ('type', 'message', 'app_version', 'platform')) or
        (c.table_name = 'beer_submissions' and c.column_name in ('brewery_id', 'brewery_name', 'brewery_place', 'link',
          'beer_name', 'style', 'abv', 'note', 'app_version', 'platform'))))
    order by 1, 2, 3, 4
  loop
    problems := problems || format(E'\n  %s.%s: %s darf %s', r.table_name, r.column_name, r.grantee, r.privilege_type);
  end loop;
  if not has_column_privilege('anon', 'public.feedback', 'message', 'insert')
     or not has_column_privilege('anon', 'public.beer_submissions', 'brewery_name', 'insert') then
    problems := problems || E'\n  anon kann kein Feedback / keine Bier-Meldung mehr schicken';
  end if;

  -- 4. future tables: no rights for the API roles by default (the live project used to hand out everything)
  for r in select a.defaclacl::text as acl from pg_default_acl a join pg_namespace n on n.oid = a.defaclnamespace
           where n.nspname = 'public' and a.defaclobjtype = 'r' and pg_get_userbyid(a.defaclrole) = 'postgres'
             and (a.defaclacl::text ~ '(^|[{,])(anon|authenticated)=[^/]*[arwdD]') loop
    problems := problems || format(E'\n  Standardrechte für neue Tabellen geben anon/authenticated noch Rechte: %s', r.acl);
  end loop;

  -- 5. what the server side needs (service key: feedback/beer bots, sync-code edge function)
  for r in
    select * from (values
      ('feedback', 'select'), ('feedback', 'update'), ('feedback', 'delete'),
      ('beer_submissions', 'select'), ('beer_submissions', 'update'), ('beer_submissions', 'delete'),
      ('breweries', 'select'), ('breweries', 'insert'), ('breweries', 'update'),
      ('regional_beers', 'select'), ('regional_beers', 'insert'), ('regional_beers', 'update'),
      ('places', 'select'),
      ('sync_codes', 'select'), ('sync_codes', 'insert'), ('sync_codes', 'update'), ('sync_codes', 'delete')
    ) as need(tbl, priv)
    where not has_table_privilege('service_role', 'public.' || tbl, priv)
  loop
    problems := problems || format(E'\n  service_role fehlt %s auf %s', r.priv, r.tbl);
  end loop;

  if problems <> '' then
    raise exception 'grants_check:%', problems;
  end if;
  raise notice 'grants_check: ok';
end $$;
