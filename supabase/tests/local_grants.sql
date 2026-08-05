-- Table grants, which Supabase applies for you and a plain Postgres does not.
-- Apply after the migrations. RLS is what actually decides access; these
-- grants only get the roles as far as the policies.

grant usage on schema public to anon, authenticated, service_role;

grant select, insert, update, delete on all tables in schema public
  to authenticated, service_role;
grant select on all tables in schema public to anon;

grant execute on all functions in schema public to anon, authenticated, service_role;
