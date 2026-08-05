-- Saving an expense.
--
-- Ported from normalize_expense_request and its four ensure_* helpers in
-- src-tauri/src/expenses/repository.rs. These ran in Rust before the desktop
-- app wrote anything; a phone reaches the table directly now, so they run here
-- or they do not run.
--
-- The one that matters most is the link check. An expense may point at a fuel
-- log, a service record or a repair to say "this is that cost, typed in
-- again", and the reports then leave it out so nothing is counted twice. A
-- link pointing at another vehicle's record — or at nothing — would quietly
-- subtract a real cost from the totals.

-- Same slug treatment the desktop app gave categories, with its own limit and
-- its own wording. The client invents their own categories, so this is
-- deliberately not a fixed list.
create or replace function public.normalize_expense_category(value text)
returns text
language plpgsql
immutable
as $$
declare
  slug text;
begin
  if nullif(trim(coalesce(value, '')), '') is null then
    raise exception 'Expense category is required.';
  end if;

  slug := trim(both '_' from regexp_replace(lower(value), '[^a-z0-9]+', '_', 'g'));

  if slug = '' then
    raise exception 'Expense category needs at least one letter or number.';
  end if;

  if length(slug) > 60 then
    raise exception 'Expense category is too long. Use 60 characters or fewer.';
  end if;

  return slug;
end;
$$;

-- One function for both new and existing expenses: the checks are identical,
-- and having written them twice in the desktop app is how the double-counting
-- rule ended up with three implementations.
create or replace function public.save_expense(
  vehicle_id uuid,
  expense_date date,
  category text,
  description text,
  amount numeric,
  expense_id uuid default null,
  receipt_document_id uuid default null,
  related_record_type text default null,
  related_record_id uuid default null,
  notes text default null
)
returns uuid
language plpgsql
as $$
declare
  slug text;
  clean_description text;
  existing record;
  linked boolean;
  saved_id uuid;
begin
  if save_expense.vehicle_id is null then
    raise exception 'Choose a vehicle for the expense.';
  end if;

  if save_expense.expense_date is null then
    raise exception 'Expense date is required.';
  end if;

  slug := public.normalize_expense_category(save_expense.category);

  clean_description := nullif(trim(coalesce(save_expense.description, '')), '');
  if clean_description is null then
    raise exception 'Expense description is required.';
  end if;

  if save_expense.amount is null then
    raise exception 'Expense amount must be a valid number.';
  end if;

  if save_expense.amount < 0 then
    raise exception 'Expense amount cannot be negative.';
  end if;

  if save_expense.related_record_id is not null and save_expense.related_record_type is null then
    raise exception 'Choose what kind of record this expense links to.';
  end if;

  if save_expense.related_record_type is not null and save_expense.related_record_id is null then
    raise exception 'Enter the related record ID or leave the link blank.';
  end if;

  if not exists (select 1 from public.vehicles v
                 where v.id = save_expense.vehicle_id and v.deleted_at is null) then
    raise exception 'Vehicle was not found.';
  end if;

  if save_expense.receipt_document_id is not null
     and not exists (select 1 from public.vehicle_documents d
                     where d.id = save_expense.receipt_document_id
                       and d.vehicle_id = save_expense.vehicle_id
                       and d.deleted_at is null) then
    raise exception 'Choose a receipt saved for the selected vehicle.';
  end if;

  -- The record this expense claims to duplicate has to exist, and belong to
  -- the same vehicle. 'other' points at nothing in particular and is allowed.
  if save_expense.related_record_type is not null
     and save_expense.related_record_type <> 'other' then
    linked := case save_expense.related_record_type
      when 'fuel_log' then exists (
        select 1 from public.fuel_logs f
        where f.id = save_expense.related_record_id
          and f.vehicle_id = save_expense.vehicle_id and f.deleted_at is null)
      when 'maintenance_log' then exists (
        select 1 from public.maintenance_logs m
        where m.id = save_expense.related_record_id
          and m.vehicle_id = save_expense.vehicle_id and m.deleted_at is null)
      when 'repair_record' then exists (
        select 1 from public.repair_records r
        where r.id = save_expense.related_record_id
          and r.vehicle_id = save_expense.vehicle_id and r.deleted_at is null)
      else null
    end;

    if linked is null then
      raise exception 'Choose a valid related record type.';
    end if;

    if not linked then
      raise exception 'Related record was not found for the selected vehicle.';
    end if;
  end if;

  if save_expense.expense_id is null then
    insert into public.expenses (
      vehicle_id, expense_date, category, description, amount,
      receipt_document_id, related_record_type, related_record_id, notes,
      created_by, updated_by
    ) values (
      save_expense.vehicle_id, save_expense.expense_date, slug, clean_description,
      save_expense.amount, save_expense.receipt_document_id,
      save_expense.related_record_type, save_expense.related_record_id,
      nullif(trim(coalesce(save_expense.notes, '')), ''),
      auth.uid(), auth.uid()
    )
    returning id into saved_id;

    return saved_id;
  end if;

  select e.id, e.vehicle_id into existing
  from public.expenses e
  where e.id = save_expense.expense_id and e.deleted_at is null;

  if existing.id is null then
    raise exception 'Expense was not found.';
  end if;

  -- Moving an expense between vehicles would change what two vehicles cost
  -- without leaving a trace, so it is refused rather than silently allowed.
  if existing.vehicle_id is not null
     and existing.vehicle_id is distinct from save_expense.vehicle_id then
    raise exception 'Expense vehicle cannot be changed after saving.';
  end if;

  update public.expenses e
  set expense_date = save_expense.expense_date,
      category = slug,
      description = clean_description,
      amount = save_expense.amount,
      receipt_document_id = save_expense.receipt_document_id,
      related_record_type = save_expense.related_record_type,
      related_record_id = save_expense.related_record_id,
      notes = nullif(trim(coalesce(save_expense.notes, '')), ''),
      updated_by = auth.uid(),
      updated_at = now()
  where e.id = save_expense.expense_id;

  return save_expense.expense_id;
end;
$$;

create or replace function public.archive_expense(expense_id uuid)
returns void
language plpgsql
as $$
begin
  update public.expenses e
  set deleted_at = now(), updated_by = auth.uid(), updated_at = now()
  where e.id = archive_expense.expense_id and e.deleted_at is null;

  if not found then
    raise exception 'Expense was not found or is already archived.';
  end if;
end;
$$;
