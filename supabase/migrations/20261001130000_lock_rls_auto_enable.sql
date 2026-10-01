-- The hosted project ships an event-trigger function public.rls_auto_enable() (project option
-- "enable RLS automatically"). It sits in the exposed schema, so the advisors flag it as callable via
-- /rest/v1/rpc. Event triggers fire without EXECUTE on the API roles, so revoking is safe.
-- The function does not exist in the local stack – hence the guard.
do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
  end if;
end;
$$;
