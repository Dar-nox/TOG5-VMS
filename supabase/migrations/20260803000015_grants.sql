-- Table and function grants.
--
-- Row level security decides *which rows* somebody may see. Grants decide
-- whether the role may touch the table at all, and Postgres checks the grant
-- first. Without these, every request comes back "permission denied" however
-- correct the policies are.
--
-- This was missed for an embarrassing reason worth recording: the local test
-- harness applies its own grants from tests/local_grants.sql, so the whole
-- suite passed while the real project rejected every request. A test
-- environment that differs from production in a way production depends on
-- will hide exactly this class of problem.

grant usage on schema public to anon, authenticated, service_role;

-- anon gets nothing but the ability to ask. Every policy requires an active
-- profile, so a caller who is not signed in still sees nothing — this just
-- makes the refusal come from the policy rather than from the grant, which is
-- what lets the app tell "signed out" apart from "broken".
grant select on all tables in schema public to anon;

grant select, insert, update, delete on all tables in schema public
  to authenticated, service_role;

grant execute on all functions in schema public to anon, authenticated, service_role;

-- Anything added later gets the same treatment, so a new table is not a new
-- outage.
alter default privileges in schema public
  grant select on tables to anon;
alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated, service_role;
alter default privileges in schema public
  grant execute on functions to anon, authenticated, service_role;
