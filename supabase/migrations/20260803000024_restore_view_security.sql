-- alerts_detailed was reachable by anyone holding the public key.
--
-- A view runs as its owner unless it is marked security_invoker, and its owner
-- is postgres, which is subject to no policy at all. So the view answered
-- everybody: signed out, with nothing but the key that ships inside the app, a
-- caller got every alert in the fleet — vehicle names, what was overdue, all of
-- it — while the alerts table underneath correctly returned nothing.
--
-- It was set correctly when the view was first written. Migration 019 replaced
-- the view to add a column and did not carry the setting over, which is the
-- whole problem with `create or replace view`: it silently drops what it is
-- not told to keep.
--
-- Set on every view rather than the one that broke, because being right about
-- this one view is worth less than never having to check again.

do $$
declare
  view_name text;
begin
  for view_name in
    select c.relname
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'v'
  loop
    execute format('alter view public.%I set (security_invoker = on)', view_name);
  end loop;
end $$;
