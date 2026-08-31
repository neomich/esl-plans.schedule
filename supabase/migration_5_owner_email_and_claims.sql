-- Run once in the SCHEDULE APP's Supabase SQL Editor (the
-- zowrjosuhehgccmoxxcq project, not esl-plans.com's).

-- Track which subscriber (by email) owns each schedule, so a returning
-- Friend-tier member gets routed back to their existing schedule
-- instead of accidentally creating a duplicate.
alter table schedules add column if not exists owner_email text;

-- At most one schedule per real subscriber email (NULLs allowed
-- multiple times, for any old test schedules with no owner set).
create unique index if not exists schedules_owner_email_idx
  on schedules (owner_email) where owner_email is not null;

-- Replace create_schedule: reserves the word "claim" (so it can never
-- collide with the /claim/:token route), and restores automatic
-- collision handling (abc -> abc2 -> abc3...) since this function is
-- about to become machine-only — no human will ever see this error
-- message again, so silently picking the next available name is the
-- right behavior here (unlike the old interactive landing page).
drop function if exists public.create_schedule(text, text, text);

create or replace function public.create_schedule(p_desired_slug text, p_passcode text default '123', p_timezone text default 'UTC')
returns table(slug text, admin_token text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_base text := regexp_replace(lower(p_desired_slug), '[^a-z0-9]', '', 'g');
  v_slug text;
  v_suffix int := 0;
  v_token text := replace(gen_random_uuid()::text, '-', '');
begin
  if v_base = '' or v_base = 'claim' then
    v_base := 'teacher';
  end if;

  v_slug := v_base;
  while exists(select 1 from schedules s where s.slug = v_slug) loop
    v_suffix := v_suffix + 1;
    v_slug := v_base || v_suffix::text;
  end loop;

  insert into schedules (slug, admin_token, student_passcode, timezone)
  values (v_slug, v_token, coalesce(p_passcode, '123'), coalesce(p_timezone, 'UTC'));

  return query select v_slug, v_token;
end;
$$;

-- The important part: only trusted server-side code (using the
-- service role, which bypasses this entirely) can call this now.
-- Nobody can hit it directly with the public anon key anymore.
revoke execute on function public.create_schedule(text, text, text) from anon;
