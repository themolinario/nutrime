-- Anonymous usage statistics, sent only by people who said yes in the app.
--
-- Each row is one event: a screen opened or a feature used. There is no user id
-- and no content (no food names, no plan data): just an install id made up on
-- the device, so the same phone can be counted once. The app can only insert;
-- reading is for the dashboard and the service role.

create table public.analytics_events (
  id bigint generated always as identity primary key,
  -- Random id created on the device when the user consents; not tied to the account.
  install_id uuid not null,
  -- New for every launch, and after 30 minutes in the background.
  session_id uuid not null,
  name text not null check (name ~ '^[a-z][a-z0-9_]{0,63}$'),
  props jsonb not null default '{}'::jsonb check (
    jsonb_typeof(props) = 'object' and pg_column_size(props) <= 2048
  ),
  platform text not null check (platform in ('ios', 'android')),
  app_version text not null check (char_length(app_version) <= 20),
  os_version text check (char_length(os_version) <= 20),
  -- When it happened on the phone (events are sent in batches).
  occurred_at timestamptz not null,
  received_at timestamptz not null default now(),
  check (occurred_at < received_at + interval '1 day')
);

create index analytics_events_occurred_at on public.analytics_events (occurred_at);
create index analytics_events_name_occurred_at on public.analytics_events (name, occurred_at);
create index analytics_events_install_id on public.analytics_events (install_id, occurred_at);

alter table public.analytics_events enable row level security;

create policy "Anyone sends events" on public.analytics_events
  for insert to anon, authenticated with check (true);

-- No select policy: the app cannot read events back, not even its own.
revoke select, update, delete on public.analytics_events from anon, authenticated;

-- Kept for 14 months, as the privacy policy says.
create extension if not exists pg_cron;

select cron.schedule(
  'purge-analytics-events',
  '17 3 * * *',
  $$delete from public.analytics_events where occurred_at < now() - interval '14 months'$$
);

/* Views for the dashboard (Table Editor or SQL editor). Not exposed to the app. */

-- Active phones, sessions and events per day.
create view public.stats_daily with (security_invoker = true) as
select
  date_trunc('day', occurred_at at time zone 'Europe/Rome')::date as day,
  count(distinct install_id) as active_installs,
  count(distinct session_id) as sessions,
  count(*) as events,
  count(distinct install_id) filter (where platform = 'ios') as ios,
  count(distinct install_id) filter (where platform = 'android') as android
from public.analytics_events
group by 1
order by 1 desc;

-- Which features are used, and by how many phones, over the last 30 days.
create view public.stats_features_30d with (security_invoker = true) as
select
  name,
  count(*) as events,
  count(distinct install_id) as installs,
  round(100.0 * count(distinct install_id) / nullif(
    (select count(distinct install_id) from public.analytics_events
     where occurred_at > now() - interval '30 days'), 0), 1) as pct_of_installs
from public.analytics_events
where occurred_at > now() - interval '30 days'
group by name
order by installs desc, events desc;

-- Most visited screens over the last 30 days.
create view public.stats_screens_30d with (security_invoker = true) as
select
  props ->> 'screen' as screen,
  count(*) as views,
  count(distinct install_id) as installs
from public.analytics_events
where name = 'screen_view' and occurred_at > now() - interval '30 days'
group by 1
order by views desc;

-- Of the phones first seen on a given week, how many came back after 1, 7 and 30 days.
create view public.stats_retention with (security_invoker = true) as
with first_seen as (
  select install_id, min(occurred_at) as first_at
  from public.analytics_events
  group by install_id
)
select
  date_trunc('week', f.first_at at time zone 'Europe/Rome')::date as cohort_week,
  count(*) as new_installs,
  count(*) filter (where exists (
    select 1 from public.analytics_events e
    where e.install_id = f.install_id
      and e.occurred_at >= f.first_at + interval '1 day'
      and e.occurred_at < f.first_at + interval '2 days')) as day_1,
  count(*) filter (where exists (
    select 1 from public.analytics_events e
    where e.install_id = f.install_id
      and e.occurred_at >= f.first_at + interval '7 days')) as day_7_plus,
  count(*) filter (where exists (
    select 1 from public.analytics_events e
    where e.install_id = f.install_id
      and e.occurred_at >= f.first_at + interval '30 days')) as day_30_plus
from first_seen f
group by 1
order by 1 desc;

-- The steps from install to a planned week, over the last 90 days.
create view public.stats_funnel_90d with (security_invoker = true) as
with per_install as (
  select
    install_id,
    bool_or(name = 'app_open') as opened,
    bool_or(name = 'plan_imported') as imported,
    bool_or(name = 'food_chosen' or name = 'autofill') as chose,
    bool_or(name = 'food_eaten') as ticked,
    bool_or(name = 'shopping_item_checked') as shopped
  from public.analytics_events
  where occurred_at > now() - interval '90 days'
  group by install_id
)
select step, installs from (
  select 1 as n, 'Aperto l''app' as step, count(*) filter (where opened) as installs from per_install
  union all select 2, 'Importato un piano', count(*) filter (where imported) from per_install
  union all select 3, 'Scelto il menu', count(*) filter (where chose) from per_install
  union all select 4, 'Spuntato un pasto', count(*) filter (where ticked) from per_install
  union all select 5, 'Usato la spesa', count(*) filter (where shopped) from per_install
) steps
order by n;

revoke all on public.stats_daily, public.stats_features_30d, public.stats_screens_30d,
  public.stats_retention, public.stats_funnel_90d from anon, authenticated;
