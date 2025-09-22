-- Sessions & Participants schema (run in Supabase SQL editor)

create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  start_time timestamptz not null,
  end_time timestamptz not null,
  duration_min int not null check (duration_min in (25,50,75)),
  session_type text not null check (session_type in ('focus','deep-work','learning')),
  status text not null default 'available',
  name text,
  color text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.session_participants (
  session_id uuid not null references public.sessions(id) on delete cascade,
  user_id uuid not null,
  joined_at timestamptz not null default now(),
  primary key (session_id, user_id)
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  type text not null,
  payload jsonb not null default '{}',
  created_at timestamptz not null default now(),
  read_at timestamptz
);

-- Friend Requests
create table if not exists public.friend_requests (
  id uuid primary key default gen_random_uuid(),
  from_user_id uuid not null,
  to_user_id uuid not null,
  status text not null default 'pending' check (status in ('pending','accepted','declined')),
  created_at timestamptz not null default now(),
  responded_at timestamptz
);

-- RLS example (adjust as needed)
alter table public.sessions enable row level security;
alter table public.session_participants enable row level security;
alter table public.notifications enable row level security;
alter table public.friend_requests enable row level security;

-- Only owners can update/delete their sessions; everyone can read sessions in range
create policy if not exists sessions_select on public.sessions for select using (true);
create policy if not exists sessions_insert on public.sessions for insert with check ((select auth.uid()) = owner_id);
create policy if not exists sessions_update on public.sessions for update using ((select auth.uid()) = owner_id);
create policy if not exists sessions_delete on public.sessions for delete using ((select auth.uid()) = owner_id);

-- Participants: owner and self can insert/select
create policy if not exists sp_select on public.session_participants for select using (true);
create policy if not exists sp_insert on public.session_participants for insert with check (true);
create policy if not exists sp_delete on public.session_participants for delete using ((select auth.uid()) = user_id);

-- Notifications: users can see their own
create policy if not exists notif_select on public.notifications for select using ((select auth.uid()) = user_id);
create policy if not exists notif_insert on public.notifications for insert with check (true);

-- Friend Requests policies
-- A user can view requests where they are sender or receiver
create policy if not exists fr_select on public.friend_requests for select using ((select auth.uid()) = from_user_id or (select auth.uid()) = to_user_id);
-- A user can create a request only as the sender
create policy if not exists fr_insert on public.friend_requests for insert with check ((select auth.uid()) = from_user_id);
-- Only the receiver can update status (accept/decline)
create policy if not exists fr_update on public.friend_requests for update using ((select auth.uid()) = to_user_id);

create index if not exists friend_requests_to_user_idx on public.friend_requests(to_user_id);
create index if not exists friend_requests_from_user_idx on public.friend_requests(from_user_id);

-- Helpful indexes
create index if not exists sessions_start_time_idx on public.sessions(start_time);
create index if not exists session_participants_user_idx on public.session_participants(user_id);
