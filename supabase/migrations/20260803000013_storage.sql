-- Where photos and receipts live.
--
-- Four buckets mirroring the folders the desktop app kept beside its database.
-- All private: these are somebody's fuel receipts, and a public bucket would
-- make every one of them readable by anybody who guessed a filename. The app
-- reads them through short-lived signed links instead.
--
-- The 10 MB limit is the one the desktop app enforced in Rust. It is repeated
-- here because the client can no longer be trusted to be the only writer.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('vehicle-photos', 'vehicle-photos', false, 10485760,
   array['image/png', 'image/jpeg', 'image/webp', 'image/gif']),
  ('fuel-receipts', 'fuel-receipts', false, 10485760,
   array['image/png', 'image/jpeg', 'image/webp', 'application/pdf']),
  ('maintenance-receipts', 'maintenance-receipts', false, 10485760,
   array['image/png', 'image/jpeg', 'image/webp', 'application/pdf']),
  ('maintenance-photos', 'maintenance-photos', false, 10485760,
   array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do nothing;

-- One fleet, so the rule is the same as everywhere else: anyone signed in may
-- read and add files; only an owner may remove one.
do $$
declare
  bucket text;
begin
  foreach bucket in array array[
    'vehicle-photos', 'fuel-receipts', 'maintenance-receipts', 'maintenance-photos'
  ]
  loop
    execute format($p$
      create policy "signed in users read %1$s"
        on storage.objects for select
        to authenticated
        using (bucket_id = %1$L and public.is_active_user());

      create policy "signed in users add %1$s"
        on storage.objects for insert
        to authenticated
        with check (bucket_id = %1$L and public.is_active_user());

      create policy "owners remove %1$s"
        on storage.objects for delete
        to authenticated
        using (bucket_id = %1$L and public.is_owner());
    $p$, bucket);
  end loop;
end;
$$;
