-- SameSailing.com database schema
-- Run this once in the Supabase SQL Editor (Project -> SQL Editor -> New query).

-- Profile data that stays the same across all of a user's sailings.
-- name_mode/nickname back the display-name feature: every passenger
-- defaults to 'anon' (a generated handle, e.g. "Coral Family") so the
-- feature works with zero user action, or can opt into a nickname or
-- their real name (shown exactly as `name` below) instead.
create table if not exists profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null,
  country text not null default '',
  avatar text not null default '🧑',
  -- Avatars v1: a key into the fixed AV_TINTS palette (lib/avatars.ts).
  avatar_tint text not null default 'peach',
  notify_digest boolean not null default true,
  notify_dm_alerts boolean not null default true,
  name_mode text not null default 'anon' check (name_mode in ('anon', 'nick', 'real')),
  nickname text not null default '',
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;

create policy "Users can view their own profile"
  on profiles for select
  using (auth.uid() = id);

-- Passenger cards and chat need to show fellow travelers' chosen display
-- name (or know to fall back to a generated handle), which lives on this
-- account-level table rather than the per-sailing profile — same
-- public-browsable stance as "Anyone can browse sailing passengers" below.
-- Narrowed later in this file (see "Admins can view all profiles" /
-- public_profiles) once this was found to expose the real `name` column
-- regardless of name_mode - kept here, not deleted, matching this file's
-- own convention of leaving originals in place and appending the fix.
create policy "Anyone can view display-name fields"
  on profiles for select
  using (true);

create policy "Users can insert their own profile"
  on profiles for insert
  with check (auth.uid() = id);

create policy "Users can update their own profile"
  on profiles for update
  using (auth.uid() = id);

-- A user's membership in a given sailing, plus their per-sailing travel profile.
-- join_rank backs the Pioneer badge system: 1st/2nd/3rd/Early crew (4-10) on
-- a sailing, assigned once at join time by the trigger below and never
-- recomputed - if #2 leaves, #3 stays 3rd.
create table if not exists joined_sailings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  sailing_id text not null,
  line text not null,
  ship_name text not null,
  sail_date text not null,
  itinerary text not null,
  port text not null,
  profile jsonb,
  join_rank integer,
  joined_at timestamptz not null default now(),
  unique (user_id, sailing_id)
);

alter table joined_sailings enable row level security;

create policy "Users can view their own joined sailings"
  on joined_sailings for select
  using (auth.uid() = user_id);

-- Passenger boards are browsable pre-join (see the "Browse travelers first"
-- flow), so anyone can read the fields shown on a traveler card.
create policy "Anyone can browse sailing passengers"
  on joined_sailings for select
  using (true);

create policy "Users can join a sailing"
  on joined_sailings for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own sailing profile"
  on joined_sailings for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can leave a sailing"
  on joined_sailings for delete
  using (auth.uid() = user_id);

-- Assigns join_rank on first insert only. joinSailing() upserts on
-- (user_id, sailing_id) conflict, and an ON CONFLICT DO UPDATE never fires a
-- BEFORE INSERT trigger - so re-joining a sailing already on the account
-- (or saving a profile edit) leaves an existing join_rank untouched, exactly
-- as the badge system requires.
create or replace function set_join_rank()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.join_rank := (select count(*) + 1 from joined_sailings where sailing_id = new.sailing_id);
  return new;
end;
$$;

drop trigger if exists joined_sailings_set_join_rank on joined_sailings;
create trigger joined_sailings_set_join_rank
  before insert on joined_sailings
  for each row execute function set_join_rank();

-- Real, persisted group chat messages per sailing. Readable/writable by anyone
-- who has joined that sailing (checked against joined_sailings above).
create table if not exists group_messages (
  id uuid primary key default gen_random_uuid(),
  sailing_id text not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  sender_label text not null,
  body text not null,
  deleted boolean not null default false,
  created_at timestamptz not null default now()
);

alter table group_messages enable row level security;

create policy "Sailing members can read group messages"
  on group_messages for select
  using (
    exists (
      select 1 from joined_sailings
      where joined_sailings.user_id = auth.uid()
        and joined_sailings.sailing_id = group_messages.sailing_id
    )
  );

create policy "Sailing members can post group messages"
  on group_messages for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from joined_sailings
      where joined_sailings.user_id = auth.uid()
        and joined_sailings.sailing_id = group_messages.sailing_id
    )
  );

create policy "Users can soft-delete their own group messages"
  on group_messages for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists group_messages_sailing_id_idx on group_messages (sailing_id, created_at);

-- Enable realtime updates for live group chat.
alter publication supabase_realtime add table group_messages;

-- One private thread per pair of sailing-mates. user_a/user_b are always
-- stored with user_a < user_b so a given pair maps to exactly one thread
-- regardless of who started it.
create table if not exists dm_threads (
  id uuid primary key default gen_random_uuid(),
  sailing_id text not null,
  user_a uuid not null references auth.users (id) on delete cascade,
  user_b uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  check (user_a < user_b),
  unique (sailing_id, user_a, user_b)
);

alter table dm_threads enable row level security;

create policy "Participants can view their DM threads"
  on dm_threads for select
  using (auth.uid() = user_a or auth.uid() = user_b);

create policy "Sailing members can start a DM thread"
  on dm_threads for insert
  with check (
    (auth.uid() = user_a or auth.uid() = user_b)
    and exists (
      select 1 from joined_sailings
      where joined_sailings.user_id = user_a
        and joined_sailings.sailing_id = dm_threads.sailing_id
    )
    and exists (
      select 1 from joined_sailings
      where joined_sailings.user_id = user_b
        and joined_sailings.sailing_id = dm_threads.sailing_id
    )
  );

