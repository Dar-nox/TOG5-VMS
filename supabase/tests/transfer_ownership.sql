-- Handing the fleet to somebody else.
--
-- The rule this has to keep is the one `update_user` already enforces: there is
-- always exactly one active owner. A transfer breaks it twice in a row, once in
-- each direction, so what matters is that no moment in between is observable
-- and that nothing half-finishes.

insert into auth.users (id, email, raw_user_meta_data)
values
  ('d0000000-0000-0000-0000-000000000001', 'ana@tog5.test',
   '{"display_name": "Ana Cruz"}'::jsonb),
  ('d0000000-0000-0000-0000-000000000002', 'maria@tog5.test',
   '{"display_name": "Maria Santos"}'::jsonb),
  ('d0000000-0000-0000-0000-000000000003', 'joel@tog5.test',
   '{"display_name": "Joel Reyes"}'::jsonb);

-- Maria is let in; Joel is left waiting, which is what a new sign-up looks like.
update public.profiles set status = 'active'
where id = 'd0000000-0000-0000-0000-000000000002';

-- ---------------------------------------------------------------------------
-- The transfer itself
-- ---------------------------------------------------------------------------
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'd0000000-0000-0000-0000-000000000001';

  do $$
  declare
    people public.profiles[];
  begin
    assert public.is_owner(), 'the first account should start as the owner';

    select array_agg(p) into people
    from public.transfer_ownership('d0000000-0000-0000-0000-000000000002') p;

    assert array_length(people, 1) = 3, 'the whole list should come back, got '
      || coalesce(array_length(people, 1), 0);

    assert (select role from public.profiles
            where id = 'd0000000-0000-0000-0000-000000000002') = 'owner',
      'Maria should now be the owner';

    assert (select role from public.profiles
            where id = 'd0000000-0000-0000-0000-000000000001') = 'manager',
      'and Ana should have stepped down to manager';

    -- The invariant, stated directly.
    assert (select count(*) from public.profiles
            where role = 'owner' and status = 'active' and deleted_at is null) = 1,
      'there should still be exactly one active owner';

    assert not public.is_owner(), 'and the caller should no longer be one';
  end $$;
rollback;

-- ---------------------------------------------------------------------------
-- What is refused
-- ---------------------------------------------------------------------------
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'd0000000-0000-0000-0000-000000000001';

  do $$
  declare
    refused boolean;
    message text;
  begin
    -- Joel is still pending. An account that cannot see a row cannot approve
    -- anybody, so handing him the fleet would strand it.
    refused := false;
    begin
      perform public.transfer_ownership('d0000000-0000-0000-0000-000000000003');
    exception when others then
      refused := true; message := sqlerrm;
    end;
    assert refused, 'a pending account should not be handed the fleet';
    assert message = 'Let Joel Reyes in first. An account that is not active cannot own the fleet.',
      'and the refusal should name them, got: ' || coalesce(message, '(none)');

    refused := false;
    begin
      perform public.transfer_ownership('d0000000-0000-0000-0000-000000000001');
    exception when others then
      refused := true; message := sqlerrm;
    end;
    assert refused, 'handing it to yourself should be refused rather than quietly demoting you';

    refused := false;
    begin
      perform public.transfer_ownership('d0000000-0000-0000-0000-0000000000ff');
    exception when others then
      refused := true; message := sqlerrm;
    end;
    assert refused, 'an account that does not exist should be an error';
    assert message = 'That account was not found.',
      'got: ' || coalesce(message, '(none)');

    -- Nothing above should have changed anything.
    assert (select role from public.profiles
            where id = 'd0000000-0000-0000-0000-000000000001') = 'owner',
      'a refused transfer must leave the owner where they were';
  end $$;
rollback;

-- ---------------------------------------------------------------------------
-- Only an owner may hand it over
-- ---------------------------------------------------------------------------
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'd0000000-0000-0000-0000-000000000002';

  do $$
  declare
    refused boolean := false;
    message text;
  begin
    begin
      perform public.transfer_ownership('d0000000-0000-0000-0000-000000000002');
    exception when others then
      refused := true; message := sqlerrm;
    end;

    assert refused, 'a manager should not be able to make themselves the owner';
    assert message = 'Only the owner can hand the fleet to somebody else.',
      'got: ' || coalesce(message, '(none)');
  end $$;
rollback;

-- ---------------------------------------------------------------------------
-- And afterwards the new owner can do it again
-- ---------------------------------------------------------------------------
--
-- The failure worth catching here is a transfer that works once. If the
-- demotion left anything stale, the second hop is where it shows.
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'd0000000-0000-0000-0000-000000000001';
  select count(*) from public.transfer_ownership('d0000000-0000-0000-0000-000000000002');

  set local request.jwt.claim.sub = 'd0000000-0000-0000-0000-000000000002';

  do $$
  begin
    assert public.is_owner(), 'Maria should be able to act as the owner straight away';

    perform public.transfer_ownership('d0000000-0000-0000-0000-000000000001');

    assert (select role from public.profiles
            where id = 'd0000000-0000-0000-0000-000000000001') = 'owner',
      'and hand it back';
    assert (select count(*) from public.profiles
            where role = 'owner' and status = 'active' and deleted_at is null) = 1,
      'still exactly one owner after two transfers';
  end $$;
rollback;

select 'the fleet can change hands without stranding itself' as result;
