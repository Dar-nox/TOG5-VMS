-- Saving an expense, and the checks that stop the totals lying.
--
-- Ported from the expense tests in src-tauri/src/expenses/repository.rs. The
-- link between an expense and the record it duplicates is the one worth
-- guarding: get it wrong and a real cost quietly disappears from the reports
-- instead of raising anything.

-- Archiving now asks who is calling, so these tests need to be somebody.
--
-- The rest of this file runs as the superuser and bypasses row level security,
-- which is why it never needed an account before. `archive_*` runs as the
-- definer with the policies switched off, so it checks the caller itself, and
-- that check reads `auth.uid()` — which is nobody at all unless a claim is set.
insert into auth.users (id, email, raw_user_meta_data)
values ('d0000000-0000-0000-0000-0000000000ff', 'archiver@tog5.test',
        '{"display_name": "Test Archiver"}'::jsonb);

set request.jwt.claim.sub = 'd0000000-0000-0000-0000-0000000000ff';

do $$
declare
  van uuid;
  other_van uuid;
  fuel uuid;
  other_fuel uuid;
  saved uuid;
  row_out record;
begin
  insert into public.vehicles (vehicle_name, vehicle_type, fuel_type, current_odometer)
  values ('Expense Van', 'van', 'diesel', 8000) returning id into van;
  insert into public.vehicles (vehicle_name, vehicle_type, fuel_type, current_odometer)
  values ('Other Van', 'van', 'diesel', 200) returning id into other_van;

  insert into public.fuel_logs
    (vehicle_id, fuel_date, odometer, fuel_type, liters, total_amount, is_full_tank)
  values (van, '2026-05-01'::timestamptz, 8000, 'diesel', 40, 2000, true) returning id into fuel;
  insert into public.fuel_logs
    (vehicle_id, fuel_date, odometer, fuel_type, liters, total_amount, is_full_tank)
  values (other_van, '2026-05-01'::timestamptz, 200, 'diesel', 30, 1500, true)
  returning id into other_fuel;

  -- ----------------------------------------------------------------------
  -- A category is stored as a slug, whatever was typed
  -- ----------------------------------------------------------------------
  saved := public.save_expense(
    vehicle_id => van,
    expense_date => '2026-05-02',
    category => '  Toll Fees / Expressway  ',
    description => '  SLEX and Skyway  ',
    amount => 320
  );

  select * into row_out from public.expenses where id = saved;
  assert row_out.category = 'toll_fees_expressway',
    'the category should be a slug, got: ' || row_out.category;
  assert row_out.description = 'SLEX and Skyway',
    'the description should be trimmed, got: ' || row_out.description;

  -- ----------------------------------------------------------------------
  -- What is refused, in words somebody can act on
  -- ----------------------------------------------------------------------
  declare
    attempt record;
  begin
    for attempt in
      select * from (values
        ('', 'Parking', 100, 'Expense category is required.'),
        ('///', 'Parking', 100, 'Expense category needs at least one letter or number.'),
        ('parking', '   ', 100, 'Expense description is required.'),
        ('parking', 'Parking', -1, 'Expense amount cannot be negative.')
      ) as t(category, description, amount, expected)
    loop
      begin
        perform public.save_expense(
          vehicle_id => van,
          expense_date => '2026-05-02',
          category => attempt.category,
          description => attempt.description,
          amount => attempt.amount
        );
        assert false, 'should have been refused: ' || attempt.expected;
      exception when others then
        assert sqlerrm = attempt.expected,
          'expected "' || attempt.expected || '", got "' || sqlerrm || '"';
      end;
    end loop;
  end;

  -- ----------------------------------------------------------------------
  -- A link must point at this vehicle's record
  -- ----------------------------------------------------------------------
  begin
    perform public.save_expense(
      vehicle_id => van, expense_date => '2026-05-02', category => 'fuel',
      description => 'Same diesel', amount => 2000,
      related_record_type => 'fuel_log', related_record_id => other_fuel
    );
    assert false, 'a link to another vehicle''s fuel log should have been refused';
  exception when others then
    assert sqlerrm = 'Related record was not found for the selected vehicle.',
      'unexpected message: ' || sqlerrm;
  end;

  begin
    perform public.save_expense(
      vehicle_id => van, expense_date => '2026-05-02', category => 'fuel',
      description => 'Same diesel', amount => 2000,
      related_record_id => fuel
    );
    assert false, 'a link with no kind should have been refused';
  exception when others then
    assert sqlerrm = 'Choose what kind of record this expense links to.',
      'unexpected message: ' || sqlerrm;
  end;

  begin
    perform public.save_expense(
      vehicle_id => van, expense_date => '2026-05-02', category => 'fuel',
      description => 'Same diesel', amount => 2000,
      related_record_type => 'fuel_log'
    );
    assert false, 'a kind with no record should have been refused';
  exception when others then
    assert sqlerrm = 'Enter the related record ID or leave the link blank.',
      'unexpected message: ' || sqlerrm;
  end;

  -- A good link saves, and the reports leave it out of the totals.
  declare
    linked uuid;
    total numeric;
  begin
    linked := public.save_expense(
      vehicle_id => van, expense_date => '2026-05-01', category => 'fuel',
      description => 'The diesel, typed in again', amount => 2000,
      related_record_type => 'fuel_log', related_record_id => fuel
    );
    assert linked is not null, 'a link to this vehicle''s own fuel log should be allowed';

    select total_cost into total from public.vehicle_cost_summary() where vehicle_id = van;
    assert total = 2320,
      'the re-typed fuel must not be added on top of the fuel log, got ' || total;
  end;

  -- 'other' points at nothing in particular, and is allowed to.
  begin
    perform public.save_expense(
      vehicle_id => van, expense_date => '2026-05-03', category => 'misc',
      description => 'Car wash', amount => 150,
      related_record_type => 'other',
      related_record_id => '00000000-0000-0000-0000-000000000000'
    );
  end;

  -- ----------------------------------------------------------------------
  -- An expense stays with its vehicle
  -- ----------------------------------------------------------------------
  begin
    perform public.save_expense(
      expense_id => saved, vehicle_id => other_van, expense_date => '2026-05-02',
      category => 'tolls', description => 'SLEX and Skyway', amount => 320
    );
    assert false, 'moving an expense to another vehicle should have been refused';
  exception when others then
    assert sqlerrm = 'Expense vehicle cannot be changed after saving.',
      'unexpected message: ' || sqlerrm;
  end;

  -- Editing everything else works.
  perform public.save_expense(
    expense_id => saved, vehicle_id => van, expense_date => '2026-05-04',
    category => 'tolls', description => 'SLEX only', amount => 200
  );

  select * into row_out from public.expenses where id = saved;
  assert row_out.amount = 200, 'the amount should have changed';
  assert row_out.category = 'tolls', 'the category should have changed';

  -- ----------------------------------------------------------------------
  -- Archiving, twice
  -- ----------------------------------------------------------------------
  perform public.archive_expense(saved);
  assert not exists (select 1 from public.expenses_detailed where id = saved),
    'an archived expense should be out of the list';

  begin
    perform public.archive_expense(saved);
    assert false, 'archiving twice should say so rather than pretend it worked';
  exception when others then
    assert sqlerrm = 'Expense was not found or is already archived.',
      'unexpected message: ' || sqlerrm;
  end;

  -- A receipt has to belong to the vehicle it is filed against.
  declare
    stray uuid;
  begin
    insert into public.vehicle_documents (vehicle_id, document_type, storage_path)
    values (other_van, 'expense_receipt', 'fuel-receipts/stray.png') returning id into stray;

    perform public.save_expense(
      vehicle_id => van, expense_date => '2026-05-05', category => 'misc',
      description => 'With somebody else''s receipt', amount => 50,
      receipt_document_id => stray
    );
    assert false, 'a receipt from another vehicle should have been refused';
  exception when others then
    assert sqlerrm = 'Choose a receipt saved for the selected vehicle.',
      'unexpected message: ' || sqlerrm;
  end;
end $$;

select 'expenses are checked the way the desktop app checked them' as result;
