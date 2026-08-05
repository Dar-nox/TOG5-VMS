-- Settings, and letting people in.
--
-- Ported from the settings tests in src-tauri/src/settings/repository.rs, plus
-- the rules that only exist because the app is reachable from anywhere now.

insert into auth.users (id, email, raw_user_meta_data)
values
  ('d0000000-0000-0000-0000-000000000001', 'owner@tog5.test',
   '{"display_name": "Ana Cruz"}'::jsonb),
  ('d0000000-0000-0000-0000-000000000002', 'maria@tog5.test',
   '{"display_name": "Maria Santos"}'::jsonb);

-- ---------------------------------------------------------------------------
-- Settings, as the owner
-- ---------------------------------------------------------------------------
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'd0000000-0000-0000-0000-000000000001';

  do $$
  declare
    saved jsonb;
    settings jsonb;
  begin
    settings := public.app_settings();
    assert settings ->> 'preferredCurrency' = 'PHP', 'the currency should start as PHP';
    assert (settings ->> 'defaultDueSoonDays')::integer = 14, 'and warn days at 14';

    -- The whole screen in one call.
    saved := public.settings_overview();
    -- A profile row comes back with its column names; the client turns
    -- display_name into displayName on the way in.
    assert saved -> 'activeUser' ->> 'display_name' = 'Ana Cruz',
      'the overview should say who is signed in';
    assert saved -> 'backupReminder' ->> 'message' like 'No export has been taken yet%',
      'and that no export has been taken, got: '
        || (saved -> 'backupReminder' ->> 'message');
    assert (saved -> 'backupReminder' ->> 'reminderDue')::boolean,
      'which is itself a reason to take one';

    settings := jsonb_set(settings, '{preferredCurrency}', '"usd"');
    settings := jsonb_set(settings, '{defaultDueSoonDays}', '30');
    saved := public.update_app_settings(settings);

    assert saved -> 'settings' ->> 'preferredCurrency' = 'USD',
      'a currency should be stored upper case, got: '
        || (saved -> 'settings' ->> 'preferredCurrency');
    assert (saved -> 'settings' ->> 'defaultDueSoonDays')::integer = 30,
      'the warn days should have changed';

    saved := public.reset_app_settings();
    assert saved -> 'settings' ->> 'preferredCurrency' = 'PHP',
      'resetting should put the currency back';
  end $$;

  -- What is refused, in words somebody can act on.
  do $$
  declare
    attempt record;
    settings jsonb;
  begin
    for attempt in
      select * from (values
        ('{preferredCurrency}', '"PHPX"',
         'Preferred currency must be a 3-letter code such as PHP.'),
        ('{defaultDueSoonDays}', '-1', 'Default due-soon days cannot be negative.'),
        ('{defaultDueSoonKm}', '-1', 'Default due-soon kilometers cannot be negative.'),
        ('{backupReminderIntervalDays}', '0',
         'Backup reminder interval must be at least 1 day.'),
        ('{distanceUnit}', '"leagues"', 'Choose a valid distance unit.')
      ) as t(path, value, expected)
    loop
      settings := jsonb_set(public.app_settings(), attempt.path::text[], attempt.value::jsonb);

      begin
        perform public.update_app_settings(settings);
        assert false, 'should have been refused: ' || attempt.expected;
      exception when others then
        assert sqlerrm = attempt.expected,
          'expected "' || attempt.expected || '", got "' || sqlerrm || '"';
      end;
    end loop;
  end $$;
rollback;

-- ---------------------------------------------------------------------------
-- Settings, as somebody who is not the owner
-- ---------------------------------------------------------------------------
update public.profiles set status = 'active'
where id = 'd0000000-0000-0000-0000-000000000002';

begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'd0000000-0000-0000-0000-000000000002';

  do $$
  begin
    begin
      perform public.update_app_settings(public.app_settings());
      assert false, 'a manager must not be able to change the settings';
    exception when others then
      assert sqlerrm = 'Only the owner can change these settings.',
        'unexpected message: ' || sqlerrm;
    end;

    -- A manager may still rename themselves.
    perform public.update_user(
      user_id => 'd0000000-0000-0000-0000-000000000002', display_name => 'Maria S.'
    );
    assert (select display_name from public.profiles
            where id = 'd0000000-0000-0000-0000-000000000002') = 'Maria S.',
      'anyone should be able to fix their own name';

    -- But not promote themselves, which is the whole point of having an owner.
    begin
      perform public.update_user(
        user_id => 'd0000000-0000-0000-0000-000000000002', role => 'owner'
      );
      assert false, 'a manager must not be able to promote themselves';
    exception when others then
      assert sqlerrm = 'Only the owner can change roles and access.',
        'unexpected message: ' || sqlerrm;
    end;

    begin
      perform public.update_user(
        user_id => 'd0000000-0000-0000-0000-000000000001', display_name => 'Not Ana'
      );
      assert false, 'a manager must not be able to rename somebody else';
    exception when others then
      assert sqlerrm = 'Only the owner can change other people''s accounts.',
        'unexpected message: ' || sqlerrm;
    end;
  end $$;
rollback;

-- ---------------------------------------------------------------------------
-- Letting people in, and never locking everybody out
-- ---------------------------------------------------------------------------
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'd0000000-0000-0000-0000-000000000001';

  do $$
  declare
    updated public.profiles;
  begin
    assert (select count(*) from public.list_users()) = 2,
      'both accounts should be listed';

    -- Back to how a new sign-up arrives.
    perform public.update_user(
      user_id => 'd0000000-0000-0000-0000-000000000002', status => 'pending'
    );

    -- Somebody waiting comes first in the list, because they are the thing
    -- needing a decision.
    assert (select id from public.list_users() limit 1)
           = 'd0000000-0000-0000-0000-000000000002',
      'the account waiting to be let in should be at the top';

    updated := public.update_user(
      user_id => 'd0000000-0000-0000-0000-000000000002', status => 'active'
    );
    assert updated.status = 'active', 'the owner should be able to let somebody in';

    updated := public.update_user(
      user_id => 'd0000000-0000-0000-0000-000000000002', role => 'viewer'
    );
    assert updated.role = 'viewer', 'and change what they may do';

    -- The last owner cannot step down or switch themselves off. Somebody has
    -- to be able to let the next person in.
    begin
      perform public.update_user(
        user_id => 'd0000000-0000-0000-0000-000000000001', role => 'manager'
      );
      assert false, 'the last owner must not be able to demote themselves';
    exception when others then
      assert sqlerrm = 'There has to be one owner. Make somebody else an owner first.',
        'unexpected message: ' || sqlerrm;
    end;

    begin
      perform public.update_user(
        user_id => 'd0000000-0000-0000-0000-000000000001', status => 'inactive'
      );
      assert false, 'the last owner must not be able to switch themselves off';
    exception when others then
      assert sqlerrm = 'There has to be one owner. Make somebody else an owner first.',
        'unexpected message: ' || sqlerrm;
    end;

    -- With a second owner in place, the first may step back.
    perform public.update_user(
      user_id => 'd0000000-0000-0000-0000-000000000002', role => 'owner', status => 'active'
    );
    updated := public.update_user(
      user_id => 'd0000000-0000-0000-0000-000000000001', role => 'manager'
    );
    assert updated.role = 'manager', 'a second owner should free the first to step back';
  end $$;
rollback;

-- ---------------------------------------------------------------------------
-- Exports are remembered, because nothing else takes a copy
-- ---------------------------------------------------------------------------
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'd0000000-0000-0000-0000-000000000001';

  do $$
  declare
    status jsonb;
  begin
    perform public.record_data_export('{"vehicles": 12}'::jsonb);

    status := public.backup_reminder_status();
    assert status ->> 'latestBackupCompletedAt' is not null,
      'the export should have been recorded';
    assert (status ->> 'daysSinceLatestBackup')::integer = 0, 'and be today';
    assert not (status ->> 'reminderDue')::boolean,
      'so no reminder is due yet';
    assert status ->> 'message' like 'Last export was 0 days ago%',
      'unexpected message: ' || (status ->> 'message');
  end $$;
rollback;

select 'settings and accounts behave as intended' as result;