create table if not exists dm_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references dm_threads (id) on delete cascade,
  sender_id uuid not null references auth.users (id) on delete cascade,
  sender_label text not null,
  body text not null,
  deleted boolean not null default false,
  created_at timestamptz not null default now()
);

alter table dm_messages enable row level security;

create policy "Thread participants can read DMs"
  on dm_messages for select
  using (
    exists (
      select 1 from dm_threads
      where dm_threads.id = dm_messages.thread_id
        and (dm_threads.user_a = auth.uid() or dm_threads.user_b = auth.uid())
    )
  );

create policy "Thread participants can send DMs"
  on dm_messages for insert
  with check (
    auth.uid() = sender_id
    and exists (
      select 1 from dm_threads
      where dm_threads.id = dm_messages.thread_id
        and (dm_threads.user_a = auth.uid() or dm_threads.user_b = auth.uid())
    )
  );

create policy "Users can soft-delete their own DMs"
  on dm_messages for update
  using (auth.uid() = sender_id)
  with check (auth.uid() = sender_id);

create index if not exists dm_messages_thread_id_idx on dm_messages (thread_id, created_at);

-- Enable realtime updates for live DMs.
alter publication supabase_realtime add table dm_messages;

-- Per-user activity log (real events only — there is no email delivery in
-- this app, so this must never claim to be a sent email). Rows are written
-- exclusively by the SECURITY DEFINER trigger functions below, never by
-- clients directly, so there is no insert policy for regular users.
create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('group_message', 'dm_message')),
  sailing_id text,
  thread_id uuid references dm_threads (id) on delete cascade,
  sender_label text not null,
  preview text not null,
  created_at timestamptz not null default now()
);

alter table notifications enable row level security;

create policy "Users can view their own notifications"
  on notifications for select
  using (auth.uid() = user_id);

create index if not exists notifications_user_id_idx on notifications (user_id, created_at desc);

create or replace function notify_group_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into notifications (user_id, kind, sailing_id, sender_label, preview)
  select js.user_id, 'group_message', new.sailing_id, new.sender_label, left(new.body, 140)
  from joined_sailings js
  join profiles p on p.id = js.user_id
  where js.sailing_id = new.sailing_id
    and js.user_id <> new.user_id
    and p.notify_digest;
  return new;
end;
$$;

drop trigger if exists group_messages_notify on group_messages;
create trigger group_messages_notify
  after insert on group_messages
  for each row execute function notify_group_message();

create or replace function notify_dm_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  recipient uuid;
begin
  select case when t.user_a = new.sender_id then t.user_b else t.user_a end
  into recipient
  from dm_threads t
  where t.id = new.thread_id;

  insert into notifications (user_id, kind, thread_id, sender_label, preview)
  select recipient, 'dm_message', new.thread_id, new.sender_label, left(new.body, 140)
  from profiles p
  where p.id = recipient and p.notify_dm_alerts;
  return new;
end;
$$;

drop trigger if exists dm_messages_notify on dm_messages;
create trigger dm_messages_notify
  after insert on dm_messages
  for each row execute function notify_dm_message();

-- Enable realtime updates for the notification log.
alter publication supabase_realtime add table notifications;

-- Public "Contact us" form submissions. Anyone can submit; nobody can read
-- back through the anon key (only visible via the Supabase dashboard).
create table if not exists contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  message text not null,
  created_at timestamptz not null default now()
);

alter table contact_messages enable row level security;

create policy "Anyone can submit a contact message"
  on contact_messages for insert
  with check (true);

-- User/message reports. Nobody can read these back through the anon key
-- (same stance as contact_messages) - reviewed manually via the Supabase
-- dashboard for now, until there's an admin panel to triage them in-app.
-- message_id has no foreign key since it can point at either
-- group_messages or dm_messages depending on message_kind, and
-- message_preview snapshots the body so a report still makes sense if the
-- message is later deleted.
create table if not exists reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users (id) on delete cascade,
  reported_user_id uuid not null references auth.users (id) on delete cascade,
  sailing_id text,
  message_kind text check (message_kind in ('group_message', 'dm_message')),
  message_id uuid,
  message_preview text,
  reason text not null,
  note text,
  created_at timestamptz not null default now()
);

alter table reports enable row level security;

create policy "Signed-in users can submit a report"
  on reports for insert
  with check (auth.uid() = reporter_id);

