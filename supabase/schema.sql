-- See the top-level SETUP.md for how to run this.
-- (This is the same file already shared separately — kept here too
-- so the repo is self-contained.)
-- =========================================================
-- ESL-plans Schedule (multi-tenant) — initial schema
-- Run this once in your Supabase project's SQL Editor:
-- Dashboard -> SQL Editor -> New query -> paste this whole
-- file -> Run.
-- =========================================================

create extension if not exists pgcrypto;

-- One row per teacher. Sensitive columns (admin_token,
-- telegram_bot_token, telegram_chat_id) are never readable
-- directly by the public — only through the RPC functions
-- below, which check the admin_token first.
create table if not exists schedules (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  admin_token text unique not null default encode(gen_random_bytes(16), 'hex'),
  student_passcode text not null default '123',
  headline text not null default 'Book a Lesson',
  show_timezone_note boolean not null default true,
  instructions jsonb not null default '[
    {"id":1,"enabled":true,"text":"You can book a slot permanently or just for this week — next week''s slots are open too!"},
    {"id":2,"enabled":true,"text":"Changed your mind? Click your booking to delete it. Please don''t delete other students'' bookings. No need to message me once you''re done — I get notified automatically."},
    {"id":3,"enabled":true,"text":"Want to steer the lesson? Add a topic when you book! Give me at least two days'' notice and I''ll do my best to prepare for it."}
  ]'::jsonb,
  colors jsonb not null default '{"free":"#D6F1DC","weekly":"#FBF1B4","fixed":"#FBD8E2"}'::jsonb,
  avail_from text not null default '08:00',
  avail_to text not null default '23:00',
  min_length int not null default 30,
  max_length int not null default 120,
  include_topic boolean not null default true,
  success_message text not null default 'That''s it! Your booking is OK!',
  telegram_enabled boolean not null default false,
  telegram_bot_token text,
  telegram_chat_id text,
  created_at timestamptz not null default now()
);

-- One row per booked lesson.
create table if not exists bookings (
  id uuid primary key default gen_random_uuid(),
  schedule_id uuid not null references schedules(id) on delete cascade,
  student_name text not null check (char_length(student_name) between 1 and 10),
  start_time timestamptz not null,
  end_time timestamptz not null,
  duration int not null check (duration in (30,60,90,120)),
  booking_type text not null check (booking_type in ('weekly','fixed')),
  topic text,
  created_at timestamptz not null default now()
);

create index if not exists bookings_schedule_time_idx on bookings (schedule_id, start_time);

alter table schedules enable row level security;
alter table bookings enable row level security;

-- ---------------------------------------------------------
-- schedules: public can read only the SAFE columns needed to
-- render a booking page. admin_token and the Telegram fields
-- are deliberately excluded from this grant — there is no way
-- to fetch them except through the RPC functions below, which
-- check the admin_token first.
-- ---------------------------------------------------------
revoke all on schedules from anon;
grant select (
  id, slug, student_passcode, headline, show_timezone_note, instructions,
  colors, avail_from, avail_to, min_length, max_length, include_topic, success_message
) on schedules to anon;

drop policy if exists "public can read safe schedule columns" on schedules;
create policy "public can read safe schedule columns"
  on schedules for select
  to anon
  using (true);

-- No insert/update/delete grants on schedules for anon at all.
-- All writes happen through the RPC functions below.

-- ---------------------------------------------------------
-- bookings: fully open — no login for students, matching the
-- original app's design. Anyone who can see a slot can book it
-- or cancel it. This is a deliberate simplicity trade-off, not
-- an oversight.
-- ---------------------------------------------------------
grant select, insert, delete on bookings to anon;

drop policy if exists "public can view bookings" on bookings;
create policy "public can view bookings"
  on bookings for select to anon using (true);

drop policy if exists "public can create bookings" on bookings;
create policy "public can create bookings"
  on bookings for insert to anon with check (
    student_name is not null and char_length(student_name) between 1 and 10
    and duration in (30,60,90,120)
    and booking_type in ('weekly','fixed')
  );

drop policy if exists "public can delete bookings" on bookings;
create policy "public can delete bookings"
  on bookings for delete to anon using (true);

-- ---------------------------------------------------------
-- Secure RPC functions (SECURITY DEFINER = run with elevated
-- privileges, but only do exactly what's written below).
-- These are the ONLY way to create a schedule, read the admin
-- view of one, or change its settings.
-- ---------------------------------------------------------

-- Creates a new teacher's schedule. Handles slug collisions
-- automatically (abc -> abc1 -> abc2 ...).
create or replace function public.create_schedule(p_desired_slug text, p_passcode text default '123')
returns table(slug text, admin_token text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_slug text := regexp_replace(lower(p_desired_slug), '[^a-z0-9]', '', 'g');
  v_suffix int := 0;
  v_final_slug text;
  v_token text := encode(gen_random_bytes(16), 'hex');
begin
  if v_slug = '' then
    v_slug := 'teacher';
  end if;

  v_final_slug := v_slug;
  while exists(select 1 from schedules s where s.slug = v_final_slug) loop
    v_suffix := v_suffix + 1;
    v_final_slug := v_slug || v_suffix::text;
  end loop;

  insert into schedules (slug, admin_token, student_passcode)
  values (v_final_slug, v_token, coalesce(p_passcode, '123'));

  return query select v_final_slug, v_token;
end;
$$;

grant execute on function public.create_schedule(text, text) to anon;

-- Loads the FULL settings (including Telegram fields) for the
-- admin panel — only returns a row if the token actually matches.
create or replace function public.get_admin_schedule(p_slug text, p_admin_token text)
returns schedules
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row schedules;
begin
  select * into v_row from schedules where slug = p_slug and admin_token = p_admin_token;
  return v_row; -- id is null if there was no match
end;
$$;

grant execute on function public.get_admin_schedule(text, text) to anon;

-- Updates a teacher's settings — only if the token matches.
create or replace function public.save_schedule_settings(p_slug text, p_admin_token text, p_patch jsonb)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_match boolean;
begin
  select exists(select 1 from schedules where slug = p_slug and admin_token = p_admin_token) into v_match;
  if not v_match then
    return false;
  end if;

  update schedules set
    headline            = coalesce(p_patch->>'headline', headline),
    show_timezone_note  = coalesce((p_patch->>'show_timezone_note')::boolean, show_timezone_note),
    instructions        = coalesce(p_patch->'instructions', instructions),
    colors              = coalesce(p_patch->'colors', colors),
    avail_from          = coalesce(p_patch->>'avail_from', avail_from),
    avail_to            = coalesce(p_patch->>'avail_to', avail_to),
    min_length          = coalesce((p_patch->>'min_length')::int, min_length),
    max_length          = coalesce((p_patch->>'max_length')::int, max_length),
    include_topic       = coalesce((p_patch->>'include_topic')::boolean, include_topic),
    success_message     = coalesce(p_patch->>'success_message', success_message),
    student_passcode    = coalesce(p_patch->>'student_passcode', student_passcode),
    telegram_enabled    = coalesce((p_patch->>'telegram_enabled')::boolean, telegram_enabled),
    telegram_bot_token  = coalesce(p_patch->>'telegram_bot_token', telegram_bot_token)
  where slug = p_slug and admin_token = p_admin_token;

  return true;
end;
$$;

grant execute on function public.save_schedule_settings(text, text, jsonb) to anon;
