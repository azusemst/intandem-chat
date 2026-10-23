-- No fixtures or administrative application credential. All writes go through
-- narrowly scoped RPCs; RLS applies to all ordinary authenticated reads.
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;
create table private.allowed_email_domains (domain text primary key check (domain = lower(domain)));
insert into private.allowed_email_domains values ('usc.edu');

create function private.eligible(who uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from auth.users u
    join private.allowed_email_domains d on d.domain = split_part(lower(trim(u.email)), '@', 2)
    where u.id = who and u.email_confirmed_at is not null
      and u.deleted_at is null and (u.banned_until is null or u.banned_until < now())
      and u.email ~ '^[^[:space:]@]+@[^[:space:]@]+$');
$$;

create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (length(trim(display_name)) between 1 and 80),
  school text not null check (length(trim(school)) between 1 and 120),
  purpose text not null check (purpose in ('career', 'technical', 'study')),
  goals text[] not null check (cardinality(goals) between 1 and 10),
  interests text[] not null default '{}' check (cardinality(interests) <= 20),
  industry text check (length(industry) <= 100),
  recruiting_stage text check (length(recruiting_stage) <= 100),
  active boolean not null default true,
  complete boolean not null default true,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (purpose <> 'career' or (coalesce(length(trim(industry)), 0) > 0 and coalesce(length(trim(recruiting_stage)), 0) > 0))
);
create index profiles_available on public.profiles (active, complete, user_id);
create table public.profile_topics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  topic_key text not null check (length(topic_key) between 1 and 100),
  label text not null check (length(trim(label)) between 1 and 100),
  kind text not null check (kind in ('practice', 'help')),
  level text not null check (level in ('beginner', 'intermediate', 'advanced')),
  unique (user_id, topic_key, kind)
);
create table public.availability (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  timezone text not null,
  day integer not null check (day between 0 and 6),
  start_time time not null,
  end_time time not null,
  check (start_time < end_time),
  unique (user_id, day, start_time, end_time)
);
create table public.private_contacts (
  user_id uuid primary key references public.profiles(user_id) on delete cascade,
  email text not null check (length(email) <= 254 and email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
  updated_at timestamptz not null default now()
);
create table public.match_requests (
  id uuid primary key default gen_random_uuid(),
  sender uuid not null references public.profiles(user_id),
  recipient uuid not null references public.profiles(user_id),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'canceled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (sender <> recipient)
);
create unique index one_open_pair on public.match_requests (least(sender, recipient), greatest(sender, recipient))
  where status in ('pending', 'accepted');
create index requests_sender on public.match_requests (sender, created_at desc);
create index requests_recipient on public.match_requests (recipient, created_at desc);
create table public.deletion_requests (
  user_id uuid primary key references public.profiles(user_id),
  requested_at timestamptz not null default now(),
  status text not null default 'pending' check (status in ('pending', 'processed'))
);
create table public.recommendation_dismissals (
  user_id uuid not null references public.profiles(user_id),
  candidate_id uuid not null references public.profiles(user_id),
  created_at timestamptz not null default now(),
  primary key (user_id, candidate_id), check (user_id <> candidate_id)
);

create function private.can_read_profile(who uuid) returns boolean
language sql stable security definer set search_path = '' as $$
 select private.eligible(auth.uid()) and (
   who = auth.uid() or
   (private.eligible(who) and exists(select 1 from public.profiles p where p.user_id = who and p.active and p.complete)) or
   exists(select 1 from public.match_requests r where
     (r.sender = auth.uid() and r.recipient = who) or (r.recipient = auth.uid() and r.sender = who))
 );
$$;

alter table public.profiles enable row level security;
alter table public.profile_topics enable row level security;
alter table public.availability enable row level security;
alter table public.private_contacts enable row level security;
alter table public.match_requests enable row level security;
alter table public.deletion_requests enable row level security;
alter table public.recommendation_dismissals enable row level security;
create policy profiles_read on public.profiles for select to authenticated using (private.can_read_profile(user_id));
create policy topics_read on public.profile_topics for select to authenticated using (private.can_read_profile(user_id));
create policy availability_read on public.availability for select to authenticated using (private.can_read_profile(user_id));
create policy requests_read on public.match_requests for select to authenticated
  using (private.eligible(auth.uid()) and auth.uid() in (sender, recipient));
create policy contacts_read on public.private_contacts for select to authenticated using (
 private.eligible(auth.uid()) and (user_id = auth.uid() or (private.eligible(user_id) and exists (
   select 1 from public.match_requests r where r.status = 'accepted' and
   ((r.sender = auth.uid() and r.recipient = user_id) or (r.recipient = auth.uid() and r.sender = user_id))
 )))
);
create policy deletion_read on public.deletion_requests for select to authenticated
 using (private.eligible(auth.uid()) and user_id = auth.uid());
create policy dismissals_read on public.recommendation_dismissals for select to authenticated
 using (private.eligible(auth.uid()) and user_id = auth.uid());
revoke all on all tables in schema public from anon, authenticated;
grant select on public.profiles, public.profile_topics, public.availability, public.private_contacts,
 public.match_requests, public.deletion_requests, public.recommendation_dismissals to authenticated;

create function public.save_profile(payload jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare me uuid := auth.uid(); t jsonb; w jsonb; zone text; normalized text;
begin
 if not private.eligible(me) then raise exception 'Eligible verified USC account required' using errcode = '42501'; end if;
 -- Serialize all changes for this account, including first-time onboarding.
 perform 1 from auth.users where id = me for update;
 if jsonb_typeof(payload->'topics') <> 'array' or jsonb_array_length(payload->'topics') not between 1 and 20
   or not exists(select 1 from jsonb_array_elements(payload->'topics') x where x->>'kind' = 'practice') then
   raise exception 'At least one practice topic is required';
 end if;
 if jsonb_typeof(payload->'availability') <> 'array' or jsonb_array_length(payload->'availability') not between 1 and 21 then
   raise exception 'Add between one and 21 availability windows';
 end if;
 if not (payload ?& array['display_name','school','purpose','goals','interests','contact_email','topics','availability','timezone']) then
   raise exception 'Incomplete profile';
 end if;
 zone := payload->>'timezone';
 if not exists(select 1 from pg_catalog.pg_timezone_names where name = zone) or zone ~ '^[+-]' then
   raise exception 'Choose a valid IANA timezone';
 end if;
 if exists(select 1 from jsonb_array_elements_text(payload->'goals') x where length(trim(x)) not between 1 and 100)
   or exists(select 1 from jsonb_array_elements_text(payload->'interests') x where length(trim(x)) not between 1 and 100) then
   raise exception 'Goals and interests must be between 1 and 100 characters';
 end if;
 insert into public.profiles(user_id, display_name, school, purpose, goals, interests, industry, recruiting_stage, active)
 values (me, trim(payload->>'display_name'), trim(payload->>'school'), payload->>'purpose',
   array(select jsonb_array_elements_text(payload->'goals')), array(select jsonb_array_elements_text(payload->'interests')),
   case when payload->>'purpose' = 'career' then nullif(trim(payload->>'industry'), '') end,
   case when payload->>'purpose' = 'career' then nullif(trim(payload->>'recruiting_stage'), '') end,
   not exists(select 1 from public.deletion_requests where user_id = me))
 on conflict (user_id) do update set display_name = excluded.display_name, school = excluded.school,
 purpose = excluded.purpose, goals = excluded.goals, interests = excluded.interests,
 industry = excluded.industry, recruiting_stage = excluded.recruiting_stage,
 version = public.profiles.version + 1, updated_at = now();
 delete from public.profile_topics where user_id = me;
 for t in select * from jsonb_array_elements(payload->'topics') loop
   normalized := lower(regexp_replace(trim(t->>'label'), '\s+', ' ', 'g'));
   insert into public.profile_topics(user_id, topic_key, label, kind, level)
   values (me, normalized, trim(t->>'label'), t->>'kind', t->>'level');
 end loop;
 delete from public.availability where user_id = me;
 for w in select * from jsonb_array_elements(payload->'availability') loop
   insert into public.availability(user_id, timezone, day, start_time, end_time)
   values(me, zone, (w->>'day')::integer, (w->>'start_time')::time, (w->>'end_time')::time);
 end loop;
 insert into public.private_contacts(user_id, email) values(me, lower(trim(payload->>'contact_email')))
 on conflict(user_id) do update set email = excluded.email, updated_at = now();
end;
$$;

create function public.create_request(candidate uuid) returns public.match_requests
language plpgsql security definer set search_path = '' as $$
declare me uuid := auth.uid(); result public.match_requests;
begin
 if not private.eligible(me) or not private.eligible(candidate) or me = candidate then
   raise exception 'Candidate is no longer eligible' using errcode = '42501';
 end if;
 -- Consistent lock order protects reciprocal requests and profile-state rechecks.
 perform 1 from auth.users where id in (me, candidate) order by id for update;
 if not private.eligible(me) or not private.eligible(candidate) then
   raise exception 'Candidate is no longer eligible' using errcode = '42501';
 end if;
 select * into result from public.match_requests where least(sender,recipient) = least(me,candidate)
   and greatest(sender,recipient) = greatest(me,candidate) and status in ('pending','accepted');
 if found then return result; end if;
 if (select count(*) from public.profiles where user_id in (me,candidate) and active and complete) <> 2 then
   raise exception 'Both profiles must be complete and matching must be active';
 end if;
 insert into public.match_requests(sender,recipient) values(me,candidate) returning * into result;
 return result;
end;
$$;

create function public.transition_request(request_id uuid, expected_status text, next_status text) returns public.match_requests
language plpgsql security definer set search_path = '' as $$
declare me uuid := auth.uid(); r public.match_requests;
begin
 if not private.eligible(me) then raise exception 'Eligible account required' using errcode = '42501'; end if;
 select * into r from public.match_requests where id = request_id for update;
 if not found or me not in (r.sender,r.recipient) then raise exception 'Request unavailable' using errcode = '42501'; end if;
 if r.status is distinct from expected_status then raise exception 'Request changed. Refresh to see its current state'; end if;
 if not ((r.status = 'pending' and me = r.recipient and next_status in ('accepted','declined'))
   or (r.status = 'pending' and me = r.sender and next_status = 'canceled')
   or (r.status = 'accepted' and next_status = 'canceled')) then
   raise exception 'This transition is not allowed' using errcode = '42501';
 end if;
 if next_status = 'accepted' and (not private.eligible(r.sender) or not private.eligible(r.recipient)) then
   raise exception 'Participant is no longer eligible';
 end if;
 update public.match_requests set status = next_status, updated_at = now()
 where id = r.id and status = expected_status returning * into r;
 return r;
end;
$$;

create function public.set_matching(enabled boolean) returns void
language plpgsql security definer set search_path = '' as $$
begin
 if not private.eligible(auth.uid()) then raise exception 'Eligible account required' using errcode = '42501'; end if;
 perform 1 from auth.users where id = auth.uid() for update;
 if enabled and exists(select 1 from public.deletion_requests where user_id = auth.uid()) then
   raise exception 'Removal is pending; contact the team before resuming';
 end if;
 update public.profiles set active = enabled, version = version + 1, updated_at = now() where user_id = auth.uid();
end;
$$;
create function public.request_deletion() returns void
language plpgsql security definer set search_path = '' as $$
begin
 if not private.eligible(auth.uid()) then raise exception 'Eligible account required' using errcode = '42501'; end if;
 perform 1 from auth.users where id = auth.uid() for update;
 insert into public.deletion_requests(user_id) values(auth.uid()) on conflict do nothing;
 update public.profiles set active = false, version = version + 1, updated_at = now() where user_id = auth.uid();
end;
$$;
create function public.dismiss_candidate(candidate uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
 if not private.eligible(auth.uid()) or not private.eligible(candidate) then raise exception 'Eligible account required' using errcode = '42501'; end if;
 insert into public.recommendation_dismissals(user_id,candidate_id) values(auth.uid(),candidate) on conflict do nothing;
end;
$$;
create function public.reset_dismissals() returns void
language plpgsql security definer set search_path = '' as $$
begin
 if not private.eligible(auth.uid()) then raise exception 'Eligible account required' using errcode = '42501'; end if;
 delete from public.recommendation_dismissals where user_id = auth.uid();
end;
$$;
create function public.candidate_profiles() returns setof public.profiles
language sql stable security definer set search_path = '' as $$
 select p.* from public.profiles p where private.eligible(auth.uid())
   and exists(select 1 from public.profiles me where me.user_id = auth.uid() and me.active and me.complete)
   and p.user_id <> auth.uid() and p.active and p.complete and private.eligible(p.user_id)
 order by p.user_id;
$$;
-- Functions default to executable by PUBLIC in PostgreSQL: explicitly revoke.
revoke all on all functions in schema private from public, anon, authenticated;
grant execute on function private.eligible(uuid), private.can_read_profile(uuid) to authenticated;
revoke all on function public.save_profile(jsonb), public.create_request(uuid),
 public.transition_request(uuid,text,text), public.set_matching(boolean), public.request_deletion(),
 public.dismiss_candidate(uuid), public.reset_dismissals(), public.candidate_profiles() from public, anon, authenticated;
grant execute on function public.save_profile(jsonb), public.create_request(uuid),
 public.transition_request(uuid,text,text), public.set_matching(boolean), public.request_deletion(),
 public.dismiss_candidate(uuid), public.reset_dismissals(), public.candidate_profiles() to authenticated;
