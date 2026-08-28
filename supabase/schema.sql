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
  avatar text not null default '😊',
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
