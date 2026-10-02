-- NutriMy cloud backup: one snapshot of the on-device store per user.

create table public.backups (
  user_id uuid primary key references auth.users (id) on delete cascade,
  -- The persisted app state (plan, picks, ticks, shopping list, settings).
  data jsonb not null,
  -- Version of the app's store format, so old snapshots can be migrated on restore.
  schema_version integer not null default 1,
  app_version text,
  updated_at timestamptz not null default now()
);

alter table public.backups enable row level security;

create policy "Owner reads own backup" on public.backups
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Owner creates own backup" on public.backups
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Owner updates own backup" on public.backups
  for update to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "Owner deletes own backup" on public.backups
  for delete to authenticated using ((select auth.uid()) = user_id);

-- Remote switches the app reads at launch (e.g. `developer_promo`). Readable by
-- anyone, writable only from the dashboard / service role.
create table public.app_config (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.app_config enable row level security;

create policy "Anyone reads app config" on public.app_config
  for select to anon, authenticated using (true);

insert into public.app_config (key, value) values ('developer_promo', 'true'::jsonb);

-- App Store rule 5.1.1(v): accounts created in the app must be deletable from it.
-- Deleting the auth user cascades to the backup.
create function public.delete_account()
returns void
language sql
security definer
set search_path = ''
as $$
  delete from auth.users where id = (select auth.uid());
$$;

revoke execute on function public.delete_account() from public, anon;
grant execute on function public.delete_account() to authenticated;