-- Admin/ban flags for the admin dashboard, kept in their own table rather
-- than on `profiles` - that table already has a "using (true)" select
-- policy for display-name lookups, so anything added to it is world
-- readable regardless of any other policy (RLS policies are OR'd).
create table if not exists user_moderation (
  user_id uuid primary key references auth.users (id) on delete cascade,
  is_admin boolean not null default false,
  banned boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table user_moderation enable row level security;

-- create policy has no "if not exists"/"or replace" form, unlike the
-- tables/functions above - drop-then-create keeps this block safe to
-- run again (e.g. after an earlier partial run failed partway through).
drop policy if exists "Users can view their own moderation status" on user_moderation;
create policy "Users can view their own moderation status"
  on user_moderation for select
  using (auth.uid() = user_id);

-- security definer so this can read user_moderation from inside that same
-- table's own RLS policies without recursing - same pattern already used
-- by notify_group_message()/notify_dm_message() above.
create or replace function is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce((select is_admin from user_moderation where user_id = auth.uid()), false);
$$;

drop policy if exists "Admins can view everyone's moderation status" on user_moderation;
create policy "Admins can view everyone's moderation status"
  on user_moderation for select
  using (is_admin());

drop policy if exists "Admins can insert moderation rows" on user_moderation;
create policy "Admins can insert moderation rows"
  on user_moderation for insert
  with check (is_admin());

drop policy if exists "Admins can update moderation status" on user_moderation;
create policy "Admins can update moderation status"
  on user_moderation for update
  using (is_admin())
  with check (is_admin());

-- Lets the admin dashboard triage reports instead of just reading them.
alter table reports add column if not exists status text not null default 'open'
  check (status in ('open', 'resolved', 'dismissed'));

drop policy if exists "Admins can view all reports" on reports;
create policy "Admins can view all reports"
  on reports for select
  using (is_admin());

drop policy if exists "Admins can update report status" on reports;
create policy "Admins can update report status"
  on reports for update
  using (is_admin())
  with check (is_admin());

drop policy if exists "Admins can view contact messages" on contact_messages;
create policy "Admins can view contact messages"
  on contact_messages for select
  using (is_admin());

-- Aggregate counts only, never row access - keeps group_messages/dm_messages
-- RLS completely untouched. Admins get a number on a stats tile without
-- ever gaining broad read access to message content.
create or replace function admin_stats()
returns table (
  total_users bigint,
  total_sailings bigint,
  total_group_messages bigint,
  total_dm_messages bigint,
  open_reports bigint
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_admin() then
    raise exception 'not authorized';
  end if;
  return query
    select
      (select count(*) from profiles),
      (select count(distinct sailing_id) from joined_sailings),
      (select count(*) from group_messages),
      (select count(*) from dm_messages),
      (select count(*) from reports where status = 'open');
end;
$$;

create or replace function admin_new_users()
returns table (
  today bigint,
  yesterday bigint,
  last_7_days bigint,
  last_30_days bigint
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_admin() then
    raise exception 'not authorized';
  end if;
  return query
    select
      count(*) filter (where created_at >= date_trunc('day', now())),
      count(*) filter (
        where created_at >= date_trunc('day', now()) - interval '1 day'
          and created_at < date_trunc('day', now())
      ),
      count(*) filter (where created_at >= now() - interval '7 days'),
      count(*) filter (where created_at >= now() - interval '30 days')
    from profiles;
end;
$$;

-- Top sailings by member count, with each one's group-chat message count.
-- Reads joined_sailings (already public) and only a per-sailing count of
-- group_messages, not message content - same aggregate-only stance as
-- admin_stats().
create or replace function admin_popular_sailings()
returns table (
  sailing_id text,
  ship_name text,
  sail_date text,
  member_count bigint,
  message_count bigint
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_admin() then
    raise exception 'not authorized';
  end if;
  -- Every column here is qualified with its table alias, including inside
  -- the subqueries' own select/group by - this function's RETURNS TABLE
  -- columns (sailing_id, ship_name, sail_date) are exposed as plpgsql
  -- variables of the same name inside the function body, so an unqualified
  -- reference is ambiguous between the variable and the table's column.
  return query
    select
      j.sailing_id,
      j.ship_name,
      j.sail_date,
      j.member_count,
      coalesce(g.message_count, 0) as message_count
    from (
      select
        js.sailing_id,
        min(js.ship_name) as ship_name,
        min(js.sail_date) as sail_date,
        count(distinct js.user_id) as member_count
      from joined_sailings js
      group by js.sailing_id
    ) j
    left join (
      select gm.sailing_id, count(*) as message_count
      from group_messages gm
      group by gm.sailing_id
    ) g on g.sailing_id = j.sailing_id
    order by j.member_count desc, coalesce(g.message_count, 0) desc
    limit 20;
end;
$$;

-- Insert-only log so admins can see how many accounts have been deleted.
-- Deliberately has NO foreign key to auth.users - a FK there would get
-- cascade-deleted the moment the very account it's counting is removed,
-- defeating the point of counting it.
create table if not exists account_deletions (
  id uuid primary key default gen_random_uuid(),
  deleted_at timestamptz not null default now()
);

alter table account_deletions enable row level security;
-- No policies granted to any role - this table is only ever touched by
-- delete_own_account() and read by admin_stats(), both security definer
-- functions that run as the table owner and so bypass RLS on it.

-- Lets a signed-in user delete their own account (profile page "Delete my
-- account"). Deleting from auth.users directly isn't possible from the
-- client (that schema isn't exposed via the API and doing it would need a
-- service-role key, which this app deliberately never uses) - a security
-- definer function runs as the table owner, which can. The row is logged
-- before the delete since every other table's data cascades away with it.
create or replace function delete_own_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  insert into account_deletions default values;
  delete from auth.users where id = auth.uid();
end;
$$;

-- admin_stats()'s column list is changing, and `create or replace function`
-- can't alter an existing function's return columns - drop it first.
drop function if exists admin_stats();

create function admin_stats()
returns table (
  total_users bigint,
  total_sailings bigint,
  total_group_messages bigint,
  total_dm_messages bigint,
  open_reports bigint,
  total_account_deletions bigint
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_admin() then
    raise exception 'not authorized';
  end if;
  return query
    select
      (select count(*) from profiles),
      (select count(distinct sailing_id) from joined_sailings),
      (select count(*) from group_messages),
      (select count(*) from dm_messages),
      (select count(*) from reports where status = 'open'),
      (select count(*) from account_deletions);
end;
$$;

-- Avatars v1: an account-level emoji + background tint (lib/avatars.ts),
-- chosen from My profile only - replaces the party-type-derived emoji that
-- used to double as the passenger card's avatar. `avatar` already existed;
-- `avatar_tint` is new. Existing rows get 'peach', matching the emoji
-- default they already had.
alter table profiles add column if not exists avatar_tint text not null default 'peach';

-- New-users count for an arbitrary date range, powering the admin
-- dashboard's "New users" range picker (replaces the four fixed
-- admin_new_users() tiles with a single count for whatever range is
-- selected, including a custom start/end). admin_new_users() itself is
-- left in place rather than dropped - still valid, just unused by the UI.
create or replace function admin_new_users_range(range_start timestamptz, range_end timestamptz)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_admin() then
    raise exception 'not authorized';
  end if;
  return (select count(*) from profiles where created_at >= range_start and created_at < range_end);
end;
$$;

-- Per-user chat activity (aggregate only, no message content), for the
-- admin Users tab's "most active" / "most messages" sorts. Combines group
-- + DM messages the user has SENT; group_messages uses `user_id` for the
-- sender column, dm_messages uses `sender_id` (a pre-existing naming
-- difference between the two tables, not introduced here).
create or replace function admin_user_activity()
returns table (
  user_id uuid,
  message_count bigint,
  message_count_7d bigint
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_admin() then
    raise exception 'not authorized';
  end if;
  return query
    select
      a.sender as user_id,
      sum(a.cnt)::bigint as message_count,
      sum(a.cnt_7d)::bigint as message_count_7d
    from (
      select
        gm.user_id as sender,
        count(*) as cnt,
        count(*) filter (where gm.created_at >= now() - interval '7 days') as cnt_7d
      from group_messages gm
      group by gm.user_id
      union all
      select
        dm.sender_id as sender,
        count(*) as cnt,
        count(*) filter (where dm.created_at >= now() - interval '7 days') as cnt_7d
      from dm_messages dm
      group by dm.sender_id
    ) a
    group by a.sender;
end;
$$;

-- Lets an admin soft-delete any message - either from the reported-message
-- button on the admin Reports tab (bypasses RLS entirely via message_id, so
-- it works even for a DM thread the admin isn't part of) or from the admin
-- "Delete" button now shown on any message inside a chat they can already
-- see. Reuses the same `deleted` flag and soft-delete semantics as a user
-- deleting their own message - the row stays, the body just renders as
-- "Message removed". message_kind matches reports.message_kind's own
-- values so callers can pass a report row's field straight through.
create or replace function admin_delete_message(message_kind text, message_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_admin() then
    raise exception 'not authorized';
  end if;
  if message_kind = 'group_message' then
    update group_messages set deleted = true where id = message_id;
  elsif message_kind = 'dm_message' then
    update dm_messages set deleted = true where id = message_id;
  else
    raise exception 'invalid message kind: %', message_kind;
  end if;
end;
$$;

-- Per-user last-seen timestamp, powering the admin dashboard's "Active
-- users" range stat. Kept in its own table rather than on `profiles` -
-- that table's "Anyone can view display-name fields" policy is world-
-- readable, and a user's activity pattern shouldn't be exposed alongside it.
create table if not exists user_activity (
  user_id uuid primary key references auth.users (id) on delete cascade,
  last_seen_at timestamptz not null default now()
);

alter table user_activity enable row level security;

create policy "Users can set their own last-seen timestamp"
  on user_activity for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own last-seen timestamp"
  on user_activity for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Admins can view all last-seen timestamps"
  on user_activity for select
  using (is_admin());

-- Same range-picker pattern as admin_new_users_range(), for a distinct-
-- users-seen count instead of a signups count.
create or replace function admin_active_users_range(range_start timestamptz, range_end timestamptz)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_admin() then
    raise exception 'not authorized';
  end if;
  return (select count(*) from user_activity where last_seen_at >= range_start and last_seen_at < range_end);
end;
$$;

-- Lets a user block another user in DMs. Enforced at the DB level below
-- (not just hidden client-side) so a blocked pair can neither start a new
-- thread nor send a new message in either direction, regardless of what
-- the client does. Existing threads/messages stay visible - blocking only
-- gates *new* contact, it doesn't erase history.
create table if not exists blocked_users (
  blocker_id uuid not null references auth.users (id) on delete cascade,
  blocked_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

alter table blocked_users enable row level security;

-- No policy lets a user see who has blocked *them* - only their own
-- outgoing blocks. That's intentional: whether you've been blocked is
-- never revealed directly, only implicitly (their thread goes silent).
create policy "Users can view who they've blocked"
  on blocked_users for select
  using (auth.uid() = blocker_id);

create policy "Users can block someone"
  on blocked_users for insert
  with check (auth.uid() = blocker_id);

create policy "Users can unblock someone"
  on blocked_users for delete
  using (auth.uid() = blocker_id);

-- blocked_users' own SELECT policy only lets a user see rows where *they*
-- are the blocker (by design - you can't see who's blocked you). But that
-- means a plain `exists (select 1 from blocked_users where ...)` inside
-- another table's policy is ALSO filtered by that same policy: the person
-- being blocked can't see the row that blocks them, so the check silently
-- passes for their direction while correctly failing for the blocker's.
-- This is the same class of problem is_admin() solves for user_moderation -
-- security definer bypasses RLS so the check sees the row regardless of
-- which side of the block is asking.
create or replace function is_blocked_pair(user_x uuid, user_y uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from blocked_users
    where (blocker_id = user_x and blocked_id = user_y)
       or (blocker_id = user_y and blocked_id = user_x)
  );
$$;

-- Re-created to also refuse a blocked pair, in either direction. `create
-- or replace` doesn't work for policies - drop first.
drop policy if exists "Sailing members can start a DM thread" on dm_threads;
create policy "Sailing members can start a DM thread"
  on dm_threads for insert
  with check (
    (auth.uid() = user_a or auth.uid() = user_b)
    and exists (
      select 1 from joined_sailings
      where joined_sailings.user_id = user_a
        and joined_sailings.sailing_id = dm_threads.sailing_id
    )
    and exists (
      select 1 from joined_sailings
      where joined_sailings.user_id = user_b
        and joined_sailings.sailing_id = dm_threads.sailing_id
    )
    and not is_blocked_pair(user_a, user_b)
  );

drop policy if exists "Thread participants can send DMs" on dm_messages;
create policy "Thread participants can send DMs"
  on dm_messages for insert
  with check (
    auth.uid() = sender_id
    and exists (
      select 1 from dm_threads
      where dm_threads.id = dm_messages.thread_id
        and (dm_threads.user_a = auth.uid() or dm_threads.user_b = auth.uid())
        and not is_blocked_pair(dm_threads.user_a, dm_threads.user_b)
    )
  );

-- Security hardening pass -----------------------------------------------

-- `banned` (user_moderation) existed as a column but no policy anywhere
-- checked it - a banned account's JWT stays valid until it expires, so
-- without a DB-side check a ban was purely cosmetic against anyone calling
-- the REST API directly rather than running the app's own JS. Same
-- security-definer pattern as is_admin(): reads user_moderation from
-- inside other tables' own policies without recursing.
create or replace function is_banned()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce((select banned from user_moderation where user_id = auth.uid()), false);
$$;

drop policy if exists "Users can join a sailing" on joined_sailings;
create policy "Users can join a sailing"
  on joined_sailings for insert
  with check (auth.uid() = user_id and not is_banned());

drop policy if exists "Sailing members can post group messages" on group_messages;
create policy "Sailing members can post group messages"
  on group_messages for insert
  with check (
    auth.uid() = user_id
    and not is_banned()
    and exists (
      select 1 from joined_sailings
      where joined_sailings.user_id = auth.uid()
        and joined_sailings.sailing_id = group_messages.sailing_id
    )
  );

drop policy if exists "Signed-in users can submit a report" on reports;
create policy "Signed-in users can submit a report"
  on reports for insert
  with check (auth.uid() = reporter_id and not is_banned());

drop policy if exists "Users can block someone" on blocked_users;
create policy "Users can block someone"
  on blocked_users for insert
  with check (auth.uid() = blocker_id and not is_banned());

-- is_blocked_pair() moves to a schema PostgREST doesn't expose. Being
-- `security definer` only ever controlled what the function's BODY could
-- see (bypassing blocked_users' own restrictive SELECT policy) - it never
-- restricted who could CALL the function, and Postgres grants EXECUTE on
-- new functions to PUBLIC by default. That let anyone call
-- is_blocked_pair(my_id, their_id) directly over PostgREST's RPC endpoint
-- and learn whether they'd been blocked - exactly what "no policy reveals
-- who's blocked you" (above) is supposed to prevent. A private schema
-- keeps it callable from inside these policies (ordinary SQL name
-- resolution inside the database, unrelated to PostgREST's REST surface)
-- while making it unreachable by URL - no REVOKE needed, and no risk of
-- revoking the very privilege these same policies need to run it.
create schema if not exists private;
grant usage on schema private to authenticated;

-- cascade: the two policies below still reference the old public
-- function at this point (they're only redefined further down in this
-- same script) - a plain drop fails on that dependency, and cascade is
-- safe here specifically because both policies get fully recreated later
-- in this file regardless.
drop function if exists is_blocked_pair(uuid, uuid) cascade;

create function private.is_blocked_pair(user_x uuid, user_y uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from blocked_users
    where (blocker_id = user_x and blocked_id = user_y)
       or (blocker_id = user_y and blocked_id = user_x)
  );
$$;

grant execute on function private.is_blocked_pair(uuid, uuid) to authenticated;

-- Re-created again to add the ban check and switch to private.is_blocked_pair.
drop policy if exists "Sailing members can start a DM thread" on dm_threads;
create policy "Sailing members can start a DM thread"
  on dm_threads for insert
  with check (
    (auth.uid() = user_a or auth.uid() = user_b)
    and not is_banned()
    and exists (
      select 1 from joined_sailings
      where joined_sailings.user_id = user_a
        and joined_sailings.sailing_id = dm_threads.sailing_id
    )
    and exists (
      select 1 from joined_sailings
      where joined_sailings.user_id = user_b
        and joined_sailings.sailing_id = dm_threads.sailing_id
    )
    and not private.is_blocked_pair(user_a, user_b)
  );

drop policy if exists "Thread participants can send DMs" on dm_messages;
create policy "Thread participants can send DMs"
  on dm_messages for insert
  with check (
    auth.uid() = sender_id
    and not is_banned()
    and exists (
      select 1 from dm_threads
      where dm_threads.id = dm_messages.thread_id
        and (dm_threads.user_a = auth.uid() or dm_threads.user_b = auth.uid())
        and not private.is_blocked_pair(dm_threads.user_a, dm_threads.user_b)
    )
  );

-- `profiles.name` is the account's real name, and "Anyone can view
-- display-name fields" above exposes it in full regardless of name_mode -
-- contradicting this app's own promise that a real name "only appears if
-- you pick real-name mode." resolveDisplayName() (lib/displayName.ts)
-- already only reads `name` when nameMode === 'real' - the anon handle is
-- derived purely from (userId, partyType), never from `name` - so masking
-- it here needs no app-side logic change, only routing other-user lookups
-- through this view instead of the raw table.
--
-- A plain view runs against the underlying table's RLS as its OWNER, not
-- the querying role (Postgres's long-standing view behavior, independent
-- of the newer security_invoker option) - so this still sees every row
-- and can expose the safe projection, even once the raw table's public
-- policy is narrowed to admins-only below.
create or replace view public_profiles as
select
  id,
  case when name_mode = 'real' then name else null end as name,
  name_mode,
  nickname,
  avatar,
  avatar_tint,
  country
from profiles;

grant select on public_profiles to authenticated, anon;

-- Narrows "Anyone can view display-name fields" (using (true), full raw
-- row) down to admins only - other-user lookups now go through
-- public_profiles above instead. Admins keep raw-row access: the
-- moderation panels need to see through anonymization by design.
drop policy if exists "Anyone can view display-name fields" on profiles;

create policy "Admins can view all profiles"
  on profiles for select
  using (is_admin());

-- "Anyone can browse sailing passengers" (using (true), no auth required,
-- no sailing scoping) let anyone pull EVERY sailing's passenger profiles -
-- including kids' ages/genders and an LGBTQ+ flag - in one request,
-- across the whole platform. The app itself always scoped this to one
-- sailing_id at a time (the "browse before join" board), but RLS has no
-- way to require "the caller filtered by sailing_id" - a row policy
-- can't see the calling query's WHERE clause, only decide if a given ROW
-- is visible at all regardless of what else was asked for. A
-- security-definer RPC that takes exactly one sailing_id and returns only
-- that sailing's rows closes the bulk path while keeping the legitimate
-- one working unchanged - every caller in the app already had this exact
-- shape (select ... where sailing_id = one value), just enforced
-- client-side instead of at the database.
create or replace function get_sailing_passengers(p_sailing_id text)
returns table (
  user_id uuid,
  profile jsonb,
  join_rank int,
  joined_at timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  select user_id, profile, join_rank, joined_at
  from joined_sailings
  where sailing_id = p_sailing_id;
$$;

grant execute on function get_sailing_passengers(text) to authenticated, anon;

-- Narrowed to admins only - other-user/other-sailing lookups now go
-- through get_sailing_passengers() above instead. The admin Users tab
-- still needs a cross-sailing view (to count each user's total sailings),
-- which is exactly the bulk access this policy used to hand out to
-- everyone.
drop policy if exists "Anyone can browse sailing passengers" on joined_sailings;

create policy "Admins can view all joined sailings"
  on joined_sailings for select
  using (is_admin());

-- Remaining medium/low findings from the security audit --------------------

-- `reason` and `note` were validated client-side only (ReportModal's
-- REASONS list and its 300-char NOTE_MAX_LENGTH) - a direct API call could
-- submit an arbitrary reason string or an unbounded note/preview.
alter table reports
  add constraint reports_reason_check
    check (reason in ('Harassment or abuse', 'Inappropriate content', 'Spam or scam', 'Fake profile', 'Other')),
  add constraint reports_note_length check (note is null or length(note) <= 300),
  add constraint reports_message_preview_length check (message_preview is null or length(message_preview) <= 2000);

-- A cheap per-account throttle - not real rate limiting (that belongs at
-- the edge/infra layer), but stops one signed-in account from filing an
-- unbounded number of reports against people.
create or replace function enforce_report_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (
    select count(*) from reports
    where reporter_id = new.reporter_id and created_at > now() - interval '1 hour'
  ) >= 20 then
    raise exception 'Too many reports submitted recently - please try again later.';
  end if;
  return new;
end;
$$;

drop trigger if exists reports_rate_limit on reports;
create trigger reports_rate_limit
  before insert on reports
  for each row execute function enforce_report_rate_limit();

-- contact_messages has no auth at all (anyone can submit, logged in or
-- not), so there's no account to scope a throttle to - length caps are
-- the only DB-level mitigation available without adding IP tracking,
-- which this app has nowhere to source from at the database layer.
alter table contact_messages
  add constraint contact_messages_name_length check (length(name) <= 200),
  add constraint contact_messages_email_length check (length(email) <= 320),
  add constraint contact_messages_message_length check (length(message) <= 5000);

-- Soft-delete-only enforcement: "Users can soft-delete their own group
-- messages" / "...their own DMs" only scoped WHO could update a message
-- row, not WHAT they could change in it - `body`, `sender_label`, even
-- `created_at` were all rewritable via a direct PATCH, though the only
-- intended use is flipping `deleted` to true. `to_jsonb(...) - 'deleted'`
-- works generically across both tables despite their differing column
-- sets (group_messages uses `user_id`, dm_messages uses `sender_id`), so
-- one function covers both via the triggers below.
create or replace function enforce_soft_delete_only()
returns trigger
language plpgsql
as $$
begin
  if (to_jsonb(new) - 'deleted') <> (to_jsonb(old) - 'deleted') then
    raise exception 'Messages can only be soft-deleted (set deleted = true), not edited.';
  end if;
  return new;
end;
$$;

drop trigger if exists group_messages_soft_delete_only on group_messages;
create trigger group_messages_soft_delete_only
  before update on group_messages
  for each row execute function enforce_soft_delete_only();

drop trigger if exists dm_messages_soft_delete_only on dm_messages;
create trigger dm_messages_soft_delete_only
  before update on dm_messages
  for each row execute function enforce_soft_delete_only();

-- profiles.created_at was user-writable via "Users can update their own
-- profile" (using (true) for every column, no with-check at all) - it
-- feeds admin_new_users_range()/admin_stats()'s signup-date counts, so a
-- user could otherwise misdate their own signup. Silently pinned back to
-- its original value rather than raising - unlike the message trigger
-- above, there's no legitimate "edit" action here to reject loudly, and
-- every real profile update already targets specific columns rather than
-- ever touching created_at, so this is pure defense-in-depth.
create or replace function protect_profile_created_at()
returns trigger
language plpgsql
as $$
begin
  new.created_at := old.created_at;
  return new;
end;
$$;

drop trigger if exists profiles_protect_created_at on profiles;
create trigger profiles_protect_created_at
  before update on profiles
  for each row execute function protect_profile_created_at();

-- `user_activity` had insert/update policies but no select policy for the
-- row's own owner (only "Admins can view all last-seen timestamps") -
-- confirmed live in production that a real logged-in user's `.upsert()`
-- 403s. PostgREST's upsert always runs the insert/update as
-- `... ON CONFLICT ... DO UPDATE ... RETURNING` internally, even when the
-- client passes `return=minimal` and never asks for the row back, and
-- Postgres RLS gates that RETURNING projection on the table's SELECT
-- policy - so without one, the upsert is rejected outright regardless of
-- whether the insert/update policies themselves would have allowed it.
-- Likely the real explanation behind this session's "active users only
-- shows 1" report: whichever account was non-admin at the time would have
-- had every last-seen touch silently fail.
create policy "Users can view their own last-seen timestamp"
  on user_activity for select
  using (auth.uid() = user_id);

-- Interest groups: one room per party type (plus one for LGBTQ+ members)
-- per sailing, unlocking once 5 qualifying travelers have joined. A room
-- that opens stays open forever, even if members later leave or change
-- party type - see check_and_open_sailing_group() below, which is the
-- ONLY place a live count is compared against the threshold.

create table if not exists sailing_groups (
  sailing_id text not null,
  party_type text not null check (party_type in ('solo', 'couple', 'friends', 'family', 'lgbtq')),
  opened_at timestamptz,
  primary key (sailing_id, party_type)
);

alter table sailing_groups enable row level security;

create policy "Sailing members can view their sailing's group state"
  on sailing_groups for select
  using (
    exists (
      select 1 from joined_sailings
      where joined_sailings.user_id = auth.uid()
        and joined_sailings.sailing_id = sailing_groups.sailing_id
    )
  );

-- Enable realtime so a room's row flips from locked to open live in every
-- open tab, without a refresh.
alter publication supabase_realtime add table sailing_groups;

-- Adds room-scoped messages to the existing group_messages table (null =
-- the main ship chat, unchanged). Reusing this table means room threads
-- get realtime, soft-delete-only enforcement, and the report/notify
-- machinery for free - RLS below is what actually restricts a room's rows
-- to its own qualifying travelers.
alter table group_messages add column if not exists room_type text
  check (room_type in ('solo', 'couple', 'friends', 'family', 'lgbtq'));

create index if not exists group_messages_room_idx on group_messages (sailing_id, room_type);

-- The one-way latch. `security definer` so it can read every passenger's
-- profile on this sailing (a regular user can no longer SELECT other
-- people's joined_sailings rows directly) purely to compute a count - it
-- never returns raw passenger data, only whether a room is open.
create or replace function check_and_open_sailing_group(p_sailing_id text, p_party_type text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_qualifying int;
  v_just_opened boolean;
begin
  if p_party_type not in ('solo', 'couple', 'friends', 'family', 'lgbtq') then
    raise exception 'invalid party_type';
  end if;
  if not exists (select 1 from joined_sailings where user_id = auth.uid() and sailing_id = p_sailing_id) then
    raise exception 'not a member of this sailing';
  end if;

  insert into sailing_groups (sailing_id, party_type, opened_at)
    values (p_sailing_id, p_party_type, null)
    on conflict (sailing_id, party_type) do nothing;

  if p_party_type = 'lgbtq' then
    select count(*) into v_qualifying from joined_sailings
      where sailing_id = p_sailing_id and (profile ->> 'lgbtq')::boolean is true;
  else
    select count(*) into v_qualifying from joined_sailings
      where sailing_id = p_sailing_id and profile ->> 'partyType' = p_party_type;
  end if;

  v_just_opened := false;
  if v_qualifying >= 5 then
    -- The `where opened_at is null` makes this update race-safe: if two
    -- callers hit this at once, only one of them can actually flip the
    -- row, so only one notification batch ever fires.
    update sailing_groups
      set opened_at = now()
      where sailing_id = p_sailing_id and party_type = p_party_type and opened_at is null
      returning true into v_just_opened;
  end if;

  if v_just_opened is true then
    insert into notifications (user_id, kind, sailing_id, sender_label, preview)
    select js.user_id, 'group_message', p_sailing_id, 'SameSailing',
      'The ' || p_party_type || ' travelers room on this sailing just opened.'
    from joined_sailings js
    join profiles p on p.id = js.user_id
    where js.sailing_id = p_sailing_id
      and p.notify_digest
      and (
        (p_party_type <> 'lgbtq' and js.profile ->> 'partyType' = p_party_type)
        or (p_party_type = 'lgbtq' and (js.profile ->> 'lgbtq')::boolean is true)
      );
  end if;

  return exists(
    select 1 from sailing_groups
    where sailing_id = p_sailing_id and party_type = p_party_type and opened_at is not null
  );
end;
$$;
grant execute on function check_and_open_sailing_group(text, text) to authenticated;

-- Checks all 5 room types whenever someone joins a sailing or changes
-- their party type/lgbtq flag - this is what makes a room "open on its
-- own" the moment the 5th qualifying traveler joins, rather than waiting
-- for someone to happen to open the chat screen next.
create or replace function check_sailing_groups_after_join()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform check_and_open_sailing_group(new.sailing_id, 'solo');
  perform check_and_open_sailing_group(new.sailing_id, 'couple');
  perform check_and_open_sailing_group(new.sailing_id, 'friends');
  perform check_and_open_sailing_group(new.sailing_id, 'family');
  perform check_and_open_sailing_group(new.sailing_id, 'lgbtq');
  return new;
end;
$$;

drop trigger if exists joined_sailings_check_groups on joined_sailings;
create trigger joined_sailings_check_groups
  after insert or update on joined_sailings
  for each row execute function check_sailing_groups_after_join();

-- Extend group_messages' existing policies so a room's rows are only
-- visible to/postable by travelers whose CURRENT party type (or lgbtq
-- flag) matches that room - main-chat rows (room_type is null) keep the
-- exact behavior they already had.
drop policy if exists "Sailing members can read group messages" on group_messages;
create policy "Sailing members can read group messages"
  on group_messages for select
  using (
    exists (
      select 1 from joined_sailings
      where joined_sailings.user_id = auth.uid()
        and joined_sailings.sailing_id = group_messages.sailing_id
        and (
          group_messages.room_type is null
          or joined_sailings.profile ->> 'partyType' = group_messages.room_type
          or (group_messages.room_type = 'lgbtq' and (joined_sailings.profile ->> 'lgbtq')::boolean is true)
        )
    )
  );

drop policy if exists "Sailing members can post group messages" on group_messages;
create policy "Sailing members can post group messages"
  on group_messages for insert
  with check (
    auth.uid() = user_id
    and not is_banned()
    and exists (
      select 1 from joined_sailings
      where joined_sailings.user_id = auth.uid()
        and joined_sailings.sailing_id = group_messages.sailing_id
        and (
          room_type is null
          or joined_sailings.profile ->> 'partyType' = room_type
          or (room_type = 'lgbtq' and (joined_sailings.profile ->> 'lgbtq')::boolean is true)
        )
    )
  );

-- Room-opened notifications were previously scoped to the whole sailing -
-- extend to only the room's own qualifying members (main chat, room_type
-- is null, keeps notifying everyone as before).
create or replace function notify_group_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into notifications (user_id, kind, sailing_id, sender_label, preview)
  select js.user_id, 'group_message', new.sailing_id, new.sender_label, left(new.body, 140)
  from joined_sailings js
  join profiles p on p.id = js.user_id
  where js.sailing_id = new.sailing_id
    and js.user_id <> new.user_id
    and p.notify_digest
    and (
      new.room_type is null
      or js.profile ->> 'partyType' = new.room_type
      or (new.room_type = 'lgbtq' and (js.profile ->> 'lgbtq')::boolean is true)
    );
  return new;
end;
$$;

-- Fixes a real regression from the earlier passenger-scraping fix
-- (search this file for "Anyone can browse sailing passengers"): "Sailing
-- members can start a DM thread" checks BOTH user_a's and user_b's
-- joined_sailings row via a plain EXISTS. When joined_sailings' only SELECT
-- policies were "own row" and "admin", that EXISTS silently returned false
-- for whichever of the two wasn't the caller (or both, unless the caller
-- happens to be an admin) - so two ordinary travelers could never start a
-- DM thread with each other at all, regardless of blocking. This is the
-- exact nested-EXISTS-across-a-differently-policied-table class already
-- fixed once for blocked_users; it was missed here because this policy's
-- own EXISTS checks weren't re-audited when joined_sailings got locked
-- down. private.is_sailing_member(), like private.is_blocked_pair(), is
-- `security definer` specifically so it can see either side's row
-- regardless of who's asking - it only ever answers yes/no to "is this one
-- user on this one sailing", never returning a row.
create or replace function private.is_sailing_member(p_user_id uuid, p_sailing_id text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from joined_sailings
    where user_id = p_user_id and sailing_id = p_sailing_id
  );
$$;
grant execute on function private.is_sailing_member(uuid, text) to authenticated;

drop policy if exists "Sailing members can start a DM thread" on dm_threads;
create policy "Sailing members can start a DM thread"
  on dm_threads for insert
  with check (
    (auth.uid() = user_a or auth.uid() = user_b)
    and not is_banned()
    and private.is_sailing_member(user_a, dm_threads.sailing_id)
    and private.is_sailing_member(user_b, dm_threads.sailing_id)
    and not private.is_blocked_pair(user_a, user_b)
  );

-- Fixes a real bug in the interest-group rooms: notify_group_message() was
-- written for the single-group-chat model and never updated when rooms
-- (group_messages.room_type) were added - it notified every member of the
-- sailing for a room message too, not just the travelers who actually
-- belong to that room. A Solo-traveler-room message was pinging couples
-- and families who can't even open that room, and inflating their unread
-- badge for a conversation they'll never see. Room membership mirrors the
-- client's own myRoomTypes logic: your own party type's room, plus the
-- LGBTQ+ room if you're flagged for it.
create or replace function notify_group_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into notifications (user_id, kind, sailing_id, sender_label, preview)
  select js.user_id, 'group_message', new.sailing_id, new.sender_label, left(new.body, 140)
  from joined_sailings js
  join profiles p on p.id = js.user_id
  where js.sailing_id = new.sailing_id
    and js.user_id <> new.user_id
    and p.notify_digest
    and (
      new.room_type is null
      or js.profile->>'partyType' = new.room_type
      or (new.room_type = 'lgbtq' and (js.profile->>'lgbtq')::boolean is true)
    );
  return new;
end;
$$;

-- Fixes a real bug in the admin dashboard's "Active users" range stat:
-- user_activity stores exactly one row per user (last_seen_at gets
-- overwritten on every visit, not logged), so admin_active_users_range()
-- could only ever answer "whose *most recent* visit falls in this range" -
-- never "who was active on any day within this range". Anyone active on
-- day X and again on some later day silently drops out of day X's count
-- once they return, because their one row now points at the later date.
-- That's exactly why "Yesterday" could show fewer active users than new
-- signups that same day: some of those new users already opened the app
-- again today, overwriting yesterday's last_seen_at. A past date range's
-- count would keep shrinking indefinitely as more of that day's users
-- return later - not just a one-off glitch, a metric that silently decays.
--
-- user_activity itself is untouched (still a harmless "true last seen"
-- fact, just no longer what this stat reads) - this adds a proper per-day
-- log instead, one row per user per calendar day they were seen, which
-- makes a given day's count permanent once written.
create table if not exists user_activity_days (
  user_id uuid not null references auth.users (id) on delete cascade,
  activity_date date not null,
  primary key (user_id, activity_date)
);

alter table user_activity_days enable row level security;
-- Deliberately no policies - every access goes through the security
-- definer functions below (mark_active_today() writes only the caller's
-- own row; admin_active_users_range() is the only reader).

create or replace function mark_active_today()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into user_activity_days (user_id, activity_date)
  values (auth.uid(), current_date)
  on conflict do nothing;
end;
$$;
grant execute on function mark_active_today() to authenticated;

create or replace function admin_active_users_range(range_start timestamptz, range_end timestamptz)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_admin() then
    raise exception 'not authorized';
  end if;
  return (
    select count(distinct user_id) from user_activity_days
    where activity_date >= range_start::date and activity_date < range_end::date
  );
end;
$$;
