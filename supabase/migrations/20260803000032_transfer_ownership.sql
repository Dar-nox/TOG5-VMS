-- Handing the fleet to somebody else.
--
-- The first account to sign up is the owner and there has been no way to change
-- that. `update_user` refuses to remove the last owner — correctly, since an
-- owner is the only account that can let people in — so the only route was to
-- promote somebody and then demote yourself, two calls, with a window in
-- between where the fleet has two owners and a failed second call leaves it
-- that way for good.
--
-- More to the point, nobody would find that route. If the person holding the
-- owner account leaves the company, the honest answer today is a hand-written
-- UPDATE against the production database, which is not an answer.
--
-- One call, one transaction, and the promotion happens before the demotion so
-- the "there has to be one owner" rule is never momentarily false.

create or replace function public.transfer_ownership(new_owner_id uuid)
returns setof public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  caller uuid := auth.uid();
  target public.profiles;
begin
  if not public.is_owner() then
    raise exception 'Only the owner can hand the fleet to somebody else.';
  end if;

  if new_owner_id = caller then
    raise exception 'You are already the owner.';
  end if;

  select p.* into target from public.profiles p
  where p.id = transfer_ownership.new_owner_id and p.deleted_at is null;

  if target.id is null then
    raise exception 'That account was not found.';
  end if;

  -- A pending account cannot see a single row, so handing it the fleet would
  -- leave nobody able to approve anybody — including themselves.
  if target.status <> 'active' then
    raise exception 'Let % in first. An account that is not active cannot own the fleet.',
      target.display_name;
  end if;

  update public.profiles set role = 'owner', updated_at = now()
  where id = transfer_ownership.new_owner_id;

  -- Manager rather than viewer: the two are identical today, and manager is
  -- what somebody who has been running the fleet would expect to keep.
  update public.profiles set role = 'manager', updated_at = now()
  where id = caller;

  return query select p.* from public.list_users() p;
end;
$$;

revoke execute on function public.transfer_ownership(uuid) from anon;

comment on function public.transfer_ownership is
  'Promotes somebody to owner and demotes the caller, in that order, in one transaction.';
